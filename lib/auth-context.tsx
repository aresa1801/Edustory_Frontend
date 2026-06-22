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
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth')) {
          localStorage.removeItem(key)
        }
      })
    }
  }, [])

  // Fungsi untuk validasi user ke database
  const validateUserInDatabase = async (userId: string, userEmail: string) => {
    console.log('[Auth] 🔍 Validasi user ke database:', userEmail)
    
    const supabase = createClient()
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, name')
      .eq('id', userId)
      .maybeSingle()

    // Cek apakah user ada di database
    if (!profile?.role && userEmail !== ADMIN_EMAIL) {
      console.log('[Auth] ❌ User TIDAK ADA di database atau tidak punya role')
      return { valid: false, profile: null }
    }

    console.log('[Auth] ✅ User valid di database:', profile)
    return { valid: true, profile }
  }

  useEffect(() => {
    let isMounted = true

    const initializeAuth = async () => {
      console.log('[Auth] 🛡️ Mulai validasi auth...')
      
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        setInitError('Missing Supabase configuration')
        if (isMounted) setLoading(false)
        return
      }

      try {
        const supabase = createClient()
        
        // LANGKAH 1: Validasi session ke server
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (!isMounted) return
        
        if (sessionError || !session || !session.user) {
          console.log('[Auth] ❌ Session tidak valid:', sessionError?.message)
          await supabase.auth.signOut({ scope: 'global' })
          clearSupabaseStorage()
          if (isMounted) {
            setUser(null)
            setSession(null)
            setLoading(false)
          }
          return
        }

        console.log('[Auth] 📧 Session user:', session.user.email)

        // LANGKAH 2: Validasi user ada di database
        const validation = await validateUserInDatabase(
          session.user.id, 
          session.user.email || ''
        )

        if (!isMounted) return

        if (!validation.valid) {
          console.log('[Auth] 🚫 User tidak valid di database - CLEAR SESSION')
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
          return
        }

        // LANGKAH 3: User valid, set state
        const profile = validation.profile
        const roleMap: Record<string, AppRole> = {
          siswa: 'student',
          student: 'student',
          tutor: 'tutor',
          admin: 'admin',
        }
        const mappedRole = profile ? roleMap[profile.role as string] || null : null

        console.log('[Auth] ✅ User valid, role:', mappedRole)

        if (isMounted) {
          setUser(session.user)
          setSession(session)
          setUserRole(mappedRole)
          setUserName(profile?.name || session.user.user_metadata?.full_name || session.user.email || null)
          setIsFirstTimeUser(!mappedRole && session.user.email !== ADMIN_EMAIL)
          setLoading(false)
        }

      } catch (error) {
        console.error('[Auth] ❌ Initialization error:', error)
        
        try {
          const supabase = createClient()
          await supabase.auth.signOut({ scope: 'global' })
          clearSupabaseStorage()
        } catch (e) {
          console.error('[Auth] Failed to clear:', e)
        }
        
        if (isMounted) {
          setUser(null)
          setSession(null)
          setLoading(false)
        }
      }
    }

    initializeAuth()

    // Listen auth changes
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('[Auth] 📡 Event:', event)

        if (!isMounted) return

        if (event === 'SIGNED_OUT') {
          setUser(null)
          setSession(null)
          setUserRole(null)
          setUserName(null)
          setIsFirstTimeUser(false)
          setLoading(false)
          return
        }

        // Re-validate untuk semua event selain SIGNED_OUT
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          console.log('[Auth] 🔄 Re-validating...')
          await initializeAuth()
        }
      }
    )

    return () => {
      isMounted = false
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
    clearSupabaseStorage()
    
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
      
      window.location.href = '/?cleared=' + Date.now()
    } catch (error) {
      console.error('[Auth] Force sign out error:', error)
      clearSupabaseStorage()
      window.location.href = '/?error_cleared=' + Date.now()
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
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
          >
            Reload
          </button>
        </div>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ 
      user, session, userRole, userName, loading, isFirstTimeUser,
      signUp, signIn, signInWithGoogle, signOut, forceSignOut, clearFirstTimeUserFlag,
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