"""Generate oil-painting scene images locally (CPU) with SDXL-Turbo.
usage: python gen_images.py prompts.json outdir"""
import sys, json, os, torch
from diffusers import AutoPipelineForText2Image
STYLE = ", dark dramatic classical oil painting, chiaroscuro, Rembrandt lighting, deep shadows, visible brushstrokes, museum masterpiece, muted earthy palette"
prompts = json.load(open(sys.argv[1])); out = sys.argv[2]; os.makedirs(out, exist_ok=True)
torch.set_num_threads(os.cpu_count())
pipe = AutoPipelineForText2Image.from_pretrained("stabilityai/sdxl-turbo", torch_dtype=torch.float32)
for i, p in enumerate(prompts, 1):
    path = f"{out}/{i:02d}.png"
    if os.path.exists(path): continue
    img = pipe(prompt=p + STYLE, num_inference_steps=4, guidance_scale=0.0, width=768, height=432,
               generator=torch.Generator().manual_seed(1000 + i)).images[0]
    img.save(path); print("saved", path, flush=True)
