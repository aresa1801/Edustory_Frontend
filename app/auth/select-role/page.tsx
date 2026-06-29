import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import SelectRoleClient from './SelectRoleClient'

export default async function SelectRolePage() {
  const cookieStore = cookies()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set() {},
        remove() {},
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    console.log('[SelectRole] ❌ No user found, redirect to home')
    redirect('/?no_session=1')
  }

  console.log('[SelectRole] ✅ Server: User found:', user.email, 'ID:', user.id)

  // Cek apakah user sudah punya role
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role) {
    const dashboardPath = profile.role === 'siswa' || profile.role === 'student'
      ? '/dashboard/student'
      : profile.role === 'tutor'
      ? '/dashboard/tutor'
      : '/dashboard/admin'
    console.log('[SelectRole] ✅ User already has role, redirect to:', dashboardPath)
    redirect(dashboardPath)
  }

  // Render client component dengan data user
  return (
    <SelectRoleClient 
      userEmail={user.email!} 
      userId={user.id} 
      userName={user.user_metadata?.full_name || user.email!} 
    />
  )
}