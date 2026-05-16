import { createContext, useContext, useEffect } from 'react'
import { useAuth } from './AuthContext'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const { profile } = useAuth()
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', profile?.theme || 'dark')
  }, [profile?.theme])
  return (
    <ThemeContext.Provider value={{ theme: profile?.theme || 'dark' }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() { return useContext(ThemeContext) }

export const THEMES = [
  { id: 'dark',         label: 'Dark',     emoji: '🌙' },
  { id: 'light',        label: 'Chiaro',   emoji: '☀️' },
  { id: 'midnight',     label: 'Midnight', emoji: '🌌' },
  { id: 'ocean',        label: 'Ocean',    emoji: '🌊' },
  { id: 'forest',       label: 'Forest',   emoji: '🌲' },
  { id: 'sunset',       label: 'Sunset',   emoji: '🌅' },
  { id: 'cherry',       label: 'Cherry',   emoji: '🌸' },
  { id: 'color_festa',  label: 'Festa',    emoji: '🎉' },
  { id: 'color_natale', label: 'Natale',   emoji: '🎄' },
  { id: 'color_pasqua', label: 'Pasqua',   emoji: '🐣' },
]

export function getTimeRank(joinedAt) {
  if (!joinedAt) return null
  const days = Math.floor((Date.now() - new Date(joinedAt)) / 86400000)
  if (days >= 365) return { label: 'Veterano',  emoji: '🏆', color: '#ffb830', next: null,       daysLeft: 0 }
  if (days >= 180) return { label: 'Senior',    emoji: '⭐', color: '#00d4aa', next: 'Veterano', daysLeft: 365 - days }
  if (days >= 60)  return { label: 'Membro',    emoji: '🎖️', color: '#4d9eff', next: 'Senior',   daysLeft: 180 - days }
  if (days >= 14)  return { label: 'Nuovo',     emoji: '🌱', color: '#80b880', next: 'Membro',   daysLeft: 60 - days }
  return               { label: 'Novellino', emoji: '👶', color: '#9090a8', next: 'Nuovo',    daysLeft: 14 - days }
}

export const ROLE_BADGES = {
  admin: { label: 'Admin', emoji: '🛡️', color: '#ff4d6d' },
  mod:   { label: 'Mod',   emoji: '🔨', color: '#ffb830' },
  user:  { label: null,    emoji: null,  color: null },
}

export const SPECIAL_RANKS = [
  'Amico di Samuele',
  'Amico di Davide',
  'Top Idea Maker',
  'Community Star',
  'Early Adopter',
]
