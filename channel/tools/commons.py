"""Free footage and public-domain art from Wikimedia Commons (no API key).

Respects rate limits: on HTTP 429 it waits for Retry-After (or backs off) before retrying.

usage:
  python commons.py search "candle flame" video        -> list candidates (size, duration, license)
  python commons.py get "File:Some_video.webm" out.mp4 [seconds]  -> download + convert to 1080p mp4
"""
import json, subprocess, sys, time, urllib.parse, urllib.request

UA = {"User-Agent": "StoryChannelBot/1.0"}
API = "https://commons.wikimedia.org/w/api.php?"
FREE = ("CC0", "Public domain", "PD", "CC BY", "CC BY-SA")


def fetch(url, tries=6):
    for k in range(tries):
        try:
            return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60).read()
        except urllib.error.HTTPError as e:
            if e.code != 429 or k == tries - 1:
                raise
            wait = int(e.headers.get("Retry-After") or 0) or 10 * (k + 1)
            print(f"rate limited, waiting {wait}s", file=sys.stderr, flush=True)
            time.sleep(wait)


def api(**params):
    return json.loads(fetch(API + urllib.parse.urlencode({**params, "format": "json"})))


def search(term, kind="video", limit=12):
    ft = "filetype:video" if kind == "video" else "filetype:bitmap"
    d = api(action="query", generator="search", gsrsearch=f"{term} {ft}", gsrnamespace=6, gsrlimit=limit,
            prop="imageinfo", iiprop="url|size|mime|extmetadata")
    res = []
    for p in (d.get("query", {}).get("pages", {}) or {}).values():
        ii = p["imageinfo"][0]; m = ii.get("extmetadata", {})
        lic = m.get("LicenseShortName", {}).get("value", "")
        res.append({"title": p["title"], "url": ii["url"], "w": ii.get("width", 0), "h": ii.get("height", 0),
                    "dur": ii.get("duration", 0) or 0, "license": lic,
                    "artist": m.get("Artist", {}).get("value", "")[:80], "free": lic.startswith(FREE)})
    return sorted(res, key=lambda r: (-r["free"], -r["w"]))


def get(title, out, seconds=None):
    d = api(action="query", titles=title, prop="imageinfo", iiprop="url|extmetadata")
    ii = next(iter(d["query"]["pages"].values()))["imageinfo"][0]
    raw = out + ".src"
    open(raw, "wb").write(fetch(ii["url"]))
    vf = "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=30"
    cmd = ["ffmpeg", "-v", "error", "-y", "-i", raw, "-an", "-vf", vf, "-c:v", "libx264", "-crf", "17",
           "-preset", "veryfast", "-pix_fmt", "yuv420p"]
    if seconds:
        cmd += ["-t", str(seconds)]
    subprocess.run(cmd + [out], check=True)
    m = ii.get("extmetadata", {})
    credit = {"title": title, "license": m.get("LicenseShortName", {}).get("value", ""),
              "artist": m.get("Artist", {}).get("value", ""), "source": ii.get("descriptionurl", ii["url"])}
    json.dump(credit, open(out + ".credit.json", "w"), ensure_ascii=False, indent=1)
    return credit


def get_image(title, width=2000):
    """Download a Commons image (scaled thumbnail) -> (PIL.Image, credit dict)."""
    import io
    from PIL import Image
    d = api(action="query", titles=title, prop="imageinfo", iiprop="url|extmetadata", iiurlwidth=width)
    ii = next(iter(d["query"]["pages"].values()))["imageinfo"][0]
    img = Image.open(io.BytesIO(fetch(ii.get("thumburl") or ii["url"]))).convert("RGB")
    m = ii.get("extmetadata", {})
    return img, {"title": title, "license": m.get("LicenseShortName", {}).get("value", ""),
                 "artist": m.get("Artist", {}).get("value", ""), "source": ii.get("descriptionurl", "")}


def frame_16x9(img, crop=None, W=1344, H=768, side="center"):
    """Fit any artwork into a 16:9 frame: blurred dark copy as background, artwork on top with a soft shadow."""
    from PIL import Image, ImageFilter, ImageEnhance
    if crop:
        w, h = img.size
        img = img.crop((int(crop[0] * w), int(crop[1] * h), int(crop[2] * w), int(crop[3] * h)))
    w, h = img.size
    if w / h >= W / H * 0.92:  # wide artwork: fill the frame
        s = max(W / w, H / h)
        img = img.resize((int(w * s), int(h * s)), Image.LANCZOS)
        x, y = (img.width - W) // 2, (img.height - H) // 2
        return img.crop((x, y, x + W, y + H))
    s = max(W / w, H / h)
    bg = img.resize((int(w * s), int(h * s)), Image.LANCZOS)
    bg = bg.crop(((bg.width - W) // 2, (bg.height - H) // 2, (bg.width - W) // 2 + W, (bg.height - H) // 2 + H))
    bg = ImageEnhance.Brightness(bg.filter(ImageFilter.GaussianBlur(28))).enhance(0.35)
    s = H * 0.94 / h
    fg = img.resize((int(w * s), int(h * s)), Image.LANCZOS)
    x = {"center": (W - fg.width) // 2, "right": int(W * 0.62 - fg.width / 2)}[side]
    y = (H - fg.height) // 2
    shadow = Image.new("L", (W, H), 0)
    shadow.paste(255, (x + 14, y + 18, x + fg.width + 14, y + fg.height + 18))
    bg.paste(Image.new("RGB", (W, H), (0, 0, 0)), (0, 0), shadow.filter(ImageFilter.GaussianBlur(22)).point(lambda v: v * 0.7))
    bg.paste(fg, (x, y))
    return bg


if __name__ == "__main__":
    if sys.argv[1] == "search":
        for r in search(sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else "video"):
            print(f"{r['w']}x{r['h']} {r['dur']:.0f}s {'FREE' if r['free'] else '----'} {r['license'][:14]:14} {r['title'][:80]}")
    else:
        print(get(sys.argv[2], sys.argv[3], float(sys.argv[4]) if len(sys.argv) > 4 else None))
