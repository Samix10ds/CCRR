import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { THEMES } from '../context/ThemeContext'
import { CardBadgeFull } from '../components/ui/CardBadge'
import { User, ShieldAlert } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { it } from 'date-fns/locale'
import styles from './Profile.module.css'

export default function ProfilePage() {
  const { profile, updateTheme } = useAuth()
  const [warnings, setWarnings] = useState([])

  useEffect(() => {
    if (!profile) return
    supabase.from('warnings').select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setWarnings(data || []))
  }, [profile])

  if (!profile) return null

  const CARD_COLORS = {
    green: 'var(--card-green)', yellow: 'var(--card-yellow)',
    orange: 'var(--card-orange)', red: 'var(--card-red)'
  }

  return (
    <div className={styles.page}>
      {/* Info utente */}
      <div className={styles.profileCard}>
        <div className={styles.avatar}>
          {profile.nome[0]}{profile.cognome[0]}
        </div>
        <div className={styles.info}>
          <h2 className={styles.name}>{profile.nome} {profile.cognome}</h2>
          <span className={styles.classe}>Classe {profile.classe}</span>
          <div style={{ marginTop: 8 }}>
            <CardBadgeFull card={profile.card} />
          </div>
        </div>
      </div>

      {/* Temi */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>🎨 Tema</h3>
        <div className={styles.themeGrid}>
          {THEMES.map(t => (
            <button
              key={t.id}
              className={[styles.themeBtn, profile.theme === t.id ? styles.themeActive : ''].join(' ')}
              onClick={() => updateTheme(t.id)}
            >
              <span className={styles.themeEmoji}>{t.emoji}</span>
              <span className={styles.themeLabel}>{t.label}</span>
              {profile.theme === t.id && <span className={styles.themeCheck}>✓</span>}
            </button>
          ))}
        </div>
      </section>

      {/* Storico warning */}
      {warnings.length > 0 && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>
            <ShieldAlert size={18} color="var(--warning)" style={{ marginRight: 6 }} />
            Storico cartellini
          </h3>
          <div className={styles.warningList}>
            {warnings.map(w => (
              <div key={w.id} className={styles.warningItem} style={{ '--wc': CARD_COLORS[w.card] }}>
                <div className={styles.warningHead}>
                  <span className={styles.warningCard}>{w.card.toUpperCase()}</span>
                  <span className={styles.warningTime}>
                    {formatDistanceToNow(new Date(w.created_at), { addSuffix: true, locale: it })}
                  </span>
                </div>
                <p className={styles.warningReason}>{w.reason}</p>
                {w.is_auto && <span className={styles.autoTag}>🤖 Automatico</span>}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
