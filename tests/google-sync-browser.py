"""Browser + actual Code.gs in a stubbed Apps Script runtime. No Google login needed."""
import json
import subprocess
import sys
from pathlib import Path
from urllib.parse import parse_qs, urlparse
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
BASE = 'http://127.0.0.1:8000'
ENDPOINT = 'https://script.google.com/macros/s/test-deployment/exec'
OTHER = 'https://script.google.com/macros/s/other-deployment/exec'
KEY = 'a' * 64  # Public fixture, not a real secret.
flags = {'offline': False, 'lose_response': False, 'reject_write': False, 'calls': 0}
backends = {ENDPOINT: None, OTHER: None}
errors = []
BOOTSTRAP = '--bootstrap' in sys.argv
SHARED = '--shared' in sys.argv


def apps_script(route):
    req = route.request
    endpoint = req.url.split('?')[0]
    assert KEY not in req.url  # The key must not appear in script URLs.
    assert req.method in ('GET', 'POST')  # No CORS preflight needed.
    flags['calls'] += 1
    if flags['offline']:
        route.abort('failed')
        return
    if req.method == 'POST' and flags['reject_write']:
        route.fulfill(content_type='application/json', body='{"ok":false}')
        return
    request = {'method': req.method, 'state': backends[endpoint], 'bootstrap': BOOTSTRAP, 'endpoint': endpoint}
    if req.method == 'GET':
        request['params'] = {k: v[0] for k, v in parse_qs(urlparse(req.url).query, keep_blank_values=True).items()}
    else:
        assert KEY not in req.post_data
        request['body'] = req.post_data
    result = subprocess.run(['node', str(ROOT / 'tests/apps-script-fixture.cjs')], input=json.dumps(request), text=True, capture_output=True, check=True)
    result = json.loads(result.stdout)
    backends[endpoint] = result['state']
    if endpoint == OTHER and backends[endpoint]['id'] == 'sheet-one':
        backends[endpoint]['id'] = 'sheet-two'
        backends[endpoint]['properties']['BDQ_SHEET_ID'] = 'sheet-two'
        # Re-run the read with the different Sheet identity.
        request['state'] = backends[endpoint]
        result = json.loads(subprocess.run(['node', str(ROOT / 'tests/apps-script-fixture.cjs')], input=json.dumps({**request, 'state': {**request['state'], 'cache': {}}}), text=True, capture_output=True, check=True).stdout)
        backends[endpoint] = result['state']
    if req.method == 'POST' and flags['lose_response']:
        flags['lose_response'] = False
        route.abort('failed')
    else:
        route.fulfill(content_type=result['mime'], body=result['text'])


def context(browser, seed=None):
    c = browser.new_context(viewport={'width': 390, 'height': 844})
    c.route('https://fonts.googleapis.com/**', lambda r: r.abort())
    c.route('https://fonts.gstatic.com/**', lambda r: r.abort())
    c.route('https://script.google.com/macros/s/**', apps_script)
    c.route('**/shared-config.json', lambda r: r.fulfill(json={'mode': 'shared' if SHARED else 'private', 'endpoint': ENDPOINT if SHARED else ''}))
    if seed:
        c.add_init_script('''if(!localStorage.getItem('fixture-seeded')) {
          localStorage.setItem('fixture-seeded','1');
          localStorage.setItem('bdq-stats',JSON.stringify(%s));
          localStorage.setItem('bdq-goal','200');
          localStorage.setItem('bdq-terms-best','80');
        }''' % json.dumps(seed))
    page = c.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(BASE, wait_until='domcontentloaded')
    return c, page


def connect(page, endpoint=ENDPOINT, key=KEY):
    if not page.locator('#sheetConfig').evaluate('(e)=>e.open'):
        page.locator('#sheetConfig summary').click()
    page.fill('#sheetEndpoint', endpoint)
    page.fill('#sheetKey', key)
    page.click('#googleConnect')
    expect(page.locator('#syncNote')).to_contain_text('Đã đồng bộ Google Sheets', timeout=15000)


def answer(page, ok=True):
    page.evaluate("setPart('terms')")
    page.click('#startBtn')
    index = page.evaluate('game.q.opts.findIndex(o=>o.id===game.q.ans)')
    page.locator('#opts .opt').nth(index if ok else (index+1)%4).click()
    page.click('#quitBtn')


