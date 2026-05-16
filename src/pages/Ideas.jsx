import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { checkText, applyAutoBan } from '../lib/automod'
import { notifyAdminNewIdea } from '../lib/notifications'
import { ROLE_BADGES, getTimeRank } from '../context/ThemeContext'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { ThumbsUp, ThumbsDown, Plus, Lightbulb, Image, X, MessageCircle, Flag, Pencil, Check, Paperclip, Vote } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { it } from 'date-fns/locale'
import toast from 'react-hot-toast'
import styles from './Ideas.module.css'

const CLASSI = ['Tutte', '1A', '1B', '2A', '2B', '3A', '3B']
const STATUS_COLORS = { pending: 'var(--warning)', approved: 'var(--success)', rejected: 'var(--danger)' }
const STATUS_LABELS = { pending: '⏳ In attesa', approved: '✅ Approvata', rejected: '❌ Rifiutata' }

function AuthorChip({ profile, onClickProfile }) {
  if (!profile) return <span className={styles.authorName}>Utente</span>
  const role = ROLE_BADGES[profile.role]
  return (
    <button className={styles.authorChip} onClick={onClickProfile}>
      <span className={styles.authorAvatar}>{profile.nome?.[0]}{profile.cognome?.[0]}</span>
      <span className={styles.authorName}>{profile.nome} {profile.cognome}</span>
      {role?.emoji && <span title={role.label}>{role.emoji}</span>}
      {profile.special_rank && <span className={styles.specialRank}>✨ {profile.special_rank}</span>}
    </button>
  )
}

function MiniProfileModal({ profile, open, onClose }) {
  if (!profile) return null
  const role = ROLE_BADGES[profile.role]
  const rank = getTimeRank(profile.joined_at)
  const days = profile.joined_at ? Math.floor((Date.now() - new Date(profile.joined_at)) / 86400000) : 0
  return (
    <Modal open={open} onClose={onClose} title="👤 Profilo" size="sm">
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:52, height:52, borderRadius:14, background:'color-mix(in srgb,var(--accent) 20%,var(--bg))', color:'var(--accent)', fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'1.2rem', display:'flex', alignItems:'center', justifyContent:'center', textTransform:'uppercase', flexShrink:0 }}>
            {profile.nome?.[0]}{profile.cognome?.[0]}
          </div>
          <div>
            <div style={{ fontWeight:700, fontSize:'1rem' }}>{profile.nome} {profile.cognome}</div>
            {profile.classe && <div style={{ fontSize:'0.78rem', color:'var(--text-3)' }}>Classe {profile.classe}</div>}
          </div>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {role?.emoji && <span style={{ padding:'3px 10px', borderRadius:20, fontSize:'0.78rem', background:`color-mix(in srgb,${role.color} 15%,transparent)`, color:role.color, fontWeight:600 }}>{role.emoji} {role.label}</span>}
          {rank && <span style={{ padding:'3px 10px', borderRadius:20, fontSize:'0.78rem', background:`color-mix(in srgb,${rank.color} 15%,transparent)`, color:rank.color, fontWeight:600 }}>{rank.emoji} {rank.label}</span>}
          {profile.special_rank && <span style={{ padding:'3px 10px', borderRadius:20, fontSize:'0.78rem', background:'color-mix(in srgb,var(--accent) 12%,transparent)', color:'var(--accent)', fontWeight:600 }}>✨ {profile.special_rank}</span>}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          {[{ label:'Idee approvate', val: profile.approved_ideas || 0 }, { label:'Giorni nel sito', val: days }].map(s => (
            <div key={s.label} style={{ background:'var(--bg-3)', borderRadius:10, padding:'10px', textAlign:'center' }}>
              <div style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'1.3rem', color:'var(--accent)' }}>{s.val}</div>
              <div style={{ fontSize:'0.72rem', color:'var(--text-3)' }}>{s.label}</div>
            </div>
          ))}
        </div>
        {rank?.next && <p style={{ fontSize:'0.78rem', color:'var(--text-3)', textAlign:'center' }}>Prossimo rank: {rank.next} tra {rank.daysLeft} giorni</p>}
      </div>
    </Modal>
  )
}

