// ============= UserScript =============

WidgetMetadata = {
  id: "forward.bangumi.tag.only",
  title: "Bangumi 动画标签",
  description: "Bangumi 标签浏览 + 原版影视榜单匹配算法",
  author: "extract",
  version: "2.0.0",
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
  FETCH_BATCH_SIZE: 6
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
    html.match(/<ul[^>]*id="browserItemList"[^>]*>[\s\S]*?<\/ul>/)?.[0] || "";

  const itemBlocks =
    listBlock.match(/<li[^>]*class="[^"]*item[^"]*"[^>]*>[\s\S]*?<\/li>/g) || [];

  const bangumiItems =
    itemBlocks.map(parseBangumiListItem_bg).filter(Boolean);

  const results = [];

  for (let i = 0; i < bangumiItems.length; i += WidgetConfig_bg.FETCH_BATCH_SIZE) {

    const batch = bangumiItems.slice(i, i + WidgetConfig_bg.FETCH_BATCH_SIZE);

    const batchWithDetail = await Promise.all(
      batch.map(fetchItemDetails_bg)
    );

    const batchResults = await Promise.all(
      batchWithDetail.map(matchBangumiToTmdb_bg)
    );

    results.push(...batchResults.filter(Boolean));
  }

  return results;
}


// ==============================
// 解析 Bangumi 列表
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
    detailUrl: `${WidgetConfig_bg.BGM_BASE_URL}/subject/${id}`
  };
}


// ==============================
// 读取 Bangumi 详情页（原版核心）
// ==============================
async function fetchItemDetails_bg(item) {

  try {

    const response = await Widget.http.get(item.detailUrl);
    const html = typeof response?.data === "string" ? response.data : "";

    if (!html) return item;

    const chineseTitle =
      stripTags_bg(
        html.match(/中文名:\s*<\/span>\s*([^<]+)/)?.[1] || ""
      ).trim();

    const aliasList =
      [...html.matchAll(/<li class="sub">([^<]+)<\/li>/g)]
        .map(x => stripTags_bg(x[1]).trim());

    return {
      ...item,
      chineseTitle,
      alias: aliasList
    };

  } catch {
    return item;
  }

}


// ==============================
// TMDB 匹配（原版算法）
// ==============================
async function matchBangumiToTmdb_bg(item) {

  const cacheKey = `${item.title}_${item.year}`;

  if (tmdbCache_bg[cacheKey])
    return integrateTmdbItem_bg(item, tmdbCache_bg[cacheKey]);

  const queries =
    generateTmdbSearchQueries_bg(item);

  const candidates =
    await searchTmdb_bg(queries, item.year);

  if (!candidates.length) return null;

  const best =
    scoreTmdbResult_bg(candidates,item);

  if (!best) return null;

  tmdbCache_bg[cacheKey] = best;

  return integrateTmdbItem_bg(item,best);
}


// ==============================
// query生成（原版）
// ==============================
function generateTmdbSearchQueries_bg(item){

  const set = new Set();

  const clean = s =>
    String(s||"")
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
async function searchTmdb_bg(queries,year){

  const results = [];

  for(const query of queries){

    const params = {
      query,
      language:"zh-CN",
      include_adult:false
    };

    if(year)
      params.first_air_date_year=parseInt(year);

    const res =
      await Widget.tmdb.get("/search/tv",{params});

    const list =
      res?.results || [];

    results.push(...list.map(x=>({...x,media_type:"tv"})));

    if(results.length>20) break;

  }

  if(!results.length){

    for(const query of queries){

      const params = {
        query,
        language:"zh-CN",
        include_adult:false
      };

      if(year)
        params.primary_release_year=parseInt(year);

      const res =
        await Widget.tmdb.get("/search/movie",{params});

      const list =
        res?.results || [];

      results.push(...list.map(x=>({...x,media_type:"movie"})));

      if(results.length>20) break;

    }

  }

  return results;
}


// ==============================
// 原版评分算法
// ==============================
function scoreTmdbResult_bg(results,item){

  let best=null;
  let bestScore=-Infinity;

  for(const r of results){

    const s =
      calculateTmdbMatchScore_bg(r,item);

    if(s>bestScore){
      bestScore=s;
      best=r;
    }

  }

  return bestScore>0 ? best : null;
}


function calculateTmdbMatchScore_bg(r,item){

  let score=0;

  const tmdbTitle=
    normalizeCompareText_bg(r.name||r.title);

  const bgmTitle=
    normalizeCompareText_bg(item.title);

  if(tmdbTitle===bgmTitle) score+=120;
  else if(tmdbTitle.includes(bgmTitle)) score+=50;

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

  const posterPath=tmdb.poster_path||null;

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
      posterPath
        ?`${WidgetConfig_bg.TMDB_IMAGE_BASE}${posterPath}`
        :baseItem.coverUrl,
    posterPath,
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
    return WidgetConfig_bg.BGM_BASE_URL+url;

  return url;

}

function parseDate_bg(str){

  const m=str.match(/(19|20)\d{2}[-\/年]\d{1,2}/);

  if(!m) return "";

  const s=m[0]
    .replace("年","-")
    .replace("月","");

  return s.length===7 ? `${s}-01` : s;

}
