import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Button from '../components/ui/Button'
import { Flag, Bug, Lightbulb, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import styles from './Reports.module.css'

const USER_PRESETS   = ['Insulti', 'Spam', 'Comportamento scorretto', 'Minacce', 'Altro']
const SITE_BUG_PRE   = ['Pagina non carica', 'Errore al login', 'Dati non salvati', 'Layout rotto', 'Notifiche non arrivano', 'Altro']
const SITE_SUGG_PRE  = ['Nuova funzione', 'Miglioramento UI', 'Nuova sezione', 'Altro']

export default function ReportsPage() {
  const { user, profile } = useAuth()
  const [tab, setTab]     = useState('user')   // 'user' | 'bug' | 'suggestion'
  const [loading, setLoading] = useState(false)

  // Form segnalazione utente
  const [uForm, setUForm] = useState({ reported_user_id: '', preset: '', reason: '' })
  const [users, setUsers]  = useState([])
  const [myReports, setMyReports] = useState([])

  // Form bug / suggerimento
  const [sForm, setSForm] = useState({ preset: '', title: '', description: '' })
  const [mySiteReports, setMySiteReports] = useState([])

  // Carica utenti e storico al mount
  useState(() => {
    supabase.from('profiles').select('id,nome,cognome,classe').neq('id', user?.id)
      .then(({ data }) => setUsers(data || []))
    supabase.from('reports').select('*,profiles:reported_user_id(nome,cognome)')
      .eq('reporter_id', user?.id).order('created_at', { ascending: false })
      .then(({ data }) => setMyReports(data || []))
    supabase.from('site_reports').select('*').eq('user_id', user?.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setMySiteReports(data || []))
  })

  async function sendUserReport(e) {
    e.preventDefault()
    const reason = uForm.preset || uForm.reason
    if (!reason.trim()) { toast.error('Seleziona o scrivi un motivo'); return }
    setLoading(true)
    const { error } = await supabase.from('reports').insert({
      reporter_id: user.id,
      reported_user_id: uForm.reported_user_id || null,
      reason: `${uForm.preset ? `[${uForm.preset}] ` : ''}${uForm.reason}`.trim()
    })
    setLoading(false)
    if (error) { toast.error(error.message); return }
    toast.success('Segnalazione inviata!')
    setUForm({ reported_user_id: '', preset: '', reason: '' })
    const { data } = await supabase.from('reports')
      .select('*,profiles:reported_user_id(nome,cognome)')
      .eq('reporter_id', user.id).order('created_at', { ascending: false })
    setMyReports(data || [])
  }

  async function sendSiteReport(e) {
    e.preventDefault()
    if (!sForm.title.trim() || !sForm.description.trim()) { toast.error('Compila tutti i campi'); return }
    setLoading(true)
    const { error } = await supabase.from('site_reports').insert({
      user_id: user.id,
      type: tab,
      preset: sForm.preset || null,
      title: sForm.title.trim(),
      description: sForm.description.trim()
    })
    setLoading(false)
    if (error) { toast.error(error.message); return }
    toast.success(tab === 'bug' ? 'Bug segnalato, grazie!' : 'Suggerimento inviato!')
    setSForm({ preset: '', title: '', description: '' })
    const { data } = await supabase.from('site_reports').select('*').eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setMySiteReports(data || [])
  }

  const STATUS_LABELS = {
    pending:     { label: 'In attesa',    color: 'var(--warning)' },
    resolved:    { label: 'Risolta',      color: 'var(--success)' },
    dismissed:   { label: 'Archiviata',   color: 'var(--text-3)'  },
    in_progress: { label: 'In corso',     color: 'var(--info)'    },
  }

  const TABS = [
    { id: 'user',       icon: Flag,        label: 'Segnala utente' },
    { id: 'bug',        icon: Bug,         label: 'Segnala bug' },
    { id: 'suggestion', icon: Lightbulb,   label: 'Suggerimento' },
  ]

  const presets = tab === 'bug' ? SITE_BUG_PRE : SITE_SUGG_PRE

  return (
    <div className={styles.page}>
      {/* Tab selector */}
      <div className={styles.tabRow}>
        {TABS.map(t => (
          <button key={t.id}
            className={[styles.tab, tab === t.id ? styles.tabActive : ''].join(' ')}
            onClick={() => setTab(t.id)}>
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {/* Segnalazione utente */}
      {tab === 'user' && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <Flag size={18} color="var(--danger)" />
            <h3>Segnala un utente</h3>
          </div>
          <form onSubmit={sendUserReport} className={styles.form}>
            <div className={styles.field}>
              <label>Utente (opzionale)</label>
              <select value={uForm.reported_user_id}
                onChange={e => setUForm(p => ({ ...p, reported_user_id: e.target.value }))}>
                <option value="">-- Segnalazione generica --</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.nome} {u.cognome} ({u.classe})</option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label>Motivo preset</label>
              <div className={styles.presets}>
                {USER_PRESETS.map(p => (
                  <button key={p} type="button"
                    className={[styles.preset, uForm.preset === p ? styles.presetActive : ''].join(' ')}
                    onClick={() => setUForm(prev => ({ ...prev, preset: prev.preset === p ? '' : p }))}>
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.field}>
              <label>Dettagli aggiuntivi</label>
              <textarea value={uForm.reason} rows={3} maxLength={500}
                onChange={e => setUForm(p => ({ ...p, reason: e.target.value }))}
                placeholder="Descrivi cosa è successo..." />
            </div>
            <Button type="submit" loading={loading} variant="danger">
              <Flag size={14} /> Invia segnalazione
            </Button>
          </form>
        </div>
      )}

      {/* Bug / Suggerimento */}
      {(tab === 'bug' || tab === 'suggestion') && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            {tab === 'bug' ? <Bug size={18} color="var(--danger)" /> : <Lightbulb size={18} color="var(--accent)" />}
            <h3>{tab === 'bug' ? 'Segnala un bug del sito' : 'Invia un suggerimento'}</h3>
          </div>
          <form onSubmit={sendSiteReport} className={styles.form}>
            <div className={styles.field}>
              <label>Categoria</label>
              <div className={styles.presets}>
                {presets.map(p => (
                  <button key={p} type="button"
                    className={[styles.preset, sForm.preset === p ? styles.presetActive : ''].join(' ')}
                    onClick={() => setSForm(prev => ({ ...prev, preset: prev.preset === p ? '' : p, title: prev.title || p }))}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.field}>
              <label>Titolo *</label>
              <input value={sForm.title} onChange={e => setSForm(p => ({ ...p, title: e.target.value }))}
                placeholder={tab === 'bug' ? 'es. La pagina idee non carica' : 'es. Aggiungere i tag alle idee'}
                maxLength={100} required />
            </div>
            <div className={styles.field}>
              <label>Descrizione *</label>
              <textarea value={sForm.description} rows={4} maxLength={800}
                onChange={e => setSForm(p => ({ ...p, description: e.target.value }))}
                placeholder={tab === 'bug' ? 'Quando succede? Cosa hai fatto?' : 'Spiega la tua idea...'} required />
            </div>
            <Button type="submit" loading={loading}
              variant={tab === 'bug' ? 'danger' : 'primary'}>
              {tab === 'bug' ? <><Bug size={14} /> Segnala bug</> : <><Lightbulb size={14} /> Invia suggerimento</>}
            </Button>
          </form>
        </div>
      )}

      {/* Storico segnalazioni utente */}
      {tab === 'user' && myReports.length > 0 && (
        <section>
          <h3 className={styles.sectionTitle}>Le tue segnalazioni</h3>
          <div className={styles.list}>
            {myReports.map(r => {
              const st = STATUS_LABELS[r.status] || STATUS_LABELS.pending
              return (
                <div key={r.id} className={styles.reportItem}>
                  <div className={styles.reportHead}>
                    <span style={{ color: st.color, fontSize: '0.78rem', fontWeight: 600 }}>{st.label}</span>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-3)', marginLeft: 'auto' }}>
                      {new Date(r.created_at).toLocaleDateString('it-IT')}
                    </span>
                  </div>
                  {r.profiles && <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-2)' }}>
                    Utente: {r.profiles.nome} {r.profiles.cognome}
                  </div>}
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-2)' }}>{r.reason}</p>
                  {r.admin_note && <p style={{ fontSize: '0.8rem', color: 'var(--accent)', marginTop: 4,
                    padding: '6px 10px', background: 'var(--bg-3)', borderRadius: 8 }}>
                    📝 {r.admin_note}</p>}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Storico bug/suggerimenti */}
      {(tab === 'bug' || tab === 'suggestion') && mySiteReports.filter(r => r.type === tab).length > 0 && (
        <section>
          <h3 className={styles.sectionTitle}>I tuoi invii</h3>
          <div className={styles.list}>
            {mySiteReports.filter(r => r.type === tab).map(r => {
              const st = STATUS_LABELS[r.status] || STATUS_LABELS.pending
              return (
                <div key={r.id} className={styles.reportItem}>
                  <div className={styles.reportHead}>
                    <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.88rem' }}>{r.title}</span>
                    <span style={{ color: st.color, fontSize: '0.76rem', fontWeight: 600, marginLeft: 'auto' }}>{st.label}</span>
                  </div>
                  <p style={{ fontSize: '0.83rem', color: 'var(--text-2)' }}>{r.description}</p>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
