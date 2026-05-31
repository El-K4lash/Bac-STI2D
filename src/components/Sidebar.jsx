import { useRef } from 'react'
import { getDaysLeft } from '../utils/constants'
import { requestNotifPermission } from '../utils/notifications'
import { getDBKey } from '../hooks/useDB'
import db from '../../data/db.json'

function getTomorrow() {
  const d = new Date(); d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}
const TODAY_S = new Date().toISOString().split('T')[0]
const TOMORROW_S = getTomorrow()
const hasExamSoon = db.meta.examens.some(e => e.date === TOMORROW_S || e.date === TODAY_S)

const NAV = [
  { id: 'dashboard',  label: 'Dashboard',        icon: '🏠' },
  { id: 'session',    label: 'Session du jour',   icon: '⚡', highlight: true },
  { id: 'planning',   label: 'Planning',          icon: '📅' },
  { id: 'fiches',     label: 'Fiches',            icon: '📖', badge: 'fichesRevCount' },
  { id: 'flashcards', label: 'Flashcards',        icon: '🃏', badge: 'dueCount' },
  { id: 'exercices',  label: 'Exercices',         icon: '✏️' },
  { id: 'erreurs',    label: 'Mode erreurs',      icon: '🎯', badge: 'erreursCount' },
  { id: 'simulation', label: 'Simulation bac',    icon: '📄' },
  { id: 'grandoral',  label: 'Grand Oral',        icon: '🎤' },
  { id: 'stats',      label: 'Mes stats',         icon: '📊' },
]

export default function Sidebar({ page, setPage, dueCount, fichesRevCount, erreursCount, userDB, currentUser, onLogout, isOpen, onClose }) {
  const { db, updateDB } = userDB
  const daysLeft = getDaysLeft()
  const toggleDark = () => updateDB(d => { d.darkMode = !d.darkMode })
  const importRef = useRef(null)

  const exportData = () => {
    const data = localStorage.getItem(getDBKey(currentUser))
    if (!data) return
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bac-stats-${currentUser}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importData = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result)
        localStorage.setItem(getDBKey(currentUser), JSON.stringify(parsed))
        window.location.reload()
      } catch { alert('Fichier invalide') }
    }
    reader.readAsText(file)
  }

  const toggleNotif = async () => {
    if (db.notifEnabled) {
      updateDB(d => { d.notifEnabled = false })
      return
    }
    if (!('Notification' in window)) { alert('Notifications non supportées par ce navigateur.'); return }
    if (Notification.permission === 'denied') { alert('Notifications bloquées. Va dans les paramètres de ton navigateur pour les autoriser.'); return }
    const granted = await requestNotifPermission()
    if (granted) updateDB(d => { d.notifEnabled = true })
    else alert('Permission refusée. Active les notifications dans les paramètres du navigateur.')
  }

  const urgency = daysLeft <= 7 ? 'red' : daysLeft <= 14 ? 'orange' : daysLeft <= 21 ? 'yellow' : 'green'
  const urgencyClasses = {
    red:    'bg-red-500/10 text-red-400 border border-red-500/20',
    orange: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
    yellow: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
    green:  'bg-green-500/10 text-green-400 border border-green-500/20',
  }

  const badges = { dueCount, fichesRevCount, erreursCount }

  return (
    <>
      {/* Overlay backdrop on mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 md:hidden"
          onClick={onClose}
        />
      )}
    <aside className={`
      w-56 shrink-0 flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800
      fixed md:static inset-y-0 left-0 z-30
      transition-transform duration-200
      ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
    `}>
      {/* Logo */}
      <div className="px-4 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-sm font-bold shadow-sm shrink-0">
            {currentUser ? currentUser.charAt(0).toUpperCase() : 'B'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-gray-900 dark:text-white leading-tight truncate">
              {currentUser ? currentUser.charAt(0).toUpperCase() + currentUser.slice(1) : 'Bac STI2D'}
            </div>
            <div className="text-xs text-gray-400 dark:text-gray-500">STI2D SIN 2026</div>
          </div>
          {onLogout && (
            <button onClick={onLogout} title="Changer de compte"
              className="text-gray-400 hover:text-gray-200 text-xs transition-colors shrink-0">
              ⇄
            </button>
          )}
        </div>

        <div className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold ${urgencyClasses[urgency]}`}>
          <span>Avant le bac</span>
          <span className="text-base font-bold tabular-nums">J−{daysLeft}</span>
        </div>

        {(db.streak || 0) > 0 && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-orange-500 dark:text-orange-400 font-medium">
            <span>🔥</span>
            <span>{db.streak} jour{db.streak !== 1 ? 's' : ''} de suite</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {/* Bouton veille examen — uniquement la veille ou le jour J */}
        {hasExamSoon && (
          <button onClick={() => setPage('veille')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-bold transition-all mb-1 animate-pulse ${
              page === 'veille'
                ? 'bg-red-600 text-white'
                : 'bg-red-600/20 text-red-400 border border-red-500/40 hover:bg-red-600/30'
            }`}>
            <span className="text-base leading-none">🎯</span>
            <span className="flex-1 text-left">Veille d'examen</span>
            <span className="text-[10px] bg-red-500 text-white rounded-full px-1.5 py-0.5 font-black">!</span>
          </button>
        )}
        {NAV.map(n => {
          const isActive = page === n.id
          const badgeCount = n.badge ? badges[n.badge] : 0
          return (
            <button key={n.id} onClick={() => setPage(n.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : n.highlight
                  ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
              }`}>
              <span className="text-base leading-none">{n.icon}</span>
              <span className="flex-1 text-left">{n.label}</span>
              {badgeCount > 0 && (
                <span className={`text-xs rounded-full px-1.5 py-0.5 leading-none font-bold ${
                  isActive ? 'bg-white/25 text-white' : 'bg-red-500 text-white'
                }`}>
                  {badgeCount}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-gray-100 dark:border-gray-800 space-y-0.5">
        <div className="flex gap-1 mb-1">
          <button onClick={exportData}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs text-gray-500 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300 transition-all"
            title="Exporter mes stats">
            <span>⬇</span><span>Export</span>
          </button>
          <button onClick={() => importRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs text-gray-500 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300 transition-all"
            title="Importer des stats">
            <span>⬆</span><span>Import</span>
          </button>
          <input ref={importRef} type="file" accept=".json" className="hidden" onChange={importData} />
        </div>
        <button onClick={toggleNotif}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-all">
          <span className="text-base">{db.notifEnabled ? '🔔' : '🔕'}</span>
          <span>{db.notifEnabled ? 'Notifs actives' : 'Activer notifs'}</span>
        </button>
        <button onClick={toggleDark}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-all">
          <span className="text-base">{db.darkMode ? '☀️' : '🌙'}</span>
          <span>{db.darkMode ? 'Mode clair' : 'Mode sombre'}</span>
        </button>
      </div>
    </aside>
    </>
  )
}
