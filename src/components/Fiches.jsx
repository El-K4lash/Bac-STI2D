import { useState, useMemo } from 'react'
import { MAT_COLOR, MAT_BG, MATIERES, FREQUENCES, PRIORITE_LABEL } from '../utils/constants'
import { renderFicheContent } from '../utils/renderFiche'

const TODAY = new Date().toISOString().split('T')[0]

function extractKeywords(tache) {
  return tache
    .toLowerCase()
    .replace(/[():,φηλ↪⭐]/g, ' ')
    .replace(/\b(et|les|des|de|du|la|le|un|une|en|sur|au|aux|par|pour|avec|dans)\b/g, ' ')
    .trim().split(/\s+/).filter(w => w.length > 3)
}
function matchScore(keywords, text) {
  const t = text.toLowerCase()
  return keywords.reduce((s, kw) => s + (t.includes(kw) ? 1 : 0), 0)
}

function exportFichePDF(fiche) {
  const win = window.open('', '_blank')
  const color = MAT_COLOR[fiche.mat] || '#333'

  // Convertit le contenu en HTML propre pour le PDF
  function renderLine(line) {
    const t = line.trim()
    if (!t) return '<div style="height:8px"></div>'
    if (/^[─━═\-]{4,}$/.test(t)) return ''
    // Titre section (MAJUSCULES)
    if (t === t.toUpperCase() && t.length > 2 && /^[A-ZÀÂÄÉÈÊËÎÏÔÙÛÜ0-9 '()\-\/]+$/.test(t) && !/[=∫]/.test(t)) {
      return `<div style="margin-top:18px;margin-bottom:4px">
        <span style="font-size:10px;font-weight:900;letter-spacing:0.18em;text-transform:uppercase;color:${color}">${t}</span>
        <div style="height:1px;background:${color};opacity:0.25;margin-top:4px"></div>
      </div>`
    }
    // Puce
    if (/^[•·\-–—*]\s/.test(t)) {
      const text = t.replace(/^[•·\-–—*]\s/, '')
      return `<div style="display:flex;gap:8px;padding:2px 0;padding-left:4px">
        <span style="margin-top:6px;width:5px;height:5px;border-radius:50%;background:${color};opacity:0.6;flex-shrink:0;display:inline-block"></span>
        <span style="font-size:13px;color:#333;line-height:1.6">${applySymbols(text)}</span>
      </div>`
    }
    // Bloc EXEMPLE/PIÈGE
    if (/^(EXEMPLE|PIÈGE|ATTENTION|REMARQUE)\b/i.test(t)) {
      const isWarn = /PIÈGE|ATTENTION/i.test(t)
      return `<div style="margin:8px 0;padding:10px 14px;border-left:4px solid ${isWarn ? '#ef4444' : '#6366f1'};background:${isWarn ? '#fef2f2' : '#eef2ff'};border-radius:0 8px 8px 0">
        <div style="font-size:9px;font-weight:900;letter-spacing:0.15em;text-transform:uppercase;color:${isWarn ? '#ef4444' : '#6366f1'};margin-bottom:4px">${t}</div>
      </div>`
    }
    // Formule (contient =)
    if (t.includes('=') && /[\/\^_∫√×÷≤≥≠≈±∞→←ηφπλωμΔδθαβγσρ]/.test(t)) {
      const colonIdx = t.indexOf(':')
      const hasLabel = colonIdx > 0 && colonIdx < 28 && !/[=→∫]/.test(t.slice(0, colonIdx)) && t.slice(0, colonIdx).split(' ').length <= 5
      if (hasLabel) {
        const label = t.slice(0, colonIdx).trim()
        const formula = t.slice(colonIdx + 1).trim()
        return `<div style="display:flex;align-items:center;gap:16px;padding:6px 14px;margin:3px 0;border-radius:8px;background:${color}12;border-left:3px solid ${color}50">
          <span style="font-size:11px;color:#666;min-width:120px;text-align:right;font-style:italic">${label}</span>
          <span style="font-family:monospace;font-size:13px;font-weight:700;color:#111">${applySymbols(formula)}</span>
        </div>`
      }
      return `<div style="padding:6px 14px;margin:3px 0;border-radius:8px;background:${color}12;border-left:3px solid ${color}50;font-family:monospace;font-size:13px;font-weight:700;color:#111">${applySymbols(t)}</div>`
    }
    return `<p style="font-size:13px;color:#333;line-height:1.6;margin:2px 0">${applySymbols(t)}</p>`
  }

  function applySymbols(text) {
    return text
      .replace(/\^{([^}]+)}/g, (_, e) => `<sup>${e}</sup>`)
      .replace(/\^(-?\d+)/g, (_, e) => `<sup>${e}</sup>`)
      .replace(/\^([A-Za-z])/g, (_, e) => `<sup>${e}</sup>`)
      .replace(/_([A-Za-z0-9]{1,3})/g, (_, e) => `<sub>${e}</sub>`)
      .replace(/×/g, '×').replace(/→/g, '→').replace(/←/g, '←')
      .replace(/≤/g, '≤').replace(/≥/g, '≥').replace(/≠/g, '≠')
      .replace(/≈/g, '≈').replace(/±/g, '±').replace(/∞/g, '∞')
      .replace(/∫/g, '∫').replace(/√/g, '√').replace(/η/g, 'η')
      .replace(/φ/g, 'φ').replace(/π/g, 'π').replace(/λ/g, 'λ')
      .replace(/ω/g, 'ω').replace(/μ/g, 'μ').replace(/Δ/g, 'Δ')
  }

  const lines = fiche.contenu.split('\n')
  const bodyHtml = lines.map(renderLine).join('\n')

  win.document.write(`<!DOCTYPE html><html><head>
    <meta charset="utf-8">
    <title>${fiche.titre}</title>
    <style>
      * { box-sizing: border-box; }
      body { font-family: 'Segoe UI', system-ui, sans-serif; max-width: 720px; margin: 36px auto; color: #111; padding: 0 20px; }
      .header { border-bottom: 3px solid ${color}; padding-bottom: 12px; margin-bottom: 24px; }
      .mat { display: inline-block; background: ${color}18; color: ${color}; padding: 3px 12px; border-radius: 20px; font-size: 11px; font-weight: 800; margin-bottom: 10px; }
      h1 { color: ${color}; font-size: 22px; margin: 0; font-weight: 800; }
      .content { background: #f8f8f8; border-left: 4px solid ${color}; border-radius: 0 12px 12px 0; padding: 20px 24px; }
      .tags { margin-top: 20px; font-size: 11px; color: #999; }
      .footer { margin-top: 36px; font-size: 10px; color: #bbb; text-align: center; border-top: 1px solid #eee; padding-top: 12px; }
      @media print { body { margin: 16px; } .footer { position: fixed; bottom: 0; width: 100%; } }
    </style>
  </head><body>
    <div class="header">
      <div class="mat">${fiche.mat}</div>
      <h1>${fiche.titre}</h1>
    </div>
    <div class="content">${bodyHtml}</div>
    <div class="tags">${(fiche.tags || []).join(' · ')}</div>
    <div class="footer">Bac STI2D 2026 — Hugo KACI · Lycée Alphonse Benoît</div>
  </body></html>`)
  win.document.close()
  win.print()
}

