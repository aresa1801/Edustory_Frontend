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

  useEffect(() => {
    let isMounted = true

    const checkAuth = async () => {
      console.log('[Auth] 🔍 Checking auth status...')
      
      try {
        const supabase = createClient()
        
        // LANGKAH 1: Validasi ke server dengan getUser()
        const { data: { user: serverUser }, error: userError } = await supabase.auth.getUser()
        
        if (!isMounted) return
        
        // LANGKAH 2: Jika getUser error atau user null → CLEAR
        if (userError || !serverUser) {
          console.log('[Auth] ❌ getUser() failed:', userError?.message)
          await supabase.auth.signOut({ scope: 'global' })
          
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
        
        console.log('[Auth] ✅ User valid:', serverUser.email)
        
        // LANGKAH 3: Cek apakah user ada di database
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('role, name')
          .eq('id', serverUser.id)
          .maybeSingle()

        if (profileError) {
          console.error('[Auth] Profile error:', profileError)
        }

        if (!isMounted) return
        
        // LANGKAH 4: Jika user tidak ada di database → CLEAR
        if (!profile?.role && serverUser.email !== ADMIN_EMAIL) {
          console.log('[Auth] ❌ User TIDAK ADA di database → Clear session')
          
          await supabase.auth.signOut({ scope: 'global' })
          
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
        
        // LANGKAH 5: User valid dan ada di database
        const roleMap: Record<string, AppRole> = {
          siswa: 'student',
          student: 'student',
          tutor: 'tutor',
          admin: 'admin',
        }
        const mappedRole = roleMap[profile?.role as string] || null
        
        console.log('[Auth] ✅ User has role:', mappedRole)
        
        if (isMounted) {
          setUser(serverUser)
          setUserRole(mappedRole)
          setUserName(profile?.name || serverUser.user_metadata?.full_name || serverUser.email || null)
          setIsFirstTimeUser(!mappedRole && serverUser.email !== ADMIN_EMAIL)
          setLoading(false)
        }
        
      } catch (error) {
        console.error('[Auth] Error:', error)
        
        if (isMounted) {
          setUser(null)
          setSession(null)
          setUserRole(null)
          setUserName(null)
          setIsFirstTimeUser(false)
          setLoading(false)
        }
      }
    }

    checkAuth()

    // Listen auth changes
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event) => {
        console.log('[Auth] Event:', event)
        
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
        
        // Re-check untuk semua event
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          await checkAuth()
        }
      }
    )

    return () => {
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
      
      // Clear localStorage
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') || key.includes('supabase')) {
          localStorage.removeItem(key)
        }
      })
      
      setUser(null)
      setSession(null)
      setUserRole(null)
      setUserName(null)
      setIsFirstTimeUser(false)
      setLoading(false)
      
      window.location.href = '/?cleared=' + Date.now()
    } catch (error) {
      console.error('[Auth] Force sign out error:', error)
      window.location.href = '/?error=' + Date.now()
    }
  }

  const clearFirstTimeUserFlag = () => {
    setIsFirstTimeUser(false)
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