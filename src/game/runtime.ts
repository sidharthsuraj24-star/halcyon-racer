import { audio } from "@/game/audio";
import { AI_NAMES, type CarSpec, carById } from "@/game/cars";
import {
  PAD_U,
  emptySample,
  getTrack,
  nearestIndex,
  progressAt,
  sampleAt,
  type Track,
} from "@/game/tracks";

export const LAPS = 3;
const CP = [0.25, 0.5, 0.75, 0];

export type Pose = {
  x: number;
  y: number;
  z: number;
  yaw: number;
  steer: number;
  speed: number;
  brake: number;
  boost: number;
  drift: number;
  visible: boolean;
};

export type GhostSample = { t: number; x: number; y: number; z: number; yaw: number };

type Sim = {
  x: number;
  y: number;
  z: number;
  yaw: number;
  speed: number;
  lat: number;
  u: number;
  prevU: number;
  hint: number;
  lap: number;
  nextCp: number;
  lastU: number;
  lapTime: number;
  raceTime: number;
  bestLap: number;
  lastLap: number;
  newRecord: boolean;
  finished: boolean;
  reported: boolean;
  finishHold: number;
  boostT: number;
  boostCharge: number;
  boostActive: boolean;
  shield: number;
  slow: number;
  heat: number;
  chaseDist: number;
  escapeT: number;
  busted: boolean;
  drift: number;
  drifting: boolean;
  damage: number;
  tireWear: number;
  tireTemp: number;
  grip: number;
  hitCd: number;
  padCd: number;
  shake: number;
  wrong: number;
  off: boolean;
  armed: boolean;
  place: number;
  lapFlash: number;
  banner: string;
  bannerT: number;
  recAcc: number;
  latOff: number;
  rpm: number;
  gear: number;
  pitch: number;
  roll: number;
  susp: number;
  shiftCd: number;
  miniT: number;
};

type Ai = {
  name: string;
  skill: number;
  phase: number;
  totalU: number;
  lap: number;
  u: number;
  speed: number;
  x: number;
  y: number;
  z: number;
  yaw: number;
};

function makeSim(): Sim {
  return {
    x: 0, y: 0, z: 0, yaw: 0, speed: 0, lat: 0, u: 0.02, prevU: 0.02, hint: 0,
    lap: 0, nextCp: 0, lastU: 0.02, lapTime: 0, raceTime: 0, bestLap: 0, lastLap: 0,
    newRecord: false, finished: false, reported: false, finishHold: 0, boostT: 0, boostCharge: 1, boostActive: false, shield: 0, slow: 0, heat: 0, chaseDist: 18, escapeT: 0, busted: false,
    drift: 0, drifting: false, damage: 0, tireWear: 0, tireTemp: 0.5, grip: 1, hitCd: 0, padCd: 0, shake: 0, wrong: 0,
    off: false, armed: false, place: 1, lapFlash: 0, banner: "", bannerT: 0, recAcc: 0,
    latOff: 0, rpm: 800, gear: 1, pitch: 0, roll: 0, susp: 0, shiftCd: 0, miniT: 0,
  };
}

function makePose(): Pose {
  return { x: 0, y: 0, z: 0, yaw: 0, steer: 0, speed: 0, brake: 0, boost: 0, drift: 0, visible: true };
}

export const poses: Pose[] = Array.from({ length: 7 }, makePose);
export const hazards: { type: "oil" | "missile"; x: number; z: number; life: number; vx: number; vz: number }[] = [];

export const runtime = {
  trackId: "harbor",
  phase: "menu" as "menu" | "race" | "paused" | "results" | "replay",
  sim: makeSim(),
  ai: [] as Ai[],
  keys: new Set<string>(),
  qaKeys: null as string[] | null,
  steerOverride: null as number | null,
  touch: { steer: 0, throttle: 0, brake: 0, drift: false, boost: false, oil: false, missile: false, shield: false, emp: false },
  camEdge: false,
  respawnEdge: false,
  pauseEdge: false,
  snapCam: true,
  recording: [] as GhostSample[],
  ghost: [] as GhostSample[],
  replayT: 0,
  replayIx: 0,
  finishPose: { x: 0, y: 0, z: 0, yaw: 0 },
  cine: 0,
  countdown: 0,
};

const tmpA = emptySample();
const tmpB = emptySample();

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

function crossed(prev: number, curr: number, gate: number): boolean {
  let d = curr - prev;
  if (d > 0.5) d -= 1;
  if (d < -0.5) d += 1;
  if (d <= 0.00001) return false;
  if (curr >= prev) return gate > prev && gate <= curr;
  return gate > prev || gate <= curr;
}

