import * as THREE from "three";

export type Sample = {
  x: number;
  y: number;
  z: number;
  tx: number;
  ty: number;
  tz: number;
  rx: number;
  rz: number;
  u: number;
  dist: number;
  heading: number;
};

export type Decor = { x: number; y: number; z: number; s: number; h: number; rot: number };

export type Track = {
  id: string;
  name: string;
  subtitle: string;
  time: "day" | "dusk" | "night";
  prop: "harbor" | "canyon" | "alps";
  asphalt: string;
  line: string;
  shoulder: string;
  ground: string;
  barrier: string;
  mountain: string;
  lamp: string;
  water: string;
  waterRadius: number;
  halfWidth: number;
  shoulderW: number;
  cruise: number;
  length: number;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  samples: Sample[];
  road: THREE.BufferGeometry;
  shoulderGeo: THREE.BufferGeometry;
  kerbGeo: THREE.BufferGeometry;
  wallGeo: THREE.BufferGeometry;
  pads: THREE.BufferGeometry[];
  startLine: THREE.BufferGeometry;
  trees: Decor[];
  lamps: Decor[];
  rocks: Decor[];
  chevrons: Decor[];
  mountains: Decor[];
};

type Def = {
  id: string;
  name: string;
  subtitle: string;
  time: Track["time"];
  prop: Track["prop"];
  asphalt: string;
  line: string;
  shoulder: string;
  ground: string;
  barrier: string;
  mountain: string;
  lamp: string;
  water: string;
  waterRadius: number;
  rx: number;
  rz: number;
  wobble: number;
  elev: number;
  halfWidth: number;
  shoulderW: number;
  cruise: number;
  seed: number;
};

