import { useLocation } from 'react-router-dom'
import NotificationBell from '../notifications/NotificationBell'
import { useAuth } from '../../context/AuthContext'
import styles from './Navbar.module.css'

const PAGE_TITLES = {
  '/':                    'Home',
  '/ideas':               'Idee',
  '/ideas/new':           'Invia un\'idea',
  '/rules':               'Regole',
  '/vote':                'Votazioni',
  '/reports':             'Segnalazioni',
  '/profile':             'Profilo',
  '/admin':               'Dashboard Admin',
  '/admin/ideas':         'Idee in coda',
  '/admin/users':         'Gestione utenti',
  '/admin/reports':       'Segnalazioni',
  '/admin/rules':         'Modifica regole',
  '/admin/banned-words':  'Parole vietate',
}

export default function Navbar() {
  const { profile } = useAuth()
  const { pathname } = useLocation()

  const title = PAGE_TITLES[pathname] || 'CCRR'

  return (
    <header className={styles.navbar}>
      <h1 className={styles.title}>{title}</h1>

      <div className={styles.actions}>
        <NotificationBell />

        {profile && (
          <div className={styles.avatar} title={`${profile.nome} ${profile.cognome}`}>
            {profile.nome[0]}{profile.cognome[0]}
          </div>
        )}
      </div>
    </header>
  )
}
