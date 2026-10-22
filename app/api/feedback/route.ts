import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getRequestUser } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const CATEGORIES = ['masukan', 'kendala', 'fitur', 'lainnya']

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  })
}

export async function POST(request: NextRequest) {
  const user = await getRequestUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const message = String(body.message || '').trim()
  const category = CATEGORIES.includes(body.category) ? body.category : 'masukan'
  if (message.length < 10) return NextResponse.json({ error: 'Tulis masukan minimal 10 karakter.' }, { status: 400 })
  if (message.length > 1500) return NextResponse.json({ error: 'Maksimal 1.500 karakter.' }, { status: 400 })

  const supabase = admin()
  const { data: profile } = await supabase.from('user_profiles').select('role, name').eq('id', user.id).maybeSingle()

  const { error } = await supabase.from('analytics_feedback').insert({
    user_id: user.id,
    role: profile?.role ?? 'student',
    user_name: profile?.name ?? null,
    category,
    message,
    status: 'new',
  })

  if (error) return NextResponse.json({ error: 'Gagal mengirim masukan.' }, { status: 500 })
  return NextResponse.json({ ok: true, message: 'Masukan terkirim ke admin. Terima kasih!' })
}

export async function GET(request: NextRequest) {
  const user = await getRequestUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = admin()
  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await supabase
    .from('analytics_feedback')
    .select('id, user_id, role, user_name, category, message, status, admin_note, created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ feedback: data ?? [] })
}

export async function PATCH(request: NextRequest) {
  const user = await getRequestUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = admin()
  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const id = String(body.id || '')
  if (!id) return NextResponse.json({ error: 'id wajib' }, { status: 400 })

  const { error } = await supabase
    .from('analytics_feedback')
    .update({ status: body.status === 'new' ? 'new' : 'read', admin_note: body.admin_note ? String(body.admin_note).slice(0, 500) : null })
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
