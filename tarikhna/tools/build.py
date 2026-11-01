#!/usr/bin/env python3
"""تاريخنا — مولّد الموقع الثابت.
يقرأ ملفات data/*.json ويولّد صفحات HTML جاهزة في public/ مع فهرس البحث وخريطة الموقع.
التشغيل:  python3 tools/build.py   (ثم افتح public/index.html أو شغّل خادماً محلياً)
"""
import json, shutil, html, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA, OUT = ROOT / "data", ROOT / "public"
SITE_URL = "https://tarikhna.vercel.app"        # غيّره إلى النطاق الفعلي عند النشر
SITE = "تاريخنا"
UPDATED = "نوفمبر 2026"                         # يُحدَّث مع كل دورة تحرير
SEASON_NOTE = "البيانات محدّثة حتى نهاية موسم 2025–2026"

def load(n): return json.loads((DATA / f"{n}.json").read_text(encoding="utf-8"))
clubs, players, eras = load("clubs"), load("players"), load("eras")
scorers, titles, news, sources = load("scorers"), load("titles"), load("news"), load("sources")
CLUB = {c["id"]: c for c in clubs}
PLAYER = {p["id"]: p for p in players}
ERA = {e["id"]: e for e in eras}
COMP = titles["competitions"]
e = lambda s: html.escape(str(s), quote=True)

def era_of(year):
    for x in eras:
        if x["from"] <= year <= x["to"]: return x["id"]
    return ""

def club_name(cid):
    if cid == "egypt": return "منتخب مصر"
    return CLUB[cid]["name"] if cid in CLUB else cid

# ---------- SVG ----------
LOGO = ('<svg viewBox="0 0 48 48" aria-hidden="true"><defs><linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">'
        '<stop offset="0" stop-color="#D9A441"/><stop offset="1" stop-color="#B8862B"/></linearGradient></defs>'
        '<path d="M24 5 44 41H4Z" fill="url(#lg)"/><path d="M24 5 33 41H24Z" fill="#000" opacity=".15"/>'
        '<circle cx="24" cy="31" r="7" fill="#fff" stroke="#0F3D5E" stroke-width="2"/>'
        '<path d="M24 26.5l3 2.2-1.1 3.5h-3.8L21 28.7Z" fill="#0F3D5E"/></svg>')

def crest(c, cls="crest"):
    a, b = c["colors"][0], c["colors"][1]
    word = c["name"].replace("النادي ", "").replace("نادي ", "").split()[0]
    initials = (word[2:] if word.startswith("ال") else word)[:1]
    return (f'<svg class="{cls}" viewBox="0 0 64 64" role="img" aria-label="شعار مبسّط لـ{e(c["name"])}">'
            f'<path d="M32 3 58 12v20c0 15-11 25-26 29C17 57 6 47 6 32V12Z" fill="{a}" stroke="{b}" stroke-width="3"/>'
            f'<path d="M32 3 58 12v20c0 15-11 25-26 29Z" fill="{b}" opacity=".22"/>'
            f'<text x="32" y="40" text-anchor="middle" font-family="Reem Kufi,Cairo,sans-serif" font-size="26" font-weight="700" '
            f'fill="{b if a.upper()!="#FFFFFF" else "#C8102E"}">{e(initials)}</text></svg>')

HERO_ART = '''<svg class="hero-art" viewBox="0 0 1200 520" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#071C2C"/><stop offset=".6" stop-color="#0F3D5E"/><stop offset="1" stop-color="#7A5A22"/></linearGradient>
<radialGradient id="sun" cx=".22" cy=".42" r=".35"><stop offset="0" stop-color="#F0C673" stop-opacity=".85"/><stop offset="1" stop-color="#F0C673" stop-opacity="0"/></radialGradient>
<pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.2" fill="#fff" opacity=".08"/></pattern></defs>
<rect width="1200" height="520" fill="url(#sky)"/><rect width="1200" height="520" fill="url(#sun)"/><rect width="1200" height="520" fill="url(#dots)"/>
<g opacity=".9"><path d="M60 430 230 170 400 430Z" fill="#B8862B"/><path d="M230 170 400 430H230Z" fill="#7A5A22"/>
<path d="M330 430 440 262 550 430Z" fill="#A87A25"/><path d="M440 262 550 430H440Z" fill="#6A4D1C"/>
<path d="M-20 430 60 312 140 430Z" fill="#9C7124"/></g>
<path d="M0 430C200 410 400 450 600 430S1000 410 1200 432V520H0Z" fill="#0B2A40"/>
<path d="M0 470C240 455 480 488 720 470S1040 455 1200 470" stroke="#D9A441" stroke-opacity=".35" stroke-width="2" fill="none"/>
<g transform="translate(400 110)"><circle r="26" fill="#fff"/><path d="M0-10 9.5-3 6 8H-6l-3.5-11Z" fill="#0B2A40"/></g></svg>'''

def stripes_svg():
    return ('<svg class="bg" viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice" aria-hidden="true">'
            '<rect width="160" height="90" fill="#0B2A40"/><path d="M0 90 50 30 100 90Z" fill="#B8862B" opacity=".5"/>'
            '<path d="M70 90 110 45 150 90Z" fill="#B8862B" opacity=".35"/></svg>')

