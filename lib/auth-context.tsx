'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from './supabase-client'
import { ADMIN_EMAIL } from './constants'

export type AppRole = 'student' | 'tutor' | 'admin'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  userRole: AppRole | null
  userName: string | null
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

async function fetchUserProfile(currentUser: User): Promise<{ role: AppRole | null; name: string | null }> {
  // Admin is identified by email — no DB lookup needed
  if (currentUser.email === ADMIN_EMAIL) {
    return {
      role: 'admin',
      name: currentUser.user_metadata?.full_name || 'Administrator',
    }
  }

  try {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, name')
      .eq('id', currentUser.id)
      .single()

    if (profile) {
      return {
        role: DB_ROLE_MAP[profile.role as string] ?? null,
        name: profile.name || currentUser.email || null,
      }
    }
  } catch {
    // Silently fall back to metadata when DB is unreachable or profile not yet created
  }

  // Fallback: read from JWT user_metadata (set during sign-up)
  const metaRole = currentUser.user_metadata?.role as string | undefined
  return {
    role: DB_ROLE_MAP[metaRole ?? ''] ?? null,
    name: currentUser.user_metadata?.full_name || currentUser.email || null,
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<AppRole | null>(null)
  const [userName, setUserName] = useState<string | null>(null)

  useEffect(() => {
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
          const { role, name } = await fetchUserProfile(currentSession.user)
          setUserRole(role)
          setUserName(name)
        } else {
          setUserRole(null)
          setUserName(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email: string, password: string, role: 'student' | 'tutor') => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role } },
    })
    if (error) throw error
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) throw error
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  return (
    <AuthContext.Provider
      value={{ user, session, loading, userRole, userName, signUp, signIn, signInWithGoogle, signOut }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
