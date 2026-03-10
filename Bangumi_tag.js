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
  TMDB_SEARCH_MIN_SCORE: 0.72
};

WidgetMetadata = {
  id: "forward.bangumi.simple.tag.tmdb",
  title: "Bangumi 动画标签",
  description: "按标签浏览 Bangumi 动画",
  author: "extract",
  version: "1.4.0",
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
  const page = parseInt(params.page,10) || 1;

  if (!tag) return [];

  const url =
    `${WidgetConfig_bg.BGM_TAG_URL}/${encodeURIComponent(tag)}?sort=${encodeURIComponent(sort)}&page=${page}`;

  return await processBangumiTagPage_bg(url);
}

async function processBangumiTagPage_bg(url){

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

  const bgmItems =
    items.map(parseBangumiListItem_bg).filter(Boolean);

  const batchSize = 10;

  for (let i = 0; i < bgmItems.length; i += batchSize){

    const batch = bgmItems.slice(i,i+batchSize);

    const results = await Promise.all(
      batch.map(item => tryMatchTmdbForBangumi_bg(item))
    );

    for (const r of results){
      if (r) list.push(r);
    }
  }

  return list;
}

function parseBangumiListItem_bg(item){

  const id = item.match(/\/subject\/(\d+)/)?.[1];

  let title =
    item.match(/title="([^"]+)"/)?.[1] ||
    item.match(/<a[^>]*>([^<]+)<\/a>/)?.[1] ||
    "";

  title = decodeHtml_bg(stripTags_bg(title)).trim();

  if (!id || !title) return null;

  const info =
    item.match(/<p class="info">([\s\S]*?)<\/p>/)?.[1]
      ?.replace(/<[^>]+>/g,"")
      ?.trim();

  const smallTitle =
    item.match(/<small[^>]*class="grey"[^>]*>([\s\S]*?)<\/small>/)?.[1]
      ?.replace(/<[^>]+>/g,"")
      ?.trim() || "";

  const year = extractYear_bg(info);

  const mediaType =
    detectAnimeMediaType_bg(title,smallTitle,info);

  return {
    id,
    title,
    chineseTitle:title,
    originalTitle:smallTitle || title,
    releaseDate:year ? `${year}-01-01`:"",
    infoText:info,
    tmdbSearchType:mediaType
  };
}

async function tryMatchTmdbForBangumi_bg(item){

  const year = extractYear_bg(item.releaseDate || item.infoText || "");
  const tmdbType = item.tmdbSearchType || "tv";

  const cacheKey =
    `${normalizeCompareText_bg(item.originalTitle)}_${year}`;

  if (tmdbCache_bg[cacheKey]){
    return integrateTmdbLight_bg(item,tmdbCache_bg[cacheKey],tmdbType);
  }

  const tmdbRes =
    await searchTmdbLight_bg({
      originalTitle:item.originalTitle,
      chineseTitle:item.chineseTitle,
      listTitle:item.title,
      searchMediaType:tmdbType,
      year
    });

  if (!tmdbRes) return null;

  tmdbCache_bg[cacheKey] = tmdbRes;

  return integrateTmdbLight_bg(item,tmdbRes,tmdbType);
}

async function searchTmdbLight_bg({
  originalTitle="",
  chineseTitle="",
  listTitle="",
  searchMediaType="tv",
  year=""
}){

  const queries = [
    normalizeSearchKeyword_bg(originalTitle),
    normalizeSearchKeyword_bg(chineseTitle),
    normalizeSearchKeyword_bg(listTitle)
  ].filter(Boolean);

  let allResults=[];

  const langs=["zh-CN","ja-JP"];

  for (const query of queries){

    for (const lang of langs){

      const params={
        query,
        language:lang,
        page:1
      };

      const data =
        await Widget.tmdb.get(`/search/${searchMediaType}`,{params});

      const results=data?.results || [];

      allResults.push(...results.map(r=>({
        ...r,
        media_type:searchMediaType
      })));
    }
  }

  if (allResults.length===0) return null;

  return selectMatches_bg(
    allResults,
    originalTitle || chineseTitle || listTitle,
    year,
    {preferredType:searchMediaType}
  );
}

function selectMatches_bg(tmdbResults,originalTitle,originalYear,options={}){

  let best=null;
  let bestScore=-Infinity;

  for (const result of tmdbResults){

    const score=
      calculateMatchScore_bg(
        result,
        originalTitle,
        originalYear,
        options.preferredType
      );

    if (score>bestScore){
      bestScore=score;
      best=result;
    }
  }

  if (bestScore < WidgetConfig_bg.TMDB_SEARCH_MIN_SCORE){
    return null;
  }

  return best;
}