# ---------- layout ----------
NAV = [("index.html","الرئيسية"),("history.html","التاريخ"),("clubs.html","الأندية"),("players.html","اللاعبون"),
       ("scorers.html","الهدافون"),("archive.html","الأرشيف"),("news.html","الأخبار"),("sources.html","المصادر")]

def page(path, title, desc, body, active="", depth=0, jsonld=None, extra_js=""):
    pre = "../" * depth
    nav = "".join(f'<a href="{pre}{h}"{" aria-current=\"page\"" if h==active else ""}>{t}</a>' for h,t in NAV)
    full_title = f"{title} | {SITE}" if title != SITE else f"{SITE} — ذاكرة الكرة المصرية"
    ld = f'<script type="application/ld+json">{json.dumps(jsonld, ensure_ascii=False)}</script>' if jsonld else ""
    canonical = f"{SITE_URL}/{path}"
    doc = f'''<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(full_title)}</title>
<meta name="description" content="{e(desc)}">
<link rel="canonical" href="{canonical}">
<meta property="og:type" content="website"><meta property="og:site_name" content="{SITE}">
<meta property="og:title" content="{e(full_title)}"><meta property="og:description" content="{e(desc)}">
<meta property="og:url" content="{canonical}"><meta property="og:locale" content="ar_EG">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0F3D5E">
<link rel="icon" href="{pre}assets/img/logo.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=Reem+Kufi:wght@600;700&display=swap">
<link rel="stylesheet" href="{pre}assets/css/style.css">
<script>try{{var t=localStorage.getItem("theme");if(t)document.documentElement.dataset.theme=t}}catch(_){{}}</script>
{ld}
</head>
<body data-root="{pre}">
<a class="skip" href="#main">تخطَّ إلى المحتوى</a>
<header class="site-header"><div class="wrap bar">
<a class="brand" href="{pre}index.html" aria-label="{SITE} — الصفحة الرئيسية">{LOGO}<span>{SITE}</span></a>
<button class="icon-btn menu-btn" aria-expanded="false" aria-controls="nav" aria-label="فتح القائمة"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
<nav id="nav" class="nav" aria-label="التنقل الرئيسي">{nav}</nav>
<a class="icon-btn" href="{pre}search.html" aria-label="البحث في الموقع"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg></a>
<button class="icon-btn theme-btn" aria-label="تبديل الوضع الليلي"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg></button>
</div></header>
<main id="main">
{body}
</main>
<footer class="site-footer"><div class="wrap cols">
<div><a class="brand" href="{pre}index.html">{LOGO}<span>{SITE}</span></a>
<p>أرشيف عربي مفتوح يوثّق ذاكرة كرة القدم المصرية منذ بداياتها حتى اليوم، بمنهجية تعتمد المصادر الرسمية وتُعلن درجة التحقق من كل معلومة.</p>
<p class="updated">آخر تحديث: {UPDATED} — {SEASON_NOTE}.</p></div>
<div><h3>الأقسام</h3><ul>{"".join(f'<li><a href="{pre}{h}">{t}</a></li>' for h,t in NAV[1:5])}</ul></div>
<div><h3>المزيد</h3><ul>{"".join(f'<li><a href="{pre}{h}">{t}</a></li>' for h,t in NAV[5:])}<li><a href="{pre}search.html">البحث المتقدم</a></li></ul></div>
</div></footer>
<script src="{pre}assets/js/data.js" defer></script>
<script src="{pre}assets/js/app.js" defer></script>
{extra_js}
</body></html>'''
    f = OUT / path
    f.parent.mkdir(parents=True, exist_ok=True)
    f.write_text(doc, encoding="utf-8")
    pages.append(path)

pages = []

def head(title, lead, crumbs=None, depth=0):
    pre = "../" * depth
    c = ""
    if crumbs:
        c = '<nav class="crumbs" aria-label="مسار التنقل"><a href="' + pre + 'index.html">الرئيسية</a>' + \
            "".join(f' / <a href="{pre}{h}">{t}</a>' if h else f' / <span aria-current="page">{t}</span>' for h,t in crumbs) + "</nav>"
    return f'<div class="page-head"><div class="wrap">{c}<h1>{e(title)}</h1><p>{lead}</p></div></div>'

def verified_tag(v):
    return '<span class="tag ok">موثّق</span>' if v else '<span class="tag warn">قيد التدقيق</span>'

def club_card(c, pre=""):
    return (f'<a class="card club-card" href="{pre}clubs/{c["id"]}.html">{crest(c)}<div><h3>{e(c["name"])}</h3>'
            f'<p class="meta">{e(c["city"])} · تأسس {c["founded"]}</p>'
            f'<p class="meta">ألقاب الدوري: <b>{c["titles"]["league"]}</b> · أبطال أفريقيا: <b>{c["titles"]["caf_cl"]}</b></p></div></a>')

def player_card(p, pre=""):
    cl = "، ".join(club_name(x) for x in p["clubs"]) or "—"
    return (f'<a class="card" href="{pre}players/{p["id"]}.html"><span class="tag gold">{e(p["position"])}</span>'
            f'<h3>{e(p["name"])}</h3><p class="meta">{e(cl)} · {e(p["years"])}</p><p>{e(p["bio"])}</p></a>')

def fmt_date(d):
    months = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"]
    parts = d.split("-")
    y, m = parts[0], months[int(parts[1])-1]
    return f"{int(parts[2])} {m} {y}" if len(parts) == 3 else f"{m} {y}"

