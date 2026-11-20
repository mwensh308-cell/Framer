"""High-quality scene images (better faces/hands) with RealVisXL V5 Lightning on CPU (~2 min/image).
usage: python gen_hq.py prompts.json outdir     (writes outdir/<id>_0.png, skips existing)"""
import json, os, sys, torch
from diffusers import StableDiffusionXLPipeline, DPMSolverMultistepScheduler
STYLE = (", dark moody classical oil painting on textured canvas, Rembrandt chiaroscuro lighting, deep shadows,"
         " visible brushstrokes, muted earthy palette, detailed realistic face, natural hands, museum masterpiece")
NEG = ("photo, photograph, glossy, 3d render, cgi, cartoon, anime, deformed face, distorted face, asymmetric eyes,"
       " extra fingers, missing fingers, bad hands, bad anatomy, extra limbs, blurry, text, watermark, signature")
prompts = json.load(open(sys.argv[1])); out = sys.argv[2]; os.makedirs(out, exist_ok=True)
torch.set_num_threads(os.cpu_count())
pipe = StableDiffusionXLPipeline.from_pretrained("SG161222/RealVisXL_V5.0_Lightning", torch_dtype=torch.bfloat16,
                                                 variant="fp16", low_cpu_mem_usage=True)
pipe.scheduler = DPMSolverMultistepScheduler.from_config(pipe.scheduler.config, use_karras_sigmas=True,
                                                         algorithm_type="sde-dpmsolver++")
pipe.enable_attention_slicing(); pipe.vae.enable_tiling()
for key, p in prompts.items():
    path = f"{out}/{key}_0.png"
    if os.path.exists(path):
        continue
    img = pipe(prompt=p + STYLE, negative_prompt=NEG, num_inference_steps=6, guidance_scale=1.5,
               width=1344, height=768, generator=torch.Generator().manual_seed(int(key) * 7 + 3)).images[0]
    img.save(path); print("saved", key, flush=True)
