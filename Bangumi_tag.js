// ============= UserScript =============

WidgetMetadata = {
  id: "forward.bangumi.tag.only",
  title: "Bangumi 动画标签",
  description: "Bangumi 标签浏览 + TMDB匹配（优化稳定版）",
  author: "extract",
  version: "1.4.0",
  requiredVersion: "0.0.1",
  modules: [
    {
      title: "Bangumi 动画标签",
      functionName: "fetchBangumiTagPage_bg",
      cacheDuration: 3600,
      params: [
        { name: "tag_keyword", title: "动画标签", type: "input", value: "" },
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
        { name: "page", title: "页码", type: "page" }
      ]
    }
  ]
};

const WidgetConfig_bg = {
  BGM_BASE_URL: "https://bgm.tv",
  BGM_TAG_URL: "https://bgm.tv/anime/tag",
  TMDB_IMAGE_BASE: "https://image.tmdb.org/t/p/w500",
  FETCH_BATCH_SIZE: 8,
  MIN_MATCH_SCORE: 20
};

const CONSTANTS_bg = {
  MEDIA_TYPES: {
    TV: "tv",
    MOVIE: "movie"
  }
};

const tmdbCache_bg = {};
const tmdbSearchCache_bg = {};

// ==============================
// 入口
// ==============================
async function fetchBangumiTagPage_bg(params = {}) {
  const tag = (params.tag_keyword || "").trim();
  const sort = params.sort || "rank";
  const page = parseInt(params.page, 10) || 1;

  if (!tag) return [];

  const url =
    `${WidgetConfig_bg.BGM_TAG_URL}/${encodeURIComponent(tag)}?sort=${encodeURIComponent(sort)}&page=${page}`;

  return await processBangumiTagPage_bg(url);
}

// ==============================
// 抓 Bangumi 页面
// ==============================
async function processBangumiTagPage_bg(url) {
  const response = await Widget.http.get(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)"
    }
  });

  const html = typeof response?.data === "string" ? response.data : "";
  if (!html) return [];

  const listBlock =
    html.match(/<ul[^>]*id="browserItemList"[^>]*>[\s\S]*?<\/ul>/)?.[0] ||
    html.match(/<ul[^>]*class="[^"]*browserFull[^"]*"[^>]*>[\s\S]*?<\/ul>/)?.[0] ||
    "";

  if (!listBlock) return [];

  const itemBlocks =
    listBlock.match(/<li[^>]*class="[^"]*item[^"]*"[^>]*>[\s\S]*?<\/li>/g) || [];

  const bangumiItems =
    itemBlocks.map(parseBangumiListItem_bg).filter(Boolean);

  const results = [];

  for (let i = 0; i < bangumiItems.length; i += WidgetConfig_bg.FETCH_BATCH_SIZE) {
    const batch = bangumiItems.slice(i, i + WidgetConfig_bg.FETCH_BATCH_SIZE);

    const batchResults = await Promise.all(
      batch.map(matchBangumiToTmdb_bg)
    );

    results.push(...batchResults.filter(Boolean));
  }

  return results;
}

// ==============================
// 解析 Bangumi
// ==============================
function parseBangumiListItem_bg(html) {
  const id = html.match(/\/subject\/(\d+)/)?.[1];
  if (!id) return null;

  let title =
    html.match(/<h3>[\s\S]*?<a[^>]*title="([^"]+)"/)?.[1] ||
    html.match(/<h3>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/)?.[1] ||
    "";

  title = decodeHtml_bg(stripTags_bg(title)).trim();

  let originalTitle =
    html.match(/<small[^>]*>([\s\S]*?)<\/small>/)?.[1] || "";
  originalTitle = decodeHtml_bg(stripTags_bg(originalTitle)).trim();

  const info =
    decodeHtml_bg(
      stripTags_bg(
        html.match(/<p[^>]*class="info"[^>]*>([\s\S]*?)<\/p>/)?.[1] || ""
      )
    ).trim();

  const cover =
    html.match(/<img[^>]+src="([^"]+)"/)?.[1] ||
    html.match(/<img[^>]+data-cfsrc="([^"]+)"/)?.[1] ||
    "";

  const releaseDate = parseDate_bg(info);
  const year = extractYear_bg(releaseDate || info);

  const normalized = normalizeBangumiTitle_bg({
    title,
    originalTitle
  });

  return {
    id,
    title: normalized.title,
    originalTitle: normalized.originalTitle,
    chineseTitle: normalized.chineseTitle,
    aliases: normalized.aliases,
    description: info,
    coverUrl: normalizeUrl_bg(cover),
    year,
    releaseDate,
    tmdbSearchType: detectItemTypeFromContent_bg({
      title: normalized.title,
      originalTitle: normalized.originalTitle,
      info
    })
  };
}

// ==============================
// 标题预处理
// ==============================
function normalizeBangumiTitle_bg(item) {
  let zh = item.title || "";
  let orig = item.originalTitle || item.title || "";
  const aliases = [];

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

  aliases.push(zh);
  if (orig && orig !== zh) aliases.push(orig);

  return {
    title: zh,
    chineseTitle: zh,
    originalTitle: orig,
    aliases: [...new Set(aliases.filter(Boolean))]
  };
}

