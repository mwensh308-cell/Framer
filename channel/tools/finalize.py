"""Final pass: animated text (ASS), sound design, color grade, mux.

usage: python finalize.py episode_dir out.mp4
needs  episode_dir/build/picture.mp4 (render.py) and episode_dir/audio/{narration.wav,timeline.json}
"""
import json, math, os, subprocess, sys, wave
import numpy as np

W, H, SR = 1920, 1080, 44100
HERE = os.path.dirname(os.path.abspath(__file__))
FONTS = os.path.join(HERE, "..", "fonts")
ORD = ["", "الأول", "التاني", "التالت", "الرابع", "الخامس", "السادس", "السابع", "التامن", "التاسع", "العاشر"]


def at(t):
    h, t = divmod(max(0, t), 3600); m, s = divmod(t, 60)
    return f"{int(h)}:{int(m):02d}:{s:05.2f}"


# ---------------------------------------------------------------- text animation
def text_width(text, size, font="Cairo_900Black.ttf"):
    from PIL import ImageFont
    from fontTools.ttLib import TTFont
    path = os.path.join(FONTS, font)
    o = TTFont(path)["OS/2"]
    em = size * TTFont(path)["head"].unitsPerEm / (o.usWinAscent + o.usWinDescent)  # libass size = line height
    f = ImageFont.truetype(path, max(1, round(em)), layout_engine=ImageFont.Layout.RAQM)
    return f.getlength(text, direction="rtl")


def build_ass(tl, path):
    head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Sub,Cairo,90,&H00FFFFFF,&H00FFFFFF,&H00000000,&H99000000,1,0,0,0,100,100,0,0,1,3.2,2,2,200,200,64,1
