/* Land ownership and prices, shared by the game UI and save migration. */
(function () {
  'use strict';
  const prices = Object.freeze([0, 0, 250, 400, 80, 100, 300, 500, 150, 200, 650, 800]);
  const levels = Object.freeze([1, 1, 4, 5, 2, 2, 4, 5, 3, 3, 6, 6]);
  function priceFor(index) {
    return Number.isInteger(index) && index >= 0 && index < prices.length ? prices[index] : null;
  }
  function initiallyUnlocked(index) { return priceFor(index) === 0; }
  function levelFor(index) { return priceFor(index) === null ? null : levels[index]; }
  function nextLocked(plots) {
    return plots.map((plot, index) => ({ plot, index }))
      .filter(({ plot, index }) => plot.unlocked === false && priceFor(index) !== null)
      .sort((a, b) => levels[a.index] - levels[b.index] || prices[a.index] - prices[b.index])[0]?.index ?? -1;
  }
  function normalizePlot(plot, index) {
    // Cultivated legacy plots remain owned; a purchased empty plot stays owned too.
    return { ...plot, unlocked: initiallyUnlocked(index) || plot.unlocked === true || !!(plot.tilled || plot.crop) };
  }
  function purchase(state, index) {
    const cost = priceFor(index);
    const plot = state?.plots?.[index];
    if (cost === null || !plot || !state?.player) return { ok: false, reason: 'invalid' };
    if (cost === 0 || plot.unlocked !== false) return { ok: false, reason: 'owned' };
    const requiredLevel = levelFor(index);
    if (!Number.isInteger(state.player.level) || state.player.level < requiredLevel) {
      return { ok: false, reason: 'level', requiredLevel, cost };
    }
    if (!Number.isFinite(state.player.coins) || state.player.coins < cost) {
      return { ok: false, reason: 'funds', cost };
    }
    // Synchronous check and debit prevent a second click from charging twice.
    state.player.coins -= cost;
    plot.unlocked = true;
    return { ok: true, cost };
  }
  window.LAND = Object.freeze({ priceFor, levelFor, initiallyUnlocked, nextLocked, normalizePlot, purchase });
})();
