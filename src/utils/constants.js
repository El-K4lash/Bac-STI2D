// Couleurs par matière
export const MAT_COLOR = {
  PC:    '#1565C0',
  Maths: '#6A1B9A',
  SIN:   '#00695C',
  '2I2D':'#E65100',
  Philo: '#2E7D32',
  GO:    '#F9A825',
  EXAM:  '#C62828',
};

export const MAT_BG = {
  PC:    '#E3F2FD',
  Maths: '#EDE7F6',
  SIN:   '#E0F2F1',
  '2I2D':'#FFF3E0',
  Philo: '#E8F5E9',
  GO:    '#FFFDE7',
  EXAM:  '#FFEBEE',
};

// Date du premier examen
export const EXAM_DATE = new Date('2026-06-15');

// Calcul jours restants
export function getDaysLeft() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((EXAM_DATE - today) / (1000 * 60 * 60 * 24));
}

// Filtres matières disponibles
export const MATIERES = ['Tout', 'PC', 'Maths', 'SIN', '2I2D', 'Philo', 'GO'];

// Filtres fréquence
export const FREQUENCES = [
  { value: 'tout',          label: 'Toutes' },
  { value: 'chaque-annee', label: 'Chaque année' },
  { value: 'regulier',     label: 'Régulier' },
];

// Durées épreuves (en minutes) pour le timer
export const TIMER_DUREES = {
  'PCM':    180,
  '2I2D':   210,
  'Philo':  240,
  'GO':     20,
  'Custom': 60,
};

// Niveaux de priorité
export const PRIORITE_LABEL = {
  3: '⭐⭐⭐ Priorité haute',
  2: '⭐⭐ Priorité moyenne',
  1: '⭐ Priorité faible',
};
