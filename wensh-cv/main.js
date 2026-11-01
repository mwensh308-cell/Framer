/* ==========================================================================
   WENSH // CV — interaction + WebGL layer
   - Boot sequence (once per session, skipped for reduced motion)
   - Particle portrait (Three.js points + custom shader): reveal, mouse repel,
     depth-from-luminance, glitch bands, scroll dispersion into a data field
   - Micro-interactions: tilt cards, reveal-on-scroll, glitch pulses, role typer,
     nav state, copy-to-clipboard
   Everything here is progressive enhancement: the DOM is complete without it.
   ========================================================================== */
const root = document.documentElement;
root.classList.add('js');

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(pointer: fine)').matches;
const isSmall = matchMedia('(max-width: 760px)').matches;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

$('#yr').textContent = new Date().getFullYear();

/* ---------------------------------------------------------------- Boot -- */
function runBoot() {
  const boot = $('#boot');
  const log = $('#boot-log');
  let seen = false;
  try { seen = sessionStorage.getItem('wensh-boot') === '1'; } catch (_) {}
  if (reduceMotion || seen) { boot.classList.add('is-done'); return Promise.resolve(); }

  const lines = [
    ['$ ssh wensh@cairo', ''],
    ['[ ok ] mounting /dev/cv ............... done', ''],
    ['[ ok ] loading modules: mechatronics, media, security', ''],
    ['[ !! ] anomaly detected in sector 0x7f', 'r'],
    ['[ ok ] rerouting through helwan.edu', ''],
    ['', ''],
    ['hello, friend.', 'w'],
  ];
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return; done = true;
      boot.classList.add('is-done');
      try { sessionStorage.setItem('wensh-boot', '1'); } catch (_) {}
      removeEventListener('keydown', finish); boot.removeEventListener('pointerdown', finish);
      resolve();
    };
    addEventListener('keydown', finish); boot.addEventListener('pointerdown', finish);
    let i = 0;
    const next = () => {
      if (done) return;
      if (i >= lines.length) { setTimeout(finish, 450); return; }
      const [text, cls] = lines[i++];
      const span = document.createElement('span');
      if (cls) span.className = cls;
      span.textContent = text + '\n';
      log.appendChild(span);
      setTimeout(next, text.startsWith('[ !!') ? 380 : 190 + Math.random() * 120);
    };
    next();
  });
}

