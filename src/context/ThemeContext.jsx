import { createContext, useContext, useEffect } from 'react'
import { useAuth } from './AuthContext'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const { profile } = useAuth()

  useEffect(() => {
    const theme = profile?.theme || 'dark'
    document.documentElement.setAttribute('data-theme', theme)
  }, [profile?.theme])

  return (
    <ThemeContext.Provider value={{ theme: profile?.theme || 'dark' }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}

export const THEMES = [
  { id: 'dark',          label: 'Dark',          emoji: '🌙' },
  { id: 'light',         label: 'Chiaro',         emoji: '☀️' },
  { id: 'color_festa',   label: 'Festa',          emoji: '🎉' },
  { id: 'color_natale',  label: 'Natale',         emoji: '🎄' },
  { id: 'color_pasqua',  label: 'Pasqua',         emoji: '🐣' },
]
