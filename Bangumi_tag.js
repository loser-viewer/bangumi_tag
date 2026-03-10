async function fetchBangumiTagPage_bg(params = {}) {

  const tag = params.tag_keyword || ""
  const sort = params.sort || "rank"
  const page = parseInt(params.page) || 1

  let url = tag
    ? `https://bgm.tv/anime/tag/${encodeURIComponent(tag)}`
    : `https://bgm.tv/anime`

  if (sort) {
    url += `?sort=${sort}`
  }

  if (page > 1) {
    url += `${url.includes("?") ? "&" : "?"}page=${page}`
  }

  const res = await Widget.http.get(url,{
    headers:{
      "User-Agent":
      "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)"
    }
  })

  const html = res.data

  const list = []

  const regex = /<li class="item clearit">([\s\S]*?)<\/li>/g
  let match

  while ((match = regex.exec(html)) !== null) {

    const item = match[1]

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
