import { supabase } from './supabase'

/**
 * Invia una notifica a un utente specifico
 */
export async function sendNotification({ userId, type, title, body, relatedId = null }) {
  return supabase.from('notifications').insert({
    user_id: userId,
    type,
    title,
    body,
    related_id: relatedId
  })
}

/**
 * Notifica admin (Davide) per nuova idea in coda
 */
export async function notifyAdminNewIdea(ideaId, ideaTitle, authorName) {
  // Recupera tutti gli admin
  const { data: admins } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin')

  if (!admins || admins.length === 0) return

  const notifications = admins.map(admin => ({
    user_id: admin.id,
    type: 'new_idea',
    title: '💡 Nuova idea da approvare',
    body: `${authorName} ha inviato: "${ideaTitle}"`,
    related_id: ideaId
  }))

  return supabase.from('notifications').insert(notifications)
}

/**
 * Notifica l'autore dell'idea del risultato
 */
export async function notifyIdeaResult(userId, ideaTitle, approved, adminNote = null) {
  const type    = approved ? 'idea_approved' : 'idea_rejected'
  const emoji   = approved ? '✅' : '❌'
  const outcome = approved ? 'approvata' : 'rifiutata'
  let body = `La tua idea "${ideaTitle}" è stata ${outcome}.`
  if (!approved && adminNote) body += ` Motivazione: ${adminNote}`

  return sendNotification({
    userId,
    type,
    title: `${emoji} Idea ${outcome}`,
    body
  })
}

/**
 * Notifica un utente di un warning/ban emesso dall'admin
 */
export async function notifyWarning(userId, card, reason, banMinutes = null) {
  const labels = {
    yellow: '🟡 Cartellino giallo',
    orange: '🟠 Cartellino arancione',
    red:    '🔴 Ban permanente'
  }

  let body = `Motivo: ${reason}`
  if (card === 'orange' && banMinutes) body += `. Sei bannato per ${banMinutes} minuti.`
  if (card === 'red') body += '. Puoi fare appello via email all\'amministratore.'

  return sendNotification({
    userId,
    type: 'warning',
    title: labels[card] || 'Avviso',
    body
  })
}

/**
 * Segna tutte le notifiche di un utente come lette
 */
export async function markAllRead(userId) {
  return supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false)
}
