import { createRequire } from "node:module"
import { readFileSync } from "node:fs"

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

const BASE = process.env.BASE
const EMAIL = "qa+edustory@carbonfi.test"
const PASSWORD = "***"

const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--mute-audio"],
})
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
const page = await context.newPage()

await page.goto(`${BASE}/auth/login`, { waitUntil: "networkidle" })
await page.fill('input[type="email"]', EMAIL)
await page.fill('input[type="password"]', PASSWORD)
await page.getByRole("button", { name: /^Masuk$/ }).click()
await page.waitForTimeout(3500)

const checks = await page.evaluate(async () => {
  const other = "00000000-0000-0000-0000-000000000000"
  const a = await fetch(`/api/credit/me?user_id=${other}&role=student`)
  const b = await fetch(`/api/students/onboarding?user_id=${other}`)
  const me = await fetch(`/api/credit/me?user_id=${(await (await fetch("/api/students")).json())?.user_id ?? ""}&role=student`).catch(() => null)
  return { crossUserCredit: a.status, crossUserStudent: b.status, selfCredit: me ? me.status : null }
})
console.log(checks)

await browser.close()
