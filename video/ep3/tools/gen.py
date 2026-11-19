"""Generate the EP3 HyperFrames compositions from data/timeline.json.

Run from the project root:  python3 tools/gen.py
Every timed element is written into static HTML so it stays editable in Studio.
"""
import html
import json
import re
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TL = json.load(open(os.path.join(ROOT, "data/timeline.json")))
SECS = TL["sections"]
TOTAL = TL["total"]
W, H = 1920, 1080

# Shot plan per section. "P:" marks a 2.5D parallax shot (cutout in assets/cut).
SHOTS = {
    "intro": ["Vice_City_05", "Leonida_Keys_02", "Jason_and_Lucia_17", "P:Jason_and_Lucia_15", "Jason_and_Lucia_19", "Jason_and_Lucia_14"],
    "jason": ["P:Jason_Duval_02", "Jason_Duval_14", "Jason_Duval_03", "Jason_Duval_06", "P:Jason_Duval_15", "Jason_Duval_19", "Jason_Duval_01"],
    "lucia": ["P:Lucia_Caminos_01", "Lucia_Caminos_05", "Lucia_Caminos_02", "Lucia_Caminos_03", "P:Lucia_Caminos_13", "Lucia_Caminos_12"],
    "cal": ["P:Cal_Hampton_01", "Cal_Hampton_02", "Cal_Hampton_03", "Cal_Hampton_04", "Jason_Duval_06"],
    "brian": ["Brian_Heder_01", "Brian_Heder_02", "Jason_Duval_03", "Brian_Heder_03", "Brian_Heder_04"],
    "boobie": ["P:Boobie_Ike_03", "Vice_City_08", "Boobie_Ike_01", "Boobie_Ike_02", "Boobie_Ike_04"],
    "drequan": ["P:DreQuan_Priest_03", "DreQuan_Priest_01", "DreQuan_Priest_02", "DreQuan_Priest_04"],
    "dimez": ["P:Real_Dimez_04", "Real_Dimez_01", "Real_Dimez_02", "Real_Dimez_03"],
    "raul": ["P:Raul_Bautista_01", "Raul_Bautista_02", "P:Raul_Bautista_03", "Raul_Bautista_04", "Jason_Duval_17"],
}
NAMED = [s for s in SECS if s["name"]]
AR_NAME = {s["id"]: s["title"] for s in SECS}

FONT = """
    @font-face { font-family: "Cairo"; font-weight: 700; src: url("assets/fonts/cairo-arabic-700-normal.woff2") format("woff2");
      unicode-range: U+0600-06FF, U+0750-077F, U+0870-08FF, U+FB50-FDFF, U+FE70-FEFF, U+200C-200F; }
    @font-face { font-family: "Cairo"; font-weight: 700; src: url("assets/fonts/cairo-latin-700-normal.woff2") format("woff2");
      unicode-range: U+0000-00FF, U+2000-206F; }
    @font-face { font-family: "Cairo"; font-weight: 900; src: url("assets/fonts/cairo-arabic-900-normal.woff2") format("woff2");
      unicode-range: U+0600-06FF, U+0750-077F, U+0870-08FF, U+FB50-FDFF, U+FE70-FEFF, U+200C-200F; }
    @font-face { font-family: "Cairo"; font-weight: 900; src: url("assets/fonts/cairo-latin-900-normal.woff2") format("woff2");
      unicode-range: U+0000-00FF, U+2000-206F; }
"""
PINK, CYAN, GOLD, INK = "#ff3d8b", "#46e0ff", "#ffd27a", "#0a0618"


def r(x):
    return round(x, 3)


def esc(s):
    return html.escape(s, quote=True)


# ---- scene boundaries -------------------------------------------------------
TITLE_END = 4.6
B = [TITLE_END] + [r(s["start"] - 0.7) for s in SECS[1:]]
OUTRO = SECS[-1]
END_START = r(OUTRO["start"] + OUTRO["dur"] + 0.7)
B.append(END_START)  # boundary where the end card starts


def scene_file(cid, body, script, extra_css=""):
    return f"""<template>
  <style>{FONT}
    #root {{ position: absolute; inset: 0; overflow: hidden; background: {INK}; }}
    .shot, .shot .in {{ position: absolute; inset: 0; overflow: hidden; }}
    .shot img {{ position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }}
    .shade {{ position: absolute; inset: 0; background: radial-gradient(ellipse at 50% 45%, rgba(10,6,24,0) 55%, rgba(10,6,24,.55) 100%); }}
{extra_css}
  </style>
  <div id="root" data-composition-id="{cid}" data-width="{W}" data-height="{H}">
{body}
  </div>
  <script>
    const tl = gsap.timeline({{ paused: true }});
{script}
    window.__timelines["{cid}"] = tl;
  </script>
</template>
"""