def news_card(n, pre=""):
    br = " breaking" if n["freq"] == "عاجل" else ""
    src = n["source_url"] if n["source_url"].startswith("http") else pre + n["source_url"]
    return (f'<article class="card news-item{br}" data-cat="{e(n["cat"])}"><div><span class="tag">{e(n["cat"])}</span> '
            f'<span class="tag {"warn" if br else "gold"}">{e(n["freq"])}</span></div>'
            f'<h3>{e(n["title"])}</h3><p class="meta"><time datetime="{n["date"]}">{fmt_date(n["date"])}</time></p>'
            f'<p>{e(n["summary"])}</p><p class="meta">المصدر: <a href="{e(src)}" rel="noopener">{e(n["source"])}</a></p></article>')

# ---------- pages ----------
def build_home():
    total_league = sum(1 for t in titles["items"] if t["comp"] == "league")
    era_links = "".join(f'<a class="card" href="history.html#{x["id"]}"><span class="tag gold">{x["range"]}</span><h3>{e(x["name"])}</h3><p>{e(x["summary"][:90])}…</p></a>' for x in eras)
    sections = [
      ("📜","history.html","التاريخ والفترات","ثماني حقب كبرى من 1882 حتى اليوم، بخط زمني يحصي الأحداث المفصلية."),
      ("🛡️","clubs.html","ملفات الأندية","سيرة كل نادٍ، وتاريخه، وألقابه، وسجله في البطولات."),
      ("👤","players.html","سير اللاعبين واللاعبات","سير مختصرة وخلفية المسيرة لأبرز نجوم الكرة المصرية."),
      ("⚽","scorers.html","الهدافون التاريخيون","الأسماء والأهداف والأندية والمواسم في جدول قابل للترتيب."),
      ("🏆","archive.html","أرشيف الألقاب","أرشيف قابل للتصفية بحسب النادي والفترة والبطولة."),
      ("📰","news.html","الأخبار والتحديثات","تغطية يومية للعاجل، وتقرير أسبوعي، وزاوية «ذاكرة الأسبوع»."),
    ]
    sec_cards = "".join(f'<a class="card section-card" href="{h}"><span class="ico" aria-hidden="true">{i}</span><h3>{t}</h3><p>{d}</p></a>' for i,h,t,d in sections)
    top_clubs = "".join(club_card(c) for c in sorted(clubs, key=lambda c: -c["titles"]["league"])[:6])
    latest = "".join(news_card(n) for n in sorted(news, key=lambda n: n["date"], reverse=True)[:3])
    sc = "".join(f'<tr><td class="num">{s["rank"]}</td><td>{e(s["name"])}</td><td class="num">{s["goals"]}</td><td>{e(s["clubs"])}</td></tr>' for s in scorers["alltime"][:3])
    legends = "".join(player_card(PLAYER[i]) for i in ["khatib","aboutrika","salah"])
    body = f'''
<section class="hero" aria-labelledby="hero-title">{HERO_ART}<div class="wrap">
<span class="eyebrow">ذاكرة الكرة المصرية · منذ 1907</span>
<h1 id="hero-title">تاريخنا</h1>
<p class="lead">من ملاعب الجزيرة الأولى إلى منصات التتويج القارية: حكاية الدوري المصري وأنديته ونجومه، موثّقة بالمصادر ومحدّثة باستمرار.</p>
<form class="searchbox" action="search.html" role="search"><label class="sr-only" for="q">ابحث في تاريخنا</label>
<input id="q" name="q" type="search" placeholder="ابحث عن نادٍ، لاعب، موسم، أو بطولة…" autocomplete="off">
<button class="btn" type="submit">بحث</button></form>
<div class="chips" aria-label="عمليات بحث مقترحة"><a class="chip" href="search.html?q=الشاذلي">الشاذلي</a><a class="chip" href="search.html?q=1969">1969</a><a class="chip" href="search.html?club=ismaily">الإسماعيلي</a><a class="chip" href="archive.html?comp=caf_cl">أبطال أفريقيا</a></div>
</div></section>
<div class="wrap"><div class="stats" role="list">
<div class="stat" role="listitem"><b>1948</b><span>انطلاق الدوري الممتاز</span></div>
<div class="stat" role="listitem"><b>7</b><span>أندية توّجت بالدوري</span></div>
<div class="stat" role="listitem"><b>7</b><span>ألقاب أمم أفريقيا للمنتخب</span></div>
<div class="stat" role="listitem"><b>173</b><span>هدفاً للهدّاف التاريخي</span></div>
</div></div>
<section class="block"><div class="wrap"><div class="sec-head"><div><h2>أقسام الموقع</h2><p>كل قسم يجيب عن سؤال: ماذا حدث؟ من صنعه؟ وما مصدره؟</p></div></div>
<div class="grid g3">{sec_cards}</div></div></section>
<section class="block" style="background:var(--surface-2)"><div class="wrap"><div class="sec-head"><div><h2>رحلة عبر الحقب</h2><p>اسحب لاستعراض الحقب الثماني للكرة المصرية.</p></div><a class="btn ghost" href="history.html">الخط الزمني كاملاً</a></div>
<div class="era-strip">{era_links}</div></div></section>
<section class="block"><div class="wrap"><div class="sec-head"><div><h2>أندية صنعت التاريخ</h2><p>الأندية السبعة التي توّجت بالدوري، ومعها قوى صاعدة.</p></div><a class="btn ghost" href="clubs.html">كل الأندية</a></div>
<div class="grid g3">{top_clubs}</div></div></section>
<section class="block"><div class="wrap layout"><div>
<div class="sec-head"><div><h2>آخر الأخبار</h2><p>مختارة وفق معايير تحرير معلنة ومصادر موثوقة.</p></div><a class="btn ghost" href="news.html">كل الأخبار</a></div>
<div class="grid">{latest}</div></div>
<aside class="aside"><div class="card"><h3>الهدافون التاريخيون</h3><div class="table-wrap"><table><thead><tr><th>#</th><th>اللاعب</th><th>أهداف</th><th>النادي</th></tr></thead><tbody>{sc}</tbody></table></div><a href="scorers.html">الجدول الكامل ←</a></div>
<div class="card"><h3>المعرض المرئي</h3><button class="video" type="button" data-video="" aria-label="تشغيل فيديو: لحظات خالدة في الكرة المصرية">{stripes_svg()}<span class="play"><i aria-hidden="true">▶</i><span>لحظات خالدة</span></span></button>
<p class="meta">مساحة لمقاطع مرخّصة تُحمَّل عند الطلب فقط حفاظاً على سرعة الصفحة.</p></div></aside></div></section>
<section class="block" style="background:var(--surface-2)"><div class="wrap"><div class="sec-head"><div><h2>أساطير من الملعب</h2><p>سير مختصرة لنجوم كتبوا فصولاً لا تُنسى.</p></div><a class="btn ghost" href="players.html">كل السير</a></div>
<div class="grid g3">{legends}</div></div></section>'''
    ld = {"@context":"https://schema.org","@type":"WebSite","name":SITE,"url":SITE_URL,"inLanguage":"ar",
          "potentialAction":{"@type":"SearchAction","target":SITE_URL+"/search.html?q={q}","query-input":"required name=q"}}
    page("index.html", SITE, "تاريخنا: موقع عربي يوثّق تاريخ الدوري المصري وكرة القدم المصرية منذ التأسيس حتى اليوم، بملفات الأندية وسير اللاعبين والهدافين وأرشيف الألقاب والأخبار.", body, "index.html", jsonld=ld)

