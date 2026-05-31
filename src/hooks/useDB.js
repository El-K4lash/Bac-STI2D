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
