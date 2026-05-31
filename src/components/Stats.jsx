import { useState } from 'react'
import {
  LineChart, Line, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { MAT_COLOR, MATIERES } from '../utils/constants'

function AddNoteModal({ onClose, onSave }) {
  const [form, setForm] = useState({ mat: 'PC', val: '', src: '', titre: '' })
  const save = () => {
    const v = parseFloat(form.val)
    if (isNaN(v) || v < 0 || v > 20 || !form.mat) return
    onSave(form.mat, v, form.src, form.titre)
    onClose()
  }
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Ajouter une note</h2>
        <div className="space-y-3">
          <div className="flex gap-3">
            <select value={form.mat} onChange={e => setForm(f => ({...f, mat: e.target.value}))}
              className="flex-1 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
              {['PC','Maths','SIN','2I2D','Philo','GO'].map(m => <option key={m}>{m}</option>)}
            </select>
            <input type="number" min="0" max="20" step="0.5" value={form.val}
              onChange={e => setForm(f => ({...f, val: e.target.value}))}
              placeholder="Note /20"
              className="w-28 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
          </div>
          <input value={form.titre} onChange={e => setForm(f => ({...f, titre: e.target.value}))}
            placeholder="Intitulé (ex: Annale 2024)"
            className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
          <input value={form.src} onChange={e => setForm(f => ({...f, src: e.target.value}))}
            placeholder="Source (ex: exercice, simulation…)"
            className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
        </div>
        <div className="flex gap-3 mt-4">
          <button onClick={save} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 text-sm font-medium">Enregistrer</button>
          <button onClick={onClose} className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg py-2 text-sm font-medium">Annuler</button>
        </div>
      </div>
    </div>
  )
}

// GitHub-style heatmap: last 42 days
function Heatmap({ sessions }) {
  const today = new Date()
  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (41 - i))
    return d.toISOString().split('T')[0]
  })
  const countMap = {}
  sessions.forEach(s => { countMap[s.date] = (countMap[s.date] || 0) + 1 })

  const weeks = []
  for (let i = 0; i < 42; i += 7) weeks.push(days.slice(i, i + 7))

  const color = (n) => {
    if (!n) return 'bg-gray-100 dark:bg-gray-800'
    if (n === 1) return 'bg-green-200 dark:bg-green-900'
    if (n === 2) return 'bg-green-400 dark:bg-green-700'
    return 'bg-green-600 dark:bg-green-500'
  }

  return (
    <div>
      <div className="flex gap-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map(day => (
              <div key={day} title={`${day}: ${countMap[day] || 0} session(s)`}
                className={`w-3 h-3 rounded-sm ${color(countMap[day] || 0)}`} />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-400">
        <span>Moins</span>
        {['bg-gray-100 dark:bg-gray-800','bg-green-200 dark:bg-green-900','bg-green-400 dark:bg-green-700','bg-green-600 dark:bg-green-500'].map((c,i) => (
          <div key={i} className={`w-3 h-3 rounded-sm ${c}`} />
        ))}
        <span>Plus</span>
      </div>
    </div>
  )
}

