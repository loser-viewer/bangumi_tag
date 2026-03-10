// ============= UserScript =============
// @name         Bangumi 标签动画
// @version      1.0.0
// @description  按标签浏览 Bangumi 动画，并使用 TMDB 匹配结果展示
// @author       extract
// ============= UserScript =============

WidgetMetadata = {
  id: "forward.bangumi.tag.only",
  title: "Bangumi 动画标签",
  description: "按标签浏览 Bangumi 动画（独立版）",
  author: "extract",
  version: "1.0.0",
  requiredVersion: "0.0.1",
  modules: [
    {
      title: "Bangumi 动画标签",
      description: "按标签抓取 Bangumi 动画，并匹配 TMDB",
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

const WidgetConfig_bg = {
  BGM_BASE_URL: "https://bgm.tv",
  BGM_TAG_URL: "https://bgm.tv/anime/tag",
  TMDB_IMAGE_BASE: "https://image.tmdb.org/t/p/w500",
  MIN_MATCH_THRESHOLD: 0.7,
  FETCH_BATCH_SIZE: 6
};

const CONSTANTS_bg = {
  MEDIA_TYPES: {
    TV: "tv",
    MOVIE: "movie",
    MULTI: "multi"
  },
  SHORT_FILM_KEYWORDS: [
    "剧场版", "电影", "movie", "总集篇", "完结篇", "短片", "ova", "oad"
  ]
};

const tmdbCache_bg = {};

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
// 抓取 Bangumi 标签页
// ==========================
async function processBangumiTagPage_bg(url) {
  const response = await Widget.http.get(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)"
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
    listBlock.match(/<li[^>]*class="[^"]*\bitem\b[^"]*"[^>]*>[\s\S]*?<\/li>/g) || [];

  const bangumiItems = itemBlocks
    .map(parseBangumiListItem_bg)
    .filter(Boolean);

  if (bangumiItems.length === 0) return [];

  const finalItems = [];

  for (let i = 0; i < bangumiItems.length; i += WidgetConfig_bg.FETCH_BATCH_SIZE) {
    const batch = bangumiItems.slice(i, i + WidgetConfig_bg.FETCH_BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(item => matchBangumiToTmdb_bg(item))
    );
    finalItems.push(...batchResults.filter(Boolean));
  }

  return finalItems;
}

// ==========================
// 解析 Bangumi 列表项
// ==========================
function parseBangumiListItem_bg(itemHtml) {
  const id = itemHtml.match(/\/subject\/(\d+)/)?.[1] || "";

  let title =
    itemHtml.match(/<h3>[\s\S]*?<a[^>]*title="([^"]+)"[^>]*>/)?.[1] ||
    itemHtml.match(/<h3>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/)?.[1] ||
    "";

  title = decodeHtml_bg(stripTags_bg(title)).trim();
  if (!id || !title) return null;

  let originalTitle =
    itemHtml.match(/<small[^>]*class="grey"[^>]*>([\s\S]*?)<\/small>/)?.[1] || "";

  originalTitle = decodeHtml_bg(stripTags_bg(originalTitle)).trim();

  let cover =
    itemHtml.match(/<img[^>]+src="([^"]+)"/)?.[1] ||
    itemHtml.match(/<img[^>]+data-cfsrc="([^"]+)"/)?.[1] ||
    "";

  cover = normalizeUrl_bg(cover);
  if (cover) cover = cover.replace("/s/", "/l/");

  const infoRaw =
    itemHtml.match(/<p[^>]*class="info"[^>]*>([\s\S]*?)<\/p>/)?.[1] || "";

  const info = decodeHtml_bg(stripTags_bg(infoRaw)).replace(/\s+/g, " ").trim();

  const year = extractYear_bg(info);
  const mediaType = detectItemTypeFromContent_bg({
    title,
    originalTitle,
    description: info
  });

  const normalized = normalizeBangumiTitle_bg({
    title,
    originalTitle,
    info
  });

  return {
    id,
    bgm_id: id,
    title: normalized.title,
    chineseTitle: normalized.chineseTitle,
    originalTitle: normalized.originalTitle,
    aliases: normalized.aliases,
    description: info,
    coverUrl: cover,
    year: year || "",
    releaseDate: year ? `${year}-01-01` : "",
    tmdbSearchType: mediaType || CONSTANTS_bg.MEDIA_TYPES.TV
  };
}

