// ============= UserScript =============

const CONSTANTS_bg = {
  MEDIA_TYPES: {
    TV: "tv",
    MOVIE: "movie"
  },
  SHORT_FILM_KEYWORDS: [
    "剧场版", "电影", "movie", "总集篇", "完结篇", "短片", "OVA", "OAD"
  ]
};

const WidgetConfig_bg = {
  BGM_BASE_URL: "https://bgm.tv",
  BGM_TAG_URL: "https://bgm.tv/anime/tag",
  TMDB_IMAGE_BASE: "https://image.tmdb.org/t/p/w500",
  TMDB_SEARCH_MIN_SCORE: 65,
  DETAIL_BATCH_SIZE: 4,
  MATCH_BATCH_SIZE: 6
};

WidgetMetadata = {
  id: "forward.bangumi.simple.tag.tmdb",
  title: "Bangumi 动画标签",
  description: "按标签浏览 Bangumi 动画（详情补全版）",
  author: "extract",
  version: "1.3.0",
  requiredVersion: "0.0.1",
  modules: [
    {
      title: "Bangumi 动画标签",
      description: "输入标签后返回对应动画列表",
      requiresWebView: false,
      functionName: "fetchBangumiTagPage_bg",
      cacheDuration: 3600,
      params: [
        {
          name: "tag_keyword",
          title: "动画标签",
          type: "input",
          value: ""
        },
        {
          name: "sort",
          title: "排序",
          type: "enumeration",
          value: "rank",
          enumOptions: [
            { title: "综合排名", value: "rank" },
            { title: "标注数", value: "collects" },
            { title: "日期", value: "date" },
            { title: "名称", value: "title" }
          ]
        },
        {
          name: "page",
          title: "页码",
          type: "page"
        }
      ]
    }
  ]
};

const tmdbCache_bg = {};
const bgmDetailCache_bg = {};

// ==========================
// 入口
// ==========================
async function fetchBangumiTagPage_bg(params = {}) {
  const tag = (params.tag_keyword || "").trim();
  const sort = params.sort || "rank";
  const page = parseInt(params.page, 10) || 1;

  if (!tag) return [];

  const url =
    `${WidgetConfig_bg.BGM_TAG_URL}/${encodeURIComponent(tag)}?sort=${encodeURIComponent(sort)}&page=${page}`;

  return await processBangumiTagPage_bg(url);
}

// ==========================
// Bangumi 标签页抓取
// ==========================
async function processBangumiTagPage_bg(url) {
  const res = await Widget.http.get(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)"
    }
  });

  const html = typeof res?.data === "string" ? res.data : "";
  if (!html) return [];

  const listBlock =
    html.match(/<ul[^>]*id="browserItemList"[^>]*>[\s\S]*?<\/ul>/)?.[0] ||
    html.match(/<ul[^>]*class="[^"]*browserFull[^"]*"[^>]*>[\s\S]*?<\/ul>/)?.[0] ||
    "";

  if (!listBlock) return [];

  const items =
    listBlock.match(/<li[^>]*class="[^"]*\bitem\b[^"]*"[^>]*>[\s\S]*?<\/li>/g) || [];

  const baseItems = items
    .map(parseBangumiListItem_bg)
    .filter(Boolean);

  if (baseItems.length === 0) return [];

  // 先补全详情
  const enrichedItems = [];
  for (let i = 0; i < baseItems.length; i += WidgetConfig_bg.DETAIL_BATCH_SIZE) {
    const batch = baseItems.slice(i, i + WidgetConfig_bg.DETAIL_BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(item => enrichBangumiItem_bg(item))
    );
    enrichedItems.push(...batchResults.filter(Boolean));
  }

  // 再匹配 TMDB
  const finalList = [];
  for (let i = 0; i < enrichedItems.length; i += WidgetConfig_bg.MATCH_BATCH_SIZE) {
    const batch = enrichedItems.slice(i, i + WidgetConfig_bg.MATCH_BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(item => tryMatchTmdbForBangumi_bg(item))
    );
    finalList.push(...batchResults.filter(Boolean));
  }

  return finalList;
}