def shots_markup(cid, names, L, track=0, offset=0.0):
    body, js = [], []
    n = len(names)
    step = L / n
    for k, raw in enumerate(names):
        par = raw.startswith("P:")
        name = raw[2:] if par else raw
        st = 0 if k == 0 else r(k * step - 0.5)
        en = L if k == n - 1 else r((k + 1) * step)
        dur = r(en - st)
        st = r(st + offset)
        sid = f"{cid}-shot{k+1}"
        if par:
            inner = (f'<img id="{sid}-bg" src="assets/img/{name}.jpg" alt="">'
                     f'<img id="{sid}-fg" src="assets/cut/{name}.webp" alt="">')
        else:
            inner = f'<img id="{sid}-img" src="assets/img/{name}.jpg" alt="">'
        body.append(f'    <div id="{sid}" class="clip shot" data-start="{st}" data-duration="{dur}" '
                    f'data-track-index="{track}" style="z-index:{k+1}"><div id="{sid}-in" class="in">{inner}</div></div>')
        if k > 0:
            js.append(f'    tl.fromTo("#{sid}-in", {{ opacity: 0 }}, {{ opacity: 1, duration: 0.5, ease: "power1.inOut" }}, {st});')
        d = 1 if k % 2 == 0 else -1
        if par:
            js.append(f'    tl.fromTo("#{sid}-bg", {{ scale: 1.03, x: {-14*d} }}, {{ scale: 1.07, x: {14*d}, duration: {dur}, ease: "none", transformOrigin: "50% 55%" }}, {st});')
            js.append(f'    tl.fromTo("#{sid}-fg", {{ scale: 1.04, x: {-30*d}, y: 6 }}, {{ scale: 1.16, x: {34*d}, y: -6, duration: {dur}, ease: "none", transformOrigin: "50% 60%" }}, {st});')
        else:
            js.append(f'    tl.fromTo("#{sid}-img", {{ scale: 1.02, x: {-24*d} }}, {{ scale: 1.11, x: {24*d}, duration: {dur}, ease: "none" }}, {st});')
    return "\n".join(body), "\n".join(js)


CARD_CSS = f"""
    .card {{ position: absolute; left: 120px; top: 380px; width: 760px; direction: rtl; z-index: 50; }}
    .card .panel {{ position: absolute; inset: 0; background: linear-gradient(270deg, rgba(10,6,24,.86), rgba(10,6,24,.55)); border-right: 8px solid {PINK}; }}
    .card .body {{ position: relative; padding: 30px 40px 34px; text-align: right; }}
    .card .kick {{ font: 700 28px/1.2 "Cairo", sans-serif; color: {CYAN}; letter-spacing: .02em; }}
    .card .en {{ font: 400 80px/1.05 "Archivo Black", sans-serif; letter-spacing: -.01em; direction: ltr; text-align: right; margin-top: 8px; }}
    .card .en span {{ background: linear-gradient(90deg, {GOLD}, {PINK}); -webkit-background-clip: text; background-clip: text; color: transparent; }}
    .card .ar {{ font: 900 54px/1.35 "Cairo", sans-serif; color: #fff; }}
    .card .role {{ display: inline-block; margin-top: 10px; font: 700 32px/1.4 "Cairo", sans-serif; color: #fff; padding: 4px 22px; border: 2px solid {GOLD}; }}
"""


