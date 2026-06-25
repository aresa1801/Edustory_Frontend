'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/auth'

const ADMIN_EMAIL = 'admin@edustory.com'

type AppRole = 'student' | 'tutor' | 'admin' | null

interface AuthContextType {
  user: User | null
  session: Session | null
  userRole: AppRole
  userName: string | null
  loading: boolean
  isFirstTimeUser: boolean
  signUp: (email: string, password: string, role: 'student' | 'tutor') => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  forceSignOut: () => Promise<void>
  clearFirstTimeUserFlag: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// ============================================================
// FETCH USER PROFILE (tidak throw error, return null role)
// ============================================================
async function fetchUserProfile(currentUser: User): Promise<{ role: AppRole | null; name: string | null }> {
  if (currentUser.email === ADMIN_EMAIL) {
    return {
      role: 'admin',
      name: currentUser.user_metadata?.full_name || 'Administrator',
    }
  }

  try {
    const supabase = createClient()
    console.log('[Auth] Fetching user profile for:', currentUser.id)
    
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('role, name')
      .eq('id', currentUser.id)
      .maybeSingle()

    if (error) {
      console.error('[Auth] Profile fetch error:', error)
      return { role: null, name: currentUser.user_metadata?.full_name || currentUser.email || null }
    }

    if (profile) {
      console.log('[Auth] Profile found:', profile)
      const roleMap: Record<string, AppRole> = {
        siswa: 'student',
        student: 'student',
        tutor: 'tutor',
        admin: 'admin',
      }
      return {
        role: roleMap[profile.role as string] ?? null,
        name: profile.name || currentUser.email || null,
      }
    }
    
    // Profile tidak ada → user baru
    return { role: null, name: currentUser.user_metadata?.full_name || currentUser.email || null }
    
  } catch (error) {
    console.error('[Auth] Profile fetch failed:', error)
    return { role: null, name: currentUser.user_metadata?.full_name || currentUser.email || null }
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<AppRole>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)
  
  const isProcessingAuthChange = useRef(false)
  const profileTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const sessionCheckIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // ============================================================
  // CLEAR STORAGE & SET GUEST
  // ============================================================
  const clearSupabaseStorage = useCallback(() => {
    if (typeof window !== 'undefined') {
      const keysToRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth'))) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key))
      console.log('[Auth] Cleared storage keys:', keysToRemove)
    }
  }, [])

  const setAsGuest = useCallback(() => {
    clearSupabaseStorage()
    setUser(null)
    setSession(null)
    setUserRole(null)
    setUserName(null)
    setIsFirstTimeUser(false)
    setLoading(false)
  }, [clearSupabaseStorage])

  // ============================================================
  // MAIN USEFFECT – INISIALISASI & SUBSCRIPTION
  // ============================================================
  useEffect(() => {
    let isMounted = true
    let initTimeout: NodeJS.Timeout | null = null

    // -----------------------------------------------------------------
    // INISIALISASI AWAL
    // -----------------------------------------------------------------
    const initializeAuth = async () => {
      console.log('[Auth] 🛡️ Validasi auth...')
      
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        setInitError('Missing Supabase configuration')
        if (isMounted) setLoading(false)
        return
      }

      try {
        const supabase = createClient()
        
        // Coba dapatkan user dari session (dengan retry)
        let serverUser = null
        let userError = null
        
        for (let attempt = 0; attempt < 5; attempt++) {
          const result = await supabase.auth.getUser()
          serverUser = result.data.user
          userError = result.error
          if (serverUser) break
          console.log(`[Auth] ⏳ Session belum ready, retry ${attempt + 1}/5...`)
          await new Promise(resolve => setTimeout(resolve, 500))
        }
        
        if (!isMounted) return
        
        // Jika gagal mendapatkan user → anggap guest
        if (userError || !serverUser) {
          console.log('[Auth] ❌ User tidak valid:', userError?.message)
          await supabase.auth.signOut({ scope: 'global' })
          clearSupabaseStorage()
          if (isMounted) setAsGuest()
          return
        }
        
        console.log('[Auth] ✅ User valid:', serverUser.email)
        
        const { data: { session: currentSession } } = await supabase.auth.getSession()
        if (isMounted) {
          setSession(currentSession)
          setUser(serverUser)
        }

        // Timeout 3 detik untuk keamanan
        initTimeout = setTimeout(() => {
          if (isMounted && loading) {
            console.warn('[Auth] ⏱️ Timeout, marking as first-time user...')
            setIsFirstTimeUser(true)
            setLoading(false)
          }
        }, 3000)
        
        // Ambil profile
        try {
          const { role, name } = await fetchUserProfile(serverUser)
          
          if (!isMounted) return
          if (initTimeout) { clearTimeout(initTimeout); initTimeout = null }
          
          if (!role && serverUser.email !== ADMIN_EMAIL) {
            console.log('[Auth] 🆕 First time user')
            setIsFirstTimeUser(true)
            setUserRole(null)
            setUserName(name)
          } else {
            console.log('[Auth] ✅ User has role:', role)
            setIsFirstTimeUser(false)
            setUserRole(role)
            setUserName(name)
          }
          if (isMounted) setLoading(false)
          
        } catch (profileError) {
          console.error('[Auth] ⚠️ Profile fetch error:', profileError)
          if (!isMounted) return
          if (initTimeout) { clearTimeout(initTimeout); initTimeout = null }
          setIsFirstTimeUser(true)
          setUserName(serverUser.user_metadata?.full_name || serverUser.email || null)
          if (isMounted) setLoading(false)
        }
        
      } catch (error) {
        console.error('[Auth] ❌ Initialization error:', error)
        setInitError(error instanceof Error ? error.message : 'Unknown error')
        try {
          const supabase = createClient()
          await supabase.auth.signOut({ scope: 'global' })
          clearSupabaseStorage()
        } catch (e) {}
        if (isMounted) setAsGuest()
      } finally {
        if (initTimeout) { clearTimeout(initTimeout); initTimeout = null }
      }
    }

    initializeAuth()

    // -----------------------------------------------------------------
    // SUBSCRIPTION AUTH STATE CHANGE
    // -----------------------------------------------------------------
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('[Auth] 📡 Event:', event, 'Path:', typeof window !== 'undefined' ? window.location.pathname : 'N/A')
        
        // Skip jika di halaman callback
        if (typeof window !== 'undefined' && window.location.pathname.includes('/auth/callback')) {
          console.log('[Auth] ⏭️ Skipping re-validation on callback page')
          return
        }
        
        if (isProcessingAuthChange.current) {
          console.log('[Auth] ⏸️ Already processing, skip')
          return
        }
        
        isProcessingAuthChange.current = true
        
        try {
          if (!isMounted) return
          
          if (event === 'SIGNED_OUT') {
            console.log('[Auth] 🚪 User signed out')
            setAsGuest()
            return
          }
          
          if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
            console.log('[Auth] 🔄 Re-validating...')
            await initializeAuth()
            return
          }
          
          if (event === 'SIGNED_IN' && currentSession) {
            console.log('[Auth] ✅ SIGNED_IN - Update state')
            
            if (!currentSession.user) {
              console.warn('[Auth] ⚠️ SIGNED_IN but user is null')
              setLoading(false)
              return
            }

            // ✅ Update state tanpa memaksa logout
            setSession(currentSession)
            setUser(currentSession.user)
            
            // Batalkan timeout sebelumnya
            if (profileTimeoutRef.current) {
              clearTimeout(profileTimeoutRef.current)
              profileTimeoutRef.current = null
            }

            // Timeout 5 detik untuk memaksa loading false jika fetch profile lama
            profileTimeoutRef.current = setTimeout(() => {
              console.warn('[Auth] ⏱️ Profile fetch timeout, forcing loading false')
              if (isMounted) {
                setLoading(false)
                setIsFirstTimeUser(true)
                setUserRole(null)
                setUserName(currentSession.user?.email || null)
              }
              profileTimeoutRef.current = null
            }, 5000)

            try {
              const { role, name } = await fetchUserProfile(currentSession.user)
              if (profileTimeoutRef.current) {
                clearTimeout(profileTimeoutRef.current)
                profileTimeoutRef.current = null
              }
              
              if (!role && currentSession.user.email !== ADMIN_EMAIL) {
                setIsFirstTimeUser(true)
                setUserRole(null)
                setUserName(name || currentSession.user.email || null)
              } else {
                setIsFirstTimeUser(false)
                setUserRole(role)
                setUserName(name || currentSession.user.email || null)
              }
            } catch (profileError) {
              if (profileTimeoutRef.current) {
                clearTimeout(profileTimeoutRef.current)
                profileTimeoutRef.current = null
              }
              console.error('[Auth] Profile fetch error:', profileError)
              setIsFirstTimeUser(true)
              setUserRole(null)
              setUserName(currentSession.user.user_metadata?.full_name || currentSession.user.email || null)
            } finally {
              if (isMounted) setLoading(false)
            }
          }
        } finally {
          isProcessingAuthChange.current = false
        }
      }
    )

    // -----------------------------------------------------------------
    // INTERVAL PERIODIK – HANYA CEK SESSION (bukan profile)
    // -----------------------------------------------------------------
    sessionCheckIntervalRef.current = setInterval(async () => {
      if (!isMounted) return
      const supabaseClient = createClient()
      const { data: { user: currentUser } } = await supabaseClient.auth.getUser()
      if (!currentUser) {
        if (user) {
          console.log('[Auth] ⏱️ Session expired, auto logout')
          setAsGuest()
        }
        return
      }
      // Tidak perlu cek profile di sini, biarkan callback dan inisialisasi yang menangani
    }, 30000)

    // -----------------------------------------------------------------
    // CLEANUP
    // -----------------------------------------------------------------
    return () => {
      isMounted = false
      if (initTimeout) clearTimeout(initTimeout)
      if (profileTimeoutRef.current) clearTimeout(profileTimeoutRef.current)
      if (sessionCheckIntervalRef.current) clearInterval(sessionCheckIntervalRef.current)
      subscription.unsubscribe()
    }
  }, [clearSupabaseStorage, setAsGuest])

  // ============================================================
  // AUTH FUNCTIONS (tidak diubah)
  // ============================================================
  const signUp = async (email: string, password: string, role: 'student' | 'tutor') => {
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role } },
    })
    if (error) throw error
  }

  const signIn = async (email: string, password: string) => {
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signInWithGoogle = async () => {
    const supabase = createClient()
    clearSupabaseStorage()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { 
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      },
    })
    if (error) throw error
  }

  const signOut = async () => {
    const supabase = createClient()
    const { error } = await supabase.auth.signOut({ scope: 'global' })
    if (error) throw error
  }

  const forceSignOut = async () => {
    console.log('[Auth] 🚨 Force sign out...')
    try {
      const supabase = createClient()
      await supabase.auth.signOut({ scope: 'global' })
      clearSupabaseStorage()
      setUser(null)
      setSession(null)
      setUserRole(null)
      setUserName(null)
      setIsFirstTimeUser(false)
      setLoading(false)
      if (typeof window !== 'undefined') {
        if ('caches' in window) {
          try {
            const names = await caches.keys()
            await Promise.all(names.map(name => caches.delete(name)))
          } catch (e) {}
        }
        setTimeout(() => window.location.href = '/?cleared=' + Date.now(), 100)
      }
    } catch (error) {
      console.error('[Auth] Force sign out error:', error)
      clearSupabaseStorage()
      setUser(null)
      setSession(null)
      setUserRole(null)
      setUserName(null)
      setIsFirstTimeUser(false)
      setLoading(false)
      if (typeof window !== 'undefined') {
        window.location.href = '/?error_cleared=' + Date.now()
      }
    }
  }

  const clearFirstTimeUserFlag = () => {
    setIsFirstTimeUser(false)
  }

  if (initError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-6">
          <h2 className="text-xl font-bold text-red-500 mb-2">Authentication Error</h2>
          <p className="text-muted-foreground mb-4">{initError}</p>
          <button
            onClick={() => {
              clearSupabaseStorage()
              window.location.reload()
            }}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
          >
            Clear Cache & Reload
          </button>
        </div>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      userRole, 
      userName, 
      loading, 
      isFirstTimeUser,
      signUp, 
      signIn, 
      signInWithGoogle, 
      signOut,
      forceSignOut,
      clearFirstTimeUserFlag,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}