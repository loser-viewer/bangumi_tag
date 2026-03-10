// ============= UserScript =============

WidgetMetadata = {
  id: "forward.bangumi.tag.only",
  title: "Bangumi 动画标签",
  description: "Bangumi 标签浏览 + TMDB匹配（中文别名优先版）",
  author: "extract",
  version: "1.5.2",
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
            { title: "日期", value: "date" }
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
  FETCH_BATCH_SIZE: 8
};

const tmdbCache_bg = {};
const tmdbSearchCache_bg = {};
const bgmAliasCache_bg = {};


// ==============================
// 入口
// ==============================
async function fetchBangumiTagPage_bg(params = {}) {
  const tag = (params.tag_keyword || "").trim();
  const sort = params.sort || "rank";
  const page = parseInt(params.page, 10) || 1;

  if (!tag) return [];

  const url =
    `${WidgetConfig_bg.BGM_TAG_URL}/${encodeURIComponent(tag)}?sort=${sort}&page=${page}`;

  return await processBangumiTagPage_bg(url);
}


// ==============================
// 抓 Bangumi 页面
// ==============================
async function processBangumiTagPage_bg(url) {
  const response = await Widget.http.get(url);
  const html = typeof response?.data === "string" ? response.data : "";

  if (!html) return [];

  const listBlock =
    html.match(/<ul[^>]*id="browserItemList"[^>]*>[\s\S]*?<\/ul>/)?.[0] || "";

  const itemBlocks =
    listBlock.match(/<li[^>]*class="[^"]*item[^"]*"[^>]*>[\s\S]*?<\/li>/g) || [];

  const bangumiItems =
    itemBlocks.map(parseBangumiListItem_bg).filter(Boolean);

  const results = [];

  for (let i = 0; i < bangumiItems.length; i += WidgetConfig_bg.FETCH_BATCH_SIZE) {
    const batch = bangumiItems.slice(i, i + WidgetConfig_bg.FETCH_BATCH_SIZE);

    // 先抓 Bangumi 中文别名，再做 TMDB 匹配
    const batchWithAlias = await Promise.all(
      batch.map(fetchBangumiChineseAlias_bg)
    );

    const batchResults = await Promise.all(
      batchWithAlias.map(matchBangumiToTmdb_bg)
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

  title = stripTags_bg(title).trim();

  const originalTitle =
    stripTags_bg(
      html.match(/<small[^>]*>([\s\S]*?)<\/small>/)?.[1] || ""
    ).trim();

  const info =
    stripTags_bg(
      html.match(/<p[^>]*class="info"[^>]*>([\s\S]*?)<\/p>/)?.[1] || ""
    ).trim();

  const cover =
    html.match(/<img[^>]+src="([^"]+)"/)?.[1] || "";

  const releaseDate = parseDate_bg(info);
  const year = extractYear_bg(releaseDate || info);

  return {
    id,
    title,
    originalTitle,
    description: info,
    coverUrl: normalizeUrl_bg(cover),
    year,
    releaseDate,
    detailUrl: `${WidgetConfig_bg.BGM_BASE_URL}/subject/${id}`,
    chineseAlias: "",
    tmdbSearchType: detectItemTypeFromContent_bg({
      title,
      originalTitle,
      info
    })
  };
}


// ==============================
// 抓 Bangumi 详情页中文别名
// ==============================
async function fetchBangumiChineseAlias_bg(item) {
  if (!item?.detailUrl) return item;

  if (bgmAliasCache_bg[item.id] !== undefined) {
    item.chineseAlias = bgmAliasCache_bg[item.id];
    return item;
  }

  try {
    const response = await Widget.http.get(item.detailUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)"
      }
    });

    const html = typeof response?.data === "string" ? response.data : "";
    if (!html) {
      bgmAliasCache_bg[item.id] = "";
      return item;
    }

    let chineseAlias =
      html.match(/<li>\s*<span class="tip">中文名:\s*<\/span>\s*([\s\S]*?)<\/li>/)?.[1] ||
      html.match(/<span class="tip">中文名:\s*<\/span>\s*([\s\S]*?)<\/li>/)?.[1] ||
      "";

    chineseAlias = stripTags_bg(chineseAlias).trim();

    if (containsChinese_bg(chineseAlias)) {
      bgmAliasCache_bg[item.id] = chineseAlias;
      item.chineseAlias = chineseAlias;
    } else {
      bgmAliasCache_bg[item.id] = "";
    }

    return item;
  } catch (e) {
    bgmAliasCache_bg[item.id] = "";
    return item;
  }
}