def card_markup(cid, s, idx, start, hold):
    p = f"{cid}-card"
    body = f"""    <div id="{p}" class="clip card" data-start="{start}" data-duration="{hold}" data-track-index="2">
      <div id="{p}-panel" class="panel"></div>
      <div id="{p}-body" class="body">
        <div id="{p}-kick" class="kick">ملف الشخصية · <span dir="ltr" style="unicode-bidi:isolate">{idx:02d} / {len(NAMED):02d}</span></div>
        <div id="{p}-en" class="en"><span>{esc(s["name"])}</span></div>
        <div id="{p}-ar" class="ar">{esc(s["title"])}</div>
        <div id="{p}-role" class="role">{esc(s["role"])}</div>
      </div>
    </div>"""
    a = start
    out = r(start + hold - 0.5)
    js = f"""    tl.fromTo("#{p}-panel", {{ clipPath: "inset(0 0 0 100%)" }}, {{ clipPath: "inset(0 0 0 0%)", duration: 0.55, ease: "power3.out" }}, {a});
    tl.fromTo("#{p}-kick", {{ opacity: 0, x: 40 }}, {{ opacity: 1, x: 0, duration: 0.4, ease: "power3.out" }}, {r(a+0.25)});
    tl.fromTo("#{p}-en", {{ opacity: 0, y: 40 }}, {{ opacity: 1, y: 0, duration: 0.5, ease: "back.out(1.6)" }}, {r(a+0.35)});
    tl.fromTo("#{p}-ar", {{ opacity: 0, y: 30 }}, {{ opacity: 1, y: 0, duration: 0.45, ease: "power3.out" }}, {r(a+0.5)});
    tl.fromTo("#{p}-role", {{ opacity: 0, scale: 0.8 }}, {{ opacity: 1, scale: 1, duration: 0.4, ease: "back.out(2)", transformOrigin: "100% 50%" }}, {r(a+0.7)});
    tl.fromTo("#{p}-body", {{ opacity: 1, x: 0 }}, {{ opacity: 0, x: -50, duration: 0.45, ease: "power2.in" }}, {out});
    tl.fromTo("#{p}-panel", {{ opacity: 1 }}, {{ opacity: 0, duration: 0.45, ease: "power2.in" }}, {out});"""
    return body, js


def section_scene(i, s):
    cid = f"s-{s['id']}"
    L = r(B[i + 1] - B[i])
    if s["id"] == "outro":
        return outro_scene(i, s, cid, L)
    body, js = shots_markup(cid, SHOTS[s["id"]], L)
    body += f'\n    <div id="{cid}-shade" class="clip shade" data-start="0" data-duration="{L}" data-track-index="1" style="z-index:40"></div>'
    css = ""
    if s["name"]:
        idx = [x["id"] for x in NAMED].index(s["id"]) + 1
        start = r(s["start"] - B[i] + 0.25)
        cb, cj = card_markup(cid, s, idx, start, 8.0)
        body += "\n" + cb
        js += "\n" + cj
        css = CARD_CSS
    return cid, L, scene_file(cid, body, js, css)


def find_word(words, prefixes, after=0.0):
    for w in words:
        if w["t"] >= after and any(w["w"].startswith(p) for p in prefixes):
            return w["t"]
    return None


def outro_scene(i, s, cid, L):
    off = s["start"] - B[i]
    words = s["words"]
    tiles = [("cal", "Cal_Hampton_01", ["صديق"]), ("brian", "Brian_Heder_02", ["ومهرب", "مهرب"]),
             ("boobie", "Boobie_Ike_03", ["وأسطورة", "واسطورة", "أسطورة"]), ("drequan", "DreQuan_Priest_03", ["وصاحب"]),
             ("dimez", "Real_Dimez_04", ["وثنائي"]), ("raul", "Raul_Bautista_03", ["ولص"])]
    names = {x["id"]: x["name"] for x in SECS}
    grid_end = find_word(words, ["والحين"]) or 14.0
    grid_end = r(off + grid_end - 0.2)
    css = f"""
    .grid {{ position: absolute; inset: 0; background: {INK}; }}
    .tile {{ position: absolute; width: 600px; height: 360px; overflow: hidden; }}
    .tile img {{ position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }}
    .tile .lab {{ position: absolute; left: 0; right: 0; bottom: 0; padding: 10px 18px; font: 400 34px/1.1 "Archivo Black", sans-serif; color: #fff;
      background: linear-gradient(0deg, rgba(10,6,24,.9), rgba(10,6,24,0)); }}
    .tile .ring {{ position: absolute; inset: 0; border: 6px solid {GOLD}; }}
"""
    body = [f'    <div id="{cid}-grid" class="clip grid" data-start="0" data-duration="{grid_end}" data-track-index="0">']
    js = []
    for k, (sid, img, pre) in enumerate(tiles):
        col, row = k % 3, k // 3
        x, y = 60 + col * 620, 70 + row * 390
        t = find_word(words, pre)
        t = r(off + (t if t is not None else 1.0 + k))
        tid = f"{cid}-t{k+1}"
        body.append(f'      <div id="{tid}" class="tile" style="left:{x}px;top:{y}px"><img id="{tid}-img" src="assets/img/{img}.jpg" alt="">'
                    f'<div id="{tid}-lab" class="lab">{esc(names[sid])}</div><div id="{tid}-ring" class="ring"></div></div>')
        js.append(f'    tl.fromTo("#{tid}", {{ opacity: 0.18, scale: 0.94 }}, {{ opacity: 1, scale: 1, duration: 0.45, ease: "back.out(1.7)" }}, {t});')
        js.append(f'    tl.fromTo("#{tid}-ring", {{ opacity: 1 }}, {{ opacity: 0, duration: 1.4, ease: "power1.in" }}, {r(t+0.3)});')
        js.append(f'    tl.fromTo("#{tid}-img", {{ scale: 1.0 }}, {{ scale: 1.12, duration: {r(grid_end - t + 0.1)}, ease: "none" }}, {t});')
    body.append("    </div>")
    sb, sj = shots_markup(cid, ["Jason_and_Lucia_20", "Jason_Lucia_Lock_And_Load_landscape"], r(L - grid_end), offset=grid_end)
    shifted = sj.split("\n")
    body.append(sb)
    body.append(f'    <div id="{cid}-shade" class="clip shade" data-start="{grid_end}" data-duration="{r(L-grid_end)}" data-track-index="1" style="z-index:40"></div>')
    return cid, L, scene_file(cid, "\n".join(body), "\n".join(js + shifted), css)


