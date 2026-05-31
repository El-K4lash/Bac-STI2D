/**
 * Algorithme SM-2 (SuperMemo 2) — Répétition espacée
 * Utilisé par Anki et la plupart des apps de flashcards
 *
 * @param {Object} card - Carte avec ses méta-données SM-2
 * @param {number} quality - Qualité de la réponse (0-5)
 *   5 = réponse parfaite
 *   4 = réponse correcte après légère hésitation
 *   3 = réponse correcte avec difficulté
 *   2 = réponse incorrecte mais facile à rappeler
 *   1 = réponse incorrecte, la bonne réponse semblait facile
 *   0 = réponse totalement incorrecte
 *
 * @returns {Object} Carte mise à jour avec nouveaux intervalles
 */
export function sm2(card, quality) {
  let { interval = 1, repetitions = 0, easeFactor = 2.5 } = card;

  if (quality >= 3) {
    // Bonne réponse
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions += 1;
  } else {
    // Mauvaise réponse — recommencer depuis le début
    repetitions = 0;
    interval = 1;
  }

  // Mettre à jour le facteur de facilité (min 1.3)
  easeFactor = Math.max(
    1.3,
    easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
  );

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval);

  return {
    ...card,
    interval,
    repetitions,
    easeFactor: Math.round(easeFactor * 100) / 100,
    nextReview: nextReview.toISOString().split('T')[0],
    lastReview: new Date().toISOString().split('T')[0],
  };
}

/**
 * Filtrer les cartes à revoir aujourd'hui
 */
export function getDueCards(cards, smData) {
  const today = new Date().toISOString().split('T')[0];
  return cards.filter(card => {
    const data = smData[card.id];
    if (!data) return true; // Jamais vue → à faire
    return data.nextReview <= today;
  });
}

/**
 * Convertir qualité binaire (su/pas su) en score SM-2
 */
export function boolToQuality(knew) {
  return knew ? 4 : 1;
}
