import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import { Flag } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { it } from 'date-fns/locale'
import toast from 'react-hot-toast'
import styles from './Admin.module.css'

const FILTERS = ['pending', 'resolved', 'dismissed']
const LABELS  = { pending: 'In attesa', resolved: 'Risolte', dismissed: 'Archiviate' }

export default function AdminReports() {
  const [reports, setReports] = useState([])
  const [filter, setFilter]   = useState('pending')
  const [modal, setModal]     = useState(null)
  const [note, setNote]       = useState('')

  async function load() {
    const { data } = await supabase
      .from('reports')
      .select('*, reporter:reporter_id(nome,cognome), reported:reported_user_id(nome,cognome)')
      .eq('status', filter)
      .order('created_at', { ascending: false })
    setReports(data || [])
  }

  useEffect(() => { load() }, [filter])

  async function resolve(status) {
    await supabase.from('reports').update({
      status,
      admin_note: note.trim() || null,
      resolved_at: new Date().toISOString()
    }).eq('id', modal.id)

    // Notifica chi ha segnalato
    await supabase.from('notifications').insert({
      user_id: modal.reporter_id,
      type: 'report_resolved',
      title: status === 'resolved' ? '✅ Segnalazione risolta' : '📁 Segnalazione archiviata',
      body: note.trim() || 'La tua segnalazione è stata gestita dall\'amministratore.',
      related_id: modal.id
    })

    toast.success(`Segnalazione ${status === 'resolved' ? 'risolta' : 'archiviata'}`)
    setModal(null); setNote(''); load()
  }

  return (
    <div className={styles.page}>
      <div className={styles.titleRow}>
        <Flag size={20} color="var(--danger)" />
        <h2 className={styles.title}>Segnalazioni</h2>
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
        {reports.length === 0 ? (
          <div className={styles.empty}>Nessuna segnalazione</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Motivo</th>
                <th>Da</th>
                <th>Verso</th>
                <th>Data</th>
                {filter === 'pending' && <th>Azioni</th>}
              </tr>
            </thead>
            <tbody>
              {reports.map(r => (
                <tr key={r.id}>
                  <td style={{ maxWidth: 240 }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text)', fontWeight: 500 }}>
                      {r.reason}
                    </div>
                    {r.admin_note && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--accent)', marginTop: 3 }}>
                        📝 {r.admin_note}
                      </div>
                    )}
                  </td>
                  <td>{r.reporter?.nome} {r.reporter?.cognome}</td>
                  <td>{r.reported ? `${r.reported.nome} ${r.reported.cognome}` : '—'}</td>
                  <td style={{ fontSize: '0.76rem', whiteSpace: 'nowrap' }}>
                    {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: it })}
                  </td>
                  {filter === 'pending' && (
                    <td>
                      <div className={styles.actions}>
                        <button className={`${styles.actionBtn} ${styles.btnApprove}`}
                          onClick={() => { setModal(r); setNote('') }}>
                          Gestisci
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

      <Modal open={!!modal} onClose={() => setModal(null)} title="📋 Gestisci segnalazione" size="sm">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: 'var(--bg-3)', borderRadius: 10, padding: '12px 14px', fontSize: '0.87rem', color: 'var(--text-2)' }}>
            {modal?.reason}
          </div>
          <div className={styles.field}>
            <label>Nota all'utente (opzionale)</label>
            <textarea value={note} onChange={e => setNote(e.target.value)}
              placeholder="Spiega come hai gestito la segnalazione..." rows={3} />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => resolve('dismissed')}>Archivia</Button>
            <Button variant="primary"  onClick={() => resolve('resolved')}>Segna risolta</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