def title_scene():
    cid = "title"
    L = TITLE_END
    css = f"""
    .t-wrap {{ position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; direction: rtl; text-align: center; z-index: 60; }}
    #title-series {{ font: 700 36px/1.3 "Cairo", sans-serif; color: {CYAN}; }}
    #title-main {{ font: 900 168px/1.15 "Cairo", sans-serif; color: #fff; text-shadow: 0 0 30px rgba(255,61,139,.75), 0 6px 40px rgba(0,0,0,.6); }}
    #title-en {{ font: 400 42px/1.2 "Archivo Black", sans-serif; color: {GOLD}; letter-spacing: .18em; direction: ltr; }}
    #title-ep {{ display: inline-block; margin-top: 18px; font: 900 44px/1.3 "Cairo", sans-serif; color: {INK}; background: {GOLD}; padding: 2px 28px; }}
    #title-dim {{ position: absolute; inset: 0; background: linear-gradient(180deg, rgba(10,6,24,.55), rgba(10,6,24,.75)); z-index: 50; }}
"""
    body = f"""    <div id="title-shot" class="clip shot" data-start="0" data-duration="{L}" data-track-index="0"><div id="title-in" class="in"><img id="title-img" src="assets/img/Jason_Lucia_Rooftop_landscape.jpg" alt=""></div></div>
    <div id="title-dim" class="clip" data-start="0" data-duration="{L}" data-track-index="1"></div>
    <div id="title-wrap" class="clip t-wrap" data-start="0" data-duration="{L}" data-track-index="2">
      <div id="title-series">سلسلة GTA 6 بالسعودي</div>
      <div id="title-main">وجيه ليونيدا</div>
      <div id="title-en">THE PEOPLE OF LEONIDA</div>
      <div><span id="title-ep">الحلقة 3</span></div>
    </div>"""
    js = """    tl.fromTo("#title-img", { scale: 1.18 }, { scale: 1.04, duration: 4.6, ease: "power2.out" }, 0);
    tl.fromTo("#title-series", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }, 0.3);
    tl.fromTo("#title-main", { opacity: 0, scale: 1.35 }, { opacity: 1, scale: 1, duration: 0.7, ease: "power4.out" }, 0.7);
    tl.fromTo("#title-en", { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }, 1.3);
    tl.fromTo("#title-ep", { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(2.2)" }, 2.0);
    tl.fromTo("#title-wrap", { scale: 1 }, { scale: 1.06, duration: 0.25, ease: "power2.out", yoyo: true, repeat: 1 }, 3.55);"""
    return cid, L, scene_file(cid, body, js, css)


