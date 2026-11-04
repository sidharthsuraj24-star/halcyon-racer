import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { carById } from "@/game/cars";
import { poses, respawn, runtime, step, type StepCtx } from "@/game/runtime";
import { getTrack, sampleAt } from "@/game/tracks";
import { useGame } from "@/game/store";
import { Traffic } from "@/game/Cars";
import { World } from "@/game/world";

const TIME = {
  day: { sky: "#8ea8bc", fog: "#a9b8c4", sun: 2.35, amb: 0.82, sunColor: "#fff4e5", hemi: "#e7f0f7", ground: "#6e675c", near: 80, far: 520 },
  dusk: { sky: "#241610", fog: "#3a241c", sun: 1.15, amb: 0.36, sunColor: "#ffb27a", hemi: "#e39a6a", ground: "#2a211c", near: 55, far: 380 },
  night: { sky: "#07090e", fog: "#0c1016", sun: 0.28, amb: 0.16, sunColor: "#c5d4ee", hemi: "#243456", ground: "#12141a", near: 36, far: 300 },
} as const;

const desired = new THREE.Vector3();
const look = new THREE.Vector3();
const lookS = new THREE.Vector3();
const sunRef: { current: THREE.DirectionalLight | null } = { current: null };
const stepCtx: StepCtx = { car: carById("solstice"), weather: "clear", difficulty: "sport", ghost: true, boostLevel: 1, items: {} };

function qaDriving() {
  const keys = runtime.qaKeys;
  if (!keys) return false;
  return keys.some((k) => k === "KeyW" || k === "KeyA" || k === "KeyD" || k === "KeyS" || k === "ArrowUp" || k === "ArrowLeft" || k === "ArrowRight" || k === "ArrowDown");
}

