import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Button from '../components/ui/Button'
import { Flag, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'
import { it } from 'date-fns/locale'
import styles from './Reports.module.css'

export default function ReportsPage() {
  const { user, profile } = useAuth()
  const [form, setForm] = useState({ reported_user_id: '', reason: '' })
  const [loading, setLoading] = useState(false)
  const [myReports, setMyReports] = useState([])
  const [users, setUsers] = useState([])

  useEffect(() => {
    // Carica utenti della stessa classe per segnalare
    supabase.from('profiles').select('id,nome,cognome,classe')
      .neq('id', user?.id).then(({ data }) => setUsers(data || []))

    // Carica segnalazioni dell'utente
    supabase.from('reports').select('*,profiles!reported_user_id(nome,cognome)')
      .eq('reporter_id', user?.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setMyReports(data || []))
  }, [user])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.reason.trim()) { toast.error('Inserisci un motivo'); return }

    setLoading(true)
    const { error } = await supabase.from('reports').insert({
      reporter_id: user.id,
      reported_user_id: form.reported_user_id || null,
      reason: form.reason.trim()
    })
    setLoading(false)

    if (error) { toast.error(error.message); return }
    toast.success('Segnalazione inviata!')
    setForm({ reported_user_id: '', reason: '' })

    // Ricarica
    const { data } = await supabase.from('reports').select('*,profiles!reported_user_id(nome,cognome)')
      .eq('reporter_id', user.id).order('created_at', { ascending: false })
    setMyReports(data || [])
  }

  const STATUS_LABELS = {
    pending:   { label: 'In attesa', color: 'var(--warning)' },
    resolved:  { label: 'Risolta',   color: 'var(--success)' },
    dismissed: { label: 'Archiviata', color: 'var(--text-3)' },
  }

  return (
    <div className={styles.page}>
      {/* Form */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <Flag size={20} color="var(--danger)" />
          <h3>Invia una segnalazione</h3>
        </div>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label>Utente segnalato (opzionale)</label>
            <select value={form.reported_user_id} onChange={e => setForm(p => ({ ...p, reported_user_id: e.target.value }))}>
              <option value="">-- Segnalazione generica --</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.nome} {u.cognome} ({u.classe})</option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label>Motivo *</label>
            <textarea
              value={form.reason}
              onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
              placeholder="Descrivi il problema..."
              rows={4}
              required
            />
          </div>
          <Button type="submit" loading={loading} variant="danger">
            <Flag size={15} /> Invia segnalazione
          </Button>
        </form>
      </div>

      {/* Storico */}
      {myReports.length > 0 && (
        <section>
          <h3 className={styles.sectionTitle}>Le tue segnalazioni</h3>
          <div className={styles.list}>
            {myReports.map(r => {
              const st = STATUS_LABELS[r.status] || STATUS_LABELS.pending
              return (
                <div key={r.id} className={styles.reportItem}>
                  <div className={styles.reportHead}>
                    <span style={{ color: st.color, fontSize: '0.78rem', fontWeight: 600 }}>{st.label}</span>
                    <span className={styles.time}>
                      {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: it })}
                    </span>
                  </div>
                  {r.profiles && (
                    <div className={styles.target}>Utente: {r.profiles.nome} {r.profiles.cognome}</div>
                  )}
                  <p className={styles.reason}>{r.reason}</p>
                  {r.admin_note && (
                    <p className={styles.adminNote}>📝 Admin: {r.admin_note}</p>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
