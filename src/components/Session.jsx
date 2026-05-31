import { useState, useEffect, useCallback, useRef } from 'react'
import { MAT_COLOR } from '../utils/constants'
import { sm2, boolToQuality } from '../utils/sm2'
import { shuffleExo, shuffle } from '../utils/shuffle'
import { renderMath } from '../utils/mathRender'
import { renderFicheContent } from '../utils/renderFiche'

const TODAY = new Date().toISOString().split('T')[0]

/* ─── Types de blocs disponibles dans une session ─────────────────── */
// fiche | flashcard | qcm | controle | recap

/* ─── Utilitaires ──────────────────────────────────────────────────── */
function getMatsForToday(dbData) {
  const tasks = dbData.planning.filter(p => p.date === TODAY && !p.tache.startsWith('🏥'))
  if (tasks.length === 0) {
    // Pas de tâche aujourd'hui → prendre la plus proche dans le futur
    const upcoming = dbData.planning
      .filter(p => p.date >= TODAY && !p.tache.startsWith('🏥') && p.mat !== 'EXAM')
      .sort((a, b) => a.date.localeCompare(b.date))
    return upcoming.slice(0, 2).map(p => p.mat)
  }
  return [...new Set(tasks.map(p => p.mat))]
}

/**
 * Extrait les mots-clés significatifs d'une tâche planning pour matcher
 * les fiches/flashcards/exos correspondants.
 * Ex: "Circuits sinusoïdaux : tension efficace, cos φ" → ['sinusoïdaux','tension','efficace','cos']
 */
function extractKeywords(tache) {
  const cleaned = tache
    .toLowerCase()
    .replace(/[():,φηλ↪⭐]/g, ' ')
    .replace(/\b(et|les|des|de|du|la|le|un|une|en|sur|au|aux|par|pour|avec|dans|qui|que|se|ce|sa|son|ses|leur|leurs|tout|tous|toute|rattrapé|annale|conditions|réelles|min|max)\b/g, ' ')
    .trim()
  return cleaned.split(/\s+/).filter(w => w.length > 3)
}

/**
 * Score de correspondance entre une tâche planning et un item (fiche/exo/flash).
 * Compare les mots-clés de la tâche avec le titre/contenu de l'item.
 */
function matchScore(keywords, text) {
  const t = text.toLowerCase()
  return keywords.reduce((score, kw) => score + (t.includes(kw) ? 1 : 0), 0)
}

