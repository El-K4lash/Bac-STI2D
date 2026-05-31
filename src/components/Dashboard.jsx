import { MAT_COLOR, getDaysLeft } from '../utils/constants'
import { getDueCards } from '../utils/sm2'

const TODAY = new Date().toISOString().split('T')[0]

function KpiCard({ label, value, sub, icon, color }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 flex items-center gap-4">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
        style={{ backgroundColor: color + '18' }}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xl font-bold tabular-nums" style={{ color }}>{value}</div>
        <div className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{label}</div>
        {sub && <div className="text-xs text-gray-400 truncate">{sub}</div>}
      </div>
    </div>
  )
}

export default function Dashboard({ userDB, dbData, setPage }) {
  const { db, fichesVues, fichesMaitrisees, exosFaits, exosReussis, avgNote } = userDB
  const daysLeft = getDaysLeft()

  const allCards = [...dbData.flashcards, ...(db.customFlashcards || [])]
  const dueCards = getDueCards(allCards, db.smData)

  const todayPlan = dbData.planning.find(p => p.date === TODAY)
  const nextExam = dbData.meta.examens.find(e => e.date >= TODAY)
  const recentNotes = [...db.notes].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5)

  // Progression par matière
  const matStats = ['PC', 'Maths', 'SIN', '2I2D', 'Philo', 'GO'].map(mat => {
    const fiches = dbData.fiches.filter(f => f.mat === mat)
    const vues = fiches.filter(f => db.fichesDone[f.id]?.seen).length
    const maitrisees = fiches.filter(f => db.fichesDone[f.id]?.mastered).length
    return { mat, total: fiches.length, vues, maitrisees }
  }).filter(m => m.total > 0)

  // Prochain exam countdown
  const nextExamDays = nextExam
    ? Math.ceil((new Date(nextExam.date) - new Date(TODAY)) / 86400000)
    : null

  const mot = daysLeft <= 3 ? 'Dernière ligne droite ! 💪'
    : daysLeft <= 7 ? 'On y est presque ! 🎯'
    : daysLeft <= 14 ? 'Continue comme ça ! 📚'
    : 'Le travail régulier paye toujours ! 🚀'

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      {/* Hero header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Bonjour Hugo 👋
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <p className="text-sm text-blue-600 dark:text-blue-400 font-medium mt-1">{mot}</p>
        </div>
        <div className={`text-center rounded-2xl px-5 py-3 font-bold shrink-0 ${
          daysLeft <= 7 ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
          : daysLeft <= 14 ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400'
          : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
        }`}>
          <div className="text-4xl font-black tabular-nums">{daysLeft}</div>
          <div className="text-xs font-medium mt-0.5">jours avant le bac</div>
        </div>
      </div>

      {/* Tâche du jour + prochain examen */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {todayPlan ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 flex items-start gap-3">
            <div className="w-2 h-full min-h-[40px] rounded-full shrink-0" style={{ backgroundColor: MAT_COLOR[todayPlan.mat] || '#888' }} />
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: MAT_COLOR[todayPlan.mat] }}>
                Aujourd'hui · {todayPlan.mat}
              </div>
              <div className="font-semibold text-sm text-gray-900 dark:text-white leading-snug">{todayPlan.tache}</div>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 text-sm text-gray-400">
            Aucune tâche planifiée aujourd'hui.
          </div>
        )}

        {nextExam && (
          <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800/50 p-4">
            <div className="text-xs font-semibold text-red-500 dark:text-red-400 uppercase tracking-wider mb-1">
              Prochain examen · dans {nextExamDays} jour{nextExamDays !== 1 ? 's' : ''}
            </div>
            <div className="flex items-center justify-between">
              <div className="font-bold text-red-800 dark:text-red-200 text-sm">{nextExam.matiere}</div>
              <div className="text-xs text-red-600 dark:text-red-400 text-right">
                <div>{new Date(nextExam.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}</div>
                <div>{nextExam.heure} · {nextExam.duree} · coeff {nextExam.coeff}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon="🃏" label="Flashcards à revoir" value={dueCards.length} sub="SM-2 aujourd'hui" color="#E53E3E" />
        <KpiCard icon="📖" label="Fiches vues" value={`${fichesVues}/${dbData.fiches.length}`} sub={`${fichesMaitrisees} maîtrisées`} color="#3182CE" />
        <KpiCard icon="✏️" label="Exercices" value={`${exosReussis}/${exosFaits}`} sub="réussis / faits" color="#38A169" />
        <KpiCard icon="📈" label="Moyenne" value={avgNote != null ? `${avgNote}/20` : '—'} sub={`${db.notes.length} note${db.notes.length !== 1 ? 's' : ''}`} color="#D69E2E" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Progression fiches */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-4">Progression par matière</h2>
          <div className="space-y-3">
            {matStats.map(({ mat, total, vues, maitrisees }) => (
              <div key={mat}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-semibold" style={{ color: MAT_COLOR[mat] }}>{mat}</span>
                  <span className="text-xs text-gray-400">{vues}/{total} vues · {maitrisees} maîtrisées</span>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  {/* Fond = vues */}
                  <div className="h-full rounded-full relative" style={{ width: `${total ? vues/total*100 : 0}%`, backgroundColor: MAT_COLOR[mat] + '50' }}>
                    {/* Premier plan = maîtrisées */}
                    <div className="absolute left-0 top-0 h-full rounded-full" style={{ width: `${vues ? maitrisees/vues*100 : 0}%`, backgroundColor: MAT_COLOR[mat] }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Flashcards à revoir + notes récentes */}
        <div className="space-y-4">
          {/* Flashcards SM-2 */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                Flashcards à revoir
                {dueCards.length > 0 && (
                  <span className="ml-2 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 text-xs font-bold px-1.5 py-0.5 rounded-full">
                    {dueCards.length}
                  </span>
                )}
              </h2>
              {dueCards.length > 0 && (
                <button onClick={() => setPage('flashcards')} className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium">
                  Commencer →
                </button>
              )}
            </div>
            {dueCards.length === 0 ? (
              <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1.5">
                <span>🎉</span> Rien à revoir aujourd'hui !
              </p>
            ) : (
              <div className="space-y-2">
                {dueCards.slice(0, 4).map(c => (
                  <div key={c.id} className="flex items-center gap-2 text-sm">
                    <span className="text-xs font-bold w-10 shrink-0" style={{ color: MAT_COLOR[c.mat] }}>{c.mat}</span>
                    <span className="text-gray-600 dark:text-gray-400 truncate text-xs">{c.q}</span>
                  </div>
                ))}
                {dueCards.length > 4 && (
                  <div className="text-xs text-gray-400">+ {dueCards.length - 4} autres cartes</div>
                )}
              </div>
            )}
          </div>

          {/* Notes récentes */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Notes récentes</h2>
              <button onClick={() => setPage('stats')} className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium">
                Tout voir →
              </button>
            </div>
            {recentNotes.length === 0 ? (
              <p className="text-xs text-gray-400">Aucune note. Lance une simulation !</p>
            ) : (
              <div className="space-y-2">
                {recentNotes.map(n => (
                  <div key={n.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold w-10 shrink-0" style={{ color: MAT_COLOR[n.mat] }}>{n.mat}</span>
                      <span className="text-gray-600 dark:text-gray-400 truncate text-xs">{n.titre || n.src || '—'}</span>
                    </div>
                    <span className={`font-bold tabular-nums text-sm shrink-0 ml-2 ${
                      n.val >= 14 ? 'text-green-600 dark:text-green-400'
                      : n.val >= 10 ? 'text-orange-500'
                      : 'text-red-500'
                    }`}>{n.val}/20</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions rapides */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Accès rapide</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Session du jour', icon: '⚡', page: 'session', desc: 'Parcours complet du jour', highlight: true },
            { label: 'Flashcards', icon: '🃏', page: 'flashcards', desc: dueCards.length > 0 ? `${dueCards.length} à revoir !` : 'Tout à jour ✓' },
            { label: 'Exercices QCM', icon: '✏️', page: 'exercices', desc: `${dbData.exercices.length} exercices` },
            { label: 'Simulation bac', icon: '🎯', page: 'simulation', desc: 'Vrais sujets + timer' },
          ].map(btn => (
            <button key={btn.page} onClick={() => setPage(btn.page)}
              className={`rounded-2xl p-4 border hover:shadow-md transition-all text-left group ${
              btn.highlight
                ? 'bg-blue-600 border-blue-500 hover:bg-blue-700'
                : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:border-blue-200 dark:hover:border-blue-800 dark:hover:shadow-blue-900/20'
            }`}>
              <div className="text-2xl mb-2">{btn.icon}</div>
              <div className={`text-sm font-semibold transition-colors ${btn.highlight ? 'text-white' : 'text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400'}`}>{btn.label}</div>
              <div className={`text-xs mt-0.5 ${btn.highlight ? 'text-blue-200' : 'text-gray-400'}`}>{btn.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
