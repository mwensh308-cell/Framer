"""Assemble a narrated story video in the channel's style.

Style: slow Ken Burns moves on dark oil paintings, soft crossfades, warm grade,
vignette + film grain, Arabic subtitles (Cairo), a two-word intro title
(white + red, like the thumbnails), and a low ambient music bed.

usage: python build_video.py project.json
project.json keys:
  voice   narration audio (mp3)
  srt     subtitle cues for the narration (edge-tts --write-subtitles)
  scenes  [{"image": "img/01.png", "from": "first words of the cue where it starts"}]
  title   ["سيكولوجية", "الحرية"]
  out     output mp4 path
"""
import json, os, re, subprocess, sys

FPS, W, H, FADE = 30, 1920, 1080, 0.8
HERE = os.path.dirname(os.path.abspath(__file__))
FONTS = os.path.join(HERE, "..", "fonts")


def run(cmd):
    subprocess.run(cmd, check=True)


def dur(path):
    return float(subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path]))


def ts(s):
    h, m, rest = s.replace(",", ".").split(":")
    return int(h) * 3600 + int(m) * 60 + float(rest)


def read_srt(path):
    cues = []
    for block in re.split(r"\n\s*\n", open(path, encoding="utf-8").read().strip()):
        lines = block.strip().splitlines()
        a, b = lines[1].split(" --> ")
        cues.append((ts(a), ts(b), " ".join(lines[2:])))
    return cues


def ass_time(t):
    h, t = divmod(t, 3600); m, s = divmod(t, 60)
    return f"{int(h)}:{int(m):02d}:{s:05.2f}"


def write_ass(cues, title, total, path):
    head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Sub,Cairo,100,&H00FFFFFF,&H00FFFFFF,&H00000000,&H96000000,1,0,0,0,100,100,0,0,1,3.5,2,2,160,160,70,1
Style: Title,Cairo Black,200,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,1,0,0,0,100,100,0,0,1,0,6,5,100,100,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    ev = []
    for a, b, text in cues:
        text = text.rstrip(".،")
        ev.append(f"Dialogue: 0,{ass_time(a)},{ass_time(b)},Sub,,0,0,0,,{{\\fad(120,120)}}{text}")
    if title:
        t1, t2 = title
        ev.append(f"Dialogue: 1,{ass_time(0.2)},{ass_time(4.2)},Title,,0,0,0,,"
                  f"{{\\fad(500,600)\\pos({W/2},{H/2-110})}}{t1}")
        ev.append(f"Dialogue: 1,{ass_time(0.6)},{ass_time(4.2)},Title,,0,0,0,,"
                  f"{{\\fad(500,600)\\pos({W/2},{H/2+110})\\c&H3C4CE7&}}{t2}")
    open(path, "w", encoding="utf-8").write(head + "\n".join(ev) + "\n")


def kenburns(img, seconds, idx, out):
    """One scene clip: slow zoom in / zoom out alternating, with a gentle drift."""
    frames = int(round(seconds * FPS))
    z = "1.0+0.12*on/{n}".format(n=frames) if idx % 2 == 0 else "1.12-0.12*on/{n}".format(n=frames)
    drift = ["iw/2-(iw/zoom/2)", "(iw-iw/zoom)*on/{n}", "(iw-iw/zoom)*(1-on/{n})"][idx % 3].format(n=frames)
    vf = (f"scale=3840:2160:force_original_aspect_ratio=increase:flags=lanczos,crop=3840:2160,"
          f"zoompan=z='{z}':x='{drift}':y='ih/2-(ih/zoom/2)':d={frames}:s={W}x{H}:fps={FPS},"
          f"format=yuv420p")
    run(["ffmpeg", "-y", "-v", "error", "-loop", "1", "-i", img, "-vf", vf, "-frames:v", str(frames),
         "-c:v", "libx264", "-preset", "veryfast", "-crf", "16", out])


