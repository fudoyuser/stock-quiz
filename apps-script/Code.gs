// BDQ_SERVER_BUNDLE_V1
// Tự tạo bởi node scripts/build-apps-script.cjs. Dán toàn bộ file vào Apps Script V8.
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

/* Chạy trong Google Apps Script V8, gắn với Google Sheet của bạn. */
var BDQ_HEADER = ['Loại', 'Mã', 'Cập nhật', 'Dữ liệu (JSON)'];
var BDQ_SERVICE = 'stock-quiz-progress-v2';

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Bảng Điện Quiz').addItem('Thiết lập đồng bộ', 'setup').addToUi();
}

function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Mở Apps Script từ menu Tiện ích mở rộng của Google Sheet bạn muốn dùng.');
  var progress = ss.getSheetByName('Progress');
  if (progress && progress.getLastRow() && JSON.stringify(progress.getRange(1, 1, 1, 4).getValues()[0]) !== JSON.stringify(BDQ_HEADER))
    throw new Error('Đã có tab Progress chứa dữ liệu khác. Đổi tên tab đó trước khi thiết lập.');
  var settings = ss.getSheetByName('Kết nối');
  if (settings && settings.getLastRow() && settings.getRange(1, 1).getValue() !== 'Bảng Điện Quiz')
    throw new Error('Đã có tab Kết nối chứa dữ liệu khác. Đổi tên tab đó trước khi thiết lập.');
  var props = PropertiesService.getScriptProperties();
  var key = props.getProperty('BDQ_SYNC_KEY');
  if (!key || !/^[a-f0-9]{64}$/.test(key)) key = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
  props.setProperties({ BDQ_SHEET_ID: ss.getId(), BDQ_SYNC_KEY: key });
  if (!progress) progress = ss.insertSheet('Progress');
  if (!progress.getLastRow()) progress.getRange(1, 1, 1, 4).setValues([BDQ_HEADER]);
  progress.setFrozenRows(1);
  if (!settings) settings = ss.insertSheet('Kết nối');
  settings.getRange(1, 1, 6, 2).setNumberFormat('@').setValues([
    ['Bảng Điện Quiz', 'Đồng bộ bằng Apps Script'],
    ['Mã đồng bộ', key],
    ['Website', 'https://fudoyuser.github.io/stock-quiz/'],
    ['Triển khai', 'Deploy → New deployment → Web app; Execute as: Me; Who has access: Anyone'],
    ['Kết nối các máy', 'Nhập cùng URL /exec và mã đồng bộ ở trên vào website.'],
    ['Lưu ý', 'Giữ Sheet và mã này riêng tư. Không cần OAuth Client ID.']
  ]);
  settings.setColumnWidth(1, 170); settings.setColumnWidth(2, 600);
  SpreadsheetApp.getUi().alert('Đã thiết lập. Mở tab Kết nối để lấy mã, rồi triển khai Web app theo hướng dẫn.');
}

