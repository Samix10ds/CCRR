import styles from './CardBadge.module.css'

const CARDS = {
  green:  { emoji: '🟢', label: 'In regola',    color: 'var(--card-green)'  },
  yellow: { emoji: '🟡', label: 'Attenzione',   color: 'var(--card-yellow)' },
  orange: { emoji: '🟠', label: 'A rischio',    color: 'var(--card-orange)' },
  red:    { emoji: '🔴', label: 'Bannato',       color: 'var(--card-red)'   },
}

export default function CardBadge({ card = 'green', showLabel = false, size = 'md' }) {
  const info = CARDS[card] || CARDS.green

  return (
    <span
      className={[styles.badge, styles[size]].join(' ')}
      style={{ '--card-color': info.color }}
      title={info.label}
    >
      <span className={styles.dot} />
      {showLabel && <span className={styles.label}>{info.label}</span>}
    </span>
  )
}

export function CardBadgeFull({ card = 'green' }) {
  const info = CARDS[card] || CARDS.green
  return (
    <span className={styles.full} style={{ '--card-color': info.color }}>
      {info.emoji} {info.label}
    </span>
  )
}
