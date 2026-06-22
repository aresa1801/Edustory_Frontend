'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
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
    
    // ✅ GANTI .single() dengan .maybeSingle() agar tidak error jika tidak ada data
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('role, name')
      .eq('id', currentUser.id)
      .maybeSingle()  // ← PERUBAHAN PENTING

    if (error) {
      console.error('[Auth] Profile fetch error:', error)
      // Jangan throw error, fallback ke metadata
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
    console.warn('[Auth] Profile fetch failed, using metadata:', error)
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

  useEffect(() => {
    let isMounted = true

    const initializeAuth = async () => {
      console.log('[Auth] Initializing auth context...')
      
      // Check env variables
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        console.error('[Auth] Missing Supabase environment variables!')
        setInitError('Missing Supabase configuration')
        if (isMounted) setLoading(false)
        return
      }

      try {
        console.log('[Auth] Getting session...')
        const supabase = createClient()
        
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (!isMounted) return
        
        if (sessionError) {
          console.error('[Auth] Session error:', sessionError)
          // Clear invalid session
          await supabase.auth.signOut()
          setInitError(sessionError.message)
          if (isMounted) setLoading(false)
          return
        }
        
        console.log('[Auth] Session retrieved:', session?.user?.email || 'No user')
        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          console.log('[Auth] Fetching user profile...')
          try {
            const { role, name } = await fetchUserProfile(session.user)
            
            // Cek apakah profile valid
            if (!role && !session.user.email?.includes(ADMIN_EMAIL)) {
              console.warn('[Auth] User profile not found in database, clearing session...')
              // User ada di auth tapi tidak ada di database -> clear session
              await supabase.auth.signOut()
              if (isMounted) {
                setUser(null)
                setSession(null)
                setUserRole(null)
                setUserName(null)
              }
            } else {
              // Profile valid
              if (isMounted) {
                setUserRole(role)
                setUserName(name)
                console.log('[Auth] User role:', role)
              }
            }
          } catch (profileError) {
            console.error('[Auth] Profile fetch error:', profileError)
            // Jika error fetch profile, clear session
            await supabase.auth.signOut()
            if (isMounted) {
              setUser(null)
              setSession(null)
            }
          }
        }
        
      } catch (error) {
        console.error('[Auth] Initialization error:', error)
        setInitError(error instanceof Error ? error.message : 'Unknown error')
        
        // Clear session jika ada error critical
        try {
          const supabase = createClient()
          await supabase.auth.signOut()
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
              
              // Validasi profile
              if (!role && !currentSession.user.email?.includes(ADMIN_EMAIL)) {
                console.warn('[Auth] Profile not found during auth state change, signing out...')
                await supabase.auth.signOut()
                setUserRole(null)
                setUserName(null)
              } else {
                setUserRole(role)
                setUserName(name)
              }
            } catch (error) {
              console.error('[Auth] Profile update error:', error)
              await supabase.auth.signOut()
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
      subscription.unsubscribe()
    }
  }, [])

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
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) throw error
  }

  const signOut = async () => {
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const forceSignOut = async () => {
  try {
    const supabase = createClient()
    await supabase.auth.signOut()
    
    // Clear localStorage secara manual
    if (typeof window !== 'undefined') {
      // Clear semua key Supabase
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('sb-') || key.includes('supabase')) {
          localStorage.removeItem(key)
        }
      })
    }
    
    setUser(null)
    setSession(null)
    setUserRole(null)
    setUserName(null)
  } catch (error) {
    console.error('[Auth] Force sign out error:', error)
  }
}

  // Show error state
  if (initError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-6">
          <h2 className="text-xl font-bold text-red-500 mb-2">Authentication Error</h2>
          <p className="text-muted-foreground mb-4">{initError}</p>
          <p className="text-sm text-muted-foreground">
            Check Vercel environment variables
          </p>
        </div>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ user, session, userRole, userName, loading, signUp, signIn, signInWithGoogle, signOut, forceSignOut,}}>
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