def endcard_scene():
    cid = "endcard"
    L = r(TOTAL - END_START)
    css = f"""
    #end-dim {{ position: absolute; inset: 0; background: linear-gradient(180deg, rgba(10,6,24,.6), rgba(10,6,24,.9)); z-index: 50; }}
    .e-wrap {{ position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; direction: rtl; text-align: center; z-index: 60; gap: 18px; }}
    #end-q {{ font: 900 64px/1.35 "Cairo", sans-serif; color: #fff; }}
    #end-btn {{ display: inline-flex; align-items: center; gap: 18px; background: #e8222e; color: #fff; font: 900 50px/1.3 "Cairo", sans-serif; padding: 10px 40px; border-radius: 14px; }}
    #end-next {{ font: 700 40px/1.4 "Cairo", sans-serif; color: {GOLD}; }}
    #end-credit {{ position: absolute; left: 0; right: 0; bottom: 120px; font: 700 28px/1.5 "Cairo", sans-serif; color: rgba(255,255,255,.78); direction: rtl; text-align: center; z-index: 60; }}
"""
    bell = ('<svg width="54" height="54" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Zm7-6V11a7 7 0 0 0-5.5-6.84V3.5a1.5 1.5 0 0 0-3 0v.66A7 7 0 0 0 5 11v5l-2 2v1h18v-1Z"/></svg>')
    body = f"""    <div id="end-shot" class="clip shot" data-start="0" data-duration="{L}" data-track-index="0"><div id="end-in" class="in"><img id="end-img" src="assets/img/Jason_and_Lucia_16.jpg" alt=""></div></div>
    <div id="end-dim" class="clip" data-start="0" data-duration="{L}" data-track-index="1"></div>
    <div id="end-wrap" class="clip e-wrap" data-start="0" data-duration="{L}" data-track-index="2">
      <div id="end-q">مين بيخون جايسون ولوسيا؟</div>
      <div id="end-btn-wrap"><span id="end-btn">{bell}<span>اشترك وفعّل الجرس</span></span></div>
      <div id="end-next">الحلقة الجاية قريباً</div>
    </div>
    <div id="end-credit" class="clip" data-start="0" data-duration="{L}" data-track-index="3">الصور من المواد الرسمية للعبة © Rockstar Games · القناة غير تابعة لـ Rockstar Games</div>"""
    js = f"""    tl.fromTo("#end-img", {{ scale: 1.04 }}, {{ scale: 1.12, duration: {L}, ease: "none" }}, 0);
    tl.fromTo("#end-q", {{ opacity: 0, y: 30 }}, {{ opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }}, 0.2);
    tl.fromTo("#end-btn", {{ opacity: 0, scale: 0.7 }}, {{ opacity: 1, scale: 1, duration: 0.5, ease: "back.out(2)" }}, 0.8);
    tl.fromTo("#end-btn-wrap", {{ scale: 1 }}, {{ scale: 1.07, duration: 0.3, ease: "power1.inOut", yoyo: true, repeat: 3 }}, 2.0);
    tl.fromTo("#end-next", {{ opacity: 0 }}, {{ opacity: 1, duration: 0.6, ease: "power1.out" }}, 1.6);
    tl.fromTo("#end-credit", {{ opacity: 0 }}, {{ opacity: 1, duration: 0.6, ease: "power1.out" }}, 1.0);"""
    return cid, L, scene_file(cid, body, js, css)