def build_history():
    out = []
    for x in eras:
        ev = "".join(f'<li><time datetime="{v["year"]}">{v["year"]}</time><span>{e(v["text"])}</span></li>' for v in x["events"])
        out.append(f'<section class="era" id="{x["id"]}" aria-labelledby="h-{x["id"]}"><span class="range">{x["range"]}</span><h2 id="h-{x["id"]}">{e(x["name"])}</h2><p>{e(x["summary"])}</p><ul class="events">{ev}</ul></section>')
    toc = "".join(f'<a class="chip" style="color:var(--ink);border-color:var(--line)" href="#{x["id"]}">{e(x["name"])}</a>' for x in eras)
    body = head("تاريخ الكرة المصرية", "خط زمني يحصي الفترات والأحداث الكبرى منذ وصول اللعبة إلى مصر حتى الموسم الأخير، مقسّم إلى ثماني حقب.", [(None,"التاريخ")]) + \
        f'<div class="wrap"><nav class="chips" aria-label="الحقب" style="margin:18px 0">{toc}</nav><div class="timeline">{"".join(out)}</div></div>'
    page("history.html","تاريخ الكرة المصرية","الخط الزمني لكرة القدم المصرية: من تأسيس الأهلي والزمالك واتحاد الكرة إلى انطلاق الدوري 1948 والإنجازات القارية والعصر الحديث.",body,"history.html")

def filter_bar(fields):
    return '<form class="filters" role="search" onsubmit="return false">' + "".join(fields) + '</form><p class="result-count" aria-live="polite" id="count"></p>'

def sel(name, label, opts):
    o = '<option value="">الكل</option>' + "".join(f'<option value="{e(v)}">{e(t)}</option>' for v,t in opts)
    return f'<label class="f">{label}<select name="{name}" id="f-{name}">{o}</select></label>'

def txt(label="بحث نصي", ph="اكتب اسماً أو كلمة…"):
    return f'<label class="f">{label}<input type="search" name="q" id="f-q" placeholder="{ph}"></label>'

CLUB_OPTS = [(c["id"], c["name"]) for c in clubs]
ERA_OPTS = [(x["id"], f'{x["name"]} ({x["range"]})') for x in eras]

