"""Motion engine: turns still paintings + timeline into a moving, After-Effects style picture track.

Per scene: 2.5D parallax camera move driven by a depth map (push / pull / truck / crane),
handheld wiggle, floating dust layers, drifting light leaks, crossfades between scenes.
Chapter cards: blurred dark background, white flash + RGB-split glitch on entry.
Quote lines: background dims so the animated quote text can take over.

usage: python render.py episode_dir [workers]
reads  episode_dir/audio/timeline.json, episode_dir/img/<id>_0.png (+ .depth.npy)
writes episode_dir/build/picture.mp4
"""
import json, math, os, subprocess, sys
from multiprocessing import Pool
import cv2, numpy as np

W, H, FPS = 1920, 1080, 30
S = 1.2                     # source pixels per output pixel at zoom 1
SW, SH = int(W * S), int(H * S)
FADE = 0.7
MOVES = ["push", "truck_l", "pull", "crane", "truck_r", "push"]


def ease(x):
    x = min(1.0, max(0.0, x))
    return x * x * (3 - 2 * x)


# ---------------------------------------------------------------- timeline
def segments(tl):
    segs = []
    for ch in tl["chapters"]:
        first = ch["scenes"][0]["id"]
        if ch["card"]:
            segs.append({"kind": "card", "id": first, "start": ch["card"]["start"], "title": ch["title"]})
        for sc in ch["scenes"]:
            segs.append({"kind": "scene", "id": sc["id"], "start": sc["start"]})
    for i, s in enumerate(segs):
        s["end"] = segs[i + 1]["start"] if i + 1 < len(segs) else tl["duration"]
        s["move"] = MOVES[i % len(MOVES)]
        s["leak"] = (i % 3 == 1)
    quotes = [(ln["start"], ln["end"]) for ch in tl["chapters"] for sc in ch["scenes"]
              for ln in sc["lines"] if ln.get("quote")]
    return segs, quotes


# ---------------------------------------------------------------- assets
class Assets:
    def __init__(self, imgdir):
        self.imgdir, self.cache = imgdir, {}
        rng = np.random.default_rng(7)
        gy, gx = np.mgrid[0:H, 0:W].astype(np.float32)
        self.gx, self.gy = gx - W / 2, gy - H / 2
        self.dust = [self._dust(rng, 260, (1, 3), (90, 210)), self._dust(rng, 40, (4, 9), (25, 60))]
        self.leak = self._leak()

    def _dust(self, rng, n, rad, val):
        tex = np.zeros((H * 2, W * 2), np.uint8)
        for _ in range(n):
            x, y = rng.integers(0, W * 2), rng.integers(0, H * 2)
            cv2.circle(tex, (int(x), int(y)), int(rng.integers(*rad)), int(rng.integers(*val)), -1, cv2.LINE_AA)
        tex = cv2.GaussianBlur(tex, (0, 0), 1.2 if rad[1] < 5 else 4)
        tex = np.concatenate([tex, tex], 1)[:, :W * 2]  # keep size, wrap handled by modulo
        warm = np.stack([tex * 0.75, tex * 0.9, tex], -1)  # BGR, warm tint
        return np.clip(warm, 0, 255).astype(np.uint8)

    def _leak(self):
        gy, gx = np.mgrid[0:H, 0:W * 2].astype(np.float32)
        blob = np.exp(-(((gx - W * 0.6) / (W * 0.35)) ** 2 + ((gy - H * 0.3) / (H * 0.6)) ** 2))
        blob += 0.6 * np.exp(-(((gx - W * 1.4) / (W * 0.25)) ** 2 + ((gy - H * 0.8) / (H * 0.5)) ** 2))
        col = np.stack([blob * 40, blob * 120, blob * 255], -1)  # orange
        return np.clip(col, 0, 255).astype(np.uint8)

    def scene(self, sid, card=False):
        key = (sid, card)
        if key in self.cache:
            return self.cache[key]
        if len(self.cache) > 4:
            self.cache.pop(next(iter(self.cache)))
        img = cv2.imread(f"{self.imgdir}/{sid}_0.png")
        img = cv2.resize(img, (SW, SH), interpolation=cv2.INTER_LANCZOS4)
        img = cv2.addWeighted(img, 1.5, cv2.GaussianBlur(img, (0, 0), 2.0), -0.5, 0)  # sharpen upscale
        dpath = f"{self.imgdir}/{sid}_0.depth.npy"
        if os.path.exists(dpath):
            d = np.load(dpath).astype(np.float32)
            d = cv2.GaussianBlur(cv2.resize(d, (SW, SH)), (0, 0), 6)
        else:
            d = np.zeros((SH, SW), np.float32)
        if card:
            img = cv2.GaussianBlur(img, (0, 0), 14)
            img = cv2.convertScaleAbs(img, alpha=0.38)
            d = d * 0
        self.cache[key] = (img, d)
        return img, d