// ==============================
// 日期解析
// ==============================
function parseDate_bg(str) {
  if (!str) return "";

  let m;

  m = str.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (m) return `${m[1]}-${pad_bg(m[2])}-${pad_bg(m[3])}`;

  m = str.match(/(\d{4})年(\d{1,2})月/);
  if (m) return `${m[1]}-${pad_bg(m[2])}-01`;

  m = str.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${pad_bg(m[2])}-${pad_bg(m[3])}`;

  m = str.match(/(\d{4})-(\d{1,2})/);
  if (m) return `${m[1]}-${pad_bg(m[2])}-01`;

  return "";
}

function pad_bg(n) {
  return String(n).padStart(2, "0");
}


// ==============================
// 类型判断：TV / Movie
// ==============================
function detectItemTypeFromContent_bg(item) {
  const text = `${item.title || ""} ${item.originalTitle || ""} ${item.info || ""}`.toLowerCase();

  if (
    text.includes("剧场版") ||
    text.includes("电影") ||
    text.includes("movie") ||
    text.includes("film")
  ) {
    return "movie";
  }

  return "tv";
}


// ==============================
// TMDB 匹配
// ==============================
async function matchBangumiToTmdb_bg(item) {
  const cacheKey = `${item.title}_${item.originalTitle}_${item.chineseAlias}_${item.year}_${item.tmdbSearchType}`;

  if (tmdbCache_bg[cacheKey]) {
    return integrateTmdbItem_bg(item, tmdbCache_bg[cacheKey]);
  }

  const candidates = await fetchTmdbDataForBangumi_bg(item);

  if (!candidates.length) return null;

  const best =
    selectMatches_bg(candidates, item.title, item.originalTitle, item.chineseAlias, item.year, item.tmdbSearchType);

  if (!best) return null;

  tmdbCache_bg[cacheKey] = best;

  return integrateTmdbItem_bg(item, best);
}


// ==============================
// TMDB 搜索（缓存 + 并发）
// 中文别名优先
// ==============================
async function fetchTmdbDataForBangumi_bg(item) {
  const queries =
    generateQueries_bg(item.originalTitle, item.title, item.chineseAlias);

  const tasks = [];

  for (const query of queries) {
    const types = item.tmdbSearchType === "movie"
      ? ["movie", "tv"]
      : ["tv", "movie"];

    for (const type of types) {
      const cacheKey = `${type}_${query}_${item.year || ""}`;

      if (tmdbSearchCache_bg[cacheKey]) {
        tasks.push(Promise.resolve(tmdbSearchCache_bg[cacheKey]));
        continue;
      }

      const params = {
        query,
        language: "zh-CN",
        include_adult: false,
        page: 1
      };

      if (item.year) {
        if (type === "tv") {
          params.first_air_date_year = parseInt(item.year, 10);
        } else {
          params.primary_release_year = parseInt(item.year, 10);
        }
      }

      const task =
        Widget.tmdb.get(`/search/${type}`, { params })
        .then(res => {
          const list = (res?.results || []).map(x => ({
            ...x,
            media_type: type
          }));
          tmdbSearchCache_bg[cacheKey] = list;
          return list;
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
      const key = `${r.id}_${r.media_type || ""}`;
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
// 中文别名优先
// ==============================
function generateQueries_bg(orig, title, chineseAlias = "") {
  const set = new Set();

  function clean(s) {
    return String(s || "")
      .replace(/\(.*?\)/g, "")
      .replace(/第.+季/g, "")
      .replace(/剧场版/g, "")
      .trim();
  }

  if (containsChinese_bg(chineseAlias)) {
    set.add(clean(chineseAlias));
  }

  set.add(clean(orig));
  set.add(clean(title));

  return [...set].filter(Boolean).slice(0, 4);
}


// ==============================
// 匹配评分
// 同时比较 title / originalTitle / chineseAlias
// ==============================
function calculateMatchScore_bg(r, title, originalTitle, chineseAlias, year, expectedType = "tv") {
  if (r.adult === true) return -999999;
  if (r.media_type && r.media_type !== expectedType) return -999999;

  let score = 0;

  const tmdbTitle =
    normalizeCompareText_bg(r.title || r.name);

  const tmdbOriginal =
    normalizeCompareText_bg(r.original_title || r.original_name);

  const bgmTitle =
    normalizeCompareText_bg(title);

  const bgmOriginal =
    normalizeCompareText_bg(originalTitle);

  const bgmChineseAlias =
    normalizeCompareText_bg(chineseAlias);

  const sim1 = calculateSimilarity_bg(title, r.title || r.name || "");
  const sim2 = calculateSimilarity_bg(title, r.original_title || r.original_name || "");
  const sim3 = calculateSimilarity_bg(originalTitle, r.title || r.name || "");
  const sim4 = calculateSimilarity_bg(originalTitle, r.original_title || r.original_name || "");
  const sim5 = calculateSimilarity_bg(chineseAlias, r.title || r.name || "");
  const sim6 = calculateSimilarity_bg(chineseAlias, r.original_title || r.original_name || "");

  const bestSim = Math.max(sim1, sim2, sim3, sim4, sim5, sim6);

  if (
    (bgmChineseAlias && (tmdbTitle === bgmChineseAlias || tmdbOriginal === bgmChineseAlias)) ||
    (bgmTitle && (tmdbTitle === bgmTitle || tmdbOriginal === bgmTitle)) ||
    (bgmOriginal && (tmdbTitle === bgmOriginal || tmdbOriginal === bgmOriginal))
  ) {
    score += 160;
  } else if (bestSim >= 0.90) {
    score += 100;
  } else if (bestSim >= 0.80) {
    score += 60;
  } else if (bestSim >= 0.68) {
    score += 25;
  } else {
    score -= 10;
  }

  const compareBase = bgmChineseAlias || bgmOriginal || bgmTitle;
  if (compareBase.length >= 8) {
    const lenDiff1 = Math.abs(tmdbTitle.length - compareBase.length);
    const lenDiff2 = Math.abs(tmdbOriginal.length - compareBase.length);
    const lenDiff = Math.min(lenDiff1, lenDiff2);

    if (lenDiff >= 12) score -= 60;
    else if (lenDiff >= 8) score -= 35;
  }

  const tmdbYear =
    (r.release_date || r.first_air_date || "").substring(0, 4);

  if (year && tmdbYear) {
    const diff =
      Math.abs(parseInt(year, 10) - parseInt(tmdbYear, 10));

    if (diff === 0) score += 100;
    else if (diff === 1) score += 60;
    else if (diff === 2) score += 20;
    else score -= 30;
  }

  if (Array.isArray(r.genre_ids) && r.genre_ids.length > 0) {
    if (r.genre_ids.includes(16)) score += 50;
    else score -= 40;
  }

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
  if (clean1 === clean2) return 1;

  const longer = clean1.length > clean2.length ? clean1 : clean2;
  const shorter = clean1.length > clean2.length ? clean2 : clean1;

  if (!longer.length) return 1;

  const dist = getEditDistance_bg(longer, shorter);
  return (longer.length - dist) / longer.length;
}

function getEditDistance_bg(a, b) {
  const dp = [];

  for (let i = 0; i <= b.length; i++) {
    dp[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    dp[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j - 1] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j] + 1
        );
      }
    }
  }

  return dp[b.length][a.length];
}


// ==============================
// 选最佳
// ==============================
function selectMatches_bg(results, title, originalTitle, chineseAlias, year, expectedType = "tv") {
  let best = null;
  let bestScore = -Infinity;

  for (const r of results) {
    const s = calculateMatchScore_bg(r, title, originalTitle, chineseAlias, year, expectedType);

    if (s > bestScore) {
      bestScore = s;
      best = r;
    }
  }

  if (bestScore < 0) return null;

  return best;
}


// ==============================
// 输出
// 中文别名优先显示
// ==============================
function integrateTmdbItem_bg(baseItem, tmdb) {
  const posterPath = tmdb.poster_path || null;
  const backdropPath = tmdb.backdrop_path || null;

  return {
    id: String(tmdb.id),
    type: "tmdb",
    title: baseItem.chineseAlias || tmdb.title || tmdb.name || baseItem.title,
    description: tmdb.overview || baseItem.description,
    releaseDate:
      tmdb.release_date ||
      tmdb.first_air_date ||
      baseItem.releaseDate ||
      "",
    coverUrl:
      posterPath
        ? `${WidgetConfig_bg.TMDB_IMAGE_BASE}${posterPath}`
        : baseItem.coverUrl,
    posterPath: posterPath,
    backdropPath: backdropPath,
    rating:
      tmdb.vote_average
        ? tmdb.vote_average.toFixed(1)
        : "",
    mediaType: tmdb.media_type || baseItem.tmdbSearchType || "tv"
  };
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

function containsChinese_bg(str) {
  return /[\u4e00-\u9fa5]/.test(String(str || ""));
}
