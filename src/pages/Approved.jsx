import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Lightbulb, CheckCircle2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { it } from 'date-fns/locale'
import styles from './Ideas.module.css' // We can reuse Ideas styles for layout

export default function ApprovedPage() {
  const { profile } = useAuth()
  const [ideas, setIdeas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchApproved() {
      const { data, error } = await supabase
        .from('ideas')
        .select('*, profiles:author_id(nome,cognome,role)')
        .eq('status', 'approved')
        .order('reviewed_at', { ascending: false }) // sort by when it was approved
      
      if (!error) {
        setIdeas(data || [])
      }
      setLoading(false)
    }
    fetchApproved()
  }, [])

  return (
    <div className={styles.page}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          <CheckCircle2 color="var(--success)" /> Idee Approvate
        </h2>
        <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', marginTop: '4px' }}>
          Tutte le idee che sono state approvate ufficialmente dal team dei rappresentanti.
        </p>
      </div>

      {loading ? (
        <div className={styles.empty}>Caricamento...</div>
      ) : ideas.length === 0 ? (
        <div className={styles.empty}>
          <Lightbulb size={40} style={{ color: 'var(--text-3)', marginBottom: 12 }} />
          <p>Nessuna idea approvata ancora</p>
        </div>
      ) : (
        <div className={styles.list}>
          {ideas.map(idea => (
            <div key={idea.id} className={`${styles.card} ${styles.cardApproved}`}>
              <div className={styles.cardHead}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className={styles.classe}>{idea.classe}</span>
                  <span style={{
                    fontSize: '0.72rem', fontWeight: 700,
                    color: 'var(--success)',
                    background: `color-mix(in srgb, var(--success) 15%, transparent)`,
                    padding: '2px 9px', borderRadius: 20,
                  }}>✅ Approvata</span>
                </div>
                <span className={styles.time}>
                  {idea.reviewed_at 
                    ? `Approvata ${formatDistanceToNow(new Date(idea.reviewed_at), { addSuffix: true, locale: it })}`
                    : formatDistanceToNow(new Date(idea.created_at), { addSuffix: true, locale: it })}
                </span>
              </div>
              
              <h3 className={styles.cardTitle}>{idea.title}</h3>
              <p className={styles.cardContent}>{idea.content}</p>

              {idea.image_url && (
                <img src={idea.image_url} alt="Allegato" className={styles.ideaImage}
                  onError={e => e.target.style.display = 'none'} />
              )}

              <div className={styles.cardFoot} style={{ marginTop: '12px' }}>
                <span className={styles.author}>
                  {idea.profiles ? `${idea.profiles.nome} ${idea.profiles.cognome}` : 'Utente sconosciuto'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
