import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import { BookOpen, Plus, Pencil, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import styles from './Admin.module.css'

const EMPTY = { title: '', content: '', position: 0 }

export default function AdminRules() {
  const [rules, setRules] = useState([])
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null) // rule object or null = new
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  async function load() {
    const { data } = await supabase.from('rules').select('*').order('position')
    setRules(data || [])
  }

  useEffect(() => { load() }, [])

  function openNew() {
    setEditing(null)
    setForm({ ...EMPTY, position: rules.length + 1 })
    setModal(true)
  }

  function openEdit(rule) {
    setEditing(rule)
    setForm({ title: rule.title, content: rule.content, position: rule.position })
    setModal(true)
  }

  async function save() {
    if (!form.title.trim() || !form.content.trim()) {
      toast.error('Compila titolo e contenuto'); return
    }
    setSaving(true)
    if (editing) {
      await supabase.from('rules').update({
        title: form.title.trim(),
        content: form.content.trim(),
        position: parseInt(form.position) || 0
      }).eq('id', editing.id)
      toast.success('Regola aggiornata')
    } else {
      await supabase.from('rules').insert({
        title: form.title.trim(),
        content: form.content.trim(),
        position: parseInt(form.position) || rules.length + 1
      })
      toast.success('Regola aggiunta')
    }
    setSaving(false)
    setModal(false)
    load()
  }

  async function del(id) {
    if (!confirm('Eliminare questa regola?')) return
    await supabase.from('rules').delete().eq('id', id)
    toast.success('Regola eliminata')
    load()
  }

  return (
    <div className={styles.page}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className={styles.titleRow}>
          <BookOpen size={20} color="var(--info)" />
          <h2 className={styles.title}>Gestione regole</h2>
        </div>
        <Button size="sm" onClick={openNew}>
          <Plus size={15} /> Aggiungi
        </Button>
      </div>

      <div className={styles.tableWrap}>
        {rules.length === 0 ? (
          <div className={styles.empty}>Nessuna regola ancora — aggiungine una!</div>
        ) : (
          <div>
            {rules.map((rule, i) => (
              <div key={rule.id} className={styles.ruleItem}>
                <div className={styles.ruleNum}>{String(i + 1).padStart(2, '0')}</div>
                <div className={styles.ruleBody}>
                  <div className={styles.ruleTitle}>{rule.title}</div>
                  <div className={styles.ruleContent}>{rule.content}</div>
                </div>
                <div className={styles.actions} style={{ flexShrink: 0 }}>
                  <button className={`${styles.actionBtn} ${styles.btnWarn}`} onClick={() => openEdit(rule)}>
                    <Pencil size={12} style={{ display: 'inline', marginRight: 4 }} />Modifica
                  </button>
                  <button className={`${styles.actionBtn} ${styles.btnReject}`} onClick={() => del(rule.id)}>
                    <Trash2 size={12} style={{ display: 'inline', marginRight: 4 }} />Elimina
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editing ? '✏️ Modifica regola' : '➕ Nuova regola'}
        size="md"
      >
        <div className={styles.ruleForm}>
          <div className={styles.ruleFormRow}>
            <div className={styles.field}>
              <label>Posizione</label>
              <input
                type="number" min={1}
                value={form.position}
                onChange={e => setForm(p => ({ ...p, position: e.target.value }))}
              />
            </div>
            <div className={styles.field}>
              <label>Titolo *</label>
              <input
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="es. Rispetto reciproco"
              />
            </div>
          </div>
          <div className={styles.field}>
            <label>Contenuto *</label>
            <textarea
              value={form.content}
              onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
              placeholder="Descrivi la regola nel dettaglio..."
              rows={4}
            />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setModal(false)}>Annulla</Button>
            <Button loading={saving} onClick={save}>Salva</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
