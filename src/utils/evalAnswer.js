/**
 * Évaluation intelligente des réponses numériques.
 *
 * Principe : on ne compare pas des strings mot à mot.
 * On extrait la/les valeur(s) numérique(s) de la réponse de l'élève
 * et on vérifie si elles sont dans la tolérance des valeurs attendues.
 */

/**
 * Extrait tous les nombres d'une string.
 * Gère : 1234, 1 234, 1,5 (virgule fr), 1.5, 1,5×10^3, 1.5e3, -3,2
 */
export function extractNumbers(str) {
  if (!str) return []
  const cleaned = str
    .replace(/×10\^?(-?\d+)/g, (_, exp) => `e${exp}`)
    .replace(/×10(-?\d+)/g, (_, exp) => `e${exp}`)
    .replace(/\s/g, '')
    .replace(/,/g, '.')  // virgule → point (fr→en)

  const matches = cleaned.matchAll(/-?\d+\.?\d*(?:e[+-]?\d+)?/g)
  return [...matches].map(m => parseFloat(m[0])).filter(n => !isNaN(n))
}

/**
 * Vérifie si deux valeurs sont égales à une tolérance près.
 * tolerance = 0.05 → ±5%
 * Pour les très petites valeurs (< 0.01), on utilise une tolérance absolue.
 */
function isClose(val, ref, tolerance = 0.05) {
  if (ref === 0) return Math.abs(val) < 0.001
  const relError = Math.abs((val - ref) / ref)
  return relError <= tolerance
}

/**
 * Évalue la réponse de l'élève face à la réponse attendue.
 *
 * @param {string} userInput - Ce que l'élève a tapé
 * @param {object|number|null} expected - reponse_numerique du JSON
 * @param {number} tolerance - ex: 0.05 pour ±5%
 * @returns {{ correct: boolean, score: 'exact'|'approx'|'wrong'|'skip', feedback: string }}
 */
export function evalAnswer(userInput, expected, tolerance = 0.05) {
  if (!userInput || userInput.trim() === '') {
    return { correct: false, score: 'skip', feedback: 'Pas de réponse.' }
  }

  if (expected === null || expected === undefined) {
    // Question qualitative / équation : on accepte toute réponse non vide
    return { correct: true, score: 'approx', feedback: 'Réponse enregistrée (vérification manuelle recommandée).' }
  }

  const userNums = extractNumbers(userInput)
  if (userNums.length === 0) {
    return { correct: false, score: 'wrong', feedback: 'Aucune valeur numérique détectée dans ta réponse.' }
  }

  // Récupérer les valeurs de référence
  let refValues = []
  if (typeof expected === 'number') {
    refValues = [expected]
  } else if (typeof expected === 'object') {
    refValues = Object.values(expected).filter(v => typeof v === 'number')
  }

  if (refValues.length === 0) {
    return { correct: true, score: 'approx', feedback: 'Réponse enregistrée.' }
  }

  // Chercher si au moins une des valeurs de l'élève correspond à au moins une valeur attendue
  let exactMatch = false
  let approxMatch = false
  let bestError = Infinity
  let bestRef = refValues[0]

  for (const ref of refValues) {
    for (const val of userNums) {
      const relError = ref !== 0 ? Math.abs((val - ref) / ref) : Math.abs(val)
      if (relError < bestError) {
        bestError = relError
        bestRef = ref
      }
      if (relError <= tolerance * 0.2) exactMatch = true       // < 1% d'écart → exact
      else if (relError <= tolerance) approxMatch = true        // dans la tolérance
    }
  }

  const pctError = Math.round(bestError * 100)

  if (exactMatch) {
    return {
      correct: true,
      score: 'exact',
      feedback: `✓ Parfait ! Valeur correcte.`
    }
  }
  if (approxMatch) {
    return {
      correct: true,
      score: 'approx',
      feedback: `✓ Correct ! (écart de ${pctError}%, dans la tolérance ±${Math.round(tolerance*100)}%)`
    }
  }

  // Mauvaise réponse : donner un indice sur l'ordre de grandeur
  const refStr = formatRef(bestRef)
  if (bestError < 0.5) {
    return {
      correct: false,
      score: 'wrong',
      feedback: `✗ Presque… Écart de ${pctError}% (réponse attendue : ${refStr}). Vérifie les calculs intermédiaires.`
    }
  }
  if (bestError < 2) {
    return {
      correct: false,
      score: 'wrong',
      feedback: `✗ Pas tout à fait. L'ordre de grandeur est proche mais la valeur est incorrecte (attendu : ${refStr}).`
    }
  }
  return {
    correct: false,
    score: 'wrong',
    feedback: `✗ Incorrect. Réponse attendue : ${refStr}. Relis l'énoncé et les données.`
  }
}

function formatRef(val) {
  if (val === null || val === undefined) return '—'
  if (Math.abs(val) < 0.001 || Math.abs(val) > 1e6) {
    return val.toExponential(3)
  }
  return val.toLocaleString('fr-FR', { maximumSignificantDigits: 4 })
}

/**
 * Score global d'une session : nombre de bonnes réponses / total
 * → note sur 20
 */
export function computeNote(results) {
  if (!results.length) return 0
  const correct = results.filter(r => r.eval?.correct).length
  return Math.round((correct / results.length) * 20 * 10) / 10
}
