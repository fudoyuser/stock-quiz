"""Browser integration using mocked Google services; no real Google credentials."""
import copy
import json
import re
from urllib.parse import unquote, urlparse
from playwright.sync_api import sync_playwright, expect

BASE = 'http://127.0.0.1:8000'
HEADER = ['Loại', 'Mã', 'Cập nhật', 'Dữ liệu (JSON)']
state = {'files': {}, 'account': 'account-one', 'offline': False, 'expired': False, 'drop': False, 'writes': 0, 'data_calls': 0}
errors = []


def google(route):
    req = route.request
    url = req.url
    if 'accounts.google.com/gsi/client' in url:
        script = '''window.google={accounts:{oauth2:{initTokenClient:(options)=>({requestAccessToken:()=>options.callback({access_token:'mock-token',expires_in:3600})})}}};'''
        route.fulfill(status=200, content_type='application/javascript', body=script)
        return
    if state['offline']:
        route.fulfill(status=503, json={'error': 'offline fixture'})
        return
    if state['expired']:
        route.fulfill(status=401, json={'error': 'expired fixture'})
        return
    assert req.headers.get('authorization') == 'Bearer mock-token'
    path = unquote(urlparse(url).path)
    if not path.endswith('/about'):
        state['data_calls'] += 1
    body = req.post_data_json if req.method != 'GET' else None
    if path.endswith('/about'):
        route.fulfill(json={'user': {'permissionId': state['account'], 'emailAddress': state['account']+'@example.test'}})
    elif path == '/drive/v3/files' and req.method == 'GET':
        route.fulfill(json={'files': [{'id': k, 'createdTime': v['createdTime']} for k, v in state['files'].items() if v.get('marked') and v['account'] == state['account']]})
    elif path.startswith('/drive/v3/files/') and req.method == 'PATCH':
        key = path.split('/')[-1]
        assert body['appProperties']['bdqApp'] == 'stock-quiz-progress-v2'
        state['files'][key]['marked'] = True
        route.fulfill(json={'id': key})
    elif path == '/v4/spreadsheets' and req.method == 'POST':
        key = 'sheet-'+str(len(state['files'])+1)
        state['files'][key] = {'rows': [], 'account': state['account'], 'createdTime': f'2026-11-07T00:00:{len(state["files"]):02d}Z'}
        route.fulfill(json={'spreadsheetId': key})
    elif '/values/' in path:
        key = path.split('/')[3]
        f = state['files'][key]
        assert f['account'] == state['account']
        if req.method == 'GET':
            route.fulfill(json={'values': f['rows']})
        elif req.method == 'PUT':
            assert body['values'] == [HEADER]
            f['rows'] = copy.deepcopy(body['values'])
            route.fulfill(json={'updatedRows': 1})
        elif req.method == 'POST' and path.endswith(':append'):
            f['rows'].extend(copy.deepcopy(body['values']))
            state['writes'] += 1
            if state['drop']:
                state['drop'] = False
                route.abort('failed')  # Server accepted data; browser never got the acknowledgement.
            else:
                route.fulfill(json={'updates': {'updatedRows': len(body['values'])}})
        else:
            raise AssertionError((req.method, path))
    else:
        raise AssertionError((req.method, path))


def context(browser, seed=None, configured=True):
    c = browser.new_context(viewport={'width': 390, 'height': 844})
    c.route('https://fonts.googleapis.com/**', lambda r: r.abort())
    c.route('https://fonts.gstatic.com/**', lambda r: r.abort())
    c.route('**/google-config.js', lambda r: r.fulfill(content_type='application/javascript', body='window.BDQ_GOOGLE_CLIENT_ID='+json.dumps('test.apps.googleusercontent.com' if configured else '')+';'))
    c.route(re.compile(r'https://(accounts\.google\.com|www\.googleapis\.com|sheets\.googleapis\.com)/'), google)
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


def signin(page):
    expect(page.locator('#googleConnect')).to_be_enabled()
    page.click('#googleConnect')
    expect(page.locator('#syncNote')).to_contain_text('Đã đồng bộ Google Sheets')


def answer(page, ok=True):
    page.evaluate("setPart('terms')")
    page.click('#startBtn')
    index = page.evaluate('game.q.opts.findIndex(o=>o.id===game.q.ans)')
    page.locator('#opts .opt').nth(index if ok else (index+1)%4).click()
    page.click('#quitBtn')


