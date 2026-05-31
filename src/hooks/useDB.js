import { useState, useCallback } from 'react';

export function getDBKey(prenom) {
  return `bac_sti2d_${prenom.toLowerCase().trim()}`
}

export function getCurrentUser() {
  return localStorage.getItem('bac_sti2d_current_user') || null
}

export function setCurrentUser(prenom) {
  localStorage.setItem('bac_sti2d_current_user', prenom.toLowerCase().trim())
}

export function logoutUser() {
  localStorage.removeItem('bac_sti2d_current_user')
}

// Stats Hugo pré-chargées (seed) — injectées une seule fois si aucune donnée existante
const HUGO_SEED = {"notes":[{"id":1779722534168,"date":"2026-05-25","mat":"PC","val":20,"src":"exercice","titre":"Rendement moteur électrique"},{"id":1779722569346,"date":"2026-05-25","mat":"PC","val":20,"src":"exercice","titre":"Valeur efficace d'une tension sinusoïdale"},{"id":1779722596743,"date":"2026-05-25","mat":"PC","val":20,"src":"exercice","titre":"Puissance active sinusoïdale"},{"id":1779722611986,"date":"2026-05-25","mat":"PC","val":20,"src":"exercice","titre":"Longueur d'onde sonore"},{"id":1779722625850,"date":"2026-05-25","mat":"PC","val":20,"src":"exercice","titre":"Énergie cinétique d'un nageur"},{"id":1779722656155,"date":"2026-05-25","mat":"PC","val":0,"src":"exercice","titre":"COP d'une pompe à chaleur"},{"id":1779722667504,"date":"2026-05-25","mat":"PC","val":20,"src":"exercice","titre":"COP d'une pompe à chaleur"},{"id":1779722701690,"date":"2026-05-25","mat":"PC","val":20,"src":"exercice","titre":"Demi-vie radioactive"},{"id":1779722718638,"date":"2026-05-25","mat":"PC","val":20,"src":"exercice","titre":"pH d'une solution acide"},{"id":1779722870084,"date":"2026-05-25","mat":"Maths","val":20,"src":"exercice","titre":"Équation différentielle – condition initiale"},{"id":1779722996131,"date":"2026-05-25","mat":"Maths","val":0,"src":"exercice","titre":"Module d'un nombre complexe"},{"id":1779723054442,"date":"2026-05-25","mat":"Maths","val":20,"src":"exercice","titre":"Module d'un nombre complexe"},{"id":1779723067067,"date":"2026-05-25","mat":"Maths","val":0,"src":"exercice","titre":"Primitive d'une fonction exponentielle"},{"id":1779723075668,"date":"2026-05-25","mat":"Maths","val":20,"src":"exercice","titre":"Primitive d'une fonction exponentielle"},{"id":1779800186084,"date":"2026-05-26","mat":"Maths","val":20,"src":"exercice","titre":"Intégrale définie"},{"id":1779800471524,"date":"2026-05-26","mat":"PC","val":20,"src":"exercice","titre":"Rendement moteur électrique"},{"id":1779800605451,"date":"2026-05-26","mat":"PC","val":20,"src":"exercice","titre":"Rendement moteur électrique"},{"id":1779805256447,"date":"2026-05-26","mat":"Maths","val":0,"src":"exercice","titre":"Intégrale définie"},{"id":1779805259049,"date":"2026-05-26","mat":"Maths","val":20,"src":"exercice","titre":"Intégrale définie"},{"id":1779805262145,"date":"2026-05-26","mat":"Maths","val":0,"src":"exercice","titre":"Intégrale définie"},{"id":1779805274623,"date":"2026-05-26","mat":"Maths","val":0,"src":"exercice","titre":"Intégrale définie"},{"id":1780231994544,"date":"2026-05-31","mat":"Maths","val":0,"src":"exercice","titre":"Dérivée composée"},{"id":1780232086359,"date":"2026-05-31","mat":"Maths","val":0,"src":"exercice","titre":"Module d'un nombre complexe"},{"id":1780232121212,"date":"2026-05-31","mat":"Maths","val":20,"src":"exercice","titre":"Module d'un nombre complexe (variable)"},{"id":1780232132042,"date":"2026-05-31","mat":"Maths","val":20,"src":"exercice","titre":"Dérivée composée"},{"id":1780232146526,"date":"2026-05-31","mat":"Maths","val":0,"src":"exercice","titre":"Loi binomiale – espérance"},{"id":1780232160620,"date":"2026-05-31","mat":"Maths","val":0,"src":"exercice","titre":"Module d'un nombre complexe (variable)"},{"id":1780232170254,"date":"2026-05-31","mat":"Maths","val":20,"src":"exercice","titre":"Loi binomiale – espérance"},{"id":1780232185032,"date":"2026-05-31","mat":"SIN","val":20,"src":"exercice","titre":"Résolution CAN 8 bits"},{"id":1780232194213,"date":"2026-05-31","mat":"2I2D","val":0,"src":"exercice","titre":"Rendement global d'une chaîne"},{"id":1780238234087,"date":"2026-05-31","mat":"SIN","val":20,"src":"exercice","titre":"Lecture analogRead Arduino"},{"id":1780241163480,"date":"2026-05-31","mat":"Maths","val":0,"src":"exercice","titre":"Probabilité conditionnelle"}],"sessions":[],"smData":{"23":{"id":23,"interval":15,"repetitions":3,"easeFactor":2.5,"nextReview":"2026-06-11","lastReview":"2026-05-27"},"25":{"id":25,"interval":1,"repetitions":1,"easeFactor":2.5,"nextReview":"2026-05-29","lastReview":"2026-05-28"},"26":{"id":26,"interval":15,"repetitions":3,"easeFactor":2.5,"nextReview":"2026-06-11","lastReview":"2026-05-27"},"55":{"id":55,"interval":1,"repetitions":0,"easeFactor":1.96,"nextReview":"2026-05-29","lastReview":"2026-05-28"},"56":{"id":56,"interval":6,"repetitions":2,"easeFactor":1.96,"nextReview":"2026-06-02","lastReview":"2026-05-27"},"57":{"id":57,"interval":15,"repetitions":3,"easeFactor":2.5,"nextReview":"2026-06-11","lastReview":"2026-05-27"},"58":{"id":58,"interval":1,"repetitions":0,"easeFactor":1.96,"nextReview":"2026-05-29","lastReview":"2026-05-28"},"59":{"id":59,"interval":1,"repetitions":0,"easeFactor":1.96,"nextReview":"2026-05-29","lastReview":"2026-05-28"}},"exoDone":{"1":{"correct":true,"attempts":3,"lastDate":"2026-05-26"},"2":{"correct":true,"attempts":1,"lastDate":"2026-05-25"},"3":{"correct":true,"attempts":1,"lastDate":"2026-05-25"},"4":{"correct":true,"attempts":1,"lastDate":"2026-05-25"},"5":{"correct":true,"attempts":1,"lastDate":"2026-05-25"},"6":{"correct":true,"attempts":2,"lastDate":"2026-05-25"},"7":{"correct":true,"attempts":1,"lastDate":"2026-05-25"},"8":{"correct":true,"attempts":1,"lastDate":"2026-05-25"},"9":{"correct":true,"attempts":1,"lastDate":"2026-05-25"},"10":{"correct":false,"attempts":3,"lastDate":"2026-05-31"},"11":{"correct":true,"attempts":2,"lastDate":"2026-05-25"},"12":{"correct":true,"attempts":6,"lastDate":"2026-05-26"},"13":{"correct":true,"attempts":2,"lastDate":"2026-05-31"},"14":{"correct":true,"attempts":2,"lastDate":"2026-05-31"},"15":{"correct":false,"attempts":1,"lastDate":"2026-05-31"},"16":{"correct":true,"attempts":4,"lastDate":"2026-05-27"},"17":{"correct":true,"attempts":1,"lastDate":"2026-05-31"},"18":{"correct":true,"attempts":3,"lastDate":"2026-05-31"},"19":{"correct":true,"attempts":1,"lastDate":"2026-05-31"},"20":{"correct":true,"attempts":2,"lastDate":"2026-05-28"},"21":{"correct":false,"attempts":1,"lastDate":"2026-05-31"},"201":{"correct":true,"attempts":1,"lastDate":"2026-05-31"},"202":{"correct":true,"attempts":1,"lastDate":"2026-05-31"},"206":{"correct":true,"attempts":1,"lastDate":"2026-05-31"},"207":{"correct":true,"attempts":1,"lastDate":"2026-05-31"},"208":{"correct":true,"attempts":1,"lastDate":"2026-05-31"},"209":{"correct":true,"attempts":1,"lastDate":"2026-05-31"},"210":{"correct":true,"attempts":1,"lastDate":"2026-05-31"}},"fichesDone":{"18":{"seen":true,"mastered":false,"lastDate":"2026-05-28","nextReview":"2026-05-29","interval":1,"repetitions":1,"easeFactor":2.36}},"variableDone":{"38":{"attempts":1,"correct":0},"104":{"attempts":1,"correct":1}},"todos":[],"customFiches":[],"customFlashcards":[],"lastActivityDate":null,"streak":0,"darkMode":true,"timerDuration":180,"notifEnabled":true,"taskStatus":{"2026-05-20__Énergie : puissance, rendement, transferts thermiques (rattrapé)":"missed","2026-05-20__Circuits sinusoïdaux : tension efficace, cos φ, puissance apparente (rattrapé)":"missed","2026-05-21__Exponentielle e^x et logarithme ln : propriétés, dérivées":"missed","2026-05-22__Équations différentielles : forme y'+ay=b, solution générale":"missed","2026-05-23__Mécanique : énergie cinétique, travail d'une force":"missed","2026-05-24__Réseau : adressage IP, masque sous-réseau, passerelle":"missed","2026-05-25__Nombres complexes : formes algébrique, trigonométrique, exponentielle":"done","2026-05-22__Ondes : son (f, T, λ), ondes EM, transmission numérique":"missed","2026-05-26__Intégration & primitives : primitives usuelles, calcul intégrale définie":"done","2026-05-27__Mécanique : énergie cinétique, travail d'une force":"missed","2026-05-27__Programmation Python : boucles, conditions, fonctions, listes":"done","2026-05-28__CAN/CNA : résolution, quantification, critère de Shannon":"missed","2026-05-29__Chimie acide/base + Nucléaire (fission, radioactivité, demi-vie)":"missed","2026-05-30__Annale PCM 2024 complète – 3h en conditions réelles":"missed"},"reportedTasks":{"2026-05-20__Énergie : puissance, rendement, transferts thermiques (rattrapé)":{"date":"2026-05-29","mat":"PC","tache":"Énergie : puissance, rendement, transferts thermiques (rattrapé)","_originalDate":"2026-05-20","_reported":true},"2026-05-20__Circuits sinusoïdaux : tension efficace, cos φ, puissance apparente (rattrapé)":{"date":"2026-05-30","mat":"PC","tache":"Circuits sinusoïdaux : tension efficace, cos φ, puissance apparente (rattrapé)","_originalDate":"2026-05-20","_reported":true},"2026-05-21__Exponentielle e^x et logarithme ln : propriétés, dérivées":{"date":"2026-05-31","mat":"Maths","tache":"Exponentielle e^x et logarithme ln : propriétés, dérivées","_originalDate":"2026-05-21","_reported":true},"2026-05-22__Équations différentielles : forme y'+ay=b, solution générale":{"date":"2026-06-08","mat":"Maths","tache":"Équations différentielles : forme y'+ay=b, solution générale","_originalDate":"2026-05-22","_reported":true},"2026-05-24__Réseau : adressage IP, masque sous-réseau, passerelle":{"date":"2026-05-28","mat":"SIN","tache":"Réseau : adressage IP, masque sous-réseau, passerelle","_originalDate":"2026-05-24","_reported":true},"2026-05-22__Ondes : son (f, T, λ), ondes EM, transmission numérique":{"date":"2026-06-02","mat":"PC","tache":"Ondes : son (f, T, λ), ondes EM, transmission numérique","_originalDate":"2026-05-22","_reported":true},"2026-05-23__Mécanique : énergie cinétique, travail d'une force":{"date":"2026-06-03","mat":"PC","tache":"Mécanique : énergie cinétique, travail d'une force","_originalDate":"2026-05-23","_reported":true},"2026-05-28__CAN/CNA : résolution, quantification, critère de Shannon":{"date":"2026-06-04","mat":"SIN","tache":"CAN/CNA : résolution, quantification, critère de Shannon","_reported":true,"_originalDate":"2026-05-28"},"2026-05-29__Chimie acide/base + Nucléaire (fission, radioactivité, demi-vie)":{"date":"2026-06-05","mat":"PC","tache":"Chimie acide/base + Nucléaire (fission, radioactivité, demi-vie)","_reported":true,"_originalDate":"2026-05-29"},"2026-05-30__Annale PCM 2024 complète – 3h en conditions réelles":{"date":"2026-06-06","mat":"PC","tache":"Annale PCM 2024 complète – 3h en conditions réelles","_reported":true,"_originalDate":"2026-05-30"}}}

