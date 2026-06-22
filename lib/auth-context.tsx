'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
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
      throw error // Throw agar bisa ditangani di caller
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
    throw error // Re-throw
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

  useEffect(() => {
    let isMounted = true
    let initTimeout: NodeJS.Timeout | null = null

    const initializeAuth = async () => {
      console.log('[Auth] Initializing auth context...')
      
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        console.error('[Auth] Missing Supabase environment variables!')
        setInitError('Missing Supabase configuration')
        if (isMounted) setLoading(false)
        return
      }

      try {
        const supabase = createClient()
        console.log('[Auth] Validating session with server...')
        
        // ✅ PAKAI getUser() BUKAN getSession() - validasi ke server
        const { data: { user: serverUser }, error: userError } = await supabase.auth.getUser()
        
        if (!isMounted) return
        
        if (userError || !serverUser) {
          console.log('[Auth] User not valid or deleted:', userError?.message)
          // User tidak valid atau sudah dihapus - clear session
          await supabase.auth.signOut({ scope: 'global' })
          clearSupabaseStorage()
          if (isMounted) {
            setUser(null)
            setSession(null)
            setLoading(false)
          }
          return
        }
        
        console.log('[Auth] User validated:', serverUser.email)
        
        // Get session untuk access token
        const { data: { session: currentSession } } = await supabase.auth.getSession()
        setSession(currentSession)
        setUser(serverUser)

        // Setup timeout untuk fetch profile
        let profileFetchTimeout = false
        initTimeout = setTimeout(() => {
          if (isMounted && loading) {
            console.warn('[Auth] Profile fetch timeout (>5s), marking as first-time user...')
            profileFetchTimeout = true
            setIsFirstTimeUser(true)
            setLoading(false)
          }
        }, 5000)
        
        try {
          const { role, name } = await fetchUserProfile(serverUser)
          
          if (!isMounted) return
          
          // Clear timeout jika berhasil
          if (initTimeout) {
            clearTimeout(initTimeout)
            initTimeout = null
          }
          
          // Validasi: jika user tidak punya role dan bukan admin
          if (!role && !serverUser.email?.includes(ADMIN_EMAIL)) {
            console.log('[Auth] First time user detected (no role)')
            setIsFirstTimeUser(true)
            setUserRole(null)
            setUserName(name)
          } else {
            setIsFirstTimeUser(false)
            setUserRole(role)
            setUserName(name)
            console.log('[Auth] User validated with role:', { email: serverUser.email, role })
          }
          
        } catch (profileError) {
          console.error('[Auth] Profile fetch error:', profileError)
          
          if (!isMounted) return
          
          // Clear timeout
          if (initTimeout) {
            clearTimeout(initTimeout)
            initTimeout = null
          }
          
          // Jika fetch profile gagal (mungkin user baru atau network error)
          // Tandai sebagai first time user
          console.log('[Auth] Profile fetch failed, treating as first-time user')
          setIsFirstTimeUser(true)
          setUserName(serverUser.user_metadata?.full_name || serverUser.email || null)
        }
        
      } catch (error) {
        console.error('[Auth] Initialization error:', error)
        setInitError(error instanceof Error ? error.message : 'Unknown error')
        
        try {
          const supabase = createClient()
          await supabase.auth.signOut({ scope: 'global' })
          clearSupabaseStorage()
        } catch (e) {
          console.error('[Auth] Failed to clear session:', e)
        }
      } finally {
        // Clear timeout jika ada
        if (initTimeout) {
          clearTimeout(initTimeout)
          initTimeout = null
        }
        
        if (isMounted) {
          console.log('[Auth] Initialization complete')
          setLoading(false)
        }
      }
    }

    initializeAuth()

    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('[Auth] Auth state changed:', event, currentSession?.user?.email)
        
        if (isMounted) {
          setSession(currentSession)
          
          if (event === 'SIGNED_OUT') {
            setUser(null)
            setUserRole(null)
            setUserName(null)
            setIsFirstTimeUser(false)
            setLoading(false)
            return
          }
          
          // Untuk event lain, validasi dengan getUser()
          if (currentSession?.user) {
            try {
              const { data: { user: validatedUser } } = await supabase.auth.getUser()
              
              if (!validatedUser) {
                // User tidak valid
                await supabase.auth.signOut({ scope: 'global' })
                clearSupabaseStorage()
                setUser(null)
                setSession(null)
                setUserRole(null)
                setUserName(null)
                setIsFirstTimeUser(false)
                setLoading(false)
                return
              }
              
              setUser(validatedUser)
              
              const { role, name } = await fetchUserProfile(validatedUser).catch(() => ({ role: null, name: null }))
              
              if (!role && !validatedUser.email?.includes(ADMIN_EMAIL)) {
                setIsFirstTimeUser(true)
                setUserRole(null)
                setUserName(name || validatedUser.email || null)
              } else {
                setIsFirstTimeUser(false)
                setUserRole(role)
                setUserName(name || validatedUser.email || null)
              }
              
              setLoading(false)
              
            } catch (error) {
              console.error('[Auth] Auth state change error:', error)
              setUserRole(null)
              setUserName(null)
              setIsFirstTimeUser(false)
              setLoading(false)
            }
          } else {
            setUser(null)
            setUserRole(null)
            setUserName(null)
            setIsFirstTimeUser(false)
            setLoading(false)
          }
        }
      }
    )

    return () => {
      console.log('[Auth] Cleaning up auth context')
      isMounted = false
      if (initTimeout) {
        clearTimeout(initTimeout)
      }
      subscription.unsubscribe()
    }
  }, [clearSupabaseStorage])

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
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { 
        redirectTo: `${window.location.origin}/auth/select-role`,
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
    console.log('[Auth] FORCE SIGN OUT INITIATED...')
    
    try {
      const supabase = createClient()
      
      // Sign out dari Supabase dengan scope global
      await supabase.auth.signOut({ scope: 'global' })
      console.log('[Auth] Supabase signOut completed')
      
      // Clear semua storage
      clearSupabaseStorage()
      
      // Clear semua state IMMEDIATELY
      setUser(null)
      setSession(null)
      setUserRole(null)
      setUserName(null)
      setIsFirstTimeUser(false)
      setLoading(false)
      
      console.log('[Auth] All state cleared')
      
      // FORCE HARD RELOAD
      if (typeof window !== 'undefined') {
        if ('caches' in window) {
          await caches.keys().then(names => {
            names.forEach(name => caches.delete(name))
          })
        }
        
        setTimeout(() => {
          window.location.href = '/?cleared=' + Date.now()
        }, 100)
      }
      
    } catch (error) {
      console.error('[Auth] Force sign out error:', error)
      
      // Bahkan jika error, tetap clear semuanya
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