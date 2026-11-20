"""Parse an episode script.

Format:
  ## chapter title line 1 | line 2      -> chapter card (first chapter = intro title)
  @ image prompt                        -> starts a new visual scene
  plain line                            -> narration
  > quote text | attribution            -> narrated + shown as an animated quote card
"""
import json, sys


def parse(path):
    chapters, scene = [], None
    for raw in open(path, encoding="utf-8"):
        line = raw.strip()
        if not line:
            continue
        if line.startswith("##"):
            a, _, b = line[2:].partition("|")
            chapters.append({"title": [a.strip(), b.strip()], "scenes": []})
        elif line.startswith("@"):
            scene = {"prompt": line[1:].strip(), "lines": []}
            chapters[-1]["scenes"].append(scene)
        elif line.startswith(">"):
            q, _, who = line[1:].partition("|")
            scene["lines"].append({"text": q.strip(), "quote": who.strip() or None})
        else:
            scene["lines"].append({"text": line})
    # stable ids
    n = 0
    for c in chapters:
        for s in c["scenes"]:
            n += 1
            s["id"] = f"{n:03d}"
    return chapters


def voice_text(chapters):
    """Plain narration text, for pasting into ElevenLabs or any TTS."""
    out = []
    for c in chapters:
        for s in c["scenes"]:
            out += [l["text"] for l in s["lines"]]
        out.append("")
    return "\n".join(out)


if __name__ == "__main__":
    ch = parse(sys.argv[1])
    print(json.dumps({s["id"]: s["prompt"] for c in ch for s in c["scenes"]}, ensure_ascii=False, indent=1))
