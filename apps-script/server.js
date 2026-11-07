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
function BDQ_request_(p, action) {
  if (!p || p.v !== '1' || p.action !== action || !/^[a-f0-9]{32}$/.test(p.nonce || '') || !/^\d{13}$/.test(String(p.at)) || Math.abs(Date.now() - Number(p.at)) > 300000)
    throw new Error('Yêu cầu quá hạn hoặc không hợp lệ. Kiểm tra giờ trên máy rồi thử lại.');
  if (typeof p.payload !== 'string' || p.payload.length > 500000 || ((action === 'read' || action === 'sharedRead') && p.payload !== '')) throw new Error('Dữ liệu gửi không hợp lệ hoặc quá lớn.');
}
function BDQ_auth_(p, action) {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('BDQ_SHEET_ID'), key = props.getProperty('BDQ_SYNC_KEY');
  if (!id || !key) throw new Error('Chủ Sheet cần chạy hàm setup một lần trong Apps Script.');
  BDQ_request_(p, action);
  var expected = Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(BDQ_message_(p), key, Utilities.Charset.UTF_8)).replace(/=+$/, '');
  var supplied = String(p.signature || ''), diff = expected.length ^ supplied.length;
  for (var i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ (supplied.charCodeAt(i) || 0);
  if (diff) throw new Error('Mã đồng bộ không đúng. Lấy lại mã ở tab Kết nối trong Sheet của bạn.');
  return id;
}
function BDQ_shared_(p, action) {
  BDQ_request_(p, action);
  var cache = CacheService.getScriptCache(), raw = cache.get('bdq-shared-config-v1');
  if (!raw) {
    var response = UrlFetchApp.fetch('https://raw.githubusercontent.com/fudoyuser/stock-quiz/main/shared-config.json?t=' + Date.now(), { muteHttpExceptions: true, validateHttpsCertificates: true });
    if (response.getResponseCode() !== 200) throw new Error('Chưa đọc được cấu hình số liệu chung của website.');
    raw = response.getContentText();
    try { cache.put('bdq-shared-config-v1', raw, 60); } catch (_) {}
  }
  var settings = JSON.parse(raw);
  // Chỉ dự án được chủ repository chọn mới công khai; các bản cài riêng vẫn cần chữ ký.
  var selected = settings && settings.mode === 'shared' && (settings.scriptId
    ? settings.scriptId === ScriptApp.getScriptId()
    : settings.endpoint === ScriptApp.getService().getUrl());
  if (!selected) throw new Error('Web app này chưa được chủ website chọn làm nguồn số liệu chung.');
  var id = PropertiesService.getScriptProperties().getProperty('BDQ_SHEET_ID');
  if (!id) throw new Error('Chủ Sheet cần chạy hàm setup một lần trong Apps Script.');
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
    var shared = p.action === 'sharedRead';
    var id = shared ? BDQ_shared_(p, 'sharedRead') : BDQ_auth_(p, 'read');
    var result = BDQ_locked_(p, function () {
      return { ok: true, service: BDQ_SERVICE, shared: shared, spreadsheetId: id, progress: BDQ_read_(SpreadsheetApp.openById(id)) };
    });
    return BDQ_output_(result, callback);
  } catch (error) { return BDQ_output_({ ok: false, error: String(error.message || error) }, callback); }
}
function doPost(e) {
  try {
    if (!e || !e.postData || e.postData.contents.length > 1100000) throw new Error('Yêu cầu ghi không hợp lệ.');
    var p = JSON.parse(e.postData.contents);
    var id = p.action === 'sharedWrite' ? BDQ_shared_(p, 'sharedWrite') : BDQ_auth_(p, 'write');
    if (p.callback !== '') throw new Error('Yêu cầu ghi không hợp lệ.');
    var incoming = BDQProgress.validate(JSON.parse(p.payload));
    BDQ_locked_(p, function () {
      var ss = SpreadsheetApp.openById(id), merged = BDQProgress.merge(BDQ_read_(ss), incoming);
      BDQ_write_(ss, merged);
    });
    return BDQ_output_({ ok: true });
  } catch (error) { return BDQ_output_({ ok: false, error: String(error.message || error) }); }
}
