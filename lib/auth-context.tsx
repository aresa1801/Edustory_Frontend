'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/auth'
import { Session } from '@supabase/supabase-js'

const ADMIN_EMAIL = 'admin@edustory.com' // Sesuaikan dengan email admin Anda

type AppRole = 'student' | 'tutor' | 'admin' | null

interface AuthContextType {
  user: User | null
  session: any
  userRole: AppRole
  userName: string | null
  loading: boolean
  signUp: (email: string, password: string, role: 'student' | 'tutor') => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Map DB role values to application role values
const DB_ROLE_MAP: Record<string, AppRole> = {
  siswa: 'student',
  student: 'student',
  tutor: 'tutor',
  admin: 'admin',
}

// Perbaikan untuk fetchUserProfile function (line 46-66)
async function fetchUserProfile(currentUser: User): Promise<{ role: AppRole | null; name: string | null }> {
  // Admin is identified by email — no DB lookup needed
  if (currentUser.email === ADMIN_EMAIL) {
    return {
      role: 'admin',
      name: currentUser.user_metadata?.full_name || 'Administrator',
    }
  }

  try {
    const supabase = createClient()
    
    // Add timeout to prevent hanging
    const profilePromise = supabase
      .from('user_profiles')
      .select('role, name')
      .eq('id', currentUser.id)
      .single()

    const timeoutPromise = new Promise<null>((_, reject) => {
      setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
    })

    const result = await Promise.race([profilePromise, timeoutPromise])
    
    // Type guard untuk memeriksa hasil
    if (result && 'data' in result) {
      const profile = result.data
      if (profile) {
        return {
          role: DB_ROLE_MAP[profile.role as string] ?? null,
          name: profile.name || currentUser.email || null,
        }
      }
    }
  } catch (error) {
    console.warn('Error fetching profile, falling back to metadata:', error)
    // Fall back to metadata when DB is unreachable or profile not yet created
  }

  // Fallback: read from JWT user_metadata (set during sign-up)
  const metaRole = currentUser.user_metadata?.role as string | undefined
  return {
    role: DB_ROLE_MAP[metaRole ?? ''] ?? null,
    name: currentUser.user_metadata?.full_name || currentUser.email || null,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)  // Pastikan type Session
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<AppRole>(null)
  const [userName, setUserName] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    
    const initializeAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession()
        setSession(currentSession)
        setUser(currentSession?.user ?? null)

        if (currentSession?.user) {
          const { role, name } = await fetchUserProfile(currentSession.user)
          setUserRole(role)
          setUserName(name)
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, currentSession) => {
        setSession(currentSession)
        setUser(currentSession?.user ?? null)

        if (currentSession?.user) {
          try {
            const { role, name } = await fetchUserProfile(currentSession.user)
            setUserRole(role)
            setUserName(name)
          } catch (error) {
            console.error('Error updating user profile:', error)
            setUserRole(null)
            setUserName(null)
          }
        } else {
          setUserRole(null)
          setUserName(null)
        }
        
        // Ensure loading is false after auth state change
        setLoading(false)
      }
    )

    return () => {
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

  return (
    <AuthContext.Provider value={{ user, session, userRole, userName, loading, signUp, signIn, signInWithGoogle, signOut }}>
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