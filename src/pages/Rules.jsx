// ============ RULES PAGE ============
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { BookOpen } from 'lucide-react'
import styles from './Rules.module.css'

export default function RulesPage() {
  const [rules, setRules] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('rules').select('*').order('position').then(({ data }) => {
      setRules(data || [])
      setLoading(false)
    })
  }, [])

  if (loading) return <div className={styles.loading}>Caricamento...</div>

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <BookOpen size={28} color="var(--accent)" />
        <div>
          <h2 className={styles.title}>Regole della Community</h2>
          <p className={styles.sub}>Rispettale per mantenere un ambiente positivo per tutti</p>
        </div>
      </div>

      {rules.length === 0 ? (
        <p style={{ color: 'var(--text-3)', textAlign: 'center', padding: '40px 0' }}>
          Nessuna regola pubblicata ancora.
        </p>
      ) : (
        <div className={styles.list}>
          {rules.map((rule, i) => (
            <div key={rule.id} className={styles.card}>
              <div className={styles.num}>{String(i + 1).padStart(2, '0')}</div>
              <div className={styles.ruleBody}>
                <h3 className={styles.ruleTitle}>{rule.title}</h3>
                <p className={styles.ruleContent}>{rule.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
