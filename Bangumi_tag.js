// =============UserScript=============

const CONSTANTS_bg = {
  MEDIA_TYPES: {
    ANIME: "anime"
  }
};

const WidgetConfig_bg = {
  BGM_BROWSE_URL: "https://bgm.tv/anime"
};

WidgetMetadata = {
  id: "forward.bangumi.tag",
  title: "Bangumi 动画标签",
  description: "按标签浏览 Bangumi 动画",
  author: "extract",
  version: "1.1",
  requiredVersion: "0.0.1",
  modules: [
    {
      title: "Bangumi 动画标签",
      description: "按标签浏览动画列表",
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
        { name: "page", title: "页码", type: "page" }
      ]
    }
  ]
};

// ==========================
// Bangumi 标签入口
// ==========================
async function fetchBangumiTagPage_bg(params = {}) {
  const tag = (params.tag_keyword || "").trim();
  const sort = params.sort || "rank";
  const page = parseInt(params.page) || 1;

  if (!tag) {
    return [];
  }

  const url =
    `${WidgetConfig_bg.BGM_BROWSE_URL}/tag/${encodeURIComponent(tag)}?sort=${encodeURIComponent(sort)}&page=${page}`;

  return await processBangumiPage_bg(url, page);
}

// ==========================
// Bangumi 页面解析
// ==========================
async function processBangumiPage_bg(url, page) {
  const res = await Widget.http.get(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)"
    }
  });

  const html = res.data || "";
  const list = [];

  // 更宽松地匹配条目块
  const items = html.match(/<li class="item[\s\S]*?<\/li>/g) || [];

  for (const item of items) {
    const id = item.match(/\/subject\/(\d+)/)?.[1] || "";

    // 优先取 h3 中的 title，再回退到链接文字
    let title =
      item.match(/<h3>[\s\S]*?title="([^"]+)"/)?.[1] ||
      item.match(/<h3>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/)?.[1] ||
      "";

    title = title.replace(/<[^>]+>/g, "").trim();

    let cover =
      item.match(/<img[^>]+src="([^"]+)"/)?.[1] || "";

    if (cover.startsWith("//")) {
      cover = "https:" + cover;
    } else if (cover.startsWith("/")) {
      cover = "https://bgm.tv" + cover;
    }

    const score =
      item.match(/<span class="fade">([\d.]+)<\/span>/)?.[1] || "";

    const info =
      item.match(/<p class="info">([\s\S]*?)<\/p>/)?.[1]
        ?.replace(/<[^>]+>/g, "")
        ?.replace(/\s+/g, " ")
        ?.trim() || "";

    const rank =
      item.match(/<span class="rank">#(\d+)<\/span>/)?.[1] || "";

    let descriptionParts = [];
    if (rank) descriptionParts.push(`排名 #${rank}`);
    if (score) descriptionParts.push(`评分 ${score}`);
    if (info) descriptionParts.push(info);

    if (!id || !title) continue;

    list.push({
      id,
      type: "bangumi",
      title,
      coverUrl: cover ? cover.replace("/s/", "/l/") : "",
      description: descriptionParts.join(" · ")
    });
  }

  return list;
}
