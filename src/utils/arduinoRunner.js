// Simule l'exécution d'un sketch Arduino simplifié
// Gère : Serial.begin/print/println, pinMode, digitalWrite, analogRead, delay, if/else, for, variables, fonctions

export function runArduino(code) {
  const output = []
  const errors = []
  const env = {}
  const fns = {}

  // Valeurs simulées pour les broches
  const analogValues = { A0: 512, A1: 256, A2: 768, A3: 100 }
  const digitalValues = {}

  function evalExpr(expr, local = {}) {
    expr = expr.trim()
    const scope = { ...env, ...local }

    // String
    if ((expr.startsWith('"') && expr.endsWith('"')) || (expr.startsWith("'") && expr.endsWith("'")))
      return expr.slice(1, -1)

    // Bool
    if (expr === 'true' || expr === 'HIGH') return 1
    if (expr === 'false' || expr === 'LOW') return 0
    if (expr === 'OUTPUT') return 1
    if (expr === 'INPUT') return 0
    if (expr === 'A0') return 'A0'
    if (expr === 'A1') return 'A1'
    if (expr === 'A2') return 'A2'
    if (expr === 'A3') return 'A3'

    // Appels built-in (insensible à la casse)
    const analogReadM = expr.match(/^analogRead\((.+)\)$/i)
    if (analogReadM) {
      const pin = evalExpr(analogReadM[1], local)
      return analogValues[String(pin).toUpperCase()] ?? analogValues[pin] ?? 512
    }
    const digitalReadM = expr.match(/^digitalRead\((.+)\)$/i)
    if (digitalReadM) return 0
    // Signaler les fautes de frappe courantes
    if (/^DigitalRead\(/.test(expr)) return 0
    if (/^AnalogRead\(/.test(expr)) {
      const m = expr.match(/^AnalogRead\((.+)\)$/)
      return m ? (analogValues[evalExpr(m[1], local)] ?? 512) : 512
    }

    const roundM = expr.match(/^round\((.+)\)$/)
    if (roundM) return Math.round(evalExpr(roundM[1], local))

    const absM = expr.match(/^abs\((.+)\)$/)
    if (absM) return Math.abs(evalExpr(absM[1], local))

    const mapM = expr.match(/^map\((.+),(.+),(.+),(.+),(.+)\)$/)
    if (mapM) {
      const [v, fromL, fromH, toL, toH] = mapM.slice(1).map(x => evalExpr(x.trim(), local))
      return (v - fromL) * (toH - toL) / (fromH - fromL) + toL
    }

    // cast
    const intCast = expr.match(/^\(int\)\s*(.+)$/)
    if (intCast) return Math.trunc(evalExpr(intCast[1], local))
    const floatCast = expr.match(/^\(float\)\s*(.+)$/)
    if (floatCast) return parseFloat(evalExpr(floatCast[1], local))

    // Variable simple
    if (/^\w+$/.test(expr)) {
      if (expr in scope) return scope[expr]
      if (!isNaN(expr)) return Number(expr)
      throw new Error(`Variable inconnue : '${expr}'`)
    }

    // Expression arithmétique
    try {
      let s = expr
      // Remplacer variables
      const varNames = Object.keys(scope).sort((a, b) => b.length - a.length)
      for (const name of varNames) {
        const val = scope[name]
        if (typeof val === 'number') {
          s = s.replace(new RegExp(`\\b${name}\\b`, 'g'), val)
        }
      }
      // Constantes Arduino
      s = s.replace(/\bHIGH\b/g, 1).replace(/\bLOW\b/g, 0)
      // eslint-disable-next-line no-new-func
      return Function(`"use strict"; return (${s})`)()
    } catch {
      throw new Error(`Expression invalide : ${expr}`)
    }
  }

  function stripComment(line) {
    let inStr = false, strChar = ''
    for (let j = 0; j < line.length - 1; j++) {
      const c = line[j]
      if (!inStr && (c === '"' || c === "'")) { inStr = true; strChar = c }
      else if (inStr && c === strChar) inStr = false
      else if (!inStr && c === '/' && line[j+1] === '/') return line.slice(0, j).trim()
    }
    return line.trim()
  }

  function execLines(lines, local = {}) {
    let i = 0
    while (i < lines.length) {
      const raw = lines[i]
      const t = stripComment(raw)
      if (!t || t.startsWith('//')) { i++; continue }

      try {
        // Serial.begin (insensible casse)
        if (/^Serial\.begin\(/i.test(t)) { i++; continue }

        // Serial.println
        const printlnM = t.match(/^Serial\.println\((.*)?\)/i)
        if (printlnM) {
          const arg = (printlnM[1] || '').trim()
          const val = arg ? evalExpr(arg, local) : ''
          output.push(String(val ?? ''))
          i++; continue
        }

        // Serial.print
        const printM = t.match(/^Serial\.print\((.+)\)/i)
        if (printM) {
          const val = evalExpr(printM[1].trim(), local)
          if (output.length === 0) output.push('')
          output[output.length - 1] += String(val ?? '')
          i++; continue
        }

        // pinMode / digitalWrite / delay (insensible casse)
        if (/^pinMode\(/i.test(t) || /^digitalWrite\(/i.test(t)) { i++; continue }
        if (/^delay\(/i.test(t)) { i++; continue }

        // if/else
        if (t.startsWith('if') && t.includes('(')) {
          const condM = t.match(/^if\s*\((.+)\)\s*\{?$/)
          if (condM) {
            const cond = evalExpr(condM[1], local)
            const ifBlock = [], elseBlock = []
            let braceCount = t.endsWith('{') ? 1 : 0
            let inElse = false
            i++
            while (i < lines.length) {
              const bl = lines[i].trim()
              if (bl === '{') { braceCount++; i++; continue }
              if (bl === '}' || bl === '} else {' || bl === '} else{') {
                braceCount--
                if (braceCount === 0) {
                  if (bl.includes('else')) { inElse = true; braceCount = 1 }
                  i++; continue
                }
              }
              if (!inElse) ifBlock.push(lines[i])
              else elseBlock.push(lines[i])
              i++
              if (braceCount <= 0) break
            }
            execLines(cond ? ifBlock : elseBlock, { ...local })
            continue
          }
        }

        // for
        if (t.startsWith('for') && t.includes('(')) {
          const forM = t.match(/^for\s*\((.+);(.+);(.+)\)\s*\{?$/)
          if (forM) {
            const initStr = forM[1].trim()
            const condStr = forM[2].trim()
            const incrStr = forM[3].trim()
            const forBlock = []
            let braceCount = t.endsWith('{') ? 1 : 0
            i++
            while (i < lines.length) {
              const bl = lines[i].trim()
              if (bl === '{') { braceCount++; i++; continue }
              if (bl === '}') { braceCount--; if (braceCount <= 0) { i++; break } }
              forBlock.push(lines[i]); i++
            }
            // Init
            const loopEnv = { ...local }
            const initM = initStr.match(/^(?:int|float|long)?\s*(\w+)\s*=\s*(.+)$/)
            if (initM) loopEnv[initM[1]] = evalExpr(initM[2], loopEnv)
            let iterations = 0
            while (iterations < 200) {
              if (!evalExpr(condStr, loopEnv)) break
              execLines(forBlock, loopEnv)
              // Incrément
              const incrM = incrStr.match(/(\w+)(\+\+|--)/) || incrStr.match(/(\w+)\s*\+=\s*(.+)/)
              if (incrM) {
                if (incrStr.includes('++')) loopEnv[incrM[1]] = (loopEnv[incrM[1]] || 0) + 1
                else if (incrStr.includes('--')) loopEnv[incrM[1]] = (loopEnv[incrM[1]] || 0) - 1
                else loopEnv[incrM[1]] = (loopEnv[incrM[1]] || 0) + evalExpr(incrM[2], loopEnv)
              }
              iterations++
            }
            continue
          }
        }

        // Appel de fonction définie
        const fnCallM = t.match(/^(\w+)\(([^)]*)\)\s*;?$/)
        if (fnCallM && fns[fnCallM[1]]) {
          const fn = fns[fnCallM[1]]
          const args = fnCallM[2] ? fnCallM[2].split(',').map(a => evalExpr(a.trim(), local)) : []
          const fnLocal = { ...local }
          fn.params.forEach((p, idx) => { fnLocal[p] = args[idx] })
          execLines(fn.body, fnLocal)
          i++; continue
        }

        // Affectation : type var = expr ou var = expr ou var += etc
        const assignM = t.match(/^(?:const\s+)?(?:int|float|long|double|bool|char|String|byte|unsigned\s+int|unsigned\s+long)?\s*(\w+)\s*([+\-*\/]?=)\s*(.+?)\s*;?$/)
        if (assignM) {
          const [, varN, op, exprStr] = assignM
          if (!['if', 'for', 'while', 'void', 'return', 'else'].includes(varN)) {
            let val = 0
            try { val = evalExpr(exprStr, local) } catch (e) { errors.push(`${varN}: ${e.message}`) }
            if (op === '=') { env[varN] = val; local[varN] = val }
            else if (op === '+=') { env[varN] = (local[varN] ?? env[varN] ?? 0) + val; local[varN] = env[varN] }
            else if (op === '-=') { env[varN] = (local[varN] ?? env[varN] ?? 0) - val; local[varN] = env[varN] }
            else if (op === '*=') { env[varN] = (local[varN] ?? env[varN] ?? 0) * val; local[varN] = env[varN] }
          }
          i++; continue
        }

        // i++ / i--
        const incrM = t.match(/^(\w+)(\+\+|--)/)
        if (incrM) {
          const v = incrM[1]
          if (incrM[2] === '++') { env[v] = (local[v] ?? env[v] ?? 0) + 1; local[v] = env[v] }
          else { env[v] = (local[v] ?? env[v] ?? 0) - 1; local[v] = env[v] }
          i++; continue
        }

        // return
        if (t.startsWith('return ')) {
          const val = evalExpr(t.slice(7).replace(/;$/, ''), local)
          local['__return'] = val
          return
        }

      } catch (e) {
        errors.push(e.message)
      }
      i++
    }
  }

  // 1. Parser les fonctions (setup, loop, et fonctions custom)
  const allLines = code.split('\n')
  let i = 0
  while (i < allLines.length) {
    const t = stripComment(allLines[i])
    // Déclaration de fonction : type nom(params) {
    const fnDeclM = t.match(/^(?:void|int|float|long|bool)\s+(\w+)\s*\(([^)]*)\)\s*\{?$/)
    if (fnDeclM) {
      const fnName = fnDeclM[1]
      const params = fnDeclM[2] ? fnDeclM[2].split(',').map(p => p.trim().split(/\s+/).pop()) : []
      const body = []
      let depth = t.endsWith('{') ? 1 : 0
      i++
      while (i < allLines.length) {
        const bl = allLines[i].trim()
        if (bl === '{') depth++
        if (bl === '}') { depth--; if (depth <= 0) { i++; break } }
        if (depth > 0) body.push(allLines[i])
        i++
      }
      fns[fnName] = { params, body }
      continue
    }
    // Variables globales
    const globalM = t.match(/^(?:const\s+)?(?:int|float|long|double|bool|byte|unsigned\s+int)\s+(\w+)\s*=\s*(.+?)\s*;$/)
    if (globalM) {
      env[globalM[1]] = evalExpr(globalM[2])
    }
    i++
  }

  // 2. Exécuter setup() puis loop() (une seule fois pour la simulation)
  if (fns['setup']) execLines(fns['setup'].body, {})
  if (fns['loop']) execLines(fns['loop'].body, {})

  return { output: output.join('\n'), errors }
}
