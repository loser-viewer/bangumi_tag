// ============= UserScript =============

const CONSTANTS_bg = {
  MEDIA_TYPES: {
    TV: "tv",
    MOVIE: "movie",
    ANIME: "anime"
  },
  SHORT_FILM_KEYWORDS: ["剧场版", "电影", "movie", "总集篇", "完结篇", "短片", "OVA", "OAD"]
};

const WidgetConfig_bg = {
  BGM_BASE_URL: "https://bgm.tv",
  BGM_TAG_URL: "https://bgm.tv/anime/tag",
  TMDB_IMAGE_BASE: "https://image.tmdb.org/t/p/w500",
  TMDB_BACKDROP_BASE: "https://image.tmdb.org/t/p/w780",
  TMDB_SEARCH_MIN_SCORE: 55
};

WidgetMetadata = {
  id: "forward.bangumi.simple.tag.tmdb",
  title: "Bangumi 动画标签",
  description: "按标签浏览 Bangumi 动画（轻量 TMDB 匹配版）",
  author: "ChatGPT",
  version: "1.1.0",
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
          multiple: false,
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

async function fetchBangumiTagPage_bg(params = {}) {
  const tag = (params.tag_keyword || "").trim();
  const sort = params.sort || "rank";
  const page = parseInt(params.page, 10) || 1;

  if (!tag) return [];

  const url =
    `${WidgetConfig_bg.BGM_TAG_URL}/${encodeURIComponent(tag)}?sort=${encodeURIComponent(sort)}&page=${page}`;

  return await processBangumiTagPage_bg(url);
}

async function processBangumiTagPage_bg(url) {
  const res = await Widget.http.get(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1"
    }
  });

  const html = typeof res?.data === "string" ? res.data : "";
  if (!html) return [];

  const list = [];

  const listBlock =
    html.match(/<ul[^>]*id="browserItemList"[^>]*>[\s\S]*?<\/ul>/)?.[0] ||
    html.match(/<ul[^>]*class="[^"]*browserFull[^"]*"[^>]*>[\s\S]*?<\/ul>/)?.[0] ||
    "";

  if (!listBlock) return [];

  const items = listBlock.match(/<li[^>]*class="[^"]*\bitem\b[^"]*"[^>]*>[\s\S]*?<\/li>/g) || [];

  for (const itemHtml of items) {
    const bgmItem = parseBangumiListItem_bg(itemHtml);
    if (!bgmItem) continue;

    const enhancedItem = await tryMatchTmdbForBangumi_bg(bgmItem);
    list.push(enhancedItem || bgmItem);
  }

  return list;
}

function parseBangumiListItem_bg(item) {
  const bgmId = item.match(/\/subject\/(\d+)/)?.[1] || "";
  if (!bgmId) return null;

  let title =
    item.match(/<h3>[\s\S]*?<a[^>]*title="([^"]+)"[^>]*>/)?.[1] ||
    item.match(/<h3>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/)?.[1] ||
    "";

  title = decodeHtml_bg(stripTags_bg(title)).trim();
  if (!title) return null;

  let cover =
    item.match(/<img[^>]+src="([^"]+)"/)?.[1] ||
    item.match(/<img[^>]+data-cfsrc="([^"]+)"/)?.[1] ||
    "";

  cover = normalizeUrl_bg(cover);
  if (cover) cover = cover.replace("/s/", "/l/");

  const score =
    item.match(/<span[^>]*class="fade"[^>]*>([\d.]+)<\/span>/)?.[1] || "";

  const rank =
    item.match(/<span[^>]*class="rank"[^>]*>#?(\d+)<\/span>/)?.[1] || "";

  const infoRaw =
    item.match(/<p[^>]*class="info"[^>]*>([\s\S]*?)<\/p>/)?.[1] || "";

  const info = decodeHtml_bg(
    stripTags_bg(infoRaw).replace(/\s+/g, " ").trim()
  );

  const smallTitleRaw =
    item.match(/<small[^>]*class="grey"[^>]*>([\s\S]*?)<\/small>/)?.[1] || "";

  const smallTitle = decodeHtml_bg(stripTags_bg(smallTitleRaw)).trim();

  const year = extractYear_bg(info);
  const mediaType = detectAnimeMediaType_bg(title, smallTitle, info);

  const descParts = [];
  if (rank) descParts.push(`排名 #${rank}`);
  if (score) descParts.push(`评分 ${score}`);
  if (info) descParts.push(info);

  return {
    id: bgmId,
    bgm_id: bgmId,
    type: "bangumi",
    mediaType: CONSTANTS_bg.MEDIA_TYPES.ANIME,
    title,
    originalTitle: smallTitle || title,
    chineseTitle: title,
    coverUrl: cover,
    description: descParts.join(" · "),
    releaseDate: year ? `${year}-01-01` : "",
    infoText: info,
    tmdbSearchType: mediaType,
    url: `${WidgetConfig_bg.BGM_BASE_URL}/subject/${bgmId}`
  };
}

async function tryMatchTmdbForBangumi_bg(item) {
  try {
    const year = extractYear_bg(item.releaseDate || item.infoText || "");
    const tmdbType = item.tmdbSearchType || CONSTANTS_bg.MEDIA_TYPES.TV;

    const tmdbRes = await searchTmdbLight_bg({
      originalTitle: item.originalTitle || "",
      chineseTitle: item.chineseTitle || "",
      listTitle: item.title || "",
      searchMediaType: tmdbType,
      year
    });

    if (!tmdbRes || !tmdbRes.id) {
      return item;
    }

    return integrateTmdbLight_bg(item, tmdbRes, tmdbType);
  } catch (e) {
    return item;
  }
}