function Loop() {
  const acc = useRef(0);
  const hudAcc = useRef(0);
  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    const perf = window.__halcyonPerf;
    if (perf) {
      perf.frameMs = perf.frameMs * 0.9 + dt * 1000 * 0.1;
      perf.fps = perf.frameMs > 0 ? 1000 / perf.frameMs : 0;
    }
    if (runtime.camEdge) {
      runtime.camEdge = false;
      useGame.getState().cycleCamera();
    }
    if (runtime.respawnEdge) {
      runtime.respawnEdge = false;
      respawn();
    }
    if (runtime.pauseEdge) {
      runtime.pauseEdge = false;
      const phase = useGame.getState().phase;
      if (phase === "race") useGame.getState().pause();
      else if (phase === "paused") useGame.getState().resume();
    }

    const st = useGame.getState();
    runtime.cine += dt;
    if (st.phase === "race" || qaDriving()) {
      if (runtime.countdown > 0) {
        runtime.countdown -= dt;
        const left = runtime.countdown;
        if (left > 2.2) runtime.sim.banner = "3";
        else if (left > 1.2) runtime.sim.banner = "2";
        else if (left > 0.2) runtime.sim.banner = "1";
        else {
          runtime.sim.banner = "GO";
          runtime.sim.bannerT = 1.1;
        }
        runtime.sim.bannerT = Math.max(runtime.sim.bannerT, 0.4);
      } else {
        stepCtx.car = carById(st.carId);
        stepCtx.weather = st.weather;
        stepCtx.difficulty = st.difficulty;
        stepCtx.ghost = st.ghost;
        stepCtx.boostLevel = st.save.boostLevel;
        stepCtx.items = st.save.items;
        acc.current += dt;
        let n = 0;
        while (acc.current >= 1 / 60 && n < 5) {
          step(1 / 60, stepCtx);
          acc.current -= 1 / 60;
          n++;
        }
      }
    } else {
      acc.current = 0;
    }

    if (runtime.sim.finished && !runtime.sim.reported && runtime.sim.finishHold > 1.25 && st.phase === "race") {
      runtime.sim.reported = true;
      useGame.getState().completeRace();
    }

    hudAcc.current += dt;
    if (hudAcc.current > 0.12 && (st.phase === "race" || st.phase === "paused")) {
      hudAcc.current = 0;
      useGame.getState().pushHud();
    }

    const phase = useGame.getState().phase;
    const track = getTrack(runtime.trackId);
    const sim = runtime.sim;
    const mode = useGame.getState().camera;
    let yaw = sim.yaw;
    let px = sim.x;
    let py = sim.y;
    let pz = sim.z;

    if (phase === "replay") {
      const g = runtime.ghost;
      if (g.length > 1) {
        runtime.replayT += dt;
        const t = runtime.replayT;
        let i = runtime.replayIx;
        while (i < g.length - 2 && g[i + 1].t < t) i++;
        runtime.replayIx = i;
        const a = g[i];
        const b = g[Math.min(g.length - 1, i + 1)];
        const span = Math.max(0.0001, b.t - a.t);
        const k = Math.max(0, Math.min(1, (t - a.t) / span));
        let dy = b.yaw - a.yaw;
        if (dy > Math.PI) dy -= Math.PI * 2;
        if (dy < -Math.PI) dy += Math.PI * 2;
        const pose = poses[0];
        pose.x = a.x + (b.x - a.x) * k;
        pose.y = a.y + (b.y - a.y) * k;
        pose.z = a.z + (b.z - a.z) * k;
        pose.yaw = a.yaw + dy * k;
        pose.visible = true;
        for (let n = 1; n <= 6; n++) poses[n].visible = false;
        yaw = pose.yaw;
        px = pose.x;
        py = pose.y;
        pz = pose.z;
      }
    }

    if (phase === "menu") {
      const u = 0.02 + Math.sin(runtime.cine * 0.2) * 0.005;
      const s = sampleAt(track, u, sampleAtSafe);
      const hy = Math.atan2(-s.tx, -s.tz);
      const fx = -Math.sin(hy);
      const fz = -Math.cos(hy);
      const rx = Math.cos(hy);
      const rz = -Math.sin(hy);
      desired.set(s.x - fx * 18 + rx * 8, s.y + 6.4, s.z - fz * 18 + rz * 8);
      look.set(s.x + fx * 26, s.y + 1.3, s.z + fz * 26);
    } else if (phase === "results") {
      desired.set(px + Math.cos(runtime.cine * 0.22) * 10, py + 3.4, pz + Math.sin(runtime.cine * 0.22) * 10);
      look.set(px, py + 0.8, pz);
    } else if (mode === "fpp") {
      const fx = -Math.sin(yaw);
      const fz = -Math.cos(yaw);
      desired.set(px + fx * 0.35, py + 0.92, pz + fz * 0.35);
      look.set(px + fx * 22, py + 0.78, pz + fz * 22);
    } else if (mode === "hood") {
      const fx = -Math.sin(yaw);
      const fz = -Math.cos(yaw);
      desired.set(px + fx * 1.05, py + 1.12, pz + fz * 1.05);
      look.set(px + fx * 18, py + 0.95, pz + fz * 18);
    } else {
      const dist = mode === "tower" ? 16 : 8.6;
      const height = mode === "tower" ? 11.5 : 3.4;
      const fx = -Math.sin(yaw);
      const fz = -Math.cos(yaw);
      const slip = Math.abs(sim.lat) / Math.max(4, Math.abs(sim.speed));
      const kick = slip * 1.4;
      desired.set(px - fx * (dist + kick), py + height, pz - fz * (dist + kick));
      look.set(px + fx * 8, py + 1.05, pz + fz * 8);
    }

    if (sim.shake > 0 && phase === "race") {
      desired.x += (Math.random() - 0.5) * sim.shake * 0.28;
      desired.y += (Math.random() - 0.5) * sim.shake * 0.16;
    }

    const cam = state.camera as THREE.PerspectiveCamera;
    if (runtime.snapCam) {
      cam.position.copy(desired);
      lookS.copy(look);
      runtime.snapCam = false;
    } else {
      const k = 1 - Math.exp((mode === "hood" || mode === "fpp" ? -12 : -4.2) * dt);
      cam.position.lerp(desired, k);
      lookS.lerp(look, 1 - Math.exp(-7 * dt));
    }
    cam.lookAt(lookS);
    const boost = sim.boostActive && phase === "race" ? 10 : 0;
    const base = mode === "fpp" ? 84 : mode === "hood" ? 76 : 56;
    const speedFov = Math.min(1, Math.abs(sim.speed) / 55) * 12;
    const target = base + speedFov + boost;
    cam.fov += (target - cam.fov) * (1 - Math.exp(-5 * dt));
    const roll = mode === "chase" ? -sim.lat * 0.018 - sim.roll * 0.4 : 0;
    cam.up.set(Math.sin(roll), Math.cos(roll), 0);
    cam.updateProjectionMatrix();

    const light = sunRef.current;
    if (light && st.quality === "high") {
      light.position.set(px + 28, py + 46, pz + 12);
      light.target.position.set(px, py, pz);
      light.target.updateMatrixWorld();
    }
    const exposure = st.time === "night" ? 1.12 : st.time === "dusk" ? 1.06 : 1;
    state.gl.toneMappingExposure = exposure * (st.weather === "rain" ? 0.82 : 1);
  });
  return null;
}

