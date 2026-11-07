// Chỉ cài một lần. Mã xử lý tự cập nhật từ repository stock-quiz của bạn.
function BDQ_server_() {
  var cache = CacheService.getScriptCache(), source = cache.get('bdq-server-v1');
  if (!source) {
    var response = UrlFetchApp.fetch('https://raw.githubusercontent.com/fudoyuser/stock-quiz/main/apps-script/Code.gs?t=' + Date.now(), { muteHttpExceptions: true, validateHttpsCertificates: true });
    source = response.getContentText();
    if (response.getResponseCode() !== 200 || source.indexOf('// BDQ_SERVER_BUNDLE_V1\n') !== 0) throw new Error('Chưa tải được mã đồng bộ từ GitHub. Tiến độ trên máy vẫn được giữ.');
    try { cache.put('bdq-server-v1', source, 60); } catch (_) {}
  }
  return new Function(source + '\nreturn {setup: setup, doGet: doGet, doPost: doPost};')();
}
function setup() {
  // Khai báo trực tiếp dịch vụ Sheet để Google cấp đúng quyền ngay lần đầu.
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Mở Apps Script từ Google Sheet bạn muốn dùng.');
  SpreadsheetApp.openById(ss.getId());
  BDQ_server_().setup();
}
function doGet(e) { return BDQ_server_().doGet(e); }
function doPost(e) { return BDQ_server_().doPost(e); }
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Bảng Điện Quiz').addItem('Thiết lập đồng bộ', 'setup').addItem('Cập nhật từ GitHub', 'updateServer').addToUi();
}
function updateServer() {
  CacheService.getScriptCache().remove('bdq-server-v1');
  BDQ_server_();
  SpreadsheetApp.getUi().alert('Đã tải mã mới từ GitHub. Không cần sửa mã hay triển khai lại Web app.');
}
