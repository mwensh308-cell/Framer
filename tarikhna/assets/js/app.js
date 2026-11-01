/* تاريخنا — تفاعلات الواجهة (بدون مكتبات خارجية) */
(function () {
  "use strict";
  var root = document.body.dataset.root || "";

  // تطبيع النص العربي: إزالة التشكيل وتوحيد الهمزات والتاء المربوطة والياء
  function norm(s) {
    return String(s || "").toLowerCase()
      .replace(/[ً-ْـ]/g, "")
      .replace(/[أإآٱ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/ؤ/g, "و").replace(/ئ/g, "ي")
      .replace(/[–—-]/g, " ").replace(/\s+/g, " ").trim();
  }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (_) { return null; } }

  // الوضع الليلي
  var themeBtn = document.querySelector(".theme-btn");
  if (themeBtn) themeBtn.addEventListener("click", function () {
    var cur = document.documentElement.dataset.theme ||
      (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    var next = cur === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next; store("theme", next);
  });

  // قائمة الجوال
  var menuBtn = document.querySelector(".menu-btn"), nav = document.getElementById("nav");
  if (menuBtn && nav) {
    menuBtn.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      menuBtn.setAttribute("aria-expanded", open); menuBtn.setAttribute("aria-label", open ? "إغلاق القائمة" : "فتح القائمة");
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && nav.classList.contains("open")) { nav.classList.remove("open"); menuBtn.setAttribute("aria-expanded", "false"); menuBtn.focus(); } });
  }

  var params = new URLSearchParams(location.search);
  var form = document.querySelector(".filters");
  function fields() { return form ? Array.prototype.slice.call(form.querySelectorAll("select,input")) : []; }
  // تعبئة المرشحات من الرابط لتكون النتائج قابلة للمشاركة
  fields().forEach(function (f) { if (params.get(f.name)) f.value = params.get(f.name); });
  function syncURL() {
    var p = new URLSearchParams();
    fields().forEach(function (f) { if (f.value) p.set(f.name, f.value); });
    history.replaceState(null, "", location.pathname + (p.toString() ? "?" + p : ""));
  }
  function setCount(n) {
    var c = document.getElementById("count"); if (c) c.textContent = n + " نتيجة";
    var em = document.getElementById("empty"); if (em) em.hidden = n > 0;
  }

  // تصفية القوائم الثابتة (الأندية، اللاعبون، الأرشيف، الأخبار)
  var list = document.getElementById("list");
  if (form && list) {
    var items = Array.prototype.slice.call(list.querySelectorAll("[data-item]"));
    var run = function () {
      var shown = 0, q = norm((form.querySelector("[name=q]") || {}).value);
      items.forEach(function (it) {
        var ok = !q || norm(it.dataset.text).indexOf(q) > -1;
        fields().forEach(function (f) {
          if (!ok || f.name === "q" || !f.value) return;
          if (f.name === "champ") ok = (Number(it.dataset.league) > 0) === (f.value === "1");
          else ok = (" " + (it.dataset[f.name] || "") + " ").indexOf(" " + f.value + " ") > -1;
        });
        it.hidden = !ok; if (ok) shown++;
      });
      setCount(shown); syncURL();
    };
    form.addEventListener("input", run); form.addEventListener("change", run); run();
  }

  // البحث الشامل
  var results = document.getElementById("results");
  if (form && results && window.TARIKHNA_INDEX) {
    var LABEL = { club: "نادٍ", player: "لاعب/ة", title: "لقب", event: "حدث تاريخي", news: "خبر" };
    var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
    var data = window.TARIKHNA_INDEX.map(function (d) { d._n = norm(d.title + " " + d.text); d._t = norm(d.title); return d; });
    var search = function () {
      var v = {}; fields().forEach(function (f) { v[f.name] = f.value; });
      var terms = norm(v.q).split(" ").filter(Boolean);
      var out = data.filter(function (d) {
        if (v.type && d.t !== v.type) return false;
        if (v.club && d.club.indexOf(v.club) < 0) return false;
        if (v.era && d.era !== v.era) return false;
        if (v.comp && d.comp !== v.comp) return false;
        return terms.every(function (t) { return d._n.indexOf(t) > -1; });
      }).map(function (d) {
        var s = 0; terms.forEach(function (t) { if (d._t.indexOf(t) > -1) s += 3; }); if (d.t === "club" || d.t === "player") s += 1;
        return { d: d, s: s };
      }).sort(function (a, b) { return b.s - a.s; }).slice(0, 60);
      results.innerHTML = out.map(function (r) {
        var d = r.d, title = esc(d.title), text = esc(d.text.slice(0, 180));
        terms.forEach(function (t) { if (t.length > 1) { var re = new RegExp("(" + t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "g"); title = title.replace(re, "<mark>$1</mark>"); } });
        return '<a class="card" href="' + root + d.url + '"><span class="tag gold">' + LABEL[d.t] + '</span><h3>' + title + '</h3><p>' + text + '</p></a>';
      }).join("");
      setCount(out.length); syncURL();
    };
    form.addEventListener("input", search); form.addEventListener("change", search); search();
  }

  // ترتيب الجداول
  Array.prototype.forEach.call(document.querySelectorAll("table.sortable"), function (table) {
    table.querySelectorAll("th button[data-sort]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var i = +btn.dataset.sort, th = btn.parentNode, asc = th.getAttribute("aria-sort") !== "ascending";
        table.querySelectorAll("th").forEach(function (h) { h.removeAttribute("aria-sort"); });
        th.setAttribute("aria-sort", asc ? "ascending" : "descending");
        var body = table.tBodies[0], rows = Array.prototype.slice.call(body.rows);
        rows.sort(function (a, b) {
          var x = a.cells[i], y = b.cells[i];
          var xv = x.dataset.v !== undefined ? +x.dataset.v : x.textContent, yv = y.dataset.v !== undefined ? +y.dataset.v : y.textContent;
          var r = typeof xv === "number" ? xv - yv : String(xv).localeCompare(String(yv), "ar");
          return asc ? r : -r;
        }).forEach(function (r) { body.appendChild(r); });
      });
    });
  });

  // فيديو خفيف: لا يُحمَّل المشغل إلا عند الضغط
  document.querySelectorAll("button.video").forEach(function (b) {
    b.addEventListener("click", function () {
      var id = b.dataset.video;
      if (!id) { b.querySelector(".play span").textContent = "سيُضاف مقطع مرخّص قريباً"; return; }
      var f = document.createElement("iframe");
      f.src = "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(id) + "?autoplay=1";
      f.title = b.getAttribute("aria-label"); f.allow = "autoplay; encrypted-media; picture-in-picture"; f.allowFullscreen = true;
      f.style.cssText = "position:absolute;inset:0;width:100%;height:100%;border:0";
      var w = document.createElement("div"); w.className = "video"; w.appendChild(f); b.replaceWith(w);
    });
  });
})();
