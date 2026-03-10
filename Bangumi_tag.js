// ============= UserScript =============

const CONSTANTS_bg = {
  MEDIA_TYPES: {
    ANIME: "anime",
    TV: "tv",
    MOVIE: "movie"
  },
  SHORT_FILM_KEYWORDS: [
    "剧场版","电影","movie","总集篇","完结篇","短片","OVA","OAD"
  ]
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
  description: "按标签浏览 Bangumi 动画",
  author: "extract",
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
          multiple: false,
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

// ==========================
// Bangumi 页面抓取
// ==========================

async function processBangumiTagPage_bg(url) {

  const res = await Widget.http.get(url,{
    headers:{
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

  const batchSize = 6;

  for (let i = 0; i < bgmItems.length; i += batchSize) {

    const batch = bgmItems.slice(i, i + batchSize);

    const results = await Promise.all(
      batch.map(item => tryMatchTmdbForBangumi_bg(item))
    );

    for (const enhancedItem of results) {
      if (enhancedItem) {
        list.push(enhancedItem);
      }
    }
  }

  return list;
}

// ==========================
// 解析 Bangumi 条目
// ==========================

function parseBangumiListItem_bg(item) {

  const id =
    item.match(/\/subject\/(\d+)/)?.[1];

  let title =
    item.match(/<h3>[\s\S]*?<a[^>]*title="([^"]+)"[^>]*>/)?.[1] ||
    item.match(/<h3>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/)?.[1] ||
    "";

  title = decodeHtml_bg(stripTags_bg(title)).trim();

  if (!id || !title) return null;

  let cover =
    item.match(/<img[^>]+src="([^"]+)"/)?.[1] ||
    item.match(/<img[^>]+data-cfsrc="([^"]+)"/)?.[1] ||
    "";

  cover = normalizeUrl_bg(cover);

  if (cover) {
    cover = cover.replace("/s/","/l/");
  }

  const infoRaw =
    item.match(/<p[^>]*class="info"[^>]*>([\s\S]*?)<\/p>/)?.[1] || "";

  const info =
    decodeHtml_bg(stripTags_bg(infoRaw)).replace(/\s+/g," ").trim();

  const smallTitleRaw =
    item.match(/<small[^>]*class="grey"[^>]*>([\s\S]*?)<\/small>/)?.[1] || "";

  const smallTitle =
    decodeHtml_bg(stripTags_bg(smallTitleRaw)).trim();

  const year = extractYear_bg(info);

  const mediaType = detectAnimeMediaType_bg(title,smallTitle,info);

  return {
    id,
    bgm_id:id,
    title,
    originalTitle: smallTitle || title,
    chineseTitle: title,
    coverUrl:cover,
    description:info,
    releaseDate: year ? `${year}-01-01` : "",
    infoText:info,
    tmdbSearchType:mediaType
  };
}

// ==========================
// TMDB 匹配（带缓存）
// ==========================

async function tryMatchTmdbForBangumi_bg(item) {

  const year = extractYear_bg(item.releaseDate || item.infoText || "");
  const tmdbType = item.tmdbSearchType || CONSTANTS_bg.MEDIA_TYPES.TV;

  const cacheKey =
    `tmdb_${tmdbType}_${normalizeTmdbQuery_bg(item.originalTitle)}_${year}`;

  const cached = await getCache_bg(cacheKey);

  if (cached) {
    return integrateTmdbLight_bg(item,cached,tmdbType);
  }

  const tmdbRes = await searchTmdbLight_bg({
    originalTitle:item.originalTitle,
    chineseTitle:item.chineseTitle,
    listTitle:item.title,
    searchMediaType:tmdbType,
    year
  });

  if (!tmdbRes) return null;

  await setCache_bg(cacheKey,tmdbRes,86400);

  return integrateTmdbLight_bg(item,tmdbRes,tmdbType);
}

// ==========================
// TMDB 搜索
// ==========================

async function searchTmdbLight_bg({
  originalTitle="",
  chineseTitle="",
  listTitle="",
  searchMediaType="tv",
  year=""
}){

  const queries = uniqueNonEmpty_bg([
    normalizeTmdbQuery_bg(originalTitle),
    normalizeTmdbQuery_bg(chineseTitle),
    normalizeTmdbQuery_bg(listTitle)
  ]);

  let best=null;
  let bestScore=-Infinity;

  for (const query of queries.slice(0,3)) {

    const searchKey =
      `search_${searchMediaType}_${query}_${year}`;

    const cached = await getCache_bg(searchKey);
    if (cached) return cached;

    const params={
      query,
      language:"zh-CN",
      page:1,
      include_adult:true
    };

    const data = await Widget.tmdb.get(
      `/search/${searchMediaType}`,
      {params}
    );

    const results = data?.results || [];

    for (const result of results.slice(0,8)) {

      const score = calculateTmdbMatchScoreLight_bg(result,{
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

    if (best) {
      await setCache_bg(searchKey,best,604800);
    }

    if (bestScore >= 90) break;
  }

  if (bestScore < WidgetConfig_bg.TMDB_SEARCH_MIN_SCORE) {
    return null;
  }

  return best;
}

// ==========================
// 缓存函数
// ==========================

async function getCache_bg(key) {

  const mem = tmdbCache_bg[key];
  if (mem) return mem;

  const disk = await Widget.cache.get(key);

  if (disk) {
    tmdbCache_bg[key] = disk;
    return disk;
  }

  return null;
}

async function setCache_bg(key,value,ttl){

  tmdbCache_bg[key] = value;

  await Widget.cache.set(key,value,ttl);
}

// ==========================
// 工具函数
// ==========================

function calculateTmdbMatchScoreLight_bg(result,meta){

  let score=0;

  const resultTitle =
    normalizeTmdbQuery_bg(result.title || result.name || "");

  const query =
    normalizeTmdbQuery_bg(meta.originalTitle || "");

  if (resultTitle === query) score += 70;

  if (resultTitle.includes(query)) score += 40;

  const resultYear = extractYear_bg(
    result.release_date || result.first_air_date || ""
  );

  const queryYear = extractYear_bg(meta.year || "");

  if (queryYear && resultYear) {

    const diff =
      Math.abs(parseInt(queryYear) - parseInt(resultYear));

    if (diff === 0) score += 20;
    else if (diff === 1) score += 10;
  }

  if (result.genre_ids && result.genre_ids.includes(16)) {
    score += 6;
  }

  return score;
}

function integrateTmdbLight_bg(baseItem,tmdbResult,tmdbType){

  return {
    id:String(tmdbResult.id),
    type:"tmdb",
    title:tmdbResult.title || tmdbResult.name || baseItem.title,
    description:tmdbResult.overview || baseItem.description,
    releaseDate:
      tmdbResult.release_date ||
      tmdbResult.first_air_date ||
      baseItem.releaseDate,
    rating:
      typeof tmdbResult.vote_average === "number"
      ? Number(tmdbResult.vote_average).toFixed(1)
      : "",
    mediaType:tmdbType,
    coverUrl:tmdbResult.poster_path
      ? `${WidgetConfig_bg.TMDB_IMAGE_BASE}${tmdbResult.poster_path}`
      : baseItem.coverUrl
  };
}

function detectAnimeMediaType_bg(title,originalTitle,infoText){

  const text =
    `${title || ""} ${originalTitle || ""} ${infoText || ""}`.toLowerCase();

  return CONSTANTS_bg.SHORT_FILM_KEYWORDS.some(k =>
    text.includes(k.toLowerCase())
  )
    ? CONSTANTS_bg.MEDIA_TYPES.MOVIE
    : CONSTANTS_bg.MEDIA_TYPES.TV;
}

function extractYear_bg(text){
  const m = String(text || "").match(/(19|20)\d{2}/);
  return m ? m[0] : "";
}

function normalizeTmdbQuery_bg(str){
  return String(str || "")
    .replace(/<[^>]*>/g,"")
    .replace(/[【】()（）]/g," ")
    .replace(/\s+/g," ")
    .trim()
    .toLowerCase();
}

function uniqueNonEmpty_bg(arr){
  return [...new Set(arr.filter(Boolean))];
}

function stripTags_bg(str){
  return (str || "").replace(/<[^>]*>/g,"");
}

function normalizeUrl_bg(url){
  if (!url) return "";
  if (url.startsWith("//")) return "https:" + url;
  if (url.startsWith("/")) return WidgetConfig_bg.BGM_BASE_URL + url;
  return url;
}

function decodeHtml_bg(str){
  if (!str) return "";
  return str
    .replace(/&amp;/g,"&")
    .replace(/&lt;/g,"<")
    .replace(/&gt;/g,">")
    .replace(/&quot;/g,'"')
    .replace(/&#39;/g,"'")
    .replace(/&nbsp;/g," ");
}
