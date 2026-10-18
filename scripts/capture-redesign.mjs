import { createRequire } from "node:module"
import { mkdir } from "node:fs/promises"

const require = createRequire(import.meta.url)
const { chromium } = require("/data/.npm-global/lib/node_modules/openclaw/node_modules/playwright-core")

const BASE = process.env.BASE ?? "https://v0-edu-story-website-design-a5z98bxko.vercel.app"
const OUT = "store/redesign"
await mkdir(OUT, { recursive: true })

const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--mute-audio"],
})

async function capture(name, viewport, path, { fullPage = true, scale = 2, wait = 1200 } = {}) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: scale,
    isMobile: viewport.width < 700,
    hasTouch: viewport.width < 700,
  })
  const page = await context.newPage()
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" })
  await page.waitForTimeout(wait)
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage })
  console.log("captured", name)
  await context.close()
}

await capture("landing-mobile", { width: 390, height: 844 }, "/", { fullPage: true, scale: 2 })
await capture("landing-desktop", { width: 1440, height: 960 }, "/", { fullPage: true, scale: 1 })
await capture("auth-login", { width: 390, height: 844 }, "/auth/login", { fullPage: false, scale: 2 })

await browser.close()
console.log("done")
