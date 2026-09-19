import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// ============================================================
// SECURITY CONFIG
// ============================================================

// Panjang maksimal link
const MAX_LINK_LENGTH = 500

// Domain yang diizinkan (whitelist)
const ALLOWED_DOMAINS = [
  'meet.google.com',
  'hangouts.google.com',
]

// Regex URL yang ketat (hanya https, hanya domain whitelist)
const SAFE_URL_REGEX = /^https:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/[^\s<>"']*)?$/i

// Karakter berbahaya yang TIDAK boleh ada
const FORBIDDEN_CHARS_REGEX = /[<>"'`\\\u0000-\u001f\u007f-\u009f]/g

// Protokol berbahaya
const DANGEROUS_PROTOCOLS = [
  'javascript:',
  'data:',
  'vbscript:',
  'file:',
  'blob:',
  'about:',
]

// ============================================================
// SANITIZER
// ============================================================
function sanitizeGmeetLink(input: string): {
  ok: boolean
  sanitized: string | null
  error?: string
} {
  if (typeof input !== 'string') {
    return { ok: false, sanitized: null, error: 'Input harus string' }
  }

  // 1. Trim whitespace
  let cleaned = input.trim()

  // 2. Cek panjang
  if (cleaned.length > MAX_LINK_LENGTH) {
    return {
      ok: false,
      sanitized: null,
      error: `Link terlalu panjang (maks ${MAX_LINK_LENGTH} karakter)`,
    }
  }

  // 3. Normalisasi Unicode (cegah bypass seperti \u0073cript)
  try {
    cleaned = cleaned.normalize('NFKC')
  } catch {
    return { ok: false, sanitized: null, error: 'Link tidak valid' }
  }

  // 4. Decode HTML entities (kalau ada &#x6A;avascript)
  cleaned = cleaned
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
      try {
        return String.fromCodePoint(parseInt(hex, 16))
      } catch {
        return ''
      }
    })
    .replace(/&#(\d+);/g, (_, dec) => {
      try {
        return String.fromCodePoint(parseInt(dec, 10))
      } catch {
        return ''
      }
    })
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&apos;/g, "'")

  // 5. Cek karakter berbahaya
  if (FORBIDDEN_CHARS_REGEX.test(cleaned)) {
    return {
      ok: false,
      sanitized: null,
      error: 'Link mengandung karakter yang tidak diizinkan',
    }
  }

  // 6. Cek protokol berbahaya (lowercase)
  const lower = cleaned.toLowerCase()
  for (const proto of DANGEROUS_PROTOCOLS) {
    if (lower.startsWith(proto)) {
      return {
        ok: false,
        sanitized: null,
        error: 'Protokol link tidak diizinkan',
      }
    }
  }

  // 7. Harus https://
  if (!lower.startsWith('https://')) {
    return {
      ok: false,
      sanitized: null,
      error: 'Link harus dimulai dengan https://',
    }
  }

  // 8. Regex URL ketat
  if (!SAFE_URL_REGEX.test(cleaned)) {
    return {
      ok: false,
      sanitized: null,
      error: 'Format link tidak valid',
    }
  }

  // 9. Parse domain — whitelist check
  let hostname: string
  try {
    const url = new URL(cleaned)
    hostname = url.hostname.toLowerCase()
  } catch {
    return { ok: false, sanitized: null, error: 'Link tidak valid' }
  }

  // 10. Cek domain whitelist
  const isAllowedDomain = ALLOWED_DOMAINS.some(
    (d) => hostname === d || hostname.endsWith('.' + d)
  )
  if (!isAllowedDomain) {
    return {
      ok: false,
      sanitized: null,
      error: `Hanya link dari ${ALLOWED_DOMAINS.join(', ')} yang diizinkan`,
    }
  }

  // 11. Cek apakah ada karakter kontrol yang lolos
  if (/[\u0000-\u001f\u007f-\u009f]/.test(cleaned)) {
    return { ok: false, sanitized: null, error: 'Link tidak valid' }
  }

  return { ok: true, sanitized: cleaned }
}

// ============================================================
// PATCH — Simpan/Update link GMeet (khusus tutor)
// ============================================================
export async function PATCH(
  req: NextRequest,
  { params }: { params: { matchId: string } }
) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { matchId } = params

    // Validasi matchId adalah UUID
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!UUID_REGEX.test(matchId)) {
      return NextResponse.json(
        { error: 'Match ID tidak valid' },
        { status: 400 }
      )
    }

    // Parse body dengan guard
    let body: any
    try {
      body = await req.json()
    } catch {
      return NextResponse.json(
        { error: 'Body tidak valid' },
        { status: 400 }
      )
    }

    const { link, user_id, role } = body

    if (role !== 'tutor') {
      return NextResponse.json(
        { error: 'Hanya tutor yang bisa menyimpan link GMeet' },
        { status: 403 }
      )
    }

    if (!user_id || typeof user_id !== 'string' || !UUID_REGEX.test(user_id)) {
      return NextResponse.json(
        { error: 'user_id tidak valid' },
        { status: 400 }
      )
    }

    // === SANITIZE LINK ===
    const sanitizeResult = sanitizeGmeetLink(link || '')

    if (!sanitizeResult.ok) {
      return NextResponse.json(
        { error: sanitizeResult.error || 'Link tidak valid' },
        { status: 400 }
      )
    }

    const safeLink = sanitizeResult.sanitized

    // Validasi tutor
    const { data: tutor, error: tErr } = await supabaseAdmin
      .from('tutors')
      .select('id')
      .eq('user_id', user_id)
      .single()

    if (tErr || !tutor) {
      return NextResponse.json(
        { error: 'Tutor tidak ditemukan' },
        { status: 404 }
      )
    }

    // Validasi ownership
    const { data: schedule, error: sErr } = await supabaseAdmin
      .from('match_schedules')
      .select('id, tutor_id')
      .eq('match_id', matchId)
      .single()

    if (sErr || !schedule) {
      return NextResponse.json(
        { error: 'Schedule tidak ditemukan' },
        { status: 404 }
      )
    }

    if (schedule.tutor_id !== tutor.id) {
      return NextResponse.json(
        { error: 'Kamu tidak punya akses ke match ini' },
        { status: 403 }
      )
    }

    // Update (sanitized link atau null)
    const { error: updateErr } = await supabaseAdmin
      .from('match_schedules')
      .update({ gmeet_link: safeLink || null })
      .eq('id', schedule.id)

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      gmeet_link: safeLink || null,
    })
  } catch (err) {
    console.error('[API gmeet PATCH] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}