function calculateMatchScore_bg(result,originalTitle,originalYear,preferredType){

  const tmdbTitle = result.title || result.name || "";
  const originalName = result.original_title || result.original_name || "";

  const simTitle =
    calculateSimilarity_bg(originalTitle,tmdbTitle);

  const simOriginal =
    calculateSimilarity_bg(originalTitle,originalName);

  const similarity = Math.max(simTitle,simOriginal);

  let score = similarity;

  if (simOriginal>0.98) score+=2;
  else if (simTitle>0.98) score+=1.5;

  const tmdbYear =
    (result.release_date || result.first_air_date || "")
      .substring(0,4);

  if (originalYear && tmdbYear){

    const diff =
      Math.abs(parseInt(originalYear)-parseInt(tmdbYear));

    if (diff===0) score+=0.3;
    else if (diff===1) score+=0.15;
  }

  if (preferredType && result.media_type===preferredType){
    score+=1;
  }

  if (result.genre_ids && result.genre_ids.includes(16)){
    score+=0.6;
  }else{
    score-=0.5;
  }

  score+=Math.min((result.popularity||0)/10000,0.05);
  score+=Math.min((result.vote_average||0)/200,0.025);

  return score;
}

function calculateSimilarity_bg(str1,str2){

  const s1=normalizeCompareText_bg(str1);
  const s2=normalizeCompareText_bg(str2);

  if (!s1 || !s2) return 0;

  if (s1===s2) return 1;

  const longer =
    s1.length>s2.length ? s1:s2;

  const shorter =
    s1.length>s2.length ? s2:s1;

  const edit=getEditDistance_bg(longer,shorter);

  return (longer.length-edit)/longer.length;
}

function getEditDistance_bg(a,b){

  const matrix=[];

  for (let i=0;i<=b.length;i++){
    matrix[i]=[i];
  }

  for (let j=0;j<=a.length;j++){
    matrix[0][j]=j;
  }

  for (let i=1;i<=b.length;i++){
    for (let j=1;j<=a.length;j++){

      if (b.charAt(i-1)===a.charAt(j-1)){
        matrix[i][j]=matrix[i-1][j-1];
      }else{
        matrix[i][j]=Math.min(
          matrix[i-1][j-1]+1,
          matrix[i][j-1]+1,
          matrix[i-1][j]+1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

function integrateTmdbLight_bg(baseItem,tmdbResult,tmdbType){

  if (!tmdbResult.genre_ids || !tmdbResult.genre_ids.includes(16)){
    return null;
  }

  return {
    id:String(tmdbResult.id),
    type:"tmdb",
    title:tmdbResult.title || tmdbResult.name || baseItem.title,
    description:tmdbResult.overview || baseItem.infoText,
    releaseDate:
      tmdbResult.release_date ||
      tmdbResult.first_air_date ||
      baseItem.releaseDate,
    rating:
      typeof tmdbResult.vote_average==="number"
      ? Number(tmdbResult.vote_average).toFixed(1)
      :"",
    mediaType:tmdbType,
    coverUrl:tmdbResult.poster_path
      ? `${WidgetConfig_bg.TMDB_IMAGE_BASE}${tmdbResult.poster_path}`
      :""
  };
}

function detectAnimeMediaType_bg(title,originalTitle,infoText){

  const text=
    `${title||""} ${originalTitle||""} ${infoText||""}`.toLowerCase();

  return CONSTANTS_bg.SHORT_FILM_KEYWORDS.some(k=>
    text.includes(k.toLowerCase())
  )
    ? CONSTANTS_bg.MEDIA_TYPES.MOVIE
    : CONSTANTS_bg.MEDIA_TYPES.TV;
}

function extractYear_bg(text){
  const m=String(text||"").match(/(19|20)\d{2}/);
  return m ? m[0] : "";
}

function normalizeSearchKeyword_bg(str){
  return String(str||"")
    .replace(/第\s*\d+\s*季/g,"")
    .replace(/season\s*\d+/ig,"")
    .replace(/part\s*\d+/ig,"")
    .replace(/剧场版/g,"")
    .replace(/\s+/g," ")
    .trim();
}

function normalizeCompareText_bg(str){
  return normalizeSearchKeyword_bg(str)
    .toLowerCase()
    .replace(/[^\u4e00-\u9fa5a-z0-9]/g,"");
}

function stripTags_bg(str){
  return (str||"").replace(/<[^>]*>/g,"");
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