// ==========================
// 解析 Bangumi 列表项
// ==========================
function parseBangumiListItem_bg(item) {
  const id = item.match(/\/subject\/(\d+)/)?.[1] || "";

  let title =
    item.match(/<h3>[\s\S]*?<a[^>]*title="([^"]+)"/)?.[1] ||
    item.match(/<h3>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/)?.[1] ||
    "";

  title = decodeHtml_bg(stripTags_bg(title)).trim();
  if (!id || !title) return null;

  let cover =
    item.match(/<img[^>]+src="([^"]+)"/)?.[1] ||
    item.match(/<img[^>]+data-cfsrc="([^"]+)"/)?.[1] ||
    "";

  cover = normalizeUrl_bg(cover);
  if (cover) cover = cover.replace("/s/", "/l/");

  const infoRaw =
    item.match(/<p[^>]*class="info"[^>]*>([\s\S]*?)<\/p>/)?.[1] || "";

  const info =
    decodeHtml_bg(stripTags_bg(infoRaw)).replace(/\s+/g, " ").trim();

  const smallTitleRaw =
    item.match(/<small[^>]*class="grey"[^>]*>([\s\S]*?)<\/small>/)?.[1] || "";

  const smallTitle =
    decodeHtml_bg(stripTags_bg(smallTitleRaw)).trim();

  const year = extractYear_bg(info);
  const month = extractMonth_bg(info);

  const normalized = normalizeTitleRule_bg(title, smallTitle, info);
  const mediaType = detectAnimeMediaType_bg(
    normalized.title,
    normalized.originalTitle,
    info
  );

  return {
    id,
    bgmId: id,
    subjectUrl: `${WidgetConfig_bg.BGM_BASE_URL}/subject/${id}`,
    title: normalized.title,
    chineseTitle: normalized.chineseTitle,
    originalTitle: normalized.originalTitle,
    aliases: [],
    coverUrl: cover,
    description: info,
    infoText: info,
    year: year || "",
    month: month || null,
    releaseDate: year
      ? `${year}-${String(month || 1).padStart(2, "0")}-01`
      : "",
    tmdbSearchType: mediaType
  };
}

// ==========================
// 详情页补全
// ==========================
async function enrichBangumiItem_bg(item) {
  const cacheKey = item.bgmId;
  if (bgmDetailCache_bg[cacheKey]) {
    return { ...item, ...bgmDetailCache_bg[cacheKey] };
  }

  try {
    const res = await Widget.http.get(item.subjectUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)"
      }
    });

    const html = typeof res?.data === "string" ? res.data : "";
    if (!html) return item;

    const detail = parseBangumiSubjectDetail_bg(html, item);

    bgmDetailCache_bg[cacheKey] = detail;
    return { ...item, ...detail };
  } catch (e) {
    return item;
  }
}

