"""Narrate an episode line by line with edge-tts (Egyptian voice) and build a timeline.

usage: python tts.py episode.txt outdir [voice]
writes outdir/narration.wav and outdir/timeline.json
"""
import asyncio, json, os, re, subprocess, sys
import edge_tts
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import episode

VOICE = "ar-EG-ShakirNeural"
RATE = "-4%"
GAP_LINE, GAP_SCENE, CHAPTER_CARD, INTRO_CARD = 0.35, 0.6, 3.2, 4.5
SR = 44100


def dur(p):
    return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                          "-of", "csv=p=0", p]))


async def speak(text, mp3, voice):
    """Synthesize one line; returns sentence-level cues [(start, end, text)] from edge-tts."""
    comm = edge_tts.Communicate(text, voice, rate=RATE, proxy=os.environ.get("HTTPS_PROXY"), boundary="WordBoundary")
    cues = []
    with open(mp3, "wb") as f:
        async for chunk in comm.stream():
            if chunk["type"] == "audio":
                f.write(chunk["data"])
            elif chunk["type"] in ("SentenceBoundary", "WordBoundary"):
                s = chunk["offset"] / 1e7
                cues.append((s, s + chunk["duration"] / 1e7, chunk["text"], chunk["type"]))
    return cues


def split_words(words, max_words=9):
    """Group word timings into subtitle chunks, breaking at punctuation or max length."""
    chunks, cur = [], []
    for w in words:
        cur.append(w)
        if len(cur) >= max_words or re.search(r"[.،,؟?!:…]$", w[2]):
            chunks.append(cur); cur = []
    if cur:
        chunks.append(cur)
    return [(c[0][0], c[-1][1], " ".join(x[2] for x in c)) for c in chunks]


def main(src, out, voice=VOICE):
    os.makedirs(f"{out}/lines", exist_ok=True)
    chapters = episode.parse(src)
    t, parts, timeline = 0.0, [], {"chapters": []}

    def silence(sec):
        p = f"{out}/lines/sil_{int(sec*1000)}.wav"
        if not os.path.exists(p):
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", f"anullsrc=r={SR}:cl=mono",
                            "-t", str(sec), p], check=True)
        parts.append(p)
        return sec

    for ci, ch in enumerate(chapters):
        length = INTRO_CARD if ci == 0 else CHAPTER_CARD
        card = {"start": t, "end": t + length}
        t += silence(length)
        chap = {"title": ch["title"], "card": card, "scenes": []}
        for sc in ch["scenes"]:
            scene = {"id": sc["id"], "prompt": sc["prompt"], "start": t, "lines": []}
            for li, ln in enumerate(sc["lines"]):
                mp3 = f"{out}/lines/{sc['id']}_{li:02d}.mp3"
                cache = mp3[:-4] + ".json"
                if os.path.exists(cache) and json.load(open(cache))["text"] == ln["text"]:
                    cues = json.load(open(cache))["cues"]
                else:
                    cues = asyncio.run(speak(ln["text"], mp3, voice))
                    json.dump({"text": ln["text"], "cues": cues}, open(cache, "w"), ensure_ascii=False)
                wav = mp3[:-4] + ".wav"
                subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", mp3, "-ar", str(SR), "-ac", "1", wav], check=True)
                d = dur(wav)
                words = [(a + t, b + t, w) for a, b, w, kind in cues if kind == "WordBoundary"]
                toks = ln["text"].split()
                if len(toks) == len(words):  # restore punctuation from the source text
                    words = [(a, b, tok) for (a, b, _), tok in zip(words, toks)]
                subs = split_words(words) if words else [(t, t + d, ln["text"])]
                # attach trailing punctuation from the source text to subtitle chunks
                scene["lines"].append({"text": ln["text"], "quote": ln.get("quote"), "start": t, "end": t + d,
                                       "subs": subs})
                parts.append(wav)
                t += d
                t += silence(GAP_LINE)
            t += silence(GAP_SCENE)
            scene["end"] = t
            chap["scenes"].append(scene)
        timeline["chapters"].append(chap)
    t += silence(2.0)
    timeline["duration"] = t

    lst = f"{out}/lines/concat.txt"
    open(lst, "w").write("".join(f"file '{os.path.abspath(p)}'\n" for p in parts))
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst,
                    "-c:a", "pcm_s16le", f"{out}/narration.wav"], check=True)
    json.dump(timeline, open(f"{out}/timeline.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"narration {t/60:.1f} min")


if __name__ == "__main__":
    main(*sys.argv[1:])
