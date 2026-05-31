import katex from 'katex'
import 'katex/dist/katex.min.css'

// Remplace les symboles Unicode en LaTeX minimal, sans toucher à la structure
function toLatex(str) {
  return str
    // Intégrale avec bornes [a→b] ou [a->b]
    .replace(/∫\s*\[([^\]]+)[→>]([^\]]+)\]/g, '\\int_{$1}^{$2}')
    // Intégrale simple
    .replace(/∫/g, '\\int')
    // Somme, racine
    .replace(/∑/g, '\\sum')
    .replace(/√\(([^)]+)\)/g, '\\sqrt{$1}')
    .replace(/√([A-Za-z0-9])/g, '\\sqrt{$1}')
    // Exposants avec parenthèses : e^(-at) → e^{-at}  AVANT la conversion des ()
    .replace(/\^(\([^)]+\))/g, (_, inner) => `^{${inner.slice(1, -1)}}`)
    // Exposants déjà en notation ^2 ou ^{n}
    .replace(/\^{([^}]+)}/g, '^{$1}')
    .replace(/\^(-?\d+)/g, '^{$1}')
    .replace(/\^([A-Za-z])/g, '^{$1}')
    // Indices
    .replace(/_{([^}]+)}/g, '_{$1}')
    .replace(/_([A-Za-z0-9]{1,3})/g, '_{$1}')
    // Fractions simples a/b (tokens courts, pas de slash déjà dans \frac)
    .replace(/(?<!\\frac{[^}]*)(?<!\\[a-z]+)\b(\d+)\s*\/\s*(\d+)\b/g, '\\frac{$1}{$2}')
    // Symboles grecs — espace après pour éviter \Deltam, \lambdat, etc.
    .replace(/η/g, '\\eta{}').replace(/φ/g, '\\varphi{}').replace(/π/g, '\\pi{}')
    .replace(/λ/g, '\\lambda{}').replace(/ω/g, '\\omega{}').replace(/μ/g, '\\mu{}')
    .replace(/Δ/g, '\\Delta{}').replace(/δ/g, '\\delta{}').replace(/θ/g, '\\theta{}')
    .replace(/α/g, '\\alpha{}').replace(/β/g, '\\beta{}').replace(/γ/g, '\\gamma{}')
    .replace(/σ/g, '\\sigma{}').replace(/ρ/g, '\\rho{}').replace(/τ/g, '\\tau{}')
    // Opérateurs — espace après pour éviter \timeslog
    .replace(/×/g, '\\times{}').replace(/·/g, '\\cdot{}')
    .replace(/÷/g, '\\div{}').replace(/±/g, '\\pm{}')
    .replace(/≤/g, '\\leq{}').replace(/≥/g, '\\geq{}')
    .replace(/≠/g, '\\neq{}').replace(/≈/g, '\\approx{}')
    .replace(/∞/g, '\\infty{}')
    // Flèches
    .replace(/→/g, '\\to{}').replace(/←/g, '\\leftarrow{}')
    // Valeur absolue |x|
    .replace(/\|([^|\n]{1,30})\|/g, '|$1|')
}

function tryKatex(expr, display) {
  try {
    return katex.renderToString(toLatex(expr), {
      displayMode: display,
      throwOnError: true,
      strict: false,
      trust: false,
    })
  } catch {
    // Fallback : essai sans transformations complexes
    try {
      return katex.renderToString(expr
        .replace(/η/g, '\\eta{}').replace(/φ/g, '\\varphi{}').replace(/π/g, '\\pi{}')
        .replace(/λ/g, '\\lambda{}').replace(/ω/g, '\\omega{}').replace(/μ/g, '\\mu{}')
        .replace(/Δ/g, '\\Delta{}').replace(/×/g, '\\times{}').replace(/≤/g, '\\leq{}')
        .replace(/≥/g, '\\geq{}').replace(/≠/g, '\\neq{}').replace(/≈/g, '\\approx{}')
        .replace(/→/g, '\\to{}').replace(/∫/g, '\\int').replace(/∞/g, '\\infty{}')
        .replace(/\^(-?\d+)/g, '^{$1}')
        , { displayMode: display, throwOnError: false, strict: false }
      )
    } catch {
      return null
    }
  }
}

// Rendu texte avec symboles Unicode simples (pas KaTeX)
function renderSymbols(text) {
  return text
    .replace(/\^{([^}]+)}/g, (_, e) => toSup(e))
    .replace(/\^(-?\d+)/g, (_, e) => toSup(e))
    .replace(/\^([A-Za-z])/g, (_, e) => toSup(e))
    .replace(/_([A-Za-z0-9]{1,3})/g, (_, e) => toSub(e))
}

const SUP = {'0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','-':'⁻','+':'⁺','n':'ⁿ','a':'ᵃ','x':'ˣ','t':'ᵗ','i':'ⁱ'}
const SUB = {'0':'₀','1':'₁','2':'₂','3':'₃','4':'₄','5':'₅','6':'₆','7':'₇','8':'₈','9':'₉','n':'ₙ','a':'ₐ','e':'ₑ','i':'ᵢ','r':'ᵣ'}
function toSup(s) { return [...s].map(c => SUP[c] || c).join('') }
function toSub(s) { return [...s].map(c => SUB[c] || c).join('') }

function isSeparator(line) {
  return /^[─━═\-]{4,}$/.test(line.trim())
}

