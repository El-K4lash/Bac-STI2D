/**
 * Exercices à valeurs numériques variables.
 * À chaque appel, on tire une variante aléatoire et on génère
 * 4 options dont la bonne et 3 mauvaises plausibles.
 */

function vary(correct, pct = 0.15) {
  // Génère une valeur fausse proche (±pct) mais différente
  const delta = correct * pct
  const faux = correct + (Math.random() > 0.5 ? delta : -delta) * (0.5 + Math.random())
  return parseFloat(faux.toPrecision(3))
}

function formatVal(v) {
  if (typeof v !== 'number') return String(v)
  if (Math.abs(v) >= 1000) return v.toLocaleString('fr-FR')
  if (Number.isInteger(v)) return String(v)
  return v.toLocaleString('fr-FR', { maximumSignificantDigits: 3 })
}

/**
 * Instancie un exercice variable : choisit une variante aléatoire,
 * remplace les {variables} dans le template, génère 4 options mélangées.
 * Retourne un objet compatible avec le format exercice QCM standard.
 */
export function instantiateVariable(exo) {
  const variants = exo.variables
  const variant = variants[Math.floor(Math.random() * variants.length)]

  // Remplacer les placeholders dans le template
  let enonce = exo.template
  Object.entries(variant).forEach(([k, v]) => {
    if (k !== 'correct' && k !== 'explication' && k !== 'faux1' && k !== 'faux2' && k !== 'faux3') {
      enonce = enonce.replace(new RegExp(`\\{${k}\\}`, 'g'), formatVal(v))
    }
  })

  const correctStr = String(variant.correct)

  // Générer 3 mauvaises réponses plausibles
  let wrongs = []
  if (variant.faux1 && variant.faux2 && variant.faux3) {
    wrongs = [String(variant.faux1), String(variant.faux2), String(variant.faux3)]
  } else {
    // Auto-génération : extraire la valeur numérique de la réponse correcte
    const num = parseFloat(correctStr.replace(',', '.').replace('%', '').replace(/[^\d.]/g, ''))
    if (!isNaN(num)) {
      const factors = [0.8, 1.25, 0.5, 1.5, 0.667, 2]
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
      wrongs = factors.map(f => {
        const v = num * f
        const formatted = parseFloat(v.toPrecision(3))
        // Garder la même unité/format que la bonne réponse
        return correctStr.replace(/[\d.,]+/, formatVal(formatted))
      })
    } else {
      wrongs = ['Impossible à calculer', 'Non défini', 'Données insuffisantes']
    }
  }

  // Mélanger les 4 options
  const allOptions = [correctStr, ...wrongs.slice(0, 3)]
  const shuffled = allOptions
    .map((v, i) => ({ v, sort: Math.random(), isCorrect: i === 0 }))
    .sort((a, b) => a.sort - b.sort)

  return {
    ...exo,
    id: `${exo.id}_v${variants.indexOf(variant)}`,
    enonce,
    options: shuffled.map(x => x.v),
    correct: shuffled.findIndex(x => x.isCorrect),
    explication: variant.explication,
    _variant: variant,
    _isVariable: true,
  }
}

/**
 * Mélange exercices fixes + variables instanciés.
 */
export function getAllExercices(dbData, matFilter = 'Tout', freqFilter = 'tout') {
  const fixed = dbData.exercices.filter(e => {
    if (matFilter !== 'Tout' && e.mat !== matFilter) return false
    if (freqFilter !== 'tout' && e.freq !== freqFilter) return false
    return true
  })

  const variable = (dbData.exercices_variables || [])
    .filter(e => {
      if (matFilter !== 'Tout' && e.mat !== matFilter) return false
      if (freqFilter !== 'tout' && e.freq !== freqFilter) return false
      return true
    })
    .map(instantiateVariable)

  return [...fixed, ...variable]
}
