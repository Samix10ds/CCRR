import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { ROLE_BADGES, getTimeRank } from '../context/ThemeContext'
import { Trophy } from 'lucide-react'
import styles from './Leaderboard.module.css'

export default function LeaderboardPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('profiles').select('id,nome,cognome,classe,role,special_rank,approved_ideas,joined_at').order('approved_ideas', { ascending:false }).limit(50).then(({ data }) => { setUsers(data||[]); setLoading(false) })
  }, [])

  const MEDALS = ['🥇','🥈','🥉']

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Trophy size={28} color="var(--warning)" />
        <div><h2 className={styles.title}>Leaderboard</h2><p className={styles.sub}>Chi ha più idee approvate nella community</p></div>
      </div>
      {loading ? <p style={{ color:'var(--text-3)', textAlign:'center', padding:40 }}>Caricamento...</p> : (
        <div className={styles.list}>
          {users.map((u, i) => {
            const role = ROLE_BADGES[u.role]
            const rank = getTimeRank(u.joined_at)
            return (
              <div key={u.id} className={[styles.row, i<3?styles.top:''].join(' ')}>
                <span className={styles.position}>{i<3?MEDALS[i]:`#${i+1}`}</span>
                <div className={styles.avatar}>{u.nome?.[0]}{u.cognome?.[0]}</div>
                <div className={styles.info}>
                  <span className={styles.name}>{u.nome} {u.cognome}</span>
                  <div className={styles.badges}>
                    <span className={styles.classe}>{u.classe}</span>
                    {role?.emoji && <span title={role.label}>{role.emoji}</span>}
                    {rank && <span style={{ fontSize:'0.75rem', color:rank.color }}>{rank.emoji} {rank.label}</span>}
                    {u.special_rank && <span className={styles.special}>✨ {u.special_rank}</span>}
                  </div>
                </div>
                <div className={styles.score}><span className={styles.scoreNum}>{u.approved_ideas||0}</span><span className={styles.scoreLabel}>idee</span></div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
