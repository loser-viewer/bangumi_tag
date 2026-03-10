// ============= UserScript =============

WidgetMetadata = {
  id: "forward.bangumi.tag.only",
  title: "Bangumi 动画标签",
  description: "Bangumi 标签浏览 + TMDB匹配（平衡修正版）",
  author: "extract",
  version: "1.5.1",
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
    tmdbSearchType: detectItemTypeFromContent_bg({
      title,
      originalTitle,
      info
    })
  };
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
  const cacheKey = `${item.title}_${item.year}_${item.tmdbSearchType}`;

  if (tmdbCache_bg[cacheKey]) {
    return integrateTmdbItem_bg(item, tmdbCache_bg[cacheKey]);
  }

  const candidates = await fetchTmdbDataForBangumi_bg(item);

  if (!candidates.length) return null;

  const best =
    selectMatches_bg(candidates, item.title, item.year, item.tmdbSearchType);

  if (!best) return null;

  tmdbCache_bg[cacheKey] = best;

  return integrateTmdbItem_bg(item, best);
}


// ==============================
// TMDB 搜索（缓存 + 并发）
// ==============================
async function fetchTmdbDataForBangumi_bg(item) {
  const queries = generateQueries_bg(item.originalTitle, item.title);
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
// ==============================
function generateQueries_bg(orig, title) {
  const set = new Set();

  function clean(s) {
    return String(s || "")
      .replace(/\(.*?\)/g, "")
      .replace(/第.+季/g, "")
      .replace(/剧场版/g, "")
      .trim();
  }

  set.add(clean(orig));
  set.add(clean(title));

  return [...set].filter(Boolean).slice(0, 3);
}


// ==============================
// 匹配评分（平衡版）
// ==============================
function calculateMatchScore_bg(r, title, year, expectedType = "tv") {
  if (r.adult === true) return -999999;
  if (r.media_type && r.media_type !== expectedType) return -999999;

  let score = 0;

  const tmdbTitle =
    normalizeCompareText_bg(r.title || r.name);

  const tmdbOriginal =
    normalizeCompareText_bg(r.original_title || r.original_name);

  const bgmTitle =
    normalizeCompareText_bg(title);

  const simTitle = calculateSimilarity_bg(title, r.title || r.name || "");
  const simOriginal = calculateSimilarity_bg(title, r.original_title || r.original_name || "");
  const bestSim = Math.max(simTitle, simOriginal);

  // 放宽短标题
  if (tmdbTitle === bgmTitle || tmdbOriginal === bgmTitle) {
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

  // 长度惩罚只对长标题启用，避免 Kanon/AIR 被误杀
  if (bgmTitle.length >= 8) {
    const lenDiff = Math.abs(tmdbTitle.length - bgmTitle.length);
    if (lenDiff >= 12) score -= 60;
    else if (lenDiff >= 8) score -= 35;
  }

  const tmdbYear =
    (r.release_date || r.first_air_date || "")
      .substring(0, 4);

  if (year && tmdbYear) {
    const diff =
      Math.abs(parseInt(year, 10) - parseInt(tmdbYear, 10));

    if (diff === 0) score += 100;
    else if (diff === 1) score += 60;
    else if (diff === 2) score += 20;
    else score -= 30;
  }

  if (r.genre_ids?.includes(16)) score += 50;
  else score -= 100;

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
// 选最佳（阈值放低）
// ==============================
function selectMatches_bg(results, title, year, expectedType = "tv") {
  let best = null;
  let bestScore = -Infinity;

  for (const r of results) {
    const s = calculateMatchScore_bg(r, title, year, expectedType);

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
// ==============================
function integrateTmdbItem_bg(baseItem, tmdb) {
  const posterPath = tmdb.poster_path || null;
  const backdropPath = tmdb.backdrop_path || null;

  return {
    id: String(tmdb.id),
    type: "tmdb",
    title: tmdb.title || tmdb.name || baseItem.title,
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