def captions_comp():
    cid = "captions"
    css = """
    #cap-band { position: absolute; left: 0; right: 0; bottom: 0; height: 300px; background: linear-gradient(0deg, rgba(10,6,24,.82), rgba(10,6,24,0)); }
    .cap { position: absolute; left: 230px; right: 230px; bottom: 132px; text-align: center; direction: rtl; z-index: 5;
      font: 700 50px/1.45 "Cairo", sans-serif; color: #fff; text-shadow: 0 3px 12px rgba(0,0,0,.85); }
    .cap span { color: #fff; }
"""
    body = [f'    <div id="cap-band" class="clip" data-start="{SECS[0]["start"]}" data-duration="{r(END_START - SECS[0]["start"])}" data-track-index="0"></div>']
    js = []
    g = 0
    srt = []
    for s in SECS:
        toks = s["text"].split()
        ws = [dict(w, w=re.sub(r"[،,.:!«»\"]", "", tok)) for w, tok in zip(s["words"], toks)]
        phrases, cur = [], []
        for k, (w, tok) in enumerate(zip(ws, toks)):
            cur.append(w)
            if k + 1 == len(ws) or tok[-1] in "،,.؟?:!":
                phrases.append(cur)
                cur = []
        groups = []
        for ph in phrases:
            n = len(ph)
            parts = -(-n // 7)
            size = -(-n // parts)
            i = 0
            while i < n:
                j = min(n, i + size)
                if j < n and ph[j]["w"].startswith("سيتي"):
                    j += 1
                if n - j == 1:
                    j = n
                groups.append(ph[i:j])
                i = j
        for gi, grp in enumerate(groups):
            g += 1
            st = r(s["start"] + grp[0]["t"] - 0.05)
            if gi + 1 < len(groups):
                en = r(s["start"] + groups[gi + 1][0]["t"] - 0.05)
            else:
                en = r(s["start"] + grp[-1]["t"] + grp[-1]["d"] + 0.5)
            gid = f"cap{g}"
            spans = " ".join(f'<span id="{gid}-w{j+1}">{esc(w["w"])}</span>' for j, w in enumerate(grp))
            body.append(f'    <div id="{gid}" class="clip cap" data-start="{st}" data-duration="{r(en-st)}" data-track-index="1">{spans}</div>')
            for j, w in enumerate(grp):
                js.append(f'    tl.fromTo("#{gid}-w{j+1}", {{ color: "#ffffff" }}, {{ color: "{GOLD}", duration: 0.1, ease: "none" }}, {r(s["start"] + w["t"])});')
            srt.append((st, en, " ".join(w["w"] for w in grp)))
    return cid, scene_file(cid, "\n".join(body), "\n".join(js), css).replace(f"background: {INK}; }}", "}", 1), srt


def hud_comp():
    cid = "hud"
    css = f"""
    .hud {{ position: absolute; right: 110px; top: 70px; direction: rtl; text-align: right; z-index: 5; }}
    #hud-badge {{ font: 700 28px/1.3 "Cairo", sans-serif; color: #fff; background: rgba(10,6,24,.7); padding: 4px 18px; border-right: 6px solid {PINK}; display: inline-block; }}
    .chap {{ position: absolute; right: 110px; top: 128px; font: 900 34px/1.4 "Cairo", sans-serif; color: {GOLD}; direction: rtl; background: rgba(10,6,24,.78); padding: 0 16px; z-index: 5; }}
    .dots {{ position: absolute; right: 110px; top: 196px; display: flex; gap: 10px; direction: rtl; z-index: 5; }}
    .dot {{ width: 34px; height: 8px; background: rgba(255,255,255,.28); }}
    .dot i {{ display: block; width: 100%; height: 100%; background: {PINK}; transform-origin: 100% 50%; }}
"""
    hud_end = B[len(SECS) - 1]
    body = [f'    <div id="hud-top" class="clip hud" data-start="{TITLE_END}" data-duration="{r(hud_end-TITLE_END)}" data-track-index="0"><span id="hud-badge">GTA 6 بالسعودي · الحلقة 3</span></div>',
            f'    <div id="hud-dots" class="clip dots" data-start="{TITLE_END}" data-duration="{r(hud_end-TITLE_END)}" data-track-index="2">' +
            "".join(f'<div class="dot"><i id="hud-d{k+1}"></i></div>' for k in range(len(NAMED))) + "</div>"]
    js = ['    tl.fromTo("#hud-badge", { opacity: 0, x: 30 }, { opacity: 1, x: 0, duration: 0.5, ease: "power3.out" }, ' + str(TITLE_END + 0.2) + ');']
    for k, s in enumerate(NAMED):
        js.append(f'    tl.fromTo("#hud-d{k+1}", {{ scaleX: 0 }}, {{ scaleX: 1, duration: 0.5, ease: "power2.out" }}, {r(s["start"])});')
    for i, s in enumerate(SECS[:-1]):
        st = r(B[i] + 0.4)
        en = r(B[i + 1])
        cid_ = f"hud-ch-{s['id']}"
        body.append(f'    <div id="{cid_}" class="clip chap" data-start="{st}" data-duration="{r(en-st)}" data-track-index="1">{esc(s["title"])}</div>')
        js.append(f'    tl.fromTo("#{cid_}", {{ opacity: 0, x: 24 }}, {{ opacity: 1, x: 0, duration: 0.45, ease: "power3.out" }}, {st});')
    return cid, scene_file(cid, "\n".join(body), "\n".join(js), css).replace(f"background: {INK}; }}", "}", 1)


def wipes_comp():
    cid = "wipes"
    css = """
    .wipe { position: absolute; inset: 0; z-index: 5; }
    .bar { position: absolute; top: -200px; left: -340px; width: 2600px; height: 1480px; }
"""
    body, js = [], []
    for k, b in enumerate(B):
        st = r(b - 0.45)
        wid = f"wp{k+1}"
        body.append(f'    <div id="{wid}" class="clip wipe" data-start="{st}" data-duration="0.9" data-track-index="0">'
                    f'<div id="{wid}-a" class="bar" style="background:{PINK}"></div>'
                    f'<div id="{wid}-b" class="bar" style="background:{CYAN}"></div>'
                    f'<div id="{wid}-c" class="bar" style="background:{INK}"></div></div>')
        for j, bar in enumerate("abc"):
            js.append(f'    tl.fromTo("#{wid}-{bar}", {{ x: 2700, skewX: -18 }}, {{ x: -2700, skewX: -18, duration: 0.9, ease: "power3.inOut" }}, {r(st + (j-1)*0.05)});')
    return cid, scene_file(cid, "\n".join(body), "\n".join(js), css).replace(f"background: {INK}; }}", "}", 1)


def write(path, text):
    with open(os.path.join(ROOT, path), "w", encoding="utf-8") as f:
        f.write(text)


def fmt_srt(t):
    h, m = int(t // 3600), int(t % 3600 // 60)
    s = t - h * 3600 - m * 60
    return f"{h:02d}:{m:02d}:{int(s):02d},{int(round((s - int(s)) * 1000)):03d}"


def main():
    hosts = []
    cid, L, txt = title_scene()
    write(f"compositions/{cid}.html", txt)
    hosts.append((cid, 0, L, 0))
    for i, s in enumerate(SECS):
        cid, L, txt = section_scene(i, s)
        write(f"compositions/{cid}.html", txt)
        hosts.append((cid, B[i], L, 0))
    cid, L, txt = endcard_scene()
    write(f"compositions/{cid}.html", txt)
    hosts.append((cid, END_START, L, 0))
    cid, txt, srt = captions_comp()
    write(f"compositions/{cid}.html", txt)
    cid, txt2 = hud_comp()
    write(f"compositions/{cid}.html", txt2)
    cid, txt3 = wipes_comp()
    write(f"compositions/{cid}.html", txt3)

    host_html = []
    for cid, st, L, lane in hosts:
        host_html.append(f'      <div id="{cid}" data-composition-id="{cid}" data-composition-src="compositions/{cid}.html" '
                         f'data-start="{r(st)}" data-duration="{r(L)}" data-track-index="0" data-track-kind="graphics" '
                         f'data-width="{W}" data-height="{H}" style="z-index:1"></div>')
    overlays = [("hud", 1, 20), ("captions", 2, 30), ("wipes", 3, 40)]
    for cid, lane, z in overlays:
        kind = "captions" if cid == "captions" else "graphics"
        host_html.append(f'      <div id="{cid}" data-composition-id="{cid}" data-composition-src="compositions/{cid}.html" '
                         f'data-start="0" data-duration="{TOTAL}" data-track-index="{lane}" data-track-kind="{kind}" '
                         f'data-width="{W}" data-height="{H}" style="z-index:{z}"></div>')
    index = f"""<!doctype html>
<html lang="ar">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width={W}, height={H}" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
    <style>
      * {{ margin: 0; padding: 0; box-sizing: border-box; }}
      html, body {{ width: {W}px; height: {H}px; overflow: hidden; background: {INK}; }}
      #root {{ position: relative; width: 100%; height: 100%; }}
      #root > div {{ position: absolute; inset: 0; }}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="{TOTAL}" data-width="{W}" data-height="{H}">
{chr(10).join(host_html)}
      <audio id="mix" src="assets/audio/mix.m4a" data-start="0" data-duration="{TOTAL}" data-track-index="4"></audio>
    </div>
    <script>
      window.__timelines = window.__timelines || {{}};
      window.__timelines["main"] = gsap.timeline({{ paused: true }});
    </script>
  </body>
</html>
"""
    write("index.html", index)
    with open(os.path.join(ROOT, "data/GTA6_EP3_People_of_Leonida.srt"), "w", encoding="utf-8") as f:
        for k, (a, b, t) in enumerate(srt, 1):
            f.write(f"{k}\n{fmt_srt(a)} --> {fmt_srt(b)}\n{t}\n\n")
    print("scenes", len(hosts), "captions", len(srt), "total", TOTAL)


if __name__ == "__main__":
    main()