def build_clubs():
    cards = "".join(f'<div data-item data-club="{c["id"]}" data-era="{era_of(c["founded"])}" data-text="{e(c["name"]+" "+c["name_en"]+" "+c["city"])}" data-league="{c["titles"]["league"]}">{club_card(c)}</div>' for c in clubs)
    body = head("ملفات الأندية", "ملف تعريفي لكل نادٍ شارك في الدوري المصري: السيرة، التاريخ، الألقاب، والسجل التاريخي للبطولات.", [(None,"الأندية")]) + \
        '<div class="wrap">' + filter_bar([txt(ph="اسم النادي أو المدينة…"), sel("era","حقبة التأسيس",ERA_OPTS),
        sel("champ","تُوّج بالدوري؟",[("1","نعم"),("0","لا")])]) + f'<div class="grid g3" id="list">{cards}</div><p class="empty" hidden id="empty">لا توجد نتائج مطابقة.</p></div>'
    page("clubs.html","ملفات الأندية","ملفات تعريفية لأندية الدوري المصري: الأهلي، الزمالك، الإسماعيلي، المصري، الاتحاد، الترسانة، المقاولون، غزل المحلة، بيراميدز وغيرها.",body,"clubs.html")
    for c in clubs:
        hist = "".join(f"<li>{e(h)}</li>" for h in c["history"])
        hon = "".join(f"<li>{e(h)}</li>" for h in c["honors"])
        rows = "".join(f'<tr><td>{e(t["season"])}</td><td>{e(COMP[t["comp"]])}</td><td>{e(t["note"])}</td></tr>' for t in sorted([t for t in titles["items"] if t["club"]==c["id"]], key=lambda t:t["year"]))
        pl = "".join(player_card(p,"../") for p in players if c["id"] in p["clubs"])
        nw = "".join(news_card(n,"../") for n in news if c["id"] in n["clubs"])
        body = head(c["name"], f'«{e(c["nickname"])}» · {e(c["city"])} · تأسس عام {c["founded"]}', [("clubs.html","الأندية"),(None,c["name"])], 1).replace('<h1>', f'<div class="club-hero">{crest(c)}<div><h1>',1).replace('</h1>', f'</h1><p class="meta" lang="en" dir="ltr" style="text-align:right">{e(c["name_en"])}</p></div></div>',1)
        body += f'''<div class="wrap layout" style="margin-top:20px"><article class="prose">
<div class="facts"><div class="fact"><b>{c["founded"]}</b><span>سنة التأسيس</span></div><div class="fact"><b>{e(c["city"])}</b><span>المدينة</span></div>
<div class="fact"><b>{c["titles"]["league"]}</b><span>لقب دوري</span></div><div class="fact"><b>{c["titles"]["caf_cl"]}</b><span>دوري أبطال أفريقيا</span></div></div>
<h2>السيرة الذاتية للنادي</h2><p>{e(c["summary"])} يُلقَّب بـ«{e(c["nickname"])}»، و{e(c["stadium"])}.</p>
<h2>تاريخ النادي</h2><ul>{hist}</ul>
<h2>ألقاب النادي</h2><ul>{hon}</ul>
<h2>السجل التاريخي للبطولات</h2>{f'<div class="table-wrap"><table><caption>بطولات موثّقة في أرشيف تاريخنا</caption><thead><tr><th>الموسم/السنة</th><th>البطولة</th><th>ملاحظة</th></tr></thead><tbody>{rows}</tbody></table></div>' if rows else '<p class="empty">لا توجد بطولات كبرى مسجّلة بعد في الأرشيف.</p>'}
{f'<h2>من نجوم النادي</h2><div class="grid g2">{pl}</div>' if pl else ''}
{f'<h2>أخبار مرتبطة</h2><div class="grid">{nw}</div>' if nw else ''}
</article><aside class="aside"><div class="card"><h3>حالة المعلومات</h3><p>{verified_tag(c["verified"])}</p><p class="meta">تُراجع البيانات مع كل موسم وفق <a href="../sources.html">منهجية المصادر</a>.</p></div>
<div class="card"><h3>تصفّح</h3><a href="../archive.html?club={c["id"]}">ألقاب النادي في الأرشيف</a><a href="../search.html?club={c["id"]}">كل ما يخص النادي</a><a href="../clubs.html">كل الأندية</a></div></aside></div>'''
        ld = {"@context":"https://schema.org","@type":"SportsTeam","name":c["name"],"alternateName":c["name_en"],"sport":"كرة القدم","foundingDate":str(c["founded"]),
              "location":{"@type":"Place","name":c["city"]},"url":f'{SITE_URL}/clubs/{c["id"]}.html'}
        page(f'clubs/{c["id"]}.html', c["name"], f'{c["name"]}: سيرة النادي وتاريخه منذ {c["founded"]} وألقابه وسجله في الدوري المصري والبطولات الأفريقية.', body, "clubs.html", 1, ld)

