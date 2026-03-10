// =============UserScript=============
WidgetMetadata = {
  id: "forward.bangumi.tag.fast",
  title: "Bangumi 动画标签",
  description: "按标签筛选 Bangumi 动画（极速版）",
  author: "custom",
  version: "1.0",
  requiredVersion: "0.0.1",
  modules: [
    {
      title: "Bangumi 标签",
      description: "按标签浏览动画",
      requiresWebView: false,
      functionName: "fetchBangumiTagFast",
      cacheDuration: 1800,
      params: [
        {
          name: "tag",
          title: "标签",
          type: "input",
          value: "",
          placeholders: [
            { title: "百合", value: "百合" },
            { title: "京都动画", value: "京都动画" },
            { title: "恋爱", value: "恋爱" },
            { title: "校园", value: "校园" }
          ]
        },
        {
          name: "limit",
          title: "数量",
          type: "enumeration",
          value: "20",
          enumOptions: [
            { title: "10", value: "10" },
            { title: "20", value: "20" },
            { title: "30", value: "30" }
          ]
        }
      ]
    }
  ]
}

// ========================
// Bangumi API 查询
// ========================
async function fetchBangumiTagFast(params = {}) {

  const tag = params.tag || ""
  const limit = parseInt(params.limit) || 20

  if (!tag) {
    return []
  }

  const url = "https://api.bgm.tv/v0/search/subjects"

  const body = {
    keyword: tag,
    filter: {
      type: [2]
    }
  }

  const res = await Widget.http.post(url,{
    headers:{
      "Content-Type":"application/json",
      "User-Agent":"Forward Bangumi Plugin"
    },
    body: JSON.stringify(body)
  })

  const data = res.data?.data || []

  const list = []

  for (const item of data.slice(0,limit)) {

    list.push({
      id: item.id,
      type: "bangumi",
      title: item.name_cn || item.name,
      coverUrl: item.images?.large,
      description:
        "评分 " + (item.rating?.score || "-") +
        " · Rank " + (item.rank || "-")
    })
  }

  return list
}
