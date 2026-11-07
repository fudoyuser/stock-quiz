/* Tiến độ cộng dồn theo phiên: gộp nhiều máy mà không đếm trùng hay ghi đè câu đã học. */
(function (root) {
  "use strict";
  const emptyCounter = () => ({ total: 0, right: 0, days: {} });
  const empty = () => ({ v: 2, base: { ...emptyCounter(), best: 0 }, actors: {}, settings: {} });
  const canon = x => JSON.stringify(x, (k, v) => v && typeof v === "object" && !Array.isArray(v)
    ? Object.fromEntries(Object.keys(v).sort().map(key => [key, v[key]])) : v);
  const number = n => Number.isSafeInteger(n) && n >= 0;
  const date = s => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
  function counter(c) {
    if (!c || !number(c.total) || !number(c.right) || c.right > c.total || !c.days || Array.isArray(c.days)) throw Error("Dữ liệu thống kê không hợp lệ.");
    for (const [day, n] of Object.entries(c.days)) if (!date(day) || !number(n)) throw Error("Dữ liệu ngày học không hợp lệ.");
    if (Object.values(c.days).reduce((a, b) => a + b, 0) > c.total) throw Error("Số câu theo ngày vượt tổng số câu.");
    return { total: c.total, right: c.right, days: { ...c.days } };
  }
  function setting(key, s) {
    if (!s || !number(s.at) || !number(s.value) || !(key === "goal" ? [20, 50, 100, 200].includes(s.value) : /^[A-Za-z0-9]+-(cur|best)$/.test(key) && s.value <= 100)) throw Error("Dữ liệu mục tiêu hoặc điểm không hợp lệ.");
    return { value: s.value, at: s.at };
  }
  function validate(x) {
    if (!x || x.v !== 2 || !x.base || !number(x.base.best) || !x.actors || !x.settings) throw Error("Phiên bản dữ liệu tiến độ không hợp lệ.");
    const out = empty(); out.base = { ...counter(x.base), best: x.base.best };
    for (const [id, c] of Object.entries(x.actors)) {
      if (!/^[a-f0-9-]{36}$/.test(id)) throw Error("Mã phiên học không hợp lệ.");
      out.actors[id] = counter(c);
    }
    for (const [key, s] of Object.entries(x.settings)) out.settings[key] = setting(key, s);
    return out;
  }
  function maxCounter(a, b) {
    const days = { ...a.days };
    for (const [day, n] of Object.entries(b.days)) days[day] = Math.max(days[day] || 0, n);
    // Lịch sử cũ chỉ có tổng chung: lấy mức lớn nhất để tránh nhập trùng.
    return { total: Math.max(a.total, b.total, Object.values(days).reduce((n, x) => n + x, 0)), right: Math.max(a.right, b.right), days };
  }
  function mergeSetting(key, x, y) {
    return !x ? y : !y ? x : key.endsWith("-best") && x.value !== y.value
      ? (x.value > y.value ? x : y) : (x.at > y.at || (x.at === y.at && x.value > y.value) ? x : y);
  }
  function merge(a, b) {
    a = validate(a); b = validate(b);
    const out = empty(); out.base = { ...maxCounter(a.base, b.base), best: Math.max(a.base.best, b.base.best) };
    for (const id of new Set([...Object.keys(a.actors), ...Object.keys(b.actors)])) out.actors[id] = maxCounter(a.actors[id] || emptyCounter(), b.actors[id] || emptyCounter());
    for (const key of new Set([...Object.keys(a.settings), ...Object.keys(b.settings)])) {
      const x = a.settings[key], y = b.settings[key];
      out.settings[key] = mergeSetting(key, x, y);
    }
    return out;
  }
  function summarize(x) {
    const s = { ...counter(x.base), best: x.base.best };
    for (const c of Object.values(x.actors)) {
      s.total += c.total; s.right += c.right;
      for (const [day, n] of Object.entries(c.days)) s.days[day] = (s.days[day] || 0) + n;
    }
    let run = 0, previous = 0;
    for (const day of Object.keys(s.days).filter(d => s.days[d] > 0).sort()) {
      const at = Date.parse(day); run = at - previous === 86400000 ? run + 1 : 1;
      previous = at; s.best = Math.max(s.best, run);
    }
    return s;
  }
  function answer(x, id, day, ok) {
    if (!/^[a-f0-9-]{36}$/.test(id) || !date(day)) throw Error("Phiên học không hợp lệ.");
    const c = x.actors[id] || (x.actors[id] = emptyCounter());
    c.total++; if (ok) c.right++; c.days[day] = (c.days[day] || 0) + 1;
  }
  function records(x) {
    return [ ["base", "legacy", x.base], ...Object.entries(x.actors).map(([id, c]) => ["actor", id, c]), ...Object.entries(x.settings).map(([key, s]) => ["setting", key, s]) ];
  }
  function fromRows(rows) {
    const x = empty();
    for (const row of rows) {
      if (!row.length || row.every(cell => !cell)) continue;
      if (row.length !== 4) throw Error("Bản ghi Google Sheet thiếu cột. Tiến độ trên máy vẫn được giữ.");
      const [type, id, , json] = row;
      let data; try { data = JSON.parse(json); } catch { throw Error("Có ô dữ liệu JSON bị sửa hoặc hỏng trong Google Sheet. Tiến độ trên máy vẫn được giữ."); }
      if (type === "base" && id === "legacy") {
        if (!number(data?.best)) throw Error("Dữ liệu kỷ lục chuỗi không hợp lệ.");
        x.base = { ...maxCounter(x.base, counter(data)), best: Math.max(x.base.best, data.best) };
      } else if (type === "actor" && /^[a-f0-9-]{36}$/.test(id)) x.actors[id] = maxCounter(x.actors[id] || emptyCounter(), counter(data));
      else if (type === "setting" && (id === "goal" || /^[A-Za-z0-9]+-(cur|best)$/.test(id))) x.settings[id] = mergeSetting(id, x.settings[id], setting(id, data));
      else throw Error("Có bản ghi Google Sheet không hợp lệ. Tiến độ trên máy vẫn được giữ.");
    }
    return x;
  }
  const api = { empty, validate, merge, summarize, answer, records, fromRows, canon };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.BDQProgress = api;
})(globalThis);
