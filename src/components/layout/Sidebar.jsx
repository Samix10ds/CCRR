import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  Home, Lightbulb, BookOpen, User, Shield,
  LogOut, Menu, X, ChevronRight, Flag, Vote
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import CardBadge from '../ui/CardBadge'
import styles from './Sidebar.module.css'

const NAV_USER = [
  { to: '/',          icon: Home,      label: 'Home'       },
  { to: '/ideas',     icon: Lightbulb, label: 'Idee'       },
  { to: '/rules',     icon: BookOpen,  label: 'Regole'     },
  { to: '/vote',      icon: Vote,      label: 'Votazioni'  },
  { to: '/reports',   icon: Flag,      label: 'Segnalazioni' },
  { to: '/profile',   icon: User,      label: 'Profilo'    },
]

const NAV_ADMIN = [
  { to: '/admin',              icon: Shield,    label: 'Dashboard Admin' },
  { to: '/admin/ideas',        icon: Lightbulb, label: 'Idee in coda'   },
  { to: '/admin/users',        icon: User,      label: 'Utenti'         },
  { to: '/admin/reports',      icon: Flag,      label: 'Segnalazioni'   },
  { to: '/admin/rules',        icon: BookOpen,  label: 'Regole'         },
  { to: '/admin/banned-words', icon: Shield,    label: 'Parole vietate' },
]

export default function Sidebar() {
  const { profile, isAdmin, signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  async function handleSignOut() {
    await signOut()
    navigate('/auth')
  }

  const links = isAdmin ? [...NAV_USER, ...NAV_ADMIN] : NAV_USER

  return (
    <>
      {/* Mobile toggle */}
      <button
        className={styles.mobileToggle}
        onClick={() => setOpen(v => !v)}
        aria-label="Menu"
      >
        {open ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* Backdrop mobile */}
      {open && (
        <div className={styles.backdrop} onClick={() => setOpen(false)} />
      )}

      <aside className={[styles.sidebar, open ? styles.open : ''].join(' ')}>
        {/* Logo */}
        <div className={styles.logo}>
          <span className={styles.logoIcon}>◈</span>
          <span className={styles.logoText}>CCRR</span>
        </div>

        {/* Profilo compatto */}
        {profile && (
          <div className={styles.profileChip}>
            <div className={styles.profileAvatar}>
              {profile.nome[0]}{profile.cognome[0]}
            </div>
            <div className={styles.profileInfo}>
              <span className={styles.profileName}>
                {profile.nome} {profile.cognome}
              </span>
              <span className={styles.profileClass}>{profile.classe}</span>
            </div>
            <CardBadge card={profile.card} />
          </div>
        )}

        {/* Navigazione utente */}
        <nav className={styles.nav}>
          <span className={styles.navLabel}>Generale</span>
          {NAV_USER.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                [styles.link, isActive ? styles.active : ''].join(' ')
              }
              onClick={() => setOpen(false)}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
              <ChevronRight size={14} className={styles.arrow} />
            </NavLink>
          ))}
        </nav>

        {/* Navigazione admin */}
        {isAdmin && (
          <nav className={styles.nav}>
            <span className={[styles.navLabel, styles.adminLabel].join(' ')}>
              Admin
            </span>
            {NAV_ADMIN.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/admin'}
                className={({ isActive }) =>
                  [styles.link, styles.adminLink, isActive ? styles.active : ''].join(' ')
                }
                onClick={() => setOpen(false)}
              >
                <item.icon size={18} />
                <span>{item.label}</span>
                <ChevronRight size={14} className={styles.arrow} />
              </NavLink>
            ))}
          </nav>
        )}

        {/* Footer */}
        <div className={styles.footer}>
          <button className={styles.logoutBtn} onClick={handleSignOut}>
            <LogOut size={16} />
            <span>Esci</span>
          </button>
        </div>
      </aside>
    </>
  )
}