const DEFS: Def[] = [
  {
    id: "harbor",
    name: "Harbor Nocturne",
    subtitle: "Dock lights, long arcs, one committed hairpin.",
    time: "night",
    prop: "harbor",
    asphalt: "#2a2e33",
    line: "#f3ede4",
    shoulder: "#1c2420",
    ground: "#121816",
    barrier: "#242b32",
    mountain: "#141c24",
    lamp: "#f0d7a2",
    water: "#163e48",
    waterRadius: 130,
    rx: 280,
    rz: 172,
    wobble: 24,
    elev: 6,
    halfWidth: 8,
    shoulderW: 4.6,
    cruise: 52,
    seed: 11,
  },
  {
    id: "gulch",
    name: "Redline Gulch",
    subtitle: "Tight, steep, and unforgiving on exit.",
    time: "dusk",
    prop: "canyon",
    asphalt: "#3a332e",
    line: "#f0d7a2",
    shoulder: "#4a3428",
    ground: "#3a2a22",
    barrier: "#5c4034",
    mountain: "#4a3228",
    lamp: "#ffb27a",
    water: "#000000",
    waterRadius: 0,
    rx: 206,
    rz: 132,
    wobble: 30,
    elev: 15,
    halfWidth: 6.5,
    shoulderW: 3.2,
    cruise: 45,
    seed: 29,
  },
  {
    id: "meridian",
    name: "Glass Meridian",
    subtitle: "High alpine. Flow first, bravery second.",
    time: "day",
    prop: "alps",
    asphalt: "#4a5156",
    line: "#f3ede4",
    shoulder: "#c5cfc8",
    ground: "#d5ddd8",
    barrier: "#b7c2bc",
    mountain: "#9aada8",
    lamp: "#fff6e8",
    water: "#8aa4ae",
    waterRadius: 90,
    rx: 330,
    rz: 200,
    wobble: 16,
    elev: 9,
    halfWidth: 9,
    shoulderW: 5.2,
    cruise: 56,
    seed: 47,
  },
  {
    id: "breakwater",
    name: "Breakwater",
    subtitle: "Shorter quay. Rhythm corners, late apex.",
    time: "night",
    prop: "harbor",
    asphalt: "#262b30",
    line: "#f3ede4",
    shoulder: "#18201e",
    ground: "#101614",
    barrier: "#222a30",
    mountain: "#121a22",
    lamp: "#f0d7a2",
    water: "#143848",
    waterRadius: 100,
    rx: 248,
    rz: 148,
    wobble: 36,
    elev: 4.5,
    halfWidth: 7.2,
    shoulderW: 3.6,
    cruise: 49,
    seed: 71,
  },
  {
    id: "spine",
    name: "Copper Spine",
    subtitle: "A valley that keeps turning.",
    time: "dusk",
    prop: "canyon",
    asphalt: "#3c342c",
    line: "#f0d7a2",
    shoulder: "#533c2e",
    ground: "#3d2c24",
    barrier: "#624436",
    mountain: "#55362c",
    lamp: "#ffb27a",
    water: "#000000",
    waterRadius: 0,
    rx: 236,
    rz: 118,
    wobble: 18,
    elev: 17,
    halfWidth: 6.8,
    shoulderW: 3.3,
    cruise: 47,
    seed: 83,
  },
  {
    id: "alto",
    name: "Alto Run",
    subtitle: "The fast one. Don't lift unless you mean it.",
    time: "day",
    prop: "alps",
    asphalt: "#454c52",
    line: "#f3ede4",
    shoulder: "#c9d2cc",
    ground: "#d8e0db",
    barrier: "#b4c0ba",
    mountain: "#a8bab4",
    lamp: "#fff6e8",
    water: "#93b0ba",
    waterRadius: 70,
    rx: 360,
    rz: 214,
    wobble: 12,
    elev: 5.5,
    halfWidth: 10,
    shoulderW: 5.6,
    cruise: 60,
    seed: 97,
  },
  {
    id: "monaco",
    name: "Monaco Circuit",
    subtitle: "Tight streets, harbor walls, no margin for error.",
    time: "dusk",
    prop: "harbor",
    asphalt: "#2c3036",
    line: "#f3ede4",
    shoulder: "#1a2220",
    ground: "#14181c",
    barrier: "#2a323c",
    mountain: "#161e28",
    lamp: "#ffd9a0",
    water: "#1a4a5a",
    waterRadius: 110,
    rx: 168,
    rz: 98,
    wobble: 42,
    elev: 3.5,
    halfWidth: 5.8,
    shoulderW: 2.4,
    cruise: 42,
    seed: 113,
  },
  {
    id: "nurburg",
    name: "Nordschleife",
    subtitle: "Long, blind, and green. The green hell.",
    time: "day",
    prop: "alps",
    asphalt: "#3e464c",
    line: "#f0f0ea",
    shoulder: "#6a7a68",
    ground: "#3a4a3c",
    barrier: "#5a6a5c",
    mountain: "#4a5a4c",
    lamp: "#fff8e8",
    water: "#4a6a7a",
    waterRadius: 40,
    rx: 420,
    rz: 280,
    wobble: 48,
    elev: 22,
    halfWidth: 7.4,
    shoulderW: 4.2,
    cruise: 54,
    seed: 131,
  },
  {
    id: "laguna",
    name: "Laguna Seca",
    subtitle: "The corkscrew drops. Commit or spin.",
    time: "dusk",
    prop: "canyon",
    asphalt: "#3c3834",
    line: "#f0d7a2",
    shoulder: "#5a4a3c",
    ground: "#4a3c32",
    barrier: "#6a5444",
    mountain: "#5a4438",
    lamp: "#ffc08a",
    water: "#000000",
    waterRadius: 0,
    rx: 220,
    rz: 148,
    wobble: 34,
    elev: 19,
    halfWidth: 6.8,
    shoulderW: 3.4,
    cruise: 48,
    seed: 149,
  },
  {
    id: "spa",
    name: "Spa-Francorchamps",
    subtitle: "Eau Rouge, long straights, forest walls.",
    time: "day",
    prop: "alps",
    asphalt: "#42484e",
    line: "#f3ede4",
    shoulder: "#5a6a5c",
    ground: "#3a4a3e",
    barrier: "#4a5a4e",
    mountain: "#3a4a40",
    lamp: "#fff6e0",
    water: "#3a5a6a",
    waterRadius: 55,
    rx: 380,
    rz: 240,
    wobble: 28,
    elev: 14,
    halfWidth: 8.6,
    shoulderW: 4.8,
    cruise: 58,
    seed: 167,
  },
  {
    id: "suzuka",
    name: "Suzuka Circuit",
    subtitle: "Figure-eight flow. Rhythm or nothing.",
    time: "day",
    prop: "harbor",
    asphalt: "#3a4046",
    line: "#f3ede4",
    shoulder: "#4a5a52",
    ground: "#2a3a34",
    barrier: "#3a4a44",
    mountain: "#2a3a36",
    lamp: "#fff4d8",
    water: "#2a4a58",
    waterRadius: 65,
    rx: 300,
    rz: 190,
    wobble: 38,
    elev: 8,
    halfWidth: 7.8,
    shoulderW: 3.8,
    cruise: 53,
    seed: 181,
  },
];

