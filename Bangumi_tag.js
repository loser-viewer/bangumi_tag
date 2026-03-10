// ============= UserScript =============

const CONSTANTS_bg = {
  MEDIA_TYPES: {
    TV: "tv",
    MOVIE: "movie",
    ANIME: "anime"
  },
  SHORT_FILM_KEYWORDS: [
    "剧场版",
    "电影",
    "movie",
    "总集篇",
    "完结篇",
    "短片",
    "OVA",
    "OAD"
  ]
};

const WidgetConfig_bg = {
  BGM_BASE_URL: "https://bgm.tv",
  BGM_TAG_URL: "https://bgm.tv/anime/tag",
  TMDB_IMAGE_BASE: "https://image.tmdb.org/t/p/w500",
  TMDB_SEARCH_MIN_SCORE: 60,
  MAX_MATCH_ITEMS: 12
};

const tmdbCache_bg = {};

WidgetMetadata = {
  id: "forward.bangumi.simple.tag.tmdb",
  title: "Bangumi 动画标签",
  description: "Bangumi 标签浏览 + TMDB 匹配（优化版）",
  author: "ChatGPT",
  version: "2.0.0",
  requiredVersion: "0.0.1",
  modules: [
    {
      title: "Bangumi 动画标签",
      description: "输入标签后返回动画列表",
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
// Bangumi 页面解析
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

  const bgmItems = items
    .map(parseBangumiItem_bg)
    .filter(Boolean)
    .slice(0, WidgetConfig_bg.MAX_MATCH_ITEMS);

  const results = await Promise.all(
    bgmItems.map(item => tryMatchTmdbForBangumi_bg(item))
  );

  return results.filter(Boolean);
}

// ==========================
// 解析 Bangumi 条目
// ==========================
function parseBangumiItem_bg(item) {

  const id = item.match(/\/subject\/(\d+)/)?.[1];
  if (!id) return null;

  let title =
    item.match(/title="([^"]+)"/)?.[1] ||
    item.match(/<h3>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/)?.[1] ||
    "";

  title = stripTags_bg(title).trim();

  let cover = item.match(/<img[^>]+src="([^"]+)"/)?.[1] || "";

  cover = normalizeUrl_bg(cover);

  const infoRaw =
    item.match(/<p[^>]*class="info"[^>]*>([\s\S]*?)<\/p>/)?.[1] || "";

  const info = stripTags_bg(infoRaw);

  const smallTitle =
    stripTags_bg(
      item.match(/<small[^>]*>([\s\S]*?)<\/small>/)?.[1] || ""
    ).trim();

  const year = extractYear_bg(info);

  const type = detectAnimeMediaType_bg(title, smallTitle, info);

  return {
    bgm_id: id,
    title,
    originalTitle: smallTitle || title,
    chineseTitle: title,
    coverUrl: cover,
    releaseDate: year ? `${year}-01-01` : "",
    tmdbSearchType: type
  };
}

// ==========================
// TMDB 匹配
// ==========================
async function tryMatchTmdbForBangumi_bg(item) {

  const cacheKey = `${item.originalTitle}_${item.tmdbSearchType}`;

  if (tmdbCache_bg[cacheKey]) {
    return integrateTmdb_bg(item, tmdbCache_bg[cacheKey]);
  }

  const tmdbRes = await searchTmdb_bg(item);

  if (!tmdbRes) return null;

  tmdbCache_bg[cacheKey] = tmdbRes;

  return integrateTmdb_bg(item, tmdbRes);
}

// ==========================
// TMDB 搜索
// ==========================
async function searchTmdb_bg(item) {

  const queries = uniqueNonEmpty_bg([
    normalizeQuery_bg(item.originalTitle),
    normalizeQuery_bg(item.chineseTitle)
  ]);

  let best = null;
  let bestScore = -999;

  for (const query of queries.slice(0, 2)) {

    const params = {
      query,
      language: "zh-CN",
      page: 1
    };

    const data = await Widget.tmdb.get(
      `/search/${item.tmdbSearchType}`,
      { params }
    );

    const results = data?.results || [];

    for (const r of results.slice(0, 6)) {

      const score = calculateScore_bg(r, item);

      if (score > bestScore) {
        bestScore = score;
        best = r;
      }
    }

    if (bestScore > 85) break;
  }

  if (bestScore < WidgetConfig_bg.TMDB_SEARCH_MIN_SCORE) {
    return null;
  }

  return best;
}

// ==========================
// 打分
// ==========================
function calculateScore_bg(result, item) {

  let score = 0;

  const title =
    (result.title || result.name || "").toLowerCase();

  const query =
    (item.originalTitle || "").toLowerCase();

  if (title === query) score += 60;

  if (title.includes(query)) score += 30;

  const year1 = extractYear_bg(
    result.release_date || result.first_air_date
  );

  const year2 = extractYear_bg(item.releaseDate);

  if (year1 && year2) {
    const diff = Math.abs(year1 - year2);
    if (diff === 0) score += 20;
    else if (diff === 1) score += 10;
  }

  if (result.genre_ids?.includes(16)) score += 5;

  if (result.vote_count > 50) score += 5;

  return score;
}

// ==========================
// 整合 TMDB 数据
// ==========================
function integrateTmdb_bg(item, tmdb) {

  return {
    id: String(tmdb.id),
    type: "tmdb",
    title: tmdb.title || tmdb.name,
    mediaType: item.tmdbSearchType,
    coverUrl: tmdb.poster_path
      ? `${WidgetConfig_bg.TMDB_IMAGE_BASE}${tmdb.poster_path}`
      : item.coverUrl,
    description: tmdb.overview || "",
    releaseDate:
      tmdb.release_date || tmdb.first_air_date || "",
    rating: tmdb.vote_average?.toFixed(1) || "",
    tmdb_id: String(tmdb.id),
    bgm_id: item.bgm_id
  };
}

// ==========================
// 工具函数
// ==========================
function detectAnimeMediaType_bg(title, originalTitle, info) {

  const text =
    `${title} ${originalTitle} ${info}`.toLowerCase();

  return CONSTANTS_bg.SHORT_FILM_KEYWORDS.some(k =>
    text.includes(k.toLowerCase())
  )
    ? CONSTANTS_bg.MEDIA_TYPES.MOVIE
    : CONSTANTS_bg.MEDIA_TYPES.TV;
}

function extractYear_bg(text) {
  const m = String(text || "").match(/(19|20)\d{2}/);
  return m ? parseInt(m[0]) : "";
}

function normalizeQuery_bg(str) {
  return String(str || "")
    .replace(/<[^>]*>/g, "")
    .replace(/[【】()（）]/g, "")
    .replace(/\s+/g, " ")
    .trim();
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
