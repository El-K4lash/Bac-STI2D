import { useState, useEffect, useRef } from 'react'
import { MAT_COLOR, TIMER_DUREES } from '../utils/constants'
import { shuffleExo, shuffle } from '../utils/shuffle'
import { evalAnswer, computeNote } from '../utils/evalAnswer'
import { renderMath } from '../utils/mathRender'
import sujetsData from '../../data/sujets_bac_reels.json'

/* ─── TIMER ─────────────────────────────────────────────────────────── */
function fmt(sec) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

function Timer({ totalSec, onFinish }) {
  const [remaining, setRemaining] = useState(totalSec)
  const [running, setRunning] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!running) return
    ref.current = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) { clearInterval(ref.current); onFinish?.(); return 0 }
        return r - 1
      })
    }, 1000)
    return () => clearInterval(ref.current)
  }, [running])

  const pct = (remaining / totalSec) * 100
  const color = pct > 50 ? '#38A169' : pct > 20 ? '#D69E2E' : '#E53E3E'
  const done = remaining === 0

  useEffect(() => {
    if (remaining === 1800 && running) {
      document.title = '⚠ 30 min restantes — Bac STI2D'
      setTimeout(() => { document.title = 'Bac STI2D 2026 — Hugo KACI' }, 3000)
    }
    if (done) {
      document.title = '⏰ Temps écoulé !'
      setTimeout(() => { document.title = 'Bac STI2D 2026 — Hugo KACI' }, 5000)
    }
  }, [remaining, done])

  return (
    <div className="text-center">
      <div className="relative inline-flex items-center justify-center mb-6">
        <svg width="200" height="200" className="-rotate-90">
          <circle cx="100" cy="100" r="88" fill="none" stroke="#e5e7eb" strokeWidth="12" className="dark:stroke-gray-700" />
          <circle cx="100" cy="100" r="88" fill="none" strokeWidth="12" stroke={color}
            strokeDasharray={`${2 * Math.PI * 88}`}
            strokeDashoffset={`${2 * Math.PI * 88 * (1 - pct / 100)}`}
            strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s' }}
          />
        </svg>
        <div className="absolute text-center">
          <div className="text-4xl font-bold font-mono tabular-nums" style={{ color: done ? '#E53E3E' : color }}>
            {done ? '00:00' : fmt(remaining)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {done ? 'Temps écoulé !' : running ? 'En cours' : 'En pause'}
          </div>
        </div>
      </div>
      {remaining === 1800 && running && (
        <div className="mb-4 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-xl px-4 py-2 text-sm font-medium animate-pulse">
          ⚠ 30 minutes restantes !
        </div>
      )}
      {done ? (
        <div className="text-lg font-bold text-red-600 dark:text-red-400 mb-4">⏰ Temps écoulé — Posez les stylos !</div>
      ) : (
        <div className="flex gap-3 justify-center">
          <button onClick={() => setRunning(r => !r)}
            className={`px-8 py-3 rounded-xl font-semibold text-white transition-colors ${running ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-600 hover:bg-green-700'}`}>
            {running ? '⏸ Pause' : '▶ Démarrer'}
          </button>
          <button onClick={() => { setRemaining(totalSec); setRunning(false) }}
            className="px-6 py-3 rounded-xl font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 transition-colors">
            ↺ Reset
          </button>
        </div>
      )}
    </div>
  )
}

