import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { notifyWarning } from '../../lib/notifications'
import { useAuth } from '../../context/AuthContext'
import { CardBadgeFull } from '../../components/ui/CardBadge'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import { Users, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import styles from './Admin.module.css'

const CLASSI = ['Tutte', '1A', '1B', '2A', '2B', '3A', '3B']

const CARD_OPTIONS = [
  { value: 'yellow', label: '🟡 Cartellino giallo', banMins: null },
  { value: 'orange', label: '🟠 Cartellino arancione', banMins: 30 },
  { value: 'red',    label: '🔴 Ban permanente', banMins: null },
  { value: 'green',  label: '🟢 Rimuovi cartellino', banMins: null },
]

export default function AdminUsers() {
  const { user: adminUser } = useAuth()
  const [users, setUsers] = useState([])
  const [filter, setFilter] = useState('Tutte')
  const [search, setSearch] = useState('')
  const [warnModal, setWarnModal] = useState(null)
  const [warnForm, setWarnForm] = useState({ card: 'yellow', reason: '', banMins: 30, appealEmail: '' })

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
    const target = warnModal
    const { card, reason, banMins } = warnForm
    if (!reason.trim()) { toast.error('Inserisci un motivo'); return }

    // Inserisci warning
    await supabase.from('warnings').insert({
      user_id: target.id,
      admin_id: adminUser.id,
      card,
      reason: reason.trim(),
      ban_duration_minutes: card === 'orange' ? banMins : null,
      is_auto: false
    })

    // Aggiorna profilo
    const update = { card }
    if (card === 'orange') {
      update.ban_until = new Date(Date.now() + banMins * 60 * 1000).toISOString()
    }
    if (card === 'red') {
      update.is_permanently_banned = true
      if (warnForm.appealEmail) update.appeal_email = warnForm.appealEmail
    }
    if (card === 'green') {
      update.ban_until = null
      update.is_permanently_banned = false
    }

    await supabase.from('profiles').update(update).eq('id', target.id)
    await notifyWarning(target.id, card, reason, card === 'orange' ? banMins : null)

    toast.success(`Cartellino ${card} applicato a ${target.nome}`)
    setWarnModal(null)
    load()
  }

  async function makeAdmin(userId, isAdmin) {
    await supabase.from('profiles').update({ role: isAdmin ? 'user' : 'admin' }).eq('id', userId)
    toast.success(isAdmin ? 'Rimosso da admin' : 'Promosso ad admin')
    load()
  }

  return (
    <div className={styles.page}>
      <div className={styles.titleRow}>
        <Users size={20} color="var(--accent)" />
        <h2 className={styles.title}>Gestione utenti</h2>
      </div>

      {/* Filtri + ricerca */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className={styles.filters}>
          {CLASSI.map(c => (
            <button key={c}
              className={[styles.filterBtn, filter === c ? styles.active : ''].join(' ')}
              onClick={() => setFilter(c)}>{c}</button>
          ))}
        </div>
        <div style={{ position: 'relative', flex: '0 0 200px' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
          <input
            placeholder="Cerca..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 32, fontSize: '0.85rem' }}
          />
        </div>
      </div>

      <div className={styles.tableWrap}>
        {filtered.length === 0 ? (
          <div className={styles.empty}>Nessun utente trovato</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Classe</th>
                <th>Ruolo</th>
                <th>Stato</th>
                <th>Cartellino</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600, color: 'var(--text)' }}>
                    {u.nome} {u.cognome}
                  </td>
                  <td>{u.classe}</td>
                  <td>
                    <span className={`${styles.tag} ${u.role === 'admin' ? styles.tagApproved : styles.tagPending}`}>
                      {u.role}
                    </span>
                  </td>
                  <td>
                    {u.is_permanently_banned
                      ? <span style={{ color: 'var(--danger)', fontSize: '0.8rem', fontWeight: 600 }}>🔴 Bannato</span>
                      : u.ban_until && new Date(u.ban_until) > new Date()
                        ? <span style={{ color: 'var(--warning)', fontSize: '0.8rem', fontWeight: 600 }}>⏱ Temp. ban</span>
                        : <span style={{ color: 'var(--success)', fontSize: '0.8rem' }}>✓ Attivo</span>
                    }
                  </td>
                  <td><CardBadgeFull card={u.card} /></td>
                  <td>
                    <div className={styles.actions}>
                      <button
                        className={`${styles.actionBtn} ${styles.btnWarn}`}
                        onClick={() => {
                          setWarnModal(u)
                          setWarnForm({ card: 'yellow', reason: '', banMins: 30, appealEmail: '' })
                        }}
                      >
                        Cartellino
                      </button>
                      {u.role !== 'admin' && (
                        <button
                          className={`${styles.actionBtn} ${styles.btnApprove}`}
                          onClick={() => makeAdmin(u.id, false)}
                        >
                          + Admin
                        </button>
                      )}
                      {u.role === 'admin' && u.id !== adminUser?.id && (
                        <button
                          className={`${styles.actionBtn} ${styles.btnReject}`}
                          onClick={() => makeAdmin(u.id, true)}
                        >
                          − Admin
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal cartellino */}
      <Modal
        open={!!warnModal}
        onClose={() => setWarnModal(null)}
        title={`⚠️ Cartellino — ${warnModal?.nome} ${warnModal?.cognome}`}
        size="sm"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className={styles.field}>
            <label>Tipo cartellino</label>
            <select
              value={warnForm.card}
              onChange={e => setWarnForm(p => ({ ...p, card: e.target.value }))}
            >
              {CARD_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {warnForm.card === 'orange' && (
            <div className={styles.field}>
              <label>Durata ban (minuti)</label>
              <input
                type="number"
                min={1} max={60}
                value={warnForm.banMins}
                onChange={e => setWarnForm(p => ({ ...p, banMins: parseInt(e.target.value) }))}
              />
            </div>
          )}

          <div className={styles.field}>
            <label>Motivo *</label>
            <textarea
              value={warnForm.reason}
              onChange={e => setWarnForm(p => ({ ...p, reason: e.target.value }))}
              placeholder="Spiega il motivo del cartellino..."
              rows={3}
              required
            />
          </div>

          {warnForm.card === 'red' && (
            <div className={styles.field}>
              <label>Email per appello (opzionale)</label>
              <input
                type="email"
                value={warnForm.appealEmail}
                onChange={e => setWarnForm(p => ({ ...p, appealEmail: e.target.value }))}
                placeholder="admin@example.com"
              />
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setWarnModal(null)}>Annulla</Button>
            <Button variant="danger" onClick={applyWarn}>Applica</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
