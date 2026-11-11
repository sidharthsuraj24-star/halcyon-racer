import { create } from "zustand";
import { audio, setMix } from "@/game/audio";
import { hudSnapshot, poses, reset, runtime, type HudSnap } from "@/game/runtime";

export type Phase = "menu" | "race" | "paused" | "results" | "replay";
export type CamMode = "chase" | "fpp" | "hood" | "tower";
export type Weather = "clear" | "rain";
export type TimeOfDay = "day" | "dusk" | "night";
export type Quality = "high" | "medium" | "low";
export type Difficulty = "casual" | "sport" | "elite";

export type SaveData = {
  version: 2;
  credits: number;
  races: number;
  wins: number;
  series: number;
  seriesWins: number;
  bestLap: Record<string, number>;
  bestRace: Record<string, number>;
  boostLevel: number;
  items: Record<string, number>;
};

export type Results = {
  place: number;
  total: number;
  raceTime: number;
  bestLap: number;
  credits: number;
  newRecord: boolean;
  trackId: string;
  busted: boolean;
  seriesUp: boolean;
};

const SAVE_KEY = "halcyon-save-v1";
const SETTINGS_KEY = "halcyon-settings-v1";

const emptySave = (): SaveData => ({
  version: 2,
  credits: 0,
  races: 0,
  wins: 0,
  series: 1,
  seriesWins: 0,
  bestLap: {},
  bestRace: {},
  boostLevel: 1,
  items: {},
});

function num(v: unknown, fallback: number, min: number, max: number) {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function cleanRecord(raw: unknown) {
  const out: Record<string, number> = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const n = num(v, 0, 0, 86400);
    if (n > 0) out[k] = n;
  }
  return out;
}

function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return emptySave();
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    if (parsed.version !== 2 && parsed.version !== 1) return emptySave();
    const items: Record<string, number> = {};
    if (parsed.items && typeof parsed.items === "object") {
      for (const [k, v] of Object.entries(parsed.items)) items[k] = num(v, 0, 0, 5);
    }
    return {
      ...emptySave(),
      credits: num(parsed.credits, 0, 0, 1e7),
      races: Math.floor(num(parsed.races, 0, 0, 1e6)),
      wins: Math.floor(num(parsed.wins, 0, 0, 1e6)),
      series: Math.floor(num(parsed.series, 1, 1, 999)),
      seriesWins: Math.floor(num(parsed.seriesWins, 0, 0, 100)),
      bestLap: cleanRecord(parsed.bestLap),
      bestRace: cleanRecord(parsed.bestRace),
      boostLevel: Math.floor(num(parsed.boostLevel, 1, 1, 4)),
      items,
    };
  } catch {
    return emptySave();
  }
}

function writeSave(save: SaveData) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    /* private mode / quota */
  }
}

type State = {
  phase: Phase;
  trackId: string;
  carId: string;
  camera: CamMode;
  weather: Weather;
  time: TimeOfDay;
  quality: Quality;
  difficulty: Difficulty;
  volume: number;
  muted: boolean;
  ghost: boolean;
  save: SaveData;
  hud: HudSnap;
  results: Results | null;
  panel: "none" | "settings" | "board" | "shop";
  hydrate: () => void;
  setTrack: (id: string) => void;
  setCar: (id: string) => void;
  setWeather: (w: Weather) => void;
  setTime: (t: TimeOfDay) => void;
  setQuality: (q: Quality) => void;
  setDifficulty: (d: Difficulty) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  toggleGhost: () => void;
  cycleCamera: () => void;
  setCamera: (c: CamMode) => void;
  setPanel: (p: State["panel"]) => void;
  buyItem: (id: string) => boolean;
  upgradeBoost: () => boolean;
  startRace: () => void;
  pause: () => void;
  resume: () => void;
  retire: () => void;
  completeRace: () => void;
  replay: () => void;
  exitReplay: () => void;
  pushHud: () => void;
};

const CAMS: CamMode[] = ["chase", "fpp", "hood", "tower"];

export const BOOST_WINS: Record<number, number> = { 2: 5, 3: 15, 4: 30 };
export const BOOST_COST: Record<number, number> = { 2: 200, 3: 500, 4: 900 };
export const BOOST_MULT: Record<number, number> = { 1: 1.22, 2: 1.3, 3: 1.38, 4: 1.48 };
export const BOOST_RECHARGE: Record<number, number> = { 1: 18, 2: 14, 3: 11, 4: 8 };

