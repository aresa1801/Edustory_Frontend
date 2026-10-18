import { createRequire } from "node:module"
import { readFileSync, mkdirSync } from "node:fs"

const require = createRequire(import.meta.url)
const { chromium } = require("/data/.npm-global/lib/node_modules/openclaw/node_modules/playwright-core")

const envFile = readFileSync("/data/.openclaw/workspace-cordex/.secrets/edustory.env", "utf8")
const env = Object.fromEntries(
  envFile
    .split("\n")
    .filter((line) => line.includes("="))
    .map((line) => {
      const i = line.indexOf("=")
      return [line.slice(0, i).trim(), line.slice(i + 1).trim()]
    }),
)

const URL_BASE = env.SUPABASE_URL
const KEY = env.SUPABASE_SERVICE_ROLE
const BASE = process.env.BASE ?? "https://v0-edu-story-website-design-f89utswzk.vercel.app"
const EMAIL = "qa+edustory@carbonfi.test"
const PASSWORD = "EduStory2026!"

mkdirSync("store/redesign", { recursive: true })

const adminHeaders = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
}

async function ensureUser() {
  const list = await fetch(`${URL_BASE}/auth/v1/admin/users?page=1&per_page=200`, { headers: adminHeaders })
  const listBody = await list.json()
  const found = (listBody.users ?? []).find((user) => user.email === EMAIL)
  if (found) return found.id

  const created = await fetch(`${URL_BASE}/auth/v1/admin/users`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: "Aurora Warden" },
    }),
  })
  const body = await created.json()
  if (!created.ok) throw new Error(`create user: ${created.status} ${JSON.stringify(body).slice(0, 200)}`)
  return body.id
}

const userId = await ensureUser()
console.log("user", userId)

await fetch(`${URL_BASE}/rest/v1/user_profiles?on_conflict=id`, {
  method: "POST",
  headers: { ...adminHeaders, Prefer: "resolution=merge-duplicates" },
  body: JSON.stringify([{ id: userId, email: EMAIL, name: "Aurora Warden", role: "siswa" }]),
}).then(async (r) => console.log("profile", r.status, (await r.text()).slice(0, 120)))

const existing = await fetch(`${URL_BASE}/rest/v1/students?user_id=eq.${userId}&select=id`, { headers: adminHeaders }).then((r) => r.json())
if (!ExistingHasRows(existing)) {
  const created = await fetch(`${URL_BASE}/rest/v1/students`, {
    method: "POST",
    headers: { ...adminHeaders, Prefer: "return=representation" },
    body: JSON.stringify([
      {
        user_id: userId,
        grade_level: "9",
        subjects: ["Matematika", "Bahasa Inggris"],
        learning_goals: "Persiapan ujian sekolah",
        status: "active",
      },
    ]),
  })
  console.log("student", created.status, (await created.text()).slice(0, 160))
} else {
  console.log("student exists")
}

function ExistingHasRows(rows) {
  return Array.isArray(rows) && rows.length > 0
}

const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--mute-audio"],
})

for (const [name, viewport] of [
  ["dashboard-mobile", { width: 390, height: 844 }],
  ["dashboard-desktop", { width: 1440, height: 960 }],
]) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: viewport.width < 700 ? 2 : 1,
    isMobile: viewport.width < 700,
    hasTouch: viewport.width < 700,
  })
  const page = await context.newPage()
  await page.goto(`${BASE}/auth/login`, { waitUntil: "networkidle" })
  await page.fill('input[type="email"]', EMAIL)
  await page.fill('input[type="password"]', PASSWORD)
  await page.getByRole("button", { name: /^Masuk$/ }).click().catch(() => {})
  await page.waitForTimeout(4000)
  console.log(name, "after login:", page.url())
  await page.goto(`${BASE}/dashboard/student`, { waitUntil: "networkidle" })
  await page.waitForTimeout(2500)
  await page.screenshot({ path: `store/redesign/${name}.png`, fullPage: false })
  console.log("captured", name)
  await context.close()
}

await browser.close()
