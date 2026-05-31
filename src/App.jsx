import { useState, useEffect, useCallback } from 'react'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import Fiches from './components/Fiches'
import Flashcards from './components/Flashcards'
import Exercices from './components/Exercices'
import Simulation from './components/Simulation'
import Stats from './components/Stats'
import Planning from './components/Planning'
import Session from './components/Session'
import Erreurs from './components/Erreurs'
import GrandOral from './components/GrandOral'
import VeilleExamen from './components/VeilleExamen'
import { useDB, getCurrentUser, setCurrentUser, logoutUser } from './hooks/useDB'
import Login from './components/Login'
import { getDueCards } from './utils/sm2'
import { requestNotifPermission, scheduleDaily, checkDailySession } from './utils/notifications'
import db from '../data/db.json'

function getTomorrow() {
  const d = new Date(); d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}
const TODAY_STR = new Date().toISOString().split('T')[0]

export default function App() {
  const [currentUser, setUser] = useState(() => getCurrentUser())

  const handleLogin = useCallback((prenom) => {
    setCurrentUser(prenom)
    setUser(prenom)
  }, [])

  if (!currentUser) return <Login onLogin={handleLogin} />

  return <AppInner currentUser={currentUser} onLogout={() => { logoutUser(); setUser(null) }} />
}

function AppInner({ currentUser, onLogout }) {
  const tomorrow = getTomorrow()
  const examTomorrow = db.meta.examens.find(e => e.date === tomorrow || e.date === TODAY_STR)
  const [page, setPage] = useState(examTomorrow ? 'veille' : 'dashboard')
  const userDB = useDB(currentUser)
  const { db: udb } = userDB

  // Dark mode
  useEffect(() => {
    document.documentElement.classList.toggle('dark', udb.darkMode)
  }, [udb.darkMode])

  // Escape → dashboard
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setPage('dashboard') }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Notifications : demander permission + planifier rappel 18h
  useEffect(() => {
    if (udb.notifEnabled) {
      requestNotifPermission().then(granted => {
        if (granted) {
          const id = scheduleDaily(18, 0, () => checkDailySession(udb))
          return () => clearTimeout(id)
        }
      })
    }
  }, [udb.notifEnabled])

  // Auto-report : tâches non traitées + correction des reports sur jours d'examen
  useEffect(() => {
    const taskStatus = udb.taskStatus || {}
    const reportedTasks = udb.reportedTasks || {}
    const examDates = new Set(db.meta.examens.map(e => e.date))

    const countByDate = {}
    db.planning.forEach(p => { countByDate[p.date] = (countByDate[p.date] || 0) + 1 })
    Object.values(reportedTasks).forEach(t => { countByDate[t.date] = (countByDate[t.date] || 0) + 1 })

    const findNext = (fromDate) => {
      const d = new Date(fromDate + 'T12:00:00')
      d.setDate(d.getDate() + 1)
      for (let i = 0; i < 60; i++) {
        const str = d.toISOString().split('T')[0]
        if (!examDates.has(str) && (countByDate[str] || 0) < 2) return str
        d.setDate(d.getDate() + 1)
      }
      return null
    }

    // Tâches passées non traitées
    const missed = db.planning.filter(p => {
      if (p.date >= TODAY_STR) return false
      if (p.tache.startsWith('🏥') || p.mat === 'EXAM') return false
      const key = `${p.date}__${p.tache}`
      if (taskStatus[key] === 'done' || taskStatus[key] === 'missed') return false
      if (reportedTasks[key]) return false
      return true
    })

    // Reports existants sur un jour d'examen → à re-déplacer
    const badReports = Object.entries(reportedTasks).filter(([, t]) => examDates.has(t.date))

    if (missed.length === 0 && badReports.length === 0) return

    userDB.updateDB(d => {
      if (!d.taskStatus) d.taskStatus = {}
      if (!d.reportedTasks) d.reportedTasks = {}

      // Corriger les reports sur jours d'examen
      badReports.forEach(([key, t]) => {
        const newDate = findNext(t.date)
        if (newDate) {
          d.reportedTasks[key] = { ...t, date: newDate }
          countByDate[newDate] = (countByDate[newDate] || 0) + 1
        }
      })

      // Reporter les tâches passées non traitées
      missed.forEach(p => {
        const key = `${p.date}__${p.tache}`
        d.taskStatus[key] = 'missed'
        const yesterday = new Date(TODAY_STR + 'T12:00:00')
        yesterday.setDate(yesterday.getDate() - 1)
        const nextDate = findNext(yesterday.toISOString().split('T')[0])
        if (nextDate) {
          d.reportedTasks[key] = { ...p, date: nextDate, _reported: true, _originalDate: p.date }
          countByDate[nextDate] = (countByDate[nextDate] || 0) + 1
        }
      })
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const allCards = [...db.flashcards, ...(udb.customFlashcards || [])]
  const dueCount = getDueCards(allCards, udb.smData).length

  // Fiches à revoir (SM-2)
  const today = new Date().toISOString().split('T')[0]
  const fichesRevCount = db.fiches.filter(f => {
    const d = udb.fichesDone?.[f.id]
    return d?.nextReview && d.nextReview <= today
  }).length

  // Exercices ratés
  const erreursCount = db.exercices.filter(e => udb.exoDone?.[e.id] && !udb.exoDone[e.id].correct).length

  const pages = {
    dashboard: Dashboard,
    session: Session,
    planning: Planning,
    fiches: Fiches,
    flashcards: Flashcards,
    exercices: Exercices,
    simulation: Simulation,
    erreurs: Erreurs,
    grandoral: GrandOral,
    stats: Stats,
    veille: VeilleExamen,
  }
  const Page = pages[page] || Dashboard

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <Sidebar
        page={page} setPage={setPage}
        dueCount={dueCount}
        fichesRevCount={fichesRevCount}
        erreursCount={erreursCount}
        userDB={userDB}
        currentUser={currentUser}
        onLogout={onLogout}
      />
      <main className="flex-1 overflow-y-auto">
        <Page userDB={userDB} dbData={db} setPage={setPage} />
      </main>
    </div>
  )
}
