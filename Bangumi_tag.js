// ============= UserScript =============
// @name         Bangumi 标签动画
// @version      1.2.0
// @description  Bangumi 标签浏览 + TMDB匹配（影视榜单算法完整版）
// ============= UserScript =============

WidgetMetadata = {
  id: "forward.bangumi.tag.only",
  title: "Bangumi 动画标签",
  description: "Bangumi 标签浏览（影视榜单算法）",
  author: "extract",
  version: "1.2.0",
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
  MIN_MATCH_SCORE: 20,
  FETCH_BATCH_SIZE: 6
};

const CONSTANTS_bg = {
  MEDIA_TYPES: {
    TV: "tv",
    MOVIE: "movie"
  }
};

const tmdbCache_bg = {};


// =============================
// 入口
// =============================
async function fetchBangumiTagPage_bg(params = {}) {

  const tag = (params.tag_keyword || "").trim();
  const sort = params.sort || "rank";
  const page = parseInt(params.page, 10) || 1;

  if (!tag) return [];

  const url =
    `${WidgetConfig_bg.BGM_TAG_URL}/${encodeURIComponent(tag)}?sort=${sort}&page=${page}`;

  return await processBangumiTagPage_bg(url);
}


// =============================
// 抓 Bangumi 页面
// =============================
async function processBangumiTagPage_bg(url) {

  const response = await Widget.http.get(url);
  const html = typeof response?.data === "string" ? response.data : "";

  if (!html) return [];

  const listBlock =
    html.match(/<ul[^>]*id="browserItemList"[^>]*>[\s\S]*?<\/ul>/)?.[0] || "";

  if (!listBlock) return [];

  const itemBlocks =
    listBlock.match(/<li[^>]*class="[^"]*item[^"]*"[^>]*>[\s\S]*?<\/li>/g) || [];

  const bangumiItems = itemBlocks
    .map(parseBangumiListItem_bg)
    .filter(Boolean);

  const finalItems = [];

  for (let i = 0; i < bangumiItems.length; i += WidgetConfig_bg.FETCH_BATCH_SIZE) {

    const batch = bangumiItems.slice(i, i + WidgetConfig_bg.FETCH_BATCH_SIZE);

    const results = await Promise.all(
      batch.map(matchBangumiToTmdb_bg)
    );

    finalItems.push(...results.filter(Boolean));
  }

  return finalItems;
}


// =============================
// 解析 Bangumi 条目
// =============================
function parseBangumiListItem_bg(html) {

  const id = html.match(/\/subject\/(\d+)/)?.[1];
  if (!id) return null;

  let title =
    html.match(/<h3>[\s\S]*?<a[^>]*title="([^"]+)"/)?.[1] ||
    html.match(/<h3>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/)?.[1] ||
    "";

  title = stripTags_bg(title).trim();

  let originalTitle =
    html.match(/<small[^>]*>([\s\S]*?)<\/small>/)?.[1] || "";

  originalTitle = stripTags_bg(originalTitle).trim();

  const info =
    stripTags_bg(
      html.match(/<p[^>]*class="info"[^>]*>([\s\S]*?)<\/p>/)?.[1] || ""
    ).trim();

  const releaseDate = parseDate_bg(info);
  const year = extractYear_bg(releaseDate || info);

  const cover =
    html.match(/<img[^>]+src="([^"]+)"/)?.[1] || "";

  return {
    id,
    title,
    originalTitle,
    description: info,
    coverUrl: normalizeUrl_bg(cover),
    year,
    releaseDate,
    tmdbSearchType: detectItemTypeFromContent_bg({ title, info })
  };
}


// =============================
// 日期解析
// =============================
function parseDate_bg(dateStr) {

  if (!dateStr) return "";

  dateStr = dateStr.trim();
  let m;

  m = dateStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (m) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`;

  m = dateStr.match(/(\d{4})年(\d{1,2})月/);
  if (m) return `${m[1]}-${pad(m[2])}-01`;

  m = dateStr.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`;

  m = dateStr.match(/(\d{4})[-/](\d{1,2})/);
  if (m) return `${m[1]}-${pad(m[2])}-01`;

  m = dateStr.match(/(19|20)\d{2}/);
  if (m) return `${m[0]}-01-01`;

  return "";
}

function pad(n){
  return String(n).padStart(2,"0")
}


// =============================
// Bangumi → TMDB
// =============================
async function matchBangumiToTmdb_bg(item) {

  const cacheKey = `${item.title}_${item.year}`;

  if (tmdbCache_bg[cacheKey]) {
    return integrateTmdbItem_bg(item, tmdbCache_bg[cacheKey]);
  }

  const candidates =
    await fetchTmdbDataForBangumi_bg(item, item.tmdbSearchType);

  if (!candidates.length) return null;

  const best =
    selectMatches_bg(candidates, item.title, item.year,
      { preferredType: item.tmdbSearchType });

  if (!best) return null;

  tmdbCache_bg[cacheKey] = best;

  return integrateTmdbItem_bg(item, best);
}


