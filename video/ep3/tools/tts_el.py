"""Generate per-section narration with ElevenLabs and word timings from its character alignment.

Usage: python3 tts_el.py <voice_id> [model_id] [section ids...]
Writes vo/<id>.mp3 and vo/<id>.words.json ([{w, t, d}] in seconds), the same shape the timeline expects.
The API key is injected by the network proxy; the header value here is a placeholder.
"""
import base64
import json
import sys
import urllib.request

VOICE = sys.argv[1]
MODEL = sys.argv[2] if len(sys.argv) > 2 and not sys.argv[2].startswith("-") else "eleven_multilingual_v2"
ONLY = [a for a in sys.argv[3:]]
SETTINGS = {"stability": 0.45, "similarity_boost": 0.8, "style": 0.25, "use_speaker_boost": True, "speed": 0.97}


def tts(text):
    body = json.dumps({"text": text, "model_id": MODEL, "voice_settings": SETTINGS}).encode()
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE}/with-timestamps?output_format=mp3_44100_128",
        data=body, headers={"xi-api-key": "proxy-injected", "Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=180) as r:
        return json.load(r)


def words_from_alignment(al):
    chars = al["characters"]
    st = al["character_start_times_seconds"]
    en = al["character_end_times_seconds"]
    words, cur, t0, t1 = [], "", None, None
    for c, a, b in zip(chars, st, en):
        if c.isspace():
            if cur:
                words.append({"w": cur, "t": round(t0, 3), "d": round(t1 - t0, 3)})
            cur, t0 = "", None
            continue
        if t0 is None:
            t0 = a
        cur += c
        t1 = b
    if cur:
        words.append({"w": cur, "t": round(t0, 3), "d": round(t1 - t0, 3)})
    return words


def main():
    script = json.load(open("script_saudi.json"))
    for s in script:
        if ONLY and s["id"] not in ONLY:
            continue
        res = tts(s["text"])
        open(f"vo/{s['id']}.mp3", "wb").write(base64.b64decode(res["audio_base64"]))
        al = res.get("normalized_alignment") or res["alignment"]
        if res.get("alignment"):
            al = res["alignment"]
        words = words_from_alignment(al)
        json.dump(words, open(f"vo/{s['id']}.words.json", "w"), ensure_ascii=False)
        print(s["id"], len(words), "words vs", len(s["text"].split()), "tokens", flush=True)


if __name__ == "__main__":
    main()
