import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const context = { window: {} };
runInNewContext(readFileSync(new URL('../assets/land.js', import.meta.url), 'utf8'), context);
const land = context.window.LAND;
const fresh = (coins = 320, level = 1) => ({
  player: { coins, level, energy: 45 },
  plots: Array.from({ length: 12 }, (_, i) => land.normalizePlot({ tilled: false, crop: null }, i))
});

test('two free plots; each level 2–6 offers two paid plots', () => {
  assert.deepEqual(fresh().plots.flatMap((p, i) => p.unlocked ? [i] : []), [0, 1]);
  const order = [4, 5, 8, 9, 2, 6, 3, 7, 10, 11];
  assert.deepEqual(order.map(land.priceFor), [80, 100, 150, 200, 250, 300, 400, 500, 650, 800]);
  assert.deepEqual(order.map(land.levelFor), [2, 2, 3, 3, 4, 4, 5, 5, 6, 6]);
  for (const index of [-1, 12, 1.5, '2', NaN]) {
    assert.equal(land.priceFor(index), null);
    assert.equal(land.levelFor(index), null);
  }
});

test('legacy cultivated plots and purchased empty plots survive migration', () => {
  assert.equal(land.normalizePlot({ tilled: true }, 11).unlocked, true);
  assert.equal(land.normalizePlot({ crop: 'carrot' }, 10).unlocked, true);
  assert.equal(land.normalizePlot({ unlocked: true, tilled: false, crop: null }, 7).unlocked, true);
  assert.equal(land.normalizePlot({ tilled: false, crop: null }, 7).unlocked, false);
  assert.equal(land.normalizePlot({ unlocked: false, tilled: true }, 7).unlocked, true);
  assert.equal(land.normalizePlot({ unlocked: false }, 0).unlocked, true);
});

test('insufficient or invalid funds cannot mutate land even at the required level', () => {
  for (const coins of [79, -5, NaN, Infinity, '80']) {
    const state = fresh(coins, 2);
    assert.equal(land.purchase(state, 4).reason, 'funds');
    assert.equal(state.player.coins, coins);
    assert.equal(state.plots[4].unlocked, false);
  }
});

test('rich players still need the required level for every paid tier', () => {
  for (const index of [4, 5, 8, 9, 2, 6, 3, 7, 10, 11]) {
    const state = fresh(10000, land.levelFor(index) - 1);
    assert.equal(land.purchase(state, index).reason, 'level');
    assert.equal(state.player.coins, 10000);
    assert.equal(state.plots[index].unlocked, false);
  }
  for (const level of [null, NaN, Infinity, 1.5, '2']) {
    assert.equal(land.purchase(fresh(10000, level), 4).reason, 'level');
  }
});

test('exact level and funds unlock once, without tilling or spending energy', () => {
  const state = fresh(80, 2);
  assert.equal(land.purchase(state, 4).ok, true);
  assert.equal(state.player.coins, 0);
  assert.equal(state.player.energy, 45);
  assert.equal(state.plots[4].unlocked, true);
  assert.equal(state.plots[4].tilled, false);
  assert.equal(land.purchase(state, 4).reason, 'owned');
  assert.equal(state.player.coins, 0);
  const restored = JSON.parse(JSON.stringify(state));
  restored.plots = restored.plots.map(land.normalizePlot);
  assert.equal(restored.plots[4].unlocked, true);
  assert.equal(land.purchase(restored, 4).reason, 'owned');
});

test('all ten purchases consume their listed costs; suggestion respects level then price', () => {
  const state = fresh(3430, 6);
  for (const index of [4, 5, 8, 9, 2, 6, 3, 7, 10, 11]) {
    assert.equal(land.nextLocked(state.plots), index);
    assert.equal(land.purchase(state, index).ok, true);
  }
  assert.equal(state.player.coins, 0);
  assert.equal(state.plots.filter(p => p.unlocked).length, 12);
  assert.equal(land.nextLocked(state.plots), -1);
  assert.equal(land.purchase(state, 0).reason, 'owned');
  for (const index of [-1, 12, null, '2']) assert.equal(land.purchase(state, index).reason, 'invalid');
});

test('changing requirements never takes away already owned land', () => {
  const state = fresh(320, 1);
  state.plots[11] = land.normalizePlot({ unlocked: true, tilled: false, crop: null }, 11);
  assert.equal(state.plots[11].unlocked, true);
  assert.equal(land.purchase(state, 11).reason, 'owned');
  assert.equal(state.player.coins, 320);
});
