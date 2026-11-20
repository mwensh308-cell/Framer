"""Use a recorded voice-over (e.g. from ElevenLabs) instead of TTS.

Transcribes the recording with faster-whisper (word timestamps), aligns those words to the script,
then inserts silence for the intro/chapter cards and writes the same timeline.json as tts.py.

usage: python align_voice.py episode.txt outdir voice1.mp3 [voice2.mp3 ...]
Several files are joined in order (e.g. a second take that finishes the ending).
"""
import difflib, json, os, re, subprocess, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import episode
from tts import split_words, GAP_SCENE, CHAPTER_CARD, INTRO_CARD

SR = 44100
AR_DIAC = re.compile(r"[ً-ْٰـ]")


def norm(w):
    w = AR_DIAC.sub("", w)
    w = re.sub(r"[^\w]", "", w)
    w = re.sub("[أإآ]", "ا", w).replace("ة", "ه").replace("ى", "ي").replace("ؤ", "و").replace("ئ", "ي")
    return w


def load_pcm(path, sr):
    raw = subprocess.check_output(["ffmpeg", "-v", "error", "-i", path, "-ar", str(sr), "-ac", "1", "-f", "f32le", "-"])
    return np.frombuffer(raw, np.float32).copy()


def transcribe(audio16):
    from faster_whisper import WhisperModel
    m = WhisperModel("small", device="cpu", compute_type="int8", cpu_threads=os.cpu_count())
    segs, _ = m.transcribe(audio16, language="ar", word_timestamps=True, beam_size=5)
    return [(w.start, w.end, w.word.strip()) for s in segs for w in s.words]


def main(src, out, *voices):
    os.makedirs(out, exist_ok=True)
    chapters = episode.parse(src)

    # 1. join recordings, transcribe (cached)
    audio = np.concatenate([load_pcm(v, SR) for v in voices])
    cache = f"{out}/words.json"
    key = [os.path.basename(v) for v in voices]
    if os.path.exists(cache) and json.load(open(cache))["key"] == key:
        heard = json.load(open(cache))["words"]
    else:
        a16 = np.concatenate([load_pcm(v, 16000) for v in voices])
        heard = transcribe(a16)
        json.dump({"key": key, "words": heard}, open(cache, "w"), ensure_ascii=False)
    rec_len = len(audio) / SR

    # 2. align script tokens to heard words
    toks = []  # (chapter, scene, line, token)
    for ci, ch in enumerate(chapters):
        for si, sc in enumerate(ch["scenes"]):
            for li, ln in enumerate(sc["lines"]):
                toks += [(ci, si, li, t) for t in ln["text"].split()]
    A = [norm(t[3]) for t in toks]
    B = [norm(w[2]) for w in heard]
    sm = difflib.SequenceMatcher(None, A, B, autojunk=False)
    t_start, t_end = [None] * len(A), [None] * len(A)
    for op, a0, a1, b0, b1 in sm.get_opcodes():
        if op == "equal":
            for k in range(a1 - a0):
                t_start[a0 + k], t_end[a0 + k] = heard[b0 + k][0], heard[b0 + k][1]
        elif op == "replace" and b1 > b0:  # spread mis-heard words over the heard span
            s0, s1 = heard[b0][0], heard[b1 - 1][1]
            n = a1 - a0
            for k in range(n):
                t_start[a0 + k] = s0 + (s1 - s0) * k / n
                t_end[a0 + k] = s0 + (s1 - s0) * (k + 1) / n
    # interpolate gaps; tokens after the last heard word are "not recorded"
    last = max(i for i, v in enumerate(t_start) if v is not None)
    for i in range(len(A)):
        if t_start[i] is None and i < last:
            j = next(k for k in range(i, len(A)) if t_start[k] is not None)
            p = t_end[i - 1] if i else 0.0
            t_start[i] = p + (t_start[j] - p) * 0.5
            t_end[i] = t_start[i]
    matched = sum(1 for op in sm.get_opcodes() if op[0] == "equal" for _ in range(op[2] - op[1]))
    print(f"aligned {matched}/{len(A)} words exactly; recording {rec_len:.1f}s")

    # 3. line times in recording time
    lines = {}
    for i, (ci, si, li, _) in enumerate(toks):
        if t_start[i] is None:
            continue
        lines.setdefault((ci, si, li), []).append((t_start[i], t_end[i], toks[i][3]))
    missing = [k for k in {(t[0], t[1], t[2]) for t in toks} if k not in lines]
    if missing:
        print(f"WARNING: {len(missing)} script lines are not in the recording (from the end)")

    # 4. build output audio with card silences, mapping recording time -> output time
    pieces, shift, cut = [], 0.0, 0.0
    timeline = {"chapters": []}

    def emit_until(t):  # copy recording [cut, t)
        nonlocal cut
        if t > cut:
            pieces.append(audio[int(cut * SR):int(t * SR)])
            cut = t

    prev_end = 0.0
    for ci, ch in enumerate(chapters):
        first = lines.get((ci, 0, 0))
        if not first:
            break
        cstart = first[0][0]
        split = max(prev_end, cstart - 0.25) if ci else 0.0
        emit_until(split)
        length = INTRO_CARD if ci == 0 else CHAPTER_CARD
        card = {"start": split + shift, "end": split + shift + length}
        pieces.append(np.zeros(int(length * SR), np.float32))
        shift += length
        chap = {"title": ch["title"], "card": card, "scenes": []}
        for si, sc in enumerate(ch["scenes"]):
            sl = [(li, lines[(ci, si, li)]) for li in range(len(sc["lines"])) if (ci, si, li) in lines]
            if not sl:
                continue
            scene = {"id": sc["id"], "prompt": sc["prompt"], "lines": [],
                     "start": max(card["end"] if si == 0 else 0, sl[0][1][0][0] - 0.3 + shift)}
            for li, ws in sl:
                ln = sc["lines"][li]
                w = [(a + shift, b + shift, t) for a, b, t in ws]
                scene["lines"].append({"text": ln["text"], "quote": ln.get("quote"), "start": w[0][0],
                                       "end": w[-1][1], "subs": split_words(w)})
                prev_end = ws[-1][1]
            chap["scenes"].append(scene)
        timeline["chapters"].append(chap)
    emit_until(rec_len)
    pieces.append(np.zeros(int(2.0 * SR), np.float32))
    full = np.concatenate(pieces)
    timeline["duration"] = len(full) / SR

    import wave
    with wave.open(f"{out}/narration.wav", "wb") as wv:
        wv.setnchannels(1); wv.setsampwidth(2); wv.setframerate(SR)
        wv.writeframes((np.clip(full, -1, 1) * 32767).astype(np.int16).tobytes())
    json.dump(timeline, open(f"{out}/timeline.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"narration {timeline['duration']/60:.2f} min, {sum(len(c['scenes']) for c in timeline['chapters'])} scenes")


if __name__ == "__main__":
    main(*sys.argv[1:])