// ==============================
// 日期解析
// ==============================
function parseDate_bg(str) {
  if (!str) return "";

  const text = String(str).trim();
  let m;

  m = text.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${pad_bg(m[2])}-${pad_bg(m[3])}`;

  m = text.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
  if (m) return `${m[1]}-${pad_bg(m[2])}-${pad_bg(m[3])}`;

  m = text.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (m) return `${m[1]}-${pad_bg(m[2])}-${pad_bg(m[3])}`;

  m = text.match(/(\d{4})-(\d{1,2})/);
  if (m) return `${m[1]}-${pad_bg(m[2])}-01`;

  m = text.match(/(\d{4})\/(\d{1,2})/);
  if (m) return `${m[1]}-${pad_bg(m[2])}-01`;

  m = text.match(/(\d{4})年(\d{1,2})月/);
  if (m) return `${m[1]}-${pad_bg(m[2])}-01`;

  m = text.match(/(\d{4})年(冬|春|夏|秋)/);
  if (m) {
    let month = "01";
    if (m[2] === "春") month = "04";
    if (m[2] === "夏") month = "07";
    if (m[2] === "秋") month = "10";
    return `${m[1]}-${month}-01`;
  }

  m = text.match(/(19|20)\d{2}/);
  if (m) return `${m[0]}-01-01`;

  return "";
}

function pad_bg(n) {
  return String(n).padStart(2, "0");
}

// ==============================
// TMDB 匹配
// ==============================
async function matchBangumiToTmdb_bg(item) {
  const cacheKey = [
    normalizeCompareText_bg(item.title),
    normalizeCompareText_bg(item.originalTitle),
    item.year,
    item.tmdbSearchType
  ].join("_");

  if (tmdbCache_bg[cacheKey]) {
    return integrateTmdbItem_bg(item, tmdbCache_bg[cacheKey]);
  }

  const candidates = await fetchTmdbDataForBangumi_bg(item);

  if (!candidates.length) return null;

  const best = selectMatches_bg(
    candidates,
    item.originalTitle || item.title,
    item.year,
    { preferredType: item.tmdbSearchType }
  );

  if (!best) return null;

  // 没有 posterPath 的直接丢弃，防止回退成横卡片
  if (!best.poster_path) return null;

  tmdbCache_bg[cacheKey] = best;

  return integrateTmdbItem_bg(item, best);
}

// ==============================
// TMDB 搜索（缓存 + 并发）
// ==============================
async function fetchTmdbDataForBangumi_bg(item) {
  const queries = generateQueries_bg(
    item.originalTitle,
    item.title,
    item.chineseTitle,
    item.aliases || []
  );

  const tasks = [];

  for (const query of queries) {
    for (const type of ["tv", "movie"]) {
      const cacheKey = `${type}_${query}_${item.year || ""}`;

      if (tmdbSearchCache_bg[cacheKey]) {
        tasks.push(Promise.resolve(tmdbSearchCache_bg[cacheKey]));
        continue;
      }

      const params = {
        query,
        language: "zh-CN",
        page: 1
      };

      if (item.year) {
        if (type === "tv") {
          params.first_air_date_year = parseInt(item.year, 10);
        } else {
          params.primary_release_year = parseInt(item.year, 10);
        }
      }

      const task = Widget.tmdb.get(`/search/${type}`, { params })
        .then(res => {
          const list = Array.isArray(res?.results) ? res.results : [];
          const mapped = list.map(r => ({ ...r, media_type: type }));
          tmdbSearchCache_bg[cacheKey] = mapped;
          return mapped;
        })
        .catch(() => {
          tmdbSearchCache_bg[cacheKey] = [];
          return [];
        });

      tasks.push(task);
    }
  }

  const responses = await Promise.all(tasks);

  const list = [];
  const seen = new Set();

  for (const arr of responses) {
    for (const r of arr) {
      const key = `${r.media_type}_${r.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        list.push(r);
      }
    }
  }

  return list;
}

// ==============================
// 查询生成
// ==============================
function generateQueries_bg(orig, title, chineseTitle, aliases = []) {
  const set = new Set();

  function clean(s) {
    return String(s || "")
      .replace(/\(.*?\)/g, "")
      .replace(/第.+[季期篇部]/g, "")
      .replace(/剧场版/g, "")
      .replace(/總集篇|总集篇/g, "")
      .replace(/完整版|完全版/g, "")
      .trim();
  }

  set.add(clean(orig));
  set.add(clean(title));
  set.add(clean(chineseTitle));

  for (const a of aliases) {
    set.add(clean(a));
  }

  return [...set].filter(Boolean).slice(0, 3);
}

