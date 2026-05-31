# BacSTI2D — Dashboard de révision

## Projet
Dashboard web de révision pour le bac STI2D 2026.
- Élève : Hugo KACI
- Lycée : Alphonse Benoît, L'Isle-sur-la-Sorgue
- Spécialité : SIN (Systèmes d'Information et Numérique)
- Épreuves : Philo 15/06 · PCM 16/06 · 2I2D 17/06 · Grand Oral 23/06

---

## Ce qui existe déjà (base de données complète dans data/db.json)

- **27 fiches de révision** complètes (PC, Maths, SIN, 2I2D, Philo, GO)
- **25 flashcards** avec questions/réponses détaillées
- **12 exercices** QCM avec corrections et explications
- **Planning jour par jour** du 18 mai au 23 juin 2026
- **Coefficients** et calendrier officiel des épreuves

Le JSON est la source de vérité. Toutes les données doivent venir de là.

---

## Ce qui a déjà été construit (prototype dans artifact Claude)

Un dashboard HTML/React fonctionnel avec :
- Dashboard avec stats, todo, sessions
- Planning calendrier mensuel
- Fiches avec filtres matière/fréquence
- Flashcards avec système je-savais/je-ne-savais-pas
- Exercices QCM avec auto-correction
- Simulation bac avec note sur 20
- Stats avec graphiques barres
- Sauvegarde localStorage JSON

---

## Ce qu'il faut construire / améliorer

### Stack recommandée
- **React + Vite** (ou Next.js)
- **Tailwind CSS** pour le style
- **localStorage** pour la persistance (pas de backend nécessaire)
- **Chart.js ou Recharts** pour les graphiques

### Fonctionnalités à ajouter / améliorer

#### 1. Répétition espacée (PRIORITÉ HAUTE)
Implémenter l'algorithme SM-2 (type Anki) pour les flashcards :
- Chaque carte a un intervalle de répétition (1j, 3j, 7j, 14j, 30j...)
- Si réussie → intervalle × 2,5
- Si ratée → retour à 1 jour
- Tableau de bord : "X cartes à revoir aujourd'hui"

#### 2. Minuteur d'examen
- Timer configurable (3h pour PCM, 3h30 pour 2I2D, 4h pour Philo)
- Affichage temps restant en grand
- Alerte sonore à 30 min et fin
- Mode "simulation conditions réelles"

#### 3. Graphiques améliorés (Stats)
- Courbe d'évolution de la moyenne dans le temps (Chart.js line)
- Heatmap type GitHub : un carré par jour coloré selon intensité révision
- Radar chart par matière (niveau actuel vs objectif)
- Prédiction note bac basée sur les résultats

#### 4. Fiches de révision complètes
- Affichage du contenu complet avec mise en forme (markdown-like)
- Formules en LaTeX ou formatées proprement (KaTeX)
- Mode lecture plein écran
- Progression : vu / en cours / maîtrisé

#### 5. Exercices améliorés
- Exercices avec saisie numérique (pas que QCM)
- Chronomètre par exercice
- Historique de mes tentatives sur chaque exercice
- Niveau de difficulté adaptatif

#### 6. Ajout de contenu custom
- Formulaire pour ajouter ses propres fiches
- Formulaire pour ajouter ses propres flashcards
- Import/export JSON

#### 7. Mode sombre
- Toggle dark/light mode
- Couleurs cohérentes

#### 8. Raccourcis clavier
- Espace = retourner flashcard
- → = carte suivante / exercice suivant
- 1/2/3/4 = sélectionner option QCM

#### 9. UX / notifications
- Badge "X cartes à revoir" dans la nav
- Streak de révision (jours consécutifs)
- Message de motivation selon l'avancement

#### 10. Export
- Export PDF de mes stats
- Export PDF d'une fiche de révision

---

## Structure des fichiers suggérée

```
bac-sti2d/
├── data/
│   └── db.json          ← SOURCE DE VÉRITÉ (déjà créé)
├── src/
│   ├── components/
│   │   ├── Dashboard.jsx
│   │   ├── Planning.jsx
│   │   ├── Fiches.jsx
│   │   ├── Flashcards.jsx
│   │   ├── Exercices.jsx
│   │   ├── Simulation.jsx
│   │   ├── Stats.jsx
│   │   └── Sidebar.jsx
│   ├── hooks/
│   │   ├── useDB.js         ← gestion localStorage
│   │   └── useSpacedRep.js  ← algorithme SM-2
│   ├── utils/
│   │   └── sm2.js           ← algorithme répétition espacée
│   ├── App.jsx
│   └── main.jsx
├── public/
├── README.md             ← CE FICHIER
└── package.json
```

---

## Couleurs des matières

```js
const MAT_COLOR = {
  PC:    '#1565C0',  // bleu
  Maths: '#6A1B9A',  // violet
  SIN:   '#00695C',  // teal
  '2I2D':'#E65100',  // orange
  Philo: '#2E7D32',  // vert
  GO:    '#F9A825',  // or
  EXAM:  '#C62828',  // rouge
};
```

---

## Commandes pour démarrer

```bash
npm create vite@latest . -- --template react
npm install
npm install tailwindcss recharts chart.js @headlessui/react
npm run dev
```

Puis importer les données depuis data/db.json dans chaque composant.