def build_players():
    cards = "".join(f'<div data-item data-club="{" ".join(p["clubs"])}" data-era="{p["era"]}" data-gender="{p["gender"]}" data-text="{e(p["name"]+" "+p["name_en"]+" "+p["position"])}">{player_card(p)}</div>' for p in players)
    body = head("سير اللاعبين واللاعبات", "سيرة مختصرة لكل لاعب ولاعبة، مع خلفية موجزة عن المسيرة الرياضية والألقاب.", [(None,"اللاعبون")]) + \
        '<div class="wrap">' + filter_bar([txt(ph="اسم اللاعب أو المركز…"), sel("club","النادي",CLUB_OPTS), sel("era","الحقبة",ERA_OPTS),
        sel("gender","الفئة",[("m","لاعبون"),("f","لاعبات")])]) + f'<div class="grid g3" id="list">{cards}</div><p class="empty" hidden id="empty">لا توجد نتائج مطابقة.</p></div>'
    page("players.html","سير اللاعبين","سير مختصرة لأساطير الكرة المصرية: الخطيب، أبو تريكة، حسام حسن، الشاذلي، محمد صلاح، الحضري وغيرهم.",body,"players.html")
    for p in players:
        cl = "".join(f'<li><a href="../clubs/{x}.html">{e(club_name(x))}</a></li>' for x in p["clubs"]) or "<li>—</li>"
        hon = "".join(f"<li>{e(h)}</li>" for h in p["honors"])
        era = ERA.get(p["era"])
        body = head(p["name"], e(p["bio"]), [("players.html","اللاعبون"),(None,p["name"])], 1)
        body += f'''<div class="wrap layout" style="margin-top:20px"><article class="prose">
<div class="facts"><div class="fact"><b>{e(p["position"])}</b><span>المركز</span></div><div class="fact"><b>{e(p["years"])}</b><span>فترة المسيرة</span></div>
<div class="fact"><b><a href="../history.html#{p["era"]}">{e(era["name"])}</a></b><span>الحقبة</span></div></div>
<h2>سيرة مختصرة</h2><p>{e(p["bio"])}</p>
<h2>خلفية المسيرة الرياضية</h2><p>{e(p["career"])}</p>
<h2>الإنجازات والألقاب</h2><ul>{hon}</ul>
<h2>الأندية المصرية</h2><ul>{cl}</ul></article>
<aside class="aside"><div class="card"><h3>بطاقة سريعة</h3><p class="meta" lang="en" dir="ltr" style="text-align:right">{e(p["name_en"])}</p><p>{verified_tag(p["verified"])}</p><p class="meta">هل لديك تصحيح أو وثيقة؟ راسل فريق التحرير عبر <a href="../sources.html#corrections">صفحة المصادر</a>.</p></div></aside></div>'''
        ld = {"@context":"https://schema.org","@type":"Person","name":p["name"],"alternateName":p["name_en"],"description":p["bio"],
              "memberOf":[{"@type":"SportsTeam","name":club_name(x)} for x in p["clubs"]]}
        page(f'players/{p["id"]}.html', p["name"], f'{p["name"]}: سيرة مختصرة ومسيرة رياضية وألقاب. {p["bio"][:90]}', body, "players.html", 1, ld)

def build_scorers():
    def plink(s):
        return f'<a href="players/{s["player"]}.html">{e(s["name"])}</a>' if s["player"] else e(s["name"])
    rows = "".join(f'<tr><td class="num" data-v="{s["rank"]}">{s["rank"]}</td><td>{plink(s)}</td><td class="num" data-v="{s["goals"]}">{s["goals"]}</td><td>{e(s["clubs"])}</td><td>{e(s["seasons"])}</td><td>{e(s["status"])}</td></tr>' for s in scorers["alltime"])
    rec = "".join(f'<tr><td>{e(r["season"])}</td><td>{e(r["name"])}</td><td>{e(r["club"])}</td><td class="num" data-v="{r["goals"]}">{r["goals"]}</td><td>{e(r["note"])}</td></tr>' for r in scorers["season_records"])
    def th(lbl, i, sortable=True): return f'<th scope="col"><button type="button" data-sort="{i}">{lbl}</button></th>' if sortable else f'<th scope="col">{lbl}</th>'
    body = head("الهدافون التاريخيون", "صفحة مختصرة لأبرز هدافي الدوري المصري: اسم الهداف، عدد الأهداف، النادي، والمواسم. اضغط على عنوان العمود للترتيب.", [(None,"الهدافون")]) + f'''
<div class="wrap" style="margin-top:20px"><p class="callout">{e(scorers["note"])}</p>
<h2 style="margin-top:28px">قائمة الهدافين عبر التاريخ</h2>
<div class="table-wrap"><table class="sortable"><caption>أهداف الدوري الممتاز فقط</caption><thead><tr>{th("الترتيب",0)}{th("اللاعب",1)}{th("الأهداف",2)}{th("النادي/الأندية",3,False)}{th("المواسم",4,False)}{th("حالة الرقم",5,False)}</tr></thead><tbody>{rows}</tbody></table></div>
<h2 style="margin-top:28px">أرقام موسمية بارزة</h2>
<div class="table-wrap"><table class="sortable"><thead><tr>{th("الموسم",0)}{th("الهداف",1)}{th("النادي",2,False)}{th("الأهداف",3)}{th("ملاحظة",4,False)}</tr></thead><tbody>{rec}</tbody></table></div></div>'''
    page("scorers.html","الهدافون التاريخيون","الهدافون التاريخيون للدوري المصري: حسن الشاذلي 173 هدفاً، حسام حسن، والأرقام القياسية الموسمية.",body,"scorers.html")

