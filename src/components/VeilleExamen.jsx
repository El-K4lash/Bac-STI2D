import { useMemo } from 'react'
import { MAT_COLOR } from '../utils/constants'

const TODAY = new Date().toISOString().split('T')[0]

function getTomorrow() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

// Matières liées à un examen
const EXAM_MATS = {
  'Philosophie': ['Philo'],
  'Physique-Chimie + Maths': ['PC', 'Maths'],
  '2I2D SIN': ['SIN', '2I2D'],
  '2I2D SIN – Épreuve pratique': ['SIN', '2I2D'],
  'Grand Oral': ['GO'],
}

export default function VeilleExamen({ dbData, userDB, setPage }) {
  const { db } = userDB
  const tomorrow = getTomorrow()

  // Examens demain
  const examsDemain = dbData.meta.examens.filter(e => e.date === tomorrow)
  // Examens aujourd'hui
  const examsAujourdHui = dbData.meta.examens.filter(e => e.date === TODAY)

  const exams = [...examsAujourdHui, ...examsDemain]

  // Matières concernées
  const matsExam = [...new Set(exams.flatMap(e => EXAM_MATS[e.matiere] || []))]

  // Fiches prioritaires pour ces matières
  const fichesKey = useMemo(() => {
    return dbData.fiches
      .filter(f => matsExam.includes(f.mat))
      .sort((a, b) => {
        const aScore = (b.priorite || 1) + (b.freq === 'chaque-annee' ? 3 : 0) - (db.fichesDone[a.id]?.mastered ? 5 : 0)
        const bScore = (b.priorite || 1) + (b.freq === 'chaque-annee' ? 3 : 0) - (db.fichesDone[b.id]?.mastered ? 5 : 0)
        return bScore - aScore
      })
      .slice(0, 12)
  }, [matsExam])

  // Exercices non réussis pour ces matières
  const exosARevoirData = useMemo(() => {
    return dbData.exercices
      .filter(e => matsExam.includes(e.mat))
      .filter(e => db.exoDone[e.id] && !db.exoDone[e.id].correct) // tenté ET raté
      .sort((a, b) => (b.freq === 'chaque-annee' ? 1 : 0) - (a.freq === 'chaque-annee' ? 1 : 0))
      .slice(0, 8)
  }, [matsExam])

  // Simulations bac disponibles pour ces matières
  const simsDispos = useMemo(() => {
    // Matières exam → types de sujets
    const matchSim = (mat) => {
      if (matsExam.includes('SIN') || matsExam.includes('2I2D')) return mat?.includes('2I2D') || mat?.includes('SIN')
      if (matsExam.includes('PC') || matsExam.includes('Maths')) return mat?.includes('PCM') || mat?.includes('PC')
      if (matsExam.includes('Philo')) return mat?.includes('Philo')
      return false
    }
    return [] // les sujets viennent de sujets_bac_reels.json, pas db
  }, [matsExam])

  // Flashcards à revoir
  const flashARevoirCount = dbData.flashcards
    .filter(f => matsExam.includes(f.mat))
    .filter(f => (db.flashcardsMissed || []).includes(f.id)) // uniquement celles marquées "pas su"
    .length

  if (exams.length === 0) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="text-center py-20">
          <div className="text-5xl mb-4">😴</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Pas d'examen demain</h1>
          <p className="text-gray-500 dark:text-gray-400">Cette page s'affiche automatiquement la veille d'un examen.</p>
          <button onClick={() => setPage('dashboard')}
            className="mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors">
            Retour au dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">🎯</span>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {examsAujourdHui.length > 0 ? "Examen aujourd'hui" : "Veille d'examen"}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Tout ce qu'il faut revoir avant demain</p>
          </div>
        </div>

        {/* Examen(s) */}
        {exams.map((e, i) => (
          <div key={i} className="mt-4 rounded-2xl border-2 border-red-500/40 bg-red-950/20 p-5">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <div className="text-xs font-bold text-red-400 uppercase tracking-widest mb-1">
                  {e.date === TODAY ? "📅 Aujourd'hui" : "📅 Demain"}
                </div>
                <div className="text-xl font-black text-white">{e.matiere}</div>
                <div className="text-sm text-gray-300 mt-1">
                  {e.heure} · {e.duree} · Coeff {e.coeff}
                  {e.salle && ` · Salle ${e.salle}`}
                </div>
                {e.note && <div className="text-xs text-gray-400 mt-1 italic">{e.note}</div>}
              </div>
              <div className="text-right">
                <div className="text-3xl font-black text-red-400">{e.duree}</div>
                <div className="text-xs text-gray-400">durée</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Checklist rapide */}
      <div className="mb-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
        <div className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">✅ Checklist matériel</div>
        <div className="grid grid-cols-2 gap-2">
          {['Carte d\'identité', 'Convocation', 'Stylos + crayon', 'Calculatrice (autorisée)', 'Règle + équerre', 'Réveil demain'].map(item => (
            <label key={item} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 rounded accent-green-500" />
              {item}
            </label>
          ))}
        </div>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 text-center">
          <div className="text-2xl font-black text-blue-500">{fichesKey.length}</div>
          <div className="text-xs text-gray-400 mt-1">Fiches à revoir</div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 text-center">
          <div className="text-2xl font-black text-orange-500">{exosARevoirData.length}</div>
          <div className="text-xs text-gray-400 mt-1">Exos non réussis</div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 text-center">
          <div className="text-2xl font-black text-red-500">{flashARevoirCount}</div>
          <div className="text-xs text-gray-400 mt-1">Flashcards à revoir</div>
        </div>
      </div>

      {/* Fiches prioritaires */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-bold text-gray-900 dark:text-white">📖 Fiches prioritaires</div>
          <button onClick={() => setPage('fiches')} className="text-xs text-blue-500 hover:underline">Voir toutes →</button>
        </div>
        <div className="space-y-2">
          {fichesKey.map(f => {
            const done = db.fichesDone[f.id]
            return (
              <div key={f.id} className="flex items-center gap-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 px-4 py-3">
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: MAT_COLOR[f.mat] }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{f.titre}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-bold" style={{ color: MAT_COLOR[f.mat] }}>{f.mat}</span>
                    {f.freq === 'chaque-annee' && <span className="text-[10px] text-orange-400">⭐ Chaque année</span>}
                  </div>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  done?.mastered ? 'bg-green-900/40 text-green-400'
                  : done?.seen ? 'bg-blue-900/40 text-blue-400'
                  : 'bg-orange-900/30 text-orange-400'
                }`}>
                  {done?.mastered ? '⭐ Maîtrisé' : done?.seen ? '👁 Vu' : 'À voir'}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Exercices non réussis */}
      {exosARevoirData.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-bold text-gray-900 dark:text-white">✏️ Exercices à refaire</div>
            <button onClick={() => setPage('exercices')} className="text-xs text-blue-500 hover:underline">Voir tous →</button>
          </div>
          <div className="space-y-2">
            {exosARevoirData.map(e => (
              <div key={e.id} className="flex items-center gap-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 px-4 py-3">
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: MAT_COLOR[e.mat] }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{e.titre}</div>
                  <span className="text-[10px] font-bold" style={{ color: MAT_COLOR[e.mat] }}>{e.mat}</span>
                  {e.freq === 'chaque-annee' && <span className="text-[10px] text-orange-400 ml-2">⭐ Chaque année</span>}
                </div>
                {db.exoDone[e.id] ? (
                  <span className="text-xs text-red-400 font-medium">✗ Raté</span>
                ) : (
                  <span className="text-xs text-gray-400">Non fait</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Simulations bac */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-bold text-gray-900 dark:text-white">🖥 Simulations bac</div>
          <button onClick={() => setPage('simulation')} className="text-xs text-blue-500 hover:underline">Lancer →</button>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 px-4 py-4 text-sm text-gray-600 dark:text-gray-400">
          Entraîne-toi sur les annales en conditions réelles — chronomètre, vraies questions, correction automatique.
          <button onClick={() => setPage('simulation')}
            className="mt-3 w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors">
            ▶ Lancer une simulation bac
          </button>
        </div>
      </div>

      {/* Session du jour */}
      <div className="mb-6">
        <button onClick={() => setPage('session')}
          className="w-full py-4 rounded-2xl font-bold text-base bg-green-600 hover:bg-green-700 text-white transition-colors shadow-lg">
          ▶ Lancer la session du jour
        </button>
      </div>

      {/* Flashcards */}
      <div>
        <button onClick={() => setPage('flashcards')}
          className="w-full py-3 rounded-2xl font-semibold text-sm bg-purple-600 hover:bg-purple-700 text-white transition-colors">
          🃏 Réviser les flashcards ({flashARevoirCount} à revoir)
        </button>
      </div>
    </div>
  )
}
