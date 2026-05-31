// Simule l'exécution d'un script Python simple (subset utilisé dans les exos scolaires)
// Gère : variables, print(), if/else, for, def, opérations arithmétiques, listes, len(), round()

export function runPython(code) {
  const lines = code.split('\n')
  const output = []
  const env = {}

  function evalExpr(expr, localEnv = {}) {
    const scope = { ...env, ...localEnv }
    expr = expr.trim()

    // Chaîne de caractères
    if ((expr.startsWith('"') && expr.endsWith('"')) || (expr.startsWith("'") && expr.endsWith("'"))) {
      return expr.slice(1, -1)
    }

    // Booléens
    if (expr === 'True') return true
    if (expr === 'False') return false
    if (expr === 'None') return null

    // Liste littérale [1, 2, 3]
    if (expr.startsWith('[') && expr.endsWith(']')) {
      const inner = expr.slice(1, -1).trim()
      if (!inner) return []
      return inner.split(',').map(e => evalExpr(e.trim(), localEnv))
    }

    // Appel de fonction built-in
    const roundMatch = expr.match(/^round\((.+),\s*(\d+)\)$/)
    if (roundMatch) {
      const val = evalExpr(roundMatch[1], localEnv)
      const dec = parseInt(roundMatch[2])
      return Math.round(val * 10 ** dec) / 10 ** dec
    }
    const lenMatch = expr.match(/^len\((.+)\)$/)
    if (lenMatch) {
      const val = evalExpr(lenMatch[1], localEnv)
      return Array.isArray(val) ? val.length : String(val).length
    }
    const intMatch = expr.match(/^int\((.+)\)$/)
    if (intMatch) return parseInt(evalExpr(intMatch[1], localEnv))
    const floatMatch = expr.match(/^float\((.+)\)$/)
    if (floatMatch) return parseFloat(evalExpr(floatMatch[1], localEnv))
    const strMatch = expr.match(/^str\((.+)\)$/)
    if (strMatch) return String(evalExpr(strMatch[1], localEnv))

    // list comprehension simple : [int(x) for x in y.split('.')]
    const compMatch = expr.match(/^\[(.+)\s+for\s+(\w+)\s+in\s+(.+)\]$/)
    if (compMatch) {
      const transform = compMatch[1].trim()
      const varName = compMatch[2].trim()
      const iterable = evalExpr(compMatch[3].trim(), localEnv)
      if (Array.isArray(iterable)) {
        return iterable.map(item => evalExpr(transform, { ...localEnv, [varName]: item }))
      }
      return []
    }

    // Accès à une variable
    if (/^\w+$/.test(expr)) {
      if (expr in scope) return scope[expr]
      if (!isNaN(expr)) return Number(expr)
      throw new Error(`NameError: name '${expr}' is not defined`)
    }

    // Accès index liste : liste[i]
    const indexMatch = expr.match(/^(\w+)\[(\d+)\]$/)
    if (indexMatch) {
      const arr = scope[indexMatch[1]]
      return Array.isArray(arr) ? arr[parseInt(indexMatch[2])] : undefined
    }

    // Méthode .split()
    const splitMatch = expr.match(/^(\w+)\.split\('(.*)'\)$/)
    if (splitMatch) {
      const val = scope[splitMatch[1]]
      return String(val).split(splitMatch[2])
    }
    const splitMatch2 = expr.match(/^(\w+)\.split\("(.*)"\)$/)
    if (splitMatch2) {
      const val = scope[splitMatch2[1]]
      return String(val).split(splitMatch2[2])
    }

    // Opérations arithmétiques/logiques — évaluation sécurisée
    try {
      // Remplacer les noms de variables par leurs valeurs
      let safeExpr = expr
      // Tri par longueur décroissante pour éviter les remplacements partiels
      const varNames = Object.keys(scope).sort((a, b) => b.length - a.length)
      for (const name of varNames) {
        const val = scope[name]
        if (typeof val === 'number' || typeof val === 'boolean') {
          safeExpr = safeExpr.replace(new RegExp(`\\b${name}\\b`, 'g'), val)
        }
      }
      // ** → Math.pow
      safeExpr = safeExpr.replace(/(\d+(?:\.\d+)?)\s*\*\*\s*(\d+(?:\.\d+)?)/g, (_, a, b) => Math.pow(Number(a), Number(b)))
      safeExpr = safeExpr.replace(/\*\*/g, '**') // reste
      // Opérateurs Python → JS
      safeExpr = safeExpr.replace(/\band\b/g, '&&').replace(/\bor\b/g, '||').replace(/\bnot\b/g, '!')
      // Évaluation
      // eslint-disable-next-line no-new-func
      const result = Function(`"use strict"; return (${safeExpr})`)()
      return result
    } catch {
      throw new Error(`SyntaxError dans l'expression: ${expr}`)
    }
  }

  function parsePrint(line) {
    const m = line.match(/^print\((.+)\)$/)
    if (!m) return null
    const args = splitArgs(m[1])
    return args.map(a => {
      const v = evalExpr(a.trim())
      if (v === null) return 'None'
      if (v === true) return 'True'
      if (v === false) return 'False'
      return String(v)
    }).join(' ')
  }

  function splitArgs(str) {
    const args = []
    let depth = 0, current = '', inStr = false, strChar = ''
    for (let i = 0; i < str.length; i++) {
      const c = str[i]
      if (!inStr && (c === '"' || c === "'")) { inStr = true; strChar = c; current += c }
      else if (inStr && c === strChar) { inStr = false; current += c }
      else if (!inStr && (c === '(' || c === '[')) { depth++; current += c }
      else if (!inStr && (c === ')' || c === ']')) { depth--; current += c }
      else if (!inStr && c === ',' && depth === 0) { args.push(current); current = '' }
      else current += c
    }
    if (current.trim()) args.push(current)
    return args
  }

  // Exécution ligne par ligne
  let i = 0
  const errors = []

  function execBlock(blockLines, localEnv = {}) {
    let bi = 0
    while (bi < blockLines.length) {
      const line = blockLines[bi]
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) { bi++; continue }

      try {
        // if/else
        if (trimmed.startsWith('if ') && trimmed.endsWith(':')) {
          const cond = trimmed.slice(3, -1).trim()
          const condVal = evalExpr(cond, localEnv)
          const ifBlock = []
          const elseBlock = []
          let inElse = false
          bi++
          while (bi < blockLines.length) {
            const l = blockLines[bi]
            if (!l.startsWith('    ') && !l.startsWith('\t')) break
            if (l.trim() === 'else:') { inElse = true; bi++; continue }
            if (inElse) elseBlock.push(l.slice(4))
            else ifBlock.push(l.slice(4))
            bi++
          }
          execBlock(condVal ? ifBlock : elseBlock, localEnv)
          continue
        }

        // for loop
        if (trimmed.startsWith('for ') && trimmed.includes(' in ') && trimmed.endsWith(':')) {
          const m = trimmed.match(/^for\s+(\w+)\s+in\s+(.+):$/)
          if (m) {
            const varN = m[1], iterExpr = m[2]
            const iterable = evalExpr(iterExpr, localEnv)
            const forBlock = []
            bi++
            while (bi < blockLines.length) {
              const l = blockLines[bi]
              if (!l.startsWith('    ') && !l.startsWith('\t')) break
              forBlock.push(l.slice(4))
              bi++
            }
            const iterList = Array.isArray(iterable) ? iterable
              : (typeof iterable === 'object' && iterable !== null && typeof iterable[Symbol.iterator] === 'function')
                ? [...iterable] : []
            for (const item of iterList) {
              localEnv[varN] = item
              env[varN] = item
              execBlock(forBlock, localEnv)
            }
            continue
          }
        }

        // def function — skip body (on exécute les appels plus tard)
        if (trimmed.startsWith('def ') && trimmed.endsWith(':')) {
          const fnMatch = trimmed.match(/^def\s+(\w+)\(([^)]*)\):$/)
          if (fnMatch) {
            const fnName = fnMatch[1]
            const params = fnMatch[2].split(',').map(p => p.trim()).filter(Boolean)
            const fnBody = []
            bi++
            while (bi < blockLines.length) {
              const l = blockLines[bi]
              if (!l.startsWith('    ') && !l.startsWith('\t')) break
              fnBody.push(l.slice(4))
              bi++
            }
            env[fnName] = { __fn: true, params, body: fnBody }
          }
          continue
        }

        // print
        if (trimmed.startsWith('print(')) {
          const result = parsePrint(trimmed)
          if (result !== null) output.push(result)
          bi++; continue
        }

        // Appel de fonction définie par l'utilisateur : var = fn(args) ou fn(args)
        const fnCallAssign = trimmed.match(/^(\w+)\s*=\s*(\w+)\((.*)?\)$/)
        if (fnCallAssign && env[fnCallAssign[2]]?.__fn) {
          const varN = fnCallAssign[1], fnName = fnCallAssign[2]
          const fn = env[fnName]
          const argVals = fnCallAssign[3] ? splitArgs(fnCallAssign[3]).map(a => evalExpr(a.trim(), localEnv)) : []
          const fnEnv = {}
          fn.params.forEach((p, i) => { fnEnv[p] = argVals[i] })
          let returnVal = undefined
          for (const bl of fn.body) {
            const bt = bl.trim()
            if (bt.startsWith('return ')) {
              returnVal = evalExpr(bt.slice(7), { ...localEnv, ...fnEnv })
              break
            }
            if (bt.startsWith('print(')) {
              const r = parsePrint(bt)
              if (r !== null) output.push(r)
            }
          }
          env[varN] = returnVal
          Object.assign(localEnv, env)
          bi++; continue
        }

        // Assignation simple : var = expr ou var += expr
        const assignMatch = trimmed.match(/^(\w+)\s*([+\-*\/]?=)\s*(.+)$/)
        if (assignMatch) {
          const [, varN, op, exprStr] = assignMatch
          const val = evalExpr(exprStr, localEnv)
          if (op === '=') { env[varN] = val; localEnv[varN] = val }
          else if (op === '+=') { env[varN] = (env[varN] || 0) + val; localEnv[varN] = env[varN] }
          else if (op === '-=') { env[varN] = (env[varN] || 0) - val; localEnv[varN] = env[varN] }
          bi++; continue
        }

        // Méthode .append()
        const appendMatch = trimmed.match(/^(\w+)\.append\((.+)\)$/)
        if (appendMatch) {
          const arr = env[appendMatch[1]] || localEnv[appendMatch[1]]
          if (Array.isArray(arr)) arr.push(evalExpr(appendMatch[2], localEnv))
          bi++; continue
        }

        bi++
      } catch (e) {
        errors.push(e.message)
        bi++
      }
    }
  }

  try {
    execBlock(lines)
  } catch (e) {
    errors.push(e.message)
  }

  return { output: output.join('\n'), errors }
}
