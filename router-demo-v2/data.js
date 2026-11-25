// =====================================================================
//  router-demo v2: CẤU HÌNH + DANH SÁCH SỰ KIỆN DÙNG CHUNG
//  Một ngày làm việc (09:12 → 17:53) được nén vào ~15,6 giây.
//  Hình, bộ đếm, nhật ký, chi phí và tiếng "tick" đều tính từ window.EVENTS.
//  Sửa ở đây rồi chạy:  python render.py full  &&  python audio.py  &&  python render.py mux
// =====================================================================
window.CONFIG = {
  W: 1080, H: 1920, FPS: 60, DURATION: 24,
  seed: 7,

  brand: { name: "Bot Trực Ca", tagline: "inbox + CI · theo sự kiện", status: "đang trực" },

  sources: [
    { id: "webhook", name: "webhook", color: "#e0577a" },
    { id: "slack",   name: "slack",   color: "#e0961a" },
    { id: "github",  name: "github",  color: "#6c5ce7" },
    { id: "email",   name: "email",   color: "#2f6fe0" },
  ],
  router: { name: "router", ask: "cần việc?", yes: "có", no: "không", line1: "đọc 1 dòng mỗi sự kiện" },
  bots: [
    { id: "triage", name: "Phân loại", color: "#0e9f8e", duty: "gắn nhãn deploy lỗi",  never: "không đụng vào prod",  done: "đã gắn nhãn" },
    { id: "fix",    name: "Sửa lỗi",   color: "#e8702a", duty: "mở nhánh vá lỗi",      never: "không tự merge",        done: "đã mở nhánh vá" },
    { id: "review", name: "Rà soát",   color: "#7c5cf0", duty: "nhận xét PR mới",      never: "không tự duyệt",        done: "đã nhận xét PR" },
    { id: "draft",  name: "Soạn thảo", color: "#2f6fe0", duty: "soạn trả lời email",   never: "không tự gửi, chỉ nháp", done: "đã soạn bản nháp" },
  ],
  draftBot: "draft",
  skipColor: "#9aa0a8",

  counters: [
    { id: "total", label: "sự kiện",  color: "#15171b" },
    { id: "skip",  label: "bỏ qua",   color: "#8a9099" },
    { id: "done",  label: "đã xử lý", color: "#0e9f8e" },
    { id: "draft", label: "bản nháp", color: "#e2475a" },
  ],

  // 64 sự kiện = 49 bỏ qua + 15 đã xử lý (9 bản nháp)
  mix: { skip: 49, draft: 9, triage: 2, fix: 2, review: 2 },
  routeSources: {
    skip:   ["webhook", "slack", "github", "email"],
    triage: ["github", "slack"],
    fix:    ["webhook", "github"],
    review: ["github"],
    draft:  ["email"],
  },
  // short = dòng phụ trong ô nguồn; log = dòng nhật ký
  labels: {
    skip: {
      webhook: [["ping", "webhook ping, không đổi trạng thái"], ["thanh toán ok", "thanh toán thành công, không cần làm gì"]],
      slack:   [["deploy ok", "#deploys: deploy ok, không có việc"], ["tin chào", "#general: lời chào, bỏ qua"]],
      github:  [["đổi nhãn", "PR đổi nhãn, không đổi code"], ["CI xanh", "CI xanh trên main, bỏ qua"]],
      email:   [["bản tin", "bản tin, không cần trả lời"], ["hóa đơn", "hóa đơn tự động, lưu trữ"]],
    },
    triage: { github: [["deploy lỗi", "deploy #381 lỗi → Phân loại đã gắn nhãn"]], slack: [["báo lỗi", "#support báo lỗi → Phân loại đã gắn nhãn"]] },
    fix:    { webhook: [["lỗi hóa đơn", "sự kiện hóa đơn → Sửa lỗi đã vá lần thử lại"]], github: [["CI đỏ", "CI đỏ trên main → Sửa lỗi mở nhánh vá"]] },
    review: { github: [["PR mới", "PR #512 → Rà soát để lại 3 nhận xét"]] },
    draft:  { email: [["email khách", "email khách → Soạn thảo lưu bản nháp"]] },
  },

  // Hai ví dụ nổi bật. key = giây video của khoảnh khắc chính
  examples: [
    { key: "ex1", source: "github", route: "skip", short: "deploy ok",
      label: "Deploy thành công", log: "Deploy thành công → bỏ qua, không có việc",
      spot: ["Deploy thành công", "router: không cần việc", "bỏ qua +1"],
      te: 4.2, toRouter: 0.8, tKey: 5.0, focus: [4.2, 6.1] },
    { key: "ex2", source: "email", route: "draft", short: "cần trả lời",
      label: "Email khách cần trả lời", log: "Email khách cần trả lời → Đã soạn trả lời",
      spot: ["Email khách cần trả lời", "router: có việc", "Soạn thảo · bản nháp +1"],
      te: 10.3, toRouter: 0.6, hold: 0.15, toBot: 0.45, tKey: 11.5, focus: [10.3, 12.5] },
  ],

  // Dòng thời gian (giây video)
  time: {
    dayStart: 552, dayEnd: 1073,       // 09:12 → 17:53 (phút trong ngày)
    runFrom: 1.0, runTo: 16.6,         // đồng hồ chạy
    slow: 0.6, slowWidth: 0.5,         // quanh ví dụ: đồng hồ chậm lại 60 %
    sumFrom: 16.6, holdFrom: 20.0, rewindFrom: 22.0, rewindTo: 22.65,
  },
  dots: {
    toRouter: 0.42, hold: 0.08, toBot: 0.38,
    from: 1.15, to: 15.55,             // chấm nền phát đều trong khoảng này
    quiet: [0.25, 0.3],                // không chốt sổ nào quanh khoảnh khắc ví dụ
    settleBy: 16.5,
  },

  // Chi phí (USD). cron chạy bot mỗi lần; router đọc mỗi sự kiện + bot chỉ chạy khi có việc
  cost: { agentRun: 0.052, routerRead: 0.002, cronEvery: 5, daysPerMonth: 30 },

  summary: {
    title: "phép tính trước khi chuyển",
    disclaimer: "Dữ liệu mô phỏng",
    perMonth: "mỗi tháng · cùng khối việc",
    rows: [
      { name: "cron · mỗi 5 phút", sub: "288 lần/ngày · 273 lần rỗng", value: 449, text: "449", color: "#e8622a" },
      { name: "cron · mỗi giờ",    sub: "24 lần/ngày · cùng kết quả",   value: 37,  text: "37",  color: "#15171b" },
      { name: "router theo sự kiện", sub: "15 lần bot chạy/ngày · 0 rỗng", value: 27, text: "≈27", color: "#0e9f8e" },
    ],
    unit: "USD/tháng",
    tile1: { big: "12×", sub: "mỗi 5 phút so với mỗi giờ\ncùng kết quả" },
    tile2: { big: "0", tail: "lần chạy rỗng", sub: "bot chỉ chạy\nkhi có việc thật" },
    note: "ước tính · 0,052 USD mỗi lần bot chạy · 0,002 USD mỗi lần router đọc",
    promptTitle: "lời nhắc cài đặt · gửi cho bot của bạn",
    prompt: [
      "Dựng router sự kiện cho bot của tôi.",
      "Nguồn: webhook, Slack, GitHub, email vào 1 router.",
      "Router đọc 1 dòng/sự kiện, việc trống thì bỏ qua.",
      "Chỉ gọi 4 bot khi có việc thật.",
      "Việc rủi ro dừng ở bản nháp, chờ tôi duyệt.",
      "Ghi lý do định tuyến trong một dòng.",
    ],
  },
};

