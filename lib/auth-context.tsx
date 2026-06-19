'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { AppRole, toAppRole, isAdminEmail } from '@/lib/auth/role-utils'

export type { AppRole }

interface AuthContextType {
  user: User | null
  session: Session | null
  userRole: AppRole
  userName: string | null
  loading: boolean
  profileExists: boolean
  signUp: (email: string, password: string, role: 'student' | 'tutor') => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

/**
 * Fetches the user's role and name from the database profile.
 * Returns null for role if profile doesn't exist and no metadata role available.
 */
async function fetchUserProfile(currentUser: User): Promise<{ role: AppRole; name: string | null; profileExists: boolean }> {
  // Admin shortcut — no DB lookup needed
  if (isAdminEmail(currentUser.email)) {
    return {
      role: 'admin',
      name: currentUser.user_metadata?.full_name || 'Administrator',
      profileExists: true,
    }
  }

  try {
    const supabase = createClient()
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('role, name')
      .eq('id', currentUser.id)
      .maybeSingle()

    if (error) {
      console.error('[Auth] Profile fetch error:', error)
      return {
        role: null,
        name: currentUser.email || null,
        profileExists: false,
      }
    }

    if (profile) {
      return {
        role: toAppRole(profile.role as string),
        name: profile.name || currentUser.email || null,
        profileExists: true,
      }
    }
    
    // Profile doesn't exist in DB
    console.warn('[Auth] User profile not found in database')
    return {
      role: null,
      name: currentUser.email || null,
      profileExists: false,
    }
  } catch (error) {
    console.warn('[Auth] Profile fetch failed:', error)
    return {
      role: null,
      name: currentUser.email || null,
      profileExists: false,
    }
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<AppRole>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [profileExists, setProfileExists] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)
  const isProfileFetchInProgress = useRef<boolean>(false)
  const lastFetchedUserId = useRef<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const initializeAuth = async () => {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        setInitError('Missing Supabase configuration')
        if (isMounted) setLoading(false)
        return
      }

      try {
        const supabase = createClient()
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession()
        
        if (!isMounted) return
        
        if (sessionError) {
          setInitError(sessionError.message)
          return
        }
        
        setSession(currentSession)
        setUser(currentSession?.user ?? null)

        if (currentSession?.user) {
          isProfileFetchInProgress.current = true
          lastFetchedUserId.current = currentSession.user.id
          
          const { role, name, profileExists: exists } = await fetchUserProfile(currentSession.user)
          if (isMounted && lastFetchedUserId.current === currentSession.user.id) {
            setUserRole(role)
            setUserName(name)
            setProfileExists(exists)
          }
          isProfileFetchInProgress.current = false
        }
      } catch (error) {
        setInitError(error instanceof Error ? error.message : 'Unknown error')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    initializeAuth()

    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: string, currentSession: Session | null) => {
        if (isMounted) {
          setSession(currentSession)
          setUser(currentSession?.user ?? null)

          if (currentSession?.user) {
            // Only fetch if we're not already fetching for a different user
            if (!isProfileFetchInProgress.current && lastFetchedUserId.current !== currentSession.user.id) {
              isProfileFetchInProgress.current = true
              lastFetchedUserId.current = currentSession.user.id
              
              try {
                const { role, name, profileExists: exists } = await fetchUserProfile(currentSession.user)
                if (isMounted && lastFetchedUserId.current === currentSession.user.id) {
                  setUserRole(role)
                  setUserName(name)
                  setProfileExists(exists)
                }
              } catch {
                // Profile update failed silently — state stays as-is
              } finally {
                isProfileFetchInProgress.current = false
              }
            }
          } else {
            setUserRole(null)
            setUserName(null)
            setProfileExists(false)
            lastFetchedUserId.current = null
          }
          
          setLoading(false)
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
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { 
        data: { role },
        emailRedirectTo: `${window.location.origin}/auth/callback`
      },
    })
    if (error) throw error
    
    // Store the pending role in localStorage for callback
    if (data.user && !data.session) {
      // Email confirmation is required - user needs to verify
      localStorage.setItem('pendingRole', role)
    }
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
    <AuthContext.Provider value={{ user, session, userRole, userName, loading, profileExists, signUp, signIn, signInWithGoogle, signOut }}>
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