import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { CardBadgeFull } from '../../components/ui/CardBadge'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import { SPECIAL_RANKS } from '../../context/ThemeContext'
import { Users, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import styles from './Admin.module.css'

const CLASSI = ['Tutte','1A','1B','2A','2B','3A','3B']
const CARD_OPTIONS = [
  { value:'yellow', label:'🟡 Cartellino giallo' },
  { value:'orange', label:'🟠 Cartellino arancione' },
  { value:'red',    label:'🔴 Ban permanente' },
  { value:'green',  label:'🟢 Rimuovi cartellino' },
]

export default function AdminUsers() {
  const { user: adminUser } = useAuth()
  const [users, setUsers] = useState([])
  const [filter, setFilter] = useState('Tutte')
  const [search, setSearch] = useState('')
  const [warnModal, setWarnModal] = useState(null)
  const [rankModal, setRankModal] = useState(null)
  const [warnForm, setWarnForm] = useState({ card:'yellow', reason:'', banMins:30, appealEmail:'' })
  const [selectedRank, setSelectedRank] = useState('')

  async function load() {
    let q = supabase.from('profiles').select('*').order('cognome')
    if (filter !== 'Tutte') q = q.eq('classe', filter)
    const { data } = await q
    setUsers(data || [])
  }

  useEffect(() => { load() }, [filter])

  const filtered = users.filter(u => {
    const s = search.toLowerCase()
    return !s || `${u.nome} ${u.cognome}`.toLowerCase().includes(s)
  })

  async function applyWarn() {
    const { card, reason, banMins, appealEmail } = warnForm
    if (!reason.trim()) { toast.error('Inserisci un motivo'); return }
    await supabase.from('warnings').insert({ user_id:warnModal.id, admin_id:adminUser.id, card, reason:reason.trim(), ban_duration_minutes:card==='orange'?banMins:null, is_auto:false })
    const update = { card }
    if (card === 'orange') update.ban_until = new Date(Date.now()+banMins*60*1000).toISOString()
    if (card === 'red') { update.is_permanently_banned = true; if (appealEmail) update.appeal_email = appealEmail }
    if (card === 'green') { update.ban_until = null; update.is_permanently_banned = false }
    await supabase.from('profiles').update(update).eq('id', warnModal.id)
    await supabase.from('notifications').insert({ user_id:warnModal.id, type:'warning', title:`Cartellino ${card}`, body:`Motivo: ${reason}${card==='orange'?` — Ban per ${banMins} minuti`:''}` })
    toast.success(`Cartellino ${card} applicato`)
    setWarnModal(null); load()
  }

  async function applyRank() {
    await supabase.from('profiles').update({ special_rank: selectedRank || null }).eq('id', rankModal.id)
    toast.success(selectedRank ? `Rank "${selectedRank}" assegnato` : 'Rank rimosso')
    setRankModal(null); load()
  }

  async function changeRole(userId, newRole) {
    await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
    toast.success(`Ruolo cambiato in ${newRole}`)
    load()
  }

  return (
    <div className={styles.page}>
      <div className={styles.titleRow}><Users size={20} color="var(--accent)" /><h2 className={styles.title}>Gestione utenti</h2></div>
      <div style={{ display:'flex', gap:12, flexWrap:'wrap', alignItems:'center' }}>
        <div className={styles.filters}>
          {CLASSI.map(c => <button key={c} className={[styles.filterBtn, filter===c?styles.active:''].join(' ')} onClick={() => setFilter(c)}>{c}</button>)}
        </div>
        <div style={{ position:'relative', flex:'0 0 200px' }}>
          <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-3)' }} />
          <input placeholder="Cerca..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft:32, fontSize:'0.85rem' }} />
        </div>
      </div>
      <div className={styles.tableWrap}>
        {filtered.length === 0 ? <div className={styles.empty}>Nessun utente trovato</div> : (
          <table>
            <thead><tr><th>Nome</th><th>Classe</th><th>Ruolo</th><th>Stato</th><th>Cartellino</th><th>Azioni</th></tr></thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ fontWeight:600, color:'var(--text)' }}>{u.nome} {u.cognome}</div>
                    {u.special_rank && <div style={{ fontSize:'0.72rem', color:'var(--accent)' }}>✨ {u.special_rank}</div>}
                  </td>
                  <td>{u.classe}</td>
                  <td><span className={`${styles.tag} ${u.role==='admin'?styles.tagApproved:u.role==='mod'?styles.tagPending:''}`}>{u.role}</span></td>
                  <td>
                    {u.is_permanently_banned
                      ? <span style={{ color:'var(--danger)', fontSize:'0.8rem', fontWeight:600 }}>🔴 Bannato</span>
                      : u.ban_until && new Date(u.ban_until) > new Date()
                        ? <span style={{ color:'var(--warning)', fontSize:'0.8rem', fontWeight:600 }}>⏱ Temp. ban</span>
                        : <span style={{ color:'var(--success)', fontSize:'0.8rem' }}>✓ Attivo</span>
                    }
                  </td>
                  <td><CardBadgeFull card={u.card} /></td>
                  <td>
                    <div className={styles.actions}>
                      <button className={`${styles.actionBtn} ${styles.btnWarn}`} onClick={() => { setWarnModal(u); setWarnForm({ card:'yellow', reason:'', banMins:30, appealEmail:'' }) }}>Cartellino</button>
                      <button className={`${styles.actionBtn} ${styles.btnApprove}`} onClick={() => { setRankModal(u); setSelectedRank(u.special_rank||'') }}>Rank</button>
                      {u.role === 'user' && <button className={`${styles.actionBtn} ${styles.btnApprove}`} onClick={() => changeRole(u.id,'mod')}>+ Mod</button>}
                      {u.role === 'mod' && <button className={`${styles.actionBtn} ${styles.btnApprove}`} onClick={() => changeRole(u.id,'admin')}>+ Admin</button>}
                      {u.role !== 'user' && u.id !== adminUser?.id && <button className={`${styles.actionBtn} ${styles.btnReject}`} onClick={() => changeRole(u.id,'user')}>− Ruolo</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal cartellino */}
      <Modal open={!!warnModal} onClose={() => setWarnModal(null)} title={`⚠️ Cartellino — ${warnModal?.nome} ${warnModal?.cognome}`} size="sm">
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div className={styles.field}><label>Tipo</label>
            <select value={warnForm.card} onChange={e => setWarnForm(p=>({...p,card:e.target.value}))}>
              {CARD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          {warnForm.card === 'orange' && <div className={styles.field}><label>Durata ban (minuti)</label><input type="number" min={1} max={60} value={warnForm.banMins} onChange={e => setWarnForm(p=>({...p,banMins:parseInt(e.target.value)}))} /></div>}
          {warnForm.card === 'red' && <div className={styles.field}><label>Email appello (opzionale)</label><input type="email" value={warnForm.appealEmail} onChange={e => setWarnForm(p=>({...p,appealEmail:e.target.value}))} placeholder="admin@example.com" /></div>}
          <div className={styles.field}><label>Motivo *</label><textarea value={warnForm.reason} onChange={e => setWarnForm(p=>({...p,reason:e.target.value}))} placeholder="Spiega il motivo..." rows={3} required /></div>
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
            <Button variant="secondary" onClick={() => setWarnModal(null)}>Annulla</Button>
            <Button variant="danger" onClick={applyWarn}>Applica</Button>
          </div>
        </div>
      </Modal>

      {/* Modal rank speciale */}
      <Modal open={!!rankModal} onClose={() => setRankModal(null)} title={`✨ Rank speciale — ${rankModal?.nome} ${rankModal?.cognome}`} size="sm">
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <p style={{ fontSize:'0.85rem', color:'var(--text-2)' }}>I rank temporali (Novellino, Membro, ecc.) sono automatici e non modificabili.</p>
          <div className={styles.field}><label>Rank speciale</label>
            <select value={selectedRank} onChange={e => setSelectedRank(e.target.value)}>
              <option value="">-- Nessun rank speciale --</option>
              {SPECIAL_RANKS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
            <Button variant="secondary" onClick={() => setRankModal(null)}>Annulla</Button>
            <Button onClick={applyRank}>Salva</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
