// ============= UserScript =============

const WidgetConfig_bg = {
  BGM_BASE_URL: "https://bgm.tv",
  BGM_TAG_URL: "https://bgm.tv/anime/tag"
};

WidgetMetadata = {
  id: "forward.bangumi.simple.tag",
  title: "Bangumi 动画标签",
  description: "按标签浏览 Bangumi 动画（简化版）",
  author: "ChatGPT",
  version: "1.0.0",
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

async function fetchBangumiTagPage_bg(params = {}) {
  const tag = (params.tag_keyword || "").trim();
  const sort = params.sort || "rank";
  const page = parseInt(params.page, 10) || 1;

  if (!tag) {
    return [];
  }

  const url =
    `${WidgetConfig_bg.BGM_TAG_URL}/${encodeURIComponent(tag)}?sort=${encodeURIComponent(sort)}&page=${page}`;

  return await processBangumiTagPage_bg(url);
}

async function processBangumiTagPage_bg(url) {
  const res = await Widget.http.get(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1"
    }
  });

  const html = typeof res?.data === "string" ? res.data : "";
  if (!html) {
    return [];
  }

  const list = [];

  // 更稳一点：先截出主列表区域，再逐项匹配
  const listBlock =
    html.match(/<ul[^>]*id="browserItemList"[^>]*>[\s\S]*?<\/ul>/)?.[0] ||
    html.match(/<ul[^>]*class="[^"]*browserFull[^"]*"[^>]*>[\s\S]*?<\/ul>/)?.[0] ||
    "";

  if (!listBlock) {
    return [];
  }

  const items = listBlock.match(/<li[^>]*class="[^"]*\bitem\b[^"]*"[^>]*>[\s\S]*?<\/li>/g) || [];

  for (const item of items) {
    const id = item.match(/\/subject\/(\d+)/)?.[1] || "";
    if (!id) continue;

    let title =
      item.match(/<h3>[\s\S]*?<a[^>]*title="([^"]+)"[^>]*>/)?.[1] ||
      item.match(/<h3>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/)?.[1] ||
      "";

    title = decodeHtml_bg(stripTags_bg(title)).trim();
    if (!title) continue;

    let cover =
      item.match(/<img[^>]+src="([^"]+)"/)?.[1] ||
      item.match(/<img[^>]+data-cfsrc="([^"]+)"/)?.[1] ||
      "";

    cover = normalizeUrl_bg(cover);
    if (cover) {
      cover = cover.replace("/s/", "/l/");
    }

    const score =
      item.match(/<span[^>]*class="fade"[^>]*>([\d.]+)<\/span>/)?.[1] || "";

    const rank =
      item.match(/<span[^>]*class="rank"[^>]*>#?(\d+)<\/span>/)?.[1] || "";

    const infoRaw =
      item.match(/<p[^>]*class="info"[^>]*>([\s\S]*?)<\/p>/)?.[1] || "";
    const info = decodeHtml_bg(
      stripTags_bg(infoRaw).replace(/\s+/g, " ").trim()
    );

    const descParts = [];
    if (rank) descParts.push(`排名 #${rank}`);
    if (score) descParts.push(`评分 ${score}`);
    if (info) descParts.push(info);

    list.push({
      id,
      type: "bangumi",
      title,
      coverUrl: cover,
      description: descParts.join(" · "),
      url: `${WidgetConfig_bg.BGM_BASE_URL}/subject/${id}`
    });
  }

  return list;
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
