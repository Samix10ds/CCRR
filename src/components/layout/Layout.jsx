import { Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { checkBanStatus } from '../../lib/automod'
import Sidebar from './Sidebar'
import Navbar from './Navbar'
import styles from './Layout.module.css'

export default function Layout() {
  const { user, profile, loading, signOut } = useAuth()

  if (loading) return (
    <div className={styles.loading}>
      <span className={styles.spinner} />
    </div>
  )

  if (!user) return <Navigate to="/auth" replace />

  // BUG FIX: controlla sia ban permanente che temporaneo
  const banStatus = checkBanStatus(profile)

  if (banStatus.banned) {
    const isPermanent = profile?.is_permanently_banned
    return (
      <div className={styles.banned}>
        <div className={styles.bannedCard}>
          <span className={styles.bannedIcon}>{isPermanent ? '🔴' : '🟠'}</span>
          <h2>{isPermanent ? 'Account bannato' : 'Accesso temporaneamente sospeso'}</h2>
          <p style={{ color: 'var(--text-2)', fontSize: '0.9rem' }}>
            {isPermanent
              ? 'Sei stato bannato permanentemente dalla community CCRR.'
              : `Il tuo accesso è sospeso: ban ${banStatus.reason}.`
            }
          </p>
          {isPermanent && (
            <>
              <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>
                Per fare appello contatta l'amministratore via email.
              </p>
              {profile?.appeal_email && (
                <a href={`mailto:${profile.appeal_email}`} className={styles.appealLink}>
                  Invia appello →
                </a>
              )}
            </>
          )}
          {!isPermanent && (
            <p style={{ color: 'var(--text-3)', fontSize: '0.82rem' }}>
              Ricarica la pagina quando il ban è scaduto per rientrare.
            </p>
          )}
          <button
            onClick={signOut}
            style={{
              marginTop: 8, background: 'none', border: '1px solid var(--border)',
              borderRadius: 8, color: 'var(--text-3)', padding: '8px 16px',
              cursor: 'pointer', fontSize: '0.82rem', fontFamily: 'DM Sans, sans-serif'
            }}
          >
            Disconnetti
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.layout}>
      <Sidebar />
      <div className={styles.main}>
        <Navbar />
        <main className={styles.content}>
          <div className="page-enter">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
