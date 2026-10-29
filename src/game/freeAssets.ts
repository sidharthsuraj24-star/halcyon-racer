import * as THREE from "three";

export function loftBody(width: number, length: number, height: number): THREE.BufferGeometry {
  const profile: [number, number][] = [
    [0.48, 0.18], [0.42, 0.32], [0.22, 0.38], [0.05, 0.62],
    [-0.08, 0.68], [-0.22, 0.55], [-0.38, 0.36], [-0.46, 0.2],
  ];
  const n = profile.length;
  const pos: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i < n; i++) {
    const [z, y] = profile[i];
    const zz = z * length;
    const yy = y * height;
    const w = width * (0.72 + (1 - Math.abs(z) * 1.4) * 0.18);
    pos.push(-w, yy, zz, w, yy, zz);
  }
  for (let i = 0; i < n - 1; i++) {
    const a = i * 2;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const crushed = pos.map((v, i) => (i % 3 === 1 ? v * 0.72 : v));
  g.morphAttributes.position = [new THREE.Float32BufferAttribute(crushed, 3)];
  return g;
}

export function driverPose(steer: number, speed: number) {
  return {
    headYaw: -steer * 0.22,
    lean: steer * 0.08,
    bounce: Math.sin(speed * 0.4) * 0.012,
  };
}
