"""Splice extra recorded parts into an existing voice-over, using the cut points found by a previous alignment.

usage: python splice_voice.py old_timeline.json original.mp3 out.wav \
         "before:<chapter title>=partA.mp3" "replace_from:<chapter title>=partB.mp3"

  before:T        insert the part right before chapter T starts
  replace_from:T  drop everything from chapter T to the end and put the part there
Chapter titles are the second half of the '## ... | title' line in the OLD timeline.
"""
import json, subprocess, sys
import numpy as np

SR = 44100
INTRO, CARD = 4.5, 3.2  # silences align_voice inserted (must match tts.py)


def pcm(p):
    raw = subprocess.check_output(["ffmpeg", "-v", "error", "-i", p, "-ar", str(SR), "-ac", "1", "-f", "f32le", "-"])
    return np.frombuffer(raw, np.float32).copy()


def main(tl_path, original, out, *ops):
    tl = json.load(open(tl_path, encoding="utf-8"))
    cut = {}  # chapter title -> time in the ORIGINAL recording
    for ci, ch in enumerate(tl["chapters"]):
        if ci:
            cut[ch["title"][1]] = ch["card"]["start"] - INTRO - CARD * (ci - 1)
    rec = pcm(original)
    plan = []
    for op in ops:
        kind, rest = op.split(":", 1)
        title, part = rest.split("=", 1)
        plan.append((cut[title], kind, part))
    plan.sort()
    pieces, pos = [], 0.0
    gap = np.zeros(int(0.5 * SR), np.float32)
    for t, kind, part in plan:
        pieces.append(rec[int(pos * SR):int(t * SR)])
        pieces += [gap, pcm(part), gap]
        pos = len(rec) / SR if kind == "replace_from" else t
    pieces.append(rec[int(pos * SR):])
    full = np.concatenate(pieces)
    import wave
    with wave.open(out, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(full, -1, 1) * 32767).astype(np.int16).tobytes())
    print(f"spliced -> {out}: {len(full)/SR:.1f}s; cuts:", {k: round(v, 2) for k, v in cut.items()})


if __name__ == "__main__":
    main(*sys.argv[1:])
