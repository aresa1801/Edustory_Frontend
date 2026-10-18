// Generate Edustory brand assets: mark, wordmark, favicons, PWA icons, OG image.
// Run: node scripts/generate-brand.mjs

import { mkdir, writeFile } from "node:fs/promises"
import { createRequire } from "node:module"

const require = createRequire("/data/.openclaw/workspace-cordex/savepoint-earth/")
const sharp = require("sharp")

const INK = "#0B201C"
const TEAL = "#0E6E5A"
const MINT = "#3ED3A3"
const CREAM = "#F7F3E7"
const AMBER = "#F2B441"

const mark = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0F3B33"/>
      <stop offset="100%" stop-color="${INK}"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="15" fill="url(#bg)"/>
  <path d="M13.5 21.5c0-1.9 1.6-3.3 3.5-2.9 5.2 1.1 9.9 3.2 15 6.9v25.2c-5.5-3.7-10.4-5.8-15.8-6.9-1.6-.3-2.7-1.7-2.7-3.3V21.5Z" fill="${CREAM}"/>
  <path d="M50.5 21.5c0-1.9-1.6-3.3-3.5-2.9-5.2 1.1-9.9 3.2-15 6.9v25.2c5.5-3.7 10.4-5.8 15.8-6.9 1.6-.3 2.7-1.7 2.7-3.3V21.5Z" fill="#FFFDF6"/>
  <path d="M32 25.6v24.7" stroke="${INK}" stroke-width="1.8" stroke-linecap="round" opacity="0.22"/>
  <path d="M46.5 8.5l2.4 5.9 5.9 2.4-5.9 2.4-2.4 5.9-2.4-5.9-5.9-2.4 5.9-2.4 2.4-5.9Z" fill="${AMBER}"/>
  <circle cx="49" cy="49" r="2.2" fill="${MINT}"/>
</svg>`

const markMono = mark
  .replace('url(#bg)', INK)
  .replace(/fill="#FFF?F?D?F?6?"/g, "#FFFFFF")
  .replace(/fill="#F7F3E7"/g, "#FFFFFF")

const markLight = mark.replace('url(#bg)', TEAL)

function wordmark({ light = false, width = 560, height = 140 } = {}) {
  const ink = light ? "#FFFFFF" : INK
  const teal = light ? "#5FE3B8" : TEAL
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 140" width="${width}" height="${height}">
  <g transform="translate(6 22) scale(1.5)">
    ${mark.replace('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="512" height="512">', "").replace("</svg>", "")}
  </g>
  <text x="126" y="88" font-family="Plus Jakarta Sans, Inter, Segoe UI, sans-serif" font-size="58" font-weight="800" letter-spacing="-1.5" fill="${ink}">edu<tspan fill="${teal}">story</tspan></text>
  <text x="130" y="116" font-family="Plus Jakarta Sans, Inter, Segoe UI, sans-serif" font-size="17" font-weight="500" letter-spacing="2.4" fill="${light ? "rgba(255,255,255,0.65)" : "rgba(11,32,28,0.55)"}">BELAJAR YANG TERASA PERSONAL</text>
</svg>`
}

await mkdir("public/brand", { recursive: true })

await writeFile("public/brand/edustory-mark.svg", mark.trim())
await writeFile("public/brand/edustory-mark-mono.svg", markMono.trim())
await writeFile("public/brand/edustory-mark-light.svg", markLight.trim())
await writeFile("public/brand/edustory-wordmark.svg", wordmark())
await writeFile("public/brand/edustory-wordmark-light.svg", wordmark({ light: true }))

const svgBuffer = Buffer.from(mark)

for (const size of [512, 192, 180, 96, 48, 32, 16]) {
  await sharp(svgBuffer).resize(size, size).png({ compressionLevel: 9 }).toFile(`public/brand/icon-${size}.png`)
}

// Maskable icon with safe padding
for (const size of [512, 192]) {
  const inner = Math.round(size * 0.8)
  const art = await sharp(svgBuffer).resize(inner, inner).png().toBuffer()
  await sharp({ create: { width: size, height: size, channels: 4, background: INK } })
    .composite([{ input: art, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toFile(`public/brand/maskable-${size}.png`)
}

// Favicons
await sharp(svgBuffer).resize(16, 16).png().toFile("public/brand/favicon-16.png")
await sharp(svgBuffer).resize(32, 32).png().toFile("public/brand/favicon-32.png")
await sharp(svgBuffer).resize(48, 48).png().toFile("public/brand/favicon-48.png")

// ICO container with 16/32/48 PNG payloads
const icoSizes = [16, 32, 48]
const pngs = []
for (const size of icoSizes) {
  pngs.push(await sharp(svgBuffer).resize(size, size).png().toBuffer())
}
const header = Buffer.alloc(6)
header.writeUInt16LE(0, 0)
header.writeUInt16LE(1, 2)
header.writeUInt16LE(pngs.length, 4)

let offset = 6 + 16 * pngs.length
const entries = []
for (let i = 0; i < pngs.length; i += 1) {
  const size = icoSizes[i]
  const entry = Buffer.alloc(16)
  entry.writeUInt8(size === 256 ? 0 : size, 0)
  entry.writeUInt8(size === 256 ? 0 : size, 1)
  entry.writeUInt8(0, 2)
  entry.writeUInt8(0, 3)
  entry.writeUInt16LE(1, 4)
  entry.writeUInt16LE(32, 6)
  entry.writeUInt32LE(pngs[i].length, 8)
  entry.writeUInt32LE(offset, 12)
  offset += pngs[i].length
  entries.push(entry)
}
await writeFile("public/favicon.ico", Buffer.concat([header, ...entries, ...pngs]))

// Social / OG image
const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0B201C"/>
      <stop offset="60%" stop-color="#0E3A32"/>
      <stop offset="100%" stop-color="#0B201C"/>
    </linearGradient>
    <radialGradient id="glow" cx="78%" cy="20%" r="55%">
      <stop offset="0%" stop-color="${MINT}" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="${MINT}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <g transform="translate(80 150)">
    ${mark.replace('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="512" height="512">', "").replace("</svg>", "").replace('width="64" height="64"', "")}
  </g>
  <text x="80" y="400" font-family="Plus Jakarta Sans, Inter, sans-serif" font-size="96" font-weight="800" fill="#FFFFFF" letter-spacing="-3">edu<tspan fill="#5FE3B8">story</tspan></text>
  <text x="84" y="460" font-family="Plus Jakarta Sans, Inter, sans-serif" font-size="30" fill="rgba(255,255,255,0.72)">Platform belajar privat yang terasa personal.</text>
  <text x="84" y="510" font-family="Plus Jakarta Sans, Inter, sans-serif" font-size="20" letter-spacing="3" fill="rgba(255,255,255,0.4)">TUTOR TERKURASI · KURIKULUM TERSTRUKTUR · LAPORAN PROGRES</text>
</svg>`

await sharp(Buffer.from(ogSvg)).png({ compressionLevel: 9 }).toFile("public/brand/og-image.png")

console.log("brand assets generated")
