// =============UserScript=============
WidgetMetadata = {
  id: "forward.bangumi.tag.fast",
  title: "Bangumi 动画标签（极速版）",
  description: "按标签、年份、月份快速浏览 Bangumi 动画列表",
  author: "custom",
  version: "1.0.0",
  requiredVersion: "0.0.1",
  modules: [
    {
      title: "Bangumi 动画标签（极速版）",
      description: "速度优先的 Bangumi 标签筛选",
      requiresWebView: false,
      functionName: "fetchBangumiTagFast_bg",
      cacheDuration: 1800,
      params: [
        {
          name: "tag_keyword",
          title: "动画标签",
          type: "input",
          value: "",
          placeholders: [
            { title: "百合", value: "百合" },
            { title: "搞笑", value: "搞笑" },
            { title: "恋爱", value: "恋爱" },
            { title: "校园", value: "校园" },
            { title: "战斗", value: "战斗" },
            { title: "京都动画", value: "京都动画" }
          ]
        },
        {
          name: "airtime_year",
          title: "年份（可选）",
          type: "input",
          value: ""
        },
        {
          name: "airtime_month",
          title: "月份（可选）",
          type: "enumeration",
          value: "",
          enumOptions: [
            { title: "全年/不限", value: "" },
            { title: "1月", value: "1" },
            { title: "4月", value: "4" },
            { title: "7月", value: "7" },
            { title: "10月", value: "10" }
          ]
        },
        {
          name: "sort",
          title: "排序方式",
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

async function fetchBangumiTagFast_bg(params = {}) {
  const tag = String(params.tag_keyword || "").trim();
  const year = String(params.airtime_year || "").trim();
  const month = String(params.airtime_month || "").trim();
  const sort = String(params.sort || "rank").trim();
  const page = Math.max(1, parseInt(params.page || "1", 10) || 1);

  const url = buildBangumiTagUrl(tag, year, month, sort, page);

  const res = await Widget.http.get(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile",
      "Referer": "https://bangumi.tv/"
    }
  });

  const html = typeof res.data === "string" ? res.data : String(res.data || "");
  if (!html) return [];

  return parseBangumiListFast(html);
}

function buildBangumiTagUrl(tag, year, month, sort, page) {
  let base = "https://bangumi.tv/anime/tag/";

  if (tag) {
    base += `${encodeURIComponent(tag)}/`;

    if (/^\d{4}$/.test(year)) {
      base += "airtime/";
      let datePath = year;

      if (/^\d{1,2}$/.test(month)) {
        const m = parseInt(month, 10);
        if (m >= 1 && m <= 12) {
          datePath += `-${String(m).padStart(2, "0")}`;
        }
      }

      base += datePath;
    }
  }

  return `${base}?sort=${encodeURIComponent(sort)}&page=${page}`;
}

function parseBangumiListFast(html) {
  const results = [];

  // 列表项：尽量宽松匹配，避免 class 细节变化导致全失效
  const itemMatches = html.match(/<li[^>]*class="[^"]*\bitem\b[^"]*"[\s\S]*?<\/li>/g) || [];

  for (const block of itemMatches) {
    const id =
      firstMatch(block, /\/subject\/(\d+)/) || "";

    const title =
      decodeHtml(
        firstMatch(block, /<h3[\s\S]*?<a[^>]*title="([^"]+)"/) ||
        firstMatch(block, /<h3[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/)
      ).replace(/<[^>]+>/g, "").trim();

    const coverRaw =
      firstMatch(block, /<img[^>]+src="([^"]+)"/) ||
      firstMatch(block, /<img[^>]+data-cfsrc="([^"]+)"/) ||
      "";

    const coverUrl = normalizeCoverUrl(coverRaw);

    const score =
      firstMatch(block, /<span[^>]*class="fade"[^>]*>([\d.]+)<\/span>/) || "";

    const votes =
      firstMatch(block, /<span[^>]*class="tip_j"[^>]*>\((\d+)\)/) || "";

    const info =
      decodeHtml(firstMatch(block, /<p[^>]*class="info"[^>]*>([\s\S]*?)<\/p>/) || "")
        .replace(/<br\s*\/?>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    if (!id || !title) continue;

    let description = "";
    if (score) description += `评分 ${score}`;
    if (votes) description += `${description ? " · " : ""}${votes}人评分`;
    if (info) description += `${description ? " · " : ""}${info}`;

    results.push({
      id,
      type: "bangumi",
      title,
      coverUrl,
      description
    });
  }

  return results;
}

function firstMatch(text, regex) {
  const m = text.match(regex);
  return m && m[1] ? m[1] : "";
}

function normalizeCoverUrl(url) {
  if (!url) return "";

  let out = url.trim();

  if (out.startsWith("//")) {
    out = "https:" + out;
  }

  // 小图尽量替换成大图
  out = out.replace("/pic/cover/s/", "/pic/cover/l/");
  out = out.replace("/pic/cover/c/", "/pic/cover/l/");
  out = out.replace("/pic/cover/m/", "/pic/cover/l/");

  return out;
}

function decodeHtml(str) {
  return String(str || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}
