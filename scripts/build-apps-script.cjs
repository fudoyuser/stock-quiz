// Xuất một file Code.gs duy nhất để dán vào Apps Script.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const output = '// BDQ_SERVER_BUNDLE_V1\n// Tự tạo bởi node scripts/build-apps-script.cjs. Dán toàn bộ file vào Apps Script V8.\n'
  + fs.readFileSync(path.join(root, 'progress-model.js'), 'utf8') + '\n'
  + fs.readFileSync(path.join(root, 'apps-script/server.js'), 'utf8');
const target = path.join(root, 'apps-script/Code.gs');
if (process.argv.includes('--check')) {
  if (fs.readFileSync(target, 'utf8') !== output) { process.stderr.write('Code.gs chưa được cập nhật.\n'); process.exit(1); }
} else fs.writeFileSync(target, output);
