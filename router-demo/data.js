// =====================================================================
//  router-demo: CẤU HÌNH + DANH SÁCH SỰ KIỆN DÙNG CHUNG
//  Sửa tên bot, màu, số liệu ở CONFIG rồi chạy lại: python render.py full
//  Hình (chấm, ô sáng), bộ đếm, nhật ký và bảng tổng kết đều đọc từ
//  cùng một mảng window.EVENTS bên dưới, nên luôn khớp nhau.
// =====================================================================
window.CONFIG = {
  W: 1080, H: 1920, FPS: 30, DURATION: 24,
  seed: 20261125,            // đổi seed để có thứ tự chấm khác (vẫn tất định)

  title: "Router phân việc cho 4 bot",

  // Cột trái: nguồn sự kiện
  sources: [
    { id: "webhook", name: "Webhook", color: "#6d5efc" },
    { id: "slack",   name: "Slack",   color: "#e0961a" },
    { id: "github",  name: "GitHub",  color: "#2b3137" },
    { id: "email",   name: "Email",   color: "#0e9f8e" },
  ],

  // Cột giữa
  router: { name: "Bộ điều phối", sub: "router" },

  // Cột phải: bốn bot. log = dòng nhật ký khi bot làm xong việc
  bots: [
    { id: "triage", name: "Phân loại", color: "#2f7de1", log: "Đã gắn nhãn" },
    { id: "fix",    name: "Sửa lỗi",   color: "#d9483b", log: "Đã mở PR sửa lỗi" },
    { id: "review", name: "Rà soát",   color: "#8b5cf6", log: "Đã rà soát PR" },
    { id: "draft",  name: "Soạn thảo", color: "#16a34a", log: "Đã soạn trả lời" },
  ],
  skipLog: "Bỏ qua",
  skipColor: "#9aa0a8",

  // Bốn bộ đếm phía trên
  counters: [
    { id: "total", label: "Sự kiện" },
    { id: "skip",  label: "Bỏ qua" },
    { id: "done",  label: "Đã xử lý" },
    { id: "draft", label: "Bản nháp" },   // = số việc bot "draft" làm xong
  ],
  draftBot: "draft",

  // Số sự kiện theo đích. Tổng = 64, bỏ qua 49, đã xử lý 15, bản nháp 9.
  // Bảng tổng kết tự tính lại từ danh sách sự kiện, không gõ tay.
  mix: { skip: 49, draft: 9, triage: 2, fix: 2, review: 2 },

  // Nguồn nào có thể sinh ra loại việc nào
  routeSources: {
    skip:   ["webhook", "slack", "github", "email"],
    triage: ["slack", "email", "webhook"],
    fix:    ["github", "webhook"],
    review: ["github"],
    draft:  ["email", "slack"],
  },

  // Nhãn sự kiện (chọn tất định theo seed)
  labels: {
    skip: {
      webhook: ["Ping uptime OK", "Thanh toán thành công", "Webhook thử nghiệm", "Đồng bộ xong"],
      slack:   ["Tin nhắn chào buổi sáng", "Thông báo kênh chung", "Ai đó thả tim", "Nhắc lịch họp"],
      github:  ["Deploy thành công", "CI xanh", "Push lên nhánh phụ", "Gắn sao repo"],
      email:   ["Bản tin tuần", "Xác nhận đơn hàng", "Thư quảng cáo", "Hóa đơn tự động"],
    },
    triage: { slack: ["Báo lỗi mới ở #support"], email: ["Phản hồi chưa rõ loại"], webhook: ["Ticket mới"] },
    fix:    { github: ["CI thất bại trên main"], webhook: ["Lỗi 500 từ máy chủ"] },
    review: { github: ["PR mới cần rà soát", "PR sửa giao diện"] },
    draft:  { email: ["Khách hỏi về hóa đơn", "Khách xin dời lịch", "Khách hỏi giá gói"], slack: ["Khách hỏi trong kênh hỗ trợ"] },
  },

  // Hai ví dụ được làm nổi bật (giây)
  examples: [
    { key: "ex1", source: "github", route: "skip",  label: "Deploy thành công",
      te: 4.0, toRouter: 2.2,
      caption: ["Ví dụ 1: Deploy thành công", "Không cần bot nào, router bỏ qua"],
      focus: [4.0, 8.3] },
    { key: "ex2", source: "email", route: "draft", label: "Email khách cần trả lời",
      te: 8.6, toRouter: 2.0, hold: 0.4, toBot: 1.4,
      caption: ["Ví dụ 2: Email khách cần trả lời", "Router giao cho bot Soạn thảo"],
      focus: [8.6, 13.9] },
  ],

  // Nhịp các chấm nền
  timing: {
    toRouter: 0.9, hold: 0.25, toBot: 0.8,
    segments: [                         // n chấm phát đều trong [from, to)
      { from: 3.0,  to: 4.0,  n: 4 },
      { from: 4.0,  to: 4.6,  n: 2 },
      { from: 4.6,  to: 7.4,  n: 4 },   // lúc này chấm nền chỉ đi tới bot
      { from: 7.4,  to: 14.0, n: 20 },
      { from: 14.0, to: 16.9, n: 32 },
    ],
    quietBefore: 0.5, quietAfter: 0.6,  // không chấm nền nào chốt sổ quanh khoảnh khắc ví dụ
    settleBy: 17.85,                    // mọi chấm xong trước cảnh tổng kết
  },

  captions: [
    { from: 2.1,  to: 3.95, lines: ["4 nguồn → 1 router → 4 bot", "Mỗi chấm là một sự kiện"] },
    { from: 14.1, to: 17.95, lines: ["Mọi sự kiện đi qua cùng một router", "Phần lớn không cần bot nào"] },
  ],

  // Cảnh tổng kết (18 → 24 s). Số sự kiện tự đếm; chi phí là số minh họa.
  summary: {
    start: 18.0,
    title: "Tổng kết",
    disclaimer: "Dữ liệu mô phỏng",
    costTitle: "Chi phí minh họa mỗi tháng",
    costs: [
      { label: "Chạy mỗi 5 phút",  value: 449, text: "449 USD/tháng" },
      { label: "Chạy mỗi giờ",     value: 37,  text: "37 USD/tháng" },
      { label: "Chạy theo sự kiện", value: 27, text: "khoảng 27 USD/tháng", best: true },
    ],
    footer: "Dữ liệu mô phỏng · số liệu chỉ để minh họa",
  },
};

