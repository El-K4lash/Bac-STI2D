/**
 * Mélange les options d'un exercice et retourne l'exo avec
 * les options dans un ordre aléatoire + l'index correct mis à jour.
 * Appelé à chaque affichage pour que la bonne réponse ne soit jamais
 * toujours à la même position.
 */
export function shuffleExo(exo) {
  const indexed = exo.options.map((opt, i) => ({ opt, isCorrect: i === exo.correct }))
  for (let i = indexed.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indexed[i], indexed[j]] = [indexed[j], indexed[i]]
  }
  return {
    ...exo,
    options: indexed.map(x => x.opt),
    correct: indexed.findIndex(x => x.isCorrect),
  }
}

/**
 * Mélange un tableau (Fisher-Yates), retourne une nouvelle copie.
 */
export function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
