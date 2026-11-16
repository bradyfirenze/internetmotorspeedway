// Top 10 story card (Brady Nov 15): a top 10 finisher claims their spot with their game @ and PIN, then downloads a
// 1080x1920 image for IG stories: "I GOT 3RD OF 10", Day N, track, their car in their paint and number, IMS branding, site link.
// No other follower is named on it. Locked (fails closed) until the game server answers the PIN check.
(() => {
  const ENDPOINT = "https://script.google.com/macros/s/AKfycbwsMLdBQJagXvjV6hghdy0M1_dHmE7lLEi0lUAAvGOAkzO61HeWyTCYueeRo-jgBVQ2pQ/exec";
  const SITE = "bradyfirenze.github.io/internetmotorspeedway";
  const ord = n => n + (["th", "st", "nd", "rd"][(n % 100 - 20) % 10] || ["th", "st", "nd", "rd"][n % 100] || "th");
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  let PAINT = null, CUSTOM = null;
  async function paintOf(n) {
    if (!PAINT) { try { PAINT = (await (await fetch("../game/followers.json")).json()).f || {}; } catch (e) { PAINT = {}; } }
    if (!CUSTOM) { CUSTOM = {}; try { for (const c of (await (await fetch("../cars/cars.json")).json()).cars || []) if (c.ig) CUSTOM[c.ig.toLowerCase()] = c; } catch (e) {} }
    const c = CUSTOM[n]; if (c) return { b: c.bodyHex, r: c.roofHex || c.bodyHex, num: c.num || "" };
    const h = PAINT[n] ? "#" + PAINT[n] : "#e8eaee"; return { b: h, r: h, num: "" };
  }
  // PIN check on the game server (v4, a:"login"). Anything but ok = locked. One try per click, no retry loop (no lockout on the server yet).
  async function verify(n, pin) {
    try {
      const r = await fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ n, a: "login", pin }) });
      const d = await r.json(); return d && d.ok === true && d.me ? "ok" : (d && d.why) || "error";   // server v4: {ok:true, me} | {ok:false, why}
    } catch (e) { return "error"; }
  }
  function img(src) { return new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; }); }
  function car(x, cx, cy, s, p) {          // blocky race car, 3/4 front, in the owner's paint
    const sh = (hex, k) => { const n = parseInt(hex.slice(1), 16); const f = v => Math.max(0, Math.min(255, Math.round(v * k))); return `rgb(${f(n >> 16)},${f(n >> 8 & 255)},${f(n & 255)})`; };
    const poly = (pts, fill) => { x.beginPath(); pts.forEach(([a, b], i) => i ? x.lineTo(cx + a * s, cy + b * s) : x.moveTo(cx + a * s, cy + b * s)); x.closePath(); x.fillStyle = fill; x.fill(); };
    x.fillStyle = "rgba(0,0,0,.45)"; x.beginPath(); x.ellipse(cx, cy + 1.25 * s, 3.3 * s, .55 * s, 0, 0, 7); x.fill();
    const wheels = (list) => list.forEach(([wx, wy]) => { x.fillStyle = "#0d0d0f"; x.beginPath(); x.roundRect(cx + (wx - .55) * s, cy + (wy - .55) * s, 1.1 * s, 1.1 * s, .18 * s); x.fill(); x.fillStyle = "#8c9096"; x.fillRect(cx + (wx - .22) * s, cy + (wy - .22) * s, .44 * s, .44 * s); });
    wheels([[-1.7, .55], [2.2, .55]]);                                                      // far side
    poly([[-3, .9], [2.6, .9], [3, .2], [3, -.6], [-2.6, -.6], [-3, .1]], p.b);          // body side
    poly([[2.6, .9], [3.3, .55], [3.3, -.3], [3, -.6], [3, .2]], sh(p.b, .7));            // nose
    poly([[-2.6, -.6], [3, -.6], [3.3, -.3], [-2.2, -.3]], sh(p.b, 1.25));                  // hood top
    x.fillStyle = p.r; x.fillRect(cx - 3 * s, cy + .05 * s, 5.85 * s, .22 * s);            // stripe in the roof color
    poly([[-1.6, -.6], [1, -.6], [.6, -1.6], [-1.3, -1.6]], p.r);                           // cabin
    poly([[1, -.6], [1.3, -.4], [.85, -1.4], [.6, -1.6]], sh(p.r, .75));
    poly([[-1.2, -.75], [.8, -.75], [.5, -1.45], [-1, -1.45]], "#1d2a38");                 // window
    x.fillStyle = "#fff6dc"; x.fillRect(cx + 2.95 * s, cy - .35 * s, .3 * s, .25 * s);   // headlight
    x.fillStyle = "#ff2a2a"; x.fillRect(cx - 3.05 * s, cy - .4 * s, .15 * s, .3 * s);   // tail light
    wheels([[-2.1, .95], [1.85, .95]]);                                                     // near side, over the body
    if (p.num) { const lum = [1, 3, 5].reduce((t, i) => t + parseInt(p.b.slice(i, i + 2), 16), 0);
      x.fillStyle = "#fff"; x.beginPath(); x.arc(cx - .2 * s, cy - .1 * s, .55 * s, 0, 7); x.fill(); x.fillStyle = "#111"; x.font = `400 ${.75 * s}px Anton, Impact, sans-serif`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(p.num, cx - .2 * s, cy - .07 * s); }
  }
  async function render(n, place, day, track) {
    const W = 1080, H = 1920, cv = document.createElement("canvas"); cv.width = W; cv.height = H; const x = cv.getContext("2d");
    try { await document.fonts.load("400 100px Anton"); } catch (e) {}
    const bg = await img("../map/game_shot.jpg");
    x.fillStyle = "#0d0f13"; x.fillRect(0, 0, W, H);
    if (bg) { const k = H / bg.height; x.globalAlpha = .55; x.drawImage(bg, (W - bg.width * k) / 2, 0, bg.width * k, H); x.globalAlpha = 1; }
    const gr = x.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, "rgba(13,15,19,.85)"); gr.addColorStop(.35, "rgba(13,15,19,.35)"); gr.addColorStop(.62, "rgba(13,15,19,.55)"); gr.addColorStop(1, "rgba(13,15,19,.95)");
    x.fillStyle = gr; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 27; i++) for (let r = 0; r < 2; r++) { x.fillStyle = (i + r) % 2 ? "#111" : "#fff"; x.fillRect(i * 40, 70 + r * 40, 40, 40); }   // checkered band
    x.textAlign = "center"; x.textBaseline = "alphabetic";
    x.fillStyle = "#ffcc18"; x.font = "700 40px Archivo, Arial, sans-serif"; x.fillText("INTERNET MOTOR SPEEDWAY · DAY " + day, W / 2, 260);
    x.fillStyle = "#fff"; x.font = "400 150px Anton, Impact, sans-serif"; x.fillText("I GOT", W / 2, 460);
    const gold = place === 1 ? "#f5c542" : place === 2 ? "#dfe3ea" : place === 3 ? "#e09a5c" : "#ffcc18";
    x.fillStyle = gold; x.font = "400 330px Anton, Impact, sans-serif"; x.fillText(ord(place).toUpperCase(), W / 2, 790);
    x.fillStyle = "#fff"; x.font = "400 110px Anton, Impact, sans-serif"; x.fillText("OF 10", W / 2, 920);
    car(x, W / 2, 1230, 120, await paintOf(n));
    x.fillStyle = "#fff"; x.font = "400 76px Anton, Impact, sans-serif"; let fs = 76; while (x.measureText("@" + n).width > W - 140 && fs > 30) { fs -= 4; x.font = `400 ${fs}px Anton, Impact, sans-serif`; }
    x.fillText("@" + n, W / 2, 1480);
    x.fillStyle = "#c9ced6"; x.font = "600 40px Archivo, Arial, sans-serif"; x.fillText(track.toUpperCase(), W / 2, 1550);
    x.fillStyle = "#ef3b2d"; x.beginPath(); x.roundRect(140, 1640, W - 280, 120, 26); x.fill();
    x.fillStyle = "#fff"; x.font = "400 56px Anton, Impact, sans-serif"; x.fillText("FOLLOW TO GET YOUR CAR", W / 2, 1720);
    x.fillStyle = "#ffcc18"; x.font = "700 34px Archivo, Arial, sans-serif"; x.fillText(SITE, W / 2, 1830);
    return cv;
  }
  async function deliver(cv, name) {
    const blob = await new Promise(r => cv.toBlob(r, "image/png")), file = new File([blob], name, { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file] }); return; } catch (e) { if (e.name === "AbortError") return; } }
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  }
  // results page hook: called with the search hit for a top 10 finisher
  window.IMS_SHARE = (hitEl, n, place, day, track) => {
    if (!(place >= 1 && place <= 10)) return;
    const box = document.createElement("div"); box.className = "share";
    box.innerHTML = '<button type="button" class="sbtn">&#127942; Get your Top 10 story card</button><form class="sf" hidden><label>Claim it with your game PIN</label><div class="row"><input inputmode="numeric" maxlength="4" pattern="[0-9]{4}" placeholder="4 digit PIN" autocomplete="off"><button type="submit">Make my card</button></div><p class="sm"></p></form>';
    hitEl.append(box);
    const f = box.querySelector("form"), m = box.querySelector(".sm"), inp = f.querySelector("input");
    box.querySelector(".sbtn").addEventListener("click", () => { f.hidden = false; inp.focus(); });
    f.addEventListener("submit", async e => {
      e.preventDefault(); const pin = inp.value.trim(); if (!/^\d{4}$/.test(pin)) { m.textContent = "Your PIN is the 4 digits you set in the game."; return; }
      m.textContent = "Checking your PIN...";
      const v = await verify(n, pin);
      if (v !== "ok") { m.innerHTML = v === "pin" ? "That PIN didn't match. If you've never set one, set your PIN in the game first: <a href=\"../game/\">open the game</a>." : v === "follow" ? "@" + esc(n) + " isn't on the follower list yet." : "Couldn't check your PIN right now. Try again in a bit."; return; }
      m.textContent = "Making your card..."; const cv = await render(n, place, day, track);
      await deliver(cv, "IMS-Day" + day + "-P" + place + ".png"); m.textContent = "Done. Post it to your story and tag @internetmotorspeedway.";
    });
  };
  window.IMS_SHARE_RENDER = render;   // for previews
})();
