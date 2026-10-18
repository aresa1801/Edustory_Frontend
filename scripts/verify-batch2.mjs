import { chromium } from '/data/.npm-global/lib/node_modules/openclaw/node_modules/playwright-core/index.mjs'

const BASE = process.argv[2]
if (!BASE) { console.error('usage: node verify-batch2.mjs <url>'); process.exit(1) }

const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] })
const messages = []

async function visit(path, viewport, shot, wait = 2500) {
  const ctx = await browser.newContext({ viewport })
  const page = await ctx.newPage()
  page.on('console', (msg) => {
    const type = msg.type()
    if (['log', 'info', 'debug', 'warning', 'error'].includes(type)) messages.push({ path, type, text: msg.text().slice(0, 200) })
  })
  page.on('pageerror', (err) => messages.push({ path, type: 'pageerror', text: String(err).slice(0, 200) }))
  let res
  try {
    res = await page.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 30000 })
  } catch (err) {
    messages.push({ path, type: 'goto-error', text: String(err).slice(0, 160) })
  }
  await page.waitForTimeout(wait)
  if (shot) await page.screenshot({ path: `store/redesign2/${shot}`, fullPage: false })
  await ctx.close()
  return res?.status()
}

const status = {}
status['/'] = await visit('/', { width: 390, height: 844 }, 'landing-mobile.png')
status['/desktop'] = await visit('/', { width: 1440, height: 900 }, 'landing-desktop.png')
status['/auth/login'] = await visit('/auth/login', { width: 390, height: 844 }, 'login-mobile.png')
status['/privacy'] = await visit('/privacy', { width: 390, height: 844 }, null, 800)

console.log('STATUS', JSON.stringify(status))
console.log('CONSOLE_COUNT', messages.length)
for (const m of messages.slice(0, 20)) console.log(m.type, m.path, m.text)
await browser.close()