function Dust() {
  const geo = useRef<THREE.BufferGeometry>(null);
  const life = useRef(new Float32Array(80));
  const vel = useRef(new Float32Array(80 * 3));
  const scratch = useRef<Float32Array | null>(null);
  if (!scratch.current) scratch.current = new Float32Array(80 * 3);
  useFrame((_, dt) => {
    const g = geo.current;
    if (!g) return;
    const d = Math.min(dt, 0.05);
    const pos = g.getAttribute("position") as THREE.BufferAttribute;
    const col = g.getAttribute("color") as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    const carr = col.array as Float32Array;
    const sim = runtime.sim;
    if ((sim.drifting || sim.off || sim.boostT > 0) && useGame.getState().phase === "race") {
      for (let n = 0; n < 2; n++) {
        let slot = -1;
        for (let k = 0; k < 80; k++) if (life.current[k] <= 0) { slot = k; break; }
        if (slot < 0) break;
        const side = n === 0 ? -0.75 : 0.75;
        const fx = -Math.sin(sim.yaw);
        const fz = -Math.cos(sim.yaw);
        const rx = Math.cos(sim.yaw);
        const rz = -Math.sin(sim.yaw);
        arr[slot * 3] = sim.x - fx * 1.6 + rx * side;
        arr[slot * 3 + 1] = sim.y + 0.3;
        arr[slot * 3 + 2] = sim.z - fz * 1.6 + rz * side;
        vel.current[slot * 3] = -fx * 1.5;
        vel.current[slot * 3 + 1] = 1.1;
        vel.current[slot * 3 + 2] = -fz * 1.5;
        life.current[slot] = 0.4;
        const hot = sim.drift > 0.66 || sim.boostT > 0;
        carr[slot * 3] = hot ? 0.88 : 0.83;
        carr[slot * 3 + 1] = hot ? 0.48 : 0.64;
        carr[slot * 3 + 2] = hot ? 0.24 : 0.35;
      }
    }
    for (let i = 0; i < 80; i++) {
      if (life.current[i] <= 0) {
        arr[i * 3 + 1] = -400;
        continue;
      }
      life.current[i] -= d;
      arr[i * 3] += vel.current[i * 3] * d;
      arr[i * 3 + 1] += vel.current[i * 3 + 1] * d;
      arr[i * 3 + 2] += vel.current[i * 3 + 2] * d;
    }
    pos.needsUpdate = true;
    col.needsUpdate = true;
  });
  const geoInit = useRef<THREE.BufferGeometry | null>(null);
  if (!geoInit.current) {
    const g = new THREE.BufferGeometry();
    const p = new Float32Array(80 * 3);
    const c = new Float32Array(80 * 3);
    for (let i = 0; i < 80; i++) p[i * 3 + 1] = -400;
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    g.setAttribute("color", new THREE.BufferAttribute(c, 3));
    geoInit.current = g;
  }
  return (
    <points geometry={geoInit.current} frustumCulled={false} ref={() => { geo.current = geoInit.current; }}>
      <pointsMaterial size={0.32} vertexColors transparent opacity={0.8} depthWrite={false} />
    </points>
  );
}