// ---------------------------------------------------------------------
//  Đồng hồ mô phỏng + danh sách sự kiện (tất định)
// ---------------------------------------------------------------------
(function () {
  const C = window.CONFIG, TM = C.time, D = C.dots;
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const io = (u) => { u = clamp(u); return u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; };

  // Bảng tích phân tốc độ đồng hồ: chậm lại quanh các ví dụ
  const STEP = 1 / 600, N = Math.round((TM.runTo - TM.runFrom) / STEP);
  const speed = (t) => C.examples.reduce((m, x) => m * (1 - TM.slow * Math.exp(-Math.pow((t - x.tKey) / TM.slowWidth, 2))), 1);
  const cum = new Float64Array(N + 1);
  for (let i = 1; i <= N; i++) cum[i] = cum[i - 1] + speed(TM.runFrom + (i - 0.5) * STEP) * STEP;
  const runSim = (t) => {
    const x = clamp((t - TM.runFrom) / STEP, 0, N), i = Math.floor(x), f = x - i;
    const c = i >= N ? cum[N] : cum[i] + (cum[i + 1] - cum[i]) * f;
    return TM.dayStart + (TM.dayEnd - TM.dayStart) * c / cum[N];
  };
  // phút mô phỏng tại giây video t (cả đoạn tua ngược cuối video)
  window.simAt = (t) => {
    if (t < TM.rewindFrom) return runSim(t);
    return TM.dayEnd + (TM.dayStart - TM.dayEnd) * io((t - TM.rewindFrom) / (TM.rewindTo - TM.rewindFrom));
  };
  window.fmtClock = (m) => { m = Math.floor(m + 1e-6); return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0"); };

  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const rnd = mulberry32(C.seed);
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const isBot = (r) => r !== "skip";
  const errors = [], ev = [];

  function mk(o) {
    const e = { te: o.te, source: o.source, route: o.route, short: o.short, log: o.log, key: o.key || null };
    e.tRouter = e.te + (o.toRouter ?? D.toRouter);
    if (isBot(e.route)) { e.tOut = e.tRouter + (o.hold ?? D.hold); e.tBot = e.tOut + (o.toBot ?? D.toBot); e.tDone = e.tBot; }
    else e.tDone = e.tRouter;
    return e;
  }

  const quietAll = [], quietRoute = [];
  for (const x of C.examples) {
    const e = mk(x); ev.push(e);
    quietAll.push([e.tDone - D.quiet[0], e.tDone + D.quiet[1]]);
    quietRoute.push({ route: x.route, a: e.tDone - 0.5, b: x.focus[1] });
  }
  const botDur = D.toRouter + D.hold + D.toBot;
  const fits = (r, te) => {
    const t = r === "skip" ? te + D.toRouter : te + botDur;
    if (t > D.settleBy) return false;
    if (quietAll.some(([a, b]) => t >= a && t <= b)) return false;
    if (quietRoute.some(f => f.route === r && t >= f.a && t <= f.b)) return false;
    return true;
  };

  const bag = [];
  for (const [r, n] of Object.entries(C.mix)) for (let i = 0; i < n; i++) bag.push(r);
  for (const x of C.examples) { const k = bag.indexOf(x.route); if (k < 0) errors.push("mix thiếu chỗ cho " + x.key); else bag.splice(k, 1); }

  const n = bag.length, slots = [];
  for (let i = 0; i < n; i++) slots.push(D.from + (i + 0.2 + 0.6 * rnd()) * (D.to - D.from) / n);

  const pool = shuffle(bag.filter(isBot)), assign = slots.map(() => null);
  const tryPlace = (i) => {
    if (i < 0 || i >= n || assign[i] !== null) return false;
    const k = pool.findIndex(r => fits(r, slots[i])); if (k < 0) return false;
    assign[i] = pool.splice(k, 1)[0]; return true;
  };
  slots.forEach((te, i) => { if (!fits("skip", te)) tryPlace(i); });
  const rem = pool.length;
  for (let k = 0; k < rem; k++) { const idx = Math.floor((k + 0.5) * n / rem); for (let d = 0; d < n; d++) if (tryPlace(idx + d) || tryPlace(idx - d)) break; }
  if (pool.length) errors.push("không đủ khe cho việc của bot: còn " + pool.length);

  slots.forEach((te, i) => {
    const route = assign[i] || "skip";
    if (route === "skip") { let g = 0; while (!fits("skip", te) && g++ < 400) te += 0.02; }
    const source = pick(C.routeSources[route]);
    const [short, log] = pick(C.labels[route][source]);
    ev.push(mk({ te, source, route, short, log }));
  });

  ev.sort((a, b) => a.te - b.te);
  ev.forEach((e, i) => {
    e.id = i;
    e.simIn = window.simAt(e.te);          // giờ sự kiện đến
    e.simDone = window.simAt(e.tDone);     // giờ chốt sổ
    if (e.tDone > D.settleBy + 1e-6) errors.push(`sự kiện ${i} xong lúc ${e.tDone.toFixed(2)} s`);
  });
  window.EVENTS = ev;
  window.EVENT_ERRORS = errors;
  window.TALLY = {
    total: ev.length, skip: ev.filter(e => e.route === "skip").length,
    done: ev.filter(e => e.route !== "skip").length, draft: ev.filter(e => e.route === C.draftBot).length,
  };
})();