function buildSession(dbData, userDB_db, mats) {
  const blocks = []

  // Récupérer les tâches du jour pour chaque matière
  const todayTasks = dbData.planning.filter(
    p => p.date === TODAY && !p.tache.startsWith('🏥') && p.mat !== 'EXAM'
  )

  mats.forEach(mat => {
    // Tâches du jour pour cette matière
    const matTasks = todayTasks.filter(t => t.mat === mat)
    // Mots-clés issus des tâches (ex: ['sinusoïdaux','tension','efficace','rendement'])
    const keywords = matTasks.flatMap(t => extractKeywords(t.tache))

    const allFiches = dbData.fiches.filter(f => f.mat === mat)
    const allFlashcards = dbData.flashcards.filter(f => f.mat === mat)
    const allExos = dbData.exercices.filter(e => e.mat === mat && !e.type)

    // ── Fiches : trier par pertinence par rapport aux tâches du jour ──
    // Score = nb de mots-clés de la tâche trouvés dans titre + contenu de la fiche
    const fichesScored = allFiches.map(f => ({
      fiche: f,
      score: keywords.length > 0
        ? matchScore(keywords, f.titre + ' ' + f.contenu)
        : (userDB_db.fichesDone?.[f.id]?.seen ? 0 : 1) * f.priorite,
      vue: !!(userDB_db.fichesDone?.[f.id]?.seen),
    }))
    // On trie : non vues ET pertinentes d'abord
    fichesScored.sort((a, b) => {
      if (a.vue !== b.vue) return a.vue ? 1 : -1  // non vue avant vue
      return b.score - a.score                      // plus pertinent avant
    })

    // Prendre les fiches les plus pertinentes (max 2 si plusieurs tâches)
    const fichesSelection = fichesScored
      .filter(f => f.score > 0 || keywords.length === 0)
      .slice(0, matTasks.length > 1 ? 2 : 1)
      .map(f => f.fiche)

    // Fallback : si aucune fiche ne matche, prendre la prioritaire non vue
    const fichesToShow = fichesSelection.length > 0
      ? fichesSelection
      : fichesScored.slice(0, 1).map(f => f.fiche)

    fichesToShow.forEach(fiche => {
      blocks.push({ type: 'fiche', mat, data: fiche, tache: matTasks[0]?.tache })
    })

    // ── Flashcards : priorité à celles qui correspondent aux tâches du jour ──
    const flashScored = allFlashcards.map(fc => ({
      fc,
      score: keywords.length > 0 ? matchScore(keywords, fc.q + ' ' + fc.a) : 1,
    }))
    flashScored.sort((a, b) => b.score - a.score)

    // Cartes pertinentes en premier, puis compléter avec d'autres si besoin
    const pertinentes = flashScored.filter(f => f.score > 0).map(f => f.fc)
    const autres = flashScored.filter(f => f.score === 0).map(f => f.fc)
    const flashSelection = shuffle([...pertinentes, ...autres]).slice(0, Math.min(4, allFlashcards.length))

    if (flashSelection.length > 0) {
      blocks.push({ type: 'flashcards', mat, data: flashSelection })
    }

    // ── Exercices QCM : mêmes mots-clés ──
    const exosScored = allExos.map(e => ({
      exo: shuffleExo(e),
      score: keywords.length > 0 ? matchScore(keywords, e.titre + ' ' + e.enonce) : 1,
    }))
    exosScored.sort((a, b) => b.score - a.score)

    const exosPertinents = exosScored.filter(e => e.score > 0).map(e => e.exo)
    const exosAutres = exosScored.filter(e => e.score === 0).map(e => e.exo)
    const exosSelection = [...exosPertinents, ...shuffle(exosAutres)].slice(0, Math.min(3, allExos.length))

    if (exosSelection.length > 0) {
      blocks.push({ type: 'qcm', mat, data: exosSelection })
    }

    // ── Contrôle rapide : flashcards les plus pertinentes ──
    const controleCards = pertinentes.length > 0
      ? pertinentes.slice(0, 2)
      : shuffle(allFlashcards).slice(0, 2)

    if (controleCards.length > 0) {
      blocks.push({ type: 'controle', mat, data: controleCards })
    }
  })

  // Récap final
  blocks.push({ type: 'recap', mat: 'ALL', data: null })

  return blocks
}

/* ─── BLOCS ──────────────────────────────────────────────────────────── */

function BlockHeader({ mat, label, step, total }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0"
        style={{ backgroundColor: MAT_COLOR[mat] || '#555' }}>
        {mat === 'ALL' ? '✓' : mat.slice(0, 1)}
      </div>
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: MAT_COLOR[mat] || '#888' }}>
          {mat !== 'ALL' ? mat + ' · ' : ''}{label}
        </div>
      </div>
      <div className="ml-auto text-xs text-gray-400">{step} / {total}</div>
    </div>
  )
}

/* Fiche de révision */
function FicheBlock({ block, onDone, userDB }) {
  const { data: fiche, mat } = block
  const [revealed, setRevealed] = useState(false)
  const { markFiche } = userDB

  return (
    <div>
      <div className="bg-gray-800/60 rounded-xl p-5 mb-4 border border-gray-700/50"
        style={{ borderLeft: `3px solid ${MAT_COLOR[mat]}` }}>
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <div className="font-bold text-base" style={{ color: MAT_COLOR[mat] }}>{fiche.titre}</div>
          {fiche.freq === 'chaque-annee' && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-900/40 text-orange-400">⭐ Chaque année</span>
          )}
        </div>
        {revealed
          ? renderFicheContent(fiche.contenu, MAT_COLOR[mat])
          : <div className="text-gray-500 italic text-sm">Essaie de te souvenir du contenu avant de l'afficher…</div>
        }
      </div>
      {!revealed ? (
        <button onClick={() => setRevealed(true)}
          className="w-full py-3 rounded-xl font-semibold text-sm bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors border border-blue-200 dark:border-blue-800">
          👁 Afficher la fiche
        </button>
      ) : (
        <div className="flex gap-3">
          <button onClick={() => { markFiche(fiche.id, false); onDone('seen') }}
            className="flex-1 py-3 rounded-xl font-semibold text-sm bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 hover:bg-orange-100 transition-colors">
            👁 Vu
          </button>
          <button onClick={() => { markFiche(fiche.id, true); onDone('mastered') }}
            className="flex-1 py-3 rounded-xl font-semibold text-sm bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-100 transition-colors">
            ⭐ Maîtrisé !
          </button>
        </div>
      )}
    </div>
  )
}

