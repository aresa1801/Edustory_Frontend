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
  } catch (error) {
    console.warn('[Auth] Profile fetch failed:', error)
  }

  // Fallback ke metadata
  const metaRole = currentUser.user_metadata?.role as string | undefined
  const roleMap: Record<string, AppRole> = {
    siswa: 'student',
    student: 'student',
    tutor: 'tutor',
    admin: 'admin',
  }
  
  return {
    role: roleMap[metaRole ?? ''] ?? null,
    name: currentUser.user_metadata?.full_name || currentUser.email || null,
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

  // Function to clear ALL storage - lebih agresif
  const clearSupabaseStorage = useCallback(() => {
    if (typeof window !== 'undefined') {
      const keysToRemove: string[] = []
      
      // Collect all keys to remove
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key) {
          // Hapus semua key yang berhubungan dengan auth/supabase
          if (
            key.startsWith('sb-') || 
            key.includes('supabase') || 
            key.includes('auth') ||
            key.includes('session') ||
            key.includes('user')
          ) {
            keysToRemove.push(key)
          }
        }
      }
      
      // Remove all collected keys
      keysToRemove.forEach(key => {
        try {
          localStorage.removeItem(key)
          console.log('[Auth] Removed key:', key)
        } catch (e) {
          console.error('[Auth] Failed to remove key:', key, e)
        }
      })
      
      // Clear sessionStorage juga
      try {
        sessionStorage.clear()
        console.log('[Auth] SessionStorage cleared')
      } catch (e) {
        console.error('[Auth] Failed to clear sessionStorage:', e)
      }
      
      console.log('[Auth] Total keys removed:', keysToRemove.length)
    }
  }, [])

  useEffect(() => {
    let isMounted = true
    let initTimeout: NodeJS.Timeout

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
        console.log('[Auth] Getting session...')
        
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession()
        
        if (!isMounted) return
        
        if (sessionError) {
          console.error('[Auth] Session error:', sessionError)
          // Force clear even on error
          await supabase.auth.signOut({ scope: 'global' })
          clearSupabaseStorage()
          setInitError(sessionError.message)
          if (isMounted) setLoading(false)
          return
        }
        
        console.log('[Auth] Session retrieved:', currentSession?.user?.email || 'No user')
        setSession(currentSession)
        setUser(currentSession?.user ?? null)

        if (currentSession?.user) {
          console.log('[Auth] Validating user profile...')
          
          // Set timeout untuk prevent infinite loading
          initTimeout = setTimeout(async () => {
            if (isMounted && loading) {
              console.warn('[Auth] Profile fetch timeout, forcing sign out...')
              await supabase.auth.signOut({ scope: 'global' })
              clearSupabaseStorage()
              if (isMounted) {
                setUser(null)
                setSession(null)
                setUserRole(null)
                setUserName(null)
                setIsFirstTimeUser(false)
                setLoading(false)
              }
            }
          }, 5000) // 5 detik timeout
          
          try {
            const { role, name } = await fetchUserProfile(currentSession.user)
            
            if (!isMounted) return
            
            // Validasi: jika user tidak punya role dan bukan admin
            if (!role && !currentSession.user.email?.includes(ADMIN_EMAIL)) {
              console.warn('[Auth] User has no valid profile - FIRST TIME USER')
              // Ini user baru, tandai sebagai first time user
              if (isMounted) {
                setIsFirstTimeUser(true)
                setUserRole(null)
                setUserName(name)
              }
            } else {
              if (isMounted) {
                setIsFirstTimeUser(false)
                setUserRole(role)
                setUserName(name)
                console.log('[Auth] User validated:', { email: currentSession.user.email, role })
              }
            }
          } catch (profileError) {
            console.error('[Auth] Profile validation error:', profileError)
            if (isMounted) {
              await supabase.auth.signOut({ scope: 'global' })
              clearSupabaseStorage()
              setUser(null)
              setSession(null)
            }
          } finally {
            if (initTimeout) clearTimeout(initTimeout)
          }
        } else {
          // No session
          if (isMounted) {
            setIsFirstTimeUser(false)
          }
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
          setUser(currentSession?.user ?? null)

          if (currentSession?.user) {
            try {
              const { role, name } = await fetchUserProfile(currentSession.user)
              
              if (!role && !currentSession.user.email?.includes(ADMIN_EMAIL)) {
                console.log('[Auth] First time user detected')
                setIsFirstTimeUser(true)
                setUserRole(null)
                setUserName(name)
              } else {
                setIsFirstTimeUser(false)
                setUserRole(role)
                setUserName(name)
              }
            } catch (error) {
              console.error('[Auth] Profile update error:', error)
              await supabase.auth.signOut({ scope: 'global' })
              clearSupabaseStorage()
              setUserRole(null)
              setUserName(null)
              setIsFirstTimeUser(false)
            }
          } else {
            setUserRole(null)
            setUserName(null)
            setIsFirstTimeUser(false)
          }
          
          setLoading(false)
        }
      }
    )

    return () => {
      console.log('[Auth] Cleaning up auth context')
      isMounted = false
      if (initTimeout) clearTimeout(initTimeout)
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
          prompt: 'select_account', // Show account picker
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

  // Force sign out - SUPER AGGRESSIVE
  const forceSignOut = async () => {
    console.log('[Auth] FORCE SIGN OUT INITIATED...')
    
    try {
      const supabase = createClient()
      
      // 1. Sign out dari Supabase dengan scope global
      await supabase.auth.signOut({ scope: 'global' })
      console.log('[Auth] Supabase signOut completed')
      
      // 2. Clear semua storage
      clearSupabaseStorage()
      
      // 3. Clear semua state IMMEDIATELY
      setUser(null)
      setSession(null)
      setUserRole(null)
      setUserName(null)
      setIsFirstTimeUser(false)
      setLoading(false)
      
      console.log('[Auth] All state cleared')
      
      // 4. FORCE HARD RELOAD - bukan cuma redirect
      if (typeof window !== 'undefined') {
        // Clear cache browser
        if ('caches' in window) {
          await caches.keys().then(names => {
            names.forEach(name => caches.delete(name))
          })
        }
        
        // Force reload dengan timestamp untuk bypass cache
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
      
      // Force reload
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