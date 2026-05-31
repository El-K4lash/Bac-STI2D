import { useState, useEffect, useRef } from 'react'

const SUJET = "L'aviation sans pétrole est-elle possible ?"

const QUESTIONS_JURY = [
  { id: 1, cat: 'Ouverture', q: "Pourquoi avez-vous choisi ce sujet ?" },
  { id: 2, cat: 'Fond', q: "Quelle est la densité énergétique du kérosène comparée aux alternatives ?" },
  { id: 3, cat: 'Fond', q: "L'hydrogène est souvent présenté comme LA solution. Quelles sont ses limites concrètes ?" },
  { id: 4, cat: 'Fond', q: "Qu'est-ce que les SAF (Sustainable Aviation Fuels) et pourquoi ne résolvent-ils pas tout ?" },
  { id: 5, cat: 'Fond', q: "Quelle est la différence entre aviation court-courrier et long-courrier dans ce débat ?" },
  { id: 6, cat: 'Critique', q: "Vous dites que c'est impossible — mais Airbus travaille sur le ZEROe. Vous avez tort ?" },
  { id: 7, cat: 'Critique', q: "Est-ce un problème technique ou plutôt économique et politique ?" },
  { id: 8, cat: 'Nuance', q: "Quelle solution vous semble la plus réaliste à horizon 2035 ?" },
  { id: 9, cat: 'Lien STI2D', q: "En quoi votre formation STI2D vous a aidé à analyser ce sujet ?" },
  { id: 10, cat: 'Lien STI2D', q: "Pouvez-vous expliquer la chaîne d'énergie d'un avion électrique ?" },
  { id: 11, cat: 'Ouverture', q: "Si vous étiez ingénieur chez Airbus, par quoi commenceriez-vous ?" },
  { id: 12, cat: 'Ouverture', q: "Ce sujet vous a-t-il changé votre façon de prendre l'avion ?" },
]

const CAT_COLOR = {
  'Fond': '#3B82F6',
  'Critique': '#EF4444',
  'Nuance': '#F59E0B',
  'Ouverture': '#10B981',
  'Lien STI2D': '#8B5CF6',
}

const PLAN = {
  intro: {
    titre: "Introduction (1 min)",
    contenu: `Accroche : « En 1783, la montgolfière de Montgolfier s'élevait grâce à de l'air chaud. Aujourd'hui, un Rafale brûle du kérosène à 12 000 Wh/kg. »

Problématique : L'aviation représente 2,5% des émissions mondiales de CO₂. Face à l'urgence climatique, peut-on voler sans pétrole ?

Annonce du plan : Après avoir montré pourquoi le kérosène est difficile à remplacer, j'analyserai les alternatives réelles, puis proposerai une réponse nuancée.`,
  },
  partie1: {
    titre: "I — Le kérosène : une densité énergétique imbattable (2 min)",
    contenu: `• Kérosène : 12 000 Wh/kg — la valeur de référence (source : Jancovici, École de Guerre Économique 2023)
• Comparaison : batterie Li-ion = 200-300 Wh/kg → rapport 1/40
• Contrainte physique : sur un A320, le carburant = 20 tonnes → en batteries : 800+ tonnes (impossible)
• Conclusion partielle : le problème est d'abord physique, pas technologique`,
  },
  partie2: {
    titre: "II — Les alternatives : réelles mais limitées (2 min)",
    contenu: `• Hydrogène H₂ : 33 kWh/kg (énergie) mais volume 4× plus grand, stockage cryogénique à −253°C
  → Airbus ZEROe : cible 2035, court-courrier seulement
• Électrique pur : viable < 500 km (Heart Aerospace ES-30, 30 passagers)
  → Long-courrier = impossible avec technologie actuelle
• SAF (biocarburants) : réduction CO₂ de 50-80%, compatible moteurs existants
  → Mais coût 3-5× plus cher, production mondiale insuffisante`,
  },
  partie3: {
    titre: "III — Réponse nuancée : possible, mais pas universelle (1 min)",
    contenu: `• OUI pour le court-courrier (< 500 km) : électrique ou hybride d'ici 2040
• NON pour le long-courrier : densité énergétique insuffisante à court terme
• Solution réaliste : SAF + amélioration de l'efficacité + report modal (train)
• Ouverture : le vrai défi n'est peut-être pas technique mais comportemental`,
  },
  conclusion: {
    titre: "Conclusion (30 sec)",
    contenu: `L'aviation sans pétrole est partiellement possible : sur les courts trajets, dans une décennie.
Pour le long-courrier, la physique impose des contraintes que la technologie ne peut pas encore surmonter.
La vraie question est peut-être : a-t-on besoin de voler autant ?`,
  },
}

