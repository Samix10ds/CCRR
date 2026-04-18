import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { notifyIdeaResult } from '../../lib/notifications'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import { Lightbulb, Check, X } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { it } from 'date-fns/locale'
import toast from 'react-hot-toast'
import styles from './Admin.module.css'

const FILTERS = ['pending', 'approved', 'rejected']

export default function AdminIdeas() {
  const [ideas, setIdeas] = useState([])
  const [filter, setFilter] = useState('pending')
  const [loading, setLoading] = useState(true)
  const [rejectModal, setRejectModal] = useState(null) // idea object
  const [rejectNote, setRejectNote] = useState('')

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('ideas')
      .select('*, profiles(nome,cognome,classe)')
      .eq('status', filter)
      .order('created_at', { ascending: false })
    setIdeas(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [filter])

  async function approve(idea) {
    await supabase.from('ideas').update({
      status: 'approved',
      reviewed_at: new Date().toISOString()
    }).eq('id', idea.id)

    await notifyIdeaResult(idea.user_id, idea.title, true)
    toast.success('Idea approvata!')
    load()
  }

  async function reject() {
    if (!rejectModal) return
    await supabase.from('ideas').update({
      status: 'rejected',
      admin_note: rejectNote.trim() || null,
      reviewed_at: new Date().toISOString()
    }).eq('id', rejectModal.id)

    await notifyIdeaResult(rejectModal.user_id, rejectModal.title, false, rejectNote)
    toast.success('Idea rifiutata.')
    setRejectModal(null)
    setRejectNote('')
    load()
  }

  const LABEL = { pending: 'In attesa', approved: 'Approvate', rejected: 'Rifiutate' }

  return (
    <div className={styles.page}>
      <div className={styles.titleRow}>
        <Lightbulb size={20} color="var(--warning)" />
        <h2 className={styles.title}>Idee — {LABEL[filter]}</h2>
      </div>

      {/* Filtri */}
      <div className={styles.filters}>
        {FILTERS.map(f => (
          <button
            key={f}
            className={[styles.filterBtn, filter === f ? styles.active : ''].join(' ')}
            onClick={() => setFilter(f)}
          >
            {LABEL[f]}
          </button>
        ))}
      </div>

      <div className={styles.tableWrap}>
        {loading ? (
          <div className={styles.empty}>Caricamento...</div>
        ) : ideas.length === 0 ? (
          <div className={styles.empty}>Nessuna idea in questa categoria</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Idea</th>
                <th>Autore</th>
                <th>Classe</th>
                <th>Data</th>
                <th>Voti</th>
                {filter === 'pending' && <th>Azioni</th>}
              </tr>
            </thead>
            <tbody>
              {ideas.map(idea => (
                <tr key={idea.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>
                      {idea.title}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', maxWidth: 260,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {idea.content}
                    </div>
                  </td>
                  <td>{idea.profiles?.nome} {idea.profiles?.cognome}</td>
                  <td>{idea.classe}</td>
                  <td style={{ whiteSpace: 'nowrap', fontSize: '0.76rem' }}>
                    {formatDistanceToNow(new Date(idea.created_at), { addSuffix: true, locale: it })}
                  </td>
                  <td>
                    <span style={{ color: 'var(--success)', fontWeight: 600 }}>👍 {idea.votes_yes}</span>
                    {' / '}
                    <span style={{ color: 'var(--danger)', fontWeight: 600 }}>👎 {idea.votes_no}</span>
                  </td>
                  {filter === 'pending' && (
                    <td>
                      <div className={styles.actions}>
                        <button className={`${styles.actionBtn} ${styles.btnApprove}`} onClick={() => approve(idea)}>
                          <Check size={13} style={{ display: 'inline', marginRight: 4 }} />Approva
                        </button>
                        <button className={`${styles.actionBtn} ${styles.btnReject}`}
                          onClick={() => { setRejectModal(idea); setRejectNote('') }}>
                          <X size={13} style={{ display: 'inline', marginRight: 4 }} />Rifiuta
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

      {/* Modal rifiuto */}
      <Modal open={!!rejectModal} onClose={() => setRejectModal(null)} title="❌ Rifiuta idea" size="sm">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-2)' }}>
            Stai rifiutando: <strong style={{ color: 'var(--text)' }}>{rejectModal?.title}</strong>
          </p>
          <div className={styles.field}>
            <label>Motivazione (opzionale)</label>
            <textarea
              value={rejectNote}
              onChange={e => setRejectNote(e.target.value)}
              placeholder="Spiega all'utente perché l'idea è stata rifiutata..."
              rows={3}
            />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setRejectModal(null)}>Annulla</Button>
            <Button variant="danger" onClick={reject}>Conferma rifiuto</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