function CommentsSection({ ideaId, isAdmin, isMod, currentUserId }) {
  const [comments, setComments] = useState([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [editId, setEditId] = useState(null)
  const [editText, setEditText] = useState('')

  useEffect(() => {
    supabase.from('comments').select('*, profiles:user_id(nome,cognome,role,special_rank,joined_at)').eq('idea_id', ideaId).order('created_at').then(({ data }) => setComments(data || []))
    const ch = supabase.channel(`comments:${ideaId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments', filter: `idea_id=eq.${ideaId}` }, payload => {
      supabase.from('comments').select('*, profiles:user_id(nome,cognome,role,special_rank,joined_at)').eq('id', payload.new.id).single().then(({ data }) => { if (data) setComments(p => [...p, data]) })
    }).on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'comments', filter: `idea_id=eq.${ideaId}` }, payload => {
      setComments(p => p.filter(c => c.id !== payload.old.id))
    }).subscribe()
    return () => supabase.removeChannel(ch)
  }, [ideaId])

  async function send() {
    if (!text.trim()) return
    setSending(true)
    const { error } = await supabase.from('comments').insert({ idea_id: ideaId, user_id: currentUserId, content: text.trim() })
    if (!error) setText('')
    else toast.error(error.message)
    setSending(false)
  }

  async function del(id) { await supabase.from('comments').delete().eq('id', id) }
  async function saveEdit(id) {
    if (!editText.trim()) return
    await supabase.from('comments').update({ content: editText }).eq('id', id)
    setComments(p => p.map(c => c.id === id ? { ...c, content: editText } : c))
    setEditId(null)
  }

  return (
    <div className={styles.comments}>
      {comments.map(c => (
        <div key={c.id} className={styles.comment}>
          <div className={styles.commentHeader}>
            <span className={styles.commentAuthor}>{c.profiles?.nome} {c.profiles?.cognome}</span>
            {ROLE_BADGES[c.profiles?.role]?.emoji && <span style={{ fontSize:'0.75rem' }}>{ROLE_BADGES[c.profiles?.role].emoji}</span>}
            <span className={styles.commentTime}>{formatDistanceToNow(new Date(c.created_at), { addSuffix:true, locale:it })}</span>
            {c.user_id === currentUserId && editId !== c.id && <button className={styles.iconBtn} onClick={() => { setEditId(c.id); setEditText(c.content) }}><Pencil size={11} /></button>}
            {(c.user_id === currentUserId || isAdmin || isMod) && <button className={styles.iconBtn} style={{ color:'var(--danger)' }} onClick={() => del(c.id)}>✕</button>}
          </div>
          {editId === c.id
            ? <div style={{ display:'flex', gap:6 }}><input value={editText} onChange={e => setEditText(e.target.value)} style={{ flex:1, fontSize:'0.85rem', padding:'5px 8px' }} /><button className={styles.iconBtn} onClick={() => saveEdit(c.id)}>✓</button><button className={styles.iconBtn} onClick={() => setEditId(null)}>✕</button></div>
            : <p className={styles.commentText}>{c.content}</p>
          }
        </div>
      ))}
      <div className={styles.commentInput}>
        <input value={text} onChange={e => setText(e.target.value)} placeholder="Scrivi un commento..." maxLength={500} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); send() } }} style={{ flex:1, fontSize:'0.85rem' }} />
        <Button size="sm" loading={sending} onClick={send} disabled={!text.trim()}>Invia</Button>
      </div>
    </div>
  )
}

export default function IdeasPage() {
  const { profile, user, isAdmin, refreshProfile } = useAuth()
  const isMod = profile?.role === 'mod'
  const [ideas, setIdeas] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('Tutte')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showNew, setShowNew] = useState(false)
  const [editIdea, setEditIdea] = useState(null)
  const [reportIdea, setReportIdea] = useState(null)
  const [reportReason, setReportReason] = useState('')
  const [viewProfile, setViewProfile] = useState(null)
  const [openComments, setOpenComments] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [myVotes, setMyVotes] = useState({})
  const [form, setForm] = useState({ title:'', content:'', is_votable:false })
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [fileAttach, setFileAttach] = useState(null)

  const fetchIdeas = useCallback(async () => {
    let q = supabase.from('ideas')
      .select('*, profiles:author_id(nome,cognome,role,special_rank,joined_at,approved_ideas,classe)')
      .order('created_at', { ascending:false })
    if (filter !== 'Tutte') q = q.eq('classe', filter)
    if (statusFilter !== 'all') q = q.eq('status', statusFilter)
    const { data, error } = await q
    if (error) console.error('ideas fetch:', error)
    setIdeas(data || [])
    setLoading(false)
  }, [filter, statusFilter])

  useEffect(() => { fetchIdeas() }, [fetchIdeas])

  useEffect(() => {
    if (!user) return
    supabase.from('votes').select('idea_id,vote').eq('user_id', user.id).then(({ data }) => {
      if (data) { const m = {}; data.forEach(v => { m[v.idea_id] = v.vote }); setMyVotes(m) }
    })
  }, [user])

  async function handleVote(ideaId, vote) {
    if (myVotes[ideaId]) { toast.error('Hai già votato'); return }
    const { error } = await supabase.from('votes').insert({ idea_id:ideaId, user_id:user.id, vote })
    if (error) { toast.error(error.message); return }
    const field = vote === 'yes' ? 'votes_yes' : 'votes_no'
    const idea = ideas.find(i => i.id === ideaId)
    await supabase.from('ideas').update({ [field]: (idea[field]||0) + 1 }).eq('id', ideaId)
    setMyVotes(p => ({ ...p, [ideaId]: vote }))
    setIdeas(prev => prev.map(i => i.id === ideaId ? { ...i, [field]: (i[field]||0)+1 } : i))
    toast.success('Voto registrato!')
  }

  async function handleReact(ideaId, status) {
    const { error } = await supabase.from('ideas').update({ status, reviewed_at:new Date().toISOString() }).eq('id', ideaId)
    if (error) { toast.error(error.message); return }
    const idea = ideas.find(i => i.id === ideaId)
    if (idea) {
      await supabase.from('notifications').insert({ user_id: idea.author_id||idea.user_id, type: status==='approved'?'idea_approved':'idea_rejected', title: status==='approved'?'✅ Idea approvata':'❌ Idea rifiutata', body: `La tua idea "${idea.title}" è stata ${status==='approved'?'approvata':'rifiutata'}.` })
    }
    toast.success(status === 'approved' ? '✅ Approvata' : '❌ Rifiutata')
    fetchIdeas()
  }

  async function handleEdit(e) {
    e.preventDefault()
    if (!editIdea) return
    await supabase.from('ideas').update({ title:form.title.trim(), content:form.content.trim() }).eq('id', editIdea.id)
    toast.success('Idea modificata!')
    setEditIdea(null)
    fetchIdeas()
  }

  async function handleReport(e) {
    e.preventDefault()
    if (!reportReason.trim()) { toast.error('Inserisci un motivo'); return }
    await supabase.from('reports').insert({ reporter_id:user.id, reported_idea_id:reportIdea.id, report_type:'user', reason:`Idea segnalata: "${reportIdea.title}" — ${reportReason}` })
    toast.success('Segnalazione inviata')
    setReportIdea(null); setReportReason('')
  }

  function handleImageChange(e) {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 3*1024*1024) { toast.error('Immagine max 3MB'); return }
    setImageFile(file); setImagePreview(URL.createObjectURL(file))
  }

  function handleFileChange(e) {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 10*1024*1024) { toast.error('File max 10MB'); return }
    setFileAttach(file)
  }

  async function uploadToStorage(file, folder) {
    const ext = file.name.split('.').pop()
    const path = `${folder}/${user.id}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('ccrr-images').upload(path, file)
    if (error) return null
    return supabase.storage.from('ccrr-images').getPublicUrl(path).data.publicUrl
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
    const imageUrl = imageFile ? await uploadToStorage(imageFile, 'ideas') : null
    const fileUrl = fileAttach ? await uploadToStorage(fileAttach, 'files') : null
    const { data, error } = await supabase.from('ideas').insert({
      user_id:user.id, author_id:user.id, classe:profile.classe,
      title:form.title.trim(), content:form.content.trim(),
      image_url:imageUrl, file_url:fileUrl, file_name:fileAttach?.name||null,
      is_votable:form.is_votable, status:'pending'
    }).select().single()
    if (error) { toast.error(error.message); setSubmitting(false); return }
    await notifyAdminNewIdea(data.id, data.title, `${profile.nome} ${profile.cognome}`)
    toast.success("Idea inviata!")
    setForm({ title:'', content:'', is_votable:false })
    setImageFile(null); setImagePreview(null); setFileAttach(null)
    setShowNew(false); setSubmitting(false)
    fetchIdeas()
  }

  const STATUS_FILTERS = [{ id:'all', label:'Tutte' }, { id:'approved', label:'✅ Approvate' }, { id:'pending', label:'⏳ In attesa' }, { id:'rejected', label:'❌ Rifiutate' }]

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', flex:1 }}>
          <div className={styles.filters}>
            {CLASSI.map(c => <button key={c} className={[styles.filterBtn, filter===c?styles.active:''].join(' ')} onClick={() => setFilter(c)}>{c}</button>)}
          </div>
          <div className={styles.filters}>
            {STATUS_FILTERS.map(s => <button key={s.id} className={[styles.filterBtn, statusFilter===s.id?styles.active:''].join(' ')} onClick={() => setStatusFilter(s.id)}>{s.label}</button>)}
          </div>
        </div>
        <Button onClick={() => setShowNew(true)} size="sm"><Plus size={15} /> Invia idea</Button>
      </div>

      {loading ? <div className={styles.empty}>Caricamento...</div> : ideas.length === 0 ? (
        <div className={styles.empty}><Lightbulb size={40} style={{ color:'var(--text-3)', marginBottom:12 }} /><p>Nessuna idea qui</p></div>
      ) : (
        <div className={styles.list}>
          {ideas.map(idea => (
            <div key={idea.id} className={[styles.card, idea.status==='approved'?styles.cardApproved:''].join(' ')}>
              <div className={styles.cardHead}>
                <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                  <span className={styles.classe}>{idea.classe}</span>
                  <span style={{ fontSize:'0.72rem', fontWeight:700, padding:'3px 10px', borderRadius:20, color:STATUS_COLORS[idea.status], background:`color-mix(in srgb,${STATUS_COLORS[idea.status]} 12%,transparent)` }}>{STATUS_LABELS[idea.status]}</span>
                  {idea.is_votable && <span style={{ fontSize:'0.7rem', color:'var(--warning)', background:'color-mix(in srgb,var(--warning) 12%,transparent)', padding:'3px 8px', borderRadius:20 }}>📊 In votazione</span>}
                </div>
                <span className={styles.time}>{formatDistanceToNow(new Date(idea.created_at), { addSuffix:true, locale:it })}</span>
              </div>

              <h3 className={styles.cardTitle}>{idea.title}</h3>
              <p className={styles.cardContent}>{idea.content}</p>

              {idea.image_url && <img src={idea.image_url} alt="Allegato" className={styles.ideaImage} onError={e => e.target.style.display='none'} />}
              {idea.file_url && <a href={idea.file_url} target="_blank" rel="noopener noreferrer" className={styles.fileLink}><Paperclip size={13} /> {idea.file_name || 'Allegato'}</a>}
              {idea.admin_note && idea.status === 'rejected' && <div className={styles.adminNote}>Motivazione: {idea.admin_note}</div>}

              <div className={styles.cardFoot}>
                <AuthorChip profile={idea.profiles} onClickProfile={() => setViewProfile(idea.profiles)} />
                <div className={styles.actions}>
                  <button className={[styles.voteBtn, myVotes[idea.id]==='yes'?styles.votedYes:''].join(' ')} onClick={() => handleVote(idea.id,'yes')}><ThumbsUp size={14} /> {idea.votes_yes||0}</button>
                  <button className={[styles.voteBtn, myVotes[idea.id]==='no'?styles.votedNo:''].join(' ')} onClick={() => handleVote(idea.id,'no')}><ThumbsDown size={14} /> {idea.votes_no||0}</button>
                  <button className={styles.voteBtn} onClick={() => setOpenComments(p => ({ ...p, [idea.id]:!p[idea.id] }))}><MessageCircle size={14} /> {idea.comments_count||0}</button>
                  <button className={styles.voteBtn} onClick={() => { setReportIdea(idea); setReportReason('') }} title="Segnala"><Flag size={14} /></button>
                  {(idea.author_id===user?.id||idea.user_id===user?.id) && idea.status==='pending' && (
                    <button className={styles.voteBtn} onClick={() => { setEditIdea(idea); setForm({ title:idea.title, content:idea.content, is_votable:idea.is_votable }) }} title="Modifica"><Pencil size={14} /></button>
                  )}
                  {(isAdmin||isMod) && idea.status==='pending' && (
                    <>
                      <button className={`${styles.voteBtn} ${styles.reactApprove}`} onClick={() => handleReact(idea.id,'approved')} title="Approva"><Check size={14} /></button>
                      <button className={`${styles.voteBtn} ${styles.reactReject}`} onClick={() => handleReact(idea.id,'rejected')} title="Rifiuta"><X size={14} /></button>
                    </>
                  )}
                </div>
              </div>

              {openComments[idea.id] && <CommentsSection ideaId={idea.id} isAdmin={isAdmin} isMod={isMod} currentUserId={user?.id} />}
            </div>
          ))}
        </div>
      )}

      {/* Modal nuova idea */}
      <Modal open={showNew} onClose={() => { setShowNew(false); setImageFile(null); setImagePreview(null); setFileAttach(null) }} title="💡 Invia un'idea">
        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div className={styles.field}><label>Titolo</label><input value={form.title} onChange={e => setForm(p=>({...p,title:e.target.value}))} placeholder="Titolo breve" maxLength={100} required /></div>
          <div className={styles.field}><label>Descrizione</label><textarea value={form.content} onChange={e => setForm(p=>({...p,content:e.target.value}))} placeholder="Spiega la tua idea..." rows={4} maxLength={800} required /></div>
          <div className={styles.field}>
            <label>Immagine (opzionale, max 3MB)</label>
            {imagePreview ? (
              <div className={styles.previewWrap}><img src={imagePreview} alt="preview" className={styles.preview} /><button type="button" className={styles.removeImg} onClick={() => { setImageFile(null); setImagePreview(null) }}><X size={13} /> Rimuovi</button></div>
            ) : (
              <label className={styles.uploadBtn}><Image size={15} /> <span>Allega immagine</span><input type="file" accept="image/*" style={{ display:'none' }} onChange={handleImageChange} /></label>
            )}
          </div>
          <div className={styles.field}>
            <label>File (opzionale, max 10MB)</label>
            {fileAttach ? (
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:'0.82rem', color:'var(--accent)' }}><Paperclip size={13} style={{ display:'inline', marginRight:4 }} />{fileAttach.name}</span>
                <button type="button" onClick={() => setFileAttach(null)} style={{ background:'none', color:'var(--danger)', fontSize:'0.8rem', border:'none', cursor:'pointer' }}>Rimuovi</button>
              </div>
            ) : (
              <label className={styles.uploadBtn}><Paperclip size={15} /> <span>Allega file (PDF, doc...)</span><input type="file" style={{ display:'none' }} onChange={handleFileChange} /></label>
            )}
          </div>
          <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', fontSize:'0.88rem', color:'var(--text-2)' }}>
            <input type="checkbox" checked={form.is_votable} onChange={e => setForm(p=>({...p,is_votable:e.target.checked}))} style={{ width:16, height:16 }} />
            <Vote size={15} /> Invia anche alle votazioni della classe
          </label>
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
            <Button variant="secondary" type="button" onClick={() => { setShowNew(false); setImageFile(null); setImagePreview(null); setFileAttach(null) }}>Annulla</Button>
            <Button type="submit" loading={submitting}>Invia</Button>
          </div>
        </form>
      </Modal>

      {/* Modal modifica */}
      <Modal open={!!editIdea} onClose={() => setEditIdea(null)} title="✏️ Modifica idea" size="sm">
        <form onSubmit={handleEdit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div className={styles.field}><label>Titolo</label><input value={form.title} onChange={e => setForm(p=>({...p,title:e.target.value}))} maxLength={100} required /></div>
          <div className={styles.field}><label>Descrizione</label><textarea value={form.content} onChange={e => setForm(p=>({...p,content:e.target.value}))} rows={4} maxLength={800} required /></div>
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
            <Button variant="secondary" type="button" onClick={() => setEditIdea(null)}>Annulla</Button>
            <Button type="submit">Salva</Button>
          </div>
        </form>
      </Modal>

      {/* Modal segnala */}
      <Modal open={!!reportIdea} onClose={() => setReportIdea(null)} title="🚩 Segnala idea" size="sm">
        <form onSubmit={handleReport} style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <p style={{ fontSize:'0.85rem', color:'var(--text-2)' }}>Stai segnalando: <strong style={{ color:'var(--text)' }}>{reportIdea?.title}</strong></p>
          <div className={styles.field}><label>Motivo</label><textarea value={reportReason} onChange={e => setReportReason(e.target.value)} placeholder="Descrivi il problema..." rows={3} required /></div>
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
            <Button variant="secondary" type="button" onClick={() => setReportIdea(null)}>Annulla</Button>
            <Button variant="danger" type="submit">Segnala</Button>
          </div>
        </form>
      </Modal>

      {/* Mini profilo */}
      <MiniProfileModal profile={viewProfile} open={!!viewProfile} onClose={() => setViewProfile(null)} />
    </div>
  )
}