function Sparks() {
  const geo = useRef<THREE.BufferGeometry>(null);
  const life = useRef(new Float32Array(40));
  const vel = useRef(new Float32Array(40 * 3));
  useFrame((_, dt) => {
    const g = geo.current;
    if (!g) return;
    const d = Math.min(dt, 0.05);
    const pos = g.getAttribute("position") as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    const sim = runtime.sim;
    if (sim.shake > 0.25 && useGame.getState().phase === "race") {
      for (let n = 0; n < 4; n++) {
        let slot = -1;
        for (let k = 0; k < 40; k++) if (life.current[k] <= 0) { slot = k; break; }
        if (slot < 0) break;
        const fx = -Math.sin(sim.yaw);
        const fz = -Math.cos(sim.yaw);
        arr[slot * 3] = sim.x + (Math.random() - 0.5) * 1.2;
        arr[slot * 3 + 1] = sim.y + 0.4;
        arr[slot * 3 + 2] = sim.z + (Math.random() - 0.5) * 1.2;
        vel.current[slot * 3] = -fx * 2 + (Math.random() - 0.5) * 4;
        vel.current[slot * 3 + 1] = 2 + Math.random() * 3;
        vel.current[slot * 3 + 2] = -fz * 2 + (Math.random() - 0.5) * 4;
        life.current[slot] = 0.25 + Math.random() * 0.15;
      }
    }
    for (let i = 0; i < 40; i++) {
      if (life.current[i] <= 0) {
        arr[i * 3 + 1] = -400;
        continue;
      }
      life.current[i] -= d;
      vel.current[i * 3 + 1] -= 9 * d;
      arr[i * 3] += vel.current[i * 3] * d;
      arr[i * 3 + 1] += vel.current[i * 3 + 1] * d;
      arr[i * 3 + 2] += vel.current[i * 3 + 2] * d;
    }
    pos.needsUpdate = true;
  });
  const geoInit = useRef<THREE.BufferGeometry | null>(null);
  if (!geoInit.current) {
    const g = new THREE.BufferGeometry();
    const p = new Float32Array(40 * 3);
    for (let i = 0; i < 40; i++) p[i * 3 + 1] = -400;
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    geoInit.current = g;
  }
  return (
    <points geometry={geoInit.current} frustumCulled={false} ref={() => { geo.current = geoInit.current; }}>
      <pointsMaterial color="#ffb27a" size={0.12} transparent opacity={0.9} depthWrite={false} />
    </points>
  );
}

