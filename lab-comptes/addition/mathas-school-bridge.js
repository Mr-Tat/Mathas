/* Math'as School Bridge v0.1 — Addition écrite simple.
 * Réception des résultats réels du jeu ; mode libre intact.
 * Aucun jeton, compte élève, score ni appel réseau sans SDK scolaire
 * ayant validé une session de classe côté serveur.
 */
(function (root) {
  'use strict';
  const VERSION = '0.1.0';
  const MODES = Object.freeze(['classic', 'sudden', 'hard_challenge', 'hard_sudden']);
  const stats = { captured: 0, forwarded: 0, ignored: 0, rejected: 0, lastError: null };

  function normalize(input) {
    if (!input || typeof input !== 'object') return null;
    const score = Number(input.score);
    const total = Number(input.total);
    const mode = String(input.mode || '');
    const levelRank = Number(input.levelRank);
    if (!MODES.includes(mode) || !Number.isSafeInteger(score) || score < 0 ||
        !Number.isSafeInteger(total) || total < 1 || score > total ||
        !Number.isSafeInteger(levelRank) || levelRank < 1 || levelRank > 6) return null;
    const isSudden = mode === 'sudden' || mode === 'hard_sudden';
    return {
      clientEventId: typeof root.crypto?.randomUUID === 'function'
        ? root.crypto.randomUUID() : null,
      mode,
      levelKey: String(input.levelKey || 'niveau-' + levelRank).slice(0, 70),
      score,
      scoreMax: isSudden ? null : total,
      correctCount: score,
      questionCount: isSudden ? null : total,
      aidUsed: input.aidUsed === true,
      appVersion: String(root.MathasAppConfig?.visibleVersion || 'unknown'),
      adapterVersion: VERSION,
      // En mort subite, score+1 est le seuil d'arrêt, pas un score maximum.
      termination: isSudden ? 'first_error' : 'completed',
    };
  }

  function onResult(evt) {
    const result = normalize(evt?.detail);
    if (!result) { stats.rejected += 1; return; }
    stats.captured += 1;
    const sdk = root.MathasStudentSDK;
    // Ouvrir l'application directement ou via un partage ne synchronise rien.
    if (!sdk || typeof sdk.getMode !== 'function' ||
        sdk.getMode()?.mode !== 'eleve' ||
        typeof sdk.submitCompletedActivity !== 'function') {
      stats.ignored += 1;
      return;
    }
    try {
      Promise.resolve(sdk.submitCompletedActivity(result)).then(
        () => { stats.forwarded += 1; },
        (e) => { stats.lastError = String(e?.message || e); }
      );
    } catch (e) {
      stats.lastError = String(e?.message || e);
    }
  }

  root.addEventListener('mathas:completed-activity', onResult);
  root.MathasSchoolBridge = Object.freeze({
    version: VERSION,
    inspect: () => ({ ...stats }),
    normalize,
  });
})(window);
