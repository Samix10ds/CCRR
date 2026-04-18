import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { markAllRead } from '../lib/notifications'
import { useAuth } from '../context/AuthContext'

export function useNotifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [unreadCount,   setUnreadCount]   = useState(0)

  const fetchNotifications = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30)

    if (data) {
      setNotifications(data)
      setUnreadCount(data.filter(n => !n.is_read).length)
    }
  }, [user])

  useEffect(() => {
    if (!user) return

    fetchNotifications()

    // Realtime: ascolta nuove notifiche
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        setNotifications(prev => [payload.new, ...prev])
        setUnreadCount(prev => prev + 1)
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  const markRead = useCallback(async () => {
    if (!user) return
    await markAllRead(user.id)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }, [user])

  return { notifications, unreadCount, markRead, refresh: fetchNotifications }
}
