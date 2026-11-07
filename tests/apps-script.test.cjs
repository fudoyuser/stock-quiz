const { test } = require('node:test');
const assert = require('node:assert/strict');
const { fixture, signed, result, KEY, HEADER } = require('./apps-script-fixture.cjs');
const M = require('../progress-model.js');
const A = '11111111-1111-4111-8111-111111111111', B = '22222222-2222-4222-8222-222222222222';
const post = (f, p) => result(f.context.doPost({ postData: { contents: JSON.stringify(p) } }));
const get = f => result(f.context.doGet({ parameter: signed('read') }));
function baseline() { const x = M.empty(); x.base = { total: 428, right: 334, best: 2, days: { '2026-11-07': 77 } }; return x; }

test('setup creates private connection settings once and preserves existing progress', () => {
  const f = fixture(); delete f.state.properties.BDQ_SYNC_KEY;
  f.context.setup(); const key = f.state.properties.BDQ_SYNC_KEY;
  assert.match(key, /^[a-f0-9]{64}$/);
  assert.equal(f.state.sheets['Kết nối'][1][1], key);
  f.context.setup(); assert.equal(f.state.properties.BDQ_SYNC_KEY, key);
  assert.deepEqual(f.state.sheets.Progress[0], HEADER);
});
test('unsigned or wrongly signed reads reveal no progress and do not open the Sheet', () => {
  const f = fixture();
  const p = signed('read', '', 'b'.repeat(64));
  const r = result(f.context.doGet({ parameter: p }));
  assert.equal(r.ok, false); assert.equal(r.progress, undefined); assert.equal(f.state.opens, 0);
});
test('actual Apps Script merges two computers and compacts duplicate records', () => {
  const f = fixture(), a = baseline(), b = baseline();
  M.answer(a, A, '2026-11-07', true); M.answer(b, B, '2026-11-07', true);
  for (const x of [a, b, a]) assert.equal(post(f, signed('write', JSON.stringify(x))).ok, true);
  const r = get(f); assert.equal(r.ok, true);
  assert.equal(M.summarize(r.progress).total, 430); assert.equal(M.summarize(r.progress).right, 336);
  assert.equal(f.state.sheets.Progress.length, 4);
  assert.ok(!JSON.stringify(r).includes(KEY));
});
test('changed payloads and replayed requests cannot change progress', () => {
  const f = fixture(), p = signed('write', JSON.stringify(baseline()));
  assert.equal(post(f, p).ok, true); const before = JSON.stringify(f.state.sheets.Progress);
  assert.equal(post(f, p).ok, false);
  const forged = signed('write', JSON.stringify(baseline())); forged.payload = JSON.stringify(M.empty());
  assert.equal(post(f, forged).ok, false);
  assert.equal(JSON.stringify(f.state.sheets.Progress), before);
});
test('malformed counters and a corrupted Sheet are rejected without overwriting it', () => {
  const f = fixture(), malformed = baseline(); malformed.base.right = 999;
  assert.equal(post(f, signed('write', JSON.stringify(malformed))).ok, false);
  f.state.sheets.Progress[0][0] = 'edited'; const before = JSON.stringify(f.state.sheets.Progress);
  assert.equal(post(f, signed('write', JSON.stringify(baseline()))).ok, false);
  assert.equal(JSON.stringify(f.state.sheets.Progress), before);
});
test('expired signatures and a busy write lock leave progress untouched', () => {
  const f = fixture(), p = signed('write', JSON.stringify(baseline())); p.at = String(Date.now() - 600000);
  assert.equal(post(f, p).ok, false);
  f.state.busy = true;
  assert.equal(post(f, signed('write', JSON.stringify(baseline()))).ok, false);
  assert.equal(f.state.writes, 0);
});
test('JSONP callback injection is rejected; callback is covered by the signature', () => {
  const f = fixture(), p = signed('read'); p.callback = 'alert(1)//';
  const output = f.context.doGet({ parameter: p }); assert.equal(output.mime, 'application/json');
  assert.ok(!output.text.includes('alert(1)'));
  const q = signed('read'); q.callback = 'bdqSheets_' + 'b'.repeat(32);
  assert.equal(result(f.context.doGet({ parameter: q })).ok, false);
});
