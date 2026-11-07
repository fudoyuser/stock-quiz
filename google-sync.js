/* Google Sheets qua Apps Script: mã riêng trên mỗi máy, không cần OAuth Client ID. */
(function () {
  "use strict";
  if (window.claude || !window.BDQProgress) return;
  const M = window.BDQProgress, KEY = "bdq-google-progress-v2", CONNECTION = "bdq-sheet-connection", BINDING = "bdq-sheet-id";
  const actor = crypto.randomUUID(), requests = new Set();
  const panel = $("googleSync"), connect = $("googleConnect"), save = $("googleSave"), disconnect = $("googleDisconnect"), sheet = $("googleSheet"), config = $("sheetConfig");
  let ledger, connection = null, active = false, timer = 0, pending = false, running = null, generation = 0;
  panel.hidden = false;
  function note(message, cls = "") {
    $("syncNote").className = "sync " + cls; $("syncNote").textContent = message;
  }
  function localNote() { note("💾 Tiến độ đã lưu trên trình duyệt. Kết nối Google Sheet để đồng bộ giữa các máy."); }
  function controls() {
    save.hidden = !active; disconnect.hidden = !active;
    sheet.hidden = !active || !sheet.href;
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
  function readLocal() { const raw = store.get(KEY); return raw ? M.validate(JSON.parse(raw)) : M.empty(); }
  function apply() {
    ledger = M.merge(ledger, readLocal()); store.set(KEY, JSON.stringify(ledger));
    const wasApplying = sync.applying; sync.applying = true;
    try {
      stats = M.summarize(ledger); store.set("bdq-stats", JSON.stringify(stats));
      for (const [key, s] of Object.entries(ledger.settings)) {
        if (key === "goal" || PART[key.replace(/-(cur|best)$/, "")]) store.set(`bdq-${key}`, s.value);
      }
    } finally { sync.applying = wasApplying; }
    renderStats(); renderParts();
  }
  function schedule() {
    pending = true;
    if (!active) return;
    note("☁ Đã lưu trên máy, đang chờ đồng bộ Google Sheets…");
    clearTimeout(timer); timer = setTimeout(run, 4000);
  }
  try { ledger = store.get(KEY) ? readLocal() : legacy(); apply(); }
  catch {
    connect.disabled = true;
    note("⚠ Chưa đọc được bản sao tiến độ. Dữ liệu hiện tại vẫn được giữ; hãy sao lưu trình duyệt trước khi kết nối.", "warn");
    return;
  }
  window.bdqGoogleSync = {
    recordAnswer(ok, day) { ledger = M.merge(ledger, readLocal()); M.answer(ledger, actor, day, ok); apply(); schedule(); },
    changed(key) {
      if (key === "bdq-stats") return;
      const k = key.slice(4);
      if (k !== "goal" && !PART[k.replace(/-(cur|best)$/, "")]) return;
      ledger = M.merge(ledger, readLocal()); ledger.settings[k] = { value: +store.get(key), at: Date.now() };
      apply(); schedule();
    }
  };
  addEventListener("storage", e => {
    if (e.key !== KEY || !e.newValue) return;
    try {
      const merged = M.merge(ledger, M.validate(JSON.parse(e.newValue)));
      if (M.canon(merged) !== M.canon(ledger)) { ledger = merged; apply(); schedule(); }
    } catch { note("⚠ Chưa đọc được tiến độ từ tab khác. Bản trên tab này vẫn được giữ.", "warn"); }
  });
  function validConnection(value) {
    if (!value || typeof value.endpoint !== "string" || !/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(value.endpoint) || !/^[a-f0-9]{64}$/.test(value.key))
      throw Error("Nhập đường dẫn Web app của Apps Script kết thúc bằng /exec và mã đồng bộ ở tab Kết nối trong Sheet.");
    return { endpoint: value.endpoint, key: value.key };
  }
  function stop() {
    generation++; active = false; clearTimeout(timer);
    for (const cancel of [...requests]) cancel();
    controls();
  }
  async function signed(action, payload, callback = "") {
    const value = connection, gen = generation;
    if (!value) throw Error("Chưa kết nối Google Sheet.");
    const at = String(Date.now()), nonce = crypto.randomUUID().replace(/-/g, "");
    const message = JSON.stringify([1, action, at, nonce, callback, payload]);
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(value.key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const bytes = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message)));
    const signature = btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    if (gen !== generation) throw Error("Đã ngắt kết nối.");
    return { v: "1", action, at, nonce, callback, payload, signature };
  }
  async function read() {
    const callback = "bdqSheets_" + crypto.randomUUID().replace(/-/g, "");
    const params = await signed("read", "", callback), endpoint = connection.endpoint;
    return new Promise((resolve, reject) => {
      const script = document.createElement("script"); let finished = false;
      const cleanup = (late = false) => {
        clearTimeout(timeout); requests.delete(cancel); script.remove();
        if (late) { window[callback] = () => {}; setTimeout(() => delete window[callback], 60000); }
        else delete window[callback];
      };
      const fail = message => { if (!finished) { finished = true; cleanup(true); reject(Error(message)); } };
      const cancel = () => fail("Đã ngắt kết nối. Tiến độ trên máy vẫn được giữ.");
      const timeout = setTimeout(() => fail("Chưa nhận được phản hồi Apps Script. Kiểm tra đường dẫn /exec, quyền Anyone và kết nối mạng; tiến độ vẫn lưu trên máy."), 20000);
      requests.add(cancel);
      window[callback] = data => {
        if (finished) return;
        finished = true; cleanup();
        if (!data || data.ok !== true) return reject(Error(data?.error || "Apps Script chưa xác nhận kết nối."));
        if (data.service !== "stock-quiz-progress-v2" || !/^[A-Za-z0-9_-]+$/.test(data.spreadsheetId || "")) return reject(Error("Đường dẫn không phải Apps Script của Bảng Điện Quiz."));
        try { resolve({ progress: M.validate(data.progress), spreadsheetId: data.spreadsheetId }); } catch { reject(Error("Dữ liệu trong Sheet không hợp lệ. Tiến độ trên máy vẫn được giữ.")); }
      };
      script.onerror = () => fail("Không truy cập được Apps Script. Kiểm tra mạng, đường dẫn /exec và quyền truy cập Anyone.");
      script.referrerPolicy = "no-referrer";
      // URL chỉ chứa chữ ký ngắn hạn; mã đồng bộ không được đưa lên URL.
      script.src = endpoint + "?" + new URLSearchParams(params); document.head.append(script);
    });
  }
  async function write(snapshot) {
    const body = await signed("write", JSON.stringify(snapshot)), controller = new AbortController();
    const cancel = () => controller.abort(); requests.add(cancel);
    const timeout = setTimeout(cancel, 20000);
    try {
      // Apps Script không cung cấp CORS tùy chỉnh. Phản hồi opaque không được coi là đã lưu.
      await fetch(connection.endpoint, { method: "POST", mode: "no-cors", credentials: "omit", referrerPolicy: "no-referrer", headers: { "Content-Type": "text/plain;charset=UTF-8" }, body: JSON.stringify(body), signal: controller.signal });
    } finally { clearTimeout(timeout); requests.delete(cancel); }
  }
  function checkSheet(result) {
    const previous = store.get(BINDING);
    if (previous && previous !== result.spreadsheetId) throw Error("Trình duyệt đang giữ tiến độ của một Sheet khác. Dùng cùng Sheet hoặc hồ sơ trình duyệt riêng để tránh trộn dữ liệu.");
    store.set(BINDING, result.spreadsheetId);
  }
  async function syncOnce() {
    note("☁ Đang đồng bộ Google Sheets…");
    let remote = await read(); checkSheet(remote);
    active = true; store.set(CONNECTION, JSON.stringify(connection)); config.open = false;
    sheet.href = `https://docs.google.com/spreadsheets/d/${remote.spreadsheetId}/edit`; controls();
    ledger = M.merge(ledger, remote.progress); apply();
    const snapshot = M.validate(ledger), version = M.canon(snapshot); pending = false;
    if (version !== M.canon(remote.progress)) {
      let writeError;
      try { await write(snapshot); } catch (e) { writeError = e; }
      // Đọc lại trạng thái thật để xác nhận: cả trường hợp POST mất phản hồi nhưng đã ghi.
      let confirmed = false;
      for (let attempt = 0; attempt < 4; attempt++) {
        if (attempt) await new Promise(resolve => setTimeout(resolve, 300 * attempt));
        remote = await read(); checkSheet(remote);
        if (M.canon(M.merge(remote.progress, snapshot)) === M.canon(remote.progress)) { confirmed = true; break; }
      }
      if (!confirmed) throw Error(writeError ? "Kết nối ghi bị gián đoạn; Sheet chưa xác nhận lưu. Tiến độ vẫn giữ trên máy, sẽ thử lại khi kết nối ổn định." : "Sheet chưa xác nhận dữ liệu mới. Kiểm tra đã triển khai bản Apps Script mới nhất; tiến độ trên máy vẫn được giữ.");
      ledger = M.merge(ledger, remote.progress); apply();
    }
    const newer = M.canon(ledger) !== M.canon(M.merge(snapshot, remote.progress));
    if (pending || newer) schedule();
    else note("☁ Đã đồng bộ Google Sheets · các máy dùng cùng đường dẫn và mã đồng bộ để tiếp tục học.", "ok");
  }
  function run() {
    clearTimeout(timer);
    if (!connection) return Promise.resolve();
    if (running) { pending = true; return running; }
    const gen = generation;
    running = syncOnce().catch(e => {
      pending = true;
      if (gen === generation) { note("⚠ " + e.message, "warn"); if (!active) config.open = true; }
    }).finally(() => { running = null; });
    return running;
  }
  $("sheetForm").onsubmit = async e => {
    e.preventDefault(); stop();
    try { connection = validConnection({ endpoint: $("sheetEndpoint").value.trim(), key: $("sheetKey").value.trim() }); }
    catch (e) { note(e.message, "warn"); return; }
    connect.disabled = true;
    if (running) await running;
    await run(); connect.disabled = false;
  };
  save.onclick = run;
  disconnect.onclick = () => {
    stop(); connection = null;
    try { localStorage.removeItem(CONNECTION); } catch {} delete memStore[CONNECTION];
    $("sheetKey").value = ""; config.open = true; localNote();
  };
  addEventListener("online", () => { if (active) run(); });
  addEventListener("focus", () => { if (active) run(); });
  document.addEventListener("visibilitychange", () => { if (active && (pending || document.visibilityState === "visible")) run(); });
  setInterval(() => { if (active && document.visibilityState === "visible") run(); }, 60000);
  localNote(); controls();
  $("googleAccount").textContent = "Thiết lập một lần trên mỗi máy. Tiến độ cũ được gộp vào Sheet; mất mạng vẫn tiếp tục học được.";
  try {
    const saved = store.get(CONNECTION);
    if (saved) {
      connection = validConnection(JSON.parse(saved));
      $("sheetEndpoint").value = connection.endpoint; $("sheetKey").value = connection.key;
      run();
    } else config.open = true;
  } catch { config.open = true; note("Chưa đọc được thiết lập kết nối. Nhập lại đường dẫn và mã; tiến độ vẫn giữ trên máy.", "warn"); }
})();
