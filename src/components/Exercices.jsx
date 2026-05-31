import { useState, useEffect, useMemo, useRef } from 'react'
import { MAT_COLOR, MATIERES, FREQUENCES } from '../utils/constants'
import { shuffleExo } from '../utils/shuffle'
import { getAllExercices, instantiateVariable } from '../utils/variableExo'
import { renderMath } from '../utils/mathRender'
import { runPython } from '../utils/pythonRunner'
import { runArduino } from '../utils/arduinoRunner'

const DIFF_COLOR = { facile: '#38A169', moyen: '#D69E2E', difficile: '#E53E3E' }
const TODAY = new Date().toISOString().split('T')[0]

function extractKeywords(tache) {
  return tache
    .toLowerCase()
    .replace(/[():,φηλ↪⭐]/g, ' ')
    .replace(/\b(et|les|des|de|du|la|le|un|une|en|sur|au|aux|par|pour|avec|dans|qui|que|se|ce|sa|son|ses|leur|leurs|tout|tous|toute)\b/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(w => w.length > 3)
}

function matchScore(keywords, text) {
  const t = text.toLowerCase()
  return keywords.reduce((s, kw) => s + (t.includes(kw) ? 1 : 0), 0)
}

function CodeModal({ exo, onClose, onSuccess }) {
  const [code, setCode] = useState(exo.code_template)
  const [output, setOutput] = useState(null)
  const [status, setStatus] = useState(null) // null | 'success' | 'error' | 'wrong'
  const [showSolution, setShowSolution] = useState(false)
  const [showCorrection, setShowCorrection] = useState(false)
  const textareaRef = useRef(null)

  const isCpp = exo.langue === 'cpp'
  const [revealed, setRevealed] = useState(false)

  // Extraire ce que l'utilisateur a mis à la place de chaque ___
  // en suivant exactement la structure du template avant/après chaque blanc
  const checkBlanks = () => {
    const clean = (s) => s.split('\n').map(l => l.replace(/\/\/.*$/, '').trimEnd()).join('\n')
    const templateClean = clean(exo.code_template)
    const solutionClean = clean(exo.solution)
    const userClean = clean(code)

    const parts = templateClean.split('___')
    const nbBlanks = parts.length - 1
    if (nbBlanks === 0) return []

    // Pour chaque blanc : extraire le mot attendu (solution) et celui de l'utilisateur
    // en trouvant ce qui se trouve entre les parties fixes du template
    const extract = (text, parts) => {
      const fills = []
      let pos = 0
      for (let i = 0; i < parts.length - 1; i++) {
        const before = parts[i]
        const afterPart = parts[i + 1]
        // Avancer jusqu'à la fin de la partie "before"
        const startSearch = pos
        const idx = text.indexOf(before.trimStart(), startSearch)
        if (idx === -1) { fills.push(''); continue }
        pos = idx + before.length
        // Ce qui suit jusqu'au prochain morceau fixe
        // Le prochain morceau fixe commence par son premier caractère non-blanc
        const nextFixed = afterPart.trimStart().split(/[\s;,()\n]/)[0]
        let fill = ''
        if (nextFixed) {
          const endIdx = text.indexOf(nextFixed, pos)
          fill = endIdx >= 0 ? text.slice(pos, endIdx) : text.slice(pos).split(/[\s;,\n]/)[0]
        } else {
          fill = text.slice(pos).split(/[\s;,\n]/)[0]
        }
        fills.push(fill.trim().replace(/[;,\s]+$/, ''))
        pos += fill.length
      }
      return fills
    }

    const solutionFills = extract(solutionClean, parts)
    const userFills = extract(userClean, parts)

    return solutionFills.map((expected, i) => ({
      idx: i + 1,
      expected,
      userFill: userFills[i] || ''
    }))
  }

  const run = () => {
    if (isCpp) {
      const checks = checkBlanks()
      if (!checks) {
        setOutput('Structure du code modifiée — réouvre l\'exercice pour repartir du template.')
        setStatus('error')
        setRevealed(true)
        return
      }
      const wrong = checks.filter(c => c.userFill !== c.expected)
      if (wrong.length === 0) {
        setOutput('✓ Tout est correct !')
        setStatus('success')
      } else {
        const lines = wrong.map(w =>
          `Blanc n°${w.idx} : tu as mis "${w.userFill}" → attendu "${w.expected}"`
        )
        setOutput(lines.join('\n'))
        setStatus('wrong')
      }
      setRevealed(true)
      return
    }
    // Python : même logique de vérification des blancs
    const checks = checkBlanks()
    if (!checks) {
      setOutput('Structure du code modifiée — réouvre l\'exercice pour repartir du template.')
      setStatus('error')
      return
    }
    const wrong = checks.filter(c => c.userFill !== c.expected)
    if (wrong.length === 0) {
      setOutput('✓ Tout est correct !')
      setStatus('success')
    } else {
      const lines = wrong.map(w =>
        `Blanc n°${w.idx} : tu as mis "${w.userFill}" → attendu "${w.expected}"`
      )
      setOutput(lines.join('\n'))
      setStatus('wrong')
    }
  }

  const handleTab = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const ta = textareaRef.current
      const start = ta.selectionStart, end = ta.selectionEnd
      const newCode = code.substring(0, start) + '    ' + code.substring(end)
      setCode(newCode)
      setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + 4 }, 0)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-950 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="border-b border-gray-800 px-6 py-4 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {isCpp
                ? <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-900/40 text-blue-300">⚡ C++ Arduino</span>
                : <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-900/40 text-green-400">🐍 Python</span>
              }
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: MAT_COLOR[exo.mat] + '22', color: MAT_COLOR[exo.mat] }}>{exo.mat}</span>
              {exo.freq === 'chaque-annee' && <span className="text-xs text-orange-400">⭐ Chaque année</span>}
            </div>
            <h2 className="text-base font-bold text-white">{exo.titre}</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-2xl leading-none shrink-0">×</button>
        </div>

        <div className="p-6 space-y-4">
          {/* Énoncé */}
          <div className="bg-gray-800/60 rounded-xl p-4 text-sm text-gray-200 leading-relaxed border-l-4" style={{ borderLeftColor: MAT_COLOR[exo.mat] }}>
            {exo.enonce}
          </div>

          {/* Éditeur */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">📝 Complète le script</div>
              <div className="text-[10px] text-gray-500">Tab = 4 espaces</div>
            </div>
            <textarea
              ref={textareaRef}
              value={code}
              onChange={e => { setCode(e.target.value); setStatus(null); setOutput(null) }}
              onKeyDown={handleTab}
              rows={code.split('\n').length + 1}
              spellCheck={false}
              className={`w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm font-mono resize-none focus:outline-none focus:ring-2 leading-relaxed ${isCpp ? 'text-blue-200 focus:ring-blue-500/50' : 'text-green-300 focus:ring-green-500/50'}`}
            />
          </div>

          {/* Bouton Exécuter — masqué seulement en cas de succès */}
          {status !== 'success' && (
            <div className="space-y-2">
              <button onClick={run}
                className={`w-full py-3 rounded-xl font-bold text-sm text-white transition-colors flex items-center justify-center gap-2 ${isCpp ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'}`}>
                {status === 'wrong' || status === 'error' ? '↺ Réessayer' : (isCpp ? '▶ Vérifier' : '▶ Vérifier')}
              </button>
              {isCpp && exo.aide && (
                <button onClick={() => setShowSolution(s => !s)}
                  className="w-full py-2 rounded-xl text-xs font-semibold border border-yellow-400/40 text-yellow-400 bg-yellow-400/5 hover:bg-yellow-400/10 transition-colors">
                  💡 {showSolution ? "Masquer l'aide" : "Afficher l'aide"}
                </button>
              )}
              {isCpp && exo.aide && showSolution && (
                <div className="rounded-xl border border-yellow-400/20 bg-yellow-400/5 p-4 space-y-3">
                  {exo.aide.formule && <div><div className="text-[10px] font-black tracking-widest uppercase text-yellow-400 mb-1">Fonctions clés</div><div className="font-mono text-sm text-gray-100 bg-gray-800/60 rounded-lg px-3 py-2 whitespace-pre-line">{exo.aide.formule}</div></div>}
                  {exo.aide.methode && <div><div className="text-[10px] font-black tracking-widest uppercase text-blue-400 mb-1">Méthode</div><div className="text-sm text-gray-300 whitespace-pre-line">{exo.aide.methode}</div></div>}
                  {exo.aide.piege && <div className="border-l-4 border-red-500 pl-3 bg-red-950/30 rounded-r-lg py-2 pr-3"><div className="text-[10px] font-black tracking-widest uppercase text-red-400 mb-1">Piège</div><div className="text-sm text-gray-300">{exo.aide.piege}</div></div>}
                </div>
              )}
            </div>
          )}

          {/* Résultat C++ */}
          {isCpp && output !== null && status !== 'success' && (
            <div className="space-y-3">
              <div className={`rounded-xl border p-4 text-sm whitespace-pre-wrap leading-relaxed ${
                status === 'error' ? 'bg-red-950/40 border-red-500/40 text-red-300'
                : 'bg-orange-950/30 border-orange-500/30 text-orange-200'
              }`}>
                <div className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-60">
                  {status === 'error' ? '✗ Structure incorrecte' : '⚠ Réponses incorrectes'}
                </div>
                {output}
              </div>
              {exo.explication && (
                <div className="text-xs text-gray-400 bg-gray-800/40 rounded-xl px-3 py-2 leading-relaxed">{exo.explication}</div>
              )}
            </div>
          )}

          {/* Résultat Python */}
          {!isCpp && output !== null && status !== 'success' && (
            <div className={`rounded-xl border p-4 text-sm whitespace-pre-wrap leading-relaxed ${
              status === 'error' ? 'bg-red-950/40 border-red-500/40 text-red-300'
              : 'bg-orange-950/30 border-orange-500/30 text-orange-200'
            }`}>
              <div className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-60">
                {status === 'error' ? '✗ Erreur' : '⚠ Réponses incorrectes'}
              </div>
              {output}
            </div>
          )}

          {/* Succès */}
          {status === 'success' && (
            <div className="space-y-3">
              <div className="rounded-xl bg-green-900/30 border border-green-500/40 p-4 text-center">
                <div className="text-2xl mb-1">🏆</div>
                <div className="text-green-400 font-bold">Exercice validé !</div>
                <div className="text-xs text-gray-400 mt-1">{exo.explication}</div>
              </div>
              <button onClick={onSuccess} className="w-full py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold text-sm transition-colors">
                ✓ Continuer
              </button>
            </div>
          )}

          {/* Boutons aide + correction — Python seulement */}
          {!isCpp && status !== 'success' && (
            <div className="flex gap-2">
              {exo.aide && (
                <button onClick={() => setShowSolution(s => !s)}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold border border-yellow-400/40 text-yellow-400 bg-yellow-400/5 hover:bg-yellow-400/10 transition-colors">
                  💡 {showSolution ? "Masquer l'aide" : "Aide"}
                </button>
              )}
              <button onClick={() => { setShowCorrection(s => !s); setShowSolution(false) }}
                className="flex-1 py-2 rounded-xl text-xs font-semibold border border-blue-400/40 text-blue-400 bg-blue-400/5 hover:bg-blue-400/10 transition-colors">
                📋 {showCorrection ? 'Masquer' : 'Correction'}
              </button>
            </div>
          )}

          {/* Panneau Correction — Python seulement */}
          {!isCpp && showCorrection && status !== 'success' && (
            <div className="rounded-xl border border-blue-400/20 bg-blue-400/5 p-4">
              <div className="text-[10px] font-black tracking-widest uppercase text-blue-400 mb-2">Correction complète</div>
              <pre className="text-sm font-mono text-gray-200 whitespace-pre-wrap leading-relaxed bg-gray-900/60 rounded-lg px-3 py-3">{exo.solution}</pre>
              {exo.explication && (
                <div className="mt-3 text-xs text-gray-400 leading-relaxed border-t border-blue-400/10 pt-3">
                  {exo.explication}
                </div>
              )}
            </div>
          )}

          {/* Aide — Python seulement */}
          {!isCpp && exo.aide && showSolution && status !== 'success' && (
            <div className="rounded-xl border border-yellow-400/20 bg-yellow-400/5 p-4 space-y-3">
              {exo.aide.formule && (
                <div>
                  <div className="text-[10px] font-black tracking-widest uppercase text-yellow-400 mb-1">Formule</div>
                  <div className="font-mono text-sm text-gray-100 bg-gray-800/60 rounded-lg px-3 py-2 whitespace-pre-line">{exo.aide.formule}</div>
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
                  <div className="text-sm text-gray-300">{exo.aide.piege}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function RedactionModal({ exo, onClose, onSuccess }) {
  const [reponse, setReponse] = useState('')
  const [showCorrection, setShowCorrection] = useState(false)
  const [showAide, setShowAide] = useState(false)
  const [validated, setValidated] = useState(false)

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300">✏️ Rédaction</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: MAT_COLOR[exo.mat] + '22', color: MAT_COLOR[exo.mat] }}>{exo.mat}</span>
              <span className="text-xs font-medium" style={{ color: DIFF_COLOR[exo.difficulte] }}>{exo.difficulte}</span>
              {exo.freq === 'chaque-annee' && <span className="text-xs text-orange-500">⭐ Chaque année</span>}
            </div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">{exo.titre}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none shrink-0">×</button>
        </div>

        <div className="p-6 space-y-4">
          {/* Énoncé */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-sm text-gray-800 dark:text-gray-200 leading-relaxed border-l-4" style={{ borderLeftColor: MAT_COLOR[exo.mat] }}>
            {exo.enonce}
          </div>

          {/* Zone de réponse */}
          {!validated && (
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">✏️ Ta réponse</div>
              <textarea
                value={reponse}
                onChange={e => setReponse(e.target.value)}
                placeholder="Écris ta réponse détaillée ici (calculs, formules, explications...)"
                rows={6}
                className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 leading-relaxed"
              />
            </div>
          )}

          {/* Boutons principaux */}
          {!validated ? (
            <div className="flex gap-2">
              <button onClick={() => { setShowCorrection(true); setValidated(true) }}
                disabled={!reponse.trim()}
                className={`flex-1 py-3 rounded-xl font-bold text-sm transition-colors ${reponse.trim() ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'}`}>
                ✓ Voir la correction
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Réponse de l'élève */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700">
                <div className="text-xs font-bold text-gray-400 mb-1">Ta réponse :</div>
                <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{reponse}</div>
              </div>

              {/* Auto-évaluation */}
              <div className="text-xs text-center text-gray-500 dark:text-gray-400">Compare ta réponse avec la correction — tu t'en souviens ?</div>
              <div className="flex gap-2">
                <button onClick={() => { onSuccess(false); onClose() }}
                  className="flex-1 py-3 rounded-xl font-semibold text-sm bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-100 transition-colors border border-red-200 dark:border-red-800">
                  ✗ Pas compris
                </button>
                <button onClick={() => { onSuccess(true); onClose() }}
                  className="flex-1 py-3 rounded-xl font-semibold text-sm bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-100 transition-colors border border-green-200 dark:border-green-800">
                  ✓ J'avais bon !
                </button>
              </div>
            </div>
          )}

          {/* Correction */}
          {showCorrection && (
            <div className="rounded-xl border border-purple-400/30 bg-purple-50 dark:bg-purple-900/10 p-4">
              <div className="text-[10px] font-black tracking-widest uppercase text-purple-500 dark:text-purple-400 mb-2">📋 Correction</div>
              <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed font-sans">{exo.correction}</pre>
            </div>
          )}

          {/* Aide */}
          {exo.aide && !validated && (
            <div>
              <button onClick={() => setShowAide(s => !s)}
                className="w-full py-2 rounded-xl text-xs font-semibold border border-yellow-400/40 text-yellow-400 bg-yellow-400/5 hover:bg-yellow-400/10 transition-colors">
                💡 {showAide ? "Masquer l'aide" : "Afficher l'aide"}
              </button>
              {showAide && (
                <div className="mt-2 rounded-xl border border-yellow-400/20 bg-yellow-400/5 p-4 space-y-3">
                  {exo.aide.formule && (
                    <div>
                      <div className="text-[10px] font-black tracking-widest uppercase text-yellow-400 mb-1">Formule</div>
                      <div className="font-mono text-sm text-gray-800 dark:text-gray-100 bg-gray-100 dark:bg-gray-800/60 rounded-lg px-3 py-2 whitespace-pre-line">{exo.aide.formule}</div>
                    </div>
                  )}
                  {exo.aide.methode && (
                    <div>
                      <div className="text-[10px] font-black tracking-widest uppercase text-blue-400 mb-1">Méthode</div>
                      <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">{exo.aide.methode}</div>
                    </div>
                  )}
                  {exo.aide.piege && (
                    <div className="border-l-4 border-red-500 pl-3 bg-red-50 dark:bg-red-950/30 rounded-r-lg py-2 pr-3">
                      <div className="text-[10px] font-black tracking-widest uppercase text-red-400 mb-1">Piège à éviter</div>
                      <div className="text-sm text-gray-700 dark:text-gray-300">{exo.aide.piege}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Exercices({ userDB, dbData }) {
  const { db, markExo, markVariableExo, addNote } = userDB
  const [matFilter, setMatFilter] = useState('Tout')
  const [freqFilter, setFreqFilter] = useState('tout')
  const [diffFilter, setDiffFilter] = useState('tout')
  const [selected, setSelected] = useState(null)

  // Exercices du jour : liés aux tâches du planning d'aujourd'hui
  const todayExos = useMemo(() => {
    const tasks = dbData.planning.filter(p => p.date === TODAY && !p.tache.startsWith('🏥') && p.mat !== 'EXAM')
    if (tasks.length === 0) return []
    const allExos = getAllExercices(dbData, 'Tout', 'tout')
    const results = []
    tasks.forEach(task => {
      const keywords = extractKeywords(task.tache)
      const matExos = allExos.filter(e => e.mat === task.mat)
      const scored = matExos
        .map(e => ({ exo: e, score: matchScore(keywords, e.titre + ' ' + (e.enonce || '')) }))
        .filter(x => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(x => x.exo)
      scored.forEach(e => { if (!results.find(r => r.id === e.id)) results.push(e) })
    })
    return results
  }, [dbData])
  // shuffled version of the selected exo (options mélangées)
  const [shuffled, setShuffled] = useState(null)
  const [choix, setChoix] = useState(null)
  const [confirmed, setConfirmed] = useState(false)
  const [showAide, setShowAide] = useState(false)

  // Exercices fixes + variables instanciés (nouvelles valeurs à chaque ouverture)
  const allExos = getAllExercices(dbData, matFilter, freqFilter)

  const filtered = allExos.filter(e => {
    if (diffFilter !== 'tout' && e.difficulte !== diffFilter) return false
    return true
  })

  const openExo = (exo, keepAide = false) => {
    if (exo.type === 'code' || exo.type === 'redaction') {
      setSelected(exo)
      setShuffled(null)
      setChoix(null)
      setConfirmed(false)
      setShowAide(false)
      return
    }
    const base = exo._isVariable ? instantiateVariable(dbData.exercices_variables?.find(e => String(e.id) === String(exo.id).split('_')[0]) || exo) : exo
    const instance = shuffleExo(base)
    setSelected(base)
    setShuffled(instance)
    setChoix(null)
    setConfirmed(false)
    if (!keepAide) setShowAide(false)
  }

  const confirm = () => {
    if (choix === null || !shuffled) return
    const correct = choix === shuffled.correct
    // Tracker les exercices variables par id de base (ex: "27")
    const baseId = String(selected.id).split('_')[0]
    if (selected._isVariable) {
      markVariableExo(baseId, correct)
    } else {
      markExo(selected.id, correct)
    }
    addNote(selected.mat, correct ? 20 : 0, 'exercice', selected.titre)
    setConfirmed(true)
  }

  // Keyboard shortcuts: 1-4 to select option, Enter to validate
  useEffect(() => {
    if (!shuffled || confirmed) return
    const handler = (e) => {
      if (e.key >= '1' && e.key <= '4') {
        const i = parseInt(e.key) - 1
        if (i < shuffled.options.length) setChoix(i)
      }
      if (e.key === 'Enter' && choix !== null) confirm()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [shuffled, choix, confirmed])

  // Stats rapides
  const totalFait = Object.keys(db.exoDone).length
  const totalReussi = Object.values(db.exoDone).filter(e => e.correct).length

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Exercices</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {filtered.length} exercice{filtered.length !== 1 ? 's' : ''}
            {totalFait > 0 && <span className="ml-2">· {totalReussi}/{totalFait} réussis</span>}
          </p>
        </div>
      </div>

      {/* ── Exercices du jour ── */}
      {todayExos.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base font-bold text-gray-900 dark:text-white">⚡ Exercices du jour</span>
            <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {todayExos.map(exo => {
              const done = db.exoDone[exo.id]
              return (
                <button key={exo.id} onClick={() => openExo(exo)}
                  className="relative rounded-xl border-2 p-4 text-left hover:shadow-lg transition-all group overflow-hidden"
                  style={{ borderColor: MAT_COLOR[exo.mat] + '60', backgroundColor: MAT_COLOR[exo.mat] + '08' }}>
                  <div className="absolute top-0 left-0 right-0 h-0.5" style={{ backgroundColor: MAT_COLOR[exo.mat] }} />
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold" style={{ color: MAT_COLOR[exo.mat] }}>{exo.mat}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium px-1.5 py-0.5 rounded-full"
                        style={{ backgroundColor: (DIFF_COLOR[exo.difficulte] || '#888') + '22', color: DIFF_COLOR[exo.difficulte] || '#888' }}>
                        {exo.difficulte}
                      </span>
                      {done ? (
                        <span className={`text-xs font-bold ${done.correct ? 'text-green-500' : 'text-red-400'}`}>
                          {done.correct ? '✓' : '✗'}
                        </span>
                      ) : (
                        <span className="text-[10px] text-orange-400 font-semibold bg-orange-100 dark:bg-orange-900/30 px-1.5 py-0.5 rounded-full">À faire</span>
                      )}
                    </div>
                  </div>
                  <h3 className="font-semibold text-sm text-gray-900 dark:text-white group-hover:text-blue-500 dark:group-hover:text-blue-400 leading-snug mb-1">
                    {exo.titre}
                  </h3>
                  <p className="text-xs text-gray-400 line-clamp-1">{exo.enonce || exo.template}</p>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="flex flex-wrap gap-3 mb-6">
        {/* Matière */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 flex-wrap">
          {MATIERES.map(m => (
            <button key={m} onClick={() => setMatFilter(m)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                matFilter === m ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-400'
              }`}>
              {m}
            </button>
          ))}
        </div>

        {/* Fréquence */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {FREQUENCES.map(f => (
            <button key={f.value} onClick={() => setFreqFilter(f.value)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                freqFilter === f.value ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-400'
              }`}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Difficulté */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {[{v:'tout',l:'Tous'},{v:'facile',l:'Facile'},{v:'moyen',l:'Moyen'},{v:'difficile',l:'Difficile'}].map(d => (
            <button key={d.v} onClick={() => setDiffFilter(d.v)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                diffFilter === d.v ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-400'
              }`}>
              {d.l}
            </button>
          ))}
        </div>
      </div>

      {/* Grille */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(exo => {
          const done = db.exoDone[exo.id]
          return (
            <button key={exo.id} onClick={() => openExo(exo)}
              className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 text-left hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all group relative overflow-hidden">
              {/* Bande colorée matière */}
              <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl" style={{ backgroundColor: MAT_COLOR[exo.mat] }} />
              <div className="pl-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: MAT_COLOR[exo.mat] + '22', color: MAT_COLOR[exo.mat] }}>
                    {exo.mat}
                  </span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: (DIFF_COLOR[exo.difficulte] || '#888') + '22', color: DIFF_COLOR[exo.difficulte] || '#888' }}>
                    {exo.difficulte}
                  </span>
                </div>
                <h3 className="font-semibold text-sm text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 mb-2 leading-snug">
                  {exo.type === 'code' && exo.langue === 'cpp' && <span className="mr-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300">⚡ C++</span>}
                  {exo.type === 'code' && exo.langue !== 'cpp' && <span className="mr-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400">🐍 Python</span>}
                  {exo.type === 'redaction' && <span className="mr-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300">✏️ Rédaction</span>}
                  {exo.titre}
                </h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 line-clamp-2 leading-relaxed">{exo.enonce || exo.template}</p>
                <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                  {exo.freq === 'chaque-annee' && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-500">⭐ Chaque année</span>
                  )}
                  {exo._isVariable && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300">∞ variable</span>
                  )}
                </div>
                <div className="mt-2 flex items-center justify-between">
                  {done ? (
                    <span className={`text-xs font-medium ${done.correct ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                      {done.correct ? '✓ Réussi' : '✗ Raté'} · {done.attempts} tentative{done.attempts !== 1 ? 's' : ''}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">Non fait</span>
                  )}
                  <span className="text-xs text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    Ouvrir →
                  </span>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-400">Aucun exercice avec ces filtres.</div>
      )}

      {/* Modal exercice CODE */}
      {selected && selected.type === 'code' && (
        <CodeModal exo={selected} onClose={() => setSelected(null)} onSuccess={() => { markExo(selected.id, true); setSelected(null) }} />
      )}

      {/* Modal exercice REDACTION */}
      {selected && selected.type === 'redaction' && (
        <RedactionModal exo={selected} onClose={() => setSelected(null)}
          onSuccess={(correct) => { markExo(selected.id, correct); addNote(selected.mat, correct ? 20 : 0, 'exercice', selected.titre) }} />
      )}

      {/* Modal exercice QCM */}
      {selected && selected.type !== 'code' && selected.type !== 'redaction' && shuffled && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setSelected(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-xl w-full"
            onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: MAT_COLOR[selected.mat] + '22', color: MAT_COLOR[selected.mat] }}>
                    {selected.mat}
                  </span>
                  <span className="text-xs font-medium" style={{ color: DIFF_COLOR[selected.difficulte] }}>
                    {selected.difficulte}
                  </span>
                  {selected.freq === 'chaque-annee' && (
                    <span className="text-xs text-orange-500 font-medium">⭐ Chaque année</span>
                  )}
                </div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white">{selected.titre}</h2>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none shrink-0">×</button>
            </div>

            <div className="p-6">
              {/* Énoncé */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-sm text-gray-800 dark:text-gray-200 mb-5 leading-relaxed border-l-4" style={{ borderLeftColor: MAT_COLOR[selected.mat] }}>
                {selected.enonce}
              </div>

              {/* Options mélangées */}
              <div className="space-y-2 mb-5">
                {shuffled.options.map((opt, i) => {
                  let cls = 'border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200'
                  let icon = null
                  if (confirmed) {
                    if (i === shuffled.correct) {
                      cls = 'border-2 border-green-500 bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                      icon = '✓'
                    } else if (i === choix && i !== shuffled.correct) {
                      cls = 'border-2 border-red-400 bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                      icon = '✗'
                    } else {
                      cls = 'border border-gray-100 dark:border-gray-800 text-gray-400 dark:text-gray-600'
                    }
                  } else if (choix === i) {
                    cls = 'border-2 border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
                  }
                  return (
                    <button key={i} disabled={confirmed} onClick={() => setChoix(i)}
                      className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all ${cls} ${!confirmed ? 'hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-[0.99]' : ''}`}>
                      <span className="font-mono font-bold mr-3 text-gray-400 w-4 inline-block">{i + 1}.</span>
                      <span>{opt}</span>
                      {icon && <span className="float-right font-bold">{icon}</span>}
                    </button>
                  )
                })}
              </div>

              {/* Explication après validation */}
              {confirmed && (
                <div className={`rounded-xl p-4 text-sm mb-5 leading-relaxed ${
                  choix === shuffled.correct
                    ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
                    : 'bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-200'
                }`}>
                  <div className="font-semibold mb-1.5">
                    {choix === shuffled.correct ? '✓ Bonne réponse !' : `✗ Mauvaise réponse — La bonne était : ${shuffled.options[shuffled.correct]}`}
                  </div>
                  <div>{selected.explication}</div>
                </div>
              )}

              {/* Boutons */}
              <div className="flex gap-3">
                {!confirmed ? (
                  <button onClick={confirm} disabled={choix === null}
                    className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-colors ${
                      choix !== null
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                    }`}>
                    Valider <span className="text-xs font-normal opacity-70">[Entrée]</span>
                  </button>
                ) : (
                  <>
                    <button onClick={() => {
                        const sameMat = filtered.filter(e => e.mat === selected.mat && e.id !== selected.id)
                        const pool = sameMat.length > 0 ? sameMat : filtered.filter(e => e.id !== selected.id)
                        openExo(pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : selected, true)
                      }}
                      className="flex-1 py-3 rounded-xl font-semibold text-sm bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition-colors">
                      ↺ Réessayer
                    </button>
                    <button onClick={() => setSelected(null)}
                      className="flex-1 py-3 rounded-xl font-semibold text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                      Fermer
                    </button>
                  </>
                )}
              </div>

              {/* Raccourcis */}
              {!confirmed && (
                <p className="text-center text-xs text-gray-400 mt-3">
                  Raccourcis : <kbd className="bg-gray-100 dark:bg-gray-800 px-1 rounded">1</kbd>–<kbd className="bg-gray-100 dark:bg-gray-800 px-1 rounded">4</kbd> pour choisir · <kbd className="bg-gray-100 dark:bg-gray-800 px-1 rounded">Entrée</kbd> pour valider
                </p>
              )}

              {/* Bouton Aide */}
              {selected.aide && !confirmed && (
                <div className="mt-4">
                  <button onClick={() => setShowAide(a => !a)}
                    className="w-full py-2 rounded-xl text-xs font-semibold border transition-colors flex items-center justify-center gap-2
                      border-yellow-400/40 text-yellow-400 bg-yellow-400/5 hover:bg-yellow-400/10">
                    💡 {showAide ? 'Masquer l\'aide' : 'Afficher l\'aide'}
                  </button>

                  {showAide && (
                    <div className="mt-3 rounded-xl border border-yellow-400/20 bg-yellow-400/5 p-4 space-y-3">
                      {selected.aide.formule && (
                        <div>
                          <div className="text-[10px] font-black tracking-widest uppercase text-yellow-400 mb-1">Formule</div>
                          <div className="font-mono text-sm font-semibold text-gray-100 bg-gray-800/60 rounded-lg px-3 py-2 whitespace-pre-line">
                            {selected.aide.formule}
                          </div>
                        </div>
                      )}
                      {selected.aide.methode && (
                        <div>
                          <div className="text-[10px] font-black tracking-widest uppercase text-blue-400 mb-1">Méthode</div>
                          <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
                            {selected.aide.methode}
                          </div>
                        </div>
                      )}
                      {selected.aide.piege && (
                        <div className="border-l-4 border-red-500 pl-3 bg-red-950/30 rounded-r-lg py-2 pr-3">
                          <div className="text-[10px] font-black tracking-widest uppercase text-red-400 mb-1">Piège à éviter</div>
                          <div className="text-sm text-gray-300 leading-relaxed">{selected.aide.piege}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
