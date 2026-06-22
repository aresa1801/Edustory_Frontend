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
  signUp: (email: string, password: string, role: 'student' | 'tutor') => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  forceSignOut: () => Promise<void>
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
  const [initError, setInitError] = useState<string | null>(null)

  // Function to clear all Supabase storage
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
          await supabase.auth.signOut()
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
              await supabase.auth.signOut()
              clearSupabaseStorage()
              if (isMounted) {
                setUser(null)
                setSession(null)
                setUserRole(null)
                setUserName(null)
                setLoading(false)
              }
            }
          }, 5000) // 5 detik timeout
          
          try {
            const { role, name } = await fetchUserProfile(currentSession.user)
            
            if (!isMounted) return
            
            // Validasi: jika user tidak punya role dan bukan admin
            if (!role && !currentSession.user.email?.includes(ADMIN_EMAIL)) {
              console.warn('[Auth] User has no valid profile, clearing session...')
              await supabase.auth.signOut()
              clearSupabaseStorage()
              if (isMounted) {
                setUser(null)
                setSession(null)
                setUserRole(null)
                setUserName(null)
              }
            } else {
              if (isMounted) {
                setUserRole(role)
                setUserName(name)
                console.log('[Auth] User validated:', { email: currentSession.user.email, role })
              }
            }
          } catch (profileError) {
            console.error('[Auth] Profile validation error:', profileError)
            if (isMounted) {
              await supabase.auth.signOut()
              clearSupabaseStorage()
              setUser(null)
              setSession(null)
            }
          } finally {
            if (initTimeout) clearTimeout(initTimeout)
          }
        }
        
      } catch (error) {
        console.error('[Auth] Initialization error:', error)
        setInitError(error instanceof Error ? error.message : 'Unknown error')
        
        try {
          const supabase = createClient()
          await supabase.auth.signOut()
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
                console.warn('[Auth] Invalid profile detected, signing out...')
                await supabase.auth.signOut()
                clearSupabaseStorage()
                setUserRole(null)
                setUserName(null)
              } else {
                setUserRole(role)
                setUserName(name)
              }
            } catch (error) {
              console.error('[Auth] Profile update error:', error)
              await supabase.auth.signOut()
              clearSupabaseStorage()
              setUserRole(null)
              setUserName(null)
            }
          } else {
            setUserRole(null)
            setUserName(null)
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
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })
    if (error) throw error
  }

  const signOut = async () => {
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  // Force sign out - clear everything
  const forceSignOut = async () => {
    console.log('[Auth] Force sign out initiated...')
    try {
      const supabase = createClient()
      
      // Sign out from Supabase
      await supabase.auth.signOut({ scope: 'global' })
      
      // Clear local storage
      clearSupabaseStorage()
      
      // Clear state
      setUser(null)
      setSession(null)
      setUserRole(null)
      setUserName(null)
      setLoading(false)
      
      console.log('[Auth] Force sign out completed')
      
      // Force reload to ensure clean state
      if (typeof window !== 'undefined') {
        window.location.href = '/'
      }
    } catch (error) {
      console.error('[Auth] Force sign out error:', error)
      // Even if error, clear everything
      clearSupabaseStorage()
      setUser(null)
      setSession(null)
      setUserRole(null)
      setUserName(null)
      setLoading(false)
      
      if (typeof window !== 'undefined') {
        window.location.href = '/'
      }
    }
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
      signUp, 
      signIn, 
      signInWithGoogle, 
      signOut,
      forceSignOut,
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