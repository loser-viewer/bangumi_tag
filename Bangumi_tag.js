// ============= UserScript =============

const CONSTANTS_bg = {
  MEDIA_TYPES: {
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
  TMDB_SEARCH_MIN_SCORE: 35,
  TMDB_BATCH_SIZE: 8
};

const tmdbCache_bg = {};

WidgetMetadata = {
  id: "forward.bangumi.tag.tmdb",
  title: "Bangumi 动画标签",
  description: "Bangumi 标签浏览 + TMDB 匹配",
  author: "ChatGPT",
  version: "3.0.0",
  requiredVersion: "0.0.1",
  modules: [
    {
      title: "Bangumi 动画标签",
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
        { name: "page", title: "页码", type: "page" }
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
  const page = parseInt(params.page) || 1;

  if (!tag) return [];

  const url =
    `${WidgetConfig_bg.BGM_TAG_URL}/${encodeURIComponent(tag)}?sort=${sort}&page=${page}`;

  return await processBangumiTagPage_bg(url);
}

// ==========================
// Bangumi 页面解析
// ==========================

async function processBangumiTagPage_bg(url) {

  const res = await Widget.http.get(url,{
    headers:{ "User-Agent":"Mozilla/5.0"}
  });

  const html = res?.data || "";

  const listBlock =
    html.match(/<ul[^>]*id="browserItemList"[^>]*>[\s\S]*?<\/ul>/)?.[0] || "";

  if (!listBlock) return [];

  const items =
    listBlock.match(/<li[^>]*class="[^"]*\bitem\b[^"]*"[^>]*>[\s\S]*?<\/li>/g) || [];

  const parsed = items
    .map(parseBangumiItem_bg)
    .filter(Boolean);

  const results = [];

  for (let i = 0; i < parsed.length; i += WidgetConfig_bg.TMDB_BATCH_SIZE) {

    const batch = parsed.slice(i, i + WidgetConfig_bg.TMDB_BATCH_SIZE);

    const r = await Promise.all(
      batch.map(i => tryMatchTmdb_bg(i))
    );

    results.push(...r.filter(Boolean));
  }

  return results;
}

// ==========================
// 解析 Bangumi 条目
// ==========================

function parseBangumiItem_bg(item){

  const id = item.match(/\/subject\/(\d+)/)?.[1];
  if(!id) return null;

  let title =
    item.match(/title="([^"]+)"/)?.[1] ||
    item.match(/<h3>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/)?.[1] ||
    "";

  title = stripTags_bg(title).trim();

  let cover = item.match(/<img[^>]+src="([^"]+)"/)?.[1] || "";
  cover = normalizeUrl_bg(cover);

  const info =
    stripTags_bg(item.match(/<p[^>]*class="info"[^>]*>([\s\S]*?)<\/p>/)?.[1] || "");

  const smallTitle =
    stripTags_bg(item.match(/<small[^>]*>([\s\S]*?)<\/small>/)?.[1] || "");

  const year = extractYear_bg(info);

  const type = detectType_bg(title,smallTitle,info);

  return {
    bgm_id:id,
    title,
    originalTitle: smallTitle || title,
    chineseTitle: title,
    coverUrl:cover,
    releaseDate:year ? `${year}-01-01` : "",
    tmdbSearchType:type
  };
}

// ==========================
// TMDB 匹配
// ==========================

async function tryMatchTmdb_bg(item){

  const cacheKey = item.originalTitle+"_"+item.tmdbSearchType;

  if(tmdbCache_bg[cacheKey]){
    return integrateTmdb_bg(item,tmdbCache_bg[cacheKey]);
  }

  const tmdb = await searchTmdb_bg(item);

  if(!tmdb) return null;

  tmdbCache_bg[cacheKey]=tmdb;

  return integrateTmdb_bg(item,tmdb);
}

// ==========================
// TMDB 搜索
// ==========================

async function searchTmdb_bg(item){

  const queries = uniqueNonEmpty_bg([
    normalizeQuery_bg(item.originalTitle),
    normalizeQuery_bg(item.title)
  ]);

  let best=null;
  let bestScore=-999;

  for(const query of queries){

    const params={query,language:"zh-CN",page:1};

    const data = await Widget.tmdb.get(
      `/search/${item.tmdbSearchType}`,{params}
    );

    const results=data?.results||[];

    for(const r of results.slice(0,6)){

      const score = calculateScore_bg(r,item);

      if(score>bestScore){
        bestScore=score;
        best=r;
      }
    }

    if(bestScore>85) break;
  }

  if(bestScore < WidgetConfig_bg.TMDB_SEARCH_MIN_SCORE){
    return null;
  }

  return best;
}

// ==========================
// 打分
// ==========================

function calculateScore_bg(r,item){

  let score=0;

  const title=normalizeQuery_bg(r.title||r.name);
  const query=normalizeQuery_bg(item.originalTitle);

  if(title===query) score+=80;

  if(title.includes(query)) score+=40;

  const y1=extractYear_bg(r.release_date||r.first_air_date);
  const y2=extractYear_bg(item.releaseDate);

  if(y1 && y2){
    const diff=Math.abs(y1-y2);
    if(diff===0) score+=20;
    else if(diff===1) score+=10;
  }

  if(r.genre_ids?.includes(16)) score+=5;

  if(r.vote_count>50) score+=5;

  return score;
}

// ==========================
// 整合 TMDB
// ==========================

function integrateTmdb_bg(item,tmdb){

  return {
    id:String(tmdb.id),
    type:"tmdb",
    title:tmdb.title||tmdb.name,
    mediaType:item.tmdbSearchType,
    coverUrl:tmdb.poster_path
      ? WidgetConfig_bg.TMDB_IMAGE_BASE+tmdb.poster_path
      : item.coverUrl,
    description:tmdb.overview||"",
    releaseDate:tmdb.release_date||tmdb.first_air_date||"",
    rating:tmdb.vote_average?.toFixed(1)||"",
    tmdb_id:String(tmdb.id),
    bgm_id:item.bgm_id
  };
}

// ==========================
// 工具函数
// ==========================

function detectType_bg(title,original,info){

  const text=(title+" "+original+" "+info).toLowerCase();

  return CONSTANTS_bg.SHORT_FILM_KEYWORDS.some(k=>text.includes(k.toLowerCase()))
    ? CONSTANTS_bg.MEDIA_TYPES.MOVIE
    : CONSTANTS_bg.MEDIA_TYPES.TV;
}

function extractYear_bg(t){
  const m=String(t||"").match(/(19|20)\d{2}/);
  return m ? parseInt(m[0]) : "";
}

function normalizeQuery_bg(str){
  return String(str||"")
    .replace(/<[^>]*>/g,"")
    .replace(/[【】()（）]/g,"")
    .replace(/\s+/g," ")
    .trim()
    .toLowerCase();
}

function uniqueNonEmpty_bg(arr){
  return [...new Set(arr.filter(Boolean))];
}

function stripTags_bg(str){
  return (str||"").replace(/<[^>]*>/g,"");
}

function normalizeUrl_bg(url){
  if(!url) return "";
  if(url.startsWith("//")) return "https:"+url;
  if(url.startsWith("/")) return WidgetConfig_bg.BGM_BASE_URL+url;
  return url;
}