def music_bed(seconds, out):
    """Dark ambient drone (A minor-ish) generated from scratch: royalty free."""
    expr = ("0.22*sin(2*PI*55*t)*(0.7+0.3*sin(2*PI*0.07*t))"
            "+0.16*sin(2*PI*82.41*t)*(0.6+0.4*sin(2*PI*0.05*t+1))"
            "+0.12*sin(2*PI*110*t)*(0.5+0.5*sin(2*PI*0.03*t+2))"
            "+0.07*sin(2*PI*130.81*t)*(0.5+0.5*sin(2*PI*0.04*t+3))")
    run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i",
         f"aevalsrc='{expr}|{expr}':s=44100:d={seconds}",
         "-af", f"aecho=0.8:0.7:120|260:0.35|0.25,lowpass=f=900,afade=t=in:d=3,"
                f"afade=t=out:st={max(0, seconds-4)}:d=4,volume=0.6", out])


def main(cfg_path):
    cfg = json.load(open(cfg_path, encoding="utf-8"))
    base = os.path.dirname(os.path.abspath(cfg_path)); os.chdir(base)
    work = "build"; os.makedirs(work, exist_ok=True)
    cues = read_srt(cfg["srt"])
    total = dur(cfg["voice"]) + 2.0

    # scene start times from the cue where each scene's text begins
    starts, ci = [], 0
    for sc in cfg["scenes"]:
        while ci < len(cues) and not cues[ci][2].startswith(sc["from"]):
            ci += 1
        if ci == len(cues):
            sys.exit(f"scene text not found in subtitles: {sc['from']}")
        starts.append(0.0 if not starts else cues[ci][0])
    ends = starts[1:] + [total]

    clips = []
    for i, (sc, a, b) in enumerate(zip(cfg["scenes"], starts, ends)):
        clip = f"{work}/scene{i:02d}.mp4"
        kenburns(sc["image"], (b - a) + FADE, i, clip)
        clips.append(clip)

    # crossfade chain
    inputs, filt, last = [], [], "[0:v]"
    for c in clips:
        inputs += ["-i", c]
    for i in range(1, len(clips)):
        lbl = f"[x{i}]"
        filt.append(f"{last}[{i}:v]xfade=transition=fade:duration={FADE}:offset={starts[i]:.3f}{lbl}")
        last = lbl
    slideshow = f"{work}/slideshow.mp4"
    if filt:
        run(["ffmpeg", "-y", "-v", "error", *inputs, "-filter_complex", ";".join(filt), "-map", last,
             "-t", f"{total:.3f}", "-c:v", "libx264", "-preset", "veryfast", "-crf", "16", slideshow])
    else:
        os.replace(clips[0], slideshow)

    ass = f"{work}/subs.ass"
    write_ass(cues, cfg.get("title"), total, ass)
    music = f"{work}/music.wav"
    music_bed(total, music)

    vf = (f"eq=contrast=1.06:saturation=0.88:gamma=0.97,colorbalance=rm=0.04:bm=-0.04,"
          f"vignette=PI/4.5,noise=alls=5:allf=t,"
          f"ass={ass}:fontsdir={FONTS}:shaping=complex,fade=t=in:d=1,fade=t=out:st={total-1.5:.2f}:d=1.5")
    af = "[1:a]volume=1.0[nar];[2:a]volume=0.35[m];[nar][m]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-14:TP=-1.5[a]"
    run(["ffmpeg", "-y", "-v", "error", "-i", slideshow, "-i", cfg["voice"], "-i", music,
         "-filter_complex", f"[0:v]{vf}[v];{af}", "-map", "[v]", "-map", "[a]",
         "-t", f"{total:.3f}", "-c:v", "libx264", "-preset", "medium", "-crf", "23", "-tune", "grain",
         "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", cfg["out"]])
    print("done:", os.path.join(base, cfg["out"]))


if __name__ == "__main__":
    main(sys.argv[1])
