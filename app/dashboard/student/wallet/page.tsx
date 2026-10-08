import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import StudentWalletClient from './WalletClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function StudentWalletPage() {
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

  // Ambil data siswa
  const { data: student } = await supabase
    .from('students')
    .select('id')
    .eq('user_id', session.user.id)
    .maybeSingle()

  let balance = 0
  if (student) {
    const { data: wallet } = await supabase
      .from('wallets')
      .select('balance')
      .eq('student_id', student.id)
      .maybeSingle()
    balance = wallet?.balance || 0
  }

  return (
    <StudentWalletClient
      initialBalance={balance}
      studentId={student?.id || ''}
      studentName={session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Siswa'}
      initialToken={session.access_token}
    />
  )
}
