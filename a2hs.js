// Home screen how-to for the game (Brady Nov 14: in a browser tab the address bar covers the track; as a home screen app it plays full screen).
// Any link with data-play gets a sheet on phones first: how to save the game to the home screen (Instagram in-app, iPhone, Android), then "Play now".
// Any element with data-a2hs gets the short steps written into it.
(() => {
  const ua = navigator.userAgent, ig = /Instagram|FBAN|FBAV/i.test(ua), ios = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1), android = /Android/i.test(ua);
  const phone = ios || android || matchMedia("(pointer: coarse)").matches;
  const KEY = "ims_a2hs_done";
  const done = () => { try { return localStorage.getItem(KEY) === "1"; } catch (e) { return false; } };
  const steps = () => {
    const s = [];
    if (ig) s.push("Tap <b>&middot;&middot;&middot;</b> at the top right and pick <b>Open in browser</b> (Instagram can't save apps).");
    const on = /\/game\//.test(location.pathname) ? "" : "Open the game, then ";
    if (android && !ios) s.push(on + "in Chrome tap <b>&#8942;</b> at the top right.", "Tap <b>Add to Home screen</b> (or <b>Install app</b>).");
    else s.push(on + "tap <b>Share</b> (the square with the arrow) in Safari.", "Tap <b>Add to Home Screen</b>, then <b>Add</b>.");
    s.push("Open <b>Speedway</b> from your home screen. Full screen, no address bar, like a real app.");
    return s;
  };
  const css = `.a2hs-sheet{position:fixed;inset:0;z-index:50;display:grid;place-items:end center;background:rgba(0,0,0,.6);padding:12px}
.a2hs-card{width:min(440px,100%);background:#15181f;color:#f3f4f6;border:2px solid #ef3b2d;border-radius:18px;padding:18px 16px 16px;font:500 15px/1.4 "Archivo",-apple-system,Arial,sans-serif;box-shadow:0 20px 50px rgba(0,0,0,.5)}
.a2hs-card .k{font:700 11px "Archivo",Arial,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#ffcc18}
.a2hs-card h2{margin:4px 0 10px;font:400 30px/1 "Anton",Impact,sans-serif;text-transform:uppercase}
.a2hs-card ol{margin:0 0 14px;padding-left:22px;display:grid;gap:7px}
.a2hs-card .go{display:block;text-align:center;text-decoration:none;font:400 22px "Anton",Impact,sans-serif;text-transform:uppercase;letter-spacing:.03em;color:#fff;background:linear-gradient(180deg,#ef3b2d,#c4160b);border-radius:12px;padding:12px}
.a2hs-card .row{display:flex;justify-content:space-between;gap:10px;margin-top:10px;font-size:13px}
.a2hs-card .row button{background:none;border:0;color:#9aa1ad;font:600 13px "Archivo",Arial,sans-serif;text-decoration:underline;cursor:pointer;padding:4px 0}`;
  const st = document.createElement("style"); st.textContent = css; document.head.append(st);
  function sheet(href) {
    const w = document.createElement("div"); w.className = "a2hs-sheet"; w.setAttribute("role", "dialog"); w.setAttribute("aria-label", "Save the game to your home screen");
    w.innerHTML = '<div class="a2hs-card"><div class="k">Best way to play</div><h2>Save it as an app</h2><ol>' + steps().map(x => "<li>" + x + "</li>").join("") +
      '</ol><a class="go" href="' + href + '">Open the game &rarr;</a><div class="row"><button type="button" data-x>Not now</button><button type="button" data-done>I already saved it</button></div></div>';
    w.addEventListener("click", e => {
      if (e.target === w || e.target.closest("[data-x]")) w.remove();
      if (e.target.closest("[data-done]")) { try { localStorage.setItem(KEY, "1"); } catch (_) {} location.href = href; }
    });
    document.body.append(w);
  }
  const fill = () => document.querySelectorAll("[data-a2hs]").forEach(el => {
    if (el.dataset.filled) return; el.dataset.filled = "1";
    el.innerHTML = '<b>&#128242; Play it like an app:</b> ' + steps().map((x, i) => (i + 1) + ". " + x).join(" ");
  });
  document.addEventListener("click", e => {
    const a = e.target.closest && e.target.closest("a[data-play]"); if (!a || !phone || done()) return;
    e.preventDefault(); sheet(a.getAttribute("href"));
  });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fill); else fill();
  window.IMS_A2HS = { steps, sheet, fill };
})();
