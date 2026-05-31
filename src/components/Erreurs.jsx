import { useState } from 'react'
import { MAT_COLOR } from '../utils/constants'
import { shuffleExo } from '../utils/shuffle'
import { renderMath } from '../utils/mathRender'
import { getDueCards } from '../utils/sm2'

const TODAY = new Date().toISOString().split('T')[0]

export default function Erreurs({ userDB, dbData }) {
  const { db, markExo, markFiche, updateSM2 } = userDB
  const [tab, setTab] = useState('exos') // exos | flashcards | fiches
  const [activeExo, setActiveExo] = useState(null)
  const [shuffled, setShuffled] = useState(null)
  const [choix, setChoix] = useState(null)
  const [confirmed, setConfirmed] = useState(false)

  // ── Exercices ratés ──
  const exosRates = dbData.exercices
    .filter(e => db.exoDone[e.id] && !db.exoDone[e.id].correct)
    .sort((a, b) => (db.exoDone[b.id]?.attempts || 0) - (db.exoDone[a.id]?.attempts || 0))

  // ── Flashcards mal sues (score SM-2 faible = easeFactor bas OU nextReview passé) ──
  const flashRates = [...dbData.flashcards, ...(db.customFlashcards || [])]
    .filter(c => {
      const d = db.smData[c.id]
      if (!d) return false
      return d.easeFactor < 2.0 || (d.nextReview && d.nextReview <= TODAY && d.repetitions > 0 && d.repetitions < 3)
    })
    .sort((a, b) => (db.smData[a.id]?.easeFactor || 2.5) - (db.smData[b.id]?.easeFactor || 2.5))

  // ── Fiches à revoir (nextReview passé) ──
  const fichesARevoir = dbData.fiches
    .filter(f => {
      const d = db.fichesDone[f.id]
      if (!d?.nextReview) return false
      return d.nextReview <= TODAY
    })
    .sort((a, b) => (db.fichesDone[a.id]?.nextReview || '').localeCompare(db.fichesDone[b.id]?.nextReview || ''))

  const openExo = (exo) => {
    setActiveExo(exo)
    setShuffled(shuffleExo(exo))
    setChoix(null)
    setConfirmed(false)
  }

  const confirm = () => {
    if (choix === null) return
    const correct = choix === shuffled.correct
    markExo(activeExo.id, correct)
    setConfirmed(true)
  }

  const TABS = [
    { id: 'exos', label: 'Exercices ratés', count: exosRates.length, color: '#EF4444' },
    { id: 'flashcards', label: 'Flashcards difficiles', count: flashRates.length, color: '#F59E0B' },
    { id: 'fiches', label: 'Fiches à revoir', count: fichesARevoir.length, color: '#3B82F6' },
  ]

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mode erreurs</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Révise uniquement tes points faibles</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              tab === t.id ? 'text-white shadow-sm' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
            style={tab === t.id ? { backgroundColor: t.color } : {}}>
            <span>{t.label}</span>
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
              tab === t.id ? 'bg-white/25 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* ── Exercices ratés ── */}
      {tab === 'exos' && (
        <div>
          {exosRates.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-4xl mb-3">🎉</div>
              <p className="text-gray-500 dark:text-gray-400">Aucun exercice raté — continue comme ça !</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {exosRates.map(exo => {
                const done = db.exoDone[exo.id]
                return (
                  <button key={exo.id} onClick={() => openExo(exo)}
                    className="bg-white dark:bg-gray-900 rounded-xl border border-red-200 dark:border-red-900/50 p-4 text-left hover:border-red-400 dark:hover:border-red-700 hover:shadow-md transition-all group">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: MAT_COLOR[exo.mat] + '22', color: MAT_COLOR[exo.mat] }}>{exo.mat}</span>
                      <span className="text-xs text-red-500 ml-auto font-medium">{done.attempts} tentative{done.attempts !== 1 ? 's' : ''} · toujours raté</span>
                    </div>
                    <div className="font-semibold text-sm text-gray-900 dark:text-white group-hover:text-red-600 transition-colors mb-1">{exo.titre}</div>
                    <div className="text-xs text-gray-400 line-clamp-2">{exo.enonce}</div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Flashcards difficiles ── */}
      {tab === 'flashcards' && (
        <div>
          {flashRates.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-4xl mb-3">🎉</div>
              <p className="text-gray-500 dark:text-gray-400">Toutes tes flashcards sont bien maîtrisées !</p>
            </div>
          ) : (
            <div className="space-y-3">
              {flashRates.map(card => {
                const sm = db.smData[card.id]
                return (
                  <div key={card.id} className="bg-white dark:bg-gray-900 rounded-xl border border-orange-200 dark:border-orange-900/50 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold" style={{ color: MAT_COLOR[card.mat] }}>{card.mat}</span>
                          <span className="text-xs text-orange-500">facilité {sm?.easeFactor?.toFixed(1)}/2.5</span>
                          {sm?.nextReview && sm.nextReview <= TODAY && (
                            <span className="text-xs text-red-500 font-medium">à revoir !</span>
                          )}
                        </div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{renderMath(card.q)}</div>
                        <div className="text-xs font-mono text-gray-500 dark:text-gray-400 whitespace-pre-wrap">{renderMath(card.a)}</div>
                      </div>
                      <div className="text-xs text-gray-400 shrink-0">
                        prochain : {sm?.nextReview || '—'}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Fiches à revoir ── */}
      {tab === 'fiches' && (
        <div>
          {fichesARevoir.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-4xl mb-3">📚</div>
              <p className="text-gray-500 dark:text-gray-400">Aucune fiche à revoir pour l'instant.</p>
              <p className="text-xs text-gray-400 mt-1">Les fiches vues reviennent automatiquement après 3, 7, 14 jours…</p>
            </div>
          ) : (
            <div className="space-y-3">
              {fichesARevoir.map(fiche => {
                const d = db.fichesDone[fiche.id]
                const overdue = d?.nextReview < TODAY
                return (
                  <div key={fiche.id} className={`bg-white dark:bg-gray-900 rounded-xl border p-4 ${overdue ? 'border-red-200 dark:border-red-900/50' : 'border-blue-200 dark:border-blue-900/50'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold" style={{ color: MAT_COLOR[fiche.mat] }}>{fiche.mat}</span>
                        {overdue && <span className="text-xs text-red-500 font-medium">En retard !</span>}
                      </div>
                      <span className="text-xs text-gray-400">à revoir depuis {d?.nextReview}</span>
                    </div>
                    <div className="font-semibold text-sm text-gray-900 dark:text-white mb-2">{fiche.titre}</div>
                    <div className="text-xs font-mono text-gray-400 line-clamp-2">{renderMath(fiche.contenu.split('\n')[0])}</div>
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => markFiche(fiche.id, false)}
                        className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition-colors">
                        👁 Revu
                      </button>
                      <button onClick={() => markFiche(fiche.id, true)}
                        className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-100 transition-colors">
                        ⭐ Maîtrisé
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal exercice */}
      {activeExo && shuffled && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setActiveExo(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-xs font-bold" style={{ color: MAT_COLOR[activeExo.mat] }}>{activeExo.mat}</span>
                <h3 className="font-bold text-gray-900 dark:text-white">{activeExo.titre}</h3>
              </div>
              <button onClick={() => setActiveExo(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-sm mb-4 border-l-4" style={{ borderLeftColor: MAT_COLOR[activeExo.mat] }}>
              {renderMath(activeExo.enonce)}
            </div>
            <div className="space-y-2 mb-4">
              {shuffled.options.map((opt, i) => {
                let cls = 'border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200'
                if (confirmed) {
                  if (i === shuffled.correct) cls = 'border-2 border-green-500 bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                  else if (i === choix) cls = 'border-2 border-red-400 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                  else cls = 'border border-gray-100 dark:border-gray-800 text-gray-400'
                } else if (choix === i) cls = 'border-2 border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
                return (
                  <button key={i} disabled={confirmed} onClick={() => setChoix(i)}
                    className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-colors ${cls}`}>
                    <span className="font-mono font-bold text-gray-400 mr-2">{i+1}.</span>{renderMath(opt)}
                  </button>
                )
              })}
            </div>
            {confirmed ? (
              <div className="space-y-3">
                <div className={`rounded-xl p-3 text-xs ${choix === shuffled.correct ? 'bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200' : 'bg-orange-50 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200'}`}>
                  {renderMath(activeExo.explication)}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openExo(activeExo)} className="flex-1 py-2 rounded-xl text-sm font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition-colors">↺ Réessayer</button>
                  <button onClick={() => setActiveExo(null)} className="flex-1 py-2 rounded-xl text-sm font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 transition-colors">Fermer</button>
                </div>
              </div>
            ) : (
              <button onClick={confirm} disabled={choix === null}
                className={`w-full py-3 rounded-xl font-semibold text-sm transition-colors ${choix !== null ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'}`}>
                Valider
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