// ==============================
// 匹配评分
// ==============================
function calculateMatchScore_bg(r, title, year, preferredType = null) {
  let score = 0;

  const tmdbTitle = normalizeCompareText_bg(r.title || r.name);
  const tmdbOriginal = normalizeCompareText_bg(r.original_title || r.original_name);
  const bgmTitle = normalizeCompareText_bg(title);

  const simTitle = calculateSimilarity_bg(title, r.title || r.name || "");
  const simOriginal = calculateSimilarity_bg(title, r.original_title || r.original_name || "");
  const bestSim = Math.max(simTitle, simOriginal);

  if (tmdbTitle === bgmTitle || tmdbOriginal === bgmTitle) {
    score += 100;
  } else if (tmdbTitle.includes(bgmTitle) || tmdbOriginal.includes(bgmTitle)) {
    score += 60;
  }

  if (bestSim >= 0.98) score += 2.0;
  else if (bestSim >= 0.9) score += 1.0;

  // 长度惩罚，避免 Charlotte -> Charlotte's Web
  const lenDiff = Math.abs(
    normalizeCompareText_bg(r.title || r.name || "").length -
    normalizeCompareText_bg(title).length
  );
  if (lenDiff >= 6) {
    score -= 1.5;
  }

  const tmdbYear =
    (r.release_date || r.first_air_date || "").substring(0, 4);

  if (year && tmdbYear) {
    const diff = Math.abs(parseInt(year, 10) - parseInt(tmdbYear, 10));

    if (diff === 0) score += 100;
    else if (diff === 1) score += 70;
    else score -= 50;
  }

  if (preferredType) {
    if (r.media_type === preferredType) score += 100;
    else score -= 100;
  }

  if (r.genre_ids?.includes(16)) score += 50;
  else score -= 200;

  score += Math.log10((r.popularity || 0) + 1);
  score += Math.log10((r.vote_count || 0) + 1);

  return score;
}

// ==============================
// 相似度
// ==============================
function calculateSimilarity_bg(str1, str2) {
  const clean1 = normalizeCompareText_bg(str1);
  const clean2 = normalizeCompareText_bg(str2);

  if (!clean1 || !clean2) return 0;
  if (clean1 === clean2) return 1.0;

  const longer = clean1.length > clean2.length ? clean1 : clean2;
  const shorter = clean1.length > clean2.length ? clean2 : clean1;

  if (!longer.length) return 1.0;

  const editDistance = getEditDistance_bg(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function getEditDistance_bg(str1, str2) {
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

// ==============================
// 选最佳
// ==============================
function selectMatches_bg(results, title, year, opt = {}) {
  let best = null;
  let bestScore = -Infinity;

  for (const r of results) {
    const s = calculateMatchScore_bg(
      r,
      title,
      year,
      opt.preferredType || null
    );

    if (s > bestScore) {
      bestScore = s;
      best = r;
    }
  }

  if (bestScore < WidgetConfig_bg.MIN_MATCH_SCORE) return null;

  return best;
}

// ==============================
// 输出
// ==============================
function integrateTmdbItem_bg(baseItem, tmdb) {
  const posterPath = tmdb.poster_path || null;
  const backdropPath = tmdb.backdrop_path || null;

  const fullCover =
    posterPath
      ? `${WidgetConfig_bg.TMDB_IMAGE_BASE}${posterPath}`
      : baseItem.coverUrl;

  return {
    id: String(tmdb.id),
    type: "tmdb",

    title: tmdb.title || tmdb.name || baseItem.title,

    description: tmdb.overview || baseItem.description || "",

    releaseDate:
      tmdb.release_date ||
      tmdb.first_air_date ||
      baseItem.releaseDate ||
      (baseItem.year ? `${baseItem.year}-01-01` : ""),

    coverUrl: fullCover,

    // 关键字段：Forward 用它判断三列竖海报
    posterPath: posterPath,
    backdropPath: backdropPath,

    rating:
      typeof tmdb.vote_average === "number"
        ? tmdb.vote_average.toFixed(1)
        : "",

    mediaType:
      tmdb.media_type ||
      baseItem.tmdbSearchType ||
      "tv"
  };
}

// ==============================
// 类型判断
// ==============================
function detectItemTypeFromContent_bg(item) {
  const text = `${item.title || ""} ${item.originalTitle || ""} ${item.info || ""}`.toLowerCase();

  if (/剧场版|电影|movie|film/.test(text)) {
    return CONSTANTS_bg.MEDIA_TYPES.MOVIE;
  }

  return CONSTANTS_bg.MEDIA_TYPES.TV;
}

// ==============================
// 工具
// ==============================
function normalizeCompareText_bg(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/[^\u4e00-\u9fa5a-z0-9]/g, "");
}

function extractYear_bg(str) {
  const m = String(str || "").match(/(19|20)\d{2}/);
  return m ? m[0] : "";
}

function stripTags_bg(str) {
  return String(str || "").replace(/<[^>]*>/g, "");
}

function normalizeUrl_bg(url) {
  if (!url) return "";

  if (url.startsWith("//")) return "https:" + url;
  if (url.startsWith("/")) return WidgetConfig_bg.BGM_BASE_URL + url;

  return url;
}

function decodeHtml_bg(str) {
  if (!str) return "";
  return String(str)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}
