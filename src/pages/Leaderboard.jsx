import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Trophy } from 'lucide-react'
import styles from './Leaderboard.module.css'

const RANK_TIERS = [
  { min: 20, label: '🏆 Leggenda',   color: '#ffd700' },
  { min: 10, label: '💎 Diamante',   color: '#00eeff' },
  { min: 5,  label: '🥇 Oro',        color: '#ffaa00' },
  { min: 3,  label: '🥈 Argento',    color: '#aaaacc' },
  { min: 1,  label: '🥉 Bronzo',     color: '#cc8844' },
  { min: 0,  label: '🌱 Novizio',    color: '#80aa80' },
]

export function getRankTier(approvedIdeas) {
  return RANK_TIERS.find(t => approvedIdeas >= t.min) || RANK_TIERS[RANK_TIERS.length - 1]
}

export default function LeaderboardPage() {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('profiles')
      .select('id, nome, cognome, classe, role, approved_ideas, created_at')
      .order('approved_ideas', { ascending: false })
      .limit(50)
      .then(({ data }) => { setUsers(data || []); setLoading(false) })
  }, [])

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Trophy size={26} color="var(--warning)" />
        <div>
          <h2 className={styles.title}>Leaderboard</h2>
          <p className={styles.sub}>Chi ha più idee approvate dalla community</p>
        </div>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-3)' }}>Caricamento...</p>
      ) : (
        <div className={styles.list}>
          {users.map((u, i) => {
            const tier = getRankTier(u.approved_ideas || 0)
            const isMe = u.id === user?.id
            return (
              <Link key={u.id} to={`/profile/${u.id}`}
                className={[styles.row, isMe ? styles.me : ''].join(' ')}>
                <div className={styles.pos}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                </div>
                <div className={styles.avatar}>
                  {u.nome?.[0]}{u.cognome?.[0]}
                </div>
                <div className={styles.info}>
                  <div className={styles.name}>{u.nome} {u.cognome}</div>
                  <div className={styles.meta}>
                    {u.classe}
                    {u.role !== 'user' && (
                      <span style={{ color: u.role === 'admin' ? 'var(--danger)' : 'var(--warning)',
                        fontWeight: 700, fontSize: '0.72rem' }}> · {u.role}</span>
                    )}
                  </div>
                </div>
                <div className={styles.rank} style={{ color: tier.color }}>
                  <span className={styles.rankLabel}>{tier.label}</span>
                  <span className={styles.rankScore}>{u.approved_ideas || 0} idee</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