// ==========================
// 标题预处理（模仿影视榜单思路）
// ==========================
function normalizeBangumiTitle_bg(item) {
  let zh = item.title || "";
  let orig = item.originalTitle || item.title || "";
  let aliases = [];

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

// ==========================
// Bangumi -> TMDB
// ==========================
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

  const tmdbCandidates = await fetchTmdbDataForBangumi_bg(item, item.tmdbSearchType);

  if (!tmdbCandidates || tmdbCandidates.length === 0) return null;

  const bestMatch = selectMatches_bg(
    tmdbCandidates,
    item.originalTitle || item.title,
    item.year,
    {
      preferredType: item.tmdbSearchType,
      minThreshold: WidgetConfig_bg.MIN_MATCH_THRESHOLD,
      sourceItem: item
    }
  );

  if (!bestMatch) return null;

  // 只保留动画
  if (!bestMatch.genre_ids || !bestMatch.genre_ids.includes(16)) {
    return null;
  }

  tmdbCache_bg[cacheKey] = bestMatch;
  return integrateTmdbItem_bg(item, bestMatch);
}

// ==========================
// 搜 TMDB（模仿影视榜单思路）
// ==========================
async function fetchTmdbDataForBangumi_bg(item, mediaType) {
  let searchTypes = [];

  if (mediaType === CONSTANTS_bg.MEDIA_TYPES.MOVIE) {
    searchTypes = ["movie"];
  } else if (mediaType === CONSTANTS_bg.MEDIA_TYPES.TV) {
    searchTypes = ["tv"];
  } else {
    searchTypes = ["movie", "tv"];
  }

  const queries = uniqueNonEmpty_bg([
    normalizeSearchKeyword_bg(item.originalTitle),
    normalizeSearchKeyword_bg(item.chineseTitle),
    normalizeSearchKeyword_bg(item.title),
    ...(item.aliases || []).map(normalizeSearchKeyword_bg)
  ]);

  const allResults = [];
  const seen = new Set();

  for (const type of searchTypes) {
    for (const query of queries.slice(0, 4)) {
      for (const lang of ["zh-CN", "ja-JP"]) {
        try {
          const params = {
            query,
            language: lang,
            page: 1
          };

          if (item.year) {
            if (type === "tv") {
              params.first_air_date_year = parseInt(item.year, 10);
            } else {
              params.primary_release_year = parseInt(item.year, 10);
            }
          }

          const tmdbResults = await Widget.tmdb.get(`/search/${type}`, {
            params
          });

          const results = Array.isArray(tmdbResults?.results) ? tmdbResults.results : [];

          for (const result of results) {
            const key = `${type}_${result.id}`;
            if (!seen.has(key)) {
              seen.add(key);
              allResults.push({
                ...result,
                media_type: type
              });
            }
          }
        } catch (e) {}
      }
    }
  }

  return allResults;
}

// ==========================
// 选最佳候选
// ==========================
function selectMatches_bg(tmdbResults, originalTitle, originalYear, options = {}) {
  if (!tmdbResults || tmdbResults.length === 0) return null;

  if (tmdbResults.length === 1) {
    const score = calculateMatchScore_bg(
      tmdbResults[0],
      originalTitle,
      originalYear,
      options.preferredType,
      options.sourceItem
    );
    return score >= (options.minThreshold || 0) ? tmdbResults[0] : null;
  }

  const preferredType = options.preferredType || null;
  const minThreshold = options.minThreshold || 0;
  const sourceItem = options.sourceItem || null;

  let bestMatch = null;
  let bestScore = -Infinity;

  for (const result of tmdbResults) {
    const score = calculateMatchScore_bg(
      result,
      originalTitle,
      originalYear,
      preferredType,
      sourceItem
    );

    if (score > bestScore) {
      bestScore = score;
      bestMatch = result;
    }
  }

  if (bestScore < minThreshold) return null;
  return bestMatch;
}

