import { useState, useEffect, useCallback, useMemo } from 'react'
import { MAT_COLOR, MATIERES, FREQUENCES } from '../utils/constants'
import { sm2, boolToQuality, getDueCards } from '../utils/sm2'
import { shuffle } from '../utils/shuffle'

function CardView({ card, flipped, onFlip }) {
  return (
    <div className="cursor-pointer" onClick={onFlip}>
      {!flipped ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border-2 border-gray-200 dark:border-gray-700 p-6 flex flex-col justify-center items-center min-h-[160px] shadow-lg transition-all">
          <div className="text-xs font-semibold mb-3" style={{ color: MAT_COLOR[card.mat] }}>{card.mat}</div>
          <div className="text-lg font-semibold text-center text-gray-900 dark:text-white">{card.q}</div>
          <div className="mt-4 text-xs text-gray-400">Appuie sur Espace ou clique pour voir la réponse</div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border-2 border-blue-300 dark:border-blue-700 p-6 flex flex-col justify-center min-h-[160px] shadow-lg transition-all">
          <div className="text-xs font-semibold mb-3" style={{ color: MAT_COLOR[card.mat] }}>{card.mat}</div>
          <div className="text-sm font-mono whitespace-pre-wrap text-gray-800 dark:text-gray-200 leading-relaxed">{card.a}</div>
        </div>
      )}
    </div>
  )
}