def sync(page):
    page.click('#googleSave')
    expect(page.locator('#syncNote')).to_contain_text('Đã đồng bộ Google Sheets')


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    c0, plain = context(browser, configured=False)
    expect(plain.locator('#googleConnect')).to_be_disabled()
    answer(plain)
    assert plain.evaluate('stats.total') == 1
    plain.reload(wait_until='domcontentloaded')
    assert plain.evaluate('stats.total') == 1
    assert plain.evaluate('document.documentElement.scrollWidth<=innerWidth')
    c0.close()

    # The real screenshot's old totals, migrated without resetting progress.
    seed = {'total': 428, 'right': 334, 'best': 2, 'days': {'2026-11-07': 77}}
    ca, a = context(browser, seed)
    signin(a)
    assert len(state['files']) == 1
    assert a.evaluate('stats.total') == 428
    assert a.evaluate('goal()') == 200
    answer(a)
    sync(a)
    assert a.evaluate('stats.total') == 429

    # A new computer has no Google token or progress, and restores the first computer.
    cb, b = context(browser)
    assert b.evaluate('stats.total') == 0
    signin(b)
    assert b.evaluate('stats.total') == 429
    assert b.evaluate('goal()') == 200
    assert b.evaluate("store.get('bdq-terms-best')") == '80'
    assert len(state['files']) == 1

    # Independent answers are kept even when both computers started with the same total.
    answer(a, False)
    answer(b)
    sync(a)
    sync(b)
    sync(a)
    assert a.evaluate('stats.total') == b.evaluate('stats.total') == 431
    assert a.evaluate('stats.right') == b.evaluate('stats.right') == 336

    # Write acknowledged by Google but connection lost before browser sees response.
    answer(a)
    state['drop'] = True
    a.click('#googleSave')
    expect(a.locator('#syncNote')).to_have_class('sync warn')
    sync(a)
    sync(b)
    assert b.evaluate('stats.total') == 432

    # An offline answer survives a reload; login restores and uploads it once.
    state['offline'] = True
    answer(b)
    b.click('#googleSave')
    expect(b.locator('#syncNote')).to_contain_text('HTTP 503')
    assert b.evaluate('stats.total') == 433
    b.reload(wait_until='domcontentloaded')
    assert b.evaluate('stats.total') == 433
    state['offline'] = False
    signin(b)
    sync(a)
    assert a.evaluate('stats.total') == 433

    # Concurrent tabs in one browser keep separate counters and merge through storage events.
    a2 = ca.new_page()
    a2.on('pageerror', lambda error: errors.append(str(error)))
    a2.goto(BASE, wait_until='domcontentloaded')
    answer(a2)
    a.wait_for_function('stats.total===434')
    answer(a)
    a2.wait_for_function('stats.total===435')
    sync(a)
    sync(b)
    assert b.evaluate('stats.total') == 435

    # An expired login is visible, no progress disappears, and re-login recovers.
    state['expired'] = True
    b.click('#googleSave')
    expect(b.locator('#googleConnect')).to_be_visible()
    expect(b.locator('#syncNote')).to_contain_text('hết hạn')
    assert b.evaluate('stats.total') == 435
    state['expired'] = False
    signin(b)

    # Account switching cannot upload the previous account's progress to another user.
    b.click('#googleDisconnect')
    state['account'] = 'account-two'
    writes = state['writes']
    data_calls = state['data_calls']
    waiting_about = []
    b.route('https://www.googleapis.com/drive/v3/about?*', lambda r: waiting_about.append(r))
    b.click('#googleConnect')
    b.wait_for_timeout(100)
    assert len(waiting_about) == 1
    b.evaluate('window.dispatchEvent(new Event("focus"))')
    b.wait_for_timeout(100)
    assert state['data_calls'] == data_calls  # No Sheet access before identity is checked.
    waiting_about[0].fulfill(json={'user': {'permissionId': 'account-two', 'emailAddress': 'other@example.test'}})
    expect(b.locator('#syncNote')).to_contain_text('tài khoản Google khác')
    assert state['writes'] == writes
    b.unroute('https://www.googleapis.com/drive/v3/about?*')
    state['account'] = 'account-one'
    signin(b)

    # Corrupted Sheet must not overwrite local progress or produce a fake saved status.
    f = next(iter(state['files'].values()))
    f['rows'].append(['actor', '33333333-3333-4333-8333-333333333333', '', '{broken'])
    writes = state['writes']
    b.click('#googleSave')
    expect(b.locator('#syncNote')).to_contain_text('JSON bị sửa hoặc hỏng')
    assert b.evaluate('stats.total') == 435
    assert state['writes'] == writes
    f['rows'].pop()
    sync(b)

    # Two devices creating the first Sheet concurrently converge on the oldest Sheet.
    state['files']['sheet-extra'] = {
        'marked': True, 'account': 'account-one', 'createdTime': '2026-11-08T00:00:00Z',
        'rows': [HEADER, ['actor', '44444444-4444-4444-8444-444444444444', '', json.dumps({'total': 1, 'right': 1, 'days': {'2026-11-07': 1}})]]
    }
    sync(b)
    sync(a)
    assert a.evaluate('stats.total') == b.evaluate('stats.total') == 436
    assert '/sheet-1/' in b.locator('#googleSheet').get_attribute('href')

    # There is no access token in persistent browser storage.
    assert 'mock-token' not in b.evaluate('JSON.stringify({...localStorage})')
    assert b.evaluate('document.documentElement.scrollWidth<=innerWidth')
    assert not errors, errors
    print(json.dumps({'old_progress_import': 428, 'cross_device_final_total': 436, 'offline_reload': 'passed', 'lost_response_retry': 'passed', 'concurrent_tabs': 'passed', 'expired_token': 'passed', 'account_isolation': 'passed', 'corrupt_remote': 'passed', 'duplicate_sheet_convergence': 'passed', 'mobile_width': 390, 'page_errors': errors}))
    browser.close()
