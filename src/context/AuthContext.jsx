import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

// Upsert the logged-in user into team_members so others can see them as owners
async function syncTeamMember(user) {
  if (!user) return
  const name = user.user_metadata?.full_name || user.user_metadata?.name || ''
  await supabase
    .from('team_members')
    .upsert({ id: user.id, email: user.email, display_name: name || null }, { onConflict: 'id' })
}

export function AuthProvider({ children }) {
  const [user, setUser]             = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    // Get current session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
      syncTeamMember(session?.user)
    })

    // Keep state in sync across tabs; sync team member on every sign-in
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      if (event === 'SIGNED_IN') syncTeamMember(session?.user)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signOut = () => supabase.auth.signOut()

  return (
    <AuthContext.Provider value={{ user, authLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