function isSectionTitle(line) {
  const t = line.trim()
  if (t.length < 3 || t.length > 50) return false
  return t === t.toUpperCase()
    && /^[A-ZÀÂÄÉÈÊËÎÏÔÙÛÜÆŒÇ0-9 '()\-\/]+$/.test(t)
    && !/[=∫]/.test(t)
}

function isBullet(line) {
  return /^[•·\-–—*]\s/.test(line.trim())
}

function isExempleBlock(line) {
  return /^(EXEMPLE|PIÈGE|ATTENTION|REMARQUE|IMPORTANT|NOTE)\b/i.test(line.trim())
}

// Une ligne est une formule si elle contient = et des symboles math
function isFormula(line) {
  return line.includes('=')
    && /[\/\^_∫√×÷≤≥≠≈±∞→←ηφπλωμΔδθαβγσρ]/.test(line)
}

function FormulaLine({ expr, display, matColor, label }) {
  const html = tryKatex(expr, display)
  if (html) {
    if (label) {
      return (
        <div className="flex items-center gap-4 py-1.5 px-4 my-1 rounded-xl"
          style={{ backgroundColor: matColor + '12', borderLeft: `3px solid ${matColor}50` }}>
          <span className="text-xs text-gray-400 shrink-0 w-32 text-right italic">{label}</span>
          <span dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      )
    }
    return (
      <div className="py-2 px-4 my-1 rounded-xl overflow-x-auto"
        style={{ backgroundColor: matColor + '12', borderLeft: `3px solid ${matColor}50` }}>
        <span dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    )
  }
  // Fallback texte
  return (
    <div className="py-1.5 px-4 my-1 rounded-xl font-mono text-sm text-gray-200"
      style={{ backgroundColor: matColor + '12', borderLeft: `3px solid ${matColor}50` }}>
      {label && <span className="text-xs text-gray-400 mr-3 italic">{label} :</span>}
      <span dangerouslySetInnerHTML={{ __html: renderSymbols(expr) }} />
    </div>
  )
}

export function renderFicheContent(contenu, matColor) {
  const lines = contenu.split('\n')
  const elements = []
  let i = 0

  while (i < lines.length) {
    const raw = lines[i]
    const trimmed = raw.trim()

    if (!trimmed) {
      elements.push(<div key={i} className="h-2" />)
      i++
      continue
    }

    if (isSeparator(trimmed)) { i++; continue }

    // ── Titre de section ──
    if (isSectionTitle(trimmed)) {
      elements.push(
        <div key={i} className="mt-5 mb-2 first:mt-0">
          <span className="text-[10px] font-black tracking-[0.18em] uppercase"
            style={{ color: matColor }}>{trimmed}</span>
          <div className="h-px mt-1.5 rounded-full opacity-20" style={{ backgroundColor: matColor }} />
        </div>
      )
      i++
      if (lines[i] && isSeparator(lines[i].trim())) i++
      continue
    }

    // ── Bloc EXEMPLE / PIÈGE ──
    if (isExempleBlock(trimmed)) {
      const blockLines = []
      let j = i
      while (j < lines.length && lines[j].trim() && !isSectionTitle(lines[j].trim()) && !isSeparator(lines[j].trim())) {
        blockLines.push(lines[j].trim())
        j++
      }
      const isWarning = /PIÈGE|ATTENTION/i.test(trimmed)
      elements.push(
        <div key={i} className={`my-3 rounded-xl border-l-4 px-4 py-3 ${
          isWarning ? 'bg-red-950/30 border-red-500' : 'bg-indigo-950/30 border-indigo-400'
        }`}>
          {blockLines.map((line, li) => {
            if (li === 0) return (
              <div key={li} className={`text-[10px] font-black tracking-widest uppercase mb-2 ${
                isWarning ? 'text-red-400' : 'text-indigo-400'
              }`}>{line}</div>
            )
            if (isFormula(line)) return <FormulaLine key={li} expr={line} display={false} matColor={matColor} />
            return <p key={li} className="text-sm text-gray-300 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: renderSymbols(line) }} />
          })}
        </div>
      )
      i = j
      continue
    }

    // ── Ligne puce ──
    if (isBullet(trimmed)) {
      const text = trimmed.replace(/^[•·\-–—*]\s/, '')
      elements.push(
        <div key={i} className="flex items-start gap-2.5 py-0.5 pl-1">
          <span className="mt-[7px] w-1.5 h-1.5 rounded-full shrink-0 opacity-60"
            style={{ backgroundColor: matColor }} />
          <span className="text-sm text-gray-300 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: renderSymbols(text) }} />
        </div>
      )
      i++
      continue
    }

    // ── Formule avec label "Nom : formule" ──
    if (isFormula(trimmed)) {
      const colonIdx = trimmed.indexOf(':')
      const hasLabel = colonIdx > 0
        && colonIdx < 28
        && !/[=→∫]/.test(trimmed.slice(0, colonIdx))
        && trimmed.slice(0, colonIdx).trim().split(/\s+/).length <= 5

      if (hasLabel) {
        const label = trimmed.slice(0, colonIdx).trim()
        const formula = trimmed.slice(colonIdx + 1).trim()
        elements.push(<FormulaLine key={i} expr={formula} display={false} matColor={matColor} label={label} />)
      } else {
        elements.push(<FormulaLine key={i} expr={trimmed} display={false} matColor={matColor} />)
      }
      i++
      continue
    }

    // ── Texte normal ──
    elements.push(
      <p key={i} className="text-sm text-gray-300 leading-relaxed py-0.5"
        dangerouslySetInnerHTML={{ __html: renderSymbols(trimmed) }} />
    )
    i++
  }

  return elements
}