/* Flashcards (mini session) */
function FlashcardsBlock({ block, onDone, userDB }) {
  const cards = block.data
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [results, setResults] = useState([])
  const { updateSM2, db } = userDB

  const answer = (knew) => {
    const card = cards[idx]
    const q = boolToQuality(knew)
    const prev = db.smData[card.id] || {}
    updateSM2(card.id, sm2({ ...prev, id: card.id }, q))
    const newResults = [...results, { card, knew }]
    setResults(newResults)
    if (idx + 1 >= cards.length) {
      onDone({ correct: newResults.filter(r => r.knew).length, total: cards.length })
    } else {
      setIdx(i => i + 1)
      setFlipped(false)
    }
  }

  useEffect(() => {
    const handler = (e) => {
      if (e.key === ' ') { e.preventDefault(); setFlipped(f => !f) }
      if (e.key === 'ArrowRight' && flipped) answer(true)
      if (e.key === 'ArrowLeft' && flipped) answer(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [flipped, idx])

  const card = cards[idx]

  return (
    <div>
      {/* Progress */}
      <div className="flex justify-between text-xs text-gray-400 mb-2">
        <span>{idx + 1} / {cards.length}</span>
        <span>{results.filter(r => r.knew).length} ✓</span>
      </div>
      <div className="bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 mb-4">
        <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${(idx / cards.length) * 100}%` }} />
      </div>

      {/* Carte */}
      <div className="cursor-pointer mb-4" onClick={() => setFlipped(f => !f)}>
        {!flipped ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border-2 border-gray-200 dark:border-gray-700 p-5 flex flex-col justify-center items-center min-h-[120px] transition-all">
            <div className="text-xs font-bold mb-2" style={{ color: MAT_COLOR[card.mat] }}>{card.mat}</div>
            <div className="text-base font-semibold text-center text-gray-900 dark:text-white">{renderMath(card.q)}</div>
            <div className="text-xs text-gray-400 mt-3">[Espace] pour retourner</div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border-2 border-blue-400 p-5 flex flex-col justify-center min-h-[120px] transition-all">
            <div className="text-xs font-bold mb-2" style={{ color: MAT_COLOR[card.mat] }}>{card.mat}</div>
            <div className="text-sm font-mono whitespace-pre-wrap text-gray-800 dark:text-gray-200 leading-relaxed">{renderMath(card.a)}</div>
          </div>
        )}
      </div>

      {flipped ? (
        <div className="flex gap-3">
          <button onClick={() => answer(false)}
            className="flex-1 py-3 rounded-xl font-semibold text-sm bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-100 transition-colors border border-red-200 dark:border-red-800">
            ✗ Pas su <span className="text-xs opacity-60">←</span>
          </button>
          <button onClick={() => answer(true)}
            className="flex-1 py-3 rounded-xl font-semibold text-sm bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-100 transition-colors border border-green-200 dark:border-green-800">
            ✓ Su ! <span className="text-xs opacity-60">→</span>
          </button>
        </div>
      ) : (
        <button onClick={() => setFlipped(true)}
          className="w-full py-3 rounded-xl font-semibold text-sm bg-blue-600 hover:bg-blue-700 text-white transition-colors">
          Voir la réponse <span className="text-xs opacity-70">[Espace]</span>
        </button>
      )}
    </div>
  )
}

/* QCM exercices */
function QCMBlock({ block, onDone, userDB, dbData }) {
  const exos = block.data
  const mat = block.mat
  const [idx, setIdx] = useState(0)
  const [choix, setChoix] = useState(null)
  const [confirmed, setConfirmed] = useState(false)
  const [score, setScore] = useState(0)
  const [currentExo, setCurrentExo] = useState(() => shuffleExo(exos[0]))
  const [usedIds, setUsedIds] = useState(() => new Set([exos[0].id]))
  const [showAide, setShowAide] = useState(false)
  const { markExo } = userDB

  const exo = currentExo

  const retry = () => {
    const pool = (dbData?.exercices || []).filter(e => e.mat === mat && e.id !== currentExo.id)
    const next = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : currentExo
    setCurrentExo(shuffleExo(next))
    setChoix(null)
    setConfirmed(false)
    setShowAide(false)
  }

  const confirm = () => {
    if (choix === null) return
    const correct = choix === exo.correct
    markExo(exo.id, correct)
    const newScore = score + (correct ? 1 : 0)
    setScore(newScore)
    setConfirmed(true)
    if (idx + 1 >= exos.length) {
      setTimeout(() => {
        onDone({ correct: newScore, total: exos.length })
      }, 1200)
    }
  }

  const next = () => {
    const nextIdx = idx + 1
    setIdx(nextIdx)
    setCurrentExo(shuffleExo(exos[nextIdx]))
    setChoix(null)
    setConfirmed(false)
  }

  useEffect(() => {
    if (confirmed) return
    const handler = (e) => {
      if (e.key >= '1' && e.key <= '4') setChoix(parseInt(e.key) - 1)
      if (e.key === 'Enter' && choix !== null) confirm()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [confirmed, choix, idx])

  return (
    <div>
      <div className="flex justify-between text-xs text-gray-400 mb-3">
        <span>Exercice {idx + 1} / {exos.length}</span>
        <span>{score} correct{score !== 1 ? 's' : ''}</span>
      </div>

      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-sm text-gray-800 dark:text-gray-200 leading-relaxed mb-4 border-l-4"
        style={{ borderLeftColor: MAT_COLOR[exo.mat] }}>
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <div className="text-xs font-bold" style={{ color: MAT_COLOR[exo.mat] }}>{exo.titre}</div>
          {exo.freq === 'chaque-annee' && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-900/40 text-orange-400">⭐ Chaque année</span>
          )}
        </div>
        {renderMath(exo.enonce)}
      </div>

      <div className="space-y-2 mb-4">
        {exo.options.map((opt, i) => {
          let cls = 'border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200'
          if (confirmed) {
            if (i === exo.correct) cls = 'border-2 border-green-500 bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200'
            else if (i === choix) cls = 'border-2 border-red-400 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
            else cls = 'border border-gray-100 dark:border-gray-800 text-gray-400 dark:text-gray-600'
          } else if (choix === i) cls = 'border-2 border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
          return (
            <button key={i} disabled={confirmed} onClick={() => setChoix(i)}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-colors ${cls} ${!confirmed ? 'hover:bg-gray-50 dark:hover:bg-gray-800' : ''}`}>
              <span className="font-mono font-bold text-gray-400 mr-2">{i + 1}.</span>
              {renderMath(opt)}
            </button>
          )
        })}
      </div>

      {confirmed && (
        <div className={`rounded-xl p-3 text-xs mb-4 leading-relaxed ${choix === exo.correct ? 'bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200' : 'bg-orange-50 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200'}`}>
          {renderMath(exo.explication)}
        </div>
      )}

      {!confirmed ? (
        <>
          <button onClick={confirm} disabled={choix === null}
            className={`w-full py-3 rounded-xl font-semibold text-sm transition-colors ${choix !== null ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'}`}>
            Valider <span className="text-xs opacity-60">[Entrée]</span>
          </button>

          {exo.aide && (
            <div className="mt-3">
              <button onClick={() => setShowAide(a => !a)}
                className="w-full py-2 rounded-xl text-xs font-semibold border transition-colors flex items-center justify-center gap-2 border-yellow-400/40 text-yellow-400 bg-yellow-400/5 hover:bg-yellow-400/10">
                💡 {showAide ? "Masquer l'aide" : "Afficher l'aide"}
              </button>
              {showAide && (
                <div className="mt-2 rounded-xl border border-yellow-400/20 bg-yellow-400/5 p-4 space-y-3">
                  {exo.aide.formule && (
                    <div>
                      <div className="text-[10px] font-black tracking-widest uppercase text-yellow-400 mb-1">Formule</div>
                      <div className="font-mono text-sm font-semibold text-gray-100 bg-gray-800/60 rounded-lg px-3 py-2 whitespace-pre-line">{exo.aide.formule}</div>
                    </div>
                  )}
                  {exo.aide.methode && (
                    <div>
                      <div className="text-[10px] font-black tracking-widest uppercase text-blue-400 mb-1">Méthode</div>
                      <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">{exo.aide.methode}</div>
                    </div>
                  )}
                  {exo.aide.piege && (
                    <div className="border-l-4 border-red-500 pl-3 bg-red-950/30 rounded-r-lg py-2 pr-3">
                      <div className="text-[10px] font-black tracking-widest uppercase text-red-400 mb-1">Piège à éviter</div>
                      <div className="text-sm text-gray-300 leading-relaxed">{exo.aide.piege}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      ) : idx + 1 < exos.length ? (
        <div className="flex gap-2">
          <button onClick={retry}
            className="px-4 py-3 rounded-xl font-semibold text-sm bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
            ↺
          </button>
          <button onClick={next}
            className="flex-1 py-3 rounded-xl font-semibold text-sm bg-blue-600 hover:bg-blue-700 text-white transition-colors">
            Exercice suivant →
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button onClick={retry}
            className="px-4 py-3 rounded-xl font-semibold text-sm bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
            ↺
          </button>
          <div className="flex-1 py-3 text-center text-sm text-gray-400 animate-pulse">Calcul du score…</div>
        </div>
      )}
    </div>
  )
}

/* Contrôle rapide (réponse libre, auto-évaluation) */
function ControleBlock({ block, onDone }) {
  const cards = block.data
  const [idx, setIdx] = useState(0)
  const [input, setInput] = useState('')
  const [shown, setShown] = useState(false)
  const [results, setResults] = useState([])
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [idx])

  const reveal = () => { if (!shown) setShown(true) }
  const next = (ok) => {
    const newResults = [...results, { card: cards[idx], ok }]
    setResults(newResults)
    if (idx + 1 >= cards.length) {
      onDone({ correct: newResults.filter(r => r.ok).length, total: cards.length })
    } else {
      setIdx(i => i + 1)
      setInput('')
      setShown(false)
    }
  }

  const card = cards[idx]

  return (
    <div>
      <div className="flex justify-between text-xs text-gray-400 mb-3">
        <span>Question {idx + 1} / {cards.length}</span>
        <span className="text-orange-500 font-medium">🔥 Contrôle</span>
      </div>

      {/* Question */}
      <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4 border border-orange-200 dark:border-orange-800 mb-4">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <div className="text-xs font-bold" style={{ color: MAT_COLOR[card.mat] }}>{card.mat}</div>
          {card.freq === 'chaque-annee' && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-900/40 text-orange-400">⭐ Chaque année</span>
          )}
        </div>
        <div className="text-sm font-semibold text-gray-900 dark:text-white">{renderMath(card.q)}</div>
      </div>

      {/* Zone de réponse */}
      {!shown && (
        <div className="mb-4">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Écris ta réponse (formule, valeur, explication…)"
            rows={3}
            className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm font-mono bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <button onClick={reveal}
            className="w-full mt-2 py-3 rounded-xl font-semibold text-sm bg-orange-500 hover:bg-orange-600 text-white transition-colors">
            Voir la correction
          </button>
        </div>
      )}

      {/* Correction */}
      {shown && (
        <div>
          {input.trim() && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 mb-3 border border-gray-200 dark:border-gray-700">
              <div className="text-xs text-gray-400 mb-1">Ta réponse :</div>
              <div className="text-sm font-mono text-gray-700 dark:text-gray-300">{input}</div>
            </div>
          )}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800 mb-4">
            <div className="text-xs font-bold text-blue-600 dark:text-blue-400 mb-1">Réponse attendue :</div>
            <div className="text-sm font-mono whitespace-pre-wrap text-blue-900 dark:text-blue-100 leading-relaxed">{renderMath(card.a)}</div>
          </div>
          <div className="text-xs text-center text-gray-500 dark:text-gray-400 mb-3">Tu t'en souviens ?</div>
          <div className="flex gap-3">
            <button onClick={() => next(false)}
              className="flex-1 py-3 rounded-xl font-semibold text-sm bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-100 transition-colors border border-red-200 dark:border-red-800">
              ✗ Pas su
            </button>
            <button onClick={() => next(true)}
              className="flex-1 py-3 rounded-xl font-semibold text-sm bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-100 transition-colors border border-green-200 dark:border-green-800">
              ✓ Su !
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* Récap final */
function RecapBlock({ scores, blocks, onDone, userDB }) {
  const total = scores.reduce((a, s) => a + (s.total || 0), 0)
  const correct = scores.reduce((a, s) => a + (s.correct || 0), 0)
  const note = total > 0 ? Math.round(correct / total * 20 * 10) / 10 : null
  const emoji = note >= 16 ? '🏆' : note >= 12 ? '👍' : note >= 8 ? '💪' : '📚'

  useEffect(() => {
    if (note !== null) userDB.addNote('PC', note, 'session-jour', 'Session du jour')
  }, [])

  return (
    <div className="text-center space-y-5">
      <div>
        <div className="text-5xl mb-3">{emoji}</div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Session terminée !</h2>
        {note !== null && (
          <div className="text-5xl font-black mb-2"
            style={{ color: note >= 14 ? '#22C55E' : note >= 10 ? '#F59E0B' : '#EF4444' }}>
            {note}/20
          </div>
        )}
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {correct} bonne{correct !== 1 ? 's' : ''} réponse{correct !== 1 ? 's' : ''} sur {total}
        </div>
      </div>

      {/* Détail par bloc */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 text-left overflow-hidden">
        {scores.map((s, i) => (
          <div key={i} className="px-4 py-3 flex items-center justify-between border-b border-gray-100 dark:border-gray-800 last:border-0">
            <div>
              <div className="text-xs font-semibold" style={{ color: MAT_COLOR[s.mat] || '#888' }}>{s.mat}</div>
              <div className="text-sm text-gray-700 dark:text-gray-300">{s.label}</div>
            </div>
            {s.total > 0 && (
              <div className={`text-sm font-bold ${s.correct === s.total ? 'text-green-500' : s.correct >= s.total * 0.6 ? 'text-orange-500' : 'text-red-500'}`}>
                {s.correct}/{s.total}
              </div>
            )}
            {s.total === 0 && <div className="text-xs text-gray-400">✓ Fait</div>}
          </div>
        ))}
      </div>

      <button onClick={onDone}
        className="w-full py-3 rounded-xl font-semibold text-sm bg-blue-600 hover:bg-blue-700 text-white transition-colors">
        Retour au dashboard
      </button>
    </div>
  )
}

/* ─── PAGE PRINCIPALE ─────────────────────────────────────────────── */
export default function Session({ userDB, dbData, setPage }) {
  const todayTasks = dbData.planning.filter(p => p.date === TODAY && !p.tache.startsWith('🏥') && p.mat !== 'EXAM')
  const mats = getMatsForToday(dbData)

  const [started, setStarted] = useState(false)
  const [blocks, setBlocks] = useState([])
  const [blockIdx, setBlockIdx] = useState(0)
  const [scores, setScores] = useState([])

  const startSession = () => {
    const b = buildSession(dbData, userDB.db, mats)
    setBlocks(b)
    setBlockIdx(0)
    setScores([])
    setStarted(true)
  }

  const handleBlockDone = (result) => {
    const block = blocks[blockIdx]
    const newScore = {
      mat: block.mat,
      label: { fiche: 'Fiche de révision', flashcards: 'Flashcards', qcm: 'Exercices QCM', controle: 'Contrôle rapide', recap: 'Récap' }[block.type] || block.type,
      correct: result?.correct ?? 0,
      total: result?.total ?? 0,
    }
    setScores(prev => [...prev, newScore])
    setBlockIdx(i => i + 1)
  }

  // Labels pour la barre de progression
  const BLOCK_ICONS = { fiche: '📖', flashcards: '🃏', qcm: '✏️', controle: '🔥', recap: '🏁' }
  const BLOCK_LABELS = { fiche: 'Fiche', flashcards: 'Flashcards', qcm: 'Exercices', controle: 'Contrôle', recap: 'Récap' }

  /* ── Écran de démarrage ── */
  if (!started) {
    // Calculer ce que contiendra la session
    const preview = buildSession(dbData, userDB.db, mats)
    const previewStats = {
      fiches: preview.filter(b => b.type === 'fiche').length,
      flashcards: preview.filter(b => b.type === 'flashcards').reduce((a, b) => a + b.data.length, 0),
      exos: preview.filter(b => b.type === 'qcm').reduce((a, b) => a + b.data.length, 0),
      controle: preview.filter(b => b.type === 'controle').reduce((a, b) => a + b.data.length, 0),
    }
    const estimMin = previewStats.fiches * 3 + previewStats.flashcards * 0.5 + previewStats.exos * 2 + previewStats.controle * 1.5

    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Session du jour</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>

        {/* Tâches du jour */}
        {todayTasks.length > 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 mb-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Au programme aujourd'hui</div>
            {todayTasks.map((t, i) => (
              <div key={i} className="flex items-center gap-3 mb-2 last:mb-0">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: MAT_COLOR[t.mat] }} />
                <div>
                  <span className="text-xs font-bold mr-2" style={{ color: MAT_COLOR[t.mat] }}>{t.mat}</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{t.tache}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-200 dark:border-blue-800 p-4 mb-5 text-sm text-blue-700 dark:text-blue-300">
            Pas de tâche planifiée aujourd'hui — session basée sur les prochains chapitres.
          </div>
        )}

        {/* Fiches qui vont être vues — transparence */}
        {preview.filter(b => b.type === 'fiche').length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 mb-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Fiches au programme</div>
            {preview.filter(b => b.type === 'fiche').map((b, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: MAT_COLOR[b.mat] }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold" style={{ color: MAT_COLOR[b.mat] }}>{b.mat}</span>
                    <span className="text-sm text-gray-800 dark:text-gray-200">{b.data.titre}</span>
                    {b.data.freq === 'chaque-annee' && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-500">⭐ Chaque année</span>
                    )}
                  </div>
                </div>
                {userDB.db.fichesDone?.[b.data.id]?.mastered
                  ? <span className="ml-auto text-xs text-green-500">⭐ maîtrisé</span>
                  : userDB.db.fichesDone?.[b.data.id]?.seen
                  ? <span className="ml-auto text-xs text-blue-400">déjà vue</span>
                  : <span className="ml-auto text-xs text-orange-400">nouveau</span>
                }
              </div>
            ))}
          </div>
        )}

        {/* Contenu de la session */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 mb-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">Contenu de la session</div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { icon: '📖', label: 'Fiches', value: previewStats.fiches, color: '#3B82F6' },
              { icon: '🃏', label: 'Flashcards', value: previewStats.flashcards, color: '#8B5CF6' },
              { icon: '✏️', label: 'Exercices QCM', value: previewStats.exos, color: '#10B981' },
              { icon: '🔥', label: 'Contrôle rapide', value: previewStats.controle, color: '#F59E0B' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                <span className="text-xl">{item.icon}</span>
                <div>
                  <div className="text-lg font-bold" style={{ color: item.color }}>{item.value}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{item.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Matières */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-400">Matières :</span>
            {mats.map(m => (
              <span key={m} className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: (MAT_COLOR[m] || '#888') + '20', color: MAT_COLOR[m] || '#888' }}>
                {m}
              </span>
            ))}
          </div>

          <div className="mt-3 text-xs text-gray-400">
            ⏱ Durée estimée : <span className="font-medium text-gray-600 dark:text-gray-300">~{Math.round(estimMin)} minutes</span>
          </div>
        </div>

        {/* Parcours visuel */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 mb-6">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Parcours</div>
          <div className="flex items-center gap-1 flex-wrap">
            {preview.map((b, i) => (
              <div key={i} className="flex items-center gap-1">
                <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-800 rounded-lg px-2 py-1">
                  <span className="text-sm">{BLOCK_ICONS[b.type]}</span>
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400" style={b.mat !== 'ALL' ? { color: MAT_COLOR[b.mat] } : {}}>
                    {b.mat !== 'ALL' ? b.mat : ''} {BLOCK_LABELS[b.type]}
                  </span>
                </div>
                {i < preview.length - 1 && <span className="text-gray-300 dark:text-gray-700 text-xs">›</span>}
              </div>
            ))}
          </div>
        </div>

        <button onClick={startSession}
          className="w-full py-4 rounded-2xl font-bold text-base bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-lg shadow-blue-200 dark:shadow-blue-900/30">
          ▶ Démarrer la session
        </button>
      </div>
    )
  }

  /* ── Session en cours ── */
  const currentBlock = blocks[blockIdx]

  if (!currentBlock) return null

  const isRecap = currentBlock.type === 'recap'

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Barre de progression globale */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">{BLOCK_ICONS[currentBlock.type]}</span>
            <div>
              <div className="text-xs text-gray-400">{BLOCK_LABELS[currentBlock.type]}</div>
              {currentBlock.mat !== 'ALL' && (
                <div className="text-xs font-bold" style={{ color: MAT_COLOR[currentBlock.mat] }}>{currentBlock.mat}</div>
              )}
            </div>
          </div>
          <span className="text-xs text-gray-400">{blockIdx + 1} / {blocks.length}</span>
        </div>
        <div className="bg-gray-100 dark:bg-gray-800 rounded-full h-2">
          <div className="h-2 rounded-full bg-blue-600 transition-all duration-500"
            style={{ width: `${((blockIdx) / blocks.length) * 100}%` }} />
        </div>
        {/* Mini-étapes */}
        <div className="flex gap-1 mt-2">
          {blocks.map((b, i) => (
            <div key={i} className={`flex-1 h-1 rounded-full transition-colors ${
              i < blockIdx ? 'bg-green-400' : i === blockIdx ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-700'
            }`} />
          ))}
        </div>
      </div>

      {/* Bloc courant */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
        <BlockHeader
          mat={currentBlock.mat}
          label={BLOCK_LABELS[currentBlock.type]}
          step={blockIdx + 1}
          total={blocks.length}
        />

        {currentBlock.type === 'fiche' && (
          <FicheBlock block={currentBlock} onDone={(r) => handleBlockDone({ correct: 1, total: 1 })} userDB={userDB} />
        )}
        {currentBlock.type === 'flashcards' && (
          <FlashcardsBlock key={blockIdx} block={currentBlock} onDone={handleBlockDone} userDB={userDB} />
        )}
        {currentBlock.type === 'qcm' && (
          <QCMBlock key={blockIdx} block={currentBlock} onDone={handleBlockDone} userDB={userDB} dbData={dbData} />
        )}
        {currentBlock.type === 'controle' && (
          <ControleBlock key={blockIdx} block={currentBlock} onDone={handleBlockDone} />
        )}
        {currentBlock.type === 'recap' && (
          <RecapBlock scores={scores} blocks={blocks} onDone={() => setPage('dashboard')} userDB={userDB} />
        )}
      </div>

      {/* Boutons navigation (pas pour le récap) */}
      {!isRecap && (
        <div className="flex gap-2 mt-3">
          {blockIdx > 0 && (
            <button onClick={() => { setBlockIdx(i => i - 1); setScores(s => s.slice(0, -1)) }}
              className="px-4 py-2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors border border-gray-200 dark:border-gray-700 rounded-xl">
              ← Retour
            </button>
          )}
          <button onClick={() => handleBlockDone({ correct: 0, total: 0 })}
            className="flex-1 py-2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            Passer cette étape →
          </button>
        </div>
      )}
    </div>
  )
}