function parseBangumiSubjectDetail_bg(html, baseItem) {
  let originalTitle = baseItem.originalTitle || "";
  let chineseTitle = baseItem.chineseTitle || baseItem.title || "";
  let aliases = [];
  let year = baseItem.year || "";
  let month = baseItem.month || null;

  // 标题区
  const h1Block = html.match(/<h1[\s\S]*?<\/h1>/)?.[0] || "";
  const titleMain =
    h1Block.match(/<a[^>]*>([\s\S]*?)<\/a>/)?.[1] || "";
  const titleTip =
    h1Block.match(/<small[^>]*class="grey"[^>]*>([\s\S]*?)<\/small>/)?.[1] || "";

  const mainClean = decodeHtml_bg(stripTags_bg(titleMain)).trim();
  const tipClean = decodeHtml_bg(stripTags_bg(titleTip)).trim();

  if (mainClean) chineseTitle = mainClean;
  if (tipClean) originalTitle = tipClean;

  // infobox
  const infobox =
    html.match(/<ul id="infobox"[\s\S]*?<\/ul>/)?.[0] || "";

  const infoboxText = decodeHtml_bg(stripTags_bg(infobox)).replace(/\s+/g, " ").trim();

  // 别名
  const aliasMatches = [...infoboxText.matchAll(/别名[:：]\s*([^:：]+?)(?=(原名|放送开始|发售日|话数|类型|$))/g)];
  for (const m of aliasMatches) {
    const aliasText = (m[1] || "").trim();
    if (aliasText) {
      aliases.push(...aliasText.split(/[\/、,，]/).map(s => s.trim()).filter(Boolean));
    }
  }

  // 原名
  const originMatch = infoboxText.match(/原名[:：]\s*([^:：]+?)(?=(别名|放送开始|发售日|话数|类型|$))/);
  if (originMatch && originMatch[1]) {
    const origin = originMatch[1].trim();
    if (origin) originalTitle = origin;
  }

  // 日期优先用详情页
  const dateMatch =
    infoboxText.match(/放送开始[:：]\s*((19|20)\d{2}[-\/\.年]\s*\d{1,2})/) ||
    infoboxText.match(/发售日[:：]\s*((19|20)\d{2}[-\/\.年]\s*\d{1,2})/);

  if (dateMatch && dateMatch[1]) {
    const dateText = dateMatch[1];
    year = extractYear_bg(dateText) || year;
    month = extractMonth_bg(dateText) || month;
  }

  aliases = [...new Set(aliases.filter(Boolean))];

  const normalized = normalizeTitleRule_bg(chineseTitle, originalTitle, infoboxText);

  return {
    title: normalized.title,
    chineseTitle: normalized.chineseTitle,
    originalTitle: normalized.originalTitle,
    aliases,
    year,
    month,
    releaseDate: year
      ? `${year}-${String(month || 1).padStart(2, "0")}-01`
      : baseItem.releaseDate
  };
}

// ==========================
// TMDB 匹配
// ==========================
async function tryMatchTmdbForBangumi_bg(item) {
  const year = item.year || extractYear_bg(item.releaseDate || item.infoText || "");
  const month = item.month || extractMonth_bg(item.releaseDate || item.infoText || "");
  const tmdbType = item.tmdbSearchType || CONSTANTS_bg.MEDIA_TYPES.TV;

  const cacheKey = [
    normalizeTmdbQuery_bg(item.originalTitle),
    normalizeTmdbQuery_bg(item.chineseTitle),
    (item.aliases || []).map(normalizeTmdbQuery_bg).join("_"),
    year,
    month || "",
    tmdbType
  ].join("_");

  if (tmdbCache_bg[cacheKey]) {
    return integrateTmdbLight_bg(item, tmdbCache_bg[cacheKey], tmdbType);
  }

  let tmdbRes = await searchTmdbLight_bg({
    originalTitle: item.originalTitle,
    chineseTitle: item.chineseTitle,
    aliases: item.aliases || [],
    listTitle: item.title,
    searchMediaType: tmdbType,
    year,
    month,
    language: "zh-CN"
  });

  if (!tmdbRes) {
    tmdbRes = await searchTmdbLight_bg({
      originalTitle: item.originalTitle,
      chineseTitle: item.chineseTitle,
      aliases: item.aliases || [],
      listTitle: item.title,
      searchMediaType: tmdbType,
      year,
      month,
      language: "ja-JP"
    });
  }

  if (!tmdbRes) return null;

  tmdbCache_bg[cacheKey] = tmdbRes;
  return integrateTmdbLight_bg(item, tmdbRes, tmdbType);
}

