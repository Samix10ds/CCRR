import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Button from '../components/ui/Button'
import { Flag, Bug, Lightbulb, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'
import { it } from 'date-fns/locale'
import styles from './Reports.module.css'

const TYPES = [
  { id:'user',       label:'Utente',       icon:Flag,          color:'var(--danger)'  },
  { id:'bug',        label:'Bug sito',      icon:Bug,           color:'var(--warning)' },
  { id:'suggestion', label:'Suggerimento',  icon:Lightbulb,     color:'var(--accent)'  },
  { id:'other',      label:'Altro',         icon:AlertTriangle, color:'var(--text-2)'  },
]
const PRESETS = {
  user:       ['Insulti / linguaggio offensivo','Spam o contenuto ripetuto','Comportamento inappropriato','Contenuto falso o fuorviante'],
  bug:        ['La pagina non si carica','Errore dopo il login','Notifiche non arrivano','Problema con le immagini','Layout rotto su mobile'],
  suggestion: ['Aggiungere una nuova funzione','Migliorare il design','Aggiungere un nuovo tema','Migliorare le notifiche'],
  other:      [],
}
const STATUS_LABELS = { pending:{label:'In attesa',color:'var(--warning)'}, resolved:{label:'Risolta',color:'var(--success)'}, dismissed:{label:'Archiviata',color:'var(--text-3)'} }

export default function ReportsPage() {
  const { user } = useAuth()
  const [type, setType] = useState('user')
  const [preset, setPreset] = useState('')
  const [reason, setReason] = useState('')
  const [targetUid, setTargetUid] = useState('')
  const [loading, setLoading] = useState(false)
  const [myReports, setMyReports] = useState([])
  const [users, setUsers] = useState([])

  useEffect(() => {
    supabase.from('profiles').select('id,nome,cognome,classe').neq('id', user?.id).then(({ data }) => setUsers(data || []))
    loadMyReports()
  }, [user])

  async function loadMyReports() {
    const { data } = await supabase.from('reports').select('*, profiles:reported_user_id(nome,cognome)').eq('reporter_id', user?.id).order('created_at', { ascending:false })
    setMyReports(data || [])
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const finalReason = preset ? `${preset}${reason ? ': '+reason : ''}` : reason
    if (!finalReason.trim()) { toast.error('Inserisci un motivo'); return }
    setLoading(true)
    const { error } = await supabase.from('reports').insert({ reporter_id:user.id, reported_user_id:type==='user'?(targetUid||null):null, report_type:type, preset:preset||null, reason:finalReason.trim() })
    setLoading(false)
    if (error) { toast.error(error.message); return }
    toast.success('Segnalazione inviata!')
    setReason(''); setPreset(''); setTargetUid('')
    loadMyReports()
  }

  const selectedType = TYPES.find(t => t.id === type)

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.typeGrid}>
          {TYPES.map(t => (
            <button key={t.id} className={[styles.typeBtn, type===t.id?styles.typeBtnActive:''].join(' ')} style={{ '--tc':t.color }} onClick={() => { setType(t.id); setPreset(''); setReason('') }}>
              <t.icon size={18} /><span>{t.label}</span>
            </button>
          ))}
        </div>
        <form onSubmit={handleSubmit} className={styles.form}>
          {type === 'user' && (
            <div className={styles.field}>
              <label>Utente segnalato (opzionale)</label>
              <select value={targetUid} onChange={e => setTargetUid(e.target.value)}>
                <option value="">-- Segnalazione generica --</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.nome} {u.cognome} ({u.classe})</option>)}
              </select>
            </div>
          )}
          {PRESETS[type]?.length > 0 && (
            <div className={styles.field}>
              <label>Categoria rapida</label>
              <div className={styles.presetGrid}>
                {PRESETS[type].map(p => <button key={p} type="button" className={[styles.presetBtn, preset===p?styles.presetActive:''].join(' ')} onClick={() => setPreset(preset===p?'':p)}>{p}</button>)}
              </div>
            </div>
          )}
          <div className={styles.field}>
            <label>{preset ? 'Dettagli aggiuntivi (opzionale)' : 'Descrivi il problema *'}</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder={type==='bug'?'Cosa succede, su che dispositivo, quando si verifica...':type==='suggestion'?'Descrivi la tua idea per migliorare il sito...':'Descrivi il problema...'} rows={3} required={!preset} />
          </div>
          <Button type="submit" loading={loading} variant={type==='suggestion'?'outline':type==='bug'?'secondary':'danger'}>
            <selectedType.icon size={15} /> Invia {selectedType.label}
          </Button>
        </form>
      </div>

      {myReports.length > 0 && (
        <section>
          <h3 className={styles.sectionTitle}>Le tue segnalazioni</h3>
          <div className={styles.list}>
            {myReports.map(r => {
              const st = STATUS_LABELS[r.status] || STATUS_LABELS.pending
              const tp = TYPES.find(t => t.id === r.report_type) || TYPES[0]
              return (
                <div key={r.id} className={styles.reportItem}>
                  <div className={styles.reportHead}>
                    <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                      <span style={{ fontSize:'0.75rem', color:tp.color, fontWeight:700 }}>{tp.label.toUpperCase()}</span>
                      <span style={{ color:st.color, fontSize:'0.75rem', fontWeight:600 }}>{st.label}</span>
                    </div>
                    <span className={styles.time}>{formatDistanceToNow(new Date(r.created_at), { addSuffix:true, locale:it })}</span>
                  </div>
                  {r.profiles && <div className={styles.target}>Utente: {r.profiles.nome} {r.profiles.cognome}</div>}
                  <p className={styles.reason}>{r.reason}</p>
                  {r.admin_note && <p className={styles.adminNote}>📝 Admin: {r.admin_note}</p>}
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
