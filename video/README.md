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
