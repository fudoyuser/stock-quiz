/* Google Identity Services + Sheets/Drive API; access token chỉ nằm trong bộ nhớ. */
(function () {
  "use strict";
  if (window.claude || !window.BDQProgress) return;
  const M = window.BDQProgress;
  const KEY = "bdq-google-progress-v2", ACCOUNT = "bdq-google-account";
  const APP = "stock-quiz-progress-v2", HEADER = ["Loại", "Mã", "Cập nhật", "Dữ liệu (JSON)"];
  const CLIENT = String(window.BDQ_GOOGLE_CLIENT_ID || "").trim();
  const SCOPE = "https://www.googleapis.com/auth/drive.file";
  const actor = crypto.randomUUID();
  let ledger, token = null, tokenUntil = 0, linked = false, tokenClient, timer = 0, pending = false, running = null, generation = 0;
  const requests = new Set();
  const panel = $("googleSync"), connect = $("googleConnect"), save = $("googleSave"), disconnect = $("googleDisconnect"), sheet = $("googleSheet");
  panel.hidden = false;

  function note(message, cls = "") {
    $("syncNote").className = "sync " + cls; $("syncNote").textContent = message;
  }
  function localNote() {
    note("💾 Tiến độ đã lưu trên trình duyệt. Đăng nhập Google để đồng bộ giữa các máy.");
  }
  function controls() {
    const signedIn = !!token && linked;
    connect.hidden = signedIn; save.hidden = !signedIn; disconnect.hidden = !signedIn;
    sheet.hidden = !signedIn || !sheet.href;
  }
  function legacy() {
    const x = M.empty();
    x.base = { total: stats.total, right: stats.right, best: stats.best || 0, days: { ...stats.days } };
    const at = localAt();
    if (store.get("bdq-goal")) x.settings.goal = { value: goal(), at };
    for (const P of PARTS) for (const suffix of ["cur", "best"]) {
      const key = `${P.id}-${suffix}`, v = store.get(`bdq-${key}`);
      if (v !== null && v !== "") x.settings[key] = { value: +v, at };
    }
    return M.validate(x);
  }
  function readLocal() {
    const raw = store.get(KEY); return raw ? M.validate(JSON.parse(raw)) : M.empty();
  }
  function persist() {
    ledger = M.merge(ledger, readLocal());
    store.set(KEY, JSON.stringify(ledger));
  }
  function apply() {
    persist();
    const wasApplying = sync.applying; sync.applying = true;
    try {
      stats = M.summarize(ledger);
      store.set("bdq-stats", JSON.stringify(stats));
      for (const [key, s] of Object.entries(ledger.settings)) {
        const id = key.replace(/-(cur|best)$/, "");
        if (key === "goal" || PART[id]) store.set(`bdq-${key}`, s.value);
      }
    } finally { sync.applying = wasApplying; }
    renderStats(); renderParts();
  }
  function schedule() {
    pending = true;
    if (!token || !linked) return;
    note("☁ Tiến độ trên máy đã lưu, đang chờ đồng bộ Google Sheets…");
    clearTimeout(timer); timer = setTimeout(run, 4000);
  }
  function changed(key) {
    if (key === "bdq-stats") return;
    const k = key.slice(4);
    if (k !== "goal" && !PART[k.replace(/-(cur|best)$/, "")]) return;
    ledger = M.merge(ledger, readLocal());
    ledger.settings[k] = { value: +store.get(key), at: Date.now() };
    apply(); schedule();
  }
  try {
    const saved = store.get(KEY); ledger = saved ? M.validate(JSON.parse(saved)) : legacy();
    apply();
  } catch {
    connect.disabled = true;
    note("⚠ Chưa đọc được bản sao tiến độ. Dữ liệu hiện tại vẫn được giữ; hãy sao lưu trình duyệt trước khi thiết lập đồng bộ.", "warn");
    return;
  }
  window.bdqGoogleSync = {
    recordAnswer(ok, day) {
      ledger = M.merge(ledger, readLocal()); M.answer(ledger, actor, day, ok);
      apply(); schedule();
    },
    changed
  };
  addEventListener("storage", e => {
    if (e.key !== KEY || !e.newValue) return;
    try {
      const merged = M.merge(ledger, M.validate(JSON.parse(e.newValue)));
      if (M.canon(merged) !== M.canon(ledger)) { ledger = merged; apply(); schedule(); }
    } catch { note("⚠ Chưa đọc được tiến độ từ tab khác. Bản trên tab này vẫn được giữ.", "warn"); }
  });

  function stop(message) {
    generation++; token = null; tokenUntil = 0; linked = false; clearTimeout(timer);
    for (const controller of requests) controller.abort();
    controls(); connect.textContent = "Đăng nhập lại Google";
    if (message) note(message, "warn");
  }
  async function api(url, method = "GET", body) {
    if (!token || Date.now() >= tokenUntil) {
      stop("💾 Phiên Google đã hết hạn. Tiến độ vẫn lưu trên máy; đăng nhập lại để đồng bộ.");
      throw Error("Phiên Google đã hết hạn. Hãy đăng nhập lại; tiến độ trên máy vẫn được giữ.");
    }
    const gen = generation, controller = new AbortController(); requests.add(controller);
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const res = await fetch(url, {
        method, signal: controller.signal,
        headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {})
      });
      if (gen !== generation) throw Error("Đã ngắt kết nối Google. Tiến độ trên máy vẫn được giữ.");
      if (res.status === 401) {
        stop("💾 Phiên Google đã hết hạn. Tiến độ vẫn lưu trên máy; đăng nhập lại để đồng bộ.");
        throw Error("Phiên Google đã hết hạn. Hãy đăng nhập lại; tiến độ trên máy vẫn được giữ.");
      }
      if (res.status === 403) throw Error("Google chưa cho phép đọc/ghi Sheet. Kiểm tra đã bật Google Sheets API, Google Drive API và cấp quyền tệp cho ứng dụng.");
      if (res.status === 429) throw Error("Google tạm giới hạn số lần đồng bộ. Tiến độ vẫn lưu trên máy; thử lại sau một phút.");
      if (!res.ok) throw Error(`Chưa đồng bộ được với Google (HTTP ${res.status}). Tiến độ trên máy vẫn được giữ.`);
      return await res.json();
    } finally { clearTimeout(timeout); requests.delete(controller); }
  }
  async function findSheets() {
    const files = []; let next = "";
    do {
      const query = new URLSearchParams({ q: `trashed = false and mimeType = 'application/vnd.google-apps.spreadsheet' and appProperties has { key='bdqApp' and value='${APP}' }`, fields: "nextPageToken,files(id,name,createdTime)", pageSize: "100", ...(next ? { pageToken: next } : {}) });
      const result = await api(`https://www.googleapis.com/drive/v3/files?${query}`);
      files.push(...(result.files || [])); next = result.nextPageToken || "";
    } while (next);
    return files.sort((a, b) => (a.createdTime || "").localeCompare(b.createdTime || "") || a.id.localeCompare(b.id));
  }
  const valuesURL = (id, range) => `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(id)}/values/${encodeURIComponent(range)}`;
  async function createSheet() {
    const result = await api("https://sheets.googleapis.com/v4/spreadsheets?fields=spreadsheetId", "POST", {
      properties: { title: "Bảng Điện Quiz — Tiến độ học tập" }, sheets: [{ properties: { title: "Progress" } }]
    });
    const id = result.spreadsheetId;
    await api(valuesURL(id, "Progress!A1:D1") + "?valueInputOption=RAW", "PUT", { values: [HEADER] });
    await api(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?fields=id`, "PATCH", { appProperties: { bdqApp: APP } });
    return { id, createdTime: new Date().toISOString() };
  }
  async function readSheet(id) {
    const result = await api(valuesURL(id, "Progress!A:D"));
    const rows = result.values || [];
    if (M.canon(rows[0]) !== M.canon(HEADER)) throw Error("Tab Progress trong Google Sheet đã đổi cấu trúc. Tiến độ trên máy vẫn được giữ; hãy khôi phục bốn cột ban đầu.");
    return M.fromRows(rows.slice(1));
  }
  async function syncOnce() {
    note("☁ Đang đồng bộ với Google Sheets…");
    let files = await findSheets();
    if (!files.length) {
      const created = await createSheet();
      files = await findSheets();
      if (!files.some(f => f.id === created.id)) files.push(created);
      files.sort((a, b) => (a.createdTime || "").localeCompare(b.createdTime || "") || a.id.localeCompare(b.id));
    }
    let remote = M.empty(), primary;
    for (const file of files) {
      const data = await readSheet(file.id);
      if (!primary) primary = data;
      remote = M.merge(remote, data);
    }
    ledger = M.merge(ledger, remote); apply();
    sheet.href = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(files[0].id)}/edit`; controls();
    const saved = new Map(M.records(primary).map(([type, id, data]) => [`${type}:${id}`, M.canon(data)]));
    const rows = M.records(ledger).filter(([type, id, data]) => saved.get(`${type}:${id}`) !== M.canon(data))
      .map(([type, id, data]) => [type, id, new Date().toISOString(), JSON.stringify(data)]);
    const snapshot = M.canon(ledger); pending = false;
    if (rows.length) {
      const result = await api(valuesURL(files[0].id, "Progress!A:D") + ":append?valueInputOption=RAW&insertDataOption=INSERT_ROWS", "POST", { values: rows });
      if (result.updates?.updatedRows !== rows.length) throw Error("Google chưa xác nhận đủ bản ghi. Tiến độ vẫn lưu trên máy; hãy thử đồng bộ lại.");
    }
    if (pending || snapshot !== M.canon(ledger)) schedule();
    else note("☁ Đã đồng bộ Google Sheets · dùng cùng tài khoản Google trên máy khác để tiếp tục học.", "ok");
  }
  function run() {
    clearTimeout(timer);
    if (!token || !linked) return Promise.resolve();
    if (running) { pending = true; return running; }
    const gen = generation;
    running = syncOnce().catch(e => {
      pending = true;
      if (gen === generation) note("⚠ " + (e.name === "AbortError" ? "Kết nối Google bị gián đoạn. Tiến độ trên máy vẫn được giữ; thử đồng bộ lại." : e.message), "warn");
    }).finally(() => { running = null; });
    return running;
  }
  async function authorized(response) {
    connect.disabled = false;
    if (response.error || !response.access_token) { localNote(); return; }
    connect.disabled = true;
    generation++; linked = false; token = response.access_token; tokenUntil = Date.now() + Math.max(0, (+response.expires_in || 3600) - 60) * 1000;
    const gen = generation;
    try {
      const info = await api("https://www.googleapis.com/drive/v3/about?fields=user(permissionId,emailAddress)");
      const id = info.user?.permissionId;
      if (!id) throw Error("Chưa xác định được tài khoản Google. Tiến độ trên máy vẫn được giữ.");
      const previous = store.get(ACCOUNT);
      if (previous && previous !== id) {
        stop("Trình duyệt đang giữ tiến độ của tài khoản Google khác. Hãy chọn đúng tài khoản hoặc dùng hồ sơ trình duyệt riêng để tránh trộn dữ liệu.");
        return;
      }
      store.set(ACCOUNT, id);
      linked = true;
      $("googleAccount").textContent = "Tài khoản: " + (info.user.emailAddress || "Google") + ". Tiến độ tự lưu sau khi bạn trả lời; bản trên máy vẫn dùng được khi mất mạng.";
      controls(); if (running) await running; await run();
    } catch (e) { if (gen === generation) { stop(); note("⚠ " + e.message, "warn"); } }
    finally { connect.disabled = false; }
  }
  connect.onclick = () => {
    if (!tokenClient) return;
    connect.disabled = true;
    note("Đang mở đăng nhập Google…");
    try { tokenClient.requestAccessToken({ prompt: "select_account" }); }
    catch { connect.disabled = false; note("Chưa mở được đăng nhập Google. Hãy cho phép cửa sổ đăng nhập rồi thử lại.", "warn"); }
  };
  save.onclick = run;
  disconnect.onclick = () => { stop(); localNote(); $("googleAccount").textContent = "Đã ngắt Google trên tab này. Tiến độ trên máy và Google Sheet vẫn được giữ."; };
  addEventListener("online", () => { if (token) run(); });
  addEventListener("focus", () => { if (token) run(); });
  document.addEventListener("visibilitychange", () => { if (token && (pending || document.visibilityState === "visible")) run(); });
  setInterval(() => { if (token && document.visibilityState === "visible") run(); }, 60000);

  localNote(); controls();
  $("googleAccount").textContent = "Lần đầu kết nối, tiến độ trên trình duyệt sẽ được gộp vào Google Sheet riêng trong Drive của bạn. Không cần chia sẻ Sheet công khai.";
  if (!/^[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.test(CLIENT)) {
    connect.disabled = true;
    note("💾 Tiến độ đã lưu trên trình duyệt. Chủ website cần hoàn tất thiết lập Google để bật đồng bộ.");
    return;
  }
  connect.disabled = true;
  const script = document.createElement("script"); script.src = "https://accounts.google.com/gsi/client"; script.async = true;
  const fail = () => { connect.disabled = true; note("Chưa tải được đăng nhập Google. Tiến độ vẫn lưu trên máy; kiểm tra kết nối và tải lại trang.", "warn"); };
  const timeout = setTimeout(fail, 20000);
  script.onerror = () => { clearTimeout(timeout); fail(); };
  script.onload = () => {
    clearTimeout(timeout);
    try {
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT, scope: SCOPE, callback: authorized,
        error_callback: () => { connect.disabled = false; note("Đăng nhập Google chưa hoàn tất. Tiến độ trên máy vẫn được giữ; bạn có thể thử lại.", "warn"); }
      });
      connect.disabled = false;
    } catch { fail(); }
  };
  document.head.append(script);
})();