/* ─── AFFICHAGE D'UNE QUESTION ───────────────────────────────────────── */
function QuestionCard({ question, exoTitre, exoDonnees, qIndex, total, onAnswer, savedAnswer }) {
  const [input, setInput] = useState(savedAnswer?.input || '')
  const [submitted, setSubmitted] = useState(!!savedAnswer)
  const [result, setResult] = useState(savedAnswer?.eval || null)

  const handleSubmit = () => {
    if (!input.trim()) return
    const ev = evalAnswer(input, question.reponse_numerique, question.tolerance || 0.05)
    setResult(ev)
    setSubmitted(true)
    onAnswer({ input, eval: ev })
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !submitted) { e.preventDefault(); handleSubmit() }
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      {/* Header exercice */}
      <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">{exoTitre}</span>
        <span className="text-xs text-gray-400">{qIndex + 1} / {total}</span>
      </div>

      <div className="p-5">
        {/* Données globales de l'exercice (1ère question seulement) */}
        {exoDonnees && Object.keys(exoDonnees).length > 0 && qIndex === 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 mb-4 border border-blue-100 dark:border-blue-800">
            <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1.5">📋 Données de l'exercice</div>
            <div className="grid grid-cols-2 gap-1">
              {Object.entries(exoDonnees).map(([k, v]) => (
                <div key={k} className="text-xs text-blue-800 dark:text-blue-200">
                  <span className="font-mono">{renderMath(k.replace(/_/g, ' '))} = {typeof v === 'number' ? v.toLocaleString('fr-FR') : v}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Données spécifiques à cette question */}
        {question.donnees && Object.keys(question.donnees).length > 0 && (
          <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-3 mb-4 border border-indigo-100 dark:border-indigo-800">
            <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1.5">📋 Données</div>
            <div className="grid grid-cols-2 gap-1">
              {Object.entries(question.donnees).map(([k, v]) => (
                <div key={k} className="text-xs text-indigo-800 dark:text-indigo-200">
                  <span className="font-mono">{renderMath(k.replace(/_/g, ' '))} = {typeof v === 'number' ? v.toLocaleString('fr-FR') : v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Énoncé */}
        <div className="mb-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">Question {question.numero}</div>
        <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed mb-4 bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border-l-4 border-blue-400">
          {renderMath(question.enonce)}
        </p>

        {/* Formule hint si dispo */}
        {question.formule && !submitted && (
          <div className="mb-4 text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
            <span className="font-semibold">Formule :</span> <span className="font-mono">{renderMath(question.formule)}</span>
          </div>
        )}

        {/* Zone de réponse */}
        {!submitted ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                Ta réponse {question.unite && question.unite !== 'null' ? `(en ${renderMath(question.unite)})` : ''}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder={question.reponse_numerique === null ? "Écris ta réponse (équation, explication…)" : "Ex : 3,75 ou 3.75×10²"}
                  className="flex-1 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <button onClick={handleSubmit} disabled={!input.trim()}
                  className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    input.trim() ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                  }`}>
                  Valider
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">Entrée pour valider · Écris la valeur numérique avec son unité si besoin</p>
            </div>
          </div>
        ) : (
          <div className={`rounded-xl p-4 border ${
            result?.correct
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              : result?.score === 'skip'
              ? 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          }`}>
            <div className={`font-semibold text-sm mb-2 ${
              result?.correct ? 'text-green-700 dark:text-green-300'
              : result?.score === 'skip' ? 'text-gray-600 dark:text-gray-400'
              : 'text-red-700 dark:text-red-300'
            }`}>
              {result?.feedback}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Ta réponse : <span className="font-mono font-medium text-gray-700 dark:text-gray-300">{input}</span>
            </div>
            {question.explication && (
              <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 leading-relaxed bg-white/50 dark:bg-black/20 rounded-lg p-2">
                <span className="font-semibold">Correction : </span>{renderMath(question.explication)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── SIMULATION SUJET COMPLET ───────────────────────────────────────── */
function SimulationSujet({ sujet, onFinish, addNote }) {
  // Aplatir toutes les questions du sujet
  const allQuestions = sujet.exercices.flatMap(exo =>
    (exo.questions || []).map(q => ({ ...q, _exoTitre: exo.titre, _exoDonnees: exo.donnees || {} }))
  )

  const [answers, setAnswers] = useState({}) // index → { input, eval }
  const [current, setCurrent] = useState(0)
  const [showResult, setShowResult] = useState(false)
  const [timerRunning, setTimerRunning] = useState(true)

  const q = allQuestions[current]
  const answered = Object.keys(answers).length
  const allDone = answered >= allQuestions.length

  const handleAnswer = (idx, ans) => {
    setAnswers(prev => ({ ...prev, [idx]: ans }))
  }

  const finish = () => {
    const results = allQuestions.map((_, i) => answers[i] || { input: '', eval: { correct: false, score: 'skip' } })
    const note = computeNote(results)
    addNote(sujet.matiere === 'PCM' ? 'PC' : '2I2D', note, 'simulation-sujet', `Sujet ${sujet.annee} ${sujet.session}`)
    setShowResult(true)
  }

  if (showResult) {
    const results = allQuestions.map((_, i) => answers[i] || { input: '', eval: { correct: false, score: 'skip' } })
    const note = computeNote(results)
    const correct = results.filter(r => r.eval?.correct).length
    const skipped = results.filter(r => r.eval?.score === 'skip').length

    return (
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 text-center">
          <div className="text-5xl mb-3">{note >= 14 ? '🏆' : note >= 10 ? '👍' : '💪'}</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Simulation terminée !</h2>
          <div className="text-5xl font-black mb-2" style={{ color: note >= 14 ? '#38A169' : note >= 10 ? '#D69E2E' : '#E53E3E' }}>
            {note}/20
          </div>
          <div className="text-gray-500 dark:text-gray-400 text-sm mb-1">
            {correct}/{allQuestions.length} bonnes réponses{skipped > 0 ? ` · ${skipped} sans réponse` : ''}
          </div>
          <div className="text-xs text-gray-400 mb-6">Note enregistrée dans tes stats</div>
          <button onClick={onFinish}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-semibold transition-colors">
            Retour
          </button>
        </div>

        {/* Détail par question */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 font-semibold text-sm text-gray-700 dark:text-gray-300">
            Récapitulatif
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-96 overflow-y-auto">
            {allQuestions.map((q, i) => {
              const r = results[i]
              return (
                <div key={i} className={`px-4 py-2.5 flex items-start gap-3 ${r.eval?.correct ? 'bg-green-50/50 dark:bg-green-900/10' : r.eval?.score === 'skip' ? '' : 'bg-red-50/50 dark:bg-red-900/10'}`}>
                  <span className={`text-lg shrink-0 ${r.eval?.correct ? 'text-green-500' : r.eval?.score === 'skip' ? 'text-gray-400' : 'text-red-500'}`}>
                    {r.eval?.correct ? '✓' : r.eval?.score === 'skip' ? '—' : '✗'}
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">{q._exoTitre} · Q{q.numero}</div>
                    <div className="text-xs text-gray-700 dark:text-gray-300 truncate">{renderMath(q.enonce).slice(0, 80)}…</div>
                    {r.input && <div className="text-xs font-mono text-gray-400 mt-0.5">Réponse : {r.input}</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header sujet */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs text-gray-400 mb-1">{sujet.matiere} · {sujet.annee} {sujet.session} · {sujet.duree_heures}h</div>
            <h2 className="font-bold text-gray-900 dark:text-white text-sm leading-snug">{sujet.theme_general}</h2>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xs text-gray-400">{answered}/{allQuestions.length} répondus</div>
            <div className="w-24 bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 mt-1">
              <div className="bg-blue-600 h-1.5 rounded-full transition-all" style={{ width: `${(answered / allQuestions.length) * 100}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Navigation exercices */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {allQuestions.map((_, i) => {
          const ans = answers[i]
          return (
            <button key={i} onClick={() => setCurrent(i)}
              className={`w-8 h-8 rounded-lg text-xs font-bold shrink-0 transition-colors ${
                current === i ? 'bg-blue-600 text-white'
                : ans?.eval?.correct ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                : ans?.eval?.score === 'wrong' ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400'
                : ans ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
              }`}>
              {i + 1}
            </button>
          )
        })}
      </div>

      {/* Question courante */}
      <QuestionCard
        key={current}
        question={q}
        exoTitre={q._exoTitre}
        exoDonnees={q._exoDonnees}
        qIndex={current}
        total={allQuestions.length}
        onAnswer={(ans) => handleAnswer(current, ans)}
        savedAnswer={answers[current]}
      />

      {/* Navigation bas */}
      <div className="flex gap-3 items-center">
        <button onClick={() => setCurrent(c => Math.max(0, c - 1))} disabled={current === 0}
          className="px-4 py-2.5 rounded-xl text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 disabled:opacity-40 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
          ← Précédente
        </button>
        <div className="flex-1" />
        {current < allQuestions.length - 1 ? (
          <button onClick={() => setCurrent(c => c + 1)}
            className="px-4 py-2.5 rounded-xl text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors">
            Suivante →
          </button>
        ) : (
          <button onClick={finish}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-green-600 hover:bg-green-700 text-white transition-colors">
            {allDone ? '✓ Terminer' : `Terminer (${allQuestions.length - answered} sans réponse)`}
          </button>
        )}
      </div>
    </div>
  )
}

/* ─── PAGE PRINCIPALE ────────────────────────────────────────────────── */
export default function Simulation({ userDB, dbData }) {
  const { db, addNote } = userDB
  const [mode, setMode] = useState('choose') // choose | sujet | qcm | timer
  const [selectedSujet, setSelectedSujet] = useState(null)

  // QCM rapide
  const [matiere, setMatiere] = useState('Tout')
  const [nbQ, setNbQ] = useState(10)
  const [timerType, setTimerType] = useState('PCM')
  const [customMin, setCustomMin] = useState(60)
  const [questions, setQuestions] = useState([])
  const [qIdx, setQIdx] = useState(0)
  const [choix, setChoix] = useState(null)
  const [confirmed, setConfirmed] = useState(false)
  const [score, setScore] = useState(0)
  const [resultats, setResultats] = useState([])
  const [qcmDone, setQcmDone] = useState(false)

  const sujets = sujetsData.sujets || []
  const MATS_QCM = ['Tout', 'PC', 'Maths', 'SIN', '2I2D']

  const startRandom = () => {
    const idx = Math.floor(Math.random() * sujets.length)
    setSelectedSujet(sujets[idx])
    setMode('sujet')
  }

  const startQCM = () => {
    const pool = matiere === 'Tout' ? dbData.exercices : dbData.exercices.filter(e => e.mat === matiere)
    const shuffled = shuffle(pool).slice(0, Math.min(nbQ, pool.length)).map(shuffleExo)
    setQuestions(shuffled)
    setQIdx(0); setChoix(null); setConfirmed(false); setScore(0); setResultats([]); setQcmDone(false)
    setMode('qcm')
  }

  const confirmQCM = () => {
    if (choix === null) return
    const q = questions[qIdx]
    const correct = choix === q.correct
    const newScore = score + (correct ? 1 : 0)
    const newResultats = [...resultats, { q, choix, correct }]
    setScore(newScore); setResultats(newResultats); setConfirmed(true)
    if (qIdx + 1 >= questions.length) {
      setTimeout(() => {
        addNote(matiere === 'Tout' ? 'PC' : matiere, Math.round((newScore / questions.length) * 20 * 10) / 10, 'simulation', `Simulation QCM ${matiere}`)
        setQcmDone(true)
      }, 900)
    }
  }

  useEffect(() => {
    if (mode !== 'qcm' || confirmed) return
    const handler = (e) => {
      if (e.key >= '1' && e.key <= '4') { const i = parseInt(e.key) - 1; if (i < questions[qIdx]?.options?.length) setChoix(i) }
      if (e.key === 'Enter' && choix !== null) confirmQCM()
    }
    window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler)
  }, [mode, choix, confirmed, qIdx])

  /* ── SUJET COMPLET ── */
  if (mode === 'sujet' && selectedSujet) {
    return (
      <div className="p-6">
        <button onClick={() => setMode('choose')} className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-5 flex items-center gap-1">
          ← Retour
        </button>
        <SimulationSujet sujet={selectedSujet} onFinish={() => setMode('choose')} addNote={addNote} />
      </div>
    )
  }

  /* ── TIMER ── */
  if (mode === 'timer') {
    const timerSec = timerType === 'Custom' ? customMin * 60 : (TIMER_DUREES[timerType] || 180) * 60
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <button onClick={() => setMode('choose')} className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 mb-6 flex items-center gap-1">← Retour</button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Minuteur — {timerType === 'Custom' ? `${customMin} min` : `${timerType} (${TIMER_DUREES[timerType]}min)`}</h1>
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8">
          <Timer key={timerSec} totalSec={timerSec} />
        </div>
      </div>
    )
  }

  /* ── QCM RAPIDE ── */
  if (mode === 'qcm') {
    if (qcmDone) {
      const note = Math.round((score / questions.length) * 20 * 10) / 10
      return (
        <div className="p-6 max-w-2xl mx-auto space-y-5">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 text-center">
            <div className="text-5xl mb-3">{note >= 14 ? '🏆' : note >= 10 ? '👍' : '💪'}</div>
            <div className="text-5xl font-black mb-2" style={{ color: note >= 14 ? '#38A169' : note >= 10 ? '#D69E2E' : '#E53E3E' }}>{note}/20</div>
            <div className="text-gray-500 dark:text-gray-400 mb-6">{score}/{questions.length} bonnes réponses ({Math.round(score/questions.length*100)}%)</div>
            <button onClick={() => setMode('choose')} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors">Retour</button>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 font-semibold text-sm text-gray-700 dark:text-gray-300">Détail</div>
            {resultats.map((r, i) => (
              <div key={i} className={`px-4 py-2.5 flex items-start gap-3 border-b border-gray-100 dark:border-gray-800 last:border-0 ${r.correct ? 'bg-green-50/50 dark:bg-green-900/10' : 'bg-red-50/50 dark:bg-red-900/10'}`}>
                <span className={`text-lg shrink-0 ${r.correct ? 'text-green-500' : 'text-red-500'}`}>{r.correct ? '✓' : '✗'}</span>
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{r.q.titre}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{r.q.options[r.q.correct]}</div>
                  {!r.correct && <div className="text-xs text-red-500 mt-0.5">Ta réponse : {r.q.options[r.choix]}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    }

    const q = questions[qIdx]
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Question {qIdx + 1} / {questions.length}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Score : {score}/{qIdx + (confirmed ? 1 : 0)}</div>
        </div>
        <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-6">
          <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${((qIdx + (confirmed ? 1 : 0)) / questions.length) * 100}%` }} />
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: MAT_COLOR[q.mat] + '22', color: MAT_COLOR[q.mat] }}>{q.mat}</span>
            <span className="text-xs text-gray-400">{q.titre}</span>
          </div>
          <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed mb-5 bg-gray-50 dark:bg-gray-800 rounded-xl p-4">{renderMath(q.enonce)}</p>
          <div className="space-y-2 mb-4">
            {q.options.map((opt, i) => {
              let cls = 'border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
              if (confirmed) {
                if (i === q.correct) cls = 'border-2 border-green-500 bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                else if (i === choix) cls = 'border-2 border-red-400 bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                else cls = 'border border-gray-100 dark:border-gray-800 text-gray-400 dark:text-gray-600'
              } else if (choix === i) cls = 'border-2 border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
              return (
                <button key={i} disabled={confirmed} onClick={() => setChoix(i)}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-colors ${cls}`}>
                  <span className="font-mono font-bold mr-2 text-gray-400">{i + 1}.</span>{renderMath(opt)}
                </button>
              )
            })}
          </div>
          {confirmed && (
            <div className={`rounded-xl p-3 text-xs mb-4 ${choix === q.correct ? 'bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200' : 'bg-orange-50 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200'}`}>
              {renderMath(q.explication)}
            </div>
          )}
          {!confirmed ? (
            <button onClick={confirmQCM} disabled={choix === null}
              className={`w-full py-3 rounded-xl font-semibold text-sm transition-colors ${choix !== null ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'}`}>
              Valider <span className="text-xs opacity-70">[Entrée]</span>
            </button>
          ) : qIdx + 1 < questions.length ? (
            <button onClick={() => { setQIdx(i => i + 1); setChoix(null); setConfirmed(false) }}
              className="w-full py-3 rounded-xl font-semibold text-sm bg-blue-600 hover:bg-blue-700 text-white transition-colors">
              Suivante →
            </button>
          ) : (
            <div className="text-center text-sm text-gray-400 animate-pulse">Calcul du résultat…</div>
          )}
        </div>
      </div>
    )
  }

  /* ── CHOIX ── */
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Simulation bac</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Entraîne-toi sur de vrais sujets ou en mode QCM rapide</p>
      </div>

      {/* VRAIS SUJETS */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">📄 Vrais sujets de bac</h2>
          <button onClick={startRandom}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            🎲 Sujet aléatoire
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sujets.map(s => (
            <button key={s.id} onClick={() => { setSelectedSujet(s); setMode('sujet') }}
              className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 text-left hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all group">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  s.matiere === 'PCM' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' : 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300'
                }`}>{s.matiere}</span>
                <span className="text-xs text-gray-400">{s.annee} · {s.session}</span>
                <span className="text-xs text-gray-400 ml-auto">{s.duree_heures}h</span>
              </div>
              <div className="font-semibold text-sm text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug mb-1">
                {s.theme_general}
              </div>
              <div className="text-xs text-gray-400">
                {s.exercices?.length} exercice{s.exercices?.length !== 1 ? 's' : ''} · {s.exercices?.flatMap(e => e.questions || []).length} questions
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* QCM RAPIDE */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="text-2xl mb-2">✏️</div>
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-1">QCM rapide</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Questions mélangées, note sur 20</p>
          <div className="space-y-3 mb-4">
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Matière</label>
              <div className="flex flex-wrap gap-1">
                {MATS_QCM.map(m => (
                  <button key={m} onClick={() => setMatiere(m)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${matiere === m ? 'text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}
                    style={matiere === m ? { backgroundColor: MAT_COLOR[m] || '#2563eb' } : {}}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                Questions : <span className="font-bold text-gray-900 dark:text-white">{nbQ}</span>
              </label>
              <input type="range" min={3} max={Math.min(26, dbData.exercices.filter(e => matiere === 'Tout' || e.mat === matiere).length)} value={nbQ}
                onChange={e => setNbQ(+e.target.value)} className="w-full accent-blue-600" />
            </div>
          </div>
          <button onClick={startQCM} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-semibold text-sm transition-colors">
            Démarrer ({nbQ} questions)
          </button>
        </div>

        {/* MINUTEUR */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="text-2xl mb-2">⏱</div>
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-1">Minuteur d'examen</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Simule les vraies conditions</p>
          <div className="space-y-1.5 mb-4">
            {Object.entries(TIMER_DUREES).map(([k, v]) => (
              <button key={k} onClick={() => setTimerType(k)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-colors ${timerType === k ? 'bg-blue-600 text-white' : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                <span className="font-medium">{k}</span>
                <span className="text-xs opacity-70">{k === 'Custom' ? `${customMin} min` : `${v} min`}</span>
              </button>
            ))}
          </div>
          {timerType === 'Custom' && (
            <div className="mb-3">
              <input type="range" min={5} max={300} step={5} value={customMin} onChange={e => setCustomMin(+e.target.value)} className="w-full accent-blue-600" />
              <div className="text-xs text-center text-gray-500 mt-1">{customMin} minutes</div>
            </div>
          )}
          <button onClick={() => setMode('timer')} className="w-full bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl font-semibold text-sm transition-colors">
            Lancer le minuteur
          </button>
        </div>
      </div>

      {/* Épreuves officielles */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 font-semibold text-sm text-gray-700 dark:text-gray-300">Épreuves officielles</div>
        {dbData.meta.examens.map(e => (
          <div key={e.date} className="px-4 py-3 flex items-center justify-between border-b border-gray-100 dark:border-gray-800 last:border-0">
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">{e.matiere}</div>
              <div className="text-xs text-gray-400">{e.heure} · {e.duree} · coeff {e.coeff}</div>
            </div>
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {new Date(e.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