function initDB(prenom) {
  const DB_KEY = getDBKey(prenom)
  try {
    const saved = localStorage.getItem(DB_KEY);
    if (saved) return JSON.parse(saved);
    // Migration : si données dans l'ancien format sans login, les récupérer
    const legacy = localStorage.getItem('bac_sti2d_userdata');
    if (legacy) {
      const parsed = JSON.parse(legacy);
      localStorage.setItem(DB_KEY, legacy);
      localStorage.removeItem('bac_sti2d_userdata');
      console.log('Migration données legacy vers', DB_KEY);
      return parsed;
    }
    // Seed Hugo : charger ses stats pré-existantes au premier login
    if (prenom.toLowerCase().trim() === 'hugo') {
      localStorage.setItem(DB_KEY, JSON.stringify(HUGO_SEED));
      return HUGO_SEED;
    }
  } catch (e) {
    console.warn('Erreur lecture localStorage:', e);
  }
  return {
    // Notes et sessions
    notes: [],
    sessions: [],

    // Progression flashcards (SM-2)
    // { [cardId]: { interval, repetitions, easeFactor, nextReview, lastReview } }
    smData: {},

    // Exercices faits
    // { [exoId]: { correct: bool, attempts: number, lastDate: string } }
    exoDone: {},

    // Fiches vues + SM-2
    // { [ficheId]: { seen: bool, mastered: bool, lastDate: string, nextReview: string, interval: number, repetitions: number, easeFactor: number } }
    fichesDone: {},

    // Exercices variables : stocke combien de fois chaque template a été vu (par id de base)
    // { [baseId]: { attempts: number, correct: number } }
    variableDone: {},

    // Todo list custom
    todos: [],

    // Notes custom ajoutées par l'utilisateur
    customFiches: [],
    customFlashcards: [],

    // Streak
    lastActivityDate: null,
    streak: 0,

    // Préférences
    darkMode: false,
    timerDuration: 180, // minutes
  };
}

