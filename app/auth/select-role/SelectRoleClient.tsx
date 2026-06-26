'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { GraduationCap, UserCog, Loader2, AlertCircle } from 'lucide-react'

interface SelectRoleClientProps {
  userEmail: string
  userId: string
  userName: string
}

export default function SelectRoleClient({ userEmail, userId, userName }: SelectRoleClientProps) {
  const [isLoading, setIsLoading] = useState<'student' | 'tutor' | null>(null)
  const [error, setError] = useState('')
  const [actualUserId, setActualUserId] = useState<string | null>(userId || null)

  // Fallback: ambil userId dari session jika props undefined
  useEffect(() => {
    if (!actualUserId) {
      console.warn('[SelectRole] ⚠️ userId from props is undefined, fetching from client...')
      const fetchUserId = async () => {
        try {
          const supabase = createClient()
          const { data: { user } } = await supabase.auth.getUser()
          if (user?.id) {
            console.log('[SelectRole] ✅ Client: User ID found:', user.id)
            setActualUserId(user.id)
          } else {
            console.error('[SelectRole] ❌ Client: No user found')
            setError('Sesi tidak valid. Silakan login ulang.')
          }
        } catch (err) {
          console.error('[SelectRole] ❌ Client: Error fetching user:', err)
          setError('Gagal memuat data user. Silakan refresh halaman.')
        }
      }
      fetchUserId()
    }
  }, [actualUserId])

  const handleSelectRole = async (role: 'student' | 'tutor') => {
    // 🚫 TUTOR DI-NONAKTIFKAN SEMENTARA
    if (role === 'tutor') {
      setError('🚧 Fitur tutor sedang dalam pengembangan. Silakan pilih "Siap belajar!" untuk menjadi student.')
      return
    }

    setIsLoading(role)
    setError('')

    // 🔍 STEP 1: Pastikan userId ada
    const finalUserId = actualUserId || userId
    console.log('[SelectRole] STEP 1 - finalUserId:', finalUserId)

    if (!finalUserId) {
      setError('ID user tidak ditemukan. Silakan refresh halaman atau login ulang.')
      setIsLoading(null)
      return
    }

    console.log('[SelectRole] 📝 Memilih role:', role, 'User ID:', finalUserId)

    try {
      // 🔍 STEP 2: Inisialisasi Supabase
      console.log('[SelectRole] STEP 2 - Creating Supabase client...')
      const supabase = createClient()

      // 🔍 STEP 3: Verifikasi user dari session (priority: getUser)
      console.log('[SelectRole] STEP 3 - Verifying user from session (getUser)...')
      
      let currentUser = null
      let userError = null

      // Coba getUser() dulu
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error) {
          console.warn('[SelectRole] getUser() error:', error)
          userError = error
        } else if (user) {
          currentUser = user
          console.log('[SelectRole] ✅ getUser() success:', user.email)
        }
      } catch (err) {
        console.warn('[SelectRole] getUser() exception:', err)
        userError = err
      }

      // Jika getUser gagal, coba getSession()
      if (!currentUser) {
        console.log('[SelectRole] getUser() failed, trying getSession()...')
        try {
          const { data: { session }, error: sessionError } = await supabase.auth.getSession()
          if (sessionError) {
            console.warn('[SelectRole] getSession() error:', sessionError)
            userError = sessionError
          } else if (session?.user) {
            currentUser = session.user
            console.log('[SelectRole] ✅ getSession() success:', currentUser.email)
          }
        } catch (err) {
          console.warn('[SelectRole] getSession() exception:', err)
          userError = err
        }
      }

      // Jika masih tidak ada user, throw error
      if (!currentUser) {
        console.error('[SelectRole] ❌ No user found after both attempts')
        throw new Error('Sesi tidak valid. Silakan login ulang.')
      }

      console.log('[SelectRole] ✅ User terverifikasi:', currentUser.email, 'ID:', currentUser.id)

      // Gunakan ID dari session
      const safeUserId = currentUser.id
      if (safeUserId !== finalUserId) {
        console.warn('[SelectRole] ⚠️ ID mismatch, using session ID:', safeUserId)
      }

      const dbRole = 'siswa'

      // 🔍 STEP 4: Cek profile existing
      console.log('[SelectRole] STEP 4 - Checking existing profile for:', safeUserId)
      const { data: existingProfile, error: checkError } = await supabase
        .from('user_profiles')
        .select('id, role')
        .eq('id', safeUserId)
        .maybeSingle()

      if (checkError) {
        console.error('[SelectRole] ❌ Check profile error:', checkError)
        throw new Error(`Gagal cek profile: ${checkError.message}`)
      }

      console.log('[SelectRole] Existing profile:', existingProfile)

      // 🔍 STEP 5: Insert atau Update
      let insertResult
      if (existingProfile) {
        console.log('[SelectRole] STEP 5a - Updating existing profile...')
        insertResult = await supabase
          .from('user_profiles')
          .update({ 
            role: dbRole,
            updated_at: new Date().toISOString(),
          })
          .eq('id', safeUserId)
      } else {
        console.log('[SelectRole] STEP 5b - Inserting new profile...')
        insertResult = await supabase
          .from('user_profiles')
          .insert({
            id: safeUserId,
            role: dbRole,
            name: userName || userEmail,
            email: userEmail,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
      }

      if (insertResult.error) {
        console.error('[SelectRole] ❌ Supabase error DETAIL:', {
          code: insertResult.error.code,
          message: insertResult.error.message,
          details: insertResult.error.details,
          hint: insertResult.error.hint,
        })
        throw new Error(`Supabase error: ${insertResult.error.message} (${insertResult.error.code})`)
      }

      console.log('[SelectRole] ✅ user_profiles berhasil disimpan!')

      // 🔍 STEP 6: Buat entri di students
      console.log('[SelectRole] STEP 6 - Creating student entry...')
      const { data: existingStudent } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', safeUserId)
        .maybeSingle()

      if (!existingStudent) {
        const { error: studentError } = await supabase
          .from('students')
          .insert({
            user_id: safeUserId,
            status: 'active',
            onboarding_complete: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })

        if (studentError) {
          console.error('[SelectRole] ❌ Student insert error:', studentError)
          throw new Error(`Gagal membuat profil student: ${studentError.message}`)
        }
        console.log('[SelectRole] ✅ Entri students berhasil dibuat')
      } else {
        console.log('[SelectRole] ℹ️ Entri students sudah ada')
      }

      // 🔍 STEP 7: Update metadata
      console.log('[SelectRole] STEP 7 - Updating user metadata...')
      await supabase.auth.updateUser({
        data: { role: dbRole },
      })

      console.log('[SelectRole] ✅ Semua proses selesai! Redirecting...')

      // 🔍 STEP 8: Redirect
      window.location.href = '/dashboard/student'
      
    } catch (err) {
      console.error('[SelectRole] ❌ Error:', err)
      setError(err instanceof Error ? err.message : 'Gagal menyimpan role. Silakan coba lagi.')
      setIsLoading(null)
    }
  }

  // ============================================================
  // UI (tidak berubah)
  // ============================================================
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950 p-4">
      <div className="max-w-5xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent mb-3">
            Pilih Peran Anda
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Tentukan bagaimana Anda ingin menggunakan EduStory. Pilihan ini dapat diubah kapan saja melalui pengaturan akun.
          </p>
          {userEmail && (
            <p className="text-sm text-muted-foreground mt-3">
              Masuk sebagai <span className="font-medium text-foreground">{userEmail}</span>
            </p>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/50 rounded-lg text-destructive text-center flex items-center justify-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {/* Student Card */}
          <Card 
            className={`relative overflow-hidden border-2 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] cursor-pointer
              ${isLoading === 'student' ? 'opacity-70 pointer-events-none' : 'hover:border-primary/50'}
            `}
            onClick={() => !isLoading && handleSelectRole('student')}
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-cyan-400" />
            <CardHeader className="text-center pt-8">
              <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-4">
                <GraduationCap className="w-10 h-10 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="text-2xl font-bold">Saya Student</CardTitle>
              <CardDescription className="text-base">
                Saya ingin belajar dan menemukan tutor yang tepat
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center pb-8">
              <ul className="text-sm text-muted-foreground space-y-2 mb-6 text-left max-w-xs mx-auto">
                <li>✓ Temukan tutor profesional di berbagai bidang</li>
                <li>✓ Belajar dengan metode yang personal dan efektif</li>
                <li>✓ Raih prestasi akademik bersama mentor terbaik</li>
              </ul>
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                disabled={isLoading === 'student'}
                onClick={(e) => {
                  e.stopPropagation()
                  handleSelectRole('student')
                }}
              >
                {isLoading === 'student' ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Menyimpan...</>
                ) : (
                  'Siap belajar!'
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Tutor Card (Dinonaktifkan) */}
          <Card 
            className="relative overflow-hidden border-2 opacity-60 cursor-not-allowed"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gray-400 to-gray-300" />
            <CardHeader className="text-center pt-8">
              <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
                <UserCog className="w-10 h-10 text-gray-500 dark:text-gray-400" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-500">Saya Tutor</CardTitle>
              <CardDescription className="text-base text-gray-400">
                🚧 Segera hadir! Fitur tutor sedang dalam pengembangan
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center pb-8">
              <ul className="text-sm text-gray-400 space-y-2 mb-6 text-left max-w-xs mx-auto">
                <li>✓ Temukan siswa yang cocok dengan keahlian Anda</li>
                <li>✓ Atur jadwal dan pilih student sendiri</li>
                <li>✓ Dapatkan penghasilan tambahan</li>
              </ul>
              <Button 
                className="w-full bg-gray-400 hover:bg-gray-400 text-white cursor-not-allowed"
                disabled={true}
              >
                Segera hadir
              </Button>
            </CardContent>
          </Card>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">
          Pilihan ini dapat diubah kapan saja di pengaturan akun Anda.
        </p>
      </div>
    </div>
  )
}