export default function Stats({ userDB, dbData }) {
  const { db, addNote, resetDB, fichesVues, fichesMaitrisees, exosFaits, exosReussis, avgNote } = userDB
  const [showAdd, setShowAdd] = useState(false)
  const [showReset, setShowReset] = useState(false)

  const notes = [...db.notes].sort((a, b) => a.date.localeCompare(b.date))

  // Courbe évolution dans le temps
  const lineData = notes.map((n, i) => ({
    name: `${n.mat} ${i + 1}`,
    note: n.val,
    mat: n.mat,
    date: n.date,
    titre: n.titre || n.src,
  }))

  // Moyenne par matière
  const matMoyennes = ['PC','Maths','SIN','2I2D','Philo','GO'].map(mat => {
    const ns = db.notes.filter(n => n.mat === mat)
    const avg = ns.length ? Math.round(ns.reduce((a, n) => a + n.val, 0) / ns.length * 10) / 10 : null
    return { mat, avg, count: ns.length }
  }).filter(m => m.count > 0)

  const barData = matMoyennes.map(m => ({ mat: m.mat, moyenne: m.avg }))

  // Radar
  const radarData = ['PC','Maths','SIN','2I2D','Philo','GO'].map(mat => {
    const fiches = dbData.fiches.filter(f => f.mat === mat)
    const vues = fiches.filter(f => db.fichesDone[f.id]?.seen).length
    const score = fiches.length ? Math.round((vues / fiches.length) * 100) : 0
    return { mat, score }
  })

  // Prédiction
  const prediction = avgNote != null ? Math.min(20, Math.round((avgNote * 0.7 + (fichesMaitrisees / Math.max(dbData.fiches.length, 1)) * 20 * 0.3) * 10) / 10) : null

  const CustomDot = (props) => {
    const { cx, cy, payload } = props
    return <circle cx={cx} cy={cy} r={4} fill={MAT_COLOR[payload.mat] || '#2563eb'} stroke="white" strokeWidth={1.5} />
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mes statistiques</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{db.notes.length} note{db.notes.length !== 1 ? 's' : ''} enregistrée{db.notes.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAdd(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            + Ajouter une note
          </button>
          <button onClick={() => setShowReset(true)}
            className="bg-gray-100 dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 px-3 py-2 rounded-lg text-sm font-medium transition-colors border border-gray-200 dark:border-gray-700"
            title="Réinitialiser toute la progression">
            ↺ Reset
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Moyenne générale', value: avgNote != null ? `${avgNote}/20` : '—', color: '#3182CE' },
          { label: 'Fiches maîtrisées', value: `${fichesMaitrisees}/${dbData.fiches.length}`, color: '#38A169' },
          { label: 'Exos réussis', value: `${exosReussis}/${exosFaits}`, color: '#D69E2E' },
          { label: 'Streak', value: `${db.streak || 0}j 🔥`, color: '#E53E3E' },
        ].map(k => (
          <div key={k.label} className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
            <div className="text-2xl font-bold" style={{ color: k.color }}>{k.value}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Prédiction */}
      {prediction != null && (
        <div className={`rounded-xl p-4 border text-sm font-medium ${
          prediction >= 14 ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
          : prediction >= 10 ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300'
          : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
        }`}>
          🎯 Prédiction bac estimée : <span className="font-bold text-lg">{prediction}/20</span>
          <span className="ml-2 text-xs font-normal opacity-70">(basé sur tes notes et fiches maîtrisées)</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Courbe évolution */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Évolution des notes</h2>
          {lineData.length < 2 ? (
            <div className="h-40 flex items-center justify-center text-sm text-gray-400">
              Ajoute au moins 2 notes pour voir la courbe.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={lineData} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="titre" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis domain={[0, 20]} tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(v, n, p) => [`${v}/20`, p.payload.mat]}
                  labelFormatter={(l) => l}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Line type="monotone" dataKey="note" strokeWidth={2} stroke="#3182CE" dot={<CustomDot />} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Moyenne par matière */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Moyenne par matière</h2>
          {barData.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-sm text-gray-400">Pas encore de données.</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="mat" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 20]} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => [`${v}/20`]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="moyenne" radius={[4,4,0,0]}>
                  {barData.map((entry, i) => (
                    <rect key={i} fill={MAT_COLOR[entry.mat] || '#3182CE'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Radar progression */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Progression fiches par matière</h2>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis dataKey="mat" tick={{ fontSize: 11 }} />
              <Radar dataKey="score" stroke="#3182CE" fill="#3182CE" fillOpacity={0.25} strokeWidth={2} />
              <Tooltip formatter={(v) => [`${v}%`]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Heatmap */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Activité (42 derniers jours)</h2>
          <Heatmap sessions={db.sessions} />
        </div>
      </div>

      {/* Historique des notes */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 font-semibold text-sm text-gray-700 dark:text-gray-300 flex items-center justify-between">
          <span>Historique des notes</span>
          {db.notes.length > 0 && (
            <span className="text-xs text-gray-400">{db.notes.length} entrée{db.notes.length !== 1 ? 's' : ''}</span>
          )}
        </div>
        {db.notes.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-400">
            Aucune note encore. Lance une simulation ou ajoute une note manuellement.
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-64 overflow-y-auto">
            {[...db.notes].reverse().map(n => (
              <div key={n.id} className="px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold w-10" style={{ color: MAT_COLOR[n.mat] }}>{n.mat}</span>
                  <div>
                    <div className="text-sm text-gray-800 dark:text-gray-200">{n.titre || n.src || '—'}</div>
                    <div className="text-xs text-gray-400">{n.date}</div>
                  </div>
                </div>
                <span className={`font-bold tabular-nums text-sm ${
                  n.val >= 14 ? 'text-green-600' : n.val >= 10 ? 'text-orange-500' : 'text-red-500'
                }`}>{n.val}/20</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAdd && <AddNoteModal onClose={() => setShowAdd(false)} onSave={addNote} />}

      {showReset && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowReset(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="text-3xl mb-3 text-center">⚠️</div>
            <h2 className="text-lg font-bold text-center text-gray-900 dark:text-white mb-2">Remettre à zéro ?</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
              Toute ta progression sera effacée : notes, fiches vues, flashcards SM-2, exercices faits, streak. Cette action est irréversible.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { resetDB(); setShowReset(false) }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors">
                Oui, tout effacer
              </button>
              <button
                onClick={() => setShowReset(false)}
                className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl py-2.5 text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                Annuler
          </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