def build_archive():
    rows = "".join(f'<tr data-item data-club="{t["club"]}" data-comp="{t["comp"]}" data-era="{era_of(t["year"])}" data-text="{e(club_name(t["club"])+" "+COMP[t["comp"]]+" "+t["season"]+" "+t["note"])}"><td>{e(t["season"])}</td><td>{"<a href=\"clubs/"+t["club"]+".html\">"+e(club_name(t["club"]))+"</a>" if t["club"] in CLUB else e(club_name(t["club"]))}</td><td>{e(COMP[t["comp"]])}</td><td>{e(ERA[era_of(t["year"])]["name"])}</td><td>{e(t["note"])}</td></tr>' for t in sorted(titles["items"], key=lambda t:-t["year"]))
    summary = "".join(f'<tr><td><a href="clubs/{c["id"]}.html">{e(c["name"])}</a></td><td class="num">{c["titles"]["league"]}</td><td class="num">{c["titles"]["caf_cl"]}</td></tr>' for c in sorted(clubs,key=lambda c:(-c["titles"]["league"],-c["titles"]["caf_cl"])) if c["titles"]["league"] or c["titles"]["caf_cl"])
    body = head("أرشيف الألقاب والإنجازات", "أرشيف يختصر الألقاب والبطولات والإنجازات الكبرى للأندية والمنتخب، قابل للبحث والتصفية بحسب النادي والفترة واللقب.", [(None,"الأرشيف")]) + \
      '<div class="wrap">' + f'<h2 style="margin-top:24px">الحصيلة الإجمالية</h2><div class="table-wrap"><table><thead><tr><th>النادي</th><th>الدوري الممتاز</th><th>دوري أبطال أفريقيا</th></tr></thead><tbody>{summary}</tbody></table></div>' + \
      '<h2 style="margin-top:28px">سجل البطولات</h2>' + filter_bar([txt(ph="موسم، نادٍ، ملاحظة…"), sel("club","النادي",CLUB_OPTS+[("egypt","منتخب مصر")]), sel("era","الفترة",ERA_OPTS), sel("comp","اللقب",list(COMP.items()))]) + \
      f'<div class="table-wrap"><table><thead><tr><th>الموسم/السنة</th><th>البطل</th><th>البطولة</th><th>الحقبة</th><th>ملاحظة</th></tr></thead><tbody id="list">{rows}</tbody></table></div><p class="empty" hidden id="empty">لا توجد نتائج مطابقة.</p>' + \
      '<p class="meta" style="margin-top:10px">يضم السجل المواسم المفصلية الموثّقة؛ ويُستكمل جدول أبطال الدوري موسماً بموسم ضمن خطة المحتوى.</p></div>'
    page("archive.html","أرشيف الألقاب","أرشيف ألقاب الكرة المصرية: أبطال الدوري الممتاز، دوري أبطال أفريقيا، الكونفدرالية، كأس الكؤوس، وكأس الأمم الأفريقية.",body,"archive.html")

def build_news():
    cats = sorted({n["cat"] for n in news})
    items = "".join(f'<div data-item data-cat="{e(n["cat"])}" data-freq="{e(n["freq"])}" data-text="{e(n["title"]+" "+n["summary"])}">{news_card(n)}</div>' for n in sorted(news,key=lambda n:n["date"],reverse=True))
    body = head("الأخبار والتحديثات", "تغطية مختصرة لأهم أخبار الكرة المصرية: العاجل يومياً، والتقرير الأسبوعي كل خميس، وزاوية «ذاكرة الأسبوع» التي تربط الحاضر بالتاريخ.", [(None,"الأخبار")]) + \
      '<div class="wrap layout" style="margin-top:20px"><div>' + filter_bar([txt(ph="عنوان أو كلمة…"), sel("cat","التصنيف",[(c,c) for c in cats]), sel("freq","نوع التغطية",[("عاجل","عاجل (يومي)"),("تقرير","تقرير"),("أسبوعي","أسبوعي")])]) + \
      f'<div class="grid" id="list">{items}</div><p class="empty" hidden id="empty">لا توجد أخبار مطابقة.</p></div>' + \
      '''<aside class="aside"><div class="card"><h3>معايير اختيار الخبر</h3><ol style="padding-inline-start:1.2em;margin:0">
<li>الأثر: يغيّر ترتيباً أو لقباً أو قاعدة.</li><li>التوثيق: مصدر رسمي أو مصدران مستقلان.</li><li>الصلة التاريخية: رقم قياسي أو ذكرى أو سابقة.</li>
<li>الحداثة: خلال 24 ساعة للعاجل و7 أيام للأسبوعي.</li><li>الحياد: لا شائعات انتقالات بلا مصدر.</li></ol></div>
<div class="card"><h3>إيقاع التغطية</h3><p><b>يومياً:</b> النتائج، القرارات الرسمية، العاجل.</p><p><b>أسبوعياً:</b> ملخص الجولة، ترتيب الهدافين، «ذاكرة الأسبوع».</p><p><b>موسمياً:</b> تحديث ملفات الأندية والأرشيف.</p></div></aside></div>'''
    page("news.html","الأخبار والتحديثات","أخبار الدوري المصري والمنتخب والبطولات الأفريقية بتغطية يومية وأسبوعية ومعايير تحرير معلنة.",body,"news.html")

