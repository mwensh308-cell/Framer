/* تاريخنا — Motion layer
   Dependency-free, ~12KB unminified. Everything respects prefers-reduced-motion, pauses
   when off-screen or the tab is hidden, and degrades to static content. */
(function () {
  "use strict";
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- 1. Hero: 3D geodesic ball with orbiting milestone years ---------- */
  var cv = document.getElementById("ball3d");
  if (cv && cv.getContext) {
    var ctx = cv.getContext("2d");
    // Icosahedron, subdivided once -> 42-vertex geodesic sphere
    var t = (1 + Math.sqrt(5)) / 2, V = [[-1,t,0],[1,t,0],[-1,-t,0],[1,-t,0],[0,-1,t],[0,1,t],[0,-1,-t],[0,1,-t],[t,0,-1],[t,0,1],[-t,0,-1],[-t,0,1]];
    var F = [[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]];
    var norm = function (v) { var l = Math.hypot(v[0], v[1], v[2]); return [v[0]/l, v[1]/l, v[2]/l]; };
    V = V.map(norm);
    var cache = {}, edges = {};
    var mid = function (a, b) { var k = a < b ? a + "_" + b : b + "_" + a; if (cache[k] === undefined) { V.push(norm([(V[a][0]+V[b][0])/2,(V[a][1]+V[b][1])/2,(V[a][2]+V[b][2])/2])); cache[k] = V.length - 1; } return cache[k]; };
    var addE = function (a, b) { edges[a < b ? a + "_" + b : b + "_" + a] = [a, b]; };
    F.forEach(function (f) { var a = mid(f[0], f[1]), b = mid(f[1], f[2]), c = mid(f[2], f[0]);
      [[f[0],a,c],[f[1],b,a],[f[2],c,b],[a,b,c]].forEach(function (g) { addE(g[0],g[1]); addE(g[1],g[2]); addE(g[2],g[0]); }); });
    var E = Object.keys(edges).map(function (k) { return edges[k]; });
    var YEARS = (cv.dataset.years || "1907,1934,1948,1957,1969,1986,2008,2010,2020,2026").split(",");
    var rx = -0.35, ry = 0, tx = 0, ty = 0, w = 0, h = 0, dpr = 1, running = false, raf = 0, last = 0;
    var gold = "217,164,65";
    var size = function () { var r = cv.getBoundingClientRect(); dpr = Math.min(window.devicePixelRatio || 1, 2); w = r.width; h = r.height; cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    var rot = function (p, ax, ay) { var cy = Math.cos(ay), sy = Math.sin(ay), cx = Math.cos(ax), sx = Math.sin(ax);
      var x = p[0]*cy + p[2]*sy, z = -p[0]*sy + p[2]*cy, y = p[1]*cx - z*sx; z = p[1]*sx + z*cx; return [x, y, z]; };
    var draw = function (ts) {
      var dt = Math.min(ts - last || 16, 50); last = ts;
      ry += dt * 0.00025; rx += (ty - rx) * 0.04; var ay = ry + tx;
      ctx.clearRect(0, 0, w, h);
      var R = Math.min(w, h) * 0.27, cx = w * 0.5, cy = h * 0.5, fov = 3.2;
      var P = V.map(function (v) { var r = rot(v, rx, ay), s = fov / (fov - r[2]); return [cx + r[0]*R*s, cy + r[1]*R*s, r[2]]; });
      // glow
      var g = ctx.createRadialGradient(cx, cy, R*0.2, cx, cy, R*1.7); g.addColorStop(0, "rgba(" + gold + ",.22)"); g.addColorStop(1, "rgba(" + gold + ",0)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      // back-to-front edges with depth-based alpha
      ctx.lineWidth = 1.1;
      E.forEach(function (e) { var a = P[e[0]], b = P[e[1]], z = (a[2] + b[2]) / 2;
        ctx.strokeStyle = "rgba(" + (z > 0 ? "255,246,225" : gold) + "," + (0.10 + 0.55 * (z + 1) / 2) + ")";
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); });
      P.forEach(function (p, i) { if (i < 12) { ctx.fillStyle = "rgba(" + gold + "," + (0.35 + 0.65*(p[2]+1)/2) + ")"; ctx.beginPath(); ctx.arc(p[0], p[1], 2.2 + 2.2*(p[2]+1)/2, 0, 6.283); ctx.fill(); } });
      // orbiting milestone years (tilted ring)
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      YEARS.forEach(function (y, i) {
        var a = ts * 0.00012 + i / YEARS.length * 6.283, p = rot([Math.cos(a) * 1.55, 0, Math.sin(a) * 1.55], 0.42 + rx * 0.3, tx * 0.5), s = fov / (fov - p[2]);
        var al = 0.18 + 0.75 * (p[2] + 1.55) / 3.1;
        ctx.font = "700 " + Math.round(11 + 7 * s) + "px Cairo, sans-serif"; ctx.fillStyle = "rgba(255,246,225," + al.toFixed(2) + ")";
        ctx.fillText(y, cx + p[0] * R * s, cy + p[1] * R * s);
      });
      if (running) raf = requestAnimationFrame(draw);
    };
    var start = function () { if (!running && !reduce) { running = true; last = 0; raf = requestAnimationFrame(draw); } };
    var stop = function () { running = false; cancelAnimationFrame(raf); };
    size(); draw(0); // always paint one static frame
    addEventListener("resize", function () { size(); if (!running) draw(0); }, { passive: true });
    new IntersectionObserver(function (en) { en[0].isIntersecting ? start() : stop(); }).observe(cv);
    document.addEventListener("visibilitychange", function () { document.hidden ? stop() : start(); });
    if (finePointer) addEventListener("pointermove", function (e) { tx = (e.clientX / innerWidth - 0.5) * 0.9; ty = (e.clientY / innerHeight - 0.5) * 0.6 - 0.35; }, { passive: true });
  }

  /* ---------- 2. Parallax layers in the hero ---------- */
  var layers = $$("[data-depth]");
  if (layers.length && !reduce) {
    var hero = document.querySelector(".hero3d"), ticking = false;
    var px = 0, py = 0;
    var apply = function () { ticking = false; var sc = Math.min(scrollY, 800);
      layers.forEach(function (l) { var d = +l.dataset.depth; l.style.transform = "translate3d(" + (px * d * 30) + "px," + (py * d * 20 + sc * d * 0.25) + "px,0)"; }); };
    var req = function () { if (!ticking) { ticking = true; requestAnimationFrame(apply); } };
    addEventListener("scroll", req, { passive: true });
    if (finePointer && hero) hero.addEventListener("pointermove", function (e) { px = e.clientX / innerWidth - 0.5; py = e.clientY / innerHeight - 0.5; req(); });
  }

  /* ---------- 3. 3D tilt cards ---------- */
  if (finePointer && !reduce) $$("[data-tilt]").forEach(function (el) {
    el.addEventListener("pointermove", function (e) { var r = el.getBoundingClientRect();
      el.style.setProperty("--ry", ((e.clientX - r.left) / r.width - 0.5) * 12 + "deg");
      el.style.setProperty("--rx", ((e.clientY - r.top) / r.height - 0.5) * -10 + "deg");
      el.style.setProperty("--gx", (e.clientX - r.left) / r.width * 100 + "%"); el.style.setProperty("--gy", (e.clientY - r.top) / r.height * 100 + "%"); });
    el.addEventListener("pointerleave", function () { el.style.setProperty("--rx", "0deg"); el.style.setProperty("--ry", "0deg"); });
  });

  /* ---------- 4. Reveal on scroll + animated counters ---------- */
  var countUp = function (el) { var to = +el.dataset.count, t0 = performance.now(), d = 1400;
    if (reduce) { el.textContent = to; return; }
    (function step(ts) { var k = Math.min((ts - t0) / d, 1), e = 1 - Math.pow(1 - k, 3); el.textContent = Math.round(to * e); if (k < 1) requestAnimationFrame(step); })(t0); };
  var io = new IntersectionObserver(function (en) { en.forEach(function (x) { if (!x.isIntersecting) return;
    x.target.classList.add("in"); $$("[data-count]", x.target).concat(x.target.dataset.count ? [x.target] : []).forEach(countUp); io.unobserve(x.target); }); }, { rootMargin: "0px 0px -10% 0px" });
  $$(".reveal,[data-count]").forEach(function (el) { io.observe(el); });

  /* ---------- 5. Scrollytelling: sticky year follows the active chapter ---------- */
  var big = document.getElementById("story-year"), cap = document.getElementById("story-cap"), bar = document.getElementById("story-bar");
  var chapters = $$(".chapter");
  if (big && chapters.length) {
    var sio = new IntersectionObserver(function (en) { en.forEach(function (x) { if (!x.isIntersecting) return;
      chapters.forEach(function (c) { c.classList.toggle("active", c === x.target); });
      big.classList.remove("flip"); void big.offsetWidth; big.classList.add("flip");
      big.textContent = x.target.dataset.year; cap.textContent = x.target.dataset.label;
      bar.style.transform = "scaleX(" + ((chapters.indexOf(x.target) + 1) / chapters.length) + ")"; }); }, { rootMargin: "-45% 0px -45% 0px" });
    chapters.forEach(function (c) { sio.observe(c); });
  }

  /* ---------- 6. Gallery lightbox (native <dialog>) ---------- */
  var dlg = document.getElementById("lightbox");
  if (dlg) {
    var items = $$("[data-lightbox]"), idx = 0, opener = null;
    var stage = dlg.querySelector(".lb-stage"), title = dlg.querySelector(".lb-title"), capt = dlg.querySelector(".lb-cap");
    var show = function (i) { idx = (i + items.length) % items.length; var it = items[idx];
      stage.innerHTML = it.querySelector(".media").innerHTML; title.textContent = it.dataset.title; capt.textContent = it.dataset.caption; };
    items.forEach(function (it, i) { it.addEventListener("click", function (e) { e.preventDefault(); opener = it; show(i); dlg.showModal(); }); });
    dlg.querySelector(".lb-prev").onclick = function () { show(idx - 1); };
    dlg.querySelector(".lb-next").onclick = function () { show(idx + 1); };
    dlg.querySelector(".lb-close").onclick = function () { dlg.close(); };
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener("keydown", function (e) { if (e.key === "ArrowLeft") show(idx + 1); if (e.key === "ArrowRight") show(idx - 1); }); // RTL: left = next
    dlg.addEventListener("close", function () { stage.innerHTML = ""; if (opener) opener.focus(); });
  }

  /* ---------- 7. Gallery filter chips ---------- */
  $$(".chipbar").forEach(function (bar) {
    var target = document.getElementById(bar.dataset.target);
    bar.addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return;
      $$("button", bar).forEach(function (x) { x.setAttribute("aria-pressed", x === b); });
      var f = b.dataset.filter; $$("[data-type]", target).forEach(function (it) { it.hidden = f && it.dataset.type !== f && it.dataset.era !== f; }); });
  });

  /* ---------- 8. Video player: poster first, real player on demand ---------- */
  $$(".player [data-play]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var fig = btn.closest(".player"), src = fig.dataset.src, yt = fig.dataset.youtube, vtt = fig.dataset.captions, frame = fig.querySelector(".frame");
      if (!src && !yt) { fig.querySelector(".status").textContent = "سيُضاف هذا المقطع بعد الحصول على ترخيص النشر."; return; }
      if (src) { var v = document.createElement("video"); v.controls = true; v.autoplay = true; v.playsInline = true; v.preload = "metadata";
        v.innerHTML = '<source src="' + src + '" type="video/mp4">' + (vtt ? '<track kind="captions" srclang="ar" label="العربية" src="' + vtt + '" default>' : "");
        frame.replaceChildren(v); v.focus(); }
      else { var f = document.createElement("iframe"); f.src = "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(yt) + "?autoplay=1&rel=0";
        f.title = fig.dataset.title; f.allow = "autoplay; encrypted-media; picture-in-picture"; f.allowFullscreen = true; frame.replaceChildren(f); }
    });
  });

  /* ---------- 9. Instagram: embeds load only after explicit consent ---------- */
  var ig = document.getElementById("ig-load");
  if (ig) ig.addEventListener("click", function () {
    var s = document.createElement("script"); s.async = true; s.src = "https://www.instagram.com/embed.js";
    s.onload = function () { if (window.instgrm) window.instgrm.Embeds.process(); };
    document.body.appendChild(s); ig.closest(".ig-consent").hidden = true; document.getElementById("ig-posts").hidden = false;
  });
})();
