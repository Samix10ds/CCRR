import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Button from '../components/ui/Button'
import { Vote as VoteIcon, ThumbsUp, ThumbsDown, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import styles from './Vote.module.css'

export default function VotePage() {
  const { user, profile, isAdmin } = useAuth()
  const isMod = profile?.role === 'mod'
  const [ideas, setIdeas] = useState([])
  const [myVotes, setMyVotes] = useState({})
  const [loading, setLoading] = useState(true)

  async function load() {
    // Carica idee votabili pending della propria classe
    const { data: pending } = await supabase
      .from('ideas')
      .select('*, profiles:author_id(nome,cognome)')
      .eq('is_votable', true)
      .eq('status', 'pending')
      .eq('classe', profile?.classe)
      .order('created_at', { ascending: false })

    // Admin e mod vedono tutte le classi
    let all = []
    if (isAdmin || isMod) {
      const { data: allData } = await supabase
        .from('ideas')
        .select('*, profiles:author_id(nome,cognome)')
        .eq('is_votable', true)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
      all = allData || []
    }

    setIdeas(isAdmin || isMod ? all : (pending || []))

    const { data: votes } = await supabase
      .from('votes').select('idea_id,vote').eq('user_id', user.id)
    const map = {}
    votes?.forEach(v => { map[v.idea_id] = v.vote })
    setMyVotes(map)
    setLoading(false)
  }

  useEffect(() => { if (profile) load() }, [profile, user])

  async function vote(ideaId, v) {
    if (myVotes[ideaId]) { toast.error('Hai già votato'); return }
    const { error } = await supabase.from('votes').insert({ idea_id:ideaId, user_id:user.id, vote:v })
    if (error) { toast.error(error.message); return }
    const field = v === 'yes' ? 'votes_yes' : 'votes_no'
    const idea = ideas.find(i => i.id === ideaId)
    await supabase.from('ideas').update({ [field]: (idea[field]||0)+1 }).eq('id', ideaId)
    setMyVotes(p => ({ ...p, [ideaId]: v }))
    setIdeas(prev => prev.map(i => i.id === ideaId ? { ...i, [field]: (i[field]||0)+1 } : i))
    toast.success('Voto registrato!')
  }

  // Admin/mod possono forzare un'idea in votazione anche se ha perso
  async function toggleVotable(ideaId, current) {
    await supabase.from('ideas').update({ is_votable: !current }).eq('id', ideaId)
    toast.success(!current ? 'Idea aggiunta alle votazioni' : 'Idea rimossa dalle votazioni')
    load()
  }

  const MIN_IDEAS = 2
  const canVote = ideas.length >= MIN_IDEAS

  return (
    <div className={styles.page}>
      <div className={styles.intro}>
        <VoteIcon size={24} color="var(--warning)" />
        <div>
          <h2 className={styles.title}>Votazioni — {isAdmin||isMod ? 'Tutte le classi' : `Classe ${profile?.classe}`}</h2>
          <p className={styles.sub}>Vota le idee in gara. L'admin decide il risultato finale.</p>
        </div>
      </div>

      {!canVote && !loading && (
        <div className={styles.minWarning}>
          <AlertCircle size={18} color="var(--warning)" />
          <span>Servono almeno <strong>{MIN_IDEAS} idee</strong> per avviare le votazioni. Al momento: {ideas.length}.</span>
        </div>
      )}

      {loading ? (
        <p style={{ color:'var(--text-3)' }}>Caricamento...</p>
      ) : ideas.length === 0 ? (
        <div className={styles.empty}>
          <VoteIcon size={36} style={{ color:'var(--text-3)', marginBottom:10 }} />
          <p>Nessuna idea in votazione per {isAdmin||isMod?'nessuna classe':profile?.classe}</p>
          <p style={{ fontSize:'0.82rem', marginTop:6 }}>Invia un'idea e seleziona "Invia alle votazioni"</p>
        </div>
      ) : (
        <div className={styles.list}>
          {ideas.map(idea => {
            const total = (idea.votes_yes||0) + (idea.votes_no||0)
            const pct = total > 0 ? Math.round((idea.votes_yes/total)*100) : 50
            return (
              <div key={idea.id} className={styles.card}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:8 }}>
                  <div>
                    <span className={styles.classe}>{idea.classe}</span>
                    <h3 className={styles.ideaTitle}>{idea.title}</h3>
                  </div>
                  {(isAdmin||isMod) && (
                    <button onClick={() => toggleVotable(idea.id, idea.is_votable)}
                      style={{ fontSize:'0.75rem', padding:'4px 10px', borderRadius:8, background:'var(--bg-3)', border:'1px solid var(--border)', color:'var(--text-3)', cursor:'pointer', fontFamily:'DM Sans,sans-serif' }}>
                      Rimuovi da voto
                    </button>
                  )}
                </div>
                <p className={styles.ideaContent}>{idea.content}</p>
                <div className={styles.barWrap}>
                  <div className={styles.bar}><div className={styles.barYes} style={{ width:`${pct}%` }} /></div>
                  <div className={styles.barLabels}>
                    <span style={{ color:'var(--success)' }}>👍 {idea.votes_yes||0}</span>
                    <span style={{ color:'var(--danger)' }}>{idea.votes_no||0} 👎</span>
                  </div>
                </div>
                <div className={styles.actions}>
                  <span className={styles.author}>di {idea.profiles?.nome} {idea.profiles?.cognome}</span>
                  {myVotes[idea.id] ? (
                    <span className={styles.voted}>{myVotes[idea.id]==='yes'?'✅ Hai votato sì':'❌ Hai votato no'}</span>
                  ) : canVote ? (
                    <div className={styles.voteBtns}>
                      <Button size="sm" variant="secondary" onClick={() => vote(idea.id,'yes')}><ThumbsUp size={14} /> Sì</Button>
                      <Button size="sm" variant="danger" onClick={() => vote(idea.id,'no')}><ThumbsDown size={14} /> No</Button>
                    </div>
                  ) : (
                    <span style={{ fontSize:'0.78rem', color:'var(--text-3)' }}>Attendere altre idee</span>
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
