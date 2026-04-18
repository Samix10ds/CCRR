import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Button from '../components/ui/Button'
import { Vote as VoteIcon, ThumbsUp, ThumbsDown } from 'lucide-react'
import toast from 'react-hot-toast'
import styles from './Vote.module.css'

export default function VotePage() {
  const { user, profile } = useAuth()
  const [ideas, setIdeas] = useState([])
  const [myVotes, setMyVotes] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: pending } = await supabase
        .from('ideas')
        .select('*, profiles(nome,cognome)')
        .eq('status', 'pending')
        .eq('classe', profile?.classe)
        .order('created_at', { ascending: false })

      const { data: votes } = await supabase
        .from('votes')
        .select('idea_id,vote')
        .eq('user_id', user.id)

      setIdeas(pending || [])
      const map = {}
      votes?.forEach(v => { map[v.idea_id] = v.vote })
      setMyVotes(map)
      setLoading(false)
    }
    if (profile) load()
  }, [profile, user])

  async function vote(ideaId, v) {
    if (myVotes[ideaId]) { toast.error('Hai già votato'); return }

    const { error } = await supabase.from('votes').insert({
      idea_id: ideaId, user_id: user.id, vote: v
    })
    if (error) { toast.error(error.message); return }

    const field = v === 'yes' ? 'votes_yes' : 'votes_no'
    const idea = ideas.find(i => i.id === ideaId)
    await supabase.from('ideas').update({ [field]: (idea[field] || 0) + 1 }).eq('id', ideaId)

    setMyVotes(p => ({ ...p, [ideaId]: v }))
    setIdeas(prev => prev.map(i =>
      i.id === ideaId ? { ...i, [field]: (i[field] || 0) + 1 } : i
    ))
    toast.success('Voto registrato!')
  }

  return (
    <div className={styles.page}>
      <div className={styles.intro}>
        <VoteIcon size={24} color="var(--warning)" />
        <div>
          <h2 className={styles.title}>Votazioni — {profile?.classe}</h2>
          <p className={styles.sub}>Vota le idee in attesa della tua classe. L'admin decide il risultato finale.</p>
        </div>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-3)' }}>Caricamento...</p>
      ) : ideas.length === 0 ? (
        <div className={styles.empty}>
          <VoteIcon size={36} style={{ color: 'var(--text-3)', marginBottom: 10 }} />
          <p>Nessuna idea da votare per la classe {profile?.classe}</p>
        </div>
      ) : (
        <div className={styles.list}>
          {ideas.map(idea => {
            const total = (idea.votes_yes || 0) + (idea.votes_no || 0)
            const pct = total > 0 ? Math.round((idea.votes_yes / total) * 100) : 50

            return (
              <div key={idea.id} className={styles.card}>
                <h3 className={styles.ideaTitle}>{idea.title}</h3>
                <p className={styles.ideaContent}>{idea.content}</p>

                {/* Barra voti */}
                <div className={styles.barWrap}>
                  <div className={styles.bar}>
                    <div className={styles.barYes} style={{ width: `${pct}%` }} />
                  </div>
                  <div className={styles.barLabels}>
                    <span style={{ color: 'var(--success)' }}>👍 {idea.votes_yes || 0}</span>
                    <span style={{ color: 'var(--danger)' }}>{idea.votes_no || 0} 👎</span>
                  </div>
                </div>

                <div className={styles.actions}>
                  <span className={styles.author}>di {idea.profiles?.nome} {idea.profiles?.cognome}</span>
                  {myVotes[idea.id] ? (
                    <span className={styles.voted}>
                      {myVotes[idea.id] === 'yes' ? '✅ Hai votato sì' : '❌ Hai votato no'}
                    </span>
                  ) : (
                    <div className={styles.voteBtns}>
                      <Button size="sm" variant="secondary" onClick={() => vote(idea.id, 'yes')}>
                        <ThumbsUp size={14} /> Sì
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => vote(idea.id, 'no')}>
                        <ThumbsDown size={14} /> No
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
