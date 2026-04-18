import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { CardBadgeFull } from '../components/ui/CardBadge'
import { getRankTier } from './Leaderboard'
import { THEMES } from '../context/ThemeContext'
import Button from '../components/ui/Button'
import { formatDistanceToNow, differenceInDays } from 'date-fns'
import { it } from 'date-fns/locale'
import { updateTheme } from '../context/AuthContext'
import { Shield, Star, Clock, Lightbulb } from 'lucide-react'
import toast from 'react-hot-toast'
import styles from './UserProfile.module.css'

// Rank automatici per tempo
function getTimeRank(createdAt) {
  if (!createdAt) return null
  const days = differenceInDays(new Date(), new Date(createdAt))
  if (days >= 365) return { label: '🎖 Veterano',  color: '#ffd700' }
  if (days >= 180) return { label: '⭐ Senior',    color: '#aaaacc' }
  if (days >= 30)  return { label: '🌟 Membro',    color: '#00d4aa' }
  return                   { label: '🌱 Nuovo',    color: '#80aa80' }
}

export default function UserProfilePage() {
  const { id } = useParams()
  const { user, profile: myProfile, isAdmin, updateTheme } = useAuth()
  const isMe = !id || id === user?.id
  const targetId = isMe ? user?.id : id

  const [profile, setProfile]         = useState(null)
  const [customRanks, setCustomRanks] = useState([])
  const [ideas, setIdeas]             = useState([])
  const [warnings, setWarnings]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [newRank, setNewRank]         = useState({ label: '', color: '#00d4aa' })

  const isMod = myProfile?.role === 'mod'
  const canAssignRank = isAdmin || isMod

  useEffect(() => {
    if (!targetId) return
    async function load() {
      const [
        { data: p },
        { data: cr },
        { data: ideas },
        { data: warn }
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', targetId).single(),
        supabase.from('custom_ranks').select('*, assigner:assigned_by(nome,cognome)').eq('user_id', targetId),
        supabase.from('ideas').select('id,title,status,created_at,votes_yes,votes_no')
          .eq('author_id', targetId).order('created_at', { ascending: false }).limit(10),
        isMe ? supabase.from('warnings').select('*').eq('user_id', targetId).order('created_at', { ascending: false }) : { data: [] }
      ])
      setProfile(p); setCustomRanks(cr || [])
      setIdeas(ideas || []); setWarnings(warn || [])
      setLoading(false)
    }
    load()
  }, [targetId])

  async function addCustomRank() {
    if (!newRank.label.trim()) return
    const { data, error } = await supabase.from('custom_ranks').insert({
      user_id: targetId, label: newRank.label.trim(),
      color: newRank.color, assigned_by: user.id
    }).select('*, assigner:assigned_by(nome,cognome)').single()
    if (error) { toast.error(error.message); return }
    setCustomRanks(p => [...p, data])
    setNewRank({ label: '', color: '#00d4aa' })
    toast.success('Rank aggiunto!')
  }

  async function removeCustomRank(rankId) {
    await supabase.from('custom_ranks').delete().eq('id', rankId)
    setCustomRanks(p => p.filter(r => r.id !== rankId))
  }

  if (loading) return <div style={{ padding: 40, color: 'var(--text-3)' }}>Caricamento...</div>
  if (!profile) return <div style={{ padding: 40, color: 'var(--danger)' }}>Profilo non trovato</div>

  const tier     = getRankTier(profile.approved_ideas || 0)
  const timeRank = getTimeRank(profile.created_at)
  const roleMap  = { admin: { label: 'Admin', color: '#ff4d6d' }, mod: { label: 'Mod', color: '#ffb830' } }
  const roleInfo = roleMap[profile.role]

  return (
    <div className={styles.page}>
      {/* Header profilo */}
      <div className={styles.card}>
        <div className={styles.avatarWrap}>
          <div className={styles.avatar}>{profile.nome?.[0]}{profile.cognome?.[0]}</div>
        </div>
        <div className={styles.info}>
          <h2 className={styles.name}>{profile.nome} {profile.cognome}</h2>
          <div className={styles.chips}>
            <span className={styles.classeChip}>{profile.classe}</span>
            {roleInfo && (
              <span className={styles.chip} style={{ color: roleInfo.color, background: roleInfo.color + '18', border: `1px solid ${roleInfo.color}44` }}>
                {roleInfo.label}
              </span>
            )}
            {timeRank && (
              <span className={styles.chip} style={{ color: timeRank.color, background: timeRank.color + '18', border: `1px solid ${timeRank.color}44` }}>
                {timeRank.label}
              </span>
            )}
            <span className={styles.chip} style={{ color: tier.color, background: tier.color + '18', border: `1px solid ${tier.color}44` }}>
              {tier.label}
            </span>
            <CardBadgeFull card={profile.card || 'green'} />
          </div>

          {/* Rank personalizzati */}
          {customRanks.length > 0 && (
            <div className={styles.customRanks}>
              {customRanks.map(r => (
                <span key={r.id} className={styles.customRank}
                  style={{ color: r.color, background: r.color + '18', border: `1px solid ${r.color}44` }}>
                  ⭐ {r.label}
                  {canAssignRank && (
                    <button onClick={() => removeCustomRank(r.id)}
                      style={{ background: 'none', border: 'none', color: r.color, cursor: 'pointer', marginLeft: 4, fontSize: '0.8rem' }}>
                      ×
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}

          <p className={styles.joined}>
            <Clock size={13} /> Iscritto {profile.created_at
              ? formatDistanceToNow(new Date(profile.created_at), { addSuffix: true, locale: it })
              : 'da un po\''}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.statsRow}>
        <div className={styles.stat}>
          <span className={styles.statNum} style={{ color: 'var(--success)' }}>{profile.approved_ideas || 0}</span>
          <span className={styles.statLabel}>Idee approvate</span>
        </div>
        <div className={styles.statDiv} />
        <div className={styles.stat}>
          <span className={styles.statNum}>{ideas.length}</span>
          <span className={styles.statLabel}>Idee totali</span>
        </div>
        <div className={styles.statDiv} />
        <div className={styles.stat}>
          <span className={styles.statNum} style={{ color: tier.color }}>#{tier.label.split(' ')[1] || 'N/A'}</span>
          <span className={styles.statLabel}>Rank</span>
        </div>
      </div>

      {/* Aggiungi rank (mod/admin) */}
      {canAssignRank && !isMe && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}><Star size={16} color="var(--warning)" /> Assegna rank</h3>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <input value={newRank.label} onChange={e => setNewRank(p => ({ ...p, label: e.target.value }))}
              placeholder="es. Amico di Davide" style={{ flex: 1, minWidth: 160 }} />
            <input type="color" value={newRank.color}
              onChange={e => setNewRank(p => ({ ...p, color: e.target.value }))}
              style={{ width: 44, height: 38, padding: 2, borderRadius: 8, cursor: 'pointer', flex: 'none' }} />
            <Button size="sm" onClick={addCustomRank}>Aggiungi</Button>
          </div>
        </div>
      )}

      {/* Temi (solo profilo personale) */}
      {isMe && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>🎨 Tema</h3>
          <div className={styles.themeGrid}>
            {THEMES.map(t => (
              <button key={t.id}
                className={[styles.themeBtn, myProfile?.theme === t.id ? styles.themeActive : ''].join(' ')}
                onClick={() => updateTheme(t.id)}>
                <span className={styles.themeEmoji}>{t.emoji}</span>
                <span className={styles.themeLabel}>{t.label}</span>
                {myProfile?.theme === t.id && <span className={styles.themeCheck}>✓</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Idee recenti */}
      {ideas.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}><Lightbulb size={16} color="var(--accent)" /> Idee recenti</h3>
          <div className={styles.ideaList}>
            {ideas.map(idea => {
              const stColors = { pending: 'var(--warning)', approved: 'var(--success)', rejected: 'var(--danger)' }
              return (
                <div key={idea.id} className={styles.ideaItem}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%',
                    background: stColors[idea.status], display: 'inline-block', flexShrink: 0 }} />
                  <span className={styles.ideaTitle}>{idea.title}</span>
                  <span style={{ marginLeft: 'auto', fontSize: '0.74rem', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                    👍 {idea.votes_yes || 0}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Warning (solo se sei tu) */}
      {isMe && warnings.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}><Shield size={16} color="var(--warning)" /> Storico cartellini</h3>
          <div className={styles.warnList}>
            {warnings.map(w => {
              const wc = { yellow: 'var(--card-yellow)', orange: 'var(--card-orange)', red: 'var(--card-red)', green: 'var(--card-green)' }
              return (
                <div key={w.id} className={styles.warnItem} style={{ '--wc': wc[w.card] }}>
                  <span style={{ fontWeight: 800, color: 'var(--wc)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                    {w.card}
                  </span>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-2)', flex: 1 }}>{w.reason}</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                    {formatDistanceToNow(new Date(w.created_at), { addSuffix: true, locale: it })}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