async function searchTmdbLight_bg({
  originalTitle = "",
  chineseTitle = "",
  aliases = [],
  listTitle = "",
  searchMediaType = "tv",
  year = "",
  month = null,
  language = "zh-CN"
}) {
  const queries = uniqueNonEmpty_bg([
    normalizeTmdbQuery_bg(originalTitle),
    normalizeTmdbQuery_bg(chineseTitle),
    normalizeTmdbQuery_bg(listTitle),
    ...aliases.map(normalizeTmdbQuery_bg)
  ]);

  let best = null;
  let bestScore = -Infinity;

  for (const query of queries.slice(0, 4)) {
    const params = {
      query,
      language,
      page: 1
    };

    if (year) {
      if (searchMediaType === "tv") {
        params.first_air_date_year = parseInt(year, 10);
      } else {
        params.primary_release_year = parseInt(year, 10);
      }
    }

    const data = await Widget.tmdb.get(
      `/search/${searchMediaType}`,
      { params }
    );

    const results = data?.results || [];

    for (const result of results.slice(0, 10)) {
      const score = calculateTmdbMatchScoreLight_bg(result, {
        originalTitle,
        chineseTitle,
        aliases,
        listTitle,
        year,
        month
      });

      if (score > bestScore) {
        bestScore = score;
        best = result;
      }
    }

    if (bestScore >= 100) break;
  }

  if (bestScore < WidgetConfig_bg.TMDB_SEARCH_MIN_SCORE) {
    return null;
  }

  return best;
}