// ==========================
// 打分（模仿影视榜单思路）
// ==========================
function calculateMatchScore_bg(result, originalTitle, originalYear, preferredType = null, sourceItem = null) {
  const tmdbTitle = result.title || result.name || "";
  const originalName = result.original_title || result.original_name || "";

  const titleSimilarity = Math.max(
    calculateSimilarity_bg(originalTitle, tmdbTitle),
    calculateSimilarity_bg(originalTitle, originalName)
  );

  let exactMatchBonus = 0;
  if (titleSimilarity >= 0.98) {
    exactMatchBonus = 2.0;
  } else if (titleSimilarity >= 0.9) {
    exactMatchBonus = 1.0;
  }

  let yearBonus = 0;
  if (originalYear) {
    const tmdbYear = (result.release_date || result.first_air_date || "").substring(0, 4);
    if (tmdbYear && Math.abs(parseInt(originalYear, 10) - parseInt(tmdbYear, 10)) <= 1) {
      yearBonus = 0.2;
    }
  }

  let typeBonus = 0;
  if (preferredType && result.media_type === preferredType) {
    typeBonus += 1.0;
  }

  if (sourceItem) {
    if (sourceItem.tmdbSearchType === "tv" && result.media_type === "tv") {
      typeBonus += 0.3;
    }
    if (sourceItem.tmdbSearchType === "movie" && result.media_type === "movie") {
      typeBonus += 0.3;
    }
  }

  let animationBonus = 0;
  if (result.genre_ids && result.genre_ids.includes(16)) {
    animationBonus += 0.6;
  } else {
    animationBonus -= 0.6;
  }

  const popularityBonus = Math.min((result.popularity || 0) / 10000, 0.05);
  const ratingBonus = Math.min((result.vote_average || 0) / 200, 0.025);

  return titleSimilarity + exactMatchBonus + yearBonus + typeBonus + animationBonus + popularityBonus + ratingBonus;
}

// ==========================
// 相似度（编辑距离）
// ==========================
function calculateSimilarity_bg(str1, str2) {
  const cleanStr1 = normalizeCompareText_bg(str1);
  const cleanStr2 = normalizeCompareText_bg(str2);

  if (!cleanStr1 || !cleanStr2) return 0;
  if (cleanStr1 === cleanStr2) return 1.0;

  const longer = cleanStr1.length > cleanStr2.length ? cleanStr1 : cleanStr2;
  const shorter = cleanStr1.length > cleanStr2.length ? cleanStr2 : cleanStr1;

  if (longer.length === 0) return 1.0;

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

// ==========================
// 整合返回结果
// ==========================
function integrateTmdbItem_bg(baseItem, tmdbItem) {
  const posterPath = tmdbItem.poster_path || "";
  const backdropPath = tmdbItem.backdrop_path || "";
  const fullCoverUrl = posterPath
    ? `${WidgetConfig_bg.TMDB_IMAGE_BASE}${posterPath}`
    : (baseItem.coverUrl || "");

  return {
    id: String(tmdbItem.id),
    type: "tmdb",
    title: tmdbItem.title || tmdbItem.name || baseItem.title,
    description: tmdbItem.overview || baseItem.description || "",
    releaseDate:
      tmdbItem.release_date ||
      tmdbItem.first_air_date ||
      baseItem.releaseDate ||
      "",
    coverUrl: fullCoverUrl,
    posterPath: posterPath,
    backdropPath: backdropPath,
    rating:
      typeof tmdbItem.vote_average === "number"
        ? Number(tmdbItem.vote_average).toFixed(1)
        : "",
    mediaType: tmdbItem.media_type || baseItem.tmdbSearchType
  };
}

// ==========================
// 类型判断
// ==========================
function detectItemTypeFromContent_bg(item) {
  const aliases = (item.originalTitle || "").toLowerCase();
  const description = (item.description || "").toLowerCase();
  const title = (item.title || "").toLowerCase();

  if (
    aliases.includes("电影") ||
    aliases.includes("剧场版") ||
    title.includes("剧场版") ||
    description.includes("剧场版")
  ) {
    return CONSTANTS_bg.MEDIA_TYPES.MOVIE;
  }

  return CONSTANTS_bg.MEDIA_TYPES.TV;
}

// ==========================
// 工具函数
// ==========================
function normalizeSearchKeyword_bg(str) {
  let s = String(str || "").trim();

  const rules = [
    { pattern: / 第[一二三四五六七八九十0-9]+季/g, replacement: "" },
    { pattern: /\bseason\s*\d+\b/ig, replacement: "" },
    { pattern: /\bpart\s*\d+\b/ig, replacement: "" },
    { pattern: /剧场版/g, replacement: "" },
    { pattern: /總集篇|总集篇/g, replacement: "" },
    { pattern: /完整版|完全版/g, replacement: "" }
  ];

  for (const rule of rules) {
    s = s.replace(rule.pattern, rule.replacement);
  }

  return s.replace(/\s+/g, " ").trim();
}

function normalizeCompareText_bg(str) {
  return normalizeSearchKeyword_bg(str)
    .toLowerCase()
    .replace(/[^\u4e00-\u9fa5a-z0-9]/g, "");
}

function extractYear_bg(text) {
  const m = String(text || "").match(/(19|20)\d{2}/);
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

function uniqueNonEmpty_bg(arr) {
  return [...new Set(arr.filter(Boolean))];
}
