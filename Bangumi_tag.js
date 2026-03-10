// ============= UserScript =============

WidgetMetadata = {
  id: "forward.bangumi.tag.only",
  title: "Bangumi 动画标签",
  description: "Bangumi 标签浏览（原版影视榜单匹配算法）",
  author: "extract",
  version: "3.0.0",
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
  TMDB_IMAGE_BASE: "https://image.tmdb.org/t/p/w500"
};

const tmdbCache_bg = {};


// ==============================
// 入口
// ==============================

async function fetchBangumiTagPage_bg(params = {}) {

  const tag = (params.tag_keyword || "").trim();
  const sort = params.sort || "rank";
  const page = parseInt(params.page) || 1;

  if (!tag) return [];

  const url =
    `${WidgetConfig_bg.BGM_TAG_URL}/${encodeURIComponent(tag)}?sort=${sort}&page=${page}`;

  return await processBangumiPage_bg(url);

}


// ==============================
// 抓 Bangumi 页面
// ==============================

async function processBangumiPage_bg(url){

  const res = await Widget.http.get(url);

  const html =
    typeof res?.data === "string" ? res.data : "";

  const list =
    html.match(/<ul[^>]*id="browserItemList"[^>]*>[\s\S]*?<\/ul>/)?.[0] || "";

  const items =
    list.match(/<li[^>]*class="[^"]*item[^"]*"[^>]*>[\s\S]*?<\/li>/g) || [];

  const parsed =
    items.map(parseBangumiItem_bg).filter(Boolean);

  const detailed =
    await Promise.all(parsed.map(fetchItemDetails_bg));

  const results =
    await Promise.all(detailed.map(matchBangumiToTmdb_bg));

  return results.filter(Boolean);

}


// ==============================
// 解析 Bangumi
// ==============================

function parseBangumiItem_bg(html){

  const id = html.match(/\/subject\/(\d+)/)?.[1];

  if(!id) return null;

  const title =
    stripTags_bg(
      html.match(/<h3>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/)?.[1] || ""
    ).trim();

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

  const releaseDate =
    parseDate_bg(info);

  const year =
    extractYear_bg(releaseDate || info);

  return {
    id,
    title,
    originalTitle,
    description: info,
    coverUrl: normalizeUrl_bg(cover),
    year,
    releaseDate,
    detailUrl:`https://bgm.tv/subject/${id}`
  };

}


// ==============================
// 抓 Bangumi 详情
// ==============================

async function fetchItemDetails_bg(item){

  try{

    const res =
      await Widget.http.get(item.detailUrl);

    const html =
      typeof res?.data==="string"?res.data:"";

    const chineseTitle =
      stripTags_bg(
        html.match(/中文名:\s*<\/span>\s*([^<]+)/)?.[1] || ""
      ).trim();

    const alias =
      [...html.matchAll(/<li class="sub">([^<]+)<\/li>/g)]
        .map(x=>stripTags_bg(x[1]).trim());

    return {
      ...item,
      chineseTitle,
      alias
    };

  }catch{
    return item;
  }

}


// ==============================
// 生成 TMDB query
// ==============================

function generateTmdbSearchQueries_bg(item){

  const set=new Set();

  const clean=s=>String(s||"")
    .replace(/\(.*?\)/g,"")
    .replace(/第.+季/g,"")
    .replace(/剧场版/g,"")
    .trim();

  if(item.chineseTitle) set.add(clean(item.chineseTitle));
  if(item.title) set.add(clean(item.title));
  if(item.originalTitle) set.add(clean(item.originalTitle));

  if(Array.isArray(item.alias))
    item.alias.forEach(a=>set.add(clean(a)));

  return [...set].filter(Boolean).slice(0,6);

}


// ==============================
// 搜 TMDB
// ==============================