function BDQ_message_(p) {
  return JSON.stringify([1, p.action, String(p.at), p.nonce, p.callback || '', p.payload || '']);
}
function BDQ_auth_(p, action) {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('BDQ_SHEET_ID'), key = props.getProperty('BDQ_SYNC_KEY');
  if (!id || !key) throw new Error('Chủ Sheet cần chạy hàm setup một lần trong Apps Script.');
  if (!p || p.v !== '1' || p.action !== action || !/^[a-f0-9]{32}$/.test(p.nonce || '') || !/^\d{13}$/.test(String(p.at)) || Math.abs(Date.now() - Number(p.at)) > 300000)
    throw new Error('Yêu cầu quá hạn hoặc không hợp lệ. Kiểm tra giờ trên máy rồi thử lại.');
  if (typeof p.payload !== 'string' || p.payload.length > 500000 || (action === 'read' && p.payload !== '')) throw new Error('Dữ liệu gửi không hợp lệ hoặc quá lớn.');
  var expected = Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(BDQ_message_(p), key, Utilities.Charset.UTF_8)).replace(/=+$/, '');
  var supplied = String(p.signature || ''), diff = expected.length ^ supplied.length;
  for (var i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ (supplied.charCodeAt(i) || 0);
  if (diff) throw new Error('Mã đồng bộ không đúng. Lấy lại mã ở tab Kết nối trong Sheet của bạn.');
  return id;
}
function BDQ_locked_(p, fn) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) throw new Error('Sheet đang bận. Tiến độ vẫn ở trên máy; hãy thử lại.');
  try {
    var cache = CacheService.getScriptCache(), key = 'bdq-request-' + p.nonce;
    if (cache.get(key)) throw new Error('Yêu cầu này đã được xử lý. Hãy đồng bộ lại.');
    cache.put(key, '1', 300);
    return fn();
  } finally { lock.releaseLock(); }
}
function BDQ_read_(ss) {
  var sheet = ss.getSheetByName('Progress');
  if (!sheet || !sheet.getLastRow()) throw new Error('Chưa có tab Progress. Chạy setup trước khi kết nối.');
  var rows = sheet.getRange(1, 1, sheet.getLastRow(), 4).getValues();
  if (JSON.stringify(rows[0]) !== JSON.stringify(BDQ_HEADER)) throw new Error('Tab Progress đã thay đổi cấu trúc. Khôi phục bốn cột ban đầu trước khi đồng bộ.');
  return BDQProgress.fromRows(rows.slice(1));
}
function BDQ_write_(ss, progress) {
  var sheet = ss.getSheetByName('Progress'), previous = sheet.getLastRow(), now = new Date().toISOString();
  var rows = [BDQ_HEADER].concat(BDQProgress.records(progress).map(function (record) {
    var json = JSON.stringify(record[2]);
    if (json.length > 45000) throw new Error('Một bản ghi quá lớn để lưu trong ô Sheet. Tiến độ trên máy vẫn được giữ.');
    return [record[0], record[1], now, json];
  }));
  if (rows.length > sheet.getMaxRows()) sheet.insertRowsAfter(sheet.getMaxRows(), rows.length - sheet.getMaxRows());
  // Ghi bản đầy đủ trước, chỉ xóa phần dư sau khi ghi thành công.
  sheet.getRange(1, 1, rows.length, 4).setValues(rows);
  if (previous > rows.length) sheet.getRange(rows.length + 1, 1, previous - rows.length, 4).clearContent();
  SpreadsheetApp.flush();
}
function BDQ_output_(value, callback) {
  var json = JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  return ContentService.createTextOutput(callback ? callback + '(' + json + ');' : json)
    .setMimeType(callback ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON);
}
function doGet(e) {
  var p = e && e.parameter || {}, callback = p.callback;
  if (!/^bdqSheets_[a-f0-9]{32}$/.test(callback || '')) return BDQ_output_({ ok: false, error: 'Callback không hợp lệ.' });
  try {
    var id = BDQ_auth_(p, 'read');
    var result = BDQ_locked_(p, function () {
      return { ok: true, service: BDQ_SERVICE, spreadsheetId: id, progress: BDQ_read_(SpreadsheetApp.openById(id)) };
    });
    return BDQ_output_(result, callback);
  } catch (error) { return BDQ_output_({ ok: false, error: String(error.message || error) }, callback); }
}
function doPost(e) {
  try {
    if (!e || !e.postData || e.postData.contents.length > 1100000) throw new Error('Yêu cầu ghi không hợp lệ.');
    var p = JSON.parse(e.postData.contents), id = BDQ_auth_(p, 'write');
    if (p.callback !== '') throw new Error('Yêu cầu ghi không hợp lệ.');
    var incoming = BDQProgress.validate(JSON.parse(p.payload));
    BDQ_locked_(p, function () {
      var ss = SpreadsheetApp.openById(id), merged = BDQProgress.merge(BDQ_read_(ss), incoming);
      BDQ_write_(ss, merged);
    });
    return BDQ_output_({ ok: true });
  } catch (error) { return BDQ_output_({ ok: false, error: String(error.message || error) }); }
}