function calculateTmdbMatchScoreLight_bg(result, meta) {
  const tmdbDate = result.release_date || result.first_air_date || "";
  const tmdbMonth = extractMonth_bg(tmdbDate);

  // Bangumi 有月份时，TMDB 必须有月份且必须一致
  if (meta.month) {
    if (!tmdbMonth) return -999;
    if (meta.month !== tmdbMonth) return -999;
  }

  let score = 0;

  const resultTitle =
    normalizeTmdbQuery_bg(result.title || result.name || "");

  const resultOriginal =
    normalizeTmdbQuery_bg(
      result.original_title || result.original_name || ""
    );

  const q1 = normalizeTmdbQuery_bg(meta.originalTitle || "");
  const q2 = normalizeTmdbQuery_bg(meta.chineseTitle || "");
  const q3 = normalizeTmdbQuery_bg(meta.listTitle || "");
  const aliasList = (meta.aliases || []).map(normalizeTmdbQuery_bg).filter(Boolean);

  // 精确匹配
  if (resultTitle === q1 || resultOriginal === q1) score += 100;
  if (resultTitle === q2 || resultOriginal === q2) score += 90;
  if (resultTitle === q3 || resultOriginal === q3) score += 80;

  for (const alias of aliasList) {
    if (resultTitle === alias || resultOriginal === alias) {
      score += 85;
    }
  }

  // 英文单词标题严格限制，避免 Charlotte -> Charlotte's Web
  const isAsciiSingleWord =
    /^[a-z0-9!'\-]+$/i.test(q1) && !/\s/.test(q1);

  if (isAsciiSingleWord) {
    if (
      q1 &&
      resultTitle !== q1 &&
      resultOriginal !== q1 &&
      (resultTitle.includes(q1) || resultOriginal.includes(q1))
    ) {
      score -= 40;
    }
  } else {
    if (q1 && (resultTitle.includes(q1) || resultOriginal.includes(q1))) score += 45;
    if (q2 && (resultTitle.includes(q2) || resultOriginal.includes(q2))) score += 35;
    if (q3 && (resultTitle.includes(q3) || resultOriginal.includes(q3))) score += 25;

    for (const alias of aliasList) {
      if (alias && (resultTitle.includes(alias) || resultOriginal.includes(alias))) {
        score += 20;
      }
    }
  }

  const resultYear = extractYear_bg(tmdbDate);
  const queryYear = extractYear_bg(meta.year || "");

  if (queryYear && resultYear) {
    const diff = Math.abs(parseInt(queryYear, 10) - parseInt(resultYear, 10));

    if (diff === 0) score += 35;
    else if (diff === 1) score += 20;
    else if (diff >= 2) score -= 20;
  }

  if (result.genre_ids && result.genre_ids.includes(16)) {
    score += 25;
  } else {
    score -= 25;
  }

  if (typeof result.vote_count === "number") {
    if (result.vote_count > 100) score += 6;
    else if (result.vote_count > 20) score += 3;
  }

  return score;
}

// ==========================
// 结果整合
// ==========================
function integrateTmdbLight_bg(baseItem, tmdbResult, tmdbType) {
  const posterPath = tmdbResult.poster_path || "";
  const backdropPath = tmdbResult.backdrop_path || "";
  const fullCoverUrl = posterPath
    ? `${WidgetConfig_bg.TMDB_IMAGE_BASE}${posterPath}`
    : (baseItem.coverUrl || "");

  return {
    id: String(tmdbResult.id),
    type: "tmdb",
    title: tmdbResult.title || tmdbResult.name || baseItem.title,
    description: tmdbResult.overview || baseItem.description || "",
    releaseDate:
      tmdbResult.release_date ||
      tmdbResult.first_air_date ||
      baseItem.releaseDate ||
      "",
    coverUrl: fullCoverUrl,
    posterPath: posterPath,
    backdropPath: backdropPath,
    rating:
      typeof tmdbResult.vote_average === "number"
        ? Number(tmdbResult.vote_average).toFixed(1)
        : "",
    mediaType: tmdbType
  };
}

// ==========================
// 类型判断
// ==========================
function detectAnimeMediaType_bg(title, originalTitle, infoText) {
  const text =
    `${title || ""} ${originalTitle || ""} ${infoText || ""}`.toLowerCase();

  return CONSTANTS_bg.SHORT_FILM_KEYWORDS.some(k =>
    text.includes(k.toLowerCase())
  )
    ? CONSTANTS_bg.MEDIA_TYPES.MOVIE
    : CONSTANTS_bg.MEDIA_TYPES.TV;
}

// ==========================
// 标题特例
// ==========================
function normalizeTitleRule_bg(title, originalTitle, infoText) {
  let zh = title || "";
  let orig = originalTitle || title || "";

  const rules = [
    { pattern: /^Charlotte$/i, zh: "Charlotte", orig: "Charlotte" },
    { pattern: /^Kanon$/i, zh: "Kanon", orig: "Kanon" },
    { pattern: /^AIR$/i, zh: "AIR", orig: "AIR" },
    { pattern: /^Angel Beats!?$/i, zh: "Angel Beats!", orig: "Angel Beats!" }
  ];

  for (const rule of rules) {
    if (rule.pattern.test(zh) || rule.pattern.test(orig)) {
      zh = rule.zh;
      orig = rule.orig;
      break;
    }
  }

  return {
    title: zh,
    chineseTitle: zh,
    originalTitle: orig
  };
}

// ==========================
// 工具函数
// ==========================
function extractYear_bg(text) {
  const m = String(text || "").match(/(19|20)\d{2}/);
  return m ? m[0] : "";
}

function extractMonth_bg(text) {
  const s = String(text || "");

  let m = s.match(/(19|20)\d{2}[-\/\.](\d{1,2})/);
  if (m) return parseInt(m[2], 10);

  m = s.match(/(19|20)\d{2}年\s*(\d{1,2})月/);
  if (m) return parseInt(m[2], 10);

  m = s.match(/(?:^|[^\d])(\d{1,2})月(?:[^\d]|$)/);
  if (m) return parseInt(m[1], 10);

  return null;
}

function normalizeTmdbQuery_bg(str) {
  return String(str || "")
    .replace(/<[^>]*>/g, "")
    .replace(/[【】()（）]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function uniqueNonEmpty_bg(arr) {
  return [...new Set(arr.filter(Boolean))];
}

function stripTags_bg(str) {
  return (str || "").replace(/<[^>]*>/g, "");
}

function normalizeUrl_bg(url) {
  if (!url) return "";
  if (url.startsWith("//")) return "https:" + url;
  if (url.startsWith("/")) return WidgetConfig_bg.BGM_BASE_URL + url;
  return url;
}

function decodeHtml_bg(str) {
  if (!str) return "";
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}
