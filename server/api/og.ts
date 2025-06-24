import ogs from "open-graph-scraper"

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const targetUrl = query.url
  if (!targetUrl || typeof targetUrl !== "string") {
    setResponseStatus(event, 400)
    return { error: "Missing or invalid url parameter" }
  }
  try {
    const ogsResult = await ogs({ url: targetUrl })
    if (ogsResult.result.success) {
      return { openGraph: ogsResult.result }
    } else {
      return {
        error: ogsResult.result.error || "Failed to fetch Open Graph data",
      }
    }
  } catch (error: any) {
    setResponseStatus(event, 500)
    return { error: error.message }
  }
})
