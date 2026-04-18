import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { checkText, applyAutoBan } from '../lib/automod'
import { notifyAdminNewIdea } from '../lib/notifications'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { ThumbsUp, ThumbsDown, Plus, Lightbulb } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { it } from 'date-fns/locale'
import toast from 'react-hot-toast'
import styles from './Ideas.module.css'

const CLASSI = ['Tutte', '1A', '1B', '2A', '2B', '3A', '3B']

export default function IdeasPage() {
  const { profile, user, refreshProfile } = useAuth()
  const [ideas, setIdeas] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('Tutte')
  const [showNew, setShowNew] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ title: '', content: '' })
  const [myVotes, setMyVotes] = useState({}) // ideaId -> vote_type

  async function fetchIdeas() {
    let q = supabase
      .from('ideas')
      .select('*, profiles(nome,cognome,classe)')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })

    if (filter !== 'Tutte') q = q.eq('classe', filter)

    const { data } = await q
    setIdeas(data || [])
    setLoading(false)
  }

  async function fetchMyVotes() {
    if (!user) return
    const { data } = await supabase
      .from('votes')
      .select('idea_id,vote')
      .eq('user_id', user.id)
    if (data) {
      const map = {}
      data.forEach(v => { map[v.idea_id] = v.vote })
      setMyVotes(map)
    }
  }

  useEffect(() => { fetchIdeas() }, [filter])
  useEffect(() => { fetchMyVotes() }, [user])

  async function handleVote(ideaId, vote) {
    if (myVotes[ideaId]) {
      toast.error('Hai già votato questa idea')
      return
    }
    const { error } = await supabase.from('votes').insert({
      idea_id: ideaId,
      user_id: user.id,
      vote
    })
    if (error) { toast.error(error.message); return }

    // Aggiorna contatore idea
    const field = vote === 'yes' ? 'votes_yes' : 'votes_no'
    const idea = ideas.find(i => i.id === ideaId)
    await supabase.from('ideas')
      .update({ [field]: (idea[field] || 0) + 1 })
      .eq('id', ideaId)

    setMyVotes(p => ({ ...p, [ideaId]: vote }))
    setIdeas(prev => prev.map(i =>
      i.id === ideaId ? { ...i, [field]: (i[field] || 0) + 1 } : i
    ))
    toast.success('Voto registrato!')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim() || !form.content.trim()) {
      toast.error('Compila tutti i campi')
      return
    }

    // Automod check
    const fullText = `${form.title} ${form.content}`
    const { flagged, words } = checkText(fullText)
    if (flagged) {
      setSubmitting(true)
      const result = await applyAutoBan(user.id, words)
      await refreshProfile()
      setSubmitting(false)
      toast.error(`Contenuto non consentito (${words.join(', ')}). Ricevuto cartellino ${result.card}.`)
      setShowNew(false)
      return
    }

    setSubmitting(true)
    const { data, error } = await supabase.from('ideas').insert({
      user_id: user.id,
      classe: profile.classe,
      title: form.title.trim(),
      content: form.content.trim(),
      status: 'pending'
    }).select().single()

    if (error) { toast.error(error.message); setSubmitting(false); return }

    await notifyAdminNewIdea(data.id, data.title, `${profile.nome} ${profile.cognome}`)
    toast.success('Idea inviata! Aspetta l\'approvazione.')
    setForm({ title: '', content: '' })
    setShowNew(false)
    setSubmitting(false)
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.topBar}>
        <div className={styles.filters}>
          {CLASSI.map(c => (
            <button
              key={c}
              className={[styles.filterBtn, filter === c ? styles.active : ''].join(' ')}
              onClick={() => setFilter(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <Button onClick={() => setShowNew(true)} size="sm">
          <Plus size={15} /> Invia idea
        </Button>
      </div>

      {/* Lista idee */}
      {loading ? (
        <div className={styles.empty}>Caricamento...</div>
      ) : ideas.length === 0 ? (
        <div className={styles.empty}>
          <Lightbulb size={40} style={{ color: 'var(--text-3)', marginBottom: 12 }} />
          <p>Nessuna idea approvata ancora</p>
          <Button onClick={() => setShowNew(true)} size="sm" variant="outline" style={{ marginTop: 12 }}>
            Sii il primo!
          </Button>
        </div>
      ) : (
        <div className={styles.list}>
          {ideas.map(idea => (
            <div key={idea.id} className={styles.card}>
              <div className={styles.cardHead}>
                <span className={styles.classe}>{idea.classe}</span>
                <span className={styles.time}>
                  {formatDistanceToNow(new Date(idea.created_at), { addSuffix: true, locale: it })}
                </span>
              </div>
              <h3 className={styles.cardTitle}>{idea.title}</h3>
              <p className={styles.cardContent}>{idea.content}</p>
              <div className={styles.cardFoot}>
                <span className={styles.author}>
                  {idea.profiles?.nome} {idea.profiles?.cognome}
                </span>
                <div className={styles.votes}>
                  <button
                    className={[styles.voteBtn, myVotes[idea.id] === 'yes' ? styles.votedYes : ''].join(' ')}
                    onClick={() => handleVote(idea.id, 'yes')}
                    title="Mi piace"
                  >
                    <ThumbsUp size={15} /> {idea.votes_yes}
                  </button>
                  <button
                    className={[styles.voteBtn, myVotes[idea.id] === 'no' ? styles.votedNo : ''].join(' ')}
                    onClick={() => handleVote(idea.id, 'no')}
                    title="Non mi piace"
                  >
                    <ThumbsDown size={15} /> {idea.votes_no}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal nuova idea */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="💡 Invia un'idea">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className={styles.field}>
            <label>Titolo</label>
            <input
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="Titolo breve dell'idea"
              maxLength={100}
              required
            />
          </div>
          <div className={styles.field}>
            <label>Descrizione</label>
            <textarea
              value={form.content}
              onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
              placeholder="Spiega la tua idea nel dettaglio..."
              rows={5}
              maxLength={800}
              required
            />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setShowNew(false)} type="button">Annulla</Button>
            <Button type="submit" loading={submitting}>Invia</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
