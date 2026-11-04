import { useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { Decor, Track } from "@/game/tracks";

function useAsphalt(base: string, line: string) {
  const tex = useMemo(() => {
    if (typeof document === "undefined") return null;
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 256;
    const g = c.getContext("2d");
    if (!g) return null;
    g.fillStyle = base;
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 1800; i++) {
      const x = (i * 47) % 256;
      const y = (i * 91) % 256;
      const v = 40 + ((i * 13) % 40);
      g.fillStyle = `rgba(${v},${v},${v},0.18)`;
      g.fillRect(x, y, 2, 2);
    }
    g.fillStyle = line;
    g.fillRect(0, 0, 12, 256);
    g.fillRect(244, 0, 12, 256);
    g.fillRect(120, 18, 16, 108);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, [base, line]);
  useEffect(() => () => tex?.dispose(), [tex]);
  return tex;
}

function Instances({
  items,
  children,
}: {
  items: Decor[];
  children: ReactNode;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    items.forEach((item, i) => {
      dummy.position.set(item.x, item.y, item.z);
      dummy.scale.set(item.s, item.h, item.s);
      dummy.rotation.set(0, item.rot || 0, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [items]);
  if (items.length === 0) return null;
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]} frustumCulled={false}>
      {children}
    </instancedMesh>
  );
}

function Chevrons({ items }: { items: Decor[] }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    const qy = new THREE.Quaternion();
    const qx = new THREE.Quaternion();
    const q = new THREE.Quaternion();
    const axisY = new THREE.Vector3(0, 1, 0);
    const axisX = new THREE.Vector3(1, 0, 0);
    items.forEach((item, i) => {
      qy.setFromAxisAngle(axisY, item.rot);
      qx.setFromAxisAngle(axisX, Math.PI / 2);
      q.multiplyQuaternions(qy, qx);
      dummy.position.set(item.x, item.y + 0.15, item.z);
      dummy.quaternion.copy(q);
      dummy.scale.set(0.85, 1.5, 0.85);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [items]);
  if (items.length === 0) return null;
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]}>
      <coneGeometry args={[0.55, 1.3, 4]} />
      <meshStandardMaterial color="#d4a45a" emissive="#d4a45a" emissiveIntensity={0.25} roughness={0.45} />
    </instancedMesh>
  );
}