export type ShopItem = { id: string; name: string; blurb: string; cost: number; max: number; effect: string };
export const SHOP: ShopItem[] = [
  { id: "grip", name: "Grip Kit", blurb: "Tighter corners. Less slide on exit.", cost: 120, max: 3, effect: "grip" },
  { id: "turbo", name: "Turbo Inlet", blurb: "Faster launch and mid-range pull.", cost: 150, max: 3, effect: "accel" },
  { id: "armor", name: "Armor Plate", blurb: "Wall hits hurt less.", cost: 100, max: 3, effect: "armor" },
  { id: "nitro", name: "Nitro Tank", blurb: "Boost recharges faster.", cost: 180, max: 3, effect: "recharge" },
  { id: "aero", name: "Downforce", blurb: "Higher stable top speed.", cost: 200, max: 3, effect: "speed" },
  { id: "oil", name: "Oil Slick", blurb: "Drop oil. Cars that hit it slide.", cost: 80, max: 5, effect: "weapon" },
  { id: "missile", name: "Missile", blurb: "Fire at the car ahead.", cost: 120, max: 5, effect: "weapon" },
  { id: "shield", name: "Shield", blurb: "Block one hit or missile.", cost: 100, max: 5, effect: "weapon" },
  { id: "emp", name: "EMP Pulse", blurb: "Slow every car near you.", cost: 140, max: 5, effect: "weapon" },
];

function applyMix(volume: number, muted: boolean) {
  setMix(volume, muted);
}

