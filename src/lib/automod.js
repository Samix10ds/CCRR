import { supabase } from './supabase'

let bannedWordsCache = []
let cacheLoaded = false

export async function loadBannedWords() {
  const { data } = await supabase
    .from('banned_words')
    .select('word')
    .eq('status', 'approved')

  if (data) {
    bannedWordsCache = data.map(r => r.word.toLowerCase().trim())
    cacheLoaded = true
  }
}

// BUG FIX: normalizza accenti e usa contains invece di \b per parole italiane
function normalizeText(text) {
  return text.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // rimuove accenti
}

export function checkText(text) {
  if (!cacheLoaded || bannedWordsCache.length === 0) return { flagged: false, words: [] }

  const normalized = normalizeText(text)
  const found = bannedWordsCache.filter(word => {
    const normalizedWord = normalizeText(word)
    // Controlla con separatori di parola generici (funziona anche con parole italiane)
    const pattern = `(^|[\\s.,!?;:'"()\\[\\]{}<>/\\\\-])${normalizedWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([\\s.,!?;:'"()\\[\\]{}<>/\\\\-]|$)`
    const regex = new RegExp(pattern, 'i')
    // Controlla anche substring pura per parole composte
    return regex.test(normalized) || normalized.includes(normalizedWord)
  })

  return { flagged: found.length > 0, words: found }
}

export async function applyAutoBan(userId, words) {
  const { data: warnings } = await supabase
    .from('warnings')
    .select('card')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  const prevCount = warnings?.length || 0
  let card = 'yellow'
  let banMinutes = null

  if (prevCount === 0)     { card = 'yellow' }
  else if (prevCount === 1) { card = 'orange'; banMinutes = 30 }
  else                      { card = 'red' }

  await supabase.from('warnings').insert({
    user_id: userId,
    card,
    reason: `Ban automatico: parole vietate rilevate (${words.join(', ')})`,
    ban_duration_minutes: banMinutes,
    is_auto: true
  })

  const updateData = { card }
  if (card === 'orange' && banMinutes) {
    updateData.ban_until = new Date(Date.now() + banMinutes * 60 * 1000).toISOString()
  }
  if (card === 'red') {
    updateData.is_permanently_banned = true
  }

  await supabase.from('profiles').update(updateData).eq('id', userId)

  let notifBody = ''
  if (card === 'yellow') notifBody = `Cartellino giallo per parole vietate: "${words.join(', ')}".`
  if (card === 'orange') notifBody = `Cartellino arancione. Sei bannato per ${banMinutes} minuti.`
  if (card === 'red')    notifBody = `Ban permanente. Puoi fare appello contattando l'amministratore.`

  await supabase.from('notifications').insert({
    user_id: userId,
    type: 'ban',
    title: '⚠️ Violazione rilevata',
    body: notifBody
  })

  return { card, banMinutes }
}

export function checkBanStatus(profile) {
  if (!profile) return { banned: false }

  if (profile.is_permanently_banned) {
    return { banned: true, reason: 'permanente' }
  }

  if (profile.ban_until) {
    const banUntil = new Date(profile.ban_until)
    if (banUntil > new Date()) {
      const minutes = Math.ceil((banUntil - new Date()) / 60000)
      return { banned: true, reason: `temporaneo (${minutes} min rimanenti)` }
    }
  }

  return { banned: false }
}