/* ------------------------------------------------------------ WebGL -- */
async function initStage() {
  const canvas = $('#stage');
  let THREE;
  try {
    THREE = await import('three');
    const test = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!test) throw new Error('no webgl');
  } catch (e) {
    root.classList.add('no-webgl');
    return { glitch() {}, reveal() {} };
  }

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' });
  let dprCap = isSmall ? 1.5 : 1.75;
  renderer.setPixelRatio(Math.min(devicePixelRatio, dprCap));
  renderer.setClearColor(0x080808, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(0, 0, 10);

  /* --- sample the portrait into a point cloud --- */
  const img = await new Promise((res, rej) => {
    const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = 'assets/portrait-depth.jpg';
  }).catch(() => null);
  if (!img) { root.classList.add('no-webgl'); return { glitch() {}, reveal() {} }; }

  const cw = img.width, ch = img.height;
  const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, cw, ch).data;

  const stride = isSmall ? 2 : 1;
  const worldH = 6.2, scale = worldH / ch;
  const pos = [], lum = [], rnd = [];
  for (let y = 0; y < ch; y += stride) {
    for (let x = 0; x < cw; x += stride) {
      // elliptical vignette centred on the subject: dissolves the wall/border
      // into the void so the cloud has no hard rectangular edge
      const dx = (x / cw - 0.47) / 0.5, dy = (y / ch - 0.48) / 0.56;
      const d = Math.sqrt(dx * dx + dy * dy);
      const fall = 1 - Math.min(1, Math.max(0, (d - 0.5) / 0.5));
      const l = (data[(y * cw + x) * 4] / 255) * fall * fall * (3 - 2 * fall);
      if (l < 0.07) continue;               // drop near-black — saves vertices
      pos.push((x - cw / 2) * scale, (ch / 2 - y) * scale, 0);
      lum.push(l);
      rnd.push(Math.random(), Math.random(), Math.random());
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('aLum', new THREE.Float32BufferAttribute(lum, 1));
  geo.setAttribute('aRnd', new THREE.Float32BufferAttribute(rnd, 3));

  const uniforms = {
    uTime: { value: 0 },
    uReveal: { value: reduceMotion ? 1 : 0 },
    uScroll: { value: 0 },
    uGlitch: { value: 0 },
    uMouse: { value: new THREE.Vector2(99, 99) },
    uSize: { value: (isSmall ? 1.6 : 2.1) * stride },
    uPR: { value: renderer.getPixelRatio() },
    uAlpha: { value: 1 },
  };

  const mat = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false,
    vertexShader: /* glsl */`
      attribute float aLum; attribute vec3 aRnd;
      uniform float uTime, uReveal, uScroll, uGlitch, uSize, uPR;
      uniform vec2 uMouse;
      varying float vLum; varying float vGl; varying float vR;
      float hash(float n){ return fract(sin(n) * 43758.5453123); }
      void main(){
        vec3 p = position;
        // depth from luminance + breathing
        p.z += aLum * 1.1 - 0.55;
        p.z += sin(p.y * 3.0 + uTime * 1.3 + aRnd.x * 6.2831) * 0.035;
        // cursor repulsion (pushes points out & toward camera)
        vec2 d = p.xy - uMouse; float dist = length(d);
        float f = smoothstep(1.0, 0.0, dist);
        p.xy += normalize(d + 1e-4) * f * 0.42;
        p.z  += f * 0.8;
        // horizontal glitch bands (datamosh)
        float band = floor(p.y * 7.0) + floor(uTime * 14.0);
        float g = step(0.82, hash(band)) * uGlitch;
        p.x += g * (hash(band + 3.1) - 0.5) * 1.1;
        // intro: assemble from scattered noise
        float t = clamp(uReveal * 1.6 - aRnd.y * 0.6, 0.0, 1.0);
        t = 1.0 - pow(1.0 - t, 3.0);
        vec3 scatter = (aRnd - 0.5) * vec3(18.0, 12.0, 10.0);
        p = mix(scatter, p, t);
        // scroll: dissolve into a drifting data field
        float s = smoothstep(0.0, 1.0, uScroll);
        vec3 field = (aRnd - 0.5) * vec3(22.0, 14.0, 12.0);
        field.y = mod(field.y + uTime * (0.08 + aRnd.z * 0.15) + 7.0, 14.0) - 7.0;
        p = mix(p, field, s * (0.55 + aRnd.x * 0.45));
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uSize * uPR * (0.55 + aLum * 0.9) * (10.0 / -mv.z);
        vLum = aLum; vGl = g; vR = aRnd.z;
      }`,
    fragmentShader: /* glsl */`
      precision highp float;
      uniform float uAlpha, uScroll;
      varying float vLum; varying float vGl; varying float vR;
      void main(){
        float r = length(gl_PointCoord - 0.5);
        if (r > 0.5) discard;
        vec3 bone = vec3(0.91, 0.90, 0.88);
        vec3 term = vec3(0.22, 1.0, 0.53);
        vec3 red  = vec3(0.88, 0.19, 0.16);
        vec3 c = mix(term * 0.6, bone, smoothstep(0.3, 0.95, vLum));
        c = mix(c, red, vGl);
        c = mix(c, red, step(0.93, vR) * uScroll);         // sparse red packets in the field
        float a = smoothstep(0.05, 0.55, vLum) * (1.0 - smoothstep(0.25, 0.5, r));
        a *= uAlpha * mix(1.0, 0.38, uScroll);
        gl_FragColor = vec4(c, a);
      }`,
  });
  const portrait = new THREE.Points(geo, mat);
  const group = new THREE.Group();
  group.add(portrait);
  scene.add(group);

  /* --- deep background starfield for parallax depth --- */
  const N = isSmall ? 500 : 1400;
  const sp = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    sp[i * 3] = (Math.random() - 0.5) * 40;
    sp[i * 3 + 1] = (Math.random() - 0.5) * 60;
    sp[i * 3 + 2] = -6 - Math.random() * 20;
  }
  const sgeo = new THREE.BufferGeometry();
  sgeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const stars = new THREE.Points(sgeo, new THREE.PointsMaterial({ color: 0x3a3c41, size: 0.06, sizeAttenuation: true, transparent: true, opacity: 0.8, depthWrite: false }));
  scene.add(stars);

  /* --- layout --- */
  let visW = 0, visH = 0;
  function layout() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    visH = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    visW = visH * camera.aspect;
    const small = w < 760;
    group.position.x = small ? 0 : Math.min(visW * 0.22, 3.6);
    // mobile: portrait sits behind the upper half of the hero, dimmed for legibility
    const ms = Math.min(1, (visW * 0.95) / (worldH * cw / ch));
    group.position.y = small ? visH * 0.17 : -0.15;
    group.scale.setScalar(small ? ms : 1);
    uniforms.uAlpha.value = small ? 0.42 : 1;
    uniforms.uPR.value = renderer.getPixelRatio();
  }
  layout();
  addEventListener('resize', layout, { passive: true });

  /* --- input --- */
  const pointer = { x: 0, y: 0, tx: 0, ty: 0, active: false };
  addEventListener('pointermove', (e) => {
    pointer.tx = (e.clientX / innerWidth) * 2 - 1;
    pointer.ty = -(e.clientY / innerHeight) * 2 + 1;
    pointer.active = true;
  }, { passive: true });
  document.addEventListener('pointerleave', () => { pointer.active = false; });

  let scrollT = 0;
  const onScroll = () => { scrollT = Math.min(1, scrollY / (innerHeight * 0.9)); };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* --- glitch scheduler --- */
  let glitchUntil = 0;
  const glitch = (ms = 220) => { if (!reduceMotion) glitchUntil = performance.now() + ms; };
  if (!reduceMotion) {
    const loop = () => { glitch(160 + Math.random() * 160); setTimeout(loop, 3200 + Math.random() * 4200); };
    setTimeout(loop, 4000);
  }

  /* --- render loop with adaptive quality --- */
  const clock = new THREE.Clock();
  let revealStart = -1, frames = 0, acc = 0, degraded = false;
  const mouseLocal = new THREE.Vector2(99, 99);

  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    uniforms.uTime.value = t;

    // perf guard: if first ~90 frames average > 24ms, drop resolution once
    if (!degraded && frames < 90) {
      acc += dt; frames++;
      if (frames === 90 && acc / 90 > 0.024) {
        degraded = true; dprCap = 1; renderer.setPixelRatio(1); layout();
      }
    }

    if (revealStart >= 0) uniforms.uReveal.value = Math.min(1, (t - revealStart) / 2.4);

    pointer.x += (pointer.tx - pointer.x) * 0.06;
    pointer.y += (pointer.ty - pointer.y) * 0.06;

    // pointer → portrait-local plane coords (z=0)
    const mx = pointer.active ? pointer.tx * visW / 2 - group.position.x : 99;
    const my = pointer.active ? pointer.ty * visH / 2 - group.position.y : 99;
    mouseLocal.x += (mx - mouseLocal.x) * 0.15;
    mouseLocal.y += (my - mouseLocal.y) * 0.15;
    uniforms.uMouse.value.set(mouseLocal.x / group.scale.x, mouseLocal.y / group.scale.y);

    const s = uniforms.uScroll.value += (scrollT - uniforms.uScroll.value) * 0.08;
    group.rotation.y = pointer.x * 0.28 + s * 0.6 + Math.sin(t * 0.2) * 0.04;
    group.rotation.x = -pointer.y * 0.12;
    stars.position.y = (scrollY / innerHeight) * 1.2;
    stars.rotation.y = pointer.x * 0.05;

    uniforms.uGlitch.value = performance.now() < glitchUntil ? 1 : 0;
    renderer.render(scene, camera);
  }

  if (reduceMotion) {
    // single static frame; re-render on resize/scroll only
    const draw = () => { uniforms.uScroll.value = scrollT; frame(); };
    draw();
    addEventListener('resize', draw); addEventListener('scroll', draw, { passive: true });
  } else {
    renderer.setAnimationLoop(frame);
  }

  return {
    glitch,
    reveal() { revealStart = clock.elapsedTime; },
  };
}

