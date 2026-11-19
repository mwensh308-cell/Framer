"""Force-align known script text to a narration file using faster-whisper word timestamps.

Usage: python3 align.py <script.json> <audio_dir> <out_dir> [ids...]
Audio files: <audio_dir>/<id>.mp3 (or .wav/.m4a). Writes <out_dir>/<id>.words.json as [{w, t, d}],
one entry per script token, so captions show the script's exact wording with the voice's timing.
"""
import difflib
import json
import os
import re
import subprocess
import sys

import numpy as np
from faster_whisper import WhisperModel

SCRIPT, ADIR, ODIR = sys.argv[1:4]
ONLY = sys.argv[4:]
os.makedirs(ODIR, exist_ok=True)
model = WhisperModel(os.environ.get("ALIGN_MODEL", "small"), device="cpu", compute_type="int8")


def load(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-f", "s16le", "-ac", "1", "-ar", "16000", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float32) / 32768


def norm(s):
    s = re.sub(r"[ً-ْـ]", "", s)
    s = re.sub(r"[إأآا]", "ا", s).replace("ى", "ي").replace("ة", "ه").replace("ؤ", "و").replace("ئ", "ي")
    s = re.sub(r"[^؀-ۿA-Za-z0-9]", "", s)
    return s


def find_audio(sid):
    for ext in (".mp3", ".wav", ".m4a", ".ogg", ".aac"):
        p = os.path.join(ADIR, sid + ext)
        if os.path.exists(p):
            return p
    return None


for s in json.load(open(SCRIPT)):
    if ONLY and s["id"] not in ONLY:
        continue
    path = find_audio(s["id"])
    if not path:
        print(s["id"], "missing audio")
        continue
    audio = load(path)
    segs, _ = model.transcribe(audio, language="ar", word_timestamps=True, beam_size=5,
                               vad_filter=False, condition_on_previous_text=False)
    hw = [w for seg in segs for w in seg.words]
    toks = s["text"].split()
    a = [norm(t) for t in toks]
    b = [norm(w.word) for w in hw]
    times = [None] * len(toks)
    sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == "equal":
            for k in range(i2 - i1):
                times[i1 + k] = (hw[j1 + k].start, hw[j1 + k].end)
        elif tag == "replace" and j2 > j1:
            # spread the recognised span across the script tokens it replaces
            t0, t1 = hw[j1].start, hw[j2 - 1].end
            n = i2 - i1
            for k in range(n):
                times[i1 + k] = (t0 + (t1 - t0) * k / n, t0 + (t1 - t0) * (k + 1) / n)
    # interpolate any gaps (deleted tokens)
    dur = len(audio) / 16000
    known = [i for i, t in enumerate(times) if t]
    for i in range(len(toks)):
        if times[i]:
            continue
        prev = max([k for k in known if k < i], default=None)
        nxt = min([k for k in known if k > i], default=None)
        t0 = times[prev][1] if prev is not None else 0.0
        t1 = times[nxt][0] if nxt is not None else dur
        span = [k for k in range(i, nxt if nxt is not None else len(toks)) if not times[k]]
        n = len(span)
        for j, k in enumerate(span):
            times[k] = (t0 + (t1 - t0) * j / n, t0 + (t1 - t0) * (j + 1) / n)
        known = [i for i, t in enumerate(times) if t]
    words = [{"w": re.sub(r"[،,.:!؟?]", "", tok), "t": round(t[0], 3), "d": round(max(0.05, t[1] - t[0]), 3)}
             for tok, t in zip(toks, times)]
    json.dump(words, open(os.path.join(ODIR, s["id"] + ".words.json"), "w"), ensure_ascii=False)
    matched = sum(1 for tag, i1, i2, *_ in sm.get_opcodes() if tag == "equal" for _ in range(i2 - i1))
    print(s["id"], f"{matched}/{len(toks)} tokens matched exactly", flush=True)
