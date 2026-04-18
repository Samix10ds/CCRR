import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import { Shield, Plus, ThumbsUp, ThumbsDown, Check, X } from 'lucide-react'
import { loadBannedWords } from '../../lib/automod'
import toast from 'react-hot-toast'
import styles from './Admin.module.css'

const FILTERS = ['pending', 'approved', 'rejected']
const LABELS  = { pending: 'In votazione', approved: 'Attive', rejected: 'Rifiutate' }

export default function AdminBannedWords() {
  const { user } = useAuth()
  const [words, setWords]       = useState([])
  const [filter, setFilter]     = useState('pending')
  const [myVotes, setMyVotes]   = useState({})
  const [newWord, setNewWord]   = useState('')
  const [showAdd, setShowAdd]   = useState(false)
  const [adding, setAdding]     = useState(false)

  async function load() {
    const { data } = await supabase
      .from('banned_words')
      .select('*, profiles(nome,cognome)')
      .eq('status', filter)
      .order('created_at', { ascending: false })
    setWords(data || [])

    // Carica voti dell'admin
    const { data: votes } = await supabase
      .from('banned_word_votes')
      .select('word_id,vote')
      .eq('user_id', user.id)
    const map = {}
    votes?.forEach(v => { map[v.word_id] = v.vote })
    setMyVotes(map)
  }

  useEffect(() => { load() }, [filter])

  async function vote(wordId, v) {
    if (myVotes[wordId]) { toast.error('Hai già votato'); return }
    await supabase.from('banned_word_votes').insert({ word_id: wordId, user_id: user.id, vote: v })
    const field = v === 'yes' ? 'votes_yes' : 'votes_no'
    const word = words.find(w => w.id === wordId)
    await supabase.from('banned_words').update({ [field]: (word[field] || 0) + 1 }).eq('id', wordId)
    setMyVotes(p => ({ ...p, [wordId]: v }))
    setWords(prev => prev.map(w => w.id === wordId ? { ...w, [field]: (w[field] || 0) + 1 } : w))
    toast.success('Voto registrato')
  }

  async function approve(wordId) {
    await supabase.from('banned_words').update({
      status: 'approved', reviewed_at: new Date().toISOString()
    }).eq('id', wordId)
    toast.success('Parola approvata — ora è vietata')
    await loadBannedWords() // aggiorna cache automod
    load()
  }

  async function reject(wordId) {
    await supabase.from('banned_words').update({
      status: 'rejected', reviewed_at: new Date().toISOString()
    }).eq('id', wordId)
    toast.success('Parola rifiutata')
    load()
  }

  async function addWord() {
    if (!newWord.trim()) { toast.error('Inserisci una parola'); return }
    setAdding(true)
    const { error } = await supabase.from('banned_words').insert({
      word: newWord.trim().toLowerCase(),
      proposed_by: user.id,
      status: 'approved' // admin aggiunge direttamente come approvata
    })
    setAdding(false)
    if (error) { toast.error(error.message); return }
    toast.success('Parola vietata aggiunta')
    await loadBannedWords() // aggiorna cache automod
    setNewWord(''); setShowAdd(false); load()
  }

  return (
    <div className={styles.page}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className={styles.titleRow}>
          <Shield size={20} color="var(--accent-2)" />
          <h2 className={styles.title}>Parole vietate</h2>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus size={15} /> Aggiungi
        </Button>
      </div>

      <div className={styles.filters}>
        {FILTERS.map(f => (
          <button key={f}
            className={[styles.filterBtn, filter === f ? styles.active : ''].join(' ')}
            onClick={() => setFilter(f)}>
            {LABELS[f]}
          </button>
        ))}
      </div>

      <div className={styles.tableWrap}>
        {words.length === 0 ? (
          <div className={styles.empty}>Nessuna parola in questa categoria</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Parola</th>
                <th>Proposta da</th>
                <th>Voti</th>
                {filter === 'pending' && <th>Azioni</th>}
              </tr>
            </thead>
            <tbody>
              {words.map(w => (
                <tr key={w.id}>
                  <td>
                    <code style={{
                      background: 'var(--bg-3)', padding: '2px 8px',
                      borderRadius: 5, fontSize: '0.85rem',
                      color: filter === 'approved' ? 'var(--danger)' : 'var(--text)'
                    }}>
                      {w.word}
                    </code>
                  </td>
                  <td style={{ fontSize: '0.82rem' }}>
                    {w.profiles ? `${w.profiles.nome} ${w.profiles.cognome}` : 'Admin'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <button
                        className={`${styles.actionBtn} ${myVotes[w.id] === 'yes' ? styles.btnApprove : styles.btnWarn}`}
                        onClick={() => vote(w.id, 'yes')}
                      >
                        <ThumbsUp size={12} style={{ display: 'inline', marginRight: 4 }} />{w.votes_yes || 0}
                      </button>
                      <button
                        className={`${styles.actionBtn} ${myVotes[w.id] === 'no' ? styles.btnReject : styles.btnWarn}`}
                        onClick={() => vote(w.id, 'no')}
                      >
                        <ThumbsDown size={12} style={{ display: 'inline', marginRight: 4 }} />{w.votes_no || 0}
                      </button>
                    </div>
                  </td>
                  {filter === 'pending' && (
                    <td>
                      <div className={styles.actions}>
                        <button className={`${styles.actionBtn} ${styles.btnApprove}`} onClick={() => approve(w.id)}>
                          <Check size={12} style={{ display: 'inline', marginRight: 4 }} />Approva
                        </button>
                        <button className={`${styles.actionBtn} ${styles.btnReject}`} onClick={() => reject(w.id)}>
                          <X size={12} style={{ display: 'inline', marginRight: 4 }} />Rifiuta
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="➕ Aggiungi parola vietata" size="sm">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-2)' }}>
            La parola viene aggiunta direttamente come attiva e il sistema la usa subito per il ban automatico.
          </p>
          <div className={styles.field}>
            <label>Parola</label>
            <input
              value={newWord}
              onChange={e => setNewWord(e.target.value)}
              placeholder="es. parolaccia"
              onKeyDown={e => e.key === 'Enter' && addWord()}
            />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setShowAdd(false)}>Annulla</Button>
            <Button loading={adding} onClick={addWord}>Aggiungi</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
