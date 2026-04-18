import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { CardBadgeFull } from '../components/ui/CardBadge'
import { Lightbulb, BookOpen, Flag, Vote, ArrowRight } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { it } from 'date-fns/locale'
import styles from './Home.module.css'

export default function HomePage() {
  const { profile } = useAuth()
  const [recentIdeas, setRecentIdeas] = useState([])
  const [stats, setStats] = useState({ ideas: 0, users: 0, rules: 0 })

  useEffect(() => {
    async function load() {
      const [{ data: ideas }, { count: ideaCount }, { count: userCount }, { count: ruleCount }] =
        await Promise.all([
          supabase.from('ideas').select('id,title,created_at,profiles(nome,cognome,classe)')
            .eq('status', 'approved').order('created_at', { ascending: false }).limit(4),
          supabase.from('ideas').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('rules').select('*', { count: 'exact', head: true }),
        ])
      setRecentIdeas(ideas || [])
      setStats({ ideas: ideaCount || 0, users: userCount || 0, rules: ruleCount || 0 })
    }
    load()
  }, [])

  const QUICK_LINKS = [
    { to: '/ideas/new', icon: Lightbulb, label: 'Invia un\'idea', color: 'var(--accent)',   desc: 'Proponi qualcosa alla community' },
    { to: '/rules',     icon: BookOpen,  label: 'Regole',         color: 'var(--info)',    desc: 'Leggi le regole della community' },
    { to: '/vote',      icon: Vote,      label: 'Vota',           color: 'var(--warning)', desc: 'Vota le idee in sospeso' },
    { to: '/reports',   icon: Flag,      label: 'Segnala',        color: 'var(--danger)',  desc: 'Segnala un comportamento' },
  ]

  return (
    <div className={styles.page}>
      {/* Benvenuto */}
      <div className={styles.welcome}>
        <div>
          <h2 className={styles.greeting}>
            Ciao, {profile?.nome}! 👋
          </h2>
          <p className={styles.sub}>Benvenuto nella community CCRR — classe {profile?.classe}</p>
        </div>
        <CardBadgeFull card={profile?.card || 'green'} />
      </div>

      {/* Stats */}
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statNum}>{stats.ideas}</span>
          <span className={styles.statLabel}>Idee approvate</span>
        </div>
        <div className={styles.statDiv} />
        <div className={styles.stat}>
          <span className={styles.statNum}>{stats.users}</span>
          <span className={styles.statLabel}>Iscritti</span>
        </div>
        <div className={styles.statDiv} />
        <div className={styles.stat}>
          <span className={styles.statNum}>{stats.rules}</span>
          <span className={styles.statLabel}>Regole</span>
        </div>
      </div>

      {/* Quick links */}
      <div className={styles.quickGrid}>
        {QUICK_LINKS.map(q => (
          <Link key={q.to} to={q.to} className={styles.quickCard} style={{ '--q-color': q.color }}>
            <q.icon size={22} className={styles.quickIcon} />
            <div>
              <div className={styles.quickLabel}>{q.label}</div>
              <div className={styles.quickDesc}>{q.desc}</div>
            </div>
            <ArrowRight size={16} className={styles.quickArrow} />
          </Link>
        ))}
      </div>

      {/* Idee recenti */}
      {recentIdeas.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h3>Idee recenti</h3>
            <Link to="/ideas" className={styles.seeAll}>Vedi tutte →</Link>
          </div>
          <div className={styles.ideaList}>
            {recentIdeas.map(idea => (
              <div key={idea.id} className={styles.ideaItem}>
                <div className={styles.ideaTitle}>{idea.title}</div>
                <div className={styles.ideaMeta}>
                  {idea.profiles?.nome} {idea.profiles?.cognome} · {idea.profiles?.classe} ·{' '}
                  {formatDistanceToNow(new Date(idea.created_at), { addSuffix: true, locale: it })}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