// ---------------------------------------------------------------------
//  Sinh danh sách sự kiện (tất định: cùng seed → cùng video)
// ---------------------------------------------------------------------
(function () {
  const C = window.CONFIG, T = C.timing;
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const rnd = mulberry32(C.seed);
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  const errors = [];
  const ev = [];
  const isBot = (r) => r !== "skip";
  function mk(o) {
    const toRouter = o.toRouter ?? T.toRouter, hold = o.hold ?? T.hold, toBot = o.toBot ?? T.toBot;
    const e = { te: o.te, source: o.source, route: o.route, label: o.label, key: o.key || null };
    e.tRouter = e.te + toRouter;
    if (isBot(e.route)) { e.tOut = e.tRouter + hold; e.tBot = e.tOut + toBot; e.tDone = e.tBot; }
    else e.tDone = e.tRouter;
    return e;
  }

  // Ví dụ nổi bật. Quanh khoảnh khắc ví dụ: không chấm nền nào chốt sổ;
  // và suốt lúc kể ví dụ, bộ đếm được nhấn mạnh chỉ tăng đúng 1.
  const forbidAll = [], forbidRoute = [];
  for (const x of C.examples) {
    const e = mk(x); ev.push(e);
    forbidAll.push([e.tDone - T.quietBefore, e.tDone + T.quietAfter]);
    forbidRoute.push({ route: x.route, a: e.tDone - T.quietBefore, b: x.focus[1] });
  }

  // Túi đích cho chấm nền (trừ hai ví dụ)
  const bag = [];
  for (const [r, n] of Object.entries(C.mix)) for (let i = 0; i < n; i++) bag.push(r);
  for (const x of C.examples) { const k = bag.indexOf(x.route); if (k < 0) errors.push("mix thiếu chỗ cho ví dụ " + x.key); else bag.splice(k, 1); }

  // Khe thời gian
  let slots = [];
  for (const s of T.segments) for (let i = 0; i < s.n; i++) slots.push(s.from + (i + 0.15 + 0.7 * rnd()) * (s.to - s.from) / s.n);
  if (slots.length !== bag.length) errors.push(`segments có ${slots.length} chấm, mix nền cần ${bag.length}`);
  slots.sort((a, b) => a - b);

  const botDur = T.toRouter + T.hold + T.toBot;
  const fits = (r, te) => {
    const t = r === "skip" ? te + T.toRouter : te + botDur;
    if (t > T.settleBy) return false;
    if (forbidAll.some(([a, b]) => t >= a && t <= b)) return false;
    if (forbidRoute.some(f => f.route === r && t >= f.a && t <= f.b)) return false;
    return true;
  };
  const pool = shuffle(bag.filter(isBot));
  const assign = slots.map(() => null);
  const tryPlace = (i) => {
    if (i < 0 || i >= slots.length || assign[i] !== null) return false;
    const k = pool.findIndex(r => fits(r, slots[i]));
    if (k < 0) return false;
    assign[i] = pool.splice(k, 1)[0]; return true;
  };
  // 1) khe mà chấm "bỏ qua" không hợp lệ -> giao cho bot
  slots.forEach((te, i) => { if (!fits("skip", te)) tryPlace(i); });
  // 2) rải phần việc bot còn lại đều trên dòng thời gian
  const rem = pool.length;
  for (let k = 0; k < rem; k++) {
    const idx = Math.floor((k + 0.5) * slots.length / rem);
    for (let d = 0; d < slots.length; d++) if (tryPlace(idx + d) || tryPlace(idx - d)) break;
  }
  if (pool.length) errors.push("không đủ khe cho việc của bot: còn " + pool.length);
  slots.forEach((te, i) => {
    let route = assign[i] || "skip";
    if (route === "skip") { // an toàn: đẩy chấm bỏ qua ra khỏi vùng cấm
      let guard = 0;
      while (!fits("skip", te) && guard++ < 200) te += 0.05;
    }
    const source = pick(C.routeSources[route]);
    const label = pick(C.labels[route][source]);
    ev.push(mk({ te, source, route, label }));
  });

  ev.sort((a, b) => a.te - b.te);
  ev.forEach((e, i) => { e.id = i; });
  for (const e of ev) if (e.tDone > T.settleBy + 1e-6) errors.push(`sự kiện ${e.id} xong lúc ${e.tDone.toFixed(2)} s, sau settleBy`);

  window.EVENTS = ev;
  window.EVENT_ERRORS = errors;
  window.TALLY = {
    total: ev.length,
    skip: ev.filter(e => e.route === "skip").length,
    done: ev.filter(e => e.route !== "skip").length,
    draft: ev.filter(e => e.route === C.draftBot).length,
  };
})();