// =============================
// 查询生成
// =============================
function generateTmdbSearchQueries_bg(originalTitle, listTitle) {

  const queries = new Set();

  function clean(str) {
    return String(str || "")
      .replace(/\(.*?\)/g,"")
      .replace(/第.+[季期]/g,"")
      .replace(/剧场版/g,"")
      .trim();
  }

  queries.add(clean(originalTitle));
  queries.add(clean(listTitle));

  return [...queries].slice(0,4);
}


// =============================
// TMDB 搜索
// =============================
async function fetchTmdbDataForBangumi_bg(item) {

  const queries =
    generateTmdbSearchQueries_bg(item.originalTitle,item.title);

  const results = [];
  const seen = new Set();

  for (const query of queries) {

    for (const type of ["tv","movie"]) {

      try {

        const params = { query, language:"zh-CN" };

        if (item.year) {

          if (type==="tv")
            params.first_air_date_year = parseInt(item.year);
          else
            params.primary_release_year = parseInt(item.year);

        }

        const res =
          await Widget.tmdb.get(`/search/${type}`,{params});

        const list = res?.results || [];

        for (const r of list) {

          const key = `${type}_${r.id}`;

          if (!seen.has(key)) {

            seen.add(key);
            results.push({...r,media_type:type});

          }

        }

      } catch(e){}

    }

  }

  return results;
}


// =============================
// 影视榜单评分
// =============================
function calculateMatchScore_bg(result,title,year,type){

  let score = 0;

  const tmdbTitle =
    normalizeCompareText_bg(result.title || result.name);

  const tmdbOriginal =
    normalizeCompareText_bg(result.original_title || result.original_name);

  const bgmTitle =
    normalizeCompareText_bg(title);

  if (tmdbTitle===bgmTitle || tmdbOriginal===bgmTitle)
    score+=100;

  else if (tmdbTitle.includes(bgmTitle))
    score+=60;

  const tmdbYear =
    (result.release_date || result.first_air_date || "")
      .substring(0,4);

  if (year && tmdbYear){

    const diff =
      Math.abs(parseInt(year)-parseInt(tmdbYear));

    if(diff===0) score+=100;
    else if(diff===1) score+=70;
    else score-=50;

  }

  if(type){

    if(result.media_type===type)
      score+=100;
    else
      score-=100;

  }

  if(result.genre_ids?.includes(16))
    score+=50;
  else
    score-=200;

  score += Math.log10((result.popularity||0)+1);
  score += Math.log10((result.vote_count||0)+1);

  return score;
}


// =============================
// 选最佳
// =============================
function selectMatches_bg(results,title,year,opt={}){

  let best=null;
  let bestScore=-Infinity;

  for(const r of results){

    const s =
      calculateMatchScore_bg(
        r,title,year,opt.preferredType
      );

    if(s>bestScore){
      bestScore=s;
      best=r;
    }

  }

  if(bestScore < WidgetConfig_bg.MIN_MATCH_SCORE)
    return null;

  return best;
}


// =============================
// 输出
// =============================
function integrateTmdbItem_bg(baseItem,tmdb){

  return {

    id:String(tmdb.id),
    type:"tmdb",

    title:tmdb.title || tmdb.name || baseItem.title,

    description:tmdb.overview || baseItem.description,

    releaseDate:
      tmdb.release_date ||
      tmdb.first_air_date ||
      baseItem.releaseDate ||
      (baseItem.year ? `${baseItem.year}-01-01` : ""),

    coverUrl:
      tmdb.poster_path
      ? `${WidgetConfig_bg.TMDB_IMAGE_BASE}${tmdb.poster_path}`
      : baseItem.coverUrl,

    rating:
      tmdb.vote_average
        ? tmdb.vote_average.toFixed(1)
        : "",

    mediaType:tmdb.media_type

  };

}


// =============================
// 类型判断
// =============================
function detectItemTypeFromContent_bg(item){

  const text =
    (item.title || "") +
    (item.info || "");

  if(/剧场版|电影|movie/i.test(text))
    return CONSTANTS_bg.MEDIA_TYPES.MOVIE;

  return CONSTANTS_bg.MEDIA_TYPES.TV;

}


// =============================
// 工具
// =============================
function normalizeCompareText_bg(str){

  return String(str || "")
    .toLowerCase()
    .replace(/[^\u4e00-\u9fa5a-z0-9]/g,"");

}

function extractYear_bg(str){

  const m = str.match(/(19|20)\d{2}/);
  return m ? m[0] : "";

}

function stripTags_bg(str){

  return String(str || "").replace(/<[^>]*>/g,"");

}

function normalizeUrl_bg(url){

  if(!url) return "";

  if(url.startsWith("//"))
    return "https:" + url;

  if(url.startsWith("/"))
    return WidgetConfig_bg.BGM_BASE_URL + url;

  return url;

}