export default function Flashcards({ userDB, dbData }) {
  const { db, updateSM2, addSession, updateDB } = userDB
  const [matFilter, setMatFilter] = useState('Tout')
  const [freqFilter, setFreqFilter] = useState('tout')
  const [dueOnly, setDueOnly] = useState(false)
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [session, setSession] = useState({ correct: 0, total: 0 })
  const [done, setDone] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ mat: 'PC', q: '', a: '', freq: 'chaque-annee' })

  const allCards = [...dbData.flashcards, ...(db.customFlashcards || [])]

  const filtered = allCards.filter(c => {
    if (matFilter !== 'Tout' && c.mat !== matFilter) return false
    if (freqFilter !== 'tout' && c.freq !== freqFilter) return false
    return true
  })

  // On mélange les cartes une fois par "session" (quand les filtres changent)
  // useMemo-like via state+useEffect
  const [shuffledCards, setShuffledCards] = useState([])
  useEffect(() => {
    const base = dueOnly ? getDueCards(filtered, db.smData) : filtered
    setShuffledCards(shuffle(base))
    setIdx(0); setFlipped(false); setSession({ correct: 0, total: 0 }); setDone(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matFilter, freqFilter, dueOnly, allCards.length])

  const cards = shuffledCards.length > 0 ? shuffledCards : (dueOnly ? getDueCards(filtered, db.smData) : filtered)
  const card = cards[idx]

  const reset = () => { setIdx(0); setFlipped(false); setSession({ correct: 0, total: 0 }); setDone(false) }

  // reset géré dans le useEffect shuffledCards ci-dessus

  const answer = useCallback((knew) => {
    const q = boolToQuality(knew)
    const prev = db.smData[card.id] || {}
    const updated = sm2({ ...prev, id: card.id }, q)
    updateSM2(card.id, updated, knew)

    const newSession = { correct: session.correct + (knew ? 1 : 0), total: session.total + 1 }
    setSession(newSession)

    if (idx + 1 >= cards.length) {
      addSession(card.mat, (newSession.correct / newSession.total) * 20)
      setDone(true)
    } else {
      setIdx(i => i + 1)
      setFlipped(false)
    }
  }, [card, idx, cards.length, db.smData, session, updateSM2, addSession])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!flipped && card) setFlipped(true) }
      if (e.key === 'ArrowRight' && flipped) answer(true)
      if (e.key === 'ArrowLeft' && flipped) answer(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [flipped, card, answer])

  const addCustomCard = () => {
    if (!addForm.q.trim() || !addForm.a.trim()) return
    userDB.updateDB(d => {
      if (!d.customFlashcards) d.customFlashcards = []
      d.customFlashcards.push({ ...addForm, id: `fc-custom-${Date.now()}` })
    })
    setAddForm({ mat: 'PC', q: '', a: '', freq: 'chaque-annee' })
    setShowAdd(false)
  }

  const dueCount = getDueCards(filtered, db.smData).length

  const missedCards = useMemo(() => {
    const ids = db.flashcardsMissed || []
    return allCards.filter(c => ids.includes(c.id))
  }, [db.flashcardsMissed, allCards.length])

  const [showMissed, setShowMissed] = useState(false)
  const [missedIdx, setMissedIdx] = useState(0)
  const [missedFlipped, setMissedFlipped] = useState(false)

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Flashcards</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {cards.length} carte{cards.length !== 1 ? 's' : ''}
            {dueCount > 0 && <span className="ml-2 text-red-500 font-medium">· {dueCount} à revoir aujourd'hui</span>}
          </p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          + Ajouter
        </button>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {MATIERES.map(m => (
            <button key={m} onClick={() => setMatFilter(m)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                matFilter === m ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-400'
              }`}>
              {m}
            </button>
          ))}
        </div>

        <button onClick={() => setDueOnly(d => !d)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            dueOnly ? 'bg-red-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
          }`}>
          {dueOnly ? '🔴 SM-2 seulement' : '⏰ Mode SM-2'}
        </button>
      </div>

      {/* ── Section À revoir ── */}
      {missedCards.length > 0 && (
        <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-950/20 overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-5 py-3 text-left"
            onClick={() => { setShowMissed(s => !s); setMissedIdx(0); setMissedFlipped(false) }}>
            <div className="flex items-center gap-2">
              <span className="text-red-400 font-bold text-sm">🔁 À revoir</span>
              <span className="text-xs bg-red-500 text-white rounded-full px-2 py-0.5 font-bold">{missedCards.length}</span>
              <span className="text-xs text-gray-400">cartes non maîtrisées</span>
            </div>
            <span className="text-gray-400 text-xs">{showMissed ? '▲ Masquer' : '▼ Voir'}</span>
          </button>

          {showMissed && (
            <div className="px-5 pb-5 border-t border-red-500/20">
              <div className="flex items-center justify-between text-xs text-gray-400 mt-3 mb-3">
                <span>{missedIdx + 1} / {missedCards.length}</span>
                <button onClick={() => {
                  const id = missedCards[missedIdx].id
                  userDB.updateDB(d => { d.flashcardsMissed = (d.flashcardsMissed || []).filter(x => x !== id) })
                }} className="text-green-400 hover:text-green-300 transition-colors">✓ Maîtrisé</button>
              </div>
              <CardView card={missedCards[missedIdx]} flipped={missedFlipped} onFlip={() => setMissedFlipped(f => !f)} />
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => { setMissedIdx(i => Math.max(0, i - 1)); setMissedFlipped(false) }}
                  disabled={missedIdx === 0}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-gray-800 text-gray-400 disabled:opacity-30 hover:bg-gray-700 transition-colors">
                  ←
                </button>
                <button
                  onClick={() => { setMissedIdx(i => Math.min(missedCards.length - 1, i + 1)); setMissedFlipped(false) }}
                  disabled={missedIdx >= missedCards.length - 1}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-gray-800 text-gray-400 disabled:opacity-30 hover:bg-gray-700 transition-colors">
                  →
                </button>
                <button onClick={() => {
                  const id = missedCards[missedIdx].id
                  userDB.updateDB(d => { d.flashcardsMissed = (d.flashcardsMissed || []).filter(x => x !== id) })
                  setMissedIdx(i => Math.min(i, missedCards.length - 2))
                  setMissedFlipped(false)
                }} className="flex-1 py-2 rounded-xl text-xs font-semibold bg-green-900/40 text-green-400 hover:bg-green-900/60 transition-colors">
                  ✓ Je maîtrise, retirer
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {cards.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          {dueOnly ? 'Aucune carte à revoir aujourd\'hui 🎉' : 'Aucune carte avec ces filtres.'}
        </div>
      ) : done ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 text-center">
          <div className="text-5xl mb-4">{session.correct === session.total ? '🏆' : session.correct >= session.total * 0.7 ? '👍' : '💪'}</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Session terminée !</h2>
          <div className="text-4xl font-bold text-blue-600 mb-1">{session.correct}/{session.total}</div>
          <div className="text-gray-500 dark:text-gray-400 mb-6">
            {Math.round(session.correct / session.total * 100)}% de réussite
          </div>
          <button onClick={reset}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-colors">
            Recommencer
          </button>
        </div>
      ) : (
        <div>
          {/* Progress */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">{idx + 1} / {cards.length}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">{session.correct} correct{session.correct !== 1 ? 's' : ''}</span>
          </div>
          <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mb-6">
            <div className="bg-blue-600 h-1.5 rounded-full transition-all" style={{ width: `${(idx / cards.length) * 100}%` }} />
          </div>

          <CardView card={card} flipped={flipped} onFlip={() => setFlipped(f => !f)} />

          {flipped && (
            <div className="mt-6 flex gap-4">
              <button onClick={() => answer(false)}
                className="flex-1 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 rounded-xl py-4 font-semibold text-sm transition-colors border border-red-200 dark:border-red-800">
                ✗ Je ne savais pas
                <div className="text-xs font-normal mt-0.5 opacity-70">← flèche gauche</div>
              </button>
              <button onClick={() => answer(true)}
                className="flex-1 bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50 text-green-700 dark:text-green-300 rounded-xl py-4 font-semibold text-sm transition-colors border border-green-200 dark:border-green-800">
                ✓ Je savais !
                <div className="text-xs font-normal mt-0.5 opacity-70">→ flèche droite</div>
              </button>
            </div>
          )}

          {!flipped && (
            <div className="mt-6 text-center">
              <button onClick={() => setFlipped(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-medium transition-colors">
                Voir la réponse
                <span className="ml-2 text-xs opacity-70">[Espace]</span>
              </button>
            </div>
          )}

          {/* SM-2 info */}
          {db.smData[card?.id] && (
            <div className="mt-4 text-center text-xs text-gray-400">
              Prochain rappel dans {db.smData[card.id].interval} jour{db.smData[card.id].interval !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Ajouter une flashcard</h2>
            <div className="space-y-3">
              <div className="flex gap-3">
                <select value={addForm.mat} onChange={e => setAddForm(f => ({...f, mat: e.target.value}))}
                  className="flex-1 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                  {['PC','Maths','SIN','2I2D','Philo','GO'].map(m => <option key={m}>{m}</option>)}
                </select>
                <select value={addForm.freq} onChange={e => setAddForm(f => ({...f, freq: e.target.value}))}
                  className="flex-1 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                  <option value="chaque-annee">Chaque année</option>
                  <option value="regulier">Régulier</option>
                </select>
              </div>
              <textarea value={addForm.q} onChange={e => setAddForm(f => ({...f, q: e.target.value}))}
                placeholder="Question" rows={2}
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none" />
              <textarea value={addForm.a} onChange={e => setAddForm(f => ({...f, a: e.target.value}))}
                placeholder="Réponse" rows={3}
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm font-mono bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none" />
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={addCustomCard} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 text-sm font-medium">Ajouter</button>
              <button onClick={() => setShowAdd(false)} className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg py-2 text-sm font-medium">Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
