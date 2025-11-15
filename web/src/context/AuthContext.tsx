import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

type AuthCtx = {
  user: any
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthCtx>({} as any)

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: { persistSession: true, autoRefreshToken: true },
    realtime: { params: { eventsPerSecond: 10 } },
  }
)

function clearSessionSecrets() {
  try {
    sessionStorage.removeItem('chat_session_passwords')
  } catch {}
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  // Inactivity/hidden session expiration (10 minutes)
  useEffect(() => {
    let timer: any
    const maxIdle = 10 * 60 * 1000
    const reset = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(async () => {
        await supabase.auth.signOut()
        clearSessionSecrets()
        window.location.assign('/login')
      }, maxIdle)
    }
    const onActivity = () => reset()
    const onVisibility = () => {
      if (document.hidden) {
        reset()
      } else {
        reset()
      }
    }
    ['mousemove','keydown','scroll','click','touchstart'].forEach(evt => window.addEventListener(evt, onActivity))
    document.addEventListener('visibilitychange', onVisibility)
    reset()
    return () => {
      ['mousemove','keydown','scroll','click','touchstart'].forEach(evt => window.removeEventListener(evt, onActivity))
      document.removeEventListener('visibilitychange', onVisibility)
      if (timer) clearTimeout(timer)
    }
  }, [])

  const value = useMemo<AuthCtx>(() => ({
    user,
    loading,
    signIn: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
    },
    signUp: async (email, password) => {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) throw error
    },
    signOut: async () => {
      await supabase.auth.signOut()
      clearSessionSecrets()
    },
  }), [user, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}

export { supabase }
