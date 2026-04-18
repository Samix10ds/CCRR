import { useState } from 'react'
import { Bell } from 'lucide-react'
import { useNotifications } from '../../hooks/useNotifications'
import { formatDistanceToNow } from 'date-fns'
import { it } from 'date-fns/locale'
import styles from './NotificationBell.module.css'

export default function NotificationBell() {
  const { notifications, unreadCount, markRead } = useNotifications()
  const [open, setOpen] = useState(false)

  function toggle() {
    setOpen(v => {
      if (!v && unreadCount > 0) markRead()
      return !v
    })
  }

  return (
    <div className={styles.wrap}>
      <button className={styles.bell} onClick={toggle} aria-label="Notifiche">
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <>
          <div className={styles.backdrop} onClick={() => setOpen(false)} />
          <div className={styles.panel}>
            <div className={styles.header}>
              <span>Notifiche</span>
              {notifications.length > 0 && (
                <button className={styles.clearBtn} onClick={markRead}>
                  Segna tutte lette
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <p className={styles.empty}>Nessuna notifica</p>
            ) : (
              <ul className={styles.list}>
                {notifications.map(n => (
                  <li key={n.id} className={[styles.item, n.is_read ? styles.read : ''].join(' ')}>
                    <div className={styles.itemTitle}>{n.title}</div>
                    <div className={styles.itemBody}>{n.body}</div>
                    <div className={styles.itemTime}>
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: it })}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  )
}
