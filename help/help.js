/* DRAFT 2026-11-16. Internet Motor Speedway help bubble ("Ask the Pit Wall").
   Add to any page:  <script src="../help/help.js" defer></script>
   In the game:  <script src="../help/help.js" data-launcher="game" defer></script>  = a "? Help" button top right on every menu screen,
   hidden while you drive (it shows only while an element matching data-menus, default ".screen", is visible).
   data-skip="#sGarage" hides it on screens that have their own Help button. data-launcher="none" = no button.
   then open it from a button with  IMSHelp.open()  (optionally IMSHelp.open("pin") to jump to an FAQ item).
   1. Answers from help/faq.json in the browser first (free).
   2. No good match -> asks the help desk Apps Script (SUPPORT_URL), which answers only from the same FAQ.
   3. Not sure, or the visitor says it didn't help -> "Send a report" (Reports tab -> HOME -> bug-fix chat, no pings to Brady).
   Text from the server or the visitor is only ever shown as text, never as HTML. Links come only from faq.json. */
(function () {
  "use strict";
  var SUPPORT_URL = "";   // the help desk /exec URL, after Brady deploys support-backend/Code.gs. Empty = FAQ only, reports go to DM.
  var me = document.currentScript || document.querySelector('script[src*="help/help.js"]');
  var ROOT = me.src.replace(/help\/help\.js.*$/, "");
  var MODE = me.getAttribute("data-launcher") || "bubble";      // bubble | game | none
  var LAUNCHER = MODE !== "none", GAME = MODE === "game";
  var MENUS = me.getAttribute("data-menus") || ".screen";
  var SKIP = me.getAttribute("data-skip") || "";      // screens with their own Help button: no floating one there
  var LIFT = Math.max(0, Math.min(300, Number(me.getAttribute("data-bottom")) || 0));   // px to sit above a page's bottom bar
  var ABOVE = me.getAttribute("data-above") || "";   // CSS selector: if the bubble would cover one of these, it sits just above it
  var DEMO = /[?&]helpdemo\b/.test(location.search);           // ?helpdemo = fake AI + fake report, nothing is sent
  var PAGE = (location.pathname.replace(/\/index\.html$/, "/").match(/\/(\w+)\/?$/) || [, "home"])[1];

  var faq = null, hist = [], host, root, box, panel, log, input, sendBtn, busy = false;
  var sid = (function () {
    var k = "ims_help_sid", v = "";
    try { v = localStorage.getItem(k) || ""; } catch (e) {}
    if (!/^[a-z0-9]{8,40}$/.test(v)) {
      v = ""; var a = new Uint8Array(12); (window.crypto || {}).getRandomValues ? crypto.getRandomValues(a) : a.forEach(function (_, i) { a[i] = Math.random() * 256; });
      a.forEach(function (b) { v += (b % 36).toString(36); });
      try { localStorage.setItem(k, v); } catch (e) {}
    }
    return v;
  })();

  // ---------- FAQ matching (in the browser)
  function norm(s) { return " " + String(s).toLowerCase().replace(/[^a-z0-9.@$ ]+/g, " ").replace(/\s+/g, " ").trim() + " "; }
  var STOP = " a an the i my me is are do does how what why when where can to of in on for it and or you your we our be am this that with get ".split(" ").reduce(function (o, w) { if (w) o[w] = 1; return o; }, {});
  function words(s) { return norm(s).trim().split(" ").filter(function (w) { return w.length > 1 && !STOP[w]; }); }
  function match(q) {
    if (!faq) return null;
    var nq = norm(q), qw = words(q), best = null, bestS = 0;
    faq.items.forEach(function (it) {
      var s = 0;
      (it.keys || []).forEach(function (k) { if (nq.indexOf(norm(k)) >= 0) s += 2 + words(k).length; });
      var iw = words(it.q + " " + (it.keys || []).join(" "));
      qw.forEach(function (w) { if (iw.indexOf(w) >= 0) s += 1; });
      if (s > bestS) { bestS = s; best = it; }
    });
    // Strong match = a key phrase hit plus a little more, or lots of shared words. Short questions need less.
    var need = qw.length <= 2 ? 3 : 4;
    return bestS >= need ? best : null;
  }

  // ---------- UI
  var CSS = [
    ":host{all:initial}",
    "*{box-sizing:border-box;font-family:Archivo,-apple-system,'Helvetica Neue',Arial,sans-serif}",
    ".fab{position:fixed;right:max(14px,env(safe-area-inset-right));bottom:calc(max(14px,env(safe-area-inset-bottom)) + var(--lift,LIFTpx));z-index:2147483000;display:flex;align-items:center;gap:7px;",
    "padding:11px 15px;border-radius:999px;border:2px solid #ff4b3e;background:#111318;color:#f3f4f6;font:700 14px Archivo,Arial,sans-serif;cursor:pointer;box-shadow:0 6px 22px rgba(0,0,0,.45)}",
    ".fab:hover{background:#1b1e26}.fab b{font:400 17px Anton,Impact,sans-serif;letter-spacing:.03em;color:#ffd23f}",
    ".panel{position:fixed;right:max(12px,env(safe-area-inset-right));bottom:max(12px,env(safe-area-inset-bottom));z-index:2147483001;width:min(380px,calc(100vw - 24px));",
    "height:min(560px,calc(100vh - 24px));display:flex;flex-direction:column;background:#111318;color:#f3f4f6;border:1px solid rgba(255,255,255,.14);border-radius:16px;overflow:hidden;box-shadow:0 14px 48px rgba(0,0,0,.6)}",
    ".fab.top{bottom:auto;top:max(10px,env(safe-area-inset-top));right:max(10px,env(safe-area-inset-right));padding:8px 13px;font-size:14px;border-color:#ffd23f;background:rgba(17,19,24,.92)}",
    ".nudge{position:fixed;right:max(14px,env(safe-area-inset-right));z-index:2147483000;background:#ffd23f;color:#111318;font:700 13px Archivo,Arial,sans-serif;padding:7px 11px;border-radius:10px;box-shadow:0 6px 22px rgba(0,0,0,.45);pointer-events:none;transition:opacity .4s}",
    ".panel[hidden],.fab[hidden],.nudge[hidden]{display:none}",
    ".wrap.rot{position:fixed;left:0;top:0;transform-origin:0 0;transform:rotate(90deg) translateY(-100%);pointer-events:none;z-index:2147483000}",
    ".wrap.rot>*{pointer-events:auto}.wrap.rot .panel{height:min(560px,calc(100% - 24px));width:min(380px,calc(100% - 24px))}",
    ".hd{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:3px solid #ff4b3e;background:repeating-linear-gradient(45deg,#16181f 0 10px,#1b1e26 10px 20px)}",
    ".hd h2{margin:0;font:400 20px/1 Anton,Impact,sans-serif;letter-spacing:.04em;text-transform:uppercase}.hd small{display:block;color:#aab0bb;font-size:11px;margin-top:3px}",
    ".x{margin-left:auto;background:none;border:0;color:#aab0bb;font-size:24px;line-height:1;cursor:pointer;padding:2px 6px}",
    ".log{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;-webkit-overflow-scrolling:touch}",
    ".m{max-width:88%;padding:9px 12px;border-radius:13px;font-size:14px;line-height:1.4;white-space:pre-wrap;word-wrap:break-word}",
    ".bot{background:#1d2029;align-self:flex-start;border-bottom-left-radius:4px}.you{background:#ff4b3e;color:#fff;align-self:flex-end;border-bottom-right-radius:4px}",
    ".m a{color:#ffd23f;font-weight:700}.m .lk{display:inline-block;margin-top:6px}",
    ".chips{display:flex;flex-wrap:wrap;gap:6px}.chip{border:1px solid rgba(255,255,255,.2);background:#16181f;color:#f3f4f6;border-radius:999px;padding:6px 10px;font-size:12.5px;cursor:pointer}",
    ".chip:hover{border-color:#ffd23f}",
    ".act{display:flex;gap:6px;flex-wrap:wrap;align-self:flex-start}.act button{background:none;border:1px solid rgba(255,255,255,.2);color:#aab0bb;border-radius:8px;padding:5px 9px;font-size:12px;cursor:pointer}",
    ".act button.rep{color:#ffd23f;border-color:rgba(255,210,63,.5)}",
    ".ft{display:flex;gap:8px;padding:10px;border-top:1px solid rgba(255,255,255,.1)}",
    ".ft input{flex:1;min-width:0;background:#1d2029;border:1px solid rgba(255,255,255,.14);color:#f3f4f6;border-radius:10px;padding:10px 12px;font-size:16px;outline:none}",
    ".ft input:focus{border-color:#ffd23f}",
    ".go{background:#ff4b3e;border:0;color:#fff;border-radius:10px;padding:0 14px;font:700 14px Archivo,Arial,sans-serif;cursor:pointer}.go:disabled{opacity:.5}",
    "form.rf{display:flex;flex-direction:column;gap:7px;background:#16181f;border:1px solid rgba(255,210,63,.4);border-radius:12px;padding:10px}",
    "form.rf label{font-size:12px;color:#aab0bb}form.rf textarea,form.rf input{width:100%;background:#1d2029;border:1px solid rgba(255,255,255,.14);color:#f3f4f6;border-radius:8px;padding:8px;font-size:16px}",
    "form.rf textarea{min-height:70px;resize:vertical}form.rf .row{display:flex;gap:6px}form.rf .row button{flex:1}",
    "form.rf button{background:#ffd23f;color:#111318;border:0;border-radius:8px;padding:9px;font-weight:700;cursor:pointer}form.rf button.alt{background:none;color:#aab0bb;border:1px solid rgba(255,255,255,.2)}",
    ".dots i{display:inline-block;width:6px;height:6px;margin:0 2px;border-radius:50%;background:#aab0bb;animation:b 1s infinite}.dots i:nth-child(2){animation-delay:.15s}.dots i:nth-child(3){animation-delay:.3s}",
    "@keyframes b{0%,80%,100%{opacity:.25}40%{opacity:1}}",
    ".draft{font-size:10px;color:#ff4b3e;letter-spacing:.08em;font-weight:700}"
  ].join("");

  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function scroll() { log.scrollTop = log.scrollHeight; }
  function say(who, text) { var m = el("div", "m " + who, text); log.appendChild(m); scroll(); return m; }
  function link(m, l) {
    if (!l) return;
    var href = /^https?:/.test(l[1]) ? l[1] : ROOT + l[1];
    if (!/^https:\/\/(bradyfirenze\.github\.io|ko-fi\.com|www\.instagram\.com)\//.test(href) && !/^http:\/\/localhost/.test(href)) return;
    m.appendChild(document.createElement("br"));
    var a = el("a", "lk", l[0] + " →"); a.href = href; if (/^https?:/.test(l[1])) { a.target = "_blank"; a.rel = "noopener"; }
    m.appendChild(a);
  }
  function actions(q, answer, sure) {
    var row = el("div", "act");
    if (sure) { var ok = el("button", "", "That helped"); ok.onclick = function () { row.remove(); say("bot", "Great. See you on the track!"); }; row.appendChild(ok); }
    var rep = el("button", "rep", sure ? "Didn't help? Send a report" : "Send a report");
    rep.onclick = function () { row.remove(); reportForm(q, answer); };
    row.appendChild(rep); log.appendChild(row); scroll();
  }
  function answerFaq(it, q) { var m = say("bot", it.a); if (!(GAME && it.link && it.link[1] === "game/")) link(m, it.link); hist.push({ r: "assistant", t: it.a }); actions(q, it.a, true); if (m.offsetHeight > log.clientHeight * .6) log.scrollTop = m.offsetTop - log.offsetTop - 8; }

  function chips() {
    var box = el("div", "chips"), pick = ["find-car", "custom-after", "winner", "custom-tiers", "pitcrew", "game-controls", "leaderboard", "sponsor"];
    if (PAGE === "game" || GAME) pick = ["custom-after", "find-car", "game-controls", "pitcrew-claim", "not-follower", "pin", "upgrades", "leaderboard", "app"];
    pick.forEach(function (id) {
      var it = faq && faq.items.filter(function (x) { return x.id === id; })[0]; if (!it) return;
      var c = el("button", "chip", it.q); c.onclick = function () { say("you", it.q); hist.push({ r: "user", t: it.q }); answerFaq(it, it.q); };
      box.appendChild(c);
    });
    log.appendChild(box); scroll();
  }

  function post(body) {
    return fetch(SUPPORT_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json(); });
  }

  function ask(q) {
    q = q.trim().slice(0, 400); if (!q || busy) return;
    say("you", q); input.value = "";
    var it = match(q); hist.push({ r: "user", t: q });
    if (it) return answerFaq(it, q);
    if (!SUPPORT_URL && !DEMO) return notSure(q);
    busy = true; sendBtn.disabled = true;
    var wait = el("div", "m bot dots"); wait.innerHTML = "<i></i><i></i><i></i>"; log.appendChild(wait); scroll();
    var p = DEMO ? new Promise(function (ok) { setTimeout(function () { ok({ ok: true, answer: "(DEMO AI) I'm not sure about that one.", confident: false, faq_id: "" }); }, 900); })
      : post({ a: "ask", q: q, sid: sid, page: PAGE, hist: hist.slice(-5, -1) });
    p.then(function (d) {
      wait.remove();
      if (d && d.ok) {
        var it2 = faq.items.filter(function (x) { return x.id === d.faq_id; })[0];
        var m = say("bot", d.answer); if (it2 && d.confident) link(m, it2.link);
        hist.push({ r: "assistant", t: d.answer }); actions(q, d.answer, d.confident);
      } else if (d && d.why === "limit") { say("bot", "I've answered a lot of questions today, so I'm taking a pit stop."); notSure(q, true); }
      else notSure(q);
    }).catch(function () { wait.remove(); notSure(q); })
      .then(function () { busy = false; sendBtn.disabled = false; });
  }
  function notSure(q, quiet) {
    var t = "I'm not sure about that one, and I don't want to guess. Send a report and we'll look at it, or DM @internetmotorspeedway on Instagram.";
    if (!quiet) { say("bot", t); hist.push({ r: "assistant", t: t }); }
    actions(q, quiet ? "" : t, false);
  }

  function reportForm(q, answer) {
    var f = el("form", "rf");
    f.appendChild(el("label", "", "What happened? (what you tapped, what you expected)"));
    var note = el("textarea"); note.maxLength = 1000; note.value = q && answer ? "" : (q || ""); f.appendChild(note);
    f.appendChild(el("label", "", "Your Instagram @ (optional, so we can reply)"));
    var h = el("input"); h.maxLength = 31; h.autocomplete = "off"; h.placeholder = "@"; f.appendChild(h);
    try { var saved = localStorage.getItem("imsName") || localStorage.getItem("ims_name") || ""; if (/^[a-z0-9._]{1,30}$/i.test(saved)) h.value = "@" + saved; } catch (e) {}
    f.appendChild(el("label", "", "Email (optional). Don't type passwords, PINs or card numbers."));
    var c = el("input"); c.type = "email"; c.maxLength = 120; c.autocomplete = "email"; f.appendChild(c);
    var row = el("div", "row"), go = el("button", "", "Send report"), no = el("button", "alt", "Cancel");
    go.type = "submit"; no.type = "button"; row.appendChild(no); row.appendChild(go); f.appendChild(row);
    no.onclick = function () { f.remove(); };
    f.onsubmit = function (ev) {
      ev.preventDefault();
      if (!note.value.trim() && !q) { note.focus(); return; }
      if (/\b\d{4}\b/.test(note.value) && /pin/i.test(note.value)) { say("bot", "Please leave your PIN out of the report. We never need it."); return; }
      go.disabled = true; go.textContent = "Sending...";
      var body = { a: "report", sid: sid, page: PAGE, q: q || "", answer: answer || "", note: note.value.trim(), handle: h.value.trim(), contact: c.value.trim(), ua: navigator.userAgent };
      if (!SUPPORT_URL && !DEMO) { f.remove(); say("bot", "Reports aren't switched on yet. Please DM @internetmotorspeedway on Instagram with what happened."); return; }
      (DEMO ? Promise.resolve({ ok: true, id: "R-DEMO" }) : post(body)).then(function (d) {
        f.remove();
        if (d && d.ok) say("bot", "Sent! Your report number is " + d.id + ". Our crew looks at every report. If it's a bug, we fix it and you'll see it in the game or on the site.");
        else if (d && d.why === "limit") say("bot", "You've sent a few reports already. Please DM @internetmotorspeedway for anything else.");
        else say("bot", "That didn't go through. Please DM @internetmotorspeedway on Instagram.");
      }).catch(function () { f.remove(); say("bot", "That didn't go through. Please DM @internetmotorspeedway on Instagram."); });
    };
    log.appendChild(f); scroll(); (q && answer ? note : h).focus();
  }

  function build() {
    host = document.createElement("div"); host.id = "ims-help";
    root = host.attachShadow ? host.attachShadow({ mode: "open" }) : host;
    var st = document.createElement("style"); st.textContent = CSS.replace("LIFTpx", LIFT + "px"); root.appendChild(st);
    var fab = el("button", "fab"); fab.type = "button"; fab.setAttribute("aria-label", "Help: ask a question");
    fab.appendChild(el("b", "", "?")); fab.appendChild(document.createTextNode("Help")); fab.hidden = !LAUNCHER; if (GAME) fab.classList.add("top");
    panel = el("div", "panel"); panel.hidden = true; panel.setAttribute("role", "dialog"); panel.setAttribute("aria-label", "Speedway help");
    var hd = el("div", "hd"), t = el("div"); t.appendChild(el("h2", "", "Ask the Pit Wall"));
    var sm = el("small", "", "Answers from our FAQ. Can't answer? Send a report."); t.appendChild(sm);
    if (DEMO) t.appendChild(el("div", "draft", "DRAFT DEMO: NOTHING IS SENT"));
    var x = el("button", "x", "×"); x.type = "button"; x.setAttribute("aria-label", "Close");
    hd.appendChild(t); hd.appendChild(x);
    log = el("div", "log"); log.setAttribute("aria-live", "polite");
    var ft = el("form", "ft"); input = el("input"); input.placeholder = "Type a question..."; input.maxLength = 400; input.enterKeyHint = "send";
    sendBtn = el("button", "go", "Ask"); sendBtn.type = "submit"; ft.appendChild(input); ft.appendChild(sendBtn);
    ft.onsubmit = function (e) { e.preventDefault(); ask(input.value); };
    panel.appendChild(hd); panel.appendChild(log); panel.appendChild(ft);
    box = root;
    if (GAME) { box = el("div", "wrap"); root.appendChild(box); turn(); addEventListener("resize", turn); new MutationObserver(turn).observe(document.documentElement, { attributes: true, attributeFilter: ["class"] }); }
    box.appendChild(fab); box.appendChild(panel); document.body.appendChild(host);
    fab.onclick = function () { open(); };
    x.onclick = function () { panel.hidden = true; fab.hidden = !LAUNCHER; if (GAME) gameFab(); };
    // keep game keys (arrows, space) from reaching the game while typing
    ["keydown", "keyup"].forEach(function (k) { panel.addEventListener(k, function (e) { e.stopPropagation(); }); });
    panel.addEventListener("keydown", function (e) { if (e.key === "Escape") x.onclick(); });
  }

  function place() {
    if (!ABOVE || !host) return;
    var fab = root.querySelector(".fab"); fab.style.setProperty("--lift", LIFT + "px");
    var f = fab.getBoundingClientRect(); if (!f.width) return;
    var top = Infinity;
    document.querySelectorAll(ABOVE).forEach(function (e) {
      var r = e.getBoundingClientRect();
      if (r.width && r.height && r.left < f.right && r.right > f.left && r.bottom > f.top - 4 && r.top < innerHeight) top = Math.min(top, r.top);
    });
    if (top < Infinity) fab.style.setProperty("--lift", Math.max(LIFT, Math.round(innerHeight - top + 8 - 14)) + "px");
  }

  // game: a phone held upright gets the game turned sideways (html.rot), so the help turns with it
  function turn() {
    if (!box || box === root) return;
    var r = document.documentElement.classList.contains("rot");
    box.className = r ? "wrap rot" : "wrap";
    box.style.width = r ? innerHeight + "px" : ""; box.style.height = r ? innerWidth + "px" : "";
  }
  // game: the button shows on menu screens and hides while you drive
  function gameFab() {
    if (!GAME || !host) return;
    var fab = root.querySelector(".fab"), on = false;
    document.querySelectorAll(MENUS).forEach(function (e) { if (!e.hidden && e.getClientRects().length) on = true; });
    if (SKIP) document.querySelectorAll(SKIP).forEach(function (e) { if (!e.hidden && e.getClientRects().length) on = false; });
    fab.hidden = !on || !panel.hidden;
  }
  // a one-time hint next to the button, so people know they can ask (once per page, per browser)
  function nudge() {
    var k = "ims_help_nudge_" + PAGE; try { if (localStorage.getItem(k)) return; } catch (e) { return; }
    setTimeout(function () {
      var fab = root.querySelector(".fab"); if (fab.hidden || !panel.hidden) return;
      var r = fab.getBoundingClientRect(), n = el("div", "nudge", GAME ? "Stuck? Ask here" : "Questions? Ask here");
      if (GAME) n.style.top = Math.round(r.bottom + 8) + "px"; else n.style.bottom = Math.round(innerHeight - r.top + 8) + "px";
      box.appendChild(n); try { localStorage.setItem(k, "1"); } catch (e) {}
      setTimeout(function () { n.style.opacity = "0"; setTimeout(function () { n.remove(); }, 500); }, 6000);
    }, 2500);
  }

  var started = false;
  function open(id) {
    if (!host) build();
    panel.hidden = false; root.querySelector(".fab").hidden = true;
    var go = function () {
      if (!started) { started = true; say("bot", "Hey racer! Ask me anything about the races, your car, the game or Pit Crew. Or tap one:"); chips(); }
      var it = id && faq && faq.items.filter(function (x) { return x.id === id; })[0]; if (it) { say("you", it.q); answerFaq(it, it.q); }
      if (matchMedia("(pointer:fine)").matches) input.focus();
    };
    faq ? go() : load().then(go, function () { started = true; say("bot", "Help is having trouble loading. Please DM @internetmotorspeedway on Instagram."); });
  }
  function load() { return fetch(ROOT + "help/faq.json", { cache: "no-cache" }).then(function (r) { return r.json(); }).then(function (f) { faq = f; }); }

  window.IMSHelp = { open: open, _match: function (q) { var it = match(q); return it && it.id; } };
  function init() {
    build(); load().catch(function () {});
    if (GAME) { gameFab(); new MutationObserver(gameFab).observe(document.body, { subtree: true, attributes: true, attributeFilter: ["hidden"] }); }
    if (LAUNCHER) nudge();
    if (ABOVE) { place(); addEventListener("resize", place); var n = 0, iv = setInterval(function () { place(); if (++n > 10) clearInterval(iv); }, 1000); }
  }
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", init) : init();
})();
