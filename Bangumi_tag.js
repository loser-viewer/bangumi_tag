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
  TMDB_SEARCH_MIN_SCORE: 0.72
};

WidgetMetadata = {
  id: "forward.bangumi.simple.tag.tmdb",
  title: "Bangumi 动画标签",
  description: "按标签浏览 Bangumi 动画",
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
      "User-Agent":
        "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)"
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

  const items =
    listBlock.match(/<li[^>]*class="[^"]*\bitem\b[^"]*"[^>]*>[\s\S]*?<\/li>/g) || [];

  const bgmItems = items
    .map(parseBangumiListItem_bg)
    .filter(Boolean);

  const batchSize = 10;

  for (let i = 0; i < bgmItems.length; i += batchSize) {
    const batch = bgmItems.slice(i, i + batchSize);

    const results = await Promise.all(
      batch.map(item => tryMatchTmdbForBangumi_bg(item))
    );

    for (const enhancedItem of results) {
      if (enhancedItem) list.push(enhancedItem);
    }
  }

  return list;
}

function parseBangumiListItem_bg(item) {
  const id = item.match(/\/subject\/(\d+)/)?.[1];

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
  const mediaType = detectAnimeMediaType_bg(title, smallTitle, info);

  return {
    id,
    bgm_id: id,
    title,
    originalTitle: smallTitle || title,
    chineseTitle: title,
    coverUrl: cover,
    description: info,
    releaseDate: year ? `${year}-01-01` : "",
    infoText: info,
    tmdbSearchType: mediaType
  };
}

async function tryMatchTmdbForBangumi_bg(item) {
  const year = extractYear_bg(item.releaseDate || item.infoText || "");
  const tmdbType = item.tmdbSearchType || CONSTANTS_bg.MEDIA_TYPES.TV;

  const cacheKey = [
    normalizeTmdbQuery_bg(item.originalTitle),
    normalizeTmdbQuery_bg(item.chineseTitle),
    tmdbType,
    year
  ].join("_");

  if (tmdbCache_bg[cacheKey]) {
    return integrateTmdbLight_bg(item, tmdbCache_bg[cacheKey], tmdbType);
  }

  const tmdbRes = await searchTmdbLight_bg({
    originalTitle: item.originalTitle,
    chineseTitle: item.chineseTitle,
    listTitle: item.title,
    searchMediaType: tmdbType,
    year
  });

  if (!tmdbRes) return null;

  tmdbCache_bg[cacheKey] = tmdbRes;

  return integrateTmdbLight_bg(item, tmdbRes, tmdbType);
}

async function searchTmdbLight_bg({
  originalTitle = "",
  chineseTitle = "",
  listTitle = "",
  searchMediaType = "tv",
  year = ""
}) {
  const queries = uniqueNonEmpty_bg([
    normalizeSearchKeyword_bg(originalTitle),
    normalizeSearchKeyword_bg(chineseTitle),
    normalizeSearchKeyword_bg(listTitle)
  ]);

  let allResults = [];
  const tried = new Set();

  const searchTypes =
    searchMediaType === CONSTANTS_bg.MEDIA_TYPES.MOVIE
      ? [CONSTANTS_bg.MEDIA_TYPES.MOVIE, CONSTANTS_bg.MEDIA_TYPES.TV]
      : [CONSTANTS_bg.MEDIA_TYPES.TV, CONSTANTS_bg.MEDIA_TYPES.MOVIE];

  for (const type of searchTypes) {
    for (const query of queries.slice(0, 3)) {
      const key = `${type}:${query}`;
      if (!query || tried.has(key)) continue;
      tried.add(key);

      const params = {
        query,
        language: "zh-CN",
        page: 1
      };

      if (year) {
        if (type === CONSTANTS_bg.MEDIA_TYPES.TV) {
          params.first_air_date_year = parseInt(year, 10);
        } else {
          params.primary_release_year = parseInt(year, 10);
        }
      }

      try {
        const data = await Widget.tmdb.get(`/search/${type}`, { params });
        const results = Array.isArray(data?.results) ? data.results : [];

        allResults.push(
          ...results.map(result => ({
            ...result,
            media_type: type
          }))
        );
      } catch (e) {}
    }
  }

  if (allResults.length === 0) return null;

  const bestMatch = selectMatches_bg(
    allResults,
    originalTitle || chineseTitle || listTitle,
    year,
    {
      preferredType: searchMediaType,
      minThreshold: WidgetConfig_bg.TMDB_SEARCH_MIN_SCORE
    }
  );

  return bestMatch;
}

