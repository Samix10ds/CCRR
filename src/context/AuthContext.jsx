import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { loadBannedWords } from '../lib/automod'

const AuthContext = createContext(null)

// Password auto-generata invisibile all'utente
function generatePassword(nome, cognome, classe) {
  const base = `${nome}${cognome}${classe}`.toLowerCase().replace(/\s/g, '')
  return `CCR_${base}_2024!`
}

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  async function fetchProfile(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    setProfile(data)
    return data
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        fetchProfile(session.user.id).then(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user)
        fetchProfile(session.user.id)
      } else {
        setUser(null)
        setProfile(null)
      }
    })

    loadBannedWords()
    return () => subscription.unsubscribe()
  }, [])

  // ─── Registrazione: nome + cognome + classe + email reale ───
  async function signUp({ nome, cognome, classe, email }) {
    const password = generatePassword(nome, cognome, classe)

    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error

    // Se l'utente esiste già in auth ma non in profiles (edge case)
    const userId = data.user?.id
    if (!userId) throw new Error('Registrazione fallita, riprova.')

    const { error: profileError } = await supabase.from('profiles').insert({
      id: userId,
      nome: nome.trim(),
      cognome: cognome.trim(),
      classe,
      email: email.trim().toLowerCase(),
      role: 'user'
    })
    if (profileError) throw profileError

    await fetchProfile(userId)
    return data.user
  }

  // ─── Login utente: email + nome + cognome + classe (password derivata) ───
  async function signIn({ email, nome, cognome, classe }) {
    const password = generatePassword(nome, cognome, classe)

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error

    await fetchProfile(data.user.id)
    return data.user
  }

  // ─── Login admin con password propria ───
  async function signInAdmin({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    await fetchProfile(data.user.id)
    return data.user
  }

  // ─── Registra admin con email + password esplicita ───
  async function signUpAdmin({ email, password, nome, cognome, classe }) {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error

    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      nome: nome.trim(),
      cognome: cognome.trim(),
      classe,
      email: email.trim().toLowerCase(),
      role: 'user'
    })
    if (profileError) throw profileError

    await fetchProfile(data.user.id)
    return data.user
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  async function updateTheme(theme) {
    if (!user) return
    await supabase.from('profiles').update({ theme }).eq('id', user.id)
    setProfile(prev => ({ ...prev, theme }))
  }

  async function refreshProfile() {
    if (!user) return
    return fetchProfile(user.id)
  }

  const isAdmin = profile?.role === 'admin'

  return (
    <AuthContext.Provider value={{
      user, profile, loading, isAdmin,
      signUp, signIn, signInAdmin, signUpAdmin,
      signOut, updateTheme, refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve essere usato dentro AuthProvider')
  return ctx
}