function TireMarks() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const marks = useRef<{ x: number; y: number; z: number; yaw: number; life: number }[]>([]);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame((_, dt) => {
    const sim = runtime.sim;
    const mesh = ref.current;
    if (!mesh) return;
    if (sim.drifting && useGame.getState().phase === "race" && marks.current.length < 80) {
      marks.current.push({ x: sim.x, y: sim.y + 0.06, z: sim.z, yaw: sim.yaw, life: 8 });
    }
    for (let i = marks.current.length - 1; i >= 0; i--) {
      marks.current[i].life -= dt;
      if (marks.current[i].life <= 0) marks.current.splice(i, 1);
    }
    for (let i = 0; i < 80; i++) {
      const m = marks.current[i];
      if (m) {
        dummy.position.set(m.x, m.y, m.z);
        dummy.rotation.set(-Math.PI / 2, 0, m.yaw);
        dummy.scale.set(1, 1, Math.min(1, m.life / 2));
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      } else {
        dummy.position.set(0, -50, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, 80]} frustumCulled={false}>
      <planeGeometry args={[0.5, 3.6]} />
      <meshBasicMaterial color="#1a1a1a" transparent opacity={0.45} depthWrite={false} />
    </instancedMesh>
  );
}

function SpeedLines() {
  const ref = useRef<THREE.Points>(null);
  const geo = useRef<THREE.BufferGeometry | null>(null);
  if (!geo.current) {
    const arr = new Float32Array(40 * 3);
    for (let i = 0; i < 40; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 8;
      arr[i * 3 + 1] = Math.random() * 3;
      arr[i * 3 + 2] = -Math.random() * 20;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    geo.current = g;
  }
  useFrame(() => {
    const sim = runtime.sim;
    const pts = ref.current;
    if (!pts) return;
    const fast = Math.abs(sim.speed) > 40;
    pts.visible = fast && useGame.getState().phase === "race";
    if (!fast) return;
    const arr = geo.current!.attributes.position.array as Float32Array;
    for (let i = 0; i < 40; i++) {
      arr[i * 3 + 2] += 1.2;
      if (arr[i * 3 + 2] > 2) arr[i * 3 + 2] = -20;
    }
    geo.current!.attributes.position.needsUpdate = true;
    pts.position.set(sim.x, sim.y + 1, sim.z);
    pts.rotation.set(0, sim.yaw, 0);
  });
  return (
    <points ref={ref} geometry={geo.current} frustumCulled={false}>
      <pointsMaterial color="#f3ede4" size={0.06} transparent opacity={0.35} depthWrite={false} />
    </points>
  );
}

function Rain() {
  const geo = useRef<THREE.BufferGeometry | null>(null);
  if (!geo.current) {
    const arr = new Float32Array(260 * 3);
    for (let i = 0; i < 260; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 46;
      arr[i * 3 + 1] = Math.random() * 26;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 46;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    geo.current = g;
  }
  const ref = useRef<THREE.Points>(null);
  useFrame((state) => {
    const g = geo.current;
    if (!g) return;
    const arr = g.attributes.position.array as Float32Array;
    for (let i = 0; i < 260; i++) {
      arr[i * 3 + 1] -= 0.7;
      if (arr[i * 3 + 1] < 0) arr[i * 3 + 1] = 24;
    }
    g.attributes.position.needsUpdate = true;
    if (ref.current) ref.current.position.copy(state.camera.position);
  });
  return (
    <points ref={ref} geometry={geo.current} frustumCulled={false}>
      <pointsMaterial color="#d5dde6" size={0.09} transparent opacity={0.45} depthWrite={false} />
    </points>
  );
}

function Stage() {
  const trackId = useGame((s) => s.trackId);
  const time = useGame((s) => s.time);
  const weather = useGame((s) => s.weather);
  const quality = useGame((s) => s.quality);
  const track = getTrack(trackId);
  const look = TIME[time];
  const sunI = look.sun * (weather === "rain" ? 0.55 : 1);
  return (
    <>
      <color attach="background" args={[look.sky]} />
      <fog attach="fog" args={[look.fog, look.near, look.far]} />
      <hemisphereLight args={[look.hemi, look.ground, look.amb]} />
      <ambientLight intensity={weather === "rain" ? 0.08 : 0.04} />
      <directionalLight
        ref={(node) => {
          sunRef.current = node;
        }}
        position={[80, 120, 40]}
        intensity={sunI}
        color={look.sunColor}
        castShadow={quality === "high"}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.0004}
        shadow-camera-near={1}
        shadow-camera-far={90}
        shadow-camera-left={-32}
        shadow-camera-right={32}
        shadow-camera-top={32}
        shadow-camera-bottom={-32}
      />
      {time !== "day" ? <Stars radius={320} depth={40} count={900} factor={2.4} saturation={0} fade speed={0.25} /> : null}
      <World track={track} />
      <Traffic />
      <Dust />
      <Sparks />
      <SpeedLines />
      <TireMarks />
      {weather === "rain" ? <Rain /> : null}
      <Loop />
      {quality !== "low" ? (
        <EffectComposer multisampling={0} enableNormalPass={false}>
          <Bloom mipmapBlur intensity={quality === "high" ? 0.4 : 0.22} luminanceThreshold={1.05} luminanceSmoothing={0.18} />
          <Vignette offset={0.2} darkness={0.7} />
        </EffectComposer>
      ) : null}
    </>
  );
}

export function Scene() {
  const quality = useGame((s) => s.quality);
  return (
    <div className="absolute inset-0">
      <Canvas
        key={quality}
        shadows={quality === "high"}
        dpr={quality === "high" ? [1, 1.5] : quality === "medium" ? [1, 1.25] : 1}
        camera={{ fov: 56, near: 0.15, far: 720, position: [0, 12, 24] }}
        gl={{
          antialias: quality === "high",
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
        }}
      >
        <Stage />
      </Canvas>
    </div>
  );
}

const sampleAtSafe = {
  x: 0, y: 0, z: 0, tx: 0, ty: 0, tz: 1, rx: 1, rz: 0, u: 0, dist: 0, heading: 0,
};