/* ------------------------------------------------- DOM micro-interactions -- */
function initRoleTyper() {
  const el = $('#role');
  const roles = ['mechatronics engineer', 'media buyer', 'founder @ WenshPro', 'security researcher', 'e-commerce operator', 'console technician'];
  if (reduceMotion) return;
  let r = 0, i = roles[0].length, deleting = true;
  const tick = () => {
    const word = roles[r];
    if (deleting) {
      i--; el.textContent = word.slice(0, i);
      if (i <= 0) { deleting = false; r = (r + 1) % roles.length; }
      setTimeout(tick, 32);
    } else {
      const w = roles[r]; i++; el.textContent = w.slice(0, i);
      if (i >= w.length) { deleting = true; setTimeout(tick, 1900); } else setTimeout(tick, 55 + Math.random() * 50);
    }
  };
  setTimeout(tick, 2600);
}

function initReveal(stage) {
  const items = $$('.section__head, .whoami > *, .log__item, .edu, .module, .project, .cert, .contact__big, .contact__list');
  items.forEach((el) => el.classList.add('reveal'));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const siblings = [...el.parentElement.children].filter((c) => c.classList.contains('reveal'));
      el.style.transitionDelay = `${Math.min(siblings.indexOf(el), 5) * 70}ms`;
      el.classList.add('in');
      if (el.classList.contains('section__head')) {
        stage.glitch(140);
        countUp(el.parentElement);
      }
      io.unobserve(el);
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
  items.forEach((el) => io.observe(el));
}

