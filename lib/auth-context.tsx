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

// Helper function untuk fetch profile user
async function fetchUserProfile(currentUser: User): Promise<{ role: AppRole | null; name: string | null }> {
  // Cek admin email
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
      throw error
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
    
    // Profile tidak ada
    return { role: null, name: currentUser.user_metadata?.full_name || currentUser.email || null }
    
  } catch (error) {
    console.error('[Auth] Profile fetch failed:', error)
    throw error
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
  
  // Ref untuk prevent infinite loop di onAuthStateChange
  const isProcessingAuthChange = useRef(false)

  // Fungsi untuk clear semua storage
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

  // Fungsi untuk set user sebagai "tamu" (belum login)
  const setAsGuest = useCallback(() => {
    setUser(null)
    setSession(null)
    setUserRole(null)
    setUserName(null)
    setIsFirstTimeUser(false)
    setLoading(false)
  }, [])

  useEffect(() => {
    let isMounted = true
    let initTimeout: NodeJS.Timeout | null = null

    const initializeAuth = async () => {
      console.log('[Auth] 🛡️ Satpam mulai cek ke database gedung (Supabase)...')
      
      // Cek environment variables
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        console.error('[Auth] Missing Supabase environment variables!')
        setInitError('Missing Supabase configuration')
        if (isMounted) setLoading(false)
        return
      }

      try {
        const supabase = createClient()
        console.log('[Auth] 📞 Tanya ke Supabase: "Apakah orang ini masih terdaftar?"')
        
        // ✅ LANGKAH 1: Validasi ke SERVER dengan getUser() (bukan dari cache)
        const { data: { user: serverUser }, error: userError } = await supabase.auth.getUser()
        
        if (!isMounted) return
        
        // ✅ LANGKAH 2: Jika user tidak valid/deleted → Clear & anggap tamu
        if (userError || !serverUser) {
          console.log('[Auth] 🚫 Supabase bilang: User tidak terdaftar/invalid')
          console.log('[Auth] 🧹 Clear session & cookies...')
          
          // Clear cookies via signOut
          await supabase.auth.signOut({ scope: 'global' })
          clearSupabaseStorage()
          
          if (isMounted) {
            setAsGuest()
            console.log('[Auth] ✅ Selesai. User dianggap tamu (belum login)')
          }
          return
        }
        
        console.log('[Auth] ✅ Supabase konfirmasi: User terdaftar →', serverUser.email)
        
        // ✅ LANGKAH 3: Get session untuk access token
        const { data: { session: currentSession } } = await supabase.auth.getSession()
        
        if (isMounted) {
          setSession(currentSession)
          setUser(serverUser)
        }

        // ✅ LANGKAH 4: Setup timeout untuk prevent infinite loading
        initTimeout = setTimeout(() => {
          if (isMounted && loading) {
            console.warn('[Auth] ⏱️ Profile fetch timeout (>3s), marking as first-time user...')
            setIsFirstTimeUser(true)
            setLoading(false)
          }
        }, 3000) // Kurangi jadi 3 detik
        
        // ✅ LANGKAH 5: Cek apakah user sudah punya role di database
        try {
          const { role, name } = await fetchUserProfile(serverUser)
          
          if (!isMounted) return
          
          // Clear timeout
          if (initTimeout) {
            clearTimeout(initTimeout)
            initTimeout = null
          }
          
          // ✅ LANGKAH 6: Tentukan status user
          if (!role && !serverUser.email?.includes(ADMIN_EMAIL)) {
            // User baru, belum pilih role
            console.log('[Auth] 🆕 User baru, belum pilih role → First time user')
            setIsFirstTimeUser(true)
            setUserRole(null)
            setUserName(name)
          } else {
            // User existing, sudah punya role
            console.log('[Auth] ✅ User existing, role:', role)
            setIsFirstTimeUser(false)
            setUserRole(role)
            setUserName(name)
          }
          
          if (isMounted) {
            setLoading(false)
            console.log('[Auth] 🏁 Selesai cek auth')
          }
          
        } catch (profileError) {
          console.error('[Auth] ⚠️ Profile fetch error:', profileError)
          
          if (!isMounted) return
          
          // Clear timeout
          if (initTimeout) {
            clearTimeout(initTimeout)
            initTimeout = null
          }
          
          // Jika fetch profile gagal, anggap first-time user
          console.log('[Auth] ⚠️ Profile fetch failed, treating as first-time user')
          setIsFirstTimeUser(true)
          setUserName(serverUser.user_metadata?.full_name || serverUser.email || null)
          
          if (isMounted) {
            setLoading(false)
          }
        }
        
      } catch (error) {
        console.error('[Auth] ❌ Initialization error:', error)
        setInitError(error instanceof Error ? error.message : 'Unknown error')
        
        // Clear session on error
        try {
          const supabase = createClient()
          await supabase.auth.signOut({ scope: 'global' })
          clearSupabaseStorage()
        } catch (e) {
          console.error('[Auth] Failed to clear session:', e)
        }
        
        if (isMounted) {
          setAsGuest()
        }
      } finally {
        // Clear timeout jika ada
        if (initTimeout) {
          clearTimeout(initTimeout)
          initTimeout = null
        }
      }
    }

    initializeAuth()

    // ✅ Listen untuk perubahan auth state (login/logout)
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('[Auth] 📡 Auth state changed:', event)
        
        // Prevent infinite loop
        if (isProcessingAuthChange.current) {
          console.log('[Auth] ⏸️ Already processing auth change, skip')
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
          
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
            console.log('[Auth] 🔄 Re-validating user with server...')
            
            // Re-validate ke server
            const { data: { user: validatedUser }, error: validateError } = await supabase.auth.getUser()
            
            if (!isMounted) return
            
            if (validateError || !validatedUser) {
              console.log('[Auth] 🚫 User invalid after auth change, clearing...')
              await supabase.auth.signOut({ scope: 'global' })
              clearSupabaseStorage()
              setAsGuest()
              return
            }
            
            // User valid, update state
            setSession(currentSession)
            setUser(validatedUser)
            
            // Fetch profile
            try {
              const { role, name } = await fetchUserProfile(validatedUser)
              
              if (!role && !validatedUser.email?.includes(ADMIN_EMAIL)) {
                setIsFirstTimeUser(true)
                setUserRole(null)
                setUserName(name || validatedUser.email || null)
              } else {
                setIsFirstTimeUser(false)
                setUserRole(role)
                setUserName(name || validatedUser.email || null)
              }
            } catch (profileError) {
              console.error('[Auth] Profile fetch error in auth change:', profileError)
              setIsFirstTimeUser(true)
              setUserRole(null)
              setUserName(validatedUser.user_metadata?.full_name || validatedUser.email || null)
            }
            
            setLoading(false)
          }
        } finally {
          isProcessingAuthChange.current = false
        }
      }
    )

    return () => {
      console.log('[Auth] 🧹 Cleanup auth context')
      isMounted = false
      if (initTimeout) {
        clearTimeout(initTimeout)
      }
      subscription.unsubscribe()
    }
  }, [clearSupabaseStorage, setAsGuest])

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
    
    // Clear storage sebelum login baru
    clearSupabaseStorage()
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { 
        redirectTo: `${window.location.origin}/auth/select-role`,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account', // Paksa pilih akun
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
    console.log('[Auth] 🚨 FORCE SIGN OUT INITIATED...')
    
    try {
      const supabase = createClient()
      
      // Sign out dari Supabase dengan scope global
      await supabase.auth.signOut({ scope: 'global' })
      console.log('[Auth] ✅ Supabase signOut completed')
      
      // Clear semua storage
      clearSupabaseStorage()
      
      // Clear semua state
      setUser(null)
      setSession(null)
      setUserRole(null)
      setUserName(null)
      setIsFirstTimeUser(false)
      setLoading(false)
      
      console.log('[Auth] ✅ All state cleared')
      
      // Clear browser cache
      if (typeof window !== 'undefined') {
        if ('caches' in window) {
          try {
            const names = await caches.keys()
            await Promise.all(names.map(name => caches.delete(name)))
            console.log('[Auth] ✅ Browser cache cleared')
          } catch (e) {
            console.error('[Auth] Failed to clear browser cache:', e)
          }
        }
        
        // Force reload
        setTimeout(() => {
          window.location.href = '/?cleared=' + Date.now()
        }, 100)
      }
      
    } catch (error) {
      console.error('[Auth] Force sign out error:', error)
      
      // Fallback: clear everything anyway
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

  // Error UI
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