function Badge({ children, color }) {
  return (
    <span className="inline-block text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: color + '22', color }}>
      {children}
    </span>
  )
}

function FicheModal({ fiche, onClose, userDB }) {
  const { db, markFiche } = userDB
  const done = db.fichesDone[fiche.id] || {}

  const matColor = MAT_COLOR[fiche.mat] || '#888'

  return (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        {/* Bande couleur + Header */}
        <div className="sticky top-0 z-10 rounded-t-2xl overflow-hidden">
          <div className="h-1.5 w-full" style={{ backgroundColor: matColor }} />
          <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge color={matColor}>{fiche.mat}</Badge>
                {fiche.freq === 'chaque-annee' && (
                  <span className="text-xs text-orange-500 font-medium">⭐ Chaque année</span>
                )}
                {fiche.priorite === 3 && (
                  <span className="text-xs text-red-500 font-medium">🔥 Priorité haute</span>
                )}
              </div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{fiche.titre}</h2>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none shrink-0 ml-4">×</button>
          </div>
        </div>

        {/* Contenu */}
        <div className="px-6 py-4">
          <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-5 border border-gray-100 dark:border-gray-700/50">
            {renderFicheContent(fiche.contenu, MAT_COLOR[fiche.mat] || '#888')}
          </div>

          {/* Tags */}
          <div className="flex gap-2 mt-4 flex-wrap">
            {fiche.tags?.map(t => <Badge key={t} color="#666">{t}</Badge>)}
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3 flex-wrap items-center">
          <button
            onClick={() => { markFiche(fiche.id, false); onClose() }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              done.seen && !done.mastered
                ? 'bg-blue-600 text-white'
                : 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200'
            }`}
          >
            {done.seen && !done.mastered ? '✓ Marqué vu' : '👁 Marquer vu'}
          </button>
          <button
            onClick={() => { markFiche(fiche.id, true); onClose() }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              done.mastered
                ? 'bg-green-600 text-white'
                : 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 hover:bg-green-200'
            }`}
          >
            {done.mastered ? '✓ Maîtrisé !' : '⭐ Maîtrisé'}
          </button>
          <button onClick={() => exportFichePDF(fiche)}
            className="ml-auto px-3 py-2 rounded-lg text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border border-gray-200 dark:border-gray-700"
            title="Exporter en PDF">
            🖨 PDF
          </button>
        </div>
      </div>
    </div>
  )
}

