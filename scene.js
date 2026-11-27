// Scène unique : des milliers de perles qui changent de forme au fil du défilement.
// 0 « 555 »  →  1 la baie (vague)  →  2 faisceaux laser  →  3 poussière (plan des tables)  →  4 « 2027 »
import * as THREE from "three";

const root = document.documentElement;
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const header = document.getElementById("top");

// en-tête opaque après le hero
const onScrollHeader = () => header.classList.toggle("is-solid", scrollY > innerHeight * 0.6);
addEventListener("scroll", onScrollHeader, { passive: true });
onScrollHeader();

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch { return false; }
}

if (!hasWebGL()) {
  root.classList.add("no-webgl");
  requestAnimationFrame(() => document.body.classList.add("is-ready"));
} else {
  init().catch((err) => {
    console.warn("Scène désactivée :", err);
    root.classList.add("no-webgl");
    document.body.classList.add("is-ready");
  });
}

async function init() {
  const canvas = document.getElementById("scene");
  const small = matchMedia("(max-width: 760px)").matches;
  // mobile : le texte est réduit, donc moins de perles pour garder la même densité
  const N = small ? 7000 : 24000;

  // police chargée avant d'échantillonner les chiffres
  try {
    await Promise.race([
      document.fonts.load('700 200px "Unbounded"'),
      new Promise((r) => setTimeout(r, 1800)),
    ]);
  } catch { /* police de secours */ }

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: "high-performance" });
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  const group = new THREE.Group();
  scene.add(group);

  // ---------- formes ----------
  const rand = mulberry(555);
  const s0 = sampleText("555", N, 6.4, rand);
  const s1 = makeBay(N, rand);
  const s2 = makeLasers(N, rand, small); // mobile : moins de faisceaux, plus épais
  const s3 = makeDust(N, rand);
  const s4 = sampleText("2027", N, 7.2, rand);
  // « 2027 » est placé dans #slot2027 à chaque image (voir frame)
  const slot = document.getElementById("slot2027");
  const slot0 = document.getElementById("slot555"); // visible sur mobile seulement

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(s0, 3));
  geo.setAttribute("aS1", new THREE.BufferAttribute(s1, 3));
  geo.setAttribute("aS2", new THREE.BufferAttribute(s2, 3));
  geo.setAttribute("aS3", new THREE.BufferAttribute(s3, 3));
  geo.setAttribute("aS4", new THREE.BufferAttribute(s4, 3));

  const aRand = new Float32Array(N);
  const aJit = new Float32Array(N * 3);
  const aSize = new Float32Array(N);
  const aTone = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    aRand[i] = rand();
    const th = rand() * Math.PI * 2, ph = Math.acos(2 * rand() - 1), r = Math.cbrt(rand());
    aJit[i * 3] = Math.sin(ph) * Math.cos(th) * r;
    aJit[i * 3 + 1] = Math.sin(ph) * Math.sin(th) * r;
    aJit[i * 3 + 2] = Math.cos(ph) * r;
    const big = rand() < 0.025;
    aSize[i] = big ? 2.6 + rand() * 1.6 : 0.55 + rand() * 0.9;
    aTone[i] = rand();
  }
  geo.setAttribute("aRand", new THREE.BufferAttribute(aRand, 1));
  geo.setAttribute("aJit", new THREE.BufferAttribute(aJit, 3));
  geo.setAttribute("aSize", new THREE.BufferAttribute(aSize, 1));
  geo.setAttribute("aTone", new THREE.BufferAttribute(aTone, 1));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 30);

  const uniforms = {
    uTime: { value: 0 },
    uStage: { value: 0 },
    uIntro: { value: reduce ? 1 : 0 },
    uDrift: { value: reduce ? 0 : 1 },
    uMouse: { value: new THREE.Vector2(99, 99) },
    uRepel: { value: 0 },
    uPR: { value: 1 },
    uSizeK: { value: 26 },
    uBeamK: { value: small ? 1 : 0 },
  };

  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute vec3 aS1; attribute vec3 aS2; attribute vec3 aS3; attribute vec3 aS4;
      attribute float aRand; attribute vec3 aJit; attribute float aSize; attribute float aTone;
      uniform float uTime, uStage, uIntro, uDrift, uRepel, uPR, uSizeK, uBeamK;
      uniform vec2 uMouse;
      varying vec3 vColor; varying float vAlpha;

      float ease(float t){ return t*t*(3.0-2.0*t); }
      float seg(float k){ return ease(clamp((uStage-(k-1.0))*1.35 - aRand*0.35, 0.0, 1.0)); }

      void main(){
        float t1 = seg(1.0), t2 = seg(2.0), t3 = seg(3.0), t4 = seg(4.0);
        vec3 p = position;
        p = mix(p, aS1, t1);
        p = mix(p, aS2, t2);
        p = mix(p, aS3, t3);
        p = mix(p, aS4, t4);

        float w1 = t1*(1.0-t2);   // baie
        float w2 = t2*(1.0-t3);   // lasers
        float w3 = t3*(1.0-t4);   // poussière
        float w4 = t4;            // 2027

        // houle de la baie
        p.y += w1 * 0.22 * sin(p.x*1.4 + uTime*0.9) * cos(p.z*1.1 + uTime*0.55);
        // balayage des faisceaux autour de leur source
        float ang = w2 * 0.16 * sin(uTime*0.45 + aRand*0.6);
        vec2 o = vec2(0.0, -2.6);
        vec2 q = p.xy - o;
        p.xy = o + mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * q;

        // dispersion pendant les transitions + ouverture
        float f = fract(uStage);
        float scatter = sin(3.14159*f) * 1.1 + (1.0-uIntro) * 7.0;
        p += aJit * scatter;

        // dérive au repos
        p += uDrift * 0.035 * vec3(sin(uTime*0.7 + aRand*40.0), cos(uTime*0.6 + aRand*31.0), sin(uTime*0.5 + aRand*17.0));

        vec4 wp = modelMatrix * vec4(p, 1.0);
        // le curseur écarte les perles
        vec2 d = wp.xy - uMouse;
        float dist = length(d);
        wp.xy += (d / max(dist, 0.001)) * uRepel * 0.55 * smoothstep(1.3, 0.0, dist);

        vec4 mv = viewMatrix * wp;
        gl_Position = projectionMatrix * mv;

        float tw = 0.7 + 0.6 * pow(abs(sin(uTime*(0.8 + aRand*2.4) + aRand*60.0)), 6.0);
        gl_PointSize = aSize * tw * uPR * uSizeK / -mv.z * (1.0 + 0.9 * uBeamK * w2);

        vec3 gold = vec3(0.92, 0.68, 0.26);
        vec3 silver = vec3(0.78, 0.81, 0.90);
        vec3 pearl = vec3(1.0, 0.97, 0.92);
        vec3 c = mix(silver, gold, smoothstep(0.35, 0.75, aTone));
        c = mix(c, pearl, step(0.93, aTone));
        c = mix(c, vec3(0.45, 0.75, 1.0), w2 * 0.55 * step(0.4, aTone));   // faisceaux bleutés
        c = mix(c, gold, w4 * 0.55);
        vColor = c;
        vAlpha = (0.7 + 0.5*aRand) * (1.0 - 0.6*w3) * (1.0 - 0.35*w2*(1.0 - uBeamK)) * uIntro;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vColor; varying float vAlpha;
      void main(){
        vec2 c = gl_PointCoord - 0.5;
        float d = length(c);
        if (d > 0.5) discard;
        float core = smoothstep(0.5, 0.0, d);
        float a = pow(core, 1.7) * vAlpha;
        gl_FragColor = vec4(vColor * (0.65 + 0.6*pow(core, 6.0)), a);
      }
    `,
  });

  const points = new THREE.Points(geo, mat);
  group.add(points);

  // ---------- caméra par étape ----------
  const CAM = [
    { z: 11.5, y: 0.0, yaw: 0.0, x: 0.0 },     // 555
    { z: 9.5, y: 1.9, yaw: 0.32, x: 0.0 },     // baie
    { z: 10.5, y: 0.2, yaw: -0.22, x: 2.6 },   // lasers
    { z: 12.0, y: 0.0, yaw: 0.08, x: 0.0 },    // poussière
    { z: 11.0, y: 0.6, yaw: 0.0, x: 0.0 },     // 2027
  ];

  // ---------- étapes liées aux sections ----------
  let anchors = [];
  function measure() {
    const secs = [...document.querySelectorAll("[data-stage]")];
    anchors = secs.map((s, i) => {
      const r = s.getBoundingClientRect();
      const top = r.top + scrollY;
      const at = i === 0 ? 0 : top + Math.min(r.height, innerHeight * 1.2) * 0.5 - innerHeight * 0.5;
      return { at, stage: +s.dataset.stage };
    });
    // la dernière section garde « 2027 » jusqu'en bas
    anchors.sort((a, b) => a.at - b.at);
  }
  function targetStage() {
    const y = scrollY;
    if (!anchors.length) return 0;
    if (y <= anchors[0].at) return anchors[0].stage;
    for (let i = 0; i < anchors.length - 1; i++) {
      const a = anchors[i], b = anchors[i + 1];
      if (y < b.at) {
        let t = (y - a.at) / Math.max(1, b.at - a.at);
        t = Math.min(1, Math.max(0, (t - 0.2) / 0.6));
        return a.stage + (b.stage - a.stage) * t;
      }
    }
    return anchors[anchors.length - 1].stage;
  }

  // ---------- taille ----------
  let scaleK = 1, scale4 = 1, aspect = 1;
  // largeur visible (unités monde) sur le plan z = 0 à une distance donnée
  const visW = (dist) => 2 * dist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * aspect;
  function resize() {
    const w = innerWidth, h = innerHeight;
    const pr = Math.min(devicePixelRatio || 1, small ? 1.5 : 1.75);
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    aspect = w / h;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    uniforms.uPR.value = pr;
    if (w <= 760) {
      // mobile : « 555 » occupe ~92 % de la largeur, « 2027 » ~88 %
      scaleK = Math.min(1, (0.92 * visW(CAM[0].z)) / (6.4 * 0.92));
      scale4 = Math.min(1, (0.88 * visW(CAM[4].z)) / (7.2 * 0.92));
    } else {
      scaleK = scale4 = Math.min(1, Math.max(0.42, aspect / 1.55));
    }
    measure();
  }
  addEventListener("resize", resize);
  resize();
  // la mise en page bouge quand les images arrivent
  addEventListener("load", measure);
  new ResizeObserver(() => measure()).observe(document.body);

  // ---------- souris ----------
  const ndc = new THREE.Vector2(99, 99);
  let pointerActive = false;
  if (!reduce) {
    addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
      pointerActive = true;
    }, { passive: true });
    document.addEventListener("pointerleave", () => { pointerActive = false; });
  }
  const ray = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const hit = new THREE.Vector3();
  const slotNdc = new THREE.Vector2();
  // position monde (y, plan z = 0) du centre d'un emplacement HTML
  function slotWorldY(el) {
    const r = el.getBoundingClientRect();
    const cy = Math.min(innerHeight * 1.5, Math.max(-innerHeight * 0.5, r.top + r.height * 0.5));
    ray.setFromCamera(slotNdc.set(0, -(cy / innerHeight) * 2 + 1), camera);
    return ray.ray.intersectPlane(plane, hit) ? hit.y : 0;
  }

  // ---------- boucle ----------
  let stage = targetStage();
  uniforms.uStage.value = stage;
  let running = true;
  let last = performance.now();
  const t0 = last;
  const introDur = 2600;

  document.addEventListener("visibilitychange", () => {
    running = !document.hidden;
    if (running) { last = performance.now(); requestAnimationFrame(frame); }
  });

  requestAnimationFrame(() => document.body.classList.add("is-ready"));

  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    if (!reduce) {
      const k = Math.min(1, (now - t0) / introDur);
      uniforms.uIntro.value = 1 - Math.pow(1 - k, 3);
      uniforms.uTime.value += dt;
    }

    const target = targetStage();
    stage += (target - stage) * (1 - Math.exp(-dt * (reduce ? 12 : 3.2)));
    if (Math.abs(target - stage) < 0.0005) stage = target;
    uniforms.uStage.value = stage;

    // caméra : interpolation entre étapes, plongée pendant la transition
    const i = Math.min(CAM.length - 2, Math.floor(stage));
    const f = Math.min(1, Math.max(0, stage - i));
    const e = f * f * (3 - 2 * f);
    const A = CAM[i], B = CAM[i + 1];
    const dive = reduce ? 0 : Math.sin(Math.PI * f) * 2.4;
    const z = (A.z + (B.z - A.z) * e - dive);
    const yaw = A.yaw + (B.yaw - A.yaw) * e;
    const y = A.y + (B.y - A.y) * e;
    const offX = (A.x + (B.x - A.x) * e) * (aspect > 1.1 ? 1 : 0);
    camera.position.set(Math.sin(yaw) * z, y, Math.cos(yaw) * z);
    camera.lookAt(0, y * 0.35, 0);
    group.position.x = offX;
    camera.updateMatrixWorld();

    // « 2027 » suit l'emplacement réservé au-dessus du compte à rebours
    const w4 = Math.min(1, Math.max(0, stage - 3));
    // il défile avec la page comme un vrai élément : jamais par-dessus le texte
    const e4 = w4 * w4 * (3 - 2 * w4);
    // mobile : « 555 » suit de même son emplacement entre le titre et le bas du hero
    const w0 = 1 - Math.min(1, Math.max(0, stage));
    const e0 = w0 * w0 * (3 - 2 * w0);
    const y4 = w4 > 0 ? slotWorldY(slot) : 0;
    const y0 = w0 > 0 && slot0 && slot0.offsetHeight > 0 ? slotWorldY(slot0) : 0;
    group.position.y = y0 * e0 + y4 * e4;
    const sc = scaleK + (scale4 - scaleK) * e4;
    group.scale.setScalar(sc);
    // taille des perles proportionnelle au texte, sinon elles se fondent en tache blanche
    uniforms.uSizeK.value = 44 * Math.max(0.5, sc);

    // répulsion
    const targetRepel = pointerActive ? 1 : 0;
    uniforms.uRepel.value += (targetRepel - uniforms.uRepel.value) * (1 - Math.exp(-dt * 4));
    if (pointerActive) {
      ray.setFromCamera(ndc, camera);
      if (ray.ray.intersectPlane(plane, hit)) uniforms.uMouse.value.set(hit.x, hit.y);
    }

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// ---------- générateurs ----------
function mulberry(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sampleText(text, N, worldW, rand) {
  const W = 1200, H = 520;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  let size = 420;
  const font = (s) => `700 ${s}px "Unbounded", "Arial Black", sans-serif`;
  ctx.font = font(size);
  const mw = ctx.measureText(text).width;
  size = Math.floor(size * Math.min(1, (W * 0.92) / mw));
  ctx.font = font(size);
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, W / 2, H / 2 + size * 0.04);
  const data = ctx.getImageData(0, 0, W, H).data;
  const pts = [];
  for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) if (data[(y * W + x) * 4 + 3] > 128) pts.push(x, y);
  const out = new Float32Array(N * 3);
  const unit = worldW / W;
  const count = pts.length / 2;
  for (let i = 0; i < N; i++) {
    const k = Math.floor(rand() * count) * 2;
    out[i * 3] = (pts[k] - W / 2 + (rand() - 0.5) * 3) * unit;
    out[i * 3 + 1] = -(pts[k + 1] - H / 2 + (rand() - 0.5) * 3) * unit;
    out[i * 3 + 2] = (rand() - 0.5) * 0.5;
  }
  return out;
}

function makeBay(N, rand) {
  const out = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const x = (rand() - 0.5) * 18;
    const z = -9 + rand() * 12;
    const y = -1.5 + 0.28 * Math.sin(x * 0.9) + 0.22 * Math.cos(z * 1.3 + x * 0.4);
    out[i * 3] = x; out[i * 3 + 1] = y; out[i * 3 + 2] = z;
  }
  return out;
}

function makeLasers(N, rand, small) {
  const out = new Float32Array(N * 3);
  const beams = small ? 10 : 22;
  const dirs = [];
  for (let b = 0; b < beams; b++) {
    const a = (-68 + (136 * b) / (beams - 1)) * (Math.PI / 180) + (rand() - 0.5) * 0.05;
    dirs.push([Math.sin(a), Math.cos(a), (rand() - 0.5) * 0.7]);
  }
  for (let i = 0; i < N; i++) {
    const d = dirs[Math.floor(rand() * beams)];
    const len = Math.pow(rand(), 0.8) * 7.5;
    const spread = (0.025 + len * 0.012) * (small ? 2.2 : 1);
    out[i * 3] = d[0] * len + (rand() - 0.5) * spread;
    out[i * 3 + 1] = -2.6 + d[1] * len + (rand() - 0.5) * spread;
    out[i * 3 + 2] = d[2] * len + (rand() - 0.5) * spread;
  }
  return out;
}

function makeDust(N, rand) {
  const out = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    out[i * 3] = (rand() - 0.5) * 22;
    out[i * 3 + 1] = (rand() - 0.5) * 12;
    out[i * 3 + 2] = -10 + rand() * 12;
  }
  return out;
}