function actions() {
  const source = runtime.qaKeys ?? runtime.keys;
  const has = (code: string) =>
    Array.isArray(source) ? source.includes(code) : source.has(code);
  let steer = 0;
  if (has("KeyA") || has("ArrowLeft")) steer += 1;
  if (has("KeyD") || has("ArrowRight")) steer -= 1;
  let throttle = has("KeyW") || has("ArrowUp") ? 1 : 0;
  let brake = has("KeyS") || has("ArrowDown") ? 1 : 0;
  let drift = has("Space") || has("ShiftLeft");
  const boostKey = has("KeyN") || has("KeyB") || runtime.touch.boost;
  const oilKey = has("KeyQ") || runtime.touch.oil;
  const missileKey = has("KeyE") || runtime.touch.missile;
  const shieldKey = has("KeyF") || runtime.touch.shield;
  const empKey = has("KeyG") || runtime.touch.emp;
  if (runtime.steerOverride !== null) steer = runtime.steerOverride;
  if (runtime.qaKeys == null && typeof navigator !== "undefined" && navigator.getGamepads) {
    const pads = navigator.getGamepads();
    const p = pads && pads[0];
    if (p) {
      const ax = p.axes[0] ?? 0;
      if (Math.abs(ax) > 0.12) steer += -ax;
      throttle = Math.max(throttle, p.buttons[7]?.value ?? 0);
      brake = Math.max(brake, p.buttons[6]?.value ?? 0);
      if (p.buttons[0]?.pressed || p.buttons[1]?.pressed) drift = true;
    }
  }
  steer = clamp(steer + runtime.touch.steer, -1, 1);
  throttle = clamp(Math.max(throttle, runtime.touch.throttle), 0, 1);
  brake = clamp(Math.max(brake, runtime.touch.brake), 0, 1);
  drift = drift || runtime.touch.drift;
  return { steer, throttle, brake, drift, boostKey, oilKey, missileKey, shieldKey, empKey };
}

function writePlayerPose(steer: number, brake: number) {
  const s = runtime.sim;
  const p = poses[0];
  p.x = s.x;
  p.y = s.y;
  p.z = s.z;
  p.yaw = s.yaw;
  p.steer = steer;
  p.speed = s.speed;
  p.brake = brake;
  p.boost = s.boostT;
  p.drift = s.drift;
  p.visible = true;
}

function placeAi(track: Track, ai: Ai, lat: number) {
  const s = sampleAt(track, ai.u, tmpB);
  ai.x = s.x + s.rx * lat;
  ai.y = s.y;
  ai.z = s.z + s.rz * lat;
  ai.yaw = Math.atan2(-s.tx, -s.tz);
}

export function reset(trackId: string, bestLap: number) {
  const track = getTrack(trackId);
  runtime.trackId = trackId;
  const sim = runtime.sim;
  Object.assign(sim, makeSim());
  sim.bestLap = bestLap;
  const spacing = 9 / track.length;
  const pole = 0.016;
  const playerU = pole + spacing * 1.3;
  const s = sampleAt(track, playerU, tmpA);
  sim.x = s.x;
  sim.y = s.y;
  sim.z = s.z;
  sim.yaw = Math.atan2(-s.tx, -s.tz);
  sim.u = playerU;
  sim.prevU = playerU;
  sim.lastU = playerU;
  sim.hint = Math.floor(playerU * track.samples.length);

  runtime.ai = AI_NAMES.map((name, i) => {
    const row = Math.floor(i / 2);
    const u = Math.max(0.004, pole - row * spacing);
    return {
      name,
      skill: [0.98, 1.01, 0.96, 1.03, 0.99][i] ?? 1,
      phase: i * 1.7,
      totalU: u,
      lap: 0,
      u,
      speed: 0,
      x: 0, y: 0, z: 0, yaw: 0,
    };
  });
  for (let i = 0; i < runtime.ai.length; i++) {
    const side = i % 2 === 0 ? -2.55 : 2.55;
    placeAi(track, runtime.ai[i], side);
    const p = poses[i + 1];
    const ai = runtime.ai[i];
    p.x = ai.x;
    p.y = ai.y;
    p.z = ai.z;
    p.yaw = ai.yaw;
    p.visible = true;
    p.speed = 0;
    p.steer = 0;
    p.boost = 0;
    p.drift = 0;
  }
  writePlayerPose(0, 0);
  poses[6].visible = false;
  runtime.recording = [];
  hazards.length = 0;
  runtime.snapCam = true;
  runtime.replayT = 0;
  runtime.sim.boostCharge = 1;
  runtime.sim.boostActive = false;
  runtime.sim.boostT = 0;
  runtime.sim.heat = 0;
  runtime.sim.chaseDist = 18;
  runtime.sim.escapeT = 0;
  runtime.sim.busted = false;
}