async function searchTmdb_bg(query,year,type){

  const params={
    query,
    language:"zh-CN",
    include_adult:false
  };

  if(year){
    if(type==="tv")
      params.first_air_date_year=parseInt(year);
    else
      params.primary_release_year=parseInt(year);
  }

  const res=
    await Widget.tmdb.get(`/search/${type}`,{params});

  return (res?.results||[])
    .map(x=>({...x,media_type:type}));

}


// ==============================
// 匹配 TMDB
// ==============================

async function matchBangumiToTmdb_bg(item){

  const queries=
    generateTmdbSearchQueries_bg(item);

  let candidates=[];

  for(const q of queries){

    const tv=await searchTmdb_bg(q,item.year,"tv");

    candidates.push(...tv);

    if(tv.length>0) break;

  }

  if(candidates.length===0){

    for(const q of queries){

      const movie=
        await searchTmdb_bg(q,item.year,"movie");

      candidates.push(...movie);

      if(movie.length>0) break;

    }

  }

  if(!candidates.length) return null;

  const best=
    scoreTmdbResult_bg(candidates,item);

  if(!best) return null;

  return integrateTmdbItem_bg(item,best);

}


// ==============================
// 打分
// ==============================

function scoreTmdbResult_bg(results,item){

  let best=null;
  let bestScore=-Infinity;

  for(const r of results){

    const s=
      calculateTmdbMatchScore_bg(r,item);

    if(s>bestScore){
      bestScore=s;
      best=r;
    }

  }

  return bestScore>0?best:null;

}


function calculateTmdbMatchScore_bg(r,item){

  let score=0;

  const tmdbTitle=
    normalizeCompareText_bg(r.name||r.title);

  const bgmTitle=
    normalizeCompareText_bg(item.title);

  if(tmdbTitle===bgmTitle)
    score+=120;
  else if(tmdbTitle.includes(bgmTitle))
    score+=60;

  const tmdbYear=
    (r.first_air_date||r.release_date||"").slice(0,4);

  if(item.year && tmdbYear){

    const diff=
      Math.abs(parseInt(item.year)-parseInt(tmdbYear));

    if(diff===0) score+=100;
    else if(diff===1) score+=60;
    else score-=40;

  }

  if(r.genre_ids?.includes(16))
    score+=40;

  score+=Math.log10((r.vote_count||0)+1);
  score+=Math.log10((r.popularity||0)+1);

  return score;

}


// ==============================
// 输出
// ==============================

function integrateTmdbItem_bg(baseItem,tmdb){

  const poster=tmdb.poster_path;

  return{
    id:String(tmdb.id),
    type:"tmdb",
    title:tmdb.name||tmdb.title||baseItem.title,
    description:tmdb.overview||baseItem.description,
    releaseDate:
      tmdb.first_air_date||
      tmdb.release_date||
      baseItem.releaseDate||
      "",
    coverUrl:
      poster
        ?`https://image.tmdb.org/t/p/w500${poster}`
        :baseItem.coverUrl,
    posterPath:poster,
    backdropPath:tmdb.backdrop_path,
    rating:
      tmdb.vote_average
        ?tmdb.vote_average.toFixed(1)
        :"",
    mediaType:tmdb.media_type||"tv"
  };

}


// ==============================
// 工具
// ==============================

function normalizeCompareText_bg(str){
  return String(str||"")
    .toLowerCase()
    .replace(/[^\u4e00-\u9fa5a-z0-9]/g,"");
}

function extractYear_bg(str){
  const m=String(str||"").match(/(19|20)\d{2}/);
  return m?m[0]:"";
}

function stripTags_bg(str){
  return String(str||"").replace(/<[^>]*>/g,"");
}

function normalizeUrl_bg(url){

  if(!url) return "";

  if(url.startsWith("//"))
    return "https:"+url;

  if(url.startsWith("/"))
    return "https://bgm.tv"+url;

  return url;

}

function parseDate_bg(str){

  const m=str.match(/(19|20)\d{2}[-\/年]\d{1,2}/);

  if(!m) return "";

  const s=m[0]
    .replace("年","-")
    .replace("月","");

  return s.length===7?`${s}-01`:s;

}