# ---------------------------------------------------------------- one frame of one segment
def shot(A, seg, t):
    span = seg["end"] - seg["start"] + FADE
    u = ease((t - (seg["start"] - FADE / 2)) / span)
    img, d = A.scene(seg["id"], seg["kind"] == "card")
    move = "push" if seg["kind"] == "card" else seg["move"]
    Z, a, tx, ty = 1.08, 0.0, 0.0, 0.0
    if move == "push":
        Z, a = 1.06 + 0.10 * u, 0.07 * u
    elif move == "pull":
        Z, a = 1.16 - 0.10 * u, 0.07 * (1 - u)
    elif move == "truck_l":
        Z, tx = 1.12, -34 + 68 * u
    elif move == "truck_r":
        Z, tx = 1.12, 34 - 68 * u
    elif move == "crane":
        Z, ty = 1.12, 26 - 52 * u
    # handheld wiggle (a few px, slow)
    wx = 3.0 * math.sin(t * 0.9) + 1.5 * math.sin(t * 2.3 + 1)
    wy = 2.2 * math.sin(t * 0.7 + 2) + 1.2 * math.sin(t * 1.9)
    k = S / Z
    bx = A.gx * k + (SW / 2 + wx)
    by = A.gy * k + (SH / 2 + wy)
    dep = cv2.remap(d, bx, by, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    sx = bx - (tx * S) * dep - A.gx * k * a * dep
    sy = by - (ty * S) * dep - A.gy * k * a * dep
    frame = cv2.remap(img, sx, sy, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    if seg["leak"] and seg["kind"] == "scene":
        off = int((W * 0.9) * u)
        alpha = 0.18 + 0.10 * math.sin(t * 1.3)
        frame = cv2.addWeighted(frame, 1.0, A.leak[:, off:off + W], alpha, 0)
    return frame


def compose(A, segs, quotes, t):
    # active segments (crossfade window around each boundary)
    i = next((k for k, s in enumerate(segs) if s["start"] <= t < s["end"]), len(segs) - 1)
    frame = shot(A, segs[i], t)
    seg = segs[i]
    if i > 0 and t < seg["start"] + FADE / 2:
        w = ease((t - (seg["start"] - FADE / 2)) / FADE)
        frame = cv2.addWeighted(shot(A, segs[i - 1], t), 1 - w, frame, w, 0)
    elif i + 1 < len(segs) and t > seg["end"] - FADE / 2:
        w = ease((t - (seg["end"] - FADE / 2)) / FADE)
        frame = cv2.addWeighted(frame, 1 - w, shot(A, segs[i + 1], t), w, 0)

    # quote dimming
    q = 0.0
    for a, b in quotes:
        if a - 0.5 <= t <= b + 0.6:
            q = max(q, min(ease((t - a + 0.5) / 0.5), ease((b + 0.6 - t) / 0.6)))
    if q > 0:
        frame = cv2.convertScaleAbs(frame, alpha=1 - 0.55 * q)

    # dust (two layers, different speeds and depths)
    for L, (vx, vy, amp) in zip(A.dust, [(14, -9, 0.55), (6, -4, 0.35)]):
        ox, oy = int(t * vx) % W, int(t * vy) % H
        flick = amp * (0.85 + 0.15 * math.sin(t * 7.1))
        frame = cv2.addWeighted(frame, 1.0, L[oy:oy + H, ox:ox + W], flick, 0)

    # chapter entry: flash + RGB split glitch
    if seg["kind"] == "card":
        dt = t - seg["start"]
        if 0 <= dt < 0.45:
            f = 0.85 * (1 - dt / 0.45) ** 2
            frame = cv2.addWeighted(frame, 1 - f, np.full_like(frame, (200, 230, 255)), f, 0)
        if 0 <= dt < 0.3:
            sh = int(18 * (1 - dt / 0.3)) + 2
            b, g, r = cv2.split(frame)
            frame = cv2.merge([np.roll(b, -sh, 1), g, np.roll(r, sh, 1)])
            rng = np.random.default_rng(int(t * 1000))
            for _ in range(5):
                y0 = int(rng.integers(0, H - 40)); hh = int(rng.integers(8, 40))
                frame[y0:y0 + hh] = np.roll(frame[y0:y0 + hh], int(rng.integers(-60, 60)), 1)
    return frame


# ---------------------------------------------------------------- workers
def work(args):
    ep, k, f0, f1 = args
    tl = json.load(open(f"{ep}/audio/timeline.json", encoding="utf-8"))
    segs, quotes = segments(tl)
    A = Assets(f"{ep}/img")
    out = f"{ep}/build/picture_{k}.mp4"
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{W}x{H}",
                          "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "veryfast", "-crf", "16",
                          "-pix_fmt", "yuv420p", out], stdin=subprocess.PIPE)
    for n in range(f0, f1):
        p.stdin.write(compose(A, segs, quotes, n / FPS).tobytes())
        if (n - f0) % 900 == 0:
            print(f"worker {k}: {n - f0}/{f1 - f0}", flush=True)
    p.stdin.close(); p.wait()
    return out


def main(ep, workers=4):
    cv2.setNumThreads(1)
    os.makedirs(f"{ep}/build", exist_ok=True)
    tl = json.load(open(f"{ep}/audio/timeline.json", encoding="utf-8"))
    total = int(math.ceil(tl["duration"] * FPS))
    step = math.ceil(total / workers)
    jobs = [(ep, k, k * step, min(total, (k + 1) * step)) for k in range(workers)]
    with Pool(workers) as pool:
        parts = pool.map(work, jobs)
    lst = f"{ep}/build/parts.txt"
    open(lst, "w").write("".join(f"file '{os.path.abspath(p)}'\n" for p in parts))
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy",
                    f"{ep}/build/picture.mp4"], check=True)
    print("picture done", f"{ep}/build/picture.mp4")


if __name__ == "__main__":
    main(sys.argv[1], int(sys.argv[2]) if len(sys.argv) > 2 else 4)