export function respawn() {
  const track = getTrack(runtime.trackId);
  const sim = runtime.sim;
  const u = (sim.lastU + 0.004) % 1;
  const s = sampleAt(track, u, tmpA);
  sim.x = s.x;
  sim.y = s.y;
  sim.z = s.z;
  sim.yaw = Math.atan2(-s.tx, -s.tz);
  sim.u = u;
  sim.prevU = u;
  sim.speed = clamp(Math.max(sim.speed * 0.45, 16), 0, 32);
  sim.lat = 0;
  sim.hitCd = 0.7;
  sim.wrong = 0;
  sim.hint = Math.floor(u * track.samples.length);
  runtime.snapCam = true;
}

function fieldPlace() {
  const sim = runtime.sim;
  const you = sim.lap + sim.u;
  let ahead = 0;
  for (const ai of runtime.ai) {
    if (ai.lap + ai.u > you) ahead++;
  }
  return ahead + 1;
}

export type StepCtx = {
  car: CarSpec;
  weather: "clear" | "rain";
  difficulty: "casual" | "sport" | "elite";
  ghost: boolean;
  boostLevel: number;
  items: Record<string, number>;
};

export function step(dt: number, ctx: StepCtx) {
  const track = getTrack(runtime.trackId);
  const sim = runtime.sim;
  if (!Number.isFinite(sim.x) || !Number.isFinite(sim.z) || !Number.isFinite(sim.speed)) {
    sim.x = 0;
    sim.z = 0;
    sim.y = 0;
    sim.speed = 0;
    sim.lat = 0;
    sim.yaw = 0;
  }
  const car = ctx.car;
  let { steer, throttle, brake, drift, boostKey, oilKey, missileKey, shieldKey, empKey } = actions();
  if (sim.finished) {
    throttle = 0;
    brake = 0.35;
    steer *= 0.2;
    drift = false;
    boostKey = false;
    oilKey = false;
    missileKey = false;
    shieldKey = false;
    empKey = false;
  }

  const gripBonus = 1 + (ctx.items.grip ?? 0) * 0.08;
  const accelBonus = 1 + (ctx.items.turbo ?? 0) * 0.1;
  const armor = (ctx.items.armor ?? 0) * 0.2;
  const rechargeBonus = 1 + (ctx.items.nitro ?? 0) * 0.15;
  const speedBonus = 1 + (ctx.items.aero ?? 0) * 0.06;
  const rain = ctx.weather === "rain" ? 0.78 : 1;
  const mass = 1400;
  const maxCap = car.maxSpeed * speedBonus * (1 - sim.damage * 0.18 * (1 - armor));
  const drifting = Boolean(drift) && sim.speed > 12 && Math.abs(steer) > 0.12;
  const boostLvl = Math.max(1, Math.min(4, ctx.boostLevel || 1));
  const mult = [0, 2.2, 2.8, 3.4, 4.0][boostLvl];

  // Torque curve: peak mid-RPM, falls off at redline
  const gearRatios = [0, 3.4, 2.2, 1.55, 1.15, 0.88, 0.72];
  const finalDrive = 3.6;
  const redline = 7500;
  const idle = 800;
  const gear = clamp(sim.gear, 1, 6);
  const ratio = gearRatios[gear] * finalDrive;
  const wheelR = 0.34;
  const wheelRpm = (Math.abs(sim.speed) / (2 * Math.PI * wheelR)) * 60;
  const targetRpm = clamp(idle + wheelRpm * ratio * 0.35, idle, redline + 400);
  sim.rpm += (targetRpm - sim.rpm) * Math.min(1, dt * 6);
  sim.shiftCd = Math.max(0, sim.shiftCd - dt);
  if (sim.shiftCd <= 0 && sim.rpm > redline - 200 && gear < 6 && throttle > 0.4) {
    sim.gear = Math.min(6, gear + 1);
    sim.shiftCd = 0.45;
    audio.click();
  }
  if (sim.shiftCd <= 0 && sim.rpm < 1800 && gear > 1 && throttle < 0.25) {
    sim.gear = Math.max(1, gear - 1);
    sim.shiftCd = 0.45;
  }

  const rpmN = clamp((sim.rpm - idle) / (redline - idle), 0, 1);
  const torqueCurve = Math.sin(rpmN * Math.PI) * 0.85 + 0.15;
  const shiftCut = sim.shiftCd > 0.3 ? 0.78 : 1;
  const engineForce = throttle * car.accel * accelBonus * torqueCurve * (sim.boostActive ? 1.6 : 1) * shiftCut;
  const brakeForce = brake * car.brake * (sim.speed > 0 ? 1 : 0.4);
  const drag = (0.12 + (sim.off ? 1.8 : 0) + (ctx.weather === "rain" ? 0.22 : 0)) * sim.speed;
  const aeroDrag = sim.speed * Math.abs(sim.speed) * 0.004;
  sim.speed += ((engineForce - brakeForce - drag - aeroDrag) / mass) * dt * 420;
  sim.speed = clamp(sim.speed, -maxCap * 0.28, maxCap * (sim.boostActive ? mult : 1));

  // Weight transfer
  const longLoad = clamp((engineForce - brakeForce) / 80, -1, 1);
  const latLoad = clamp(sim.lat / 18, -1, 1);
  const frontGrip = 1 - longLoad * 0.22;
  const rearGrip = 1 + longLoad * 0.18;

  // Grip budget from the bike model: over-demand bleeds grip, easing recovers it.
  const demand = Math.abs(sim.lat) / Math.max(4, Math.abs(sim.speed) * 0.15);
  const over = Math.max(0, demand - sim.grip);
  sim.grip = clamp(sim.grip - over * 0.9 * dt + (over < 0.05 ? 1.15 * dt : 0), 0.35, 1);
  const gripScale = 0.55 + sim.grip * 0.45;
  const slip = Math.abs(sim.lat) / Math.max(4, Math.abs(sim.speed));
  const points = [slip, slip * 0.85, slip * 1.15];
  const pacejka = points.reduce((sum, s) => sum + Math.sin(Math.min(s * 2.2, 1.4)) * (1 - Math.max(0, s - 0.6) * 0.4), 0) / 3;
  const cold = sim.tireTemp < 0.35 ? 0.82 : 1;
  const hot = sim.tireTemp > 0.85 ? 0.88 : 1;
  const surface = (sim.off ? 0.55 : 1) * rain * gripBonus * (1 - sim.tireWear * 0.25) * cold * hot;
  const gripF = car.grip * frontGrip * surface * Math.max(0.25, pacejka) * gripScale;
  const gripR = car.grip * rearGrip * surface * (drifting ? 0.35 : Math.max(0.3, pacejka)) * gripScale;

  const speedFactor = clamp(Math.abs(sim.speed) / 12, 0.3, 1) * (1 - clamp((Math.abs(sim.speed) - 48) / 50, 0, 0.35));
  const reverse = sim.speed >= 0 ? 1 : -1;
  const yawRate = steer * car.turn * speedFactor * reverse * (gripF / Math.max(1, car.grip));
  sim.yaw += yawRate * dt;

  sim.lat *= Math.exp(-gripR * 0.45 * dt);
  sim.lat += steer * sim.speed * (drifting ? 0.48 : 0.055) * (1 - Math.min(0.5, slip)) * dt;
  sim.lat = clamp(sim.lat, -22, 22);

  // Suspension: pitch from accel/brake, roll from lateral
  const targetPitch = clamp(-longLoad * 0.08, -0.12, 0.12);
  const targetRoll = clamp(latLoad * 0.1, -0.14, 0.14);
  sim.pitch += (targetPitch - sim.pitch) * Math.min(1, dt * 8);
  sim.roll += (targetRoll - sim.roll) * Math.min(1, dt * 7);
  sim.tireWear = Math.min(1, sim.tireWear + (drifting ? dt * 0.04 : dt * 0.008) * Math.abs(sim.speed) / 40);
  const heatIn = (drifting ? 0.12 : 0.03) * Math.abs(sim.speed) / 40;
  const cool = 0.04 * (1 - Math.min(1, Math.abs(sim.speed) / 50));
  sim.tireTemp = clamp(sim.tireTemp + (heatIn - cool) * dt, 0.2, 1);

  if (drifting) {
    sim.drift = Math.min(1, sim.drift + dt * 0.52);
    sim.drifting = true;
  } else {
    if (sim.drifting && sim.drift > 0.28) {
      sim.miniT = 0.45 + sim.drift * 0.9;
      sim.shake = Math.max(sim.shake, 0.4);
      if (sim.bannerT < 0.5) {
        sim.banner = "BOOST";
        sim.bannerT = 0.7;
      }
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(18);
    }
    sim.drifting = false;
    sim.drift = Math.max(0, sim.drift - dt * (drift ? 0.15 : 1.5));
  }
  const recharge = ([0, 18, 14, 11, 8][boostLvl] || 18) / rechargeBonus;
  if (!sim.boostActive) {
    sim.boostCharge = Math.min(1, sim.boostCharge + dt / recharge);
  }
  if (boostKey && !sim.boostActive && sim.boostCharge >= 0.99 && !sim.finished) {
    sim.boostActive = true;
    sim.boostT = 10;
    sim.boostCharge = 0;
    sim.banner = "NITRO";
    sim.bannerT = 1.2;
    sim.shake = Math.max(sim.shake, 0.55);
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate([30, 20, 40]);
  }
  if (sim.boostActive) {
    sim.boostT -= dt;
    if (sim.speed < maxCap * mult) sim.speed += 80 * dt;
    if (sim.boostT <= 0) {
      sim.boostActive = false;
      sim.boostT = 0;
    }
  }
  if (sim.miniT > 0) {
    sim.miniT -= dt;
    const cap = maxCap * (sim.boostActive ? mult : 1.12);
    if (sim.speed < cap) sim.speed += 55 * dt;
  }
  if (sim.slow > 0) {
    sim.slow -= dt;
    sim.speed *= 0.92;
  }
  if (sim.shield > 0) sim.shield -= dt;

  const useWeapon = (id: string) => {
    const n = ctx.items[id] ?? 0;
    if (n <= 0) return false;
    ctx.items[id] = n - 1;
    return true;
  };
  if (oilKey && useWeapon("oil")) {
    const fx = -Math.sin(sim.yaw);
    const fz = -Math.cos(sim.yaw);
    hazards.push({ type: "oil", x: sim.x - fx * 3, z: sim.z - fz * 3, life: 8, vx: 0, vz: 0 });
    sim.banner = "OIL";
    sim.bannerT = 0.6;
  }
  if (missileKey && useWeapon("missile")) {
    const fx = -Math.sin(sim.yaw);
    const fz = -Math.cos(sim.yaw);
    hazards.push({ type: "missile", x: sim.x + fx * 2, z: sim.z + fz * 2, life: 3, vx: fx * 40, vz: fz * 40 });
    sim.banner = "MISSILE";
    sim.bannerT = 0.6;
  }
  if (shieldKey && useWeapon("shield") && sim.shield <= 0) {
    sim.shield = 6;
    sim.banner = "SHIELD";
    sim.bannerT = 0.8;
  }
  if (empKey && useWeapon("emp")) {
    for (const ai of runtime.ai) {
      const dx = ai.x - sim.x;
      const dz = ai.z - sim.z;
      if (dx * dx + dz * dz < 18 * 18) ai.speed *= 0.45;
    }
    sim.banner = "EMP";
    sim.bannerT = 0.8;
  }

  sim.speed = clamp(sim.speed, -maxCap * 0.32, maxCap * (sim.boostActive ? mult : 1));

  const fx = -Math.sin(sim.yaw);
  const fz = -Math.cos(sim.yaw);
  const rx = Math.cos(sim.yaw);
  const rz = -Math.sin(sim.yaw);
  sim.x += (fx * sim.speed + rx * sim.lat) * dt;
  sim.z += (fz * sim.speed + rz * sim.lat) * dt;

  for (let i = hazards.length - 1; i >= 0; i--) {
    const h = hazards[i];
    h.life -= dt;
    if (h.type === "missile") {
      let best: (typeof runtime.ai)[number] | null = null;
      let bestD = 36 * 36;
      for (const ai of runtime.ai) {
        const dx = ai.x - h.x;
        const dz = ai.z - h.z;
        const d2 = dx * dx + dz * dz;
        const ahead = dx * h.vx + dz * h.vz;
        if (d2 < bestD && ahead > -8) {
          bestD = d2;
          best = ai;
        }
      }
      if (best) {
        const dx = best.x - h.x;
        const dz = best.z - h.z;
        const len = Math.hypot(dx, dz) || 1;
        const spd = 46;
        h.vx += ((dx / len) * spd - h.vx) * Math.min(1, dt * 4);
        h.vz += ((dz / len) * spd - h.vz) * Math.min(1, dt * 4);
        if (bestD < 10) {
          best.speed *= 0.32;
          h.life = 0;
          sim.banner = "HIT";
          sim.bannerT = 0.8;
          sim.shake = Math.max(sim.shake, 0.4);
          if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(20);
        }
      }
    }
    h.x += h.vx * dt;
    h.z += h.vz * dt;
    if (h.type === "oil") {
      const dx = sim.x - h.x;
      const dz = sim.z - h.z;
      if (dx * dx + dz * dz < 12 && sim.shield <= 0) {
        sim.speed *= 0.55;
        sim.lat += (Math.random() - 0.5) * 8;
        h.life = 0;
      }
      if (h.life > 0) {
        for (const ai of runtime.ai) {
          const adx = ai.x - h.x;
          const adz = ai.z - h.z;
          if (adx * adx + adz * adz < 14) {
            ai.speed *= 0.5;
            h.life = 0;
            if (sim.bannerT < 0.4) {
              sim.banner = "SLIDE";
              sim.bannerT = 0.6;
            }
            break;
          }
        }
      }
    }
    if (h.life <= 0) hazards.splice(i, 1);
  }

  // Draft: following a car closely gives a small speed bonus.
  for (const ai of runtime.ai) {
    const dx = ai.x - sim.x;
    const dz = ai.z - sim.z;
    const d2 = dx * dx + dz * dz;
    if (d2 < 28 && d2 > 4) {
      const ahead = dx * fx + dz * fz;
      if (ahead > 0 && ahead < 6) sim.speed += 2.2 * dt;
    }
    const min = 2.2;
    if (d2 < min * min && d2 > 1e-5) {
      const d = Math.sqrt(d2);
      const push = min - d;
      sim.x += (dx / d) * push;
      sim.z += (dz / d) * push;
      sim.speed *= 0.99;
    }
  }

  sim.hint = nearestIndex(track, sim.x, sim.z, sim.hint);
  const s = track.samples[sim.hint];
  if (!s) return;
  const latOff = (sim.x - s.x) * s.rx + (sim.z - s.z) * s.rz;
  sim.latOff = latOff;
  const absL = Math.abs(latOff);
  const edge = track.halfWidth;
  const wallAt = edge + track.shoulderW - 1.05;
  sim.off = absL > edge * 0.92;
  let justFinished = false;
  if (!sim.finished) {
    const chasing = sim.heat > 2.2;
    if (sim.off) {
      sim.heat = Math.min(8, sim.heat + dt * 1.6);
    } else if (chasing) {
      sim.heat = Math.max(0, sim.heat - dt * 0.35);
    } else {
      sim.heat = Math.max(0, sim.heat - dt * 0.8);
    }
    if (chasing) {
      if (sim.chaseDist < 4.2) {
        sim.escapeT = Math.min(2, sim.escapeT <= 0 ? 2 : sim.escapeT) - dt;
        sim.banner = `ESCAPE ${Math.max(0, sim.escapeT).toFixed(1)}`;
        sim.bannerT = 0.4;
        if (sim.escapeT <= 0) {
          sim.busted = true;
          sim.finished = true;
          justFinished = true;
          sim.banner = "BUSTED";
          sim.bannerT = 2;
        }
      } else {
        sim.escapeT = 0;
        if (sim.chaseDist > 14) {
          sim.heat = Math.max(0, sim.heat - dt * 1.2);
          if (sim.heat < 2.2) sim.banner = "CLEAR";
        } else if (sim.bannerT < 0.2) {
          sim.banner = "POLICE";
          sim.bannerT = 0.8;
        }
      }
    } else {
      sim.escapeT = 0;
    }
  }
  if (absL > wallAt) {
    const sign = Math.sign(latOff) || 1;
    sim.x = s.x + s.rx * sign * wallAt;
    sim.z = s.z + s.rz * sign * wallAt;
    const ox = s.rx * sign;
    const oz = s.rz * sign;
    const vx = fx * sim.speed + rx * sim.lat;
    const vz = fz * sim.speed + rz * sim.lat;
    const outward = vx * ox + vz * oz;
    if (outward > 0) {
      const nvx = vx - ox * outward;
      const nvz = vz - oz * outward;
      sim.speed = nvx * fx + nvz * fz;
      sim.lat = nvx * rx + nvz * rz;
      if (outward > 5 && sim.hitCd <= 0) {
        sim.damage = Math.min(1, sim.damage + 0.08);
        sim.shake = Math.min(1, 0.3 + outward * 0.02);
        sim.hitCd = 0.45;
        audio.bump();
        if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(25);
      }
    }
  }
  sim.y += ((s.y) - sim.y) * (1 - Math.exp(-12 * dt));
  const u = progressAt(track, sim.x, sim.z, sim.hint);
  sim.u = u;

  sim.hitCd = Math.max(0, sim.hitCd - dt);
  sim.padCd = Math.max(0, sim.padCd - dt);
  sim.lapFlash = Math.max(0, sim.lapFlash - dt);
  sim.bannerT = Math.max(0, sim.bannerT - dt);
  sim.shake = Math.max(0, sim.shake - dt * 1.8);

  if (!sim.armed) {
    sim.armed = true;
    sim.prevU = u;
  } else if (!sim.finished) {
    let dlt = u - sim.prevU;
    if (dlt > 0.5) dlt -= 1;
    if (dlt < -0.5) dlt += 1;
    if (dlt < -0.002) sim.wrong = Math.min(2, sim.wrong + dt);
    else sim.wrong = Math.max(0, sim.wrong - dt * 2);

    if (dlt < 0.25) {
      let guard = 0;
      while (guard++ < 4 && crossed(sim.prevU, u, CP[sim.nextCp])) {
        sim.lastU = CP[sim.nextCp];
        sim.nextCp += 1;
        if (sim.nextCp >= CP.length) {
          sim.nextCp = 0;
          const completed = sim.lapTime;
          if (completed > 8 && (sim.bestLap <= 0 || completed < sim.bestLap)) {
            sim.newRecord = true;
            sim.bestLap = completed;
          }
          sim.lastLap = completed;
          sim.lap += 1;
          if (sim.lap >= LAPS) {
            sim.finished = true;
            justFinished = true;
            sim.banner = "FINISH";
            sim.bannerT = 2;
          } else {
            sim.lapTime = 0;
            sim.banner = `LAP ${sim.lap + 1}`;
            sim.bannerT = 1.25;
            sim.lapFlash = 1.25;
          }
        }
        sim.prevU = CP[(sim.nextCp - 1 + CP.length) % CP.length];
      }
    }
    sim.prevU = u;
    sim.lapTime += dt;
    sim.raceTime += dt;

    if (sim.padCd <= 0 && absL < edge) {
      for (const gate of PAD_U) {
        if (crossed(sim.prevU, u, gate) || crossed((u - dlt + 1) % 1, u, gate)) {
          sim.speed = Math.min(maxCap * 1.06, Math.max(0, sim.speed) + 11);
          sim.padCd = 1;
          if (sim.bannerT < 0.4) {
            sim.banner = "BOOST";
            sim.bannerT = 0.55;
          }
          break;
        }
      }
    }
  } else {
    sim.finishHold += dt;
    sim.raceTime += 0;
  }

  const diff = ctx.difficulty === "casual" ? 0.84 : ctx.difficulty === "elite" ? 1.05 : 0.95;
  const aiBoost = ctx.difficulty === "elite" || (ctx.items.nitro ?? 0) >= 2;
  const youT = sim.lap + sim.u;
  for (const ai of runtime.ai) {
    const a = sampleAt(track, ai.u, tmpA);
    const b = sampleAt(track, ai.u + 0.014, tmpB);
    const dot = clamp(a.tx * b.tx + a.tz * b.tz, -1, 1);
    const turnAmt = clamp(1 - dot, 0, 1);
    let target = track.cruise * ai.skill * diff * (1 - turnAmt * 0.55);
    if (turnAmt > 0.35) target *= 0.82;
    if (aiBoost && ai.u > 0.3 && ai.u < 0.4 && ai.speed < target * 1.4) target *= 1.35;
    if (ctx.weather === "rain") target *= 0.9;
    // Rubber-band + engage from the bike game: keep the field together, always winnable.
    const gap = youT - (ai.lap + ai.u);
    if (gap > 0.06) target *= 1 - Math.min(0.18, (gap - 0.06) * 2);
    else if (gap < -0.05) target *= 1 + Math.min(0.12, (-gap - 0.05) * 1.5);
    // Engage: AI gets slightly more aggressive when close and player is not pulling away hard.
    if (Math.abs(gap) < 0.03 && ai.speed > 12) target *= 1.04;
    target = Math.min(target, track.cruise * 0.97);
    const dx = sim.x - ai.x;
    const dz = sim.z - ai.z;
    const dist2 = dx * dx + dz * dz;
    if (dist2 < 36 && gap > -0.02 && gap < 0.02) {
      const ahead = dx * (-Math.sin(ai.yaw)) + dz * (-Math.cos(ai.yaw));
      if (ahead > 0) target *= 1.06;
      else target *= 0.94;
    }
    ai.speed += (target - ai.speed) * Math.min(1, dt * 1.6);
    ai.totalU += (ai.speed / track.length) * dt;
    ai.lap = Math.floor(ai.totalU);
    ai.u = ai.totalU - ai.lap;
    let lat = Math.sin(ai.totalU * Math.PI * 6 + ai.phase) * (track.halfWidth * 0.38);
    if (dist2 < 25 && gap > -0.01 && gap < 0.015) lat += Math.sign(ai.phase - 2) * 1.2;
    placeAi(track, ai, lat);
  }

  if (!sim.finished || justFinished) sim.place = fieldPlace();

  for (let i = 0; i < runtime.ai.length; i++) {
    const ai = runtime.ai[i];
    const p = poses[i + 1];
    p.x = ai.x;
    p.y = ai.y;
    p.z = ai.z;
    p.yaw = ai.yaw;
    p.speed = ai.speed;
    p.steer = Math.sin(ai.totalU * 9 + ai.phase) * 0.25;
    p.visible = runtime.phase !== "replay";
    p.boost = 0;
    p.drift = Math.abs(p.steer);
    p.brake = 0;
  }
  writePlayerPose(steer, brake);

  if (!sim.finished) {
    sim.recAcc += dt;
    if (sim.recAcc >= 0.1) {
      sim.recAcc = 0;
      runtime.recording.push({ t: sim.raceTime, x: sim.x, y: sim.y, z: sim.z, yaw: sim.yaw });
    }
  }

  const ghostPose = poses[6];
  const ghost = runtime.ghost;
  if (ctx.ghost && ghost.length > 2 && !sim.finished && runtime.phase === "race") {
    const t = sim.raceTime;
    let i = 0;
    while (i < ghost.length - 2 && ghost[i + 1].t < t) i++;
    const a = ghost[i];
    const b = ghost[Math.min(i + 1, ghost.length - 1)];
    const span = Math.max(0.0001, b.t - a.t);
    const k = clamp((t - a.t) / span, 0, 1);
    ghostPose.x = a.x + (b.x - a.x) * k;
    ghostPose.y = a.y + (b.y - a.y) * k;
    ghostPose.z = a.z + (b.z - a.z) * k;
    ghostPose.yaw = a.yaw + (b.yaw - a.yaw) * k;
    ghostPose.visible = t <= ghost[ghost.length - 1].t;
    ghostPose.speed = 20;
  } else if (runtime.phase !== "replay") {
    ghostPose.visible = false;
  }

  audio.update(sim.speed, throttle, sim.drifting, sim.boostT > 0, sim.u > 0.15 && sim.u < 0.25);
}

