// =============UserScript=============

WidgetMetadata = {
  id: "forward.bangumi.tag",
  title: "Bangumi 动画标签",
  description: "按标签、年份、月份浏览 Bangumi 动画列表",
  author: "extract",
  version: "1.0",
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
          value: "",
          placeholders: [
            { title: "百合", value: "百合" },
            { title: "搞笑", value: "搞笑" },
            { title: "恋爱", value: "恋爱" },
            { title: "校园", value: "校园" },
            { title: "战斗", value: "战斗" }
          ]
        },
        {
          name: "airtime_year",
          title: "年份",
          type: "input",
          value: ""
        },
        {
          name: "airtime_month",
          title: "月份",
          type: "enumeration",
          value: "",
          enumOptions: [
            { title: "全年", value: "" },
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
}

// ==========================
// Bangumi 标签页面入口
// ==========================
async function fetchBangumiTagPage_bg(params = {}) {

  const tag = params.tag_keyword || ""
  const year = params.airtime_year || ""
  const month = params.airtime_month || ""
  const sort = params.sort || "rank"
  const page = parseInt(params.page) || 1

  let url

  if (tag) {
    url = `https://bgm.tv/anime/tag/${encodeURIComponent(tag)}`
  } else {
    url = "https://bgm.tv/anime"
  }

  if (year) {
    if (month) {
      url += `/airtime/${year}-${month}`
    } else {
      url += `/airtime/${year}`
    }
  }

  url += `?sort=${sort}&page=${page}`

  return await processBangumiPage_bg(url)
}

// ==========================
// Bangumi 页面解析
// ==========================
async function processBangumiPage_bg(url) {

  const res = await Widget.http.get(url,{
    headers:{
      "User-Agent":
      "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)"
    }
  })

  const html = res.data

  const list = []

  const regex = /<li class="item[\s\S]*?<\/li>/g
  let match

  while ((match = regex.exec(html)) !== null) {

    const item = match[0]

    const title =
      item.match(/title="([^"]+)"/)?.[1]

    const cover =
      item.match(/<img src="([^"]+)"/)?.[1]

    const id =
      item.match(/\/subject\/(\d+)/)?.[1]

    const score =
      item.match(/<span class="fade">([\d.]+)<\/span>/)?.[1]

    list.push({
      id: id,
      type: "bangumi",
      title: title,
      coverUrl: cover?.replace("/s/","/l/"),
      description: score ? `评分 ${score}` : ""
    })
  }

  return list
}
