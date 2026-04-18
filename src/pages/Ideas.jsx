import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { checkText, applyAutoBan } from '../lib/automod'
import { notifyAdminNewIdea } from '../lib/notifications'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import {
  ThumbsUp, ThumbsDown, Plus, Lightbulb, Image, X,
  Check, MessageCircle, Flag, Pencil, Paperclip, ChevronDown, ChevronUp
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { it } from 'date-fns/locale'
import toast from 'react-hot-toast'
import styles from './Ideas.module.css'

const CLASSI = ['Tutte', '1A', '1B', '2A', '2B', '3A', '3B']

function RoleChip({ role }) {
  if (!role || role === 'user') return null
  const map = {
    admin: { label: 'Admin', color: '#ff4d6d' },
    mod:   { label: 'Mod',   color: '#ffb830' },
  }
  const r = map[role]
  if (!r) return null
  return (
    <span style={{
      fontSize: '0.65rem', fontWeight: 800, padding: '1px 7px', borderRadius: 20,
      background: r.color + '22', color: r.color, border: `1px solid ${r.color}55`,
    }}>{r.label}</span>
  )
}

// ── Sezione commenti ──────────────────────────────────────────────────────
function Comments({ ideaId, isAdmin, isMod }) {
  const { user } = useAuth()
  const [comments, setComments] = useState([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!loaded) return
    supabase.from('comments')
      .select('*, profiles:user_id(nome,cognome,role)')
      .eq('idea_id', ideaId)
      .order('created_at')
      .then(({ data }) => setComments(data || []))

    const ch = supabase.channel(`comments_${ideaId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'comments',
        filter: `idea_id=eq.${ideaId}`
      }, ({ new: c }) => {
        supabase.from('comments')
          .select('*, profiles:user_id(nome,cognome,role)')
          .eq('id', c.id).single()
          .then(({ data }) => { if (data) setComments(p => [...p, data]) })
      })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [ideaId, loaded])

  async function send() {
    if (!text.trim()) return
    setSending(true)
    const { flagged, words } = checkText(text)
    if (flagged) {
      await applyAutoBan(user.id, words)
      toast.error('Commento non consentito.')
      setSending(false); return
    }
    const { error } = await supabase.from('comments').insert({
      idea_id: ideaId, user_id: user.id, content: text.trim()
    })
    if (!error) setText('')
    else toast.error(error.message)
    setSending(false)
  }

  async function del(id) {
    await supabase.from('comments').delete().eq('id', id)
    setComments(p => p.filter(c => c.id !== id))
  }

  if (!loaded) {
    return (
      <button className={styles.loadComments} onClick={() => setLoaded(true)}>
        Carica commenti
      </button>
    )
  }

  return (
    <div className={styles.comments}>
      {comments.length === 0 && (
        <p style={{ fontSize: '0.8rem', color: 'var(--text-3)', textAlign: 'center', padding: '8px 0' }}>
          Nessun commento ancora
        </p>
      )}
      {comments.map(c => (
        <div key={c.id} className={styles.comment}>
          <div className={styles.commentHead}>
            <span className={styles.commentAuthor}>
              {c.profiles?.nome} {c.profiles?.cognome}
            </span>
            <RoleChip role={c.profiles?.role} />
            <span className={styles.commentTime}>
              {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: it })}
            </span>
            {(isAdmin || isMod || c.user_id === user?.id) && (
              <button className={styles.delComment} onClick={() => del(c.id)}>×</button>
            )}
          </div>
          <p className={styles.commentText}>{c.content}</p>
        </div>
      ))}
      <div className={styles.commentInput}>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Scrivi un commento..."
          maxLength={500}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          style={{ fontSize: '0.88rem' }}
        />
        <Button size="sm" onClick={send} loading={sending} disabled={!text.trim()}>
          Invia
        </Button>
      </div>
    </div>
  )
}

// ── Card idea ─────────────────────────────────────────────────────────────
function IdeaCard({ idea, myVote, isAdmin, isMod, currentUserId, onVote, onReact, onRefresh }) {
  const [showComments, setShowComments] = useState(false)
  const [reporting, setReporting] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({ title: idea.title, content: idea.content })

  const isOwner = idea.author_id === currentUserId || idea.user_id === currentUserId
  const canEdit = isOwner

  const statusMap = {
    pending:  { label: 'In attesa', color: 'var(--warning)' },
    approved: { label: '✅ Approvata', color: 'var(--success)' },
    rejected: { label: '❌ Rifiutata', color: 'var(--danger)' },
  }
  const st = statusMap[idea.status] || statusMap.pending

  async function saveEdit() {
    if (!editForm.title.trim() || !editForm.content.trim()) return
    const { error } = await supabase.from('ideas')
      .update({ title: editForm.title.trim(), content: editForm.content.trim() })
      .eq('id', idea.id)
    if (error) { toast.error(error.message); return }
    toast.success('Idea modificata!')
    setEditing(false)
    onRefresh()
  }

  async function submitReport() {
    if (!reportReason.trim()) return
    await supabase.from('reports').insert({
      reporter_id: currentUserId,
      reported_idea_id: idea.id,
      reason: reportReason.trim(),
      report_type: 'user',
    })
    toast.success('Segnalazione inviata')
    setReporting(false)
    setReportReason('')
  }

  return (
    <div className={[
      styles.card,
      idea.status === 'approved' ? styles.cardApproved : '',
      idea.status === 'rejected' ? styles.cardRejected : '',
    ].join(' ')}>

      {/* Header */}
      <div className={styles.cardHead}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span className={styles.classe}>{idea.classe}</span>
          <span style={{
            fontSize: '0.72rem', fontWeight: 700,
            color: st.color,
            background: `color-mix(in srgb, ${st.color} 15%, transparent)`,
            padding: '2px 9px', borderRadius: 20,
          }}>{st.label}</span>
          {idea.is_votable && (
            <span style={{
              fontSize: '0.72rem', color: 'var(--info)',
              background: 'color-mix(in srgb, var(--info) 15%, transparent)',
              padding: '2px 9px', borderRadius: 20, fontWeight: 700,
            }}>🗳 Votazione</span>
          )}
        </div>
        <span className={styles.time}>
          {formatDistanceToNow(new Date(idea.created_at), { addSuffix: true, locale: it })}
        </span>
      </div>

      {/* Contenuto — editing inline */}
      {editing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: '8px 0' }}>
          <input value={editForm.title} maxLength={100}
            onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} />
          <textarea value={editForm.content} rows={4} maxLength={800}
            onChange={e => setEditForm(p => ({ ...p, content: e.target.value }))} />
          <div style={{ display: 'flex', gap: 8 }}>
            <Button size="sm" onClick={saveEdit}>Salva</Button>
            <Button size="sm" variant="secondary" onClick={() => setEditing(false)}>Annulla</Button>
          </div>
        </div>
      ) : (
        <>
          <h3 className={styles.cardTitle}>{idea.title}</h3>
          <p className={styles.cardContent}>{idea.content}</p>
        </>
      )}

      {idea.image_url && (
        <img src={idea.image_url} alt="Allegato" className={styles.ideaImage}
          onError={e => e.target.style.display = 'none'} />
      )}
      {idea.file_url && (
        <a href={idea.file_url} target="_blank" rel="noreferrer" className={styles.fileLink}>
          <Paperclip size={13} /> {idea.file_name || 'Allegato'}
        </a>
      )}
      {idea.admin_note && idea.status === 'rejected' && (
        <div className={styles.adminNote}>Motivazione: {idea.admin_note}</div>
      )}

      {/* Footer */}
      <div className={styles.cardFoot}>
        <span className={styles.author}>
          {idea.profiles ? `${idea.profiles.nome} ${idea.profiles.cognome}` : 'Utente sconosciuto'}
          {idea.profiles?.role && <RoleChip role={idea.profiles.role} />}
        </span>

        <div className={styles.actions}>
          {/* Like/Dislike */}
          <button
            className={[styles.voteBtn, myVote === 'yes' ? styles.votedYes : ''].join(' ')}
            onClick={() => onVote(idea.id, 'yes')}>
            <ThumbsUp size={14} /> {idea.votes_yes || 0}
          </button>
          <button
            className={[styles.voteBtn, myVote === 'no' ? styles.votedNo : ''].join(' ')}
            onClick={() => onVote(idea.id, 'no')}>
            <ThumbsDown size={14} /> {idea.votes_no || 0}
          </button>

          {/* Commenti */}
          <button className={styles.voteBtn} onClick={() => setShowComments(v => !v)}>
            <MessageCircle size={14} /> {idea.comments_count || 0}
          </button>

          {/* Reazioni admin/mod INLINE */}
          {(isAdmin || isMod) && idea.status === 'pending' && (
            <>
              <button
                className={`${styles.voteBtn} ${styles.reactApprove}`}
                onClick={() => onReact(idea.id, 'approved')}
                title="Approva">
                <Check size={14} /> ✅
              </button>
              <button
                className={`${styles.voteBtn} ${styles.reactReject}`}
                onClick={() => onReact(idea.id, 'rejected')}
                title="Rifiuta">
                <X size={14} /> ❌
              </button>
            </>
          )}

          {/* Modifica */}
          {canEdit && !editing && (
            <button className={styles.voteBtn} onClick={() => setEditing(true)} title="Modifica">
              <Pencil size={14} />
            </button>
          )}

          {/* Segnala */}
          {!isOwner && (
            <button className={styles.voteBtn} onClick={() => setReporting(true)} title="Segnala">
              <Flag size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Commenti espandibili */}
      {showComments && (
        <Comments ideaId={idea.id} isAdmin={isAdmin} isMod={isMod} />
      )}

      {/* Modal segnala */}
      <Modal open={reporting} onClose={() => setReporting(false)} title="🚩 Segnala idea" size="sm">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['Contenuto inappropriato', 'Spam', 'Offensivo', 'Altro'].map(p => (
              <button key={p} type="button"
                onClick={() => setReportReason(p)}
                style={{
                  padding: '5px 12px', borderRadius: 20, fontSize: '0.78rem', cursor: 'pointer',
                  background: reportReason === p ? 'var(--danger)' : 'var(--bg-3)',
                  color: reportReason === p ? '#fff' : 'var(--text-2)',
                  border: '1px solid var(--border)', fontFamily: 'DM Sans, sans-serif',
                }}>{p}</button>
            ))}
          </div>
          <textarea value={reportReason} onChange={e => setReportReason(e.target.value)}
            placeholder="Descrivi il problema..." rows={3} />
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setReporting(false)}>Annulla</Button>
            <Button variant="danger" onClick={submitReport}>Segnala</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ── Pagina ────────────────────────────────────────────────────────────────
export default function IdeasPage() {
  const { profile, user, isAdmin, refreshProfile } = useAuth()
  const isMod = profile?.role === 'mod'

  const [ideas,       setIdeas]       = useState([])
  const [loading,     setLoading]     = useState(true)
  const [filter,      setFilter]      = useState('Tutte')
  const [showNew,     setShowNew]     = useState(false)
  const [submitting,  setSubmitting]  = useState(false)
  const [form,        setForm]        = useState({ title: '', content: '', is_votable: false })
  const [imageFile,   setImageFile]   = useState(null)
  const [imagePreview,setImagePreview]= useState(null)
  const [fileAttach,  setFileAttach]  = useState(null)
  const [myVotes,     setMyVotes]     = useState({})

  async function fetchIdeas() {
    let q = supabase
      .from('ideas')
      .select('*, profiles:author_id(nome,cognome,role)')
      .order('created_at', { ascending: false })
    if (filter !== 'Tutte') q = q.eq('classe', filter)
    const { data, error } = await q
    if (error) console.error('fetchIdeas:', error)
    setIdeas(data || [])
    setLoading(false)
  }

  async function fetchMyVotes() {
    if (!user) return
    const { data } = await supabase.from('votes').select('idea_id,vote').eq('user_id', user.id)
    if (data) {
      const map = {}
      data.forEach(v => { map[v.idea_id] = v.vote })
      setMyVotes(map)
    }
  }

  useEffect(() => { fetchIdeas() }, [filter])
  useEffect(() => { fetchMyVotes() }, [user])

  async function handleVote(ideaId, vote) {
    if (myVotes[ideaId]) { toast.error('Hai già votato questa idea'); return }
    const { error } = await supabase.from('votes').insert({ idea_id: ideaId, user_id: user.id, vote })
    if (error) { toast.error(error.message); return }
    const field = vote === 'yes' ? 'votes_yes' : 'votes_no'
    const idea = ideas.find(i => i.id === ideaId)
    await supabase.from('ideas').update({ [field]: (idea[field] || 0) + 1 }).eq('id', ideaId)
    setMyVotes(p => ({ ...p, [ideaId]: vote }))
    setIdeas(prev => prev.map(i =>
      i.id === ideaId ? { ...i, [field]: (i[field] || 0) + 1 } : i
    ))
    toast.success('Voto registrato!')
  }

  async function handleReact(ideaId, status) {
    const { error } = await supabase.from('ideas').update({
      status, reviewed_at: new Date().toISOString()
    }).eq('id', ideaId)
    if (error) { toast.error(error.message); return }
    const idea = ideas.find(i => i.id === ideaId)
    const userId = idea?.author_id || idea?.user_id
    if (userId) {
      const { notifyIdeaResult } = await import('../lib/notifications')
      await notifyIdeaResult(userId, idea.title, status === 'approved')
    }
    toast.success(status === 'approved' ? '✅ Idea approvata!' : '❌ Idea rifiutata')
    fetchIdeas()
  }

  function handleImageChange(e) {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 3 * 1024 * 1024) { toast.error('Immagine max 3MB'); return }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  function handleFileChange(e) {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { toast.error('File max 10MB'); return }
    setFileAttach(file)
  }

  async function uploadToStorage(file, folder) {
    const ext  = file.name.split('.').pop()
    const path = `${folder}/${user.id}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('ccrr-images').upload(path, file)
    if (error) { toast.error('Errore upload'); return null }
    const { data } = supabase.storage.from('ccrr-images').getPublicUrl(path)
    return data.publicUrl
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim() || !form.content.trim()) { toast.error('Compila tutti i campi'); return }

    const { flagged, words } = checkText(`${form.title} ${form.content}`)
    if (flagged) {
      setSubmitting(true)
      const result = await applyAutoBan(user.id, words)
      await refreshProfile()
      setSubmitting(false)
      toast.error(`Contenuto non consentito. Cartellino ${result.card}.`)
      setShowNew(false); return
    }

    setSubmitting(true)
    const imageUrl = imageFile  ? await uploadToStorage(imageFile,  'ideas') : null
    const fileUrl  = fileAttach ? await uploadToStorage(fileAttach, 'files') : null

    const { data, error } = await supabase.from('ideas').insert({
      user_id:   user.id,
      author_id: user.id,
      classe:    profile.classe,
      title:     form.title.trim(),
      content:   form.content.trim(),
      image_url: imageUrl,
      file_url:  fileUrl,
      file_name: fileAttach?.name || null,
      is_votable: form.is_votable,
      status:    'pending',
    }).select().single()

    if (error) { toast.error(error.message); setSubmitting(false); return }

    await notifyAdminNewIdea(data.id, data.title, `${profile.nome} ${profile.cognome}`)
    toast.success('Idea inviata!')
    setForm({ title: '', content: '', is_votable: false })
    setImageFile(null); setImagePreview(null); setFileAttach(null)
    setShowNew(false); setSubmitting(false)
    fetchIdeas()
  }

  return (
    <div className={styles.page}>
      {/* Barra filtri */}
      <div className={styles.topBar}>
        <div className={styles.filters}>
          {CLASSI.map(c => (
            <button key={c}
              className={[styles.filterBtn, filter === c ? styles.active : ''].join(' ')}
              onClick={() => setFilter(c)}>{c}</button>
          ))}
        </div>
        <Button onClick={() => setShowNew(true)} size="sm">
          <Plus size={15} /> Invia idea
        </Button>
      </div>

      {/* Lista */}
      {loading ? (
        <div className={styles.empty}>Caricamento...</div>
      ) : ideas.length === 0 ? (
        <div className={styles.empty}>
          <Lightbulb size={40} style={{ color: 'var(--text-3)', marginBottom: 12 }} />
          <p>Nessuna idea ancora</p>
          <Button onClick={() => setShowNew(true)} size="sm" variant="outline" style={{ marginTop: 12 }}>
            Sii il primo!
          </Button>
        </div>
      ) : (
        <div className={styles.list}>
                      {ideas.filter(i => isAdmin || isMod || i.status !== 'rejected').map(idea => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                myVote={myVotes[idea.id]}
                isAdmin={isAdmin}
                isMod={isMod}
                currentUserId={user?.id}
                onVote={handleVote}
                onReact={handleReact}
                onRefresh={fetchIdeas}
              />
            ))}
        </div>
      )}

      {/* Modal nuova idea */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="💡 Invia un'idea">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className={styles.field}>
            <label>Titolo</label>
            <input value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="Titolo breve" maxLength={100} required />
          </div>
          <div className={styles.field}>
            <label>Descrizione</label>
            <textarea value={form.content}
              onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
              placeholder="Spiega la tua idea..." rows={4} maxLength={800} required />
          </div>

          {/* Immagine */}
          <div className={styles.field}>
            <label>Immagine (opzionale, max 3MB)</label>
            {imagePreview ? (
              <div className={styles.previewWrap}>
                <img src={imagePreview} alt="preview" className={styles.preview} />
                <button type="button" className={styles.removeImg}
                  onClick={() => { setImageFile(null); setImagePreview(null) }}>
                  <X size={13} /> Rimuovi
                </button>
              </div>
            ) : (
              <label className={styles.uploadBtn}>
                <Image size={15} /> <span>Allega immagine</span>
                <input type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={handleImageChange} />
              </label>
            )}
          </div>

          {/* File */}
          <div className={styles.field}>
            <label>File allegato (opzionale, max 10MB)</label>
            {fileAttach ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                background: 'var(--bg-3)', borderRadius: 8 }}>
                <Paperclip size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                <span style={{ fontSize: '0.85rem', flex: 1, overflow: 'hidden',
                  textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileAttach.name}</span>
                <button type="button" onClick={() => setFileAttach(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--danger)',
                    cursor: 'pointer', padding: 0 }}>
                  <X size={14} />
                </button>
              </div>
            ) : (
              <label className={styles.uploadBtn}>
                <Paperclip size={15} /> <span>Allega file (PDF, doc...)</span>
                <input type="file" style={{ display: 'none' }} onChange={handleFileChange} />
              </label>
            )}
          </div>

          {/* Votazione */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 10,
            cursor: 'pointer', fontSize: '0.88rem', color: 'var(--text-2)' }}>
            <input type="checkbox" checked={form.is_votable}
              onChange={e => setForm(p => ({ ...p, is_votable: e.target.checked }))}
              style={{ width: 'auto' }} />
            🗳 Metti questa idea anche in votazione
          </label>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button variant="secondary" type="button" onClick={() => setShowNew(false)}>Annulla</Button>
            <Button type="submit" loading={submitting}>Invia</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