export const useGame = create<State>((set, get) => ({
  phase: "menu",
  trackId: "harbor",
  carId: "solstice",
  camera: "chase",
  weather: "clear",
  time: "night",
  quality: "high",
  difficulty: "sport",
  volume: 0.7,
  muted: false,
  ghost: true,
  save: emptySave(),
  hud: hudSnapshot(),
  results: null,
  panel: "none",
  hydrate: () => {
    const save = loadSave();
    let next: Partial<State> = { save };
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const s = JSON.parse(raw) as Partial<State>;
        next = {
          ...next,
          trackId: s.trackId || "harbor",
          carId: s.carId || "solstice",
          camera: s.camera || "chase",
          weather: s.weather || "clear",
          time: s.time || "night",
          quality: s.quality || (window.innerWidth < 800 ? "low" : "high"),
          difficulty: s.difficulty || "sport",
          volume: typeof s.volume === "number" ? s.volume : 0.7,
          muted: Boolean(s.muted),
          ghost: s.ghost !== false,
        };
      } else if (window.innerWidth < 800) {
        next.quality = "low";
      }
    } catch {
      /* keep defaults */
    }
    set(next);
    const st = get();
    applyMix(st.volume, st.muted);
    runtime.phase = "menu";
    reset(st.trackId, save.bestLap[st.trackId] ?? 0);
  },
  setTrack: (id) => {
    const save = get().save;
    const metaTime = id === "gulch" || id === "spine" || id === "laguna" ? "dusk" : id === "meridian" || id === "alto" || id === "nurburg" || id === "spa" || id === "suzuka" ? "day" : "night";
    set({ trackId: id, time: metaTime });
    reset(id, save.bestLap[id] ?? 0);
    runtime.ghost = runtime.ghosts[id] ?? [];
    persist(get());
  },
  setCar: (id) => {
    set({ carId: id });
    persist(get());
  },
  setWeather: (weather) => {
    set({ weather });
    persist(get());
  },
  setTime: (time) => {
    set({ time });
    persist(get());
  },
  setQuality: (quality) => {
    set({ quality });
    persist(get());
  },
  setDifficulty: (difficulty) => {
    set({ difficulty });
    persist(get());
  },
  setVolume: (volume) => {
    set({ volume });
    applyMix(volume, get().muted);
    persist(get());
  },
  toggleMute: () => {
    const muted = !get().muted;
    set({ muted });
    applyMix(get().volume, muted);
    persist(get());
  },
  toggleGhost: () => {
    set({ ghost: !get().ghost });
    persist(get());
  },
  cycleCamera: () => {
    const i = CAMS.indexOf(get().camera);
    const camera = CAMS[(i + 1) % CAMS.length];
    set({ camera });
    runtime.snapCam = true;
  },
  setCamera: (camera) => {
    set({ camera });
    runtime.snapCam = true;
    persist(get());
  },
  setPanel: (panel) => set({ panel }),
  buyItem: (id) => {
    const st = get();
    const item = SHOP.find((i) => i.id === id);
    if (!item) return false;
    const owned = st.save.items[id] ?? 0;
    if (owned >= item.max) return false;
    if (!Number.isFinite(st.save.credits) || st.save.credits < item.cost) return false;
    const save: SaveData = {
      ...st.save,
      credits: st.save.credits - item.cost,
      items: { ...st.save.items, [id]: owned + 1 },
    };
    writeSave(save);
    set({ save });
    return true;
  },
  upgradeBoost: () => {
    const st = get();
    const next = st.save.boostLevel + 1;
    const req = BOOST_WINS[next];
    if (req == null || st.save.wins < req) return false;
    const cost = BOOST_COST[next] ?? 0;
    if (st.save.credits < cost || !Number.isFinite(st.save.credits)) return false;
    const save: SaveData = { ...st.save, boostLevel: next, credits: st.save.credits - cost };
    writeSave(save);
    set({ save });
    return true;
  },
  startRace: () => {
    const st = get();
    audio.unlock();
    reset(st.trackId, st.save.bestLap[st.trackId] ?? 0);
    runtime.countdown = 3.2;
    runtime.sim.banner = "3";
    runtime.sim.bannerT = 1;
    runtime.phase = "race";
    const loadout: Record<string, number> = {};
    for (const [k, v] of Object.entries(st.save.items ?? {})) {
      const n = typeof v === "number" ? v : Number(v);
      if (Number.isFinite(n) && n >= 1) loadout[k] = Math.min(5, Math.floor(n));
    }
    runtime.loadout = loadout;
    runtime.weaponHeld = { oil: false, missile: false, shield: false, emp: false };
    runtime.ghost = st.ghost ? (runtime.ghosts[st.trackId] ?? []) : [];
    audio.start();
    set({ phase: "race", panel: "none", results: null });
    get().pushHud();
  },
  pause: () => {
    runtime.phase = "paused";
    set({ phase: "paused" });
  },
  resume: () => {
    runtime.phase = "race";
    set({ phase: "race" });
  },
  retire: () => {
    const st = get();
    const items = { ...st.save.items };
    for (const id of ["oil", "missile", "shield", "emp"]) items[id] = runtime.loadout[id] ?? items[id] ?? 0;
    const save: SaveData = { ...st.save, items };
    writeSave(save);
    runtime.phase = "menu";
    reset(st.trackId, save.bestLap[st.trackId] ?? 0);
    runtime.ghost = runtime.ghosts[st.trackId] ?? [];
    set({ phase: "menu", panel: "none", save });
  },
  completeRace: () => {
    const st = get();
    const sim = runtime.sim;
    const place = sim.place;
    const mult = st.difficulty === "elite" ? 1.4 : st.difficulty === "casual" ? 0.8 : 1;
    const table = [0, 140, 90, 60, 40, 32, 28];
    const nextSeriesWins = sim.busted ? (st.save.seriesWins ?? 0) : (st.save.seriesWins ?? 0) + (place <= 3 ? 1 : 0);
    const seriesUp = nextSeriesWins >= 6;
    const credits = sim.busted ? 0 : Math.round((table[place] ?? 28) * mult) + (seriesUp ? 250 : 0);
    const items = { ...st.save.items };
    for (const id of ["oil", "missile", "shield", "emp"]) items[id] = runtime.loadout[id] ?? items[id] ?? 0;
    const save: SaveData = {
      ...st.save,
      items,
      credits: st.save.credits + credits,
      races: st.save.races + 1,
      wins: st.save.wins + (place === 1 && !sim.busted ? 1 : 0),
      series: seriesUp ? (st.save.series ?? 1) + 1 : (st.save.series ?? 1),
      seriesWins: seriesUp ? 0 : nextSeriesWins,
      bestLap: { ...st.save.bestLap },
      bestRace: { ...st.save.bestRace },
    };
    if (sim.bestLap > 8 && (save.bestLap[st.trackId] == null || sim.bestLap < save.bestLap[st.trackId])) {
      save.bestLap[st.trackId] = sim.bestLap;
    }
    const raceTime = sim.raceTime;
    if (raceTime > 15 && (save.bestRace[st.trackId] == null || raceTime < save.bestRace[st.trackId])) {
      save.bestRace[st.trackId] = raceTime;
    }
    writeSave(save);
    const prevBest = st.save.bestRace[st.trackId];
    if (!sim.busted && raceTime > 15 && (prevBest == null || raceTime <= prevBest)) {
      runtime.ghosts[st.trackId] = runtime.recording.slice();
    }
    runtime.ghost = runtime.ghosts[st.trackId] ?? [];
    runtime.finishPose = { x: sim.x, y: sim.y, z: sim.z, yaw: sim.yaw };
    runtime.phase = "results";
    audio.finish();
    set({
      phase: "results",
      save,
      results: {
        place,
        total: runtime.ai.length + 1,
        raceTime,
        bestLap: sim.bestLap,
        credits,
        newRecord: sim.newRecord,
        trackId: st.trackId,
        busted: sim.busted,
        seriesUp,
      },
    });
  },
  replay: () => {
    const tape = runtime.recording.length > 2 ? runtime.recording : runtime.ghost;
    if (tape.length < 2) return;
    runtime.replayTape = tape.slice();
    runtime.replayT = 0;
    runtime.replayIx = 0;
    runtime.phase = "replay";
    set({ phase: "replay" });
  },
  exitReplay: () => {
    const fp = runtime.finishPose;
    runtime.phase = "results";
    runtime.sim.x = fp.x;
    runtime.sim.y = fp.y;
    runtime.sim.z = fp.z;
    runtime.sim.yaw = fp.yaw;
    poses[0].x = fp.x;
    poses[0].y = fp.y;
    poses[0].z = fp.z;
    poses[0].yaw = fp.yaw;
    poses[0].visible = true;
    for (let i = 1; i <= 5; i++) poses[i].visible = true;
    set({ phase: "results" });
  },
  pushHud: () => set({ hud: hudSnapshot() }),
}));

function persist(st: State) {
  try {
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        trackId: st.trackId,
        carId: st.carId,
        camera: st.camera,
        weather: st.weather,
        time: st.time,
        quality: st.quality,
        difficulty: st.difficulty,
        volume: st.volume,
        muted: st.muted,
        ghost: st.ghost,
      }),
    );
  } catch {
    /* ignore quota */
  }
}