Style: Quote,Cairo Black,100,&H00FFFFFF,&H00787878,&H00000000,&H00000000,1,0,0,0,100,100,0,0,1,0,4,5,260,260,0,1
Style: Who,Cairo,58,&H003C4CE7,&H003C4CE7,&H00000000,&H00000000,1,0,0,0,100,100,0,0,1,0,2,5,100,100,0,1
Style: Kicker,Cairo,72,&H003C4CE7,&H003C4CE7,&H00000000,&H00000000,1,0,0,0,100,100,0,0,1,0,3,5,100,100,0,1
Style: Big,Cairo Black,170,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,1,0,0,0,100,100,0,0,1,0,7,5,100,100,0,1
Style: Bar,Cairo,10,&H003C4CE7,&H003C4CE7,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,7,0,0,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    ev = []
    cx, cy = W // 2, H // 2

    def bar(t0, t1, y, width):
        # red underline that draws itself from the center
        ev.append(f"Dialogue: 3,{at(t0)},{at(t1)},Bar,,0,0,0,,{{\\an5\\pos({cx},{y})\\fscx0"
                  f"\\t(0,450,\\fscx100)\\fad(0,300)\\p1}}m 0 0 l {width} 0 l {width} 6 l 0 6{{\\p0}}")

    for ci, ch in enumerate(tl["chapters"]):
        a, b = ch["title"]
        c0, c1 = ch["card"]["start"], ch["card"]["end"]
        if ci == 0:  # intro: two huge words, white + red, blur-in
            ev.append(f"Dialogue: 2,{at(c0+0.3)},{at(c1+0.2)},Big,,0,0,0,,{{\\pos({cx},{cy-105})\\blur22\\fscx118\\fscy118"
                      f"\\t(0,600,\\blur0\\fscx100\\fscy100)\\fad(0,400)}}{a}")
            ev.append(f"Dialogue: 2,{at(c0+0.8)},{at(c1+0.2)},Big,,0,0,0,,{{\\pos({cx},{cy+105})\\fs200\\c&H3C4CE7&\\blur22"
                      f"\\fscx118\\fscy118\\t(0,600,\\blur0\\fscx100\\fscy100)\\fad(0,400)}}{b}")
        else:        # chapter card: kicker with tracking animation, big title, drawn underline
            ev.append(f"Dialogue: 2,{at(c0+0.25)},{at(c1)},Kicker,,0,0,0,,{{\\move({cx},{cy-100},{cx},{cy-130},0,600)"
                      f"\\blur12\\t(0,500,\\blur0)\\fad(250,300)}}{a}")
            ev.append(f"Dialogue: 2,{at(c0+0.45)},{at(c1)},Big,,0,0,0,,{{\\pos({cx},{cy+10})\\blur18\\fscx112\\fscy112"
                      f"\\t(0,550,\\blur0\\fscx100\\fscy100)\\t(550,3000,\\fscx104\\fscy104)\\fad(0,300)}}{b}")
            bar(c0 + 0.8, c1, cy + 130, 520)

        for sc in ch["scenes"]:
            for ln in sc["lines"]:
                if ln.get("quote"):
                    # quote card: grey text, a white fill sweeps right->left across each line as it is spoken.
                    # (override tags inside an Arabic line break libass bidi, so each line is one plain run
                    #  and the "reading" effect is an animated clip on a white copy)
                    words = []
                    for s0, s1, txt in ln["subs"]:
                        toks = txt.split()
                        span = (s1 - s0) / max(1, len(toks))
                        words += [(s0 + k * span, s0 + (k + 1) * span, tk) for k, tk in enumerate(toks)]
                    rows = [words[k:k + 5] for k in range(0, len(words), 5)]
                    if len(rows) > 1 and len(rows[-1]) <= 2:  # avoid a lonely last word
                        last = rows.pop(); rows[-1] += last
                    q0, q1 = ln["start"] - 0.35, ln["end"] + 1.3
                    top = cy - 40 - (len(rows) - 1) * 66
                    for r, row in enumerate(rows):
                        y = top + r * 132
                        text = " ".join(w[2] for w in row)
                        half = text_width(text, 100) / 2 + 12
                        x1, x2 = int(cx - half), int(cx + half)
                        f0, f1 = int((row[0][0] - q0) * 1000), int((row[-1][1] - q0) * 1000)
                        common = f"\\an5\\pos({cx},{y})\\fad(350,450)\\blur10\\t(0,350,\\blur0)"
                        ev.append(f"Dialogue: 2,{at(q0)},{at(q1)},Quote,,0,0,0,,{{{common}\\c&H8A8A8A&}}{text}")
                        ev.append(f"Dialogue: 3,{at(q0)},{at(q1)},Quote,,0,0,0,,{{{common}\\clip({x2},{y-80},{x2},{y+80})"
                                  f"\\t({f0},{f1},\\clip({x1},{y-80},{x2},{y+80}))}}{text}")
                    yb = top + (len(rows) - 1) * 132 + 105
                    bar(q0 + 0.5, q1, yb, 240)
                    ev.append(f"Dialogue: 2,{at(q0+0.8)},{at(q1)},Who,,0,0,0,,{{\\an5\\pos({cx},{yb+55})"
                              f"\\fad(400,450)}}{ln['quote']}")
                    continue
                for s0, s1, txt in ln["subs"]:
                    txt = txt.rstrip(".،")
                    ev.append(f"Dialogue: 0,{at(s0)},{at(s1+0.15)},Sub,,0,0,0,,{{\\fad(90,60)\\fscx94\\fscy94"
                              f"\\t(0,140,\\fscx100\\fscy100)}}{txt}")
    open(path, "w", encoding="utf-8").write(head + "\n".join(ev) + "\n")


# ---------------------------------------------------------------- sound design
def whoosh(dur=1.1, rng=np.random.default_rng(1)):
    n = int(dur * SR)
    noise = rng.standard_normal(n).astype(np.float32)
    x = np.linspace(0, 1, n)
    cutoff = 300 + 5200 * np.sin(np.pi * x) ** 2
    alpha = 1 - np.exp(-2 * np.pi * cutoff / SR)
    y, acc = np.empty(n, np.float32), 0.0
    for i in range(n):  # sweeping one-pole lowpass
        acc += alpha[i] * (noise[i] - acc); y[i] = acc
    env = np.sin(np.pi * x) ** 1.5
    y = y * env / (np.abs(y).max() + 1e-6)
    pan = x
    return np.stack([y * (1 - pan * 0.7), y * (0.3 + pan * 0.7)], 1) * 0.8


def boom(dur=2.2):
    n = int(dur * SR); t = np.arange(n) / SR
    f = 32 + 48 * np.exp(-t * 3)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.2)
    click = np.random.default_rng(2).standard_normal(n) * np.exp(-t * 60) * 0.3
    y = (s + click).astype(np.float32)
    y /= np.abs(y).max()
    return np.stack([y, y], 1) * 0.9