function selectMatches_bg(tmdbResults, originalTitle, originalYear, options = {}) {
  if (!tmdbResults || tmdbResults.length === 0) return null;
  if (tmdbResults.length === 1) {
    const only = tmdbResults[0];
    const onlyScore = calculateMatchScore_bg(only, originalTitle, originalYear, options.preferredType);
    return onlyScore >= (options.minThreshold || 0) ? only : null;
  }

  const preferredType = options.preferredType || null;
  const minThreshold = options.minThreshold || 0;

  let bestMatch = null;
  let bestScore = -Infinity;

  for (const result of tmdbResults) {
    const score = calculateMatchScore_bg(result, originalTitle, originalYear, preferredType);

    if (score > bestScore) {
      bestScore = score;
      bestMatch = result;
    }
  }

  if (bestScore < minThreshold) return null;
  return bestMatch;
}

function calculateMatchScore_bg(result, originalTitle, originalYear, preferredType = null) {
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
    if (tmdbYear) {
      const diff = Math.abs(parseInt(originalYear, 10) - parseInt(tmdbYear, 10));
      if (diff === 0) yearBonus = 0.25;
      else if (diff === 1) yearBonus = 0.12;
      else if (diff >= 2) yearBonus = -0.08;
    }
  }

  let typeBonus = 0;
  if (preferredType && result.media_type === preferredType) {
    typeBonus = 1.0;
  }

  let animationBonus = 0;
  if (result.genre_ids && result.genre_ids.includes(16)) {
    animationBonus = 0.4;
  } else {
    animationBonus = -0.35;
  }

  const popularityBonus = Math.min((result.popularity || 0) / 10000, 0.05);
  const ratingBonus = Math.min((result.vote_average || 0) / 200, 0.025);

  return titleSimilarity + exactMatchBonus + yearBonus + typeBonus + animationBonus + popularityBonus + ratingBonus;
}

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

function integrateTmdbLight_bg(baseItem, tmdbResult, tmdbType) {
  if (!tmdbResult.genre_ids || !tmdbResult.genre_ids.includes(16)) {
    return null;
  }

  return {
    id: String(tmdbResult.id),
    type: "tmdb",
    title: tmdbResult.title || tmdbResult.name || baseItem.title,
    description: tmdbResult.overview || baseItem.description,
    releaseDate:
      tmdbResult.release_date ||
      tmdbResult.first_air_date ||
      baseItem.releaseDate,
    rating:
      typeof tmdbResult.vote_average === "number"
        ? Number(tmdbResult.vote_average).toFixed(1)
        : "",
    mediaType: tmdbType,
    coverUrl: tmdbResult.poster_path
      ? `${WidgetConfig_bg.TMDB_IMAGE_BASE}${tmdbResult.poster_path}`
      : baseItem.coverUrl
  };
}

function detectAnimeMediaType_bg(title, originalTitle, infoText) {
  const text =
    `${title || ""} ${originalTitle || ""} ${infoText || ""}`.toLowerCase();

  return CONSTANTS_bg.SHORT_FILM_KEYWORDS.some(k =>
    text.includes(k.toLowerCase())
  )
    ? CONSTANTS_bg.MEDIA_TYPES.MOVIE
    : CONSTANTS_bg.MEDIA_TYPES.TV;
}

function extractYear_bg(text) {
  const m = String(text || "").match(/(19|20)\d{2}/);
  return m ? m[0] : "";
}

function normalizeSearchKeyword_bg(str) {
  return String(str || "")
    .replace(/<[^>]*>/g, "")
    .replace(/[【】\[\]（）()]/g, " ")
    .replace(/[!！?？:：·•,，.。/\\|]/g, " ")
    .replace(/\bseason\s*\d+\b/ig, " ")
    .replace(/\bpart\s*\d+\b/ig, " ")
    .replace(/第\s*\d+\s*季/g, " ")
    .replace(/第\s*\d+\s*期/g, " ")
    .replace(/第\s*\d+\s*部/g, " ")
    .replace(/第\s*\d+\s*卷/g, " ")
    .replace(/剧场版/g, " ")
    .replace(/總集篇|总集篇/g, " ")
    .replace(/完整版|完全版/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCompareText_bg(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/[^\u4e00-\u9fa5a-z0-9]/g, "");
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
