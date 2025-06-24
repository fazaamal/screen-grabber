import chromium from "@sparticuz/chromium-min"
import { chromium as playwright } from "playwright-core"
import { chromium as patchright } from "patchright-core"
import ogs from "open-graph-scraper"
import path from "path"
import os from "os"

export default defineEventHandler(async (event) => {
  const log = (...args: any[]) => console.log("[screenshot]", ...args)

  const query = getQuery(event)
  log("Received query:", query)
  const targetUrl = query.url || "https://github.com"
  const width = parseInt(query.width as string) || 1080
  const height = parseInt(query.height as string) || 1080
  const quality = parseInt(query.quality as string) || 80
  const filetype = (query.filetype as string) === "png" ? "png" : "jpeg"
  const engine =
    (query.engine as string) === "playwright" ? "playwright" : "patchright"
  const userDataDir = path.join(
    os.tmpdir(),
    `patchright-user-data-${Date.now()}`
  )
  log("Parsed params:", {
    targetUrl,
    width,
    height,
    quality,
    filetype,
    engine,
    userDataDir,
  })

  // Validate targetUrl is a string and a valid URL
  if (typeof targetUrl !== "string") {
    log("Invalid url: not a string")
    throw new Error("Invalid url: must be a string")
  }
  try {
    new URL(targetUrl)
  } catch {
    log("Invalid url: not a valid URL")
    throw new Error("Invalid url: must be a valid URL")
  }

  let browser = null
  let ogData = null

  try {
    // Scrape Open Graph data first
    log("Scraping Open Graph data...")
    const ogsResult = await ogs({ url: targetUrl })
    if (ogsResult.result.success) {
      ogData = ogsResult.result
      log("Open Graph data scraped successfully")
    } else {
      log("Failed to scrape Open Graph data:", ogsResult.result.error)
    }

    log("Launching browser with engine:", engine)
    const chromiumEngine = engine === "playwright" ? playwright : patchright
    browser = await chromiumEngine.launchPersistentContext(userDataDir, {
      args: chromium.args,
      executablePath: await chromium.executablePath(
        process.arch === "arm64"
          ? "https://github.com/Sparticuz/chromium/releases/download/v137.0.1/chromium-v137.0.1-pack.arm64.tar"
          : "https://github.com/Sparticuz/chromium/releases/download/v137.0.1/chromium-v137.0.1-pack.x64.tar"
      ),
      headless: true,
      viewport: { width, height },
    })
    log("Browser launched")

    const page = await browser.newPage()
    log("New page created")

    log("Navigating to", targetUrl)
    await page.goto(targetUrl)
    log("Page loaded, waiting for DOMContentLoaded")
    await page.waitForLoadState("domcontentloaded")
    log("Waiting for 1s")
    await page.waitForTimeout(1000)

    log("Scrolling page to load all content")
    // @ts-ignore
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0
        const distance = 100
        const timer = setInterval(() => {
          // @ts-ignore
          window.scrollBy(0, distance)
          totalHeight += distance
          // @ts-ignore
          if (totalHeight >= document.body.scrollHeight) {
            clearInterval(timer)
            resolve(null)
          }
        }, 50)
      })
    })
    log("Scroll complete, resetting scroll position")
    // @ts-ignore
    await page.evaluate(() => window.scrollTo(0, 0))
    log("Waiting for 0.5s")
    await page.waitForTimeout(500)

    log("Taking screenshot")
    const screenshot = await page.screenshot({
      fullPage: true,
      type: filetype,
      quality: filetype === "jpeg" ? quality : undefined,
    })
    log("Screenshot taken, setting response headers")

    // Return both screenshot and Open Graph data
    const response = {
      screenshot: screenshot.toString("base64"),
      contentType: filetype === "png" ? "image/png" : "image/jpeg",
      openGraph: ogData,
    }

    setResponseHeaders(event, {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    })
    log("Returning response with screenshot and Open Graph data")
    return response
  } catch (error: any) {
    log("Error occurred:", error)
    setResponseStatus(event, 500)
    return { error: error.message }
  } finally {
    if (browser) {
      log("Closing browser")
      await browser.close()
      log("Browser closed")
    }
  }
})
