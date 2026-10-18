import { createRequire } from "node:module"
import { readFileSync, mkdirSync } from "node:fs"

const require = createRequire(import.meta.url)
const { chromium } = require("/data/.npm-global/lib/node_modules/openclaw/node_modules/playwright-core")

const env = Object.fromEntries(
  readFileSync("/data/.openclaw/workspace-cordex/.secrets/edustory.env", "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => {
      const i = l.indexOf("=")
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    }),
)

const BASE = process.env.BASE ?? "https://v0-edu-story-website-design-f89utswzk.vercel.app"
const EMAIL = "qa+edustory@carbonfi.test"
const PASSWORD = "EduStory2026!"

mkdirSync("store/redesign", { recursive: true })

const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--mute-audio"],
})

const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
})
const page = await context.newPage()

page.on("console", (message) => console.log("console:", message.type(), message.text().slice(0, 160)))
page.on("requestfailed", (request) => console.log("failed:", request.url().slice(0, 120), request.failure()?.errorText))
page.on("response", (response) => {
  if (response.url().includes("/api/")) console.log("api:", response.status(), response.url().replace(BASE, "").slice(0, 120))
})

await page.goto(`${BASE}/auth/login`, { waitUntil: "networkidle" })
await page.fill('input[type="email"]', EMAIL)
await page.fill('input[type="password"]', PASSWORD)
await page.getByRole("button", { name: /^Masuk$/ }).click()
await page.waitForTimeout(5000)
console.log("after login url:", page.url())

await page.goto(`${BASE}/dashboard/student`, { waitUntil: "domcontentloaded" })
for (let i = 0; i < 6; i += 1) {
  await page.waitForTimeout(2000)
  const text = await page.locator("body").innerText().catch(() => "")
  console.log(`t+${(i + 1) * 2}s:`, text.replace(/\s+/g, " ").slice(0, 120))
  if (!text.includes("Memuat dashboard")) break
}

await page.screenshot({ path: "store/redesign/dashboard-mobile.png", fullPage: false })
console.log("captured final")
await browser.close()
