/**
 * Système de notifications navigateur pour rappels de révision.
 */

export async function requestNotifPermission() {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  const perm = await Notification.requestPermission()
  return perm === 'granted'
}

export function sendNotif(title, body, icon = '📚') {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  new Notification(`${icon} ${title}`, { body, icon: '/Bac-STI2D/favicon.svg' })
}

/**
 * Planifie un rappel à une heure précise (heure locale HH:MM).
 * Retourne l'id du timeout pour pouvoir l'annuler.
 */
export function scheduleDaily(hour, minute, callback) {
  const now = new Date()
  const target = new Date()
  target.setHours(hour, minute, 0, 0)
  if (target <= now) target.setDate(target.getDate() + 1)
  const ms = target - now
  return setTimeout(callback, ms)
}

/**
 * Vérifie si la session du jour a été faite et envoie un rappel si non.
 */
export function checkDailySession(db) {
  const today = new Date().toISOString().split('T')[0]
  const sessionToday = db.sessions?.some(s => s.date === today)
  if (!sessionToday) {
    sendNotif(
      'Session du jour non faite !',
      'Tu n\'as pas encore révisé aujourd\'hui. Lance ta session maintenant ! 💪',
      '⚡'
    )
  }
}