export function useDB(prenom) {
  const DB_KEY = getDBKey(prenom)
  const [db, setDB] = useState(() => initDB(prenom));

  const updateDB = useCallback((fn) => {
    setDB(prev => {
      const next = structuredClone(prev);
      fn(next);
      try {
        localStorage.setItem(DB_KEY, JSON.stringify(next));
      } catch (e) {
        console.warn('Erreur écriture localStorage:', e);
      }
      return next;
    });
  }, [DB_KEY]);

  const addNote = useCallback((mat, val, src, titre) => {
    updateDB(d => {
      d.notes.push({
        id: Date.now(),
        date: new Date().toISOString().split('T')[0],
        mat,
        val: Math.round(val * 10) / 10,
        src,
        titre,
      });
    });
  }, [updateDB]);

  const addSession = useCallback((mat, score, note) => {
    updateDB(d => {
      d.sessions.push({
        id: Date.now(),
        date: new Date().toISOString().split('T')[0],
        mat,
        score: score != null ? Math.round(score * 10) / 10 : null,
        note: note || '',
      });
      // Mettre à jour le streak
      const today = new Date().toISOString().split('T')[0];
      if (d.lastActivityDate !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yStr = yesterday.toISOString().split('T')[0];
        d.streak = d.lastActivityDate === yStr ? (d.streak || 0) + 1 : 1;
        d.lastActivityDate = today;
      }
    });
  }, [updateDB]);

  const updateSM2 = useCallback((cardId, smResult, knew) => {
    updateDB(d => {
      d.smData[cardId] = smResult;
      if (!d.flashcardsMissed) d.flashcardsMissed = []
      if (knew === false) {
        if (!d.flashcardsMissed.includes(cardId)) d.flashcardsMissed.push(cardId)
      } else if (knew === true) {
        d.flashcardsMissed = d.flashcardsMissed.filter(id => id !== cardId)
      }
    });
  }, [updateDB]);

  const markExo = useCallback((exoId, correct) => {
    updateDB(d => {
      const prev = d.exoDone[exoId] || { attempts: 0 };
      d.exoDone[exoId] = {
        correct,
        attempts: prev.attempts + 1,
        lastDate: new Date().toISOString().split('T')[0],
      };
    });
  }, [updateDB]);

  const markFiche = useCallback((ficheId, mastered = false) => {
    updateDB(d => {
      const prev = d.fichesDone[ficheId] || {}
      const today = new Date().toISOString().split('T')[0]
      // Calcul SM-2 simplifié pour les fiches
      const quality = mastered ? 5 : 3
      let { interval = 1, repetitions = 0, easeFactor = 2.5 } = prev
      if (quality >= 3) {
        if (repetitions === 0) interval = 1
        else if (repetitions === 1) interval = 3
        else interval = Math.round(interval * easeFactor)
        repetitions += 1
      } else {
        repetitions = 0; interval = 1
      }
      easeFactor = Math.max(1.3, easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
      const nextReview = new Date()
      nextReview.setDate(nextReview.getDate() + interval)
      d.fichesDone[ficheId] = {
        seen: true, mastered,
        lastDate: today,
        nextReview: nextReview.toISOString().split('T')[0],
        interval, repetitions,
        easeFactor: Math.round(easeFactor * 100) / 100,
      }
    });
  }, [updateDB]);

  const markVariableExo = useCallback((baseId, correct) => {
    updateDB(d => {
      if (!d.variableDone) d.variableDone = {}
      const prev = d.variableDone[baseId] || { attempts: 0, correct: 0 }
      d.variableDone[baseId] = { attempts: prev.attempts + 1, correct: prev.correct + (correct ? 1 : 0) }
    })
  }, [updateDB]);

  const markTaskDone = useCallback((date, tache, status) => {
    // status: 'done' | 'missed' | null (null = reset)
    updateDB(d => {
      if (!d.taskStatus) d.taskStatus = {}
      if (status === null) {
        delete d.taskStatus[`${date}__${tache}`]
      } else {
        d.taskStatus[`${date}__${tache}`] = status
      }
    })
  }, [updateDB])

  const addReportedTask = useCallback((targetDate, task) => {
    // Ajoute UNE SEULE fois une tâche reportée à une date cible.
    // La clé unique empêche tout doublon.
    const key = `${task._originalDate}__${task.tache}`
    updateDB(d => {
      if (!d.reportedTasks) d.reportedTasks = {}
      // Si déjà reporté à cette date exacte, ne rien faire
      if (d.reportedTasks[key]) return
      d.reportedTasks[key] = { ...task, date: targetDate, _reported: true, _originalDate: task._originalDate }
    })
  }, [updateDB])

  const removeReportedTask = useCallback((originalDate, tache) => {
    const key = `${originalDate}__${tache}`
    updateDB(d => {
      if (d.reportedTasks) delete d.reportedTasks[key]
    })
  }, [updateDB])

  const resetDB = useCallback(() => {
    localStorage.removeItem(DB_KEY);
    window.location.reload();
  }, []);

  // Stats calculées
  const avgNote = db.notes.length
    ? Math.round(db.notes.reduce((a, n) => a + n.val, 0) / db.notes.length * 10) / 10
    : null;

  const fichesVues = Object.keys(db.fichesDone).length;
  const fichesMaitrisees = Object.values(db.fichesDone).filter(f => f.mastered).length;
  const exosFaits = Object.keys(db.exoDone).length;
  const exosReussis = Object.values(db.exoDone).filter(e => e.correct).length;

  return {
    db,
    updateDB,
    addNote,
    addSession,
    updateSM2,
    markExo,
    markFiche,
    markTaskDone,
    addReportedTask,
    removeReportedTask,
    markVariableExo,
    resetDB,
    // Stats
    avgNote,
    fichesVues,
    fichesMaitrisees,
    exosFaits,
    exosReussis,
  };
}