function countUp(scope) {
  $$('[data-count]', scope).forEach((b) => {
    const end = +b.dataset.count, suf = b.dataset.suffix || '';
    if (reduceMotion) return;
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / 900);
      b.textContent = Math.round(end * (1 - Math.pow(1 - p, 3))) + suf;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

function initTilt() {
  if (!finePointer || reduceMotion) return;
  $$('.tilt').forEach((el) => {
    let raf = 0;
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.setProperty('--ry', `${(px - 0.5) * 7}deg`);
        el.style.setProperty('--rx', `${(0.5 - py) * 6}deg`);
        el.style.setProperty('--mx', `${px * 100}%`);
        el.style.setProperty('--my', `${py * 100}%`);
      });
    });
    el.addEventListener('pointerleave', () => {
      el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg');
    });
  });
}

function initNav() {
  const nav = $('.nav'), toggle = $('.nav__toggle');
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', open);
    toggle.textContent = open ? 'close' : 'menu';
  });
  $$('.nav__links a').forEach((a) => a.addEventListener('click', () => {
    nav.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); toggle.textContent = 'menu';
  }));
  const links = new Map($$('.nav__links a').map((a) => [a.getAttribute('href').slice(1), a]));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const a = links.get(e.target.id);
      if (!a) return;
      if (e.isIntersecting) { links.forEach((l) => l.removeAttribute('aria-current')); a.setAttribute('aria-current', 'true'); }
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('main section[id]').forEach((s) => io.observe(s));
}

function initCopy() {
  const status = $('.sr-status');
  $$('.copy').forEach((btn) => btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(btn.dataset.copy);
      btn.textContent = 'copied ✓'; status.textContent = 'Email address copied to clipboard';
    } catch (_) {
      btn.textContent = 'press ⌘/Ctrl+C'; status.textContent = 'Copy failed, select the address manually';
    }
    setTimeout(() => { btn.textContent = 'copy'; }, 1800);
  }));
}

function domGlitch(el) {
  if (reduceMotion || !el) return;
  el.classList.add('is-glitching');
  setTimeout(() => el.classList.remove('is-glitching'), 800);
}

/* ------------------------------------------------------------------ Go -- */
(async () => {
  initNav(); initCopy(); initTilt();
  const proxy = { impl: null, glitch(ms) { this.impl && this.impl.glitch(ms); } };
  initReveal(proxy);
  const [stage] = await Promise.all([initStage(), runBoot()]);
  proxy.impl = stage;
  stage.reveal();
  stage.glitch(260);
  domGlitch($('.hero h1'));
  initRoleTyper();
  if (!reduceMotion) {
    const pulse = () => { domGlitch($('.hero h1')); setTimeout(pulse, 6000 + Math.random() * 5000); };
    setTimeout(pulse, 6000);
  }
})();
