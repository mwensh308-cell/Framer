// Mostafa Nasser — CV site runtime
// Hero: Three.js shader "inspection core" + particles. UI: reveals, tilt, magnetic, counters.
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(pointer: fine)').matches;
const loader = document.querySelector('.loader');
const loaderBar = loader && loader.querySelector('.bar i');

function setLoad(p) { if (loaderBar) loaderBar.style.width = (p * 100) + '%'; }
setLoad(0.2);

/* ------------------------------------------------------------------ */
/* HERO 3D                                                             */
/* ------------------------------------------------------------------ */
const NOISE = /* glsl */`
vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);
  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
  float n_=.142857142857;vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);
  vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;
  return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

const blobVert = /* glsl */`
uniform float uTime; uniform vec2 uMouse; uniform float uAmp;
varying vec3 vNormal; varying vec3 vPos; varying float vNoise; varying vec3 vView;
${NOISE}
void main(){
  vec3 p = position;
  float n = snoise(p*1.15 + vec3(uTime*.18, uTime*.12, 0.));
  float n2 = snoise(p*3.2 - uTime*.25)*.25;
  float m = smoothstep(1.6, 0., distance(normalize(p).xy, uMouse*1.2))*.25;
  float d = (n + n2) * uAmp + m;
  p += normal * d;
  vNoise = d;
  vec4 wp = modelMatrix * vec4(p,1.);
  vPos = wp.xyz;
  vNormal = normalize(normalMatrix * normal);
  vec4 mv = viewMatrix * wp;
  vView = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;

const blobFrag = /* glsl */`
uniform float uTime; uniform float uScan; uniform vec3 cA; uniform vec3 cB; uniform vec3 cC;
varying vec3 vNormal; varying vec3 vPos; varying float vNoise; varying vec3 vView;
void main(){
  float fres = pow(1. - max(dot(vNormal, vView), 0.), 2.2);
  vec3 base = mix(cC, cA, smoothstep(.08, .38, vNoise));
  vec3 col = base * (.25 + .6*fres) + cB * pow(fres, 3.) * .7;
  // contour lines (topographic inspection feel)
  float lines = abs(fract(vPos.y*9. + vNoise*3.) - .5);
  col += cB * smoothstep(.07, .0, lines) * .35 * (1.-fres);
  // laser scan band sweeping vertically
  float band = exp(-pow((vPos.y - uScan)*9., 2.));
  col += cB * band * 1.2;
  col += vec3(1.) * band * .25 * fres;
  gl_FragColor = vec4(col, 1.);
}`;

async function initHero() {
  const canvas = document.getElementById('gl');
  if (!canvas) return;
  let THREE;
  try {
    const t = document.createElement('canvas');
    if (!(t.getContext('webgl2') || t.getContext('webgl'))) throw new Error('no webgl');
    THREE = await import('three');
  } catch (e) {
    canvas.style.background = 'radial-gradient(60% 60% at 70% 40%, rgba(255,106,43,.25), transparent 70%), radial-gradient(40% 40% at 30% 70%, rgba(95,211,196,.15), transparent 70%)';
    return;
  }
  setLoad(0.6);

  const small = innerWidth < 720;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !small, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, small ? 1.5 : 1.75));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 8);

  const uniforms = {
    uTime: { value: 0 }, uMouse: { value: new THREE.Vector2() }, uAmp: { value: 0.2 }, uScan: { value: 0 },
    cA: { value: new THREE.Color('#FF6A2B') }, cB: { value: new THREE.Color('#5FD3C4') }, cC: { value: new THREE.Color('#1B1E22') },
  };
  const blob = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.0, small ? 28 : 56),
    new THREE.ShaderMaterial({ vertexShader: blobVert, fragmentShader: blobFrag, uniforms })
  );
  const group = new THREE.Group();
  group.add(blob);

  // Orbit rings — reads as gear / sensor gimbal
  const ringMat = new THREE.LineBasicMaterial({ color: 0x2A2E33, transparent: true, opacity: 0.9 });
  const ringMat2 = new THREE.LineBasicMaterial({ color: 0xFF6A2B, transparent: true, opacity: 0.55 });
  const mkRing = (r, mat, seg = 160, dash = 0) => {
    const pts = [];
    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    return dash ? new THREE.LineSegments(geo, mat) : new THREE.Line(geo, mat);
  };
  const r1 = mkRing(1.55, ringMat); r1.rotation.x = 1.2;
  const r2 = mkRing(1.75, ringMat2, 72, 1); r2.rotation.set(1.35, 0.4, 0);
  const r3 = mkRing(2.0, ringMat, 200); r3.rotation.set(0.3, 1.1, 0);
  group.add(r1, r2, r3);
  scene.add(group);

  // Particles (dust in the inspection booth)
  const N = small ? 500 : 1400;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 16;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 10;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 8 - 2;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0xECE7DD, size: 0.018, transparent: true, opacity: 0.55, depthWrite: false }));
  scene.add(pts);

  function layout() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // place the core on the right on wide screens, top-center on phones
    const aspect = w / h;
    if (w > 860) { group.position.set(Math.min(2.3, aspect * 1.45), 0.2, 0); group.scale.setScalar(1); }
    else { group.position.set(0.5, 1.45, 0); group.scale.setScalar(0.62); }
  }
  layout();
  addEventListener('resize', layout, { passive: true });

  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  if (finePointer) addEventListener('pointermove', (e) => {
    mouse.tx = (e.clientX / innerWidth) * 2 - 1;
    mouse.ty = -(e.clientY / innerHeight) * 2 + 1;
  }, { passive: true });

  let scrollP = 0;
  addEventListener('scroll', () => { scrollP = Math.min(scrollY / innerHeight, 1.2); }, { passive: true });

  const hud = document.getElementById('hud-scan');
  let visible = true, running = false, last = performance.now(), t = 0, scans = 0, lastScanSign = 0;
  const clock = () => {
    if (!visible || document.hidden) { running = false; return; }
    running = true;
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    t += dt;
    mouse.x += (mouse.tx - mouse.x) * 0.06;
    mouse.y += (mouse.ty - mouse.y) * 0.06;
    uniforms.uTime.value = t;
    uniforms.uMouse.value.set(mouse.x, mouse.y);
    const s = Math.sin(t * 0.9);
    uniforms.uScan.value = group.position.y + s * 1.25 * group.scale.x;
    const sign = Math.sign(s);
    if (sign > 0 && lastScanSign < 0 && hud) hud.textContent = String(++scans).padStart(3, '0');
    lastScanSign = sign;

    blob.rotation.y = t * 0.12 + mouse.x * 0.35;
    blob.rotation.x = mouse.y * 0.25;
    r1.rotation.z = t * 0.25; r2.rotation.z = -t * 0.4; r3.rotation.z = t * 0.15;
    pts.rotation.y = t * 0.015 + mouse.x * 0.05;
    // scroll: core rises and recedes, amplitude calms
    group.rotation.x = scrollP * 0.6;
    camera.position.z = 8 + scrollP * 3;
    camera.position.y = scrollP * 1.2;
    uniforms.uAmp.value = 0.2 - scrollP * 0.1;
    renderer.render(scene, camera);
    requestAnimationFrame(clock);
  };
  const start = () => { if (!running) { last = performance.now(); requestAnimationFrame(clock); } };

  if (reduce) {
    // Single still frame; no continuous motion.
    uniforms.uTime.value = 3.0; uniforms.uScan.value = group.position.y + 0.4;
    renderer.render(scene, camera);
  } else {
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); }).observe(canvas);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) start(); });
    start();
  }
}

