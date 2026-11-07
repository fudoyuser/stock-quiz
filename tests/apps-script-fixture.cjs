// Minimal Apps Script runtime for executing the actual generated Code.gs in tests.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const HEADER = ['Loại', 'Mã', 'Cập nhật', 'Dữ liệu (JSON)'];
const KEY = 'a'.repeat(64); // Public test fixture, never a real sync key.
function fixture(saved, options = {}) {
  const state = saved || { id: 'sheet-one', properties: { BDQ_SHEET_ID: 'sheet-one', BDQ_SYNC_KEY: KEY }, sheets: { Progress: [[...HEADER]] }, cache: {}, writes: 0, opens: 0 };
  function sheet(name) {
    const cells = state.sheets[name];
    if (!cells) return null;
    return {
      getLastRow: () => cells.reduce((n, row, i) => row.some(x => x !== '' && x != null) ? i + 1 : n, 0),
      getMaxRows: () => Math.max(1000, cells.length), insertRowsAfter() {}, setFrozenRows() {}, setColumnWidth() {},
      getRange(row, col, height = 1, width = 1) {
        const range = {
          getValues: () => Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => cells[row - 1 + y]?.[col - 1 + x] ?? '')),
          getValue: () => cells[row - 1]?.[col - 1] ?? '',
          setNumberFormat: () => range,
          setValues(values) {
            for (let y = 0; y < height; y++) {
              cells[row - 1 + y] ||= [];
              for (let x = 0; x < width; x++) cells[row - 1 + y][col - 1 + x] = values[y][x];
            }
            state.writes++; return range;
          },
          clearContent() {
            for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (cells[row - 1 + y]) cells[row - 1 + y][col - 1 + x] = '';
          }
        };
        return range;
      }
    };
  }
  const ss = { getId: () => state.id, getSheetByName: sheet, insertSheet(name) { state.sheets[name] = []; return sheet(name); } };
  const props = { getProperty: k => state.properties[k] ?? null, setProperties(p) { Object.assign(state.properties, p); } };
  let held = false;
  const context = vm.createContext({
    console,
    PropertiesService: { getScriptProperties: () => props },
    Utilities: {
      getUuid: crypto.randomUUID, Charset: { UTF_8: 'UTF-8' },
      computeHmacSha256Signature: (message, key) => crypto.createHmac('sha256', key).update(message).digest(),
      base64EncodeWebSafe: bytes => Buffer.from(bytes).toString('base64url')
    },
    LockService: { getScriptLock: () => ({ tryLock: () => state.busy || held ? false : (held = true), releaseLock: () => { held = false; } }) },
    CacheService: { getScriptCache: () => ({ get: k => state.cache[k], put: (k, value) => { state.cache[k] = value; }, remove: k => { delete state.cache[k]; } }) },
    UrlFetchApp: { fetch(url, config) {
      state.fetches = (state.fetches || 0) + 1;
      if (!url.startsWith('https://raw.githubusercontent.com/fudoyuser/stock-quiz/main/apps-script/Code.gs?t=') || config.validateHttpsCertificates !== true) throw Error('Unexpected code source');
      const response = options.source ? options.source() : { status: 200, body: fs.readFileSync(path.join(__dirname, '../apps-script/Code.gs'), 'utf8') };
      return { getResponseCode: () => response.status, getContentText: () => response.body };
    } },
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ss,
      openById(id) { if (id !== state.id) throw Error('Wrong sheet'); state.opens++; return ss; },
      flush() {}, getUi: () => ({ alert() {}, createMenu() { const menu = { addItem: () => menu, addToUi() {} }; return menu; } })
    },
    ContentService: {
      MimeType: { JSON: 'application/json', JAVASCRIPT: 'application/javascript' },
      createTextOutput: text => ({ text, setMimeType(mime) { this.mime = mime; return this; } })
    }
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, options.bootstrap ? '../apps-script/Bootstrap.gs' : '../apps-script/Code.gs'), 'utf8'), context);
  return { context, state };
}
function signed(action, payload = '', key = KEY) {
  const p = { v: '1', action, at: String(Date.now()), nonce: crypto.randomBytes(16).toString('hex'), callback: action === 'read' ? 'bdqSheets_' + crypto.randomBytes(16).toString('hex') : '', payload };
  p.signature = crypto.createHmac('sha256', key).update(JSON.stringify([1, action, p.at, p.nonce, p.callback, payload])).digest('base64url');
  return p;
}
function result(output) {
  const text = output.text;
  return JSON.parse(text.startsWith('bdqSheets_') ? text.slice(text.indexOf('(') + 1, -2) : text);
}
module.exports = { fixture, signed, result, HEADER, KEY };
if (require.main === module) {
  let input = ''; process.stdin.setEncoding('utf8'); process.stdin.on('data', x => input += x);
  process.stdin.on('end', () => {
    const request = JSON.parse(input), f = fixture(request.state, { bootstrap: request.bootstrap });
    const response = request.method === 'GET' ? f.context.doGet({ parameter: request.params }) : f.context.doPost({ postData: { contents: request.body } });
    process.stdout.write(JSON.stringify({ text: response.text, mime: response.mime, state: f.state }));
  });
}