export function hudSnapshot() {
  const s = runtime.sim;
  const sp = Math.abs(s.speed);
  let ghostDelta = 0;
  const ghost = runtime.ghost;
  if (ghost.length > 8 && !s.finished) {
    let bestD2 = 1e9;
    let bestT = 0;
    const px = s.x, pz = s.z;
    for (let i = 0; i < ghost.length; i += 2) {
      const g = ghost[i];
      const dx = g.x - px, dz = g.z - pz;
      const d2 = dx * dx + dz * dz;
      if (d2 < bestD2) { bestD2 = d2; bestT = g.t; }
    }
    if (bestD2 < 220) ghostDelta = s.raceTime - bestT;
  }
  return {
    speed: Math.round(sp * 3.6),
    gear: s.gear,
    lap: Math.min(LAPS, s.finished ? LAPS : s.lap + 1),
    laps: LAPS,
    lapTime: s.lapTime,
    bestLap: s.bestLap,
    lastLap: s.lastLap,
    raceTime: s.finished ? s.raceTime : s.raceTime,
    place: s.place,
    total: runtime.ai.length + 1,
    drift: s.drift,
    boost: s.boostActive ? clamp(s.boostT / 10, 0, 1) : s.boostCharge,
    damage: s.damage,
    tire: s.tireWear,
    temp: s.tireTemp,
    wrong: s.wrong > 0.35,
    off: s.off,
    banner: s.bannerT > 0 ? s.banner : "",
    finished: s.finished,
    newRecord: s.newRecord,
    shake: s.shake,
    ghostDelta,
  };
}

