"""Estimate a depth map for every scene image (for 2.5D parallax).

usage: python depth.py imgdir
writes imgdir/<name>.depth.npy (float16, 0 = far, 1 = near) next to each png
"""
import glob, os, sys
import numpy as np, torch
from PIL import Image
from transformers import pipeline

torch.set_num_threads(os.cpu_count())
est = pipeline("depth-estimation", model="depth-anything/Depth-Anything-V2-Small-hf", device="cpu")
for p in sorted(glob.glob(os.path.join(sys.argv[1], "*.png"))):
    out = p[:-4] + ".depth.npy"
    if os.path.exists(out):
        continue
    img = Image.open(p).convert("RGB")
    d = np.asarray(est(img)["predicted_depth"].squeeze(), dtype=np.float32)
    d = (d - d.min()) / max(1e-6, d.max() - d.min())
    d = np.asarray(Image.fromarray(d).resize(img.size, Image.BICUBIC), dtype=np.float32)
    np.save(out, d.astype(np.float16))
    print("depth", os.path.basename(p), flush=True)