def place(track, clip, t, gain):
    i = int(t * SR)
    if i < 0:
        clip, i = clip[-i:], 0
    j = min(len(track), i + len(clip))
    track[i:j] += clip[: j - i] * gain


def build_sfx(tl, path):
    n = int((tl["duration"] + 3) * SR)
    tr = np.zeros((n, 2), np.float32)
    wh, bm, soft = whoosh(), boom(), whoosh(0.8)
    scenes = [sc for ch in tl["chapters"] for sc in ch["scenes"]]
    for ch in tl["chapters"]:
        c0 = ch["card"]["start"]
        place(tr, wh, c0 - 0.55, 0.55)
        place(tr, bm, c0 + 0.02, 0.8)
        for sc in ch["scenes"]:
            for ln in sc["lines"]:
                if ln.get("quote"):
                    place(tr, bm, ln["start"] - 0.35, 0.35)
    for sc in scenes[1:]:
        place(tr, soft, sc["start"] - 0.4, 0.12)
    write_wav(path, tr)


def write_wav(path, data):
    d = np.clip(data, -1, 1)
    with wave.open(path, "wb") as w:
        w.setnchannels(d.shape[1]); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((d * 32767).astype(np.int16).tobytes())


def build_music(seconds, path):
    """Dark ambient bed in A minor, chords drift every ~20 s. Generated, royalty free."""
    t = np.arange(int(seconds * SR)) / SR
    chords = [(55, 82.41, 110, 130.81), (43.65, 65.41, 87.31, 130.81),  # Am, F
              (49, 73.42, 98, 146.83), (41.2, 61.74, 82.41, 123.47)]    # G, E
    seg = 20.0
    out = np.zeros_like(t)
    for k, ch in enumerate(chords * int(seconds // (seg * 4) + 2)):
        s0 = k * seg - 4
        if s0 > seconds:
            break
        env = np.clip(np.minimum((t - s0) / 4, (s0 + seg + 4 - t) / 4), 0, 1)
        if not env.any():
            continue
        for j, f in enumerate(ch):
            lfo = 0.6 + 0.4 * np.sin(2 * np.pi * (0.05 + 0.02 * j) * t + j)
            out += env * lfo * (0.22 / (j + 1) ** 0.6) * (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2 * f * t))
    out /= np.abs(out).max() + 1e-6
    st = np.stack([out, np.roll(out, int(0.013 * SR))], 1) * 0.5
    write_wav(path, st)


# ---------------------------------------------------------------- final mux
def main(ep, out):
    tl = json.load(open(f"{ep}/audio/timeline.json", encoding="utf-8"))
    b = f"{ep}/build"
    total = tl["duration"]
    build_ass(tl, f"{b}/text.ass")
    build_sfx(tl, f"{b}/sfx.wav")
    build_music(total + 3, f"{b}/music_raw.wav")
    vf = (f"eq=contrast=1.07:saturation=0.9:gamma=0.97,colorbalance=rm=0.05:gm=0.01:bm=-0.05,"
          f"vignette=PI/4.2,noise=alls=5:allf=t,"
          f"ass={b}/text.ass:fontsdir={FONTS}:shaping=complex,"
          f"fade=t=in:d=0.8,fade=t=out:st={total-1.8:.2f}:d=1.8")
    af = ("[2:a]aecho=0.8:0.75:180|420:0.3|0.2,lowpass=f=1400,volume=0.55,afade=t=in:d=4,"
          f"afade=t=out:st={total-5:.2f}:d=5[mus];"
          "[1:a]asplit=2[nar][key];"
          "[mus][key]sidechaincompress=threshold=0.015:ratio=5:attack=30:release=600[duck];"
          "[nar][duck][3:a]amix=inputs=3:duration=first:normalize=0:weights=1 0.6 0.9,"
          "loudnorm=I=-14:TP=-1.5:LRA=9[a]")
    subprocess.run(["ffmpeg", "-v", "error", "-stats", "-y", "-i", f"{b}/picture.mp4", "-i", f"{ep}/audio/narration.wav",
                    "-i", f"{b}/music_raw.wav", "-i", f"{b}/sfx.wav",
                    "-filter_complex", f"[0:v]{vf}[v];{af}", "-map", "[v]", "-map", "[a]", "-t", f"{total:.3f}",
                    "-c:v", "libx264", "-preset", "medium", "-crf", "21", "-tune", "grain", "-pix_fmt", "yuv420p",
                    "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", out], check=True)
    print("final:", out)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
