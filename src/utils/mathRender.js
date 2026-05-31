/**
 * Convertit du texte avec notation ASCII en vrais symboles mathématiques Unicode.
 * Utilisé partout dans l'app : fiches, flashcards, exercices, simulation.
 */
export function renderMath(text) {
  if (!text) return ''
  return text
    // Fractions x/y → x⁄y (visuel) — traité par CSS
    // Exposants ^ → exposants Unicode
    .replace(/\^(\{([^}]+)\}|(-?\d+))/g, (_, __, inner, simple) => {
      const src = inner || simple
      return toSup(src)
    })
    // Indices _ → indices Unicode
    .replace(/_(\{([^}]+)\}|(\d+))/g, (_, __, inner, simple) => {
      const src = inner || simple
      return toSub(src)
    })
    // Symboles grecs
    .replace(/\\alpha/g, 'α').replace(/\\beta/g, 'β').replace(/\\gamma/g, 'γ')
    .replace(/\\delta/g, 'δ').replace(/\\Delta/g, 'Δ').replace(/\\epsilon/g, 'ε')
    .replace(/\\eta/g, 'η').replace(/\\lambda/g, 'λ').replace(/\\mu/g, 'μ')
    .replace(/\\nu/g, 'ν').replace(/\\omega/g, 'ω').replace(/\\Omega/g, 'Ω')
    .replace(/\\phi/g, 'φ').replace(/\\pi/g, 'π').replace(/\\rho/g, 'ρ')
    .replace(/\\sigma/g, 'σ').replace(/\\tau/g, 'τ').replace(/\\theta/g, 'θ')
    // Opérateurs
    .replace(/\\times/g, '×').replace(/\*/g, '×').replace(/\\cdot/g, '·')
    .replace(/\\div/g, '÷').replace(/\\pm/g, '±').replace(/\\neq/g, '≠')
    .replace(/\\leq/g, '≤').replace(/\\geq/g, '≥').replace(/\\approx/g, '≈')
    .replace(/\\infty/g, '∞').replace(/\\sum/g, '∑').replace(/\\int/g, '∫')
    .replace(/\\sqrt\{([^}]+)\}/g, (_, inner) => `√(${inner})`)
    .replace(/\\sqrt/g, '√')
    // Flèches
    .replace(/\\rightarrow/g, '→').replace(/\\leftarrow/g, '←')
    .replace(/\\leftrightarrow/g, '↔').replace(/->/g, '→')
    // Notations communes bac STI2D
    .replace(/U_eff/g, 'Uₑff').replace(/U_max/g, 'Uₘₐₓ')
    .replace(/I_eff/g, 'Iₑff').replace(/I_max/g, 'Iₘₐₓ')
    .replace(/cos phi/gi, 'cos φ').replace(/cos\(phi\)/gi, 'cos(φ)')
    .replace(/\bphi\b/g, 'φ').replace(/\beta\b/g, 'β')
    .replace(/\beta\b/g, 'η').replace(/\blambda\b/g, 'λ')
    .replace(/\bDelta\b/g, 'Δ').replace(/\bdelta\b/g, 'δ')
    .replace(/\bomega\b/g, 'ω').replace(/\btheta\b/g, 'θ')
    // Unités communes
    .replace(/m\/s\^2/g, 'm/s²').replace(/m\/s2/g, 'm/s²')
    .replace(/kg\.m\/s/g, 'kg·m/s').replace(/kWh\/kg/g, 'kWh/kg')
    .replace(/J\/\(kg\.K\)/g, 'J/(kg·K)').replace(/W\/\(m\.K\)/g, 'W/(m·K)')
    .replace(/W\.m\^-2\.K\^-1/g, 'W·m⁻²·K⁻¹')
    // Notation puissance de 10
    .replace(/×10\^(-?\d+)/g, (_, exp) => `×10${toSup(exp)}`)
    .replace(/x10\^(-?\d+)/g, (_, exp) => `×10${toSup(exp)}`)
    .replace(/e\+(\d+)/g, (_, n) => `×10${toSup(n)}`)
    .replace(/e-(\d+)/g, (_, n) => `×10${toSup('-' + n)}`)
    // Intégrale notation
    .replace(/∫\[([^\]]+)->([^\]]+)\]/g, '∫[$1→$2]')
    // Fractions simples notation a/b quand entourées d'espaces → garder tel quel (lisible)
}

const SUP_MAP = { '0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','-':'⁻','+':'⁺','n':'ⁿ','a':'ᵃ','x':'ˣ','i':'ⁱ' }
const SUB_MAP = { '0':'₀','1':'₁','2':'₂','3':'₃','4':'₄','5':'₅','6':'₆','7':'₇','8':'₈','9':'₉','-':'₋','+':'₊','n':'ₙ','a':'ₐ','e':'ₑ','i':'ᵢ','r':'ᵣ','u':'ᵤ','v':'ᵥ','x':'ₓ' }

function toSup(str) {
  return [...String(str)].map(c => SUP_MAP[c] || c).join('')
}
function toSub(str) {
  return [...String(str)].map(c => SUB_MAP[c] || c).join('')
}

/**
 * Version React : retourne du JSX avec du texte rendu.
 * Pour les formules sur plusieurs lignes, utilise renderMathLine sur chaque ligne.
 */
export function renderMathBlock(text) {
  if (!text) return ''
  return text.split('\n').map(line => renderMath(line)).join('\n')
}
