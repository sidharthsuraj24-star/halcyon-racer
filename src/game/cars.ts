export type CarSpec = {
  id: string;
  name: string;
  cls: string;
  blurb: string;
  paint: string;
  accent: string;
  glass: string;
  accel: number;
  brake: number;
  maxSpeed: number;
  grip: number;
  turn: number;
  width: number;
  length: number;
  height: number;
  cabin: number;
  wing: number;
};

export const CARS: CarSpec[] = [
  { id: "solstice", name: "Solstice GT", cls: "Grand tourer", blurb: "Balanced.", paint: "#d4a45a", accent: "#1a1208", glass: "#1b242e", accel: 32, brake: 50, maxSpeed: 64, grip: 7.6, turn: 2.05, width: 1.92, length: 4.55, height: 0.38, cabin: 0.38, wing: 0.45 },
  { id: "marlowe", name: "Marlowe S", cls: "Coupe", blurb: "High grip.", paint: "#e4ddd2", accent: "#2a241c", glass: "#243038", accel: 28, brake: 52, maxSpeed: 61, grip: 9.4, turn: 2.15, width: 1.84, length: 4.4, height: 0.46, cabin: 0.5, wing: 0.18 },
  { id: "kite", name: "Kite RS", cls: "Hatch", blurb: "Violent launch.", paint: "#e07a3d", accent: "#2a1208", glass: "#1a1816", accel: 41, brake: 48, maxSpeed: 60, grip: 6.7, turn: 2.0, width: 1.88, length: 4.15, height: 0.48, cabin: 0.46, wing: 0.72 },
  { id: "bruma", name: "Bruma V12", cls: "Muscle", blurb: "Owns the straight.", paint: "#6e2422", accent: "#1a0c0c", glass: "#140e0e", accel: 26, brake: 46, maxSpeed: 73, grip: 6.3, turn: 1.82, width: 1.98, length: 4.95, height: 0.4, cabin: 0.28, wing: 0.12 },
  { id: "vellum", name: "Vellum R", cls: "Prototype", blurb: "Light nose.", paint: "#8fb4c9", accent: "#102028", glass: "#0e1a22", accel: 30, brake: 50, maxSpeed: 63, grip: 8.1, turn: 2.42, width: 1.9, length: 4.35, height: 0.32, cabin: 0.62, wing: 0.9 },
  { id: "orrix", name: "Orrix", cls: "Drift", blurb: "Loose rear.", paint: "#17191e", accent: "#d4a45a", glass: "#0e1014", accel: 34, brake: 47, maxSpeed: 62, grip: 4.6, turn: 2.28, width: 2.02, length: 4.48, height: 0.34, cabin: 0.44, wing: 1 },
  { id: "cinder", name: "Cinder", cls: "Rally", blurb: "Raised ride.", paint: "#c4552a", accent: "#24140e", glass: "#1c1612", accel: 36, brake: 54, maxSpeed: 59, grip: 7.1, turn: 2.1, width: 1.86, length: 4.2, height: 0.52, cabin: 0.48, wing: 0.28 },
  { id: "nimbus", name: "Nimbus", cls: "Feather", blurb: "Short wheelbase.", paint: "#c5ccd4", accent: "#1c242c", glass: "#12181e", accel: 33, brake: 49, maxSpeed: 58, grip: 6.9, turn: 2.36, width: 1.78, length: 4.02, height: 0.36, cabin: 0.55, wing: 0.55 },
];

export const AI_NAMES = ["VALE", "NOUR", "IDRIS", "SERA", "JONAH"] as const;
export function carById(id: string) { return CARS.find((c) => c.id === id) ?? CARS[0]; }
export const STAT_CAPS = { accel: 41, maxSpeed: 73, grip: 9.4, turn: 2.42 };