async function searchTmdbLight_bg({
  originalTitle = "",
  chineseTitle = "",
  listTitle = "",
  searchMediaType = "tv",
  year = ""
}) {
  const queries = uniqueNonEmpty_bg([
    normalizeTmdbQuery_bg(originalTitle),
    normalizeTmdbQuery_bg(chineseTitle),
    normalizeTmdbQuery_bg(listTitle)
  ]);

  let best = null;
  let bestScore = -Infinity;

  for (const query of queries.slice(0, 3)) {
    const params = {
      query,
      language: "zh-CN",
      page: 1,
      include_adult: true
    };

    if (/^\d{4}$/.test(String(year))) {
      if (searchMediaType === CONSTANTS_bg.MEDIA_TYPES.TV) {
        params.first_air_date_year = parseInt(year, 10);
      } else {
        params.primary_release_year = parseInt(year, 10);
      }
    }

    const data = await Widget.tmdb.get(`/search/${searchMediaType}`, { params });
    const results = Array.isArray(data?.results) ? data.results : [];

    for (const result of results.slice(0, 8)) {
      const score = calculateTmdbMatchScoreLight_bg(result, {
        originalTitle,
        chineseTitle,
        listTitle,
        year,
        searchMediaType
      });

      if (score > bestScore) {
        bestScore = score;
        best = result;
      }
    }

    if (bestScore >= 90) break;
  }

  if (bestScore < WidgetConfig_bg.TMDB_SEARCH_MIN_SCORE) {
    return null;
  }

  return best;
}

function calculateTmdbMatchScoreLight_bg(result, meta) {
  let score = 0;

  const resultTitle = normalizeTmdbQuery_bg(result.title || result.name || "");
  const resultOriginal = normalizeTmdbQuery_bg(result.original_title || result.original_name || "");

  const q1 = normalizeTmdbQuery_bg(meta.originalTitle || "");
  const q2 = normalizeTmdbQuery_bg(meta.chineseTitle || "");
  const q3 = normalizeTmdbQuery_bg(meta.listTitle || "");

  const titleMatched =
    (q1 && (resultTitle === q1 || resultOriginal === q1)) ||
    (q2 && (resultTitle === q2 || resultOriginal === q2)) ||
    (q3 && (resultTitle === q3 || resultOriginal === q3));

  if (titleMatched) {
    score += 70;
  } else {
    if (q1 && (resultTitle.includes(q1) || resultOriginal.includes(q1) || q1.includes(resultTitle))) score += 40;
    if (q2 && (resultTitle.includes(q2) || resultOriginal.includes(q2) || q2.includes(resultTitle))) score += 35;
    if (q3 && (resultTitle.includes(q3) || resultOriginal.includes(q3) || q3.includes(resultTitle))) score += 30;
  }

  const resultYear = extractYear_bg(result.release_date || result.first_air_date || "");
  const queryYear = extractYear_bg(meta.year || "");

  if (queryYear && resultYear) {
    const diff = Math.abs(parseInt(queryYear, 10) - parseInt(resultYear, 10));
    if (diff === 0) score += 20;
    else if (diff === 1) score += 10;
    else if (diff >= 2) score -= 15;
  }

  if (typeof result.vote_count === "number") {
    if (result.vote_count >= 100) score += 8;
    else if (result.vote_count >= 20) score += 4;
    else if (result.vote_count < 5) score -= 8;
  }

  if (typeof result.popularity === "number") {
    score += Math.min(result.popularity / 20, 5);
  }

  if (result.genre_ids && result.genre_ids.includes(16)) {
    score += 6;
  }

  return score;
}

function integrateTmdbLight_bg(baseItem, tmdbResult, tmdbType) {
  const title =
    tmdbResult.title ||
    tmdbResult.name ||
    baseItem.title;

  const description =
    tmdbResult.overview ||
    baseItem.description ||
    "";

  return {
    id: String(tmdbResult.id),
    type: "tmdb",
    title,
    description,
    releaseDate: tmdbResult.release_date || tmdbResult.first_air_date || baseItem.releaseDate || "",
    posterPath: tmdbResult.poster_path || "",
    backdropPath: tmdbResult.backdrop_path || "",
    rating: typeof tmdbResult.vote_average === "number"
      ? Number(tmdbResult.vote_average).toFixed(1)
      : "",
    mediaType: tmdbType,
    coverUrl: tmdbResult.poster_path
      ? `${WidgetConfig_bg.TMDB_IMAGE_BASE}${tmdbResult.poster_path}`
      : baseItem.coverUrl,
    bgm_id: baseItem.bgm_id,
    tmdb_id: String(tmdbResult.id),
    originalTitle: baseItem.originalTitle,
    chineseTitle: baseItem.chineseTitle
  };
}

function detectAnimeMediaType_bg(title, originalTitle, infoText) {
  const text = `${title || ""} ${originalTitle || ""} ${infoText || ""}`.toLowerCase();
  return CONSTANTS_bg.SHORT_FILM_KEYWORDS.some(k => text.includes(String(k).toLowerCase()))
    ? CONSTANTS_bg.MEDIA_TYPES.MOVIE
    : CONSTANTS_bg.MEDIA_TYPES.TV;
}

function extractYear_bg(text) {
  const m = String(text || "").match(/(19|20)\d{2}/);
  return m ? m[0] : "";
}

function normalizeTmdbQuery_bg(str) {
  return String(str || "")
    .replace(/<[^>]*>/g, "")
    .replace(/[‐-–—]/g, "-")
    .replace(/[【】\[\]（）()]/g, " ")
    .replace(/[!！?？:：·•,，.。/\\|]/g, " ")
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