def build_sources():
    groups = "".join(f'<h2 style="margin-top:28px">{e(g["group"])}</h2><div class="grid g2">' + "".join(f'<div class="card"><h3><a href="{e(i["url"])}" rel="noopener">{e(i["name"])}</a></h3><p>{e(i["use"])}</p></div>' for i in g["items"]) + '</div>' for g in sources)
    body = head("المصادر والمرجعية", "من أين نأتي بالمعلومة؟ وكيف نتحقق منها؟ هذا القسم يعرض مصادرنا ومنهجيتنا بشفافية.", [(None,"المصادر")]) + f'''
<div class="wrap prose" style="max-width:var(--wrap);margin-top:20px">
<div class="callout"><h2>منهجية التحقق</h2><ol><li><b>المصدر الأولي أولاً:</b> بيانات الاتحاد المصري، الكاف، فيفا، والمواقع الرسمية للأندية.</li>
<li><b>قاعدة المصدرين:</b> كل رقم تاريخي يُطابق بمصدرين مستقلين على الأقل قبل وسمه «موثّق».</li>
<li><b>إعلان الخلاف:</b> عند تعارض المصادر نعرض الرقم الأكثر تداولاً ونذكر البدائل (مثل مجموع أهداف الشاذلي).</li>
<li><b>سجل التعديلات:</b> كل تصحيح يُؤرَّخ ويُذكر سببه.</li></ol>
<p><span class="tag ok">موثّق</span> طابق مصدرين على الأقل · <span class="tag warn">قيد التدقيق</span> معلومة متداولة تنتظر المطابقة.</p></div>
{groups}
<h2 id="corrections" style="margin-top:28px">التصحيحات والمساهمات</h2>
<p>نرحّب بالوثائق والصور والقصاصات الصحفية من الجمهور والأندية. تُرسل المساهمة مع مصدرها وتاريخها، ويراجعها المحرر المسؤول قبل النشر.</p></div>'''
    page("sources.html","المصادر والمرجعية","مصادر موقع تاريخنا ومنهجية التحقق من المعلومات التاريخية والإحصاءات الكروية المصرية.",body,"sources.html")

def build_search():
    body = head("البحث المتقدم", "ابحث في كل محتوى تاريخنا، وصفِّ النتائج بحسب النوع والنادي والفترة واللقب.", [(None,"البحث")]) + \
      '<div class="wrap">' + filter_bar([txt("كلمة البحث","نادٍ، لاعب، سنة، بطولة…"), sel("type","نوع المحتوى",[("club","نادٍ"),("player","لاعب/ة"),("title","لقب"),("event","حدث تاريخي"),("news","خبر")]),
      sel("club","النادي",CLUB_OPTS), sel("era","الفترة",ERA_OPTS), sel("comp","اللقب",list(COMP.items()))]) + \
      '<div class="grid" id="results"></div><p class="empty" hidden id="empty">لا توجد نتائج. جرّب كلمة أقصر أو أزل أحد المرشحات.</p></div>'
    page("search.html","البحث المتقدم","ابحث في تاريخ الكرة المصرية بحسب النادي والفترة واللاعب واللقب.",body,"")

def build_404():
    body = head("الصفحة غير موجودة", 'ربما نُقلت الصفحة أو تغيّر رابطها. جرّب <a href="search.html">البحث</a> أو عُد إلى <a href="index.html">الرئيسية</a>.')
    page("404.html","الصفحة غير موجودة","الصفحة المطلوبة غير موجودة.",body)

def build_index():
    idx = []
    for c in clubs:
        idx.append({"t":"club","title":c["name"],"url":f'clubs/{c["id"]}.html',"club":[c["id"]],"era":era_of(c["founded"]),"text":" ".join([c["name_en"],c["city"],c["summary"],c["nickname"]])})
    for p in players:
        idx.append({"t":"player","title":p["name"],"url":f'players/{p["id"]}.html',"club":p["clubs"],"era":p["era"],"text":" ".join([p["name_en"],p["position"],p["bio"],p["years"]])})
    for t in titles["items"]:
        idx.append({"t":"title","title":f'{COMP[t["comp"]]} — {t["season"]}',"url":(f'clubs/{t["club"]}.html' if t["club"] in CLUB else "archive.html"),"club":[t["club"]],"era":era_of(t["year"]),"comp":t["comp"],"text":club_name(t["club"])+" "+t["note"]})
    for x in eras:
        for v in x["events"]:
            idx.append({"t":"event","title":f'{v["year"]}: {x["name"]}',"url":f'history.html#{x["id"]}',"club":[],"era":x["id"],"text":v["text"]})
    for n in news:
        idx.append({"t":"news","title":n["title"],"url":"news.html","club":n["clubs"],"era":era_of(int(n["date"][:4])),"text":n["summary"]+" "+n["date"]})
    (OUT/"assets/js/data.js").write_text("window.TARIKHNA_INDEX="+json.dumps(idx,ensure_ascii=False,separators=(",",":"))+";\n",encoding="utf-8")

def build_meta():
    today = datetime.date.today().isoformat()
    urls = "".join(f"<url><loc>{SITE_URL}/{p}</loc><lastmod>{today}</lastmod></url>" for p in pages if p != "404.html")
    (OUT/"sitemap.xml").write_text(f'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{urls}</urlset>\n',encoding="utf-8")
    (OUT/"robots.txt").write_text(f"User-agent: *\nAllow: /\nSitemap: {SITE_URL}/sitemap.xml\n",encoding="utf-8")

if __name__ == "__main__":
    if OUT.exists(): shutil.rmtree(OUT)
    shutil.copytree(ROOT/"assets", OUT/"assets")
    (OUT/"assets/img/logo.svg").write_text(LOGO.replace('aria-hidden="true"','xmlns="http://www.w3.org/2000/svg"'),encoding="utf-8")
    for f in [build_home,build_history,build_clubs,build_players,build_scorers,build_archive,build_news,build_sources,build_search,build_404,build_index]: f()
    build_meta()
    print(f"تم توليد {len(pages)} صفحة في {OUT}")