function Water({ radius, color }: { radius: number; color: string }) {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        toneMapped: false,
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: new THREE.Color(color) },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float uTime;
          uniform vec3 uColor;
          varying vec2 vUv;
          void main() {
            float w = sin(vUv.x * 90.0 + uTime * 0.7) * sin(vUv.y * 50.0 - uTime * 0.45);
            float shine = smoothstep(0.55, 1.0, w);
            gl_FragColor = vec4(uColor + shine * 0.22, 0.92);
          }
        `,
      }),
    [color],
  );
  useFrame((_, dt) => {
    mat.uniforms.uTime.value += dt;
  });
  useEffect(() => () => mat.dispose(), [mat]);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.35, 0]} material={mat}>
      <circleGeometry args={[radius, 64]} />
    </mesh>
  );
}

function Gantry({ track }: { track: Track }) {
  const s = track.samples[0];
  if (!s) return null;
  const target = useMemo(() => new THREE.Object3D(), []);
  const checker = useMemo(() => {
    if (typeof document === "undefined") return null;
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 32;
    const g = c.getContext("2d");
    if (!g) return null;
    for (let i = 0; i < 16; i++) {
      g.fillStyle = i % 2 ? "#0b0e12" : "#f3ede4";
      g.fillRect(i * 16, 0, 16, 32);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  useEffect(() => () => checker?.dispose(), [checker]);
  const span = track.halfWidth * 2 + 2.2;
  return (
    <group position={[s.x, s.y, s.z]} rotation={[0, s.heading, 0]}>
      <mesh position={[-track.halfWidth - 0.7, 2.4, 0]} castShadow>
        <boxGeometry args={[0.45, 4.8, 0.45]} />
        <meshStandardMaterial color="#1a2028" roughness={0.8} />
      </mesh>
      <mesh position={[track.halfWidth + 0.7, 2.4, 0]} castShadow>
        <boxGeometry args={[0.45, 4.8, 0.45]} />
        <meshStandardMaterial color="#1a2028" roughness={0.8} />
      </mesh>
      <mesh position={[0, 4.7, 0]} castShadow>
        <boxGeometry args={[span, 0.55, 0.55]} />
        <meshStandardMaterial map={checker ?? undefined} color="#ffffff" roughness={0.6} />
      </mesh>
      <primitive object={target} position={[0, 1.2, 40]} />
      <spotLight position={[-1.6, 4.2, 0.4]} target={target} angle={0.55} penumbra={0.5} distance={70} intensity={16} color="#fff1d2" />
      <spotLight position={[1.6, 4.2, 0.4]} target={target} angle={0.55} penumbra={0.5} distance={70} intensity={16} color="#fff1d2" />
      <mesh position={[track.halfWidth + 7.5, 0.7, -6]} castShadow>
        <boxGeometry args={[4.2, 1.4, 16]} />
        <meshStandardMaterial color="#1c222b" roughness={0.9} />
      </mesh>
      <mesh position={[track.halfWidth + 7.2, 1.7, -6]}>
        <boxGeometry args={[3.4, 0.55, 14]} />
        <meshStandardMaterial color="#2a3140" roughness={0.85} />
      </mesh>
    </group>
  );
}

function Forest({ track }: { track: Track }) {
  if (track.prop === "harbor") {
    const trunks = track.trees.map((t) => ({
      ...t,
      y: t.y + t.h * 1.25,
      h: Math.max(1.8, t.h * 2.5),
      s: 0.18,
    }));
    return (
      <>
        <Instances items={trunks}>
          <cylinderGeometry args={[1, 1.15, 1, 6]} />
          <meshStandardMaterial color="#6a5038" roughness={0.9} />
        </Instances>
        <PalmCrowns trees={track.trees} />
      </>
    );
  }
  const lifted = track.trees.map((t) => ({ ...t, y: t.y + t.h * 0.5 }));
  if (track.prop === "canyon") {
    return (
      <Instances items={lifted}>
        <coneGeometry args={[1.1, 1, 5]} />
        <meshStandardMaterial color="#6a4636" roughness={1} />
      </Instances>
    );
  }
  return (
    <Instances items={lifted}>
      <coneGeometry args={[1.15, 1, 6]} />
      <meshStandardMaterial color="#2d4638" roughness={0.85} />
    </Instances>
  );
}

function PalmCrowns({ trees }: { trees: Decor[] }) {
  const shifted = useMemo(
    () => trees.map((t) => ({ ...t, y: t.y + t.h * 2.1, h: t.h * 0.7 })),
    [trees],
  );
  return (
    <Instances items={shifted}>
      <sphereGeometry args={[0.7, 8, 6]} />
      <meshStandardMaterial color="#1f6a48" roughness={0.75} />
    </Instances>
  );
}

function Crowd({ track }: { track: Track }) {
  const people = useMemo(() => {
    const out: Decor[] = [];
    const n = track.samples.length;
    for (let i = 20; i < n; i += 28) {
      const s = track.samples[i];
      if (!s) continue;
      const side = i % 56 === 0 ? 1 : -1;
      const dist = track.halfWidth + track.shoulderW + 2.2;
      for (let k = 0; k < 3; k++) {
        out.push({
          x: s.x + s.rx * side * (dist + k * 0.6),
          y: s.y,
          z: s.z + s.rz * side * (dist + k * 0.4),
          s: 0.35,
          h: 1.6 + (k % 2) * 0.15,
          rot: s.heading + (side > 0 ? 0 : Math.PI),
        });
      }
    }
    return out;
  }, [track]);
  const cheer = useMemo(() => {
    const out: Decor[] = [];
    const n = track.samples.length;
    for (let i = 40; i < n; i += 90) {
      const s = track.samples[i];
      if (!s) continue;
      const side = i % 180 === 0 ? -1 : 1;
      const dist = track.halfWidth + 1.8;
      out.push({
        x: s.x + s.rx * side * dist,
        y: s.y,
        z: s.z + s.rz * side * dist,
        s: 0.32,
        h: 1.72,
        rot: s.heading,
      });
    }
    return out;
  }, [track]);
  return (
    <>
      {people.slice(0, 24).map((c, i) => (
        <group key={`p${i}`} position={[c.x, c.y, c.z]} rotation={[0, c.rot, 0]}>
          <mesh position={[0, 0.9, 0]}>
            <capsuleGeometry args={[0.28, 0.7, 4, 6]} />
            <meshStandardMaterial color="#3a4250" roughness={0.8} />
          </mesh>
          <mesh position={[0, 1.55, 0]}>
            <sphereGeometry args={[0.16, 8, 6]} />
            <meshStandardMaterial color="#c4a484" roughness={0.7} />
          </mesh>
        </group>
      ))}
      {cheer.slice(0, 8).map((c, i) => (
        <group key={`c${i}`} position={[c.x, c.y, c.z]} rotation={[0, c.rot, 0]}>
          <mesh position={[0, 0.95, 0]}>
            <capsuleGeometry args={[0.26, 0.75, 4, 6]} />
            <meshStandardMaterial color="#e07a3d" roughness={0.6} />
          </mesh>
          <mesh position={[0, 1.62 + Math.sin(Date.now() * 0.003 + i) * 0.04, 0]}>
            <sphereGeometry args={[0.15, 8, 6]} />
            <meshStandardMaterial color={i % 2 ? "#f0d7a2" : "#2a1c18"} roughness={0.7} />
          </mesh>
        </group>
      ))}
    </>
  );
}

export function World({ track }: { track: Track }) {
  const map = useAsphalt(track.asphalt, track.line);
  const peaks = useMemo(
    () => track.mountains.map((m) => ({ ...m, y: m.h * 0.45 - 0.8 })),
    [track],
  );
  const rocks = useMemo(
    () => track.rocks.map((r) => ({ ...r, y: r.y + r.h * 0.35 })),
    [track],
  );
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.85, 0]} receiveShadow>
        <planeGeometry args={[1900, 1900]} />
        <meshStandardMaterial color={track.ground} roughness={1} />
      </mesh>
      {track.waterRadius > 0 ? <Water radius={track.waterRadius} color={track.water} /> : null}
      <Instances items={peaks}>
        <coneGeometry args={[1, 1, 6]} />
        <meshStandardMaterial color={track.mountain} roughness={1} />
      </Instances>
      <mesh geometry={track.shoulderGeo}>
        <meshStandardMaterial color={track.shoulder} roughness={1} />
      </mesh>
      <mesh geometry={track.road} receiveShadow>
        <meshStandardMaterial map={map ?? undefined} color={map ? "#ffffff" : track.asphalt} roughness={0.92} metalness={0.04} />
      </mesh>
      <mesh geometry={track.kerbGeo}>
        <meshStandardMaterial color="#d4a45a" roughness={0.55} />
      </mesh>
      <mesh geometry={track.wallGeo}>
        <meshStandardMaterial color={track.barrier} roughness={0.88} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={track.startLine}>
        <meshStandardMaterial color="#f3ede4" roughness={0.5} />
      </mesh>
      {track.pads.map((geo, i) => (
        <mesh key={i} geometry={geo}>
          <meshStandardMaterial color="#e07a3d" emissive="#e07a3d" emissiveIntensity={0.65} toneMapped={false} transparent opacity={0.9} />
        </mesh>
      ))}
      <Forest track={track} />
      <Instances items={rocks}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color={track.prop === "alps" ? "#d5ddd8" : "#5c463c"} roughness={1} />
      </Instances>
      <LampPosts lamps={track.lamps} color={track.lamp} />
      <Chevrons items={track.chevrons} />
      <Gantry track={track} />
      <Crowd track={track} />
    </group>
  );
}

function LampPosts({ lamps, color }: { lamps: Decor[]; color: string }) {
  const poles = useMemo(
    () => lamps.map((l) => ({ ...l, y: l.y + l.h * 0.5, s: 0.08, h: l.h })),
    [lamps],
  );
  const bulbs = useMemo(
    () => lamps.map((l) => ({ ...l, y: l.y + l.h + 0.15, s: 0.22, h: 0.22 })),
    [lamps],
  );
  return (
    <>
      <Instances items={poles}>
        <cylinderGeometry args={[1, 1, 1, 6]} />
        <meshStandardMaterial color="#2a3038" roughness={0.7} metalness={0.4} />
      </Instances>
      <Instances items={bulbs}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.4} toneMapped={false} />
      </Instances>
    </>
  );
}