function AddFicheModal({ onClose, userDB }) {
  const [form, setForm] = useState({ mat: 'PC', titre: '', contenu: '', freq: 'chaque-annee' })
  const { updateDB } = userDB

  const submit = () => {
    if (!form.titre.trim() || !form.contenu.trim()) return
    updateDB(d => {
      if (!d.customFiches) d.customFiches = []
      d.customFiches.push({ ...form, id: `custom-${Date.now()}`, priorite: 2, tags: ['Custom'] })
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Ajouter une fiche</h2>
        <div className="space-y-3">
          <div className="flex gap-3">
            <select value={form.mat} onChange={e => setForm(f => ({...f, mat: e.target.value}))}
              className="flex-1 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
              {['PC','Maths','SIN','2I2D','Philo','GO'].map(m => <option key={m}>{m}</option>)}
            </select>
            <select value={form.freq} onChange={e => setForm(f => ({...f, freq: e.target.value}))}
              className="flex-1 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
              <option value="chaque-annee">Chaque année</option>
              <option value="regulier">Régulier</option>
            </select>
          </div>
          <input value={form.titre} onChange={e => setForm(f => ({...f, titre: e.target.value}))}
            placeholder="Titre de la fiche"
            className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
          <textarea value={form.contenu} onChange={e => setForm(f => ({...f, contenu: e.target.value}))}
            placeholder="Contenu (formules, définitions...)"
            rows={6}
            className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm font-mono bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none" />
        </div>
        <div className="flex gap-3 mt-4">
          <button onClick={submit} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 text-sm font-medium transition-colors">
            Ajouter
          </button>
          <button onClick={onClose} className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg py-2 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
            Annuler
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Fiches({ userDB, dbData }) {
  const [matFilter, setMatFilter] = useState('Tout')
  const [freqFilter, setFreqFilter] = useState('tout')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const { db } = userDB

  const allFiches = [...dbData.fiches, ...(db.customFiches || [])]

  // Fiches du jour : liées aux tâches du planning d'aujourd'hui
  const todayFiches = useMemo(() => {
    const tasks = dbData.planning.filter(p => p.date === TODAY && !p.tache.startsWith('🏥') && p.mat !== 'EXAM')
    if (tasks.length === 0) return []
    const results = []
    tasks.forEach(task => {
      const keywords = extractKeywords(task.tache)
      const matFiches = allFiches.filter(f => f.mat === task.mat)
      matFiches
        .map(f => ({ fiche: f, score: matchScore(keywords, f.titre + ' ' + f.contenu) }))
        .filter(x => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 2)
        .forEach(x => { if (!results.find(r => r.id === x.fiche.id)) results.push(x.fiche) })
    })
    return results
  }, [dbData, allFiches.length])

  const filtered = allFiches.filter(f => {
    if (matFilter !== 'Tout' && f.mat !== matFilter) return false
    if (freqFilter !== 'tout' && f.freq !== freqFilter) return false
    if (search && !f.titre.toLowerCase().includes(search.toLowerCase()) && !f.contenu.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const getStatus = (id) => {
    const d = db.fichesDone[id]
    if (!d) return 'new'
    if (d.mastered) return 'mastered'
    if (d.seen) return 'seen'
    return 'new'
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Fiches de révision</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{filtered.length} fiche{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          + Ajouter
        </button>
      </div>

      {/* ── Fiches du jour ── */}
      {todayFiches.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base font-bold text-gray-900 dark:text-white">📖 Fiches du jour</span>
            <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {todayFiches.map(fiche => {
              const status = getStatus(fiche.id)
              return (
                <button key={fiche.id} onClick={() => setSelected(fiche)}
                  className="relative rounded-xl border-2 p-4 text-left hover:shadow-lg transition-all group overflow-hidden"
                  style={{ borderColor: MAT_COLOR[fiche.mat] + '60', backgroundColor: MAT_COLOR[fiche.mat] + '08' }}>
                  <div className="absolute top-0 left-0 right-0 h-0.5" style={{ backgroundColor: MAT_COLOR[fiche.mat] }} />
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold" style={{ color: MAT_COLOR[fiche.mat] }}>{fiche.mat}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                      status === 'mastered' ? 'bg-green-900/40 text-green-400'
                      : status === 'seen' ? 'bg-blue-900/40 text-blue-400'
                      : 'bg-orange-900/30 text-orange-400'
                    }`}>
                      {status === 'mastered' ? '⭐ Maîtrisé' : status === 'seen' ? '👁 Vu' : 'À voir'}
                    </span>
                  </div>
                  <h3 className="font-semibold text-sm text-gray-900 dark:text-white group-hover:text-blue-500 dark:group-hover:text-blue-400 leading-snug mb-1">
                    {fiche.titre}
                  </h3>
                  <p className="text-xs text-gray-400 line-clamp-1 font-mono">
                    {fiche.contenu.split('\n').find(l => l.trim() && !l.match(/^[─━═A-Z\s]{4,}$/))}
                  </p>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher..."
          className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-48" />

        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {MATIERES.map(m => (
            <button key={m} onClick={() => setMatFilter(m)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                matFilter === m ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}>
              {m}
            </button>
          ))}
        </div>

        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {FREQUENCES.map(f => (
            <button key={f.value} onClick={() => setFreqFilter(f.value)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                freqFilter === f.value ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grille */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(fiche => {
          const status = getStatus(fiche.id)
          return (
            <button key={fiche.id} onClick={() => setSelected(fiche)}
              className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 text-left hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all group">
              <div className="flex items-start justify-between gap-2 mb-2">
                <Badge color={MAT_COLOR[fiche.mat]}>{fiche.mat}</Badge>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  status === 'mastered' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                  : status === 'seen' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
                  : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                }`}>
                  {status === 'mastered' ? '⭐ Maîtrisé' : status === 'seen' ? '👁 Vu' : 'Nouveau'}
                </span>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-snug mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                {fiche.titre}
              </h3>
              <p className="text-xs text-gray-400 dark:text-gray-500 line-clamp-2 font-mono">
                {fiche.contenu.split('\n')[0]}
              </p>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                {fiche.freq === 'chaque-annee' && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-500">⭐ Chaque année</span>
                )}
                {fiche.priorite === 3 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-500">🔥 Priorité haute</span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-400">Aucune fiche ne correspond aux filtres.</div>
      )}

      {selected && <FicheModal fiche={selected} onClose={() => setSelected(null)} userDB={userDB} />}
      {showAdd && <AddFicheModal onClose={() => setShowAdd(false)} userDB={userDB} />}
    </div>
  )
}
