import { useState } from 'react'
import { MAT_COLOR } from '../utils/constants'

const TODAY = new Date().toISOString().split('T')[0]

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}
function getFirstDayOfWeek(year, month) {
  const d = new Date(year, month, 1).getDay()
  return d === 0 ? 6 : d - 1
}

const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MOIS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']

// Max tâches par jour (hors examens)
const MAX_PER_DAY = 2

function findNextFreeDate(fromDate, countByDate, examDates) {
  const d = new Date(fromDate + 'T12:00:00')
  d.setDate(d.getDate() + 1)
  for (let i = 0; i < 30; i++) {
    const str = d.toISOString().split('T')[0]
    if (!examDates.has(str) && (countByDate[str] || 0) < MAX_PER_DAY) return str
    d.setDate(d.getDate() + 1)
  }
  return null
}

export default function Planning({ dbData, userDB }) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selected, setSelected] = useState(null)

  const { db, markTaskDone, addReportedTask, removeReportedTask } = userDB
  const taskStatus = db.taskStatus || {}
  const reportedTasks = db.reportedTasks || {} // { originalDate__tache → { date, mat, tache, ... } }

  const examDates = new Set(dbData.meta.examens.map(e => e.date))

  // Toutes les tâches reportées indexées par date cible
  const reportedByDate = {}
  Object.values(reportedTasks).forEach(t => {
    if (!reportedByDate[t.date]) reportedByDate[t.date] = []
    reportedByDate[t.date].push(t)
  })

  // Tâches originales : on exclut celles qui ont un report actif (elles apparaissent à leur nouvelle date)
  const basePlanning = dbData.planning.filter(p => {
    const key = `${p.date}__${p.tache}`
    return !reportedTasks[key]
  })

  // Toutes les tâches (base + reportées)
  const allPlanItems = [
    ...basePlanning,
    ...Object.values(reportedTasks).map(t => ({ ...t, _reported: true }))
  ]

  // planMap : date → { plans[], exam }
  const planMap = {}
  allPlanItems.forEach(p => {
    if (!planMap[p.date]) planMap[p.date] = { plans: [], exam: null }
    planMap[p.date].plans.push(p)
  })
  dbData.meta.examens.forEach(e => {
    if (!planMap[e.date]) planMap[e.date] = { plans: [], exam: null }
    planMap[e.date].exam = e
  })

  // Comptage tâches par date (pour trouver les jours libres)
  const countByDate = {}
  allPlanItems.forEach(p => { countByDate[p.date] = (countByDate[p.date] || 0) + 1 })

  const getTaskKey = (date, tache) => `${date}__${tache}`

  const handleDone = (date, task) => {
    markTaskDone(date, task.tache, 'done')
  }

  const handleMissed = (date, task) => {
    // Vérifier si déjà reporté (idempotent)
    const originalDate = task._originalDate || date
    const reportKey = `${originalDate}__${task.tache}`
    if (reportedTasks[reportKey]) return // déjà reporté, ne rien faire

    markTaskDone(date, task.tache, 'missed')

    // Reporter à partir d'aujourd'hui si la date est dans le passé
    const fromDate = date < TODAY ? TODAY : date
    const nextDate = findNextFreeDate(fromDate, countByDate, examDates)
    if (nextDate) {
      addReportedTask(nextDate, { ...task, _originalDate: originalDate })
    }
  }

  // Annuler un report : remettre la tâche en "non traitée" et supprimer le report
  const handleUndoMissed = (originalDate, tache) => {
    markTaskDone(originalDate, tache, null)  // reset statut
    removeReportedTask(originalDate, tache)
  }

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfWeek(year, month)

  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const fmtDate = (d) => {
    const mm = String(month + 1).padStart(2, '0')
    const dd = String(d).padStart(2, '0')
    return `${year}-${mm}-${dd}`
  }

  const selectedDate = selected ? fmtDate(selected) : null
  const selectedInfo = selectedDate ? planMap[selectedDate] : null

  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`
  const monthExams = dbData.meta.examens.filter(e => e.date.startsWith(monthStr))

  // Tâches du mois (base + reportées)
  const monthTasks = allPlanItems.filter(p => p.date.startsWith(monthStr))
  const tasksByDate = {}
  monthTasks.forEach(p => {
    if (!tasksByDate[p.date]) tasksByDate[p.date] = []
    tasksByDate[p.date].push(p)
  })
  const sortedDates = Object.keys(tasksByDate).sort()

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11) } else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0) } else setMonth(m => m + 1)
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Planning</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Calendrier ── */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
            <button onClick={prevMonth} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-400 text-lg">‹</button>
            <span className="font-semibold text-sm text-gray-900 dark:text-white">{MOIS[month]} {year}</span>
            <button onClick={nextMonth} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-400 text-lg">›</button>
          </div>

          <div className="grid grid-cols-7 text-center border-b border-gray-100 dark:border-gray-800">
            {JOURS.map(j => (
              <div key={j} className="py-2 text-xs font-medium text-gray-400 dark:text-gray-500">{j}</div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {cells.map((d, i) => {
              if (!d) return <div key={`e-${i}`} className="h-16 border-b border-r border-gray-100 dark:border-gray-800" />
              const dateStr = fmtDate(d)
              const info = planMap[dateStr]
              const isToday = dateStr === TODAY
              const isSelected = selected === d
              const isExam = info?.exam
              const plans = info?.plans || []
              const realPlans = plans.filter(p => !p.tache.startsWith('🏥'))
              const isHospital = plans.some(p => p.tache.startsWith('🏥')) && realPlans.length === 0
              const hasReported = plans.some(p => p._reported)
              const allDone = realPlans.length > 0 && realPlans.every(p => {
                const origDate = p._originalDate || dateStr
                return taskStatus[getTaskKey(origDate, p.tache)] === 'done' ||
                       taskStatus[getTaskKey(dateStr, p.tache)] === 'done'
              })

              return (
                <button key={d} onClick={() => setSelected(d === selected ? null : d)}
                  className={`h-16 border-b border-r border-gray-100 dark:border-gray-800 p-1 text-left transition-colors relative
                    ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}
                    ${isExam ? 'ring-inset ring-2 ring-red-400' : ''}
                    ${allDone && !isExam ? 'bg-green-50/60 dark:bg-green-900/10' : ''}
                  `}>
                  <div className={`text-xs font-medium w-5 h-5 flex items-center justify-center rounded-full mb-0.5 ${
                    isToday ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-400'
                  }`}>{d}</div>

                  <div className="space-y-0.5">
                    {realPlans.slice(0, 2).map((p, pi) => {
                      const origDate = p._originalDate || dateStr
                      const status = taskStatus[getTaskKey(origDate, p.tache)] || taskStatus[getTaskKey(dateStr, p.tache)]
                      return (
                        <div key={pi} className="w-full h-1 rounded-full"
                          style={{ backgroundColor: status === 'done' ? '#22C55E' : status === 'missed' ? '#EF4444' : (MAT_COLOR[p.mat] || '#888') }} />
                      )
                    })}
                    {isHospital && <div className="w-full h-1 rounded-full bg-gray-400" />}
                  </div>

                  {realPlans.length >= 2 && (
                    <div className="absolute top-1 right-1 w-3 h-3 rounded-full bg-orange-400 text-white text-[8px] flex items-center justify-center font-bold">
                      {realPlans.length}
                    </div>
                  )}
                  {hasReported && <div className="absolute bottom-0.5 left-1 text-[9px] text-blue-400">↪</div>}
                  {isExam && <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />}
                  {isHospital && <div className="absolute bottom-0.5 right-1 text-[10px]">🏥</div>}
                  {allDone && !isExam && !isHospital && <div className="absolute bottom-0.5 right-1 text-[9px] text-green-500">✓</div>}
                </button>
              )
            })}
          </div>

          <div className="px-4 py-2.5 flex flex-wrap gap-3 border-t border-gray-100 dark:border-gray-800">
            {['PC','Maths','SIN','2I2D','Philo','GO','EXAM'].map(m => (
              <div key={m} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: MAT_COLOR[m] }} />{m}
              </div>
            ))}
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500" />Terminé
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <span className="text-blue-400 font-bold text-[10px]">↪</span>Reporté
            </div>
          </div>
        </div>

        {/* ── Panneau latéral ── */}
        <div className="space-y-4">

          {/* Détail du jour sélectionné */}
          {selectedInfo ? (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
              <div className="text-xs font-medium text-gray-400 mb-3">
                {new Date(selectedDate + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </div>

              {selectedInfo.exam && (
                <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 mb-3 border border-red-200 dark:border-red-800">
                  <div className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wide mb-1">⚠ EXAMEN</div>
                  <div className="text-sm font-semibold text-red-900 dark:text-red-200">{selectedInfo.exam.matiere}</div>
                  <div className="text-xs text-red-600 dark:text-red-400">{selectedInfo.exam.heure} · {selectedInfo.exam.duree} · coeff {selectedInfo.exam.coeff}</div>
                </div>
              )}

              {selectedInfo.plans.map((p, i) => {
                const isHospital = p.tache.startsWith('🏥')
                if (isHospital) return (
                  <div key={i} className="rounded-xl p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 mb-2 last:mb-0">
                    <div className="text-sm text-gray-500 dark:text-gray-400">{p.tache}</div>
                  </div>
                )

                const origDate = p._originalDate || selectedDate
                // Pour une tâche reportée, le statut propre est sur la clé selectedDate
                // Pour une tâche originale, c'est sur origDate
                const statusKey = p._reported ? getTaskKey(selectedDate, p.tache) : getTaskKey(origDate, p.tache)
                const status = taskStatus[statusKey]
                // Une tâche reportée est re-reportable si elle n'a pas déjà un nouveau report depuis cette date
                const reportKey = p._reported ? `${selectedDate}__${p.tache}` : `${origDate}__${p.tache}`
                const alreadyReported = !!reportedTasks[reportKey]

                return (
                  <div key={i} className="rounded-xl p-3 border mb-2 last:mb-0"
                    style={{ backgroundColor: (MAT_COLOR[p.mat] || '#888') + '12', borderColor: (MAT_COLOR[p.mat] || '#888') + '35' }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold" style={{ color: MAT_COLOR[p.mat] }}>{p.mat}</span>
                      {p._reported && (
                        <span className="text-[10px] text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-1.5 rounded-full">
                          ↪ Reporté
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-800 dark:text-gray-200 leading-snug mb-3">
                      {p.tache.replace(/^↪ Reporté : /, '')}
                    </div>

                    {/* Boutons — seulement si pas un examen */}
                    {!selectedInfo.exam && (
                      p._reported ? (
                        // Tâche reportée — si la date est passée : juste Annuler le report
                        // Si la date est aujourd'hui ou future : Terminé / Pas fait / Annuler
                        selectedDate < TODAY ? (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-blue-900/40 text-blue-300 text-center text-[11px]">
                              Reporté depuis le {origDate}
                            </div>
                            <button onClick={() => { markTaskDone(origDate, p.tache, null); removeReportedTask(origDate, p.tache) }}
                              className="px-2 py-1.5 rounded-lg text-xs text-gray-400 hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                              Annuler
                            </button>
                          </div>
                        ) : status === 'done' ? (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-green-500 text-white text-center">✓ Terminé !</div>
                            <button onClick={() => markTaskDone(selectedDate, p.tache, null)}
                              className="px-2 py-1.5 rounded-lg text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                              Annuler
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button onClick={() => markTaskDone(selectedDate, p.tache, 'done')}
                              className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/60 transition-colors">
                              ✓ Terminé
                            </button>
                            <button onClick={() => {
                              const nextDate = findNextFreeDate(selectedDate, countByDate, examDates)
                              if (nextDate) {
                                removeReportedTask(origDate, p.tache)
                                addReportedTask(nextDate, { ...p, _originalDate: origDate })
                              }
                            }}
                              className="py-1.5 px-2.5 rounded-lg text-xs font-semibold bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-200 transition-colors">
                              ↪ Pas fait
                            </button>
                            <button onClick={() => { markTaskDone(origDate, p.tache, null); removeReportedTask(origDate, p.tache) }}
                              className="py-1.5 px-2 rounded-lg text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                              Annuler
                            </button>
                          </div>
                        )
                      ) : (
                        // Tâche originale (non reportée)
                        status === 'done' ? (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-green-500 text-white text-center">✓ Terminé !</div>
                            <button onClick={() => markTaskDone(origDate, p.tache, null)}
                              className="px-2 py-1.5 rounded-lg text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                              Annuler
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button onClick={() => markTaskDone(origDate, p.tache, 'done')}
                              className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/60 transition-colors">
                              ✓ Terminé
                            </button>
                            <button onClick={() => handleMissed(origDate, p)}
                              className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors">
                              ↪ Pas fait
                            </button>
                          </div>
                        )
                      )
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 text-sm text-gray-400 text-center">
              Clique sur un jour pour voir le détail
            </div>
          )}

          {/* Examens du mois */}
          {monthExams.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-800 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                Examens ce mois
              </div>
              {monthExams.map(e => (
                <div key={e.date} className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <div className="text-xs text-red-600 dark:text-red-400 font-medium">
                    {new Date(e.date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{e.matiere}</div>
                  <div className="text-xs text-gray-400">{e.duree} · coeff {e.coeff}</div>
                </div>
              ))}
            </div>
          )}

          {/* Liste tâches du mois */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-800 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
              Révisions ce mois ({monthTasks.length})
            </div>
            <div className="max-h-72 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
              {sortedDates.length === 0 ? (
                <div className="p-4 text-sm text-gray-400 text-center">Aucune tâche ce mois.</div>
              ) : sortedDates.map(date => {
                const tasks = tasksByDate[date]
                const isToday = date === TODAY
                return (
                  <div key={date} className={`px-4 py-2 ${isToday ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                    <div className="text-xs text-gray-400 mb-1 flex items-center gap-1 flex-wrap">
                      {new Date(date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })}
                      {isToday && <span className="text-blue-600 dark:text-blue-400 font-semibold">· Aujourd'hui</span>}
                      {tasks.filter(p => !p.tache.startsWith('🏥')).length >= 2 && (
                        <span className="text-orange-500 font-semibold text-[10px] bg-orange-100 dark:bg-orange-900/30 px-1 rounded">
                          ×{tasks.filter(p => !p.tache.startsWith('🏥')).length}
                        </span>
                      )}
                    </div>
                    {tasks.map((p, i) => {
                      const origDate = p._originalDate || date
                      const status = taskStatus[getTaskKey(origDate, p.tache)] || taskStatus[getTaskKey(date, p.tache)]
                      return (
                        <div key={i} className="flex items-start gap-2 mb-0.5">
                          <div className="w-1 h-1 rounded-full shrink-0 mt-1.5"
                            style={{ backgroundColor: status === 'done' ? '#22C55E' : status === 'missed' ? '#EF4444' : (MAT_COLOR[p.mat] || '#9CA3AF') }} />
                          <div className={`text-xs leading-snug ${
                            status === 'done' ? 'line-through text-gray-400 dark:text-gray-600'
                            : 'text-gray-700 dark:text-gray-300'
                          }`}>
                            {p.tache.replace(/^↪ Reporté : /, '')}
                            {p._reported && <span className="ml-1 text-blue-400 text-[10px] not-italic">↪</span>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