export type HudSnap = ReturnType<typeof hudSnapshot>;

let bound = false;
export function bindInput() {
  if (bound || typeof window === "undefined") return;
  bound = true;
  const down = (e: KeyboardEvent) => {
    if (runtime.phase === "race" && (e.code === "Space" || e.code.startsWith("Arrow"))) e.preventDefault();
    runtime.keys.add(e.code);
    if (e.repeat) return;
    if (e.code === "KeyC" && runtime.phase === "race") runtime.camEdge = true;
    if (e.code === "KeyR" && runtime.phase === "race") runtime.respawnEdge = true;
    if (e.code === "Escape") runtime.pauseEdge = true;
  };
  const up = (e: KeyboardEvent) => runtime.keys.delete(e.code);
  window.addEventListener("keydown", down);
  window.addEventListener("keyup", up);
  window.addEventListener("blur", () => runtime.keys.clear());
  window.addEventListener("pointerdown", () => audio.unlock(), { once: true });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) runtime.keys.clear();
    else audio.resume();
  });
}

declare global {
  interface Window {
    __controlsTest?: {
      getYaw: () => number;
      getSpeed: () => number;
      setSteer?: (v: number) => void;
      setKeys?: (codes: string[]) => void;
    };
    __halcyonPerf?: { fps: number; frameMs: number };
  }
}

if (typeof window !== "undefined") {
  window.__controlsTest = {
    getYaw: () => runtime.sim.yaw,
    getSpeed: () => runtime.sim.speed,
    setSteer: (v: number) => {
      runtime.steerOverride = v;
    },
    setKeys: (codes: string[]) => {
      runtime.qaKeys = codes.slice();
    },
  };
  window.__halcyonPerf = { fps: 0, frameMs: 0 };
}