function fmt(sec) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function GrandOral({ userDB }) {
  const [tab, setTab] = useState('plan') // plan | entrainement | questions | notes
  const [timerSec, setTimerSec] = useState(5 * 60) // 5 min exposé
  const [running, setRunning] = useState(false)
  const [phase, setPhase] = useState('expose') // expose | echange
  const [notes, setNotes] = useState(userDB.db.goNotes || '')
  const [selectedQ, setSelectedQ] = useState(null)
  const [qNotes, setQNotes] = useState(userDB.db.goQNotes || {})
  const [repCount, setRepCount] = useState(userDB.db.goRepetitions || 0)
  const ref = useRef(null)

  useEffect(() => {
    if (!running) return
    ref.current = setInterval(() => {
      setTimerSec(t => {
        if (t <= 1) {
          clearInterval(ref.current)
          setRunning(false)
          // Passer à la phase suivante
          if (phase === 'expose') {
            setPhase('echange')
            setTimerSec(10 * 60) // 10 min échange jury
          }
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(ref.current)
  }, [running, phase])

  const saveNotes = (v) => {
    setNotes(v)
    userDB.updateDB(d => { d.goNotes = v })
  }

  const saveQNote = (id, v) => {
    const updated = { ...qNotes, [id]: v }
    setQNotes(updated)
    userDB.updateDB(d => { d.goQNotes = updated })
  }

  const startRepetition = () => {
    setPhase('expose')
    setTimerSec(5 * 60)
    setRunning(true)
    const count = repCount + 1
    setRepCount(count)
    userDB.updateDB(d => { d.goRepetitions = count })
  }

  const resetTimer = () => {
    setRunning(false)
    setPhase('expose')
    setTimerSec(5 * 60)
  }

  const pct = phase === 'expose' ? (timerSec / (5 * 60)) * 100 : (timerSec / (10 * 60)) * 100
  const color = pct > 50 ? '#22C55E' : pct > 25 ? '#F59E0B' : '#EF4444'

  const TABS = [
    { id: 'plan', label: '📋 Plan', },
    { id: 'entrainement', label: '⏱ Entraînement', },
    { id: 'questions', label: '❓ Questions jury', },
    { id: 'notes', label: '📝 Mes notes', },
  ]

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Grand Oral</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Sujet : <span className="font-medium text-gray-700 dark:text-gray-300">« {SUJET} »</span>
        </p>
        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
          <span>📅 23 juin 2026 · 8h00</span>
          <span>⏱ 20 min prépa · 5 min exposé · 10 min échange jury</span>
          <span>🔥 {repCount} répétition{repCount !== 1 ? 's' : ''} effectuée{repCount !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              tab === t.id
                ? 'bg-yellow-500 text-white shadow-sm'
                : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Plan ── */}
      {tab === 'plan' && (
        <div className="space-y-4">
          {Object.entries(PLAN).map(([key, section]) => (
            <div key={key} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="px-5 py-3 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-100 dark:border-yellow-800">
                <h3 className="font-bold text-yellow-800 dark:text-yellow-200 text-sm">{section.titre}</h3>
              </div>
              <div className="px-5 py-4 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                {section.contenu}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Entraînement ── */}
      {tab === 'entrainement' && (
        <div className="max-w-md mx-auto">
          {/* Timer circulaire */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 text-center mb-4">
            <div className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: phase === 'expose' ? '#F59E0B' : '#3B82F6' }}>
              {phase === 'expose' ? '🎤 Exposé (5 min)' : '💬 Échange jury (10 min)'}
            </div>
            <div className="relative inline-flex items-center justify-center mb-6">
              <svg width="180" height="180" className="-rotate-90">
                <circle cx="90" cy="90" r="78" fill="none" stroke="#e5e7eb" strokeWidth="10" className="dark:stroke-gray-700" />
                <circle cx="90" cy="90" r="78" fill="none" strokeWidth="10" stroke={color}
                  strokeDasharray={`${2 * Math.PI * 78}`}
                  strokeDashoffset={`${2 * Math.PI * 78 * (1 - pct / 100)}`}
                  strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s linear' }} />
              </svg>
              <div className="absolute text-center">
                <div className="text-3xl font-bold font-mono tabular-nums" style={{ color }}>{fmt(timerSec)}</div>
                <div className="text-xs text-gray-400">{running ? 'En cours' : 'En pause'}</div>
              </div>
            </div>

            {/* Conseils par phase */}
            {phase === 'expose' && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-3 text-xs text-yellow-700 dark:text-yellow-300 mb-4 text-left">
                <div className="font-semibold mb-1">Rappel structure :</div>
                <div>• 0:00–1:00 → Introduction + problématique</div>
                <div>• 1:00–3:00 → Partie I + Partie II</div>
                <div>• 3:00–4:30 → Partie III</div>
                <div>• 4:30–5:00 → Conclusion</div>
              </div>
            )}
            {phase === 'echange' && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-xs text-blue-700 dark:text-blue-300 mb-4 text-left">
                <div className="font-semibold mb-1">Conseils échange :</div>
                <div>• Écoute bien la question avant de répondre</div>
                <div>• Tu peux dire "C'est une excellente question"</div>
                <div>• Si tu ne sais pas : "Je n'ai pas abordé ce point précisément, mais…"</div>
                <div>• Reste calme, prends 2 secondes pour réfléchir</div>
              </div>
            )}

            <div className="flex gap-3 justify-center">
              {!running && timerSec === 5 * 60 ? (
                <button onClick={startRepetition}
                  className="px-8 py-3 rounded-xl font-bold text-white bg-yellow-500 hover:bg-yellow-600 transition-colors shadow-lg shadow-yellow-200 dark:shadow-yellow-900/30">
                  ▶ Démarrer (répétition #{repCount + 1})
                </button>
              ) : (
                <>
                  <button onClick={() => setRunning(r => !r)}
                    className={`px-6 py-3 rounded-xl font-bold text-white transition-colors ${running ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-600 hover:bg-green-700'}`}>
                    {running ? '⏸ Pause' : '▶ Reprendre'}
                  </button>
                  <button onClick={resetTimer}
                    className="px-4 py-3 rounded-xl font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 transition-colors">
                    ↺ Reset
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Historique répétitions */}
          {repCount > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 text-center">
              <div className="text-2xl font-bold text-yellow-500 mb-1">{repCount}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                répétition{repCount !== 1 ? 's' : ''} effectuée{repCount !== 1 ? 's' : ''}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Objectif : 5+ répétitions avant le 23 juin
              </div>
              <div className="flex gap-1 mt-2 justify-center">
                {Array.from({ length: 5 }, (_, i) => (
                  <div key={i} className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${i < repCount ? 'bg-yellow-400 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                    {i < repCount ? '✓' : i + 1}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Questions jury ── */}
      {tab === 'questions' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {QUESTIONS_JURY.map(q => (
            <div key={q.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: CAT_COLOR[q.cat] }}>
                  {q.cat}
                </span>
                <span className="text-xs text-gray-400">Q{q.id}</span>
              </div>
              <div className="p-4">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-3 leading-snug">« {q.q} »</p>
                {selectedQ === q.id ? (
                  <div>
                    <textarea
                      value={qNotes[q.id] || ''}
                      onChange={e => saveQNote(q.id, e.target.value)}
                      placeholder="Ta réponse préparée…"
                      rows={4}
                      className="w-full text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 resize-none focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    />
                    <button onClick={() => setSelectedQ(null)}
                      className="mt-2 w-full py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 transition-colors">
                      Fermer
                    </button>
                  </div>
                ) : (
                  <div>
                    {qNotes[q.id] ? (
                      <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg p-2 mb-2 line-clamp-2">
                        {qNotes[q.id]}
                      </div>
                    ) : null}
                    <button onClick={() => setSelectedQ(q.id)}
                      className="w-full py-1.5 rounded-lg text-xs font-medium bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-100 transition-colors">
                      {qNotes[q.id] ? '✏️ Modifier la réponse' : '+ Préparer la réponse'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Notes libres ── */}
      {tab === 'notes' && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Notes libres</h2>
            <span className="text-xs text-gray-400">Sauvegarde automatique</span>
          </div>
          <textarea
            value={notes}
            onChange={e => saveNotes(e.target.value)}
            placeholder={`Notes sur le sujet, arguments à ne pas oublier, chiffres clés…\n\nEx:\n• Kérosène : 12 000 Wh/kg\n• Li-ion : 200-300 Wh/kg (rapport 1/40)\n• Airbus ZEROe cible 2035\n• SAF réduit CO₂ de 50-80%`}
            rows={20}
            className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 resize-none focus:outline-none focus:ring-2 focus:ring-yellow-400 font-mono"
          />
        </div>
      )}
    </div>
  )
}
