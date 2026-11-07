const { test } = require('node:test');
const assert = require('node:assert/strict');
const M = require('../progress-model.js');
const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const DAY = '2026-11-07';
const clone = x => JSON.parse(JSON.stringify(x));
const rows = x => M.records(x).map(([type, id, data]) => [type, id, '2026-11-07T12:00:00Z', JSON.stringify(data)]);
function legacy() {
  const x = M.empty();
  x.base = { total: 428, right: 334, best: 2, days: { [DAY]: 77 } };
  x.settings.goal = { value: 200, at: 100 };
  return x;
}

test('imports old progress onto an empty computer without counting it twice', () => {
  const x = legacy();
  assert.equal(M.summarize(M.merge(M.empty(), x)).total, 428);
  assert.deepEqual(M.merge(x, x), x);
  assert.equal(M.merge(M.empty(), x).settings.goal.value, 200);
});

test('two computers retain independent offline answers on the same day', () => {
  const a = legacy(), b = legacy();
  M.answer(a, A, DAY, true); M.answer(a, A, DAY, false);
  for (const ok of [true, true, false]) M.answer(b, B, DAY, ok);
  const result = M.summarize(M.merge(a, b));
  assert.equal(result.total, 433); assert.equal(result.right, 337);
  assert.equal(result.days[DAY], 82);
});

test('replayed, reordered and duplicated Sheet rows do not duplicate learning', () => {
  const a = legacy(); M.answer(a, A, DAY, true);
  const old = clone(a); M.answer(a, A, DAY, false);
  const log = [...rows(a), ...rows(old), ...rows(a)].reverse();
  assert.deepEqual(M.fromRows(log), a);
  assert.equal(M.summarize(M.fromRows(log)).total, 430);
});

test('new sessions after reload preserve old session counters', () => {
  let x = legacy(); M.answer(x, A, DAY, true);
  x = M.validate(JSON.parse(JSON.stringify(x)));
  M.answer(x, B, DAY, true);
  assert.equal(M.summarize(x).total, 430);
  assert.equal(M.summarize(x).right, 336);
});

test('goal and current scores follow last edit; best score never decreases', () => {
  const a = legacy(), b = legacy();
  a.settings['terms-best'] = { value: 90, at: 100 };
  b.settings['terms-best'] = { value: 60, at: 200 };
  a.settings['terms-cur'] = { value: 90, at: 100 };
  b.settings['terms-cur'] = { value: 60, at: 200 };
  b.settings.goal = { value: 100, at: 200 };
  const merged = M.merge(a, b);
  assert.equal(merged.settings['terms-best'].value, 90);
  assert.equal(merged.settings['terms-cur'].value, 60);
  assert.equal(merged.settings.goal.value, 100);
});

test('merging is commutative, associative and idempotent', () => {
  const a = legacy(), b = legacy(), c = M.empty();
  M.answer(a, A, DAY, true); M.answer(b, B, DAY, false);
  c.settings.goal = { value: 100, at: 100 };
  assert.deepEqual(M.merge(a, b), M.merge(b, a));
  assert.deepEqual(M.merge(M.merge(a, b), c), M.merge(a, M.merge(b, c)));
  assert.deepEqual(M.merge(a, a), a);
});

test('streak crosses month boundaries and keeps historical best', () => {
  const a = M.empty();
  for (const day of ['2026-10-31', '2026-11-01', '2026-11-02']) M.answer(a, A, day, true);
  assert.equal(M.summarize(a).best, 3);
  a.base.best = 12;
  assert.equal(M.summarize(a).best, 12);
});

test('corrupt remote records are rejected before merging', () => {
  for (const bad of [
    ['actor', A, '', '{bad json'],
    ['actor', A, '', JSON.stringify({ total: 1, right: 2, days: {} })],
    ['actor', A, '', JSON.stringify({ total: 1, right: 0, days: { [DAY]: 3 } })],
    ['setting', 'goal', '', JSON.stringify({ value: 999, at: 100 })],
    ['setting', '__proto__', '', JSON.stringify({ value: 50, at: 100 })],
    ['actor', A]
  ]) assert.throws(() => M.fromRows([bad]));
});

test('independent old histories are merged conservatively, not added blindly', () => {
  const a = legacy(), b = legacy();
  b.base.total = 450; b.base.right = 350;
  const stats = M.summarize(M.merge(a, b));
  assert.equal(stats.total, 450); assert.equal(stats.right, 350);
});
