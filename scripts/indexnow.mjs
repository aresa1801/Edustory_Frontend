#!/usr/bin/env node
/**
 * IndexNow: push URLs to Bing, Yandex, Seznam and Naver the moment they change.
 * Google does not participate — its Indexing API is limited to JobPosting and
 * BroadcastEvent — so sitemap + internal links remain the Google channel.
 *
 * Usage: node scripts/indexnow.mjs            (submits every sitemap URL)
 *        node scripts/indexnow.mjs /path ...
 */
import fs from 'node:fs'
import path from 'node:path'

const HOST = process.env.INDEXNOW_HOST || 'edustory.online'
const SITE = `https://${HOST}`

const keyFile = fs
  .readdirSync(path.join(process.cwd(), 'public'))
  .find((f) => /^[a-f0-9]{32}\.txt$/.test(f))
if (!keyFile) {
  console.error('No IndexNow key file in public/.')
  process.exit(1)
}
const KEY = keyFile.replace(/\.txt$/, '')

async function sitemapUrls() {
  const urls = []
  const index = await (await fetch(`${SITE}/sitemap.xml`)).text()
  const shards = [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
  for (const shard of shards) {
    const xml = await (await fetch(shard)).text()
    urls.push(...[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]))
  }
  return urls
}

const args = process.argv.slice(2)
const urls = args.length ? args.map((p) => (p.startsWith('http') ? p : SITE + p)) : await sitemapUrls()

// IndexNow accepts up to 10,000 URLs per request.
let sent = 0
for (let i = 0; i < urls.length; i += 10000) {
  const batch = urls.slice(i, i + 10000)
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList: batch }),
  })
  console.log(`batch ${i / 10000 + 1}: ${res.status} ${res.statusText} (${batch.length} urls)`)
  sent += batch.length
}
console.log(`submitted ${sent} urls for ${HOST}`)