/* ------------------------------------------------------------------ */
/* INTRO TIMELINE                                                      */
/* ------------------------------------------------------------------ */
function intro() {
  setLoad(1);
  setTimeout(() => loader && loader.classList.add('done'), reduce ? 0 : 250);
  const g = window.gsap;
  if (!g || reduce) return;
  const tl = g.timeline({ defaults: { ease: 'expo.out' }, delay: 0.3 });
  tl.from('#gl', { opacity: 0, duration: 1.6 }, 0)
    .from('h1 .line > span', { yPercent: 110, duration: 1.2, stagger: 0.12 }, 0.15)
    .from('.kicker', { y: 16, opacity: 0, duration: 0.8 }, 0.45)
    .from('.ar', { y: 16, opacity: 0, duration: 0.8 }, 0.6)
    .from('.hero-meta p', { y: 16, opacity: 0, duration: 0.8 }, 0.7)
    .from('.roles .chip', { y: 14, opacity: 0, duration: 0.6, stagger: 0.06 }, 0.8)
    .from('.nav', { y: -20, opacity: 0, duration: 0.8 }, 0.9)
    .from('.hud, .scroll-cue', { opacity: 0, duration: 1 }, 1.1);
}

/* ------------------------------------------------------------------ */
/* UI MICRO-INTERACTIONS                                               */
/* ------------------------------------------------------------------ */
function ui() {
  // Reveal on scroll
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
  document.querySelectorAll('.reveal').forEach((el, i) => {
    el.style.transitionDelay = ((i % 3) * 80) + 'ms';
    io.observe(el);
  });

  // Nav state + active link
  const nav = document.getElementById('nav');
  const onScroll = () => nav.classList.toggle('scrolled', scrollY > 40);
  onScroll(); addEventListener('scroll', onScroll, { passive: true });
  const links = [...document.querySelectorAll('.nav ul a')];
  const secIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      links.forEach((a) => {
        if (a.getAttribute('href') === '#' + e.target.id) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  document.querySelectorAll('main section[id]').forEach((s) => secIO.observe(s));

  // Counters
  const cIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target, end = +el.dataset.count, suf = el.dataset.suffix || '';
      cIO.unobserve(el);
      if (reduce) return;
      const t0 = performance.now();
      const step = (now) => {
        const p = Math.min((now - t0) / 1200, 1);
        el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3))) + suf;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }, { threshold: 0.6 });
  document.querySelectorAll('[data-count]').forEach((el) => cIO.observe(el));

  // Polaroid: auto-scan once when it enters view
  const pol = document.getElementById('polaroid');
  if (pol) {
    new IntersectionObserver(([e], o) => {
      if (e.isIntersecting && !reduce) { pol.classList.add('scanning'); setTimeout(() => pol.classList.remove('scanning'), 1700); o.disconnect(); }
    }, { threshold: 0.6 }).observe(pol);
  }

  if (!finePointer || reduce) return;

  // 3D tilt (cards + polaroid) with pointer-tracked glow
  const tilt = (el, max, base = '') => {
    let raf = 0;
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.transform = `${base} rotateY(${(x - 0.5) * max}deg) rotateX(${(0.5 - y) * max}deg)`;
        el.style.setProperty('--mx', x * 100 + '%'); el.style.setProperty('--my', y * 100 + '%');
        el.style.setProperty('--gx', x * 100 + '%'); el.style.setProperty('--gy', y * 100 + '%');
      });
    });
    el.addEventListener('pointerleave', () => { cancelAnimationFrame(raf); el.style.transform = ''; });
  };
  document.querySelectorAll('.tilt').forEach((el) => tilt(el, 6, 'perspective(1000px)'));
  if (pol) tilt(pol, 14, 'rotate(-1deg)');

  // Magnetic buttons
  document.querySelectorAll('.magnetic').forEach((b) => {
    b.addEventListener('pointermove', (e) => {
      const r = b.getBoundingClientRect();
      b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.25}px, ${(e.clientY - r.top - r.height / 2) * 0.35}px)`;
    });
    b.addEventListener('pointerleave', () => { b.style.transform = ''; });
  });
}

ui();
initHero().finally(() => {
  if (document.readyState === 'complete') intro();
  else addEventListener('load', intro, { once: true });
});
// Safety: never trap the user behind the loader.
setTimeout(() => loader && loader.classList.add('done'), 4000);
