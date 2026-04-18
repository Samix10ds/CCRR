import { useEffect, useState, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Lightbulb, Users, Flag, BookOpen, Shield, TrendingUp } from 'lucide-react'
import styles from './Admin.module.css'
import eggStyles from './EasterEgg.module.css'

// ── Easter egg: Konami Code ──────────────────────────────────────────────
const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a']

function MatrixRain({ onClose }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    canvas.width  = window.innerWidth
    canvas.height = window.innerHeight

    const cols  = Math.floor(canvas.width / 16)
    const drops = Array(cols).fill(1)
    const chars = 'アイウエオカキクケコSABCDEFGHIJ01◈∞CCRR'

    const draw = () => {
      ctx.fillStyle = 'rgba(0,0,0,0.05)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#00d4aa'
      ctx.font = '15px monospace'

      drops.forEach((y, i) => {
        const ch = chars[Math.floor(Math.random() * chars.length)]
        ctx.fillText(ch, i * 16, y * 16)
        if (y * 16 > canvas.height && Math.random() > 0.975) drops[i] = 0
        drops[i]++
      })
    }

    const id = setInterval(draw, 33)

    // Auto-chiudi dopo 8 secondi
    const timeout = setTimeout(onClose, 8000)

    return () => { clearInterval(id); clearTimeout(timeout) }
  }, [onClose])

  return (
    <div className={eggStyles.overlay} onClick={onClose}>
      <canvas ref={canvasRef} className={eggStyles.canvas} />
      <div className={eggStyles.message}>
        <span className={eggStyles.msgIcon}>◈</span>
        <h2 className={eggStyles.msgTitle}>CCRR Admin Access</h2>
        <p className={eggStyles.msgSub}>Sei uno dei pochi a sapere questo segreto 🤫</p>
        <p className={eggStyles.msgCode}>↑↑↓↓←→←→BA</p>
        <button className={eggStyles.closeBtn} onClick={onClose}>× Chiudi</button>
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const { profile } = useAuth()
  const [stats, setStats] = useState({
    pendingIdeas: 0, pendingReports: 0,
    totalUsers: 0, bannedUsers: 0,
    totalRules: 0, pendingWords: 0
  })
  // Easter egg state
  const [eggActive, setEggActive] = useState(false)
  const konamiProgress = useRef([])

  // Konami code listener
  const handleKey = useCallback((e) => {
    konamiProgress.current = [...konamiProgress.current, e.key].slice(-KONAMI.length)
    if (konamiProgress.current.join(',') === KONAMI.join(',')) {
      setEggActive(true)
      konamiProgress.current = []
    }
  }, [])

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])

  useEffect(() => {
    async function load() {
      const [
        { count: pendingIdeas },
        { count: pendingReports },
        { count: totalUsers },
        { count: bannedUsers },
        { count: totalRules },
        { count: pendingWords }
      ] = await Promise.all([
        supabase.from('ideas').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_permanently_banned', true),
        supabase.from('rules').select('*', { count: 'exact', head: true }),
        supabase.from('banned_words').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      ])
      setStats({ pendingIdeas, pendingReports, totalUsers, bannedUsers, totalRules, pendingWords })
    }
    load()
  }, [])

  const CARDS = [
    { to: '/admin/ideas',        icon: Lightbulb, label: 'Idee in coda',       value: stats.pendingIdeas,   color: 'var(--warning)', urgent: stats.pendingIdeas > 0 },
    { to: '/admin/reports',      icon: Flag,      label: 'Segnalazioni aperte', value: stats.pendingReports, color: 'var(--danger)',  urgent: stats.pendingReports > 0 },
    { to: '/admin/users',        icon: Users,     label: 'Utenti totali',       value: stats.totalUsers,     color: 'var(--accent)',  sub: `${stats.bannedUsers} bannati` },
    { to: '/admin/rules',        icon: BookOpen,  label: 'Regole pubblicate',   value: stats.totalRules,     color: 'var(--info)' },
    { to: '/admin/banned-words', icon: Shield,    label: 'Parole da approvare', value: stats.pendingWords,   color: 'var(--accent-2)', urgent: stats.pendingWords > 0 },
  ]

  return (
    <div className={styles.page}>
      {eggActive && <MatrixRain onClose={() => setEggActive(false)} />}

      <div className={styles.titleRow}>
        <TrendingUp size={22} color="var(--danger)" />
        <h2 className={styles.title}>
          Dashboard Admin
          {/* Hint visibile solo a chi sa già dell'easter egg */}
          <span
            title="↑↑↓↓←→←→BA"
            style={{ marginLeft: 10, fontSize: '0.6rem', color: 'var(--text-3)',
              cursor: 'default', userSelect: 'none', letterSpacing: '0.1em' }}
          >◈</span>
        </h2>
      </div>

      <div className={styles.grid}>
        {CARDS.map(card => (
          <Link
            key={card.to}
            to={card.to}
            className={[styles.statCard, card.urgent ? styles.urgent : ''].join(' ')}
            style={{ '--cc': card.color }}
          >
            <div className={styles.statIcon}><card.icon size={20} /></div>
            <div className={styles.statValue}>{card.value ?? '—'}</div>
            <div className={styles.statLabel}>{card.label}</div>
            {card.sub && <div className={styles.statSub}>{card.sub}</div>}
            {card.urgent && <span className={styles.urgentDot} />}
          </Link>
        ))}
      </div>

      {/* Tip nascosto */}
      <p style={{ fontSize: '0.7rem', color: 'var(--bg-3)', textAlign: 'right',
        marginTop: 'auto', userSelect: 'none', letterSpacing: '0.05em' }}>
        v1.0.0 · try the konami code
      </p>
    </div>
  )
}
