import chromium from "@sparticuz/chromium-min"
import { chromium as playwright } from "playwright-core"
import path from "path"
import os from "os"

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const targetUrl = query.url || "https://github.com"
  const width = parseInt(query.width as string) || 1080
  const height = parseInt(query.height as string) || 1080
  const quality = parseInt(query.quality as string) || 80
  const filetype = (query.filetype as string) === "png" ? "png" : "jpeg"
  const userDataDir = path.join(
    os.tmpdir(),
    `patchright-user-data-${Date.now()}`
  )

  // Validate targetUrl is a string and a valid URL
  if (typeof targetUrl !== "string") {
    throw new Error("Invalid url: must be a string")
  }
  try {
    new URL(targetUrl)
  } catch {
    throw new Error("Invalid url: must be a valid URL")
  }

  let browser = null
  try {
    browser = await playwright.launchPersistentContext(userDataDir, {
      args: chromium.args,
      executablePath: await chromium.executablePath(
        process.arch === "arm64"
          ? "https://github.com/Sparticuz/chromium/releases/download/v137.0.1/chromium-v137.0.1-pack.arm64.tar"
          : "https://github.com/Sparticuz/chromium/releases/download/v137.0.1/chromium-v137.0.1-pack.x64.tar"
      ),
      headless: true,
      viewport: { width, height },
    })
    const page = await browser.newPage()
    await page.goto(targetUrl)
    await page.waitForLoadState("domcontentloaded")
    await page.waitForTimeout(1000)
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
    // @ts-ignore
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(500)
    const screenshot = await page.screenshot({
      fullPage: true,
      type: filetype,
      quality: filetype === "jpeg" ? quality : undefined,
    })
    setResponseHeaders(event, {
      "Content-Type": filetype === "png" ? "image/png" : "image/jpeg",
      "Cache-Control": "public, max-age=3600",
    })
    return screenshot
  } catch (error: any) {
    setResponseStatus(event, 500)
    return { error: error.message }
  } finally {
    if (browser) await browser.close()
  }
})
