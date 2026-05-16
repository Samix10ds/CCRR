import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { THEMES, getTimeRank, ROLE_BADGES } from '../context/ThemeContext'
import { CardBadgeFull } from '../components/ui/CardBadge'
import { ShieldAlert } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { it } from 'date-fns/locale'
import styles from './Profile.module.css'

export default function ProfilePage() {
  const { profile, updateTheme } = useAuth()
  const [warnings, setWarnings] = useState([])

  useEffect(() => {
    if (!profile) return
    supabase.from('warnings').select('*').eq('user_id', profile.id).order('created_at', { ascending:false }).then(({ data }) => setWarnings(data || []))
  }, [profile])

  if (!profile) return null

  const role = ROLE_BADGES[profile.role]
  const rank = getTimeRank(profile.joined_at)
  const days = profile.joined_at ? Math.floor((Date.now() - new Date(profile.joined_at)) / 86400000) : 0
  const CARD_COLORS = { green:'var(--card-green)', yellow:'var(--card-yellow)', orange:'var(--card-orange)', red:'var(--card-red)' }

  // Calcola % verso il prossimo rank
  const rankProgress = () => {
    if (!rank || !rank.next) return 100
    const thresholds = { Novellino:0, Nuovo:14, Membro:60, Senior:180, Veterano:365 }
    const currentThreshold = thresholds[rank.label] || 0
    const nextThreshold = currentThreshold + rank.daysLeft
    const progress = ((days - currentThreshold) / (nextThreshold - currentThreshold)) * 100
    return Math.min(Math.round(progress), 100)
  }

  return (
    <div className={styles.page}>
      {/* Info utente */}
      <div className={styles.profileCard}>
        <div className={styles.avatar}>{profile.nome[0]}{profile.cognome[0]}</div>
        <div className={styles.info}>
          <h2 className={styles.name}>{profile.nome} {profile.cognome}</h2>
          <span className={styles.classe}>Classe {profile.classe}</span>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:8 }}>
            <CardBadgeFull card={profile.card} />
            {role?.emoji && (
              <span style={{ padding:'4px 12px', borderRadius:20, fontSize:'0.78rem', fontWeight:600, color:role.color, background:`color-mix(in srgb,${role.color} 12%,transparent)`, border:`1px solid color-mix(in srgb,${role.color} 30%,transparent)` }}>
                {role.emoji} {role.label}
              </span>
            )}
            {profile.special_rank && (
              <span style={{ padding:'4px 12px', borderRadius:20, fontSize:'0.78rem', fontWeight:600, color:'var(--accent)', background:'color-mix(in srgb,var(--accent) 12%,transparent)', border:'1px solid color-mix(in srgb,var(--accent) 30%,transparent)' }}>
                ✨ {profile.special_rank}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        <div className={styles.statBox}><span className={styles.statNum}>{profile.approved_ideas || 0}</span><span className={styles.statLabel}>Idee approvate</span></div>
        <div className={styles.statBox}><span className={styles.statNum}>{days}</span><span className={styles.statLabel}>Giorni nel sito</span></div>
        <div className={styles.statBox}><span className={styles.statNum}>{warnings.length}</span><span className={styles.statLabel}>Cartellini ricevuti</span></div>
      </div>

      {/* Rank e progressione */}
      {rank && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>📊 Rank attuale</h3>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
            <span style={{ fontSize:'1.8rem' }}>{rank.emoji}</span>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'1rem', color:rank.color }}>{rank.label}</div>
              {rank.next
                ? <div style={{ fontSize:'0.78rem', color:'var(--text-3)', marginTop:2 }}>Prossimo rank: <strong style={{ color:'var(--text-2)' }}>{rank.next}</strong> tra {rank.daysLeft} giorni</div>
                : <div style={{ fontSize:'0.78rem', color:'var(--text-3)', marginTop:2 }}>Rank massimo raggiunto! 🏆</div>
              }
            </div>
          </div>
          {rank.next && (
            <div>
              <div style={{ height:8, background:'var(--bg-3)', borderRadius:4, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${rankProgress()}%`, background:rank.color, borderRadius:4, transition:'width 0.5s ease' }} />
              </div>
              <div style={{ fontSize:'0.72rem', color:'var(--text-3)', marginTop:4, textAlign:'right' }}>{rankProgress()}%</div>
            </div>
          )}
          <div style={{ marginTop:12, display:'flex', flexDirection:'column', gap:6 }}>
            {[
              { label:'👶 Novellino', days:'0 giorni', threshold:0 },
              { label:'🌱 Nuovo',     days:'14 giorni', threshold:14 },
              { label:'🎖️ Membro',   days:'60 giorni', threshold:60 },
              { label:'⭐ Senior',    days:'180 giorni', threshold:180 },
              { label:'🏆 Veterano', days:'365 giorni', threshold:365 },
            ].map(r => (
              <div key={r.label} style={{ display:'flex', justifyContent:'space-between', fontSize:'0.8rem', color: days>=r.threshold?'var(--text)':'var(--text-3)', fontWeight:days>=r.threshold?600:400 }}>
                <span>{r.label}</span>
                <span>{days>=r.threshold?'✓ Raggiunto':r.days}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Temi */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>🎨 Tema</h3>
        <div className={styles.themeGrid}>
          {THEMES.map(t => (
            <button key={t.id} className={[styles.themeBtn, profile.theme===t.id?styles.themeActive:''].join(' ')} onClick={() => updateTheme(t.id)}>
              <span className={styles.themeEmoji}>{t.emoji}</span>
              <span className={styles.themeLabel}>{t.label}</span>
              {profile.theme===t.id && <span className={styles.themeCheck}>✓</span>}
            </button>
          ))}
        </div>
      </section>

      {/* Storico warning */}
      {warnings.length > 0 && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}><ShieldAlert size={18} color="var(--warning)" style={{ marginRight:6, display:'inline' }} />Storico cartellini</h3>
          <div className={styles.warningList}>
            {warnings.map(w => (
              <div key={w.id} className={styles.warningItem} style={{ '--wc':CARD_COLORS[w.card] }}>
                <div className={styles.warningHead}>
                  <span className={styles.warningCard}>{w.card.toUpperCase()}</span>
                  <span className={styles.warningTime}>{formatDistanceToNow(new Date(w.created_at), { addSuffix:true, locale:it })}</span>
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