export const PAD_U = [0.16, 0.42, 0.67, 0.88];

const DESIGNED: Record<string, [number, number, number][]> = {
  monaco: [
    [0, 1, 0], [18, 1, 8], [40, 1.2, 20], [58, 1.6, 36], [70, 2, 50],
    [68, 2.4, 70], [60, 3, 90], [42, 3.6, 102], [20, 4, 110], [0, 4.4, 108],
    [-20, 5, 100], [-36, 4.6, 86], [-50, 4, 70], [-46, 3, 54], [-40, 2, 40],
    [-28, 1.4, 24], [-10, 1, 10], [0, 1, -4], [10, 1, -20], [28, 1.4, -32],
    [50, 2, -40], [68, 2.4, -32], [80, 3, -20], [76, 3.4, -4], [70, 4, 10],
    [52, 3.6, 22], [30, 3, 30], [10, 2.2, 26], [-10, 2, 20], [-22, 1.4, 10], [-30, 1, 0],
  ],
  laguna: [
    [0, 2, 0], [28, 2.6, 4], [60, 4, 10], [82, 6, 24], [100, 8, 40],
    [94, 11, 60], [80, 14, 80], [52, 16, 92], [20, 18, 100], [-8, 16, 98],
    [-40, 12, 90], [-62, 9, 76], [-80, 6, 60], [-72, 4.2, 40], [-60, 3, 20],
    [-40, 2.4, 8], [-20, 2, 0], [-6, 2.2, -14], [10, 3, -30], [28, 4.4, -42],
    [50, 6, -50], [72, 8, -42], [90, 10, -30], [82, 9, -14], [70, 8, 0],
    [48, 6, 12], [20, 4, 20], [0, 2.8, 16], [-20, 2, 10],
  ],
  spa: [
    [0, 2, 0], [36, 2.6, 8], [80, 4, 20], [112, 7, 40], [140, 10, 60],
    [136, 13, 90], [120, 16, 120], [84, 14.5, 132], [40, 12, 140], [0, 10, 136],
    [-40, 8, 120], [-72, 6, 100], [-100, 4, 80], [-92, 3, 54], [-80, 2, 30],
    [-50, 2, 12], [-20, 2, 0], [0, 2.4, -18], [20, 3, -40], [48, 4.4, -52],
    [80, 6, -60], [112, 7, -42], [140, 8, -20], [124, 7.2, 0], [100, 6, 20],
    [72, 5, 32], [40, 4, 40], [10, 3, 32], [-20, 2, 20],
  ],
};

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function ribbon(samples: Sample[], lat0: number, lat1: number, yLift: number) {
  const n = samples.length;
  const pos = new Float32Array(n * 2 * 3);
  const uv = new Float32Array(n * 2 * 2);
  const idx = new Uint32Array(n * 6);
  for (let i = 0; i < n; i++) {
    const s = samples[i];
    const y = s.y + yLift;
    pos[i * 6] = s.x + s.rx * lat0;
    pos[i * 6 + 1] = y;
    pos[i * 6 + 2] = s.z + s.rz * lat0;
    pos[i * 6 + 3] = s.x + s.rx * lat1;
    pos[i * 6 + 4] = y;
    pos[i * 6 + 5] = s.z + s.rz * lat1;
    const v = s.dist / 8;
    uv[i * 4] = 0;
    uv[i * 4 + 1] = v;
    uv[i * 4 + 2] = 1;
    uv[i * 4 + 3] = v;
    const j = (i + 1) % n;
    const a = i * 2;
    const b = i * 2 + 1;
    const c = j * 2;
    const d = j * 2 + 1;
    const k = i * 6;
    idx[k] = a;
    idx[k + 1] = b;
    idx[k + 2] = c;
    idx[k + 3] = b;
    idx[k + 4] = d;
    idx[k + 5] = c;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.computeVertexNormals();
  return g;
}

function wall(samples: Sample[], lat: number, height: number) {
  const n = samples.length;
  const pos = new Float32Array(n * 2 * 3);
  const idx = new Uint32Array(n * 6);
  for (let i = 0; i < n; i++) {
    const s = samples[i];
    const x = s.x + s.rx * lat;
    const z = s.z + s.rz * lat;
    pos[i * 6] = x;
    pos[i * 6 + 1] = s.y - 0.05;
    pos[i * 6 + 2] = z;
    pos[i * 6 + 3] = x;
    pos[i * 6 + 4] = s.y + height;
    pos[i * 6 + 5] = z;
    const j = (i + 1) % n;
    const a = i * 2;
    const b = i * 2 + 1;
    const c = j * 2;
    const d = j * 2 + 1;
    const k = i * 6;
    idx[k] = a;
    idx[k + 1] = b;
    idx[k + 2] = c;
    idx[k + 3] = b;
    idx[k + 4] = d;
    idx[k + 5] = c;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.computeVertexNormals();
  return g;
}

function mergeGeo(parts: THREE.BufferGeometry[]) {
  const geos = parts.filter(Boolean);
  let verts = 0;
  let inds = 0;
  for (const g of geos) {
    verts += g.getAttribute("position").count;
    inds += g.getIndex()?.count ?? 0;
  }
  const pos = new Float32Array(verts * 3);
  const idx = new Uint32Array(inds);
  let vo = 0;
  let io = 0;
  let base = 0;
  for (const g of geos) {
    const p = g.getAttribute("position").array as Float32Array;
    pos.set(p, vo);
    const ix = g.getIndex()!.array as Uint32Array;
    for (let k = 0; k < ix.length; k++) idx[io + k] = ix[k] + base;
    base += g.getAttribute("position").count;
    vo += p.length;
    io += ix.length;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  out.computeVertexNormals();
  return out;
}

function strip(samples: Sample[], u: number, lat0: number, lat1: number, depth: number, yLift: number) {
  const n = samples.length;
  const f = ((u % 1) + 1) % 1;
  const i0 = Math.floor(f * n) % n;
  const span = Math.max(2, Math.round(depth));
  const i1 = (i0 + span) % n;
  const s0 = samples[i0];
  const s1 = samples[i1];
  const y0 = s0.y + yLift;
  const y1 = s1.y + yLift;
  const pos = new Float32Array([
    s0.x + s0.rx * lat0, y0, s0.z + s0.rz * lat0,
    s0.x + s0.rx * lat1, y0, s0.z + s0.rz * lat1,
    s1.x + s1.rx * lat0, y1, s1.z + s1.rz * lat0,
    s1.x + s1.rx * lat1, y1, s1.z + s1.rz * lat1,
  ]);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setIndex(new THREE.BufferAttribute(new Uint16Array([0, 1, 2, 1, 3, 2]), 1));
  g.computeVertexNormals();
  return g;
}

function build(def: Def): Track {
  const rand = rng(def.seed);
  const controls: THREE.Vector3[] = [];
  const designed = DESIGNED[def.id];
  if (designed) {
    for (const p of designed) controls.push(new THREE.Vector3(p[0], p[1], p[2]));
  } else {
    const nCtrl = 28;
    for (let i = 0; i < nCtrl; i++) {
      const t = (i / nCtrl) * Math.PI * 2;
      const x = Math.cos(t) * def.rx + Math.cos(t * 2) * def.wobble;
      const z = Math.sin(t) * def.rz + Math.sin(t * 3) * def.wobble * 0.42;
      const yRaw = (Math.sin(t * 2) * 0.65 + Math.sin(t) * 0.35) * def.elev;
      controls.push(new THREE.Vector3(x, Math.max(0.4, yRaw + def.elev * 0.2), z));
    }
  }
  const curve = new THREE.CatmullRomCurve3(controls, true, "centripetal", 0.5);
  const N = 640;
  const samples: Sample[] = [];
  for (let i = 0; i < N; i++) {
    const u = i / N;
    const p = curve.getPointAt(u);
    const tan = curve.getTangentAt(u);
    const h = Math.hypot(tan.x, tan.z) || 1;
    const tx = tan.x / h;
    const tz = tan.z / h;
    samples.push({
      x: p.x,
      y: p.y,
      z: p.z,
      tx,
      ty: tan.y,
      tz,
      rx: -tz,
      rz: tx,
      u,
      dist: 0,
      heading: Math.atan2(tx, tz),
    });
  }
  // Round single-sample kinks so a car can actually steer through them.
  for (let pass = 0; pass < 16; pass++) {
    const xs = samples.map((s) => s.x);
    const zs = samples.map((s) => s.z);
    for (let i = 0; i < N; i++) {
      const p = samples[(i - 1 + N) % N];
      const c = samples[i];
      const q = samples[(i + 1) % N];
      const h1 = Math.atan2(c.x - p.x, c.z - p.z);
      const h2 = Math.atan2(q.x - c.x, q.z - c.z);
      let dh = h2 - h1;
      if (dh > Math.PI) dh -= Math.PI * 2;
      if (dh < -Math.PI) dh += Math.PI * 2;
      if (Math.abs(dh) > 0.14) {
        xs[i] = c.x * 0.34 + (p.x + q.x) * 0.33;
        zs[i] = c.z * 0.34 + (p.z + q.z) * 0.33;
      }
    }
    for (let i = 0; i < N; i++) {
      samples[i].x = xs[i];
      samples[i].z = zs[i];
    }
  }
  for (let i = 0; i < N; i++) {
    const p = samples[(i - 1 + N) % N];
    const q = samples[(i + 1) % N];
    let tx = q.x - p.x;
    let tz = q.z - p.z;
    const h = Math.hypot(tx, tz) || 1;
    tx /= h;
    tz /= h;
    const s = samples[i];
    s.tx = tx;
    s.tz = tz;
    s.rx = -tz;
    s.rz = tx;
    s.heading = Math.atan2(tx, tz);
  }
  let length = 0;
  for (let i = 0; i < N; i++) {
    const a = samples[i];
    const b = samples[(i + 1) % N];
    if (i === 0) a.dist = 0;
    length += Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
    if (i < N - 1) samples[i + 1].dist = length;
  }
  const half = def.halfWidth;
  const sh = def.shoulderW;
  const road = ribbon(samples, -half, half, 0.04);
  const shoulderGeo = mergeGeo([
    ribbon(samples, -half - sh, -half + 0.05, -0.06),
    ribbon(samples, half - 0.05, half + sh, -0.06),
  ]);
  const kerbGeo = mergeGeo([
    ribbon(samples, -half - 0.15, -half + 0.45, 0.07),
    ribbon(samples, half - 0.45, half + 0.15, 0.07),
  ]);
  const wallGeo = mergeGeo([
    wall(samples, -(half + sh), 0.85),
    wall(samples, half + sh, 0.85),
  ]);
  const pads = PAD_U.map((u) => strip(samples, u, -half * 0.72, half * 0.72, 3, 0.09));
  const startLine = strip(samples, 0.012, -half * 0.96, half * 0.96, 2, 0.08);

  const trees: Decor[] = [];
  const lamps: Decor[] = [];
  const rocks: Decor[] = [];
  const chevrons: Decor[] = [];
  const step = def.prop === "canyon" ? 7 : 5;
  for (let i = 0; i < N; i += step) {
    const s = samples[i];
    const side = i % (step * 2) === 0 ? 1 : -1;
    const dist = half + sh + 3.5 + rand() * (def.prop === "harbor" ? 16 : 11);
    trees.push({
      x: s.x + s.rx * side * dist,
      y: s.y,
      z: s.z + s.rz * side * dist,
      s: 0.75 + rand() * 0.7,
      h: 0.8 + rand() * 0.9,
      rot: rand() * Math.PI * 2,
    });
    if (rand() > 0.55) {
      const rs = side * -1;
      rocks.push({
        x: s.x + s.rx * rs * (half + sh + 2 + rand() * 8),
        y: s.y,
        z: s.z + s.rz * rs * (half + sh + 2 + rand() * 8),
        s: 0.6 + rand() * 1.4,
        h: 0.5 + rand() * 1.6,
        rot: rand() * 6,
      });
    }
  }
  for (let i = 8; i < N; i += 16) {
    for (const side of [-1, 1]) {
      const s = samples[i];
      const dist = half + 1.35;
      lamps.push({
        x: s.x + s.rx * side * dist,
        y: s.y,
        z: s.z + s.rz * side * dist,
        s: 1,
        h: 4.6,
        rot: s.heading,
      });
    }
  }
  for (let i = 30; i < N; i += 46) {
    const s = samples[i];
    if (s.u < 0.02 || s.u > 0.985) continue;
    chevrons.push({
      x: s.x,
      y: s.y + 0.12,
      z: s.z,
      s: 1,
      h: 1,
      rot: s.heading,
    });
  }
  const mountains: Decor[] = [];
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + rand();
    const r = Math.max(def.rx, def.rz) + 180 + rand() * 80;
    mountains.push({
      x: Math.cos(a) * r,
      y: 0,
      z: Math.sin(a) * r,
      s: 26 + rand() * 22,
      h: 38 + rand() * 56,
      rot: rand() * 3,
    });
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const s of samples) {
    minX = Math.min(minX, s.x);
    maxX = Math.max(maxX, s.x);
    minZ = Math.min(minZ, s.z);
    maxZ = Math.max(maxZ, s.z);
  }

  return {
    id: def.id,
    name: def.name,
    subtitle: def.subtitle,
    time: def.time,
    prop: def.prop,
    asphalt: def.asphalt,
    line: def.line,
    shoulder: def.shoulder,
    ground: def.ground,
    barrier: def.barrier,
    mountain: def.mountain,
    lamp: def.lamp,
    water: def.water,
    waterRadius: def.waterRadius,
    halfWidth: half,
    shoulderW: sh,
    cruise: def.cruise,
    length,
    minX,
    maxX,
    minZ,
    maxZ,
    samples,
    road,
    shoulderGeo,
    kerbGeo,
    wallGeo,
    pads,
    startLine,
    trees,
    lamps,
    rocks,
    chevrons,
    mountains,
  };
}

const cache = new Map<string, Track>();

export function getTrack(id: string): Track {
  let t = cache.get(id);
  if (!t) {
    const def = DEFS.find((d) => d.id === id) ?? DEFS[0];
    t = build(def);
    cache.set(def.id, t);
  }
  return t;
}

export function trackList(): { id: string; name: string; subtitle: string; time: Track["time"] }[] {
  return DEFS.map((d) => ({ id: d.id, name: d.name, subtitle: d.subtitle, time: d.time }));
}

export function sampleAt(track: Track, u: number, out: Sample): Sample {
  const n = track.samples.length;
  let f = u % 1;
  if (f < 0) f += 1;
  const x = f * n;
  const i = Math.floor(x) % n;
  const t = x - Math.floor(x);
  const j = (i + 1) % n;
  const a = track.samples[i];
  const b = track.samples[j];
  out.x = a.x + (b.x - a.x) * t;
  out.y = a.y + (b.y - a.y) * t;
  out.z = a.z + (b.z - a.z) * t;
  out.tx = a.tx + (b.tx - a.tx) * t;
  out.tz = a.tz + (b.tz - a.tz) * t;
  const h = Math.hypot(out.tx, out.tz) || 1;
  out.tx /= h;
  out.tz /= h;
  out.ty = a.ty + (b.ty - a.ty) * t;
  out.rx = -out.tz;
  out.rz = out.tx;
  let du = b.u - a.u;
  if (du < -0.5) du += 1;
  out.u = (a.u + du * t + 1) % 1;
  out.dist = a.dist;
  out.heading = Math.atan2(out.tx, out.tz);
  return out;
}

export function nearestIndex(track: Track, x: number, z: number, hint: number): number {
  const n = track.samples.length;
  let best = ((hint % n) + n) % n;
  let bestD = Infinity;
  const scan = (from: number, to: number) => {
    for (let i = from; i <= to; i++) {
      const k = ((i % n) + n) % n;
      const s = track.samples[k];
      const dx = x - s.x;
      const dz = z - s.z;
      const d = dx * dx + dz * dz;
      if (d < bestD) {
        bestD = d;
        best = k;
      }
    }
  };
  scan(best - 48, best + 48);
  if (bestD > 900) {
    bestD = Infinity;
    scan(0, n - 1);
  }
  return best;
}

const tmp = emptySample();

export function emptySample(): Sample {
  return {
    x: 0, y: 0, z: 0, tx: 0, ty: 0, tz: 1, rx: 1, rz: 0, u: 0, dist: 0, heading: 0,
  };
}

export function progressAt(track: Track, x: number, z: number, index: number): number {
  const n = track.samples.length;
  const s = track.samples[index];
  const next = track.samples[(index + 1) % n];
  const tx = next.x - s.x;
  const tz = next.z - s.z;
  const len2 = tx * tx + tz * tz || 1;
  const tt = Math.max(0, Math.min(1, ((x - s.x) * tx + (z - s.z) * tz) / len2));
  let du = next.u - s.u;
  if (du < -0.5) du += 1;
  if (du > 0.5) du -= 1;
  let u = s.u + du * tt;
  if (u < 0) u += 1;
  if (u >= 1) u -= 1;
  return u;
}

void tmp;
