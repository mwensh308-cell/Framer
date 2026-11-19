# Video

Two code-to-video tools, each in its own folder so they don't touch the legacy Framer build.

| Folder | Tool | Write videos in |
| --- | --- | --- |
| `remotion/` | [Remotion](https://www.remotion.dev) 4 | React components (`src/`) |
| `hyperframes/` | [HyperFrames](https://hyperframes.heygen.com) | HTML + CSS + GSAP (`index.html`) |

```bash
cd video/remotion && npm install
npm run dev      # Remotion Studio
npm run render   # -> out/hello.mp4
```

```bash
cd video/hyperframes && npm install
npm run dev      # HyperFrames preview studio
npm run check    # lint + runtime checks
npm run render   # -> renders/*.mp4
```

Requires Node 18+ and ffmpeg (HyperFrames).

## After Effects round-trip

After Effects itself runs on your own Windows/Mac machine; these are the bridges to it.

**AE → code (Lottie):** export a comp from After Effects with the Bodymovin / LottieFiles plugin
as `.json`, drop it in `remotion/public/`, and play it with the `LottieDemo` composition
(`src/LottieDemo.tsx`, change the `src` prop). HyperFrames can also play Lottie
(see its `runtimes` reference).

**Code → AE (transparent footage):**

```bash
cd video/hyperframes && npx hyperframes render --format mov          # ProRes 4444 + alpha
cd video/hyperframes && npx hyperframes render --format png-sequence # RGBA frames
cd video/remotion && npx remotion render HelloWorld out/hello.mov --codec=prores --prores-profile=4444 --pixel-format=yuva444p10le --image-format=png
```

**Blender** (installed in the cloud environment) covers compositing nodes, motion tracking,
keying and 3D from the command line: `blender -b file.blend -a`.
