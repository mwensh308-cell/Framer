"""Generate N seed variants per prompt: python gen_variants.py prompts.json outdir N"""
import sys, json, os, torch
from diffusers import AutoPipelineForText2Image
STYLE = ", dark dramatic classical oil painting, chiaroscuro, Rembrandt lighting, deep shadows, visible brushstrokes, museum masterpiece, muted earthy palette"
NEG = "medieval, plate armor, knight, modern clothes, coat, boots, turban, deformed face, extra people"
prompts = json.load(open(sys.argv[1])); out = sys.argv[2]; n = int(sys.argv[3])
torch.set_num_threads(os.cpu_count())
pipe = AutoPipelineForText2Image.from_pretrained("stabilityai/sdxl-turbo", torch_dtype=torch.float32)
for key, p in prompts.items():
    for s in range(n):
        img = pipe(prompt=p + STYLE, num_inference_steps=4, guidance_scale=0.0, width=768, height=432,
                   generator=torch.Generator().manual_seed(7000 + 31 * s)).images[0]
        img.save(f"{out}/{key}_{s}.png"); print("saved", key, s, flush=True)
