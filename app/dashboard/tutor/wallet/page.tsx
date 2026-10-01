import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import TutorWalletClient from './WalletClient'
import { autoCompleteExpiredSessions } from '@/lib/auto-complete'

export default async function TutorWalletPage() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) { return cookieStore.get(name)?.value },
        set(name, value, options) { cookieStore.set({ name, value, ...options }) },
        remove(name, options) { cookieStore.set({ name, value: '', ...options }) },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    redirect('/auth/login')
  }

    try {
    await autoCompleteExpiredSessions()
  } catch (e) {
    console.error('[tutor-wallet] heal error:', e)
  }

  // Ambil tutor data
  const { data: tutor } = await supabase
    .from('tutors')
    .select('id')
    .eq('user_id', session.user.id)
    .single()

  let balance = 0
  if (tutor) {
    const { data: wallet } = await supabase
      .from('wallets')
      .select('balance')
      .eq('tutor_id', tutor.id)
      .maybeSingle()
    balance = wallet?.balance || 0
  }

  return (
    <TutorWalletClient
      initialBalance={balance}
      tutorId={tutor?.id || ''}
      tutorName={session.user.email?.split('@')[0] || 'Tutor'}
    />
  )
}