def sync(page):
    page.click('#googleSave')
    expect(page.locator('#syncNote')).to_contain_text('Đã đồng bộ Google Sheets', timeout=15000)


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    if SHARED:
        seed = {'total': 428, 'right': 334, 'best': 2, 'days': {'2026-11-07': 77}}
        ca, a = context(browser, seed)
        expect(a.locator('#syncNote')).to_contain_text('Đã đồng bộ Google Sheets', timeout=15000)
        expect(a.locator('#sheetConfig')).to_be_hidden()
        expect(a.locator('#googleSetup')).to_be_hidden()
        assert a.evaluate("store.get('bdq-sheet-connection')") is None
        answer(a)
        sync(a)
        cb, b = context(browser)
        expect(b.locator('#syncNote')).to_contain_text('Đã đồng bộ Google Sheets', timeout=15000)
        assert b.evaluate('stats.total') == 429
        assert b.locator('#sheetEndpoint').input_value() == ''
        assert b.locator('#sheetKey').input_value() == ''
        assert b.evaluate("store.get('bdq-sheet-connection')") is None
        answer(a, False)
        answer(b)
        sync(a)
        sync(b)
        sync(a)
        assert a.evaluate('stats.total') == b.evaluate('stats.total') == 431
        cc, c = context(browser)
        expect(c.locator('#syncNote')).to_contain_text('Đã đồng bộ Google Sheets', timeout=15000)
        assert c.evaluate('stats.total') == 431
        flags['offline'] = True
        answer(b)
        b.click('#googleSave')
        expect(b.locator('#syncNote')).to_contain_text('Không truy cập được Apps Script')
        assert b.evaluate('stats.total') == 432
        flags['offline'] = False
        b.evaluate('window.dispatchEvent(new Event("online"))')
        expect(b.locator('#syncNote')).to_contain_text('Đã đồng bộ Google Sheets', timeout=15000)
        sync(a)
        assert a.evaluate('stats.total') == 432
        answer(a)
        flags['lose_response'] = True
        sync(a)
        sync(c)
        assert c.evaluate('stats.total') == 433
        b.reload(wait_until='domcontentloaded')
        expect(b.locator('#syncNote')).to_contain_text('Đã đồng bộ Google Sheets', timeout=15000)
        assert b.evaluate('stats.total') == 433
        assert b.evaluate('document.documentElement.scrollWidth<=innerWidth')
        assert not errors, errors
        print(json.dumps({'mode': 'public-shared', 'bootstrap': BOOTSTRAP, 'fresh_browsers': 3, 'manual_fields_entered': 0, 'login_required': False, 'final_shared_total': 433, 'offline_reconnect': 'passed', 'lost_response_retry': 'passed', 'page_errors': errors}))
        browser.close()
        sys.exit(0)
    c0, plain = context(browser)
    expect(plain.locator('#googleConnect')).to_be_enabled()
    answer(plain)
    assert plain.evaluate('stats.total') == 1
    plain.reload(wait_until='domcontentloaded')
    assert plain.evaluate('stats.total') == 1
    assert plain.evaluate('document.documentElement.scrollWidth<=innerWidth')
    assert flags['calls'] == 0
    c0.close()

    seed = {'total': 428, 'right': 334, 'best': 2, 'days': {'2026-11-07': 77}}
    ca, a = context(browser, seed)
    connect(a)
    assert a.evaluate('stats.total') == 428
    assert a.evaluate('goal()') == 200
    answer(a)
    sync(a)
    assert a.evaluate('stats.total') == 429

    cb, b = context(browser)
    assert b.evaluate('stats.total') == 0
    connect(b)
    assert b.evaluate('stats.total') == 429
    assert b.evaluate('goal()') == 200
    assert b.evaluate("store.get('bdq-terms-best')") == '80'
    answer(a, False)
    answer(b)
    sync(a)
    sync(b)
    sync(a)
    assert a.evaluate('stats.total') == b.evaluate('stats.total') == 431
    assert a.evaluate('stats.right') == b.evaluate('stats.right') == 336

    # Losing the POST response does not cause a false failure or duplicate answers.
    answer(a)
    flags['lose_response'] = True
    sync(a)
    sync(b)
    assert b.evaluate('stats.total') == 432

    # Opaque success is not a saved acknowledgement: read-back must contain the new answer.
    answer(a)
    flags['reject_write'] = True
    a.click('#googleSave')
    expect(a.locator('#syncNote')).to_contain_text('chưa xác nhận dữ liệu mới', timeout=15000)
    assert a.locator('#syncNote').get_attribute('class') == 'sync warn'
    flags['reject_write'] = False
    sync(a)
    sync(b)
    assert b.evaluate('stats.total') == 433

    # Offline learning survives reload and automatically reconnects without another login.
    flags['offline'] = True
    answer(b)
    b.click('#googleSave')
    expect(b.locator('#syncNote')).to_contain_text('Không truy cập được Apps Script')
    assert b.evaluate('stats.total') == 434
    b.reload(wait_until='domcontentloaded')
    assert b.evaluate('stats.total') == 434
    expect(b.locator('#syncNote')).to_contain_text('Không truy cập được Apps Script')
    flags['offline'] = False
    b.reload(wait_until='domcontentloaded')
    expect(b.locator('#syncNote')).to_contain_text('Đã đồng bộ Google Sheets')
    sync(a)
    assert a.evaluate('stats.total') == 434

    # A second tab shares local counters but contributes a unique session.
    a2 = ca.new_page()
    a2.on('pageerror', lambda error: errors.append(str(error)))
    a2.goto(BASE, wait_until='domcontentloaded')
    expect(a2.locator('#syncNote')).to_contain_text('Đã đồng bộ Google Sheets')
    answer(a2)
    a.wait_for_function('stats.total===435')
    answer(a)
    a2.wait_for_function('stats.total===436')
    sync(a)
    sync(b)
    assert b.evaluate('stats.total') == 436

    # Valid credentials to another Sheet still cannot silently mix old progress into it.
    if not b.locator('#sheetConfig').evaluate('(e)=>e.open'):
        b.locator('#sheetConfig summary').click()
    b.fill('#sheetEndpoint', OTHER)
    b.fill('#sheetKey', KEY)
    b.click('#googleConnect')
    expect(b.locator('#syncNote')).to_contain_text('một Sheet khác')
    assert backends[OTHER]['writes'] == 0
    connect(b)

    # A wrong sync key receives no data. The last good connection remains recoverable.
    b.locator('#sheetConfig summary').click()
    b.fill('#sheetKey', 'b'*64)
    b.click('#googleConnect')
    expect(b.locator('#syncNote')).to_contain_text('Mã đồng bộ không đúng')
    assert b.evaluate('stats.total') == 436
    connect(b)

    # A corrupt remote header blocks writes, preserving the local copy.
    backends[ENDPOINT]['sheets']['Progress'][0][0] = 'edited'
    before = backends[ENDPOINT]['writes']
    b.click('#googleSave')
    expect(b.locator('#syncNote')).to_contain_text('thay đổi cấu trúc')
    assert b.evaluate('stats.total') == 436
    assert backends[ENDPOINT]['writes'] == before
    backends[ENDPOINT]['sheets']['Progress'][0][0] = 'Loại'
    sync(b)
    assert b.evaluate('document.documentElement.scrollWidth<=innerWidth')

    # Disconnect forgets connection credentials, while preserving all practice progress.
    b.click('#googleDisconnect')
    assert b.evaluate("store.get('bdq-sheet-connection')") is None
    b.reload(wait_until='domcontentloaded')
    assert b.evaluate('stats.total') == 436
    assert b.locator('#sheetKey').input_value() == ''
    assert not errors, errors
    print(json.dumps({'apps_script_mode': 'auto-update' if BOOTSTRAP else 'standalone', 'old_progress_import': 428, 'cross_device_final_total': 436, 'offline_auto_reconnect': 'passed', 'lost_response_retry': 'passed', 'opaque_write_readback': 'passed', 'concurrent_tabs': 'passed', 'sheet_isolation': 'passed', 'wrong_key': 'passed', 'corrupt_remote': 'passed', 'disconnect_preserves_data': 'passed', 'mobile_width': 390, 'page_errors': errors}))
    browser.close()
