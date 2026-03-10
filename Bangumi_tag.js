WidgetMetadata = {
  id: "forward.bangumi.tag",
  title: "Bangumi 标签筛选",
  description: "按标签浏览 Bangumi 动画",
  author: "custom",
  version: "1.0",
  requiredVersion: "0.0.1",
  modules: [
    {
      title: "Bangumi 标签",
      description: "按标签浏览动画",
      requiresWebView: false,
      functionName: "fetchBangumiTagPage_bg",
      cacheDuration: 3600,
      params: [
        {
          name: "tag_keyword",
          title: "标签",
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

async function fetchBangumiTagPage_bg(params = {}) {

  const page = parseInt(params.page) || 1
  const tag = params.tag_keyword || ""
  const sort = params.sort || "rank"

  let url = `https://api.bgm.tv/v0/search/subjects`

  const body = {
    keyword: tag,
    filter: { type: [2] }
  }

  const response = await Widget.http.post(url,{
    headers:{
      "Content-Type":"application/json"
    },
    body: JSON.stringify(body)
  })

  const data = response.data.data || []

  return data.map(item => ({
    id: item.id,
    type: "bangumi",
    title: item.name_cn || item.name,
    coverUrl: item.images?.large,
    description: `评分 ${item.rating?.score || "-"}`
  }))
}
