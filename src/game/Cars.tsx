import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { CARS, carById, type CarSpec } from "@/game/cars";
import { poses, runtime } from "@/game/runtime";
import { loftBody, driverPose } from "@/game/freeAssets";
import { useGLTF } from "@react-three/drei";
import { useGame } from "@/game/store";

function PlayerModel() {
  const gltf = useGLTF("/models/race.glb");
  const model = useMemo(() => gltf.scene.clone(), [gltf]);
  return <primitive object={model} scale={1.6} position={[0, 0.2, 0]} />;
}

function plateTexture(n: number, paint: string) {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const g = c.getContext("2d");
  if (!g) return null;
  g.fillStyle = "#0b0e12";
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = paint;
  g.font = "700 78px sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(String(n), 64, 70);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function CarView({ spec, index, plate, player, ghost }: { spec: CarSpec; index: number; plate: number; player?: boolean; ghost?: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const spins = useRef<Array<THREE.Object3D | null>>([]);
  const body = useRef<THREE.Group>(null);
  const driver = useRef<THREE.Group>(null);
  const wheel = useRef<THREE.Group>(null);
  const spotL = useRef<THREE.SpotLight>(null);
  const spotR = useRef<THREE.SpotLight>(null);
  const target = useMemo(() => new THREE.Object3D(), []);
  const tex = useMemo(() => plateTexture(plate, spec.paint), [plate, spec.paint]);
  useEffect(() => () => tex?.dispose(), [tex]);

  useFrame((state, dt) => {
    const g = ref.current;
    const p = poses[index];
    if (!g || !p) return;
    const d = Math.min(dt, 0.05);
    g.visible = p.visible;
    if (!p.visible) return;
    g.position.set(p.x, p.y + 0.02, p.z);
    g.rotation.set(0, p.yaw + Math.PI, 0);
    for (const spin of spins.current) {
      if (spin) spin.rotation.x += p.speed * d * 0.72;
    }
    if (body.current) {
      const dmg = player ? runtime.sim.damage : 0;
      const bob = Math.sin(state.clock.elapsedTime * 14) * Math.min(0.012, Math.abs(p.speed) * 0.0003);
      body.current.position.y = bob - dmg * 0.06;
      body.current.scale.set(1 + dmg * 0.04, 1 - dmg * 0.12, 1 - dmg * 0.06);
      const loft = body.current.children.find((c) => (c as THREE.Mesh).morphTargetInfluences);
      if (loft && (loft as THREE.Mesh).morphTargetInfluences) {
        (loft as THREE.Mesh).morphTargetInfluences![0] = dmg;
      }
      body.current.rotation.x = player ? runtime.sim.pitch : 0;
      body.current.rotation.z = THREE.MathUtils.damp(
        body.current.rotation.z,
        -p.steer * 0.045 + (player ? runtime.sim.roll : 0),
        6,
        d,
      );
    }
    const frontL = spins.current[0]?.parent;
    const frontR = spins.current[1]?.parent;
    if (frontL) frontL.rotation.y = -p.steer * 0.38;
    if (frontR) frontR.rotation.y = -p.steer * 0.38;
    if (driver.current) {
      const dp = driverPose(p.steer, p.speed);
      driver.current.rotation.y = dp.headYaw;
      driver.current.rotation.z = dp.lean;
      driver.current.position.y = y + spec.height * 0.42 + dp.bounce;
    }
    if (wheel.current) wheel.current.rotation.z = -p.steer * 1.4;
    if (player) {
      const night = useGame.getState().time !== "day";
      const dmg = runtime.sim.damage;
      const inten = (night ? 11 : 1.4) * (dmg > 0.5 ? 0.25 : 1);
      if (spotL.current) spotL.current.intensity = inten;
      if (spotR.current) spotR.current.intensity = inten;
    }
  });

  const cabinZ = (spec.cabin - 0.5) * spec.length * 0.42;
  const bodyGeo = useMemo(() => loftBody(spec.width, spec.length, spec.height), [spec]);
  const y = 0.36 + (spec.height - 0.38) * 0.2;
  const dmg = player ? runtime.sim.damage : 0;
  const paint = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: spec.paint,
        metalness: 0.82,
        roughness: 0.24,
        clearcoat: 1,
        clearcoatRoughness: 0.12,
        transparent: Boolean(ghost),
        opacity: ghost ? 0.38 : 1,
        depthWrite: !ghost,
      }),
    [spec, ghost],
  );
  useEffect(() => () => paint.dispose(), [paint]);

  return (
    <group ref={ref}>
      <group ref={body}>
        {player ? <PlayerModel /> : null}
        <group visible={!player}>
        {/* Lofted body */}
        <mesh geometry={bodyGeo} position={[0, y - 0.1, 0]} castShadow>
          <primitive object={paint} attach="material" />
        </mesh>
        {/* Hood */}
        <mesh position={[0, y + 0.02, spec.length * 0.34]} rotation={[-0.08, 0, 0]} castShadow>
          <boxGeometry args={[spec.width * 0.82, spec.height * 0.22, spec.length * 0.36]} />
          <primitive object={paint} attach="material" />
        </mesh>
        {/* Cabin */}
        <mesh position={[0, y + spec.height * 0.36, cabinZ - 0.04]} castShadow>
          <boxGeometry args={[spec.width * 0.66, spec.height * 0.46, spec.length * 0.4]} />
          <primitive object={paint} attach="material" />
        </mesh>
        {/* Windshield */}
        <mesh position={[0, y + spec.height * 0.4, cabinZ + spec.length * 0.14]} rotation={[0.42, 0, 0]}>
          <boxGeometry args={[spec.width * 0.6, spec.height * 0.34, 0.05]} />
          <meshStandardMaterial color={spec.glass} metalness={0.3} roughness={0.04} transparent opacity={ghost ? 0.22 : 0.7} />
        </mesh>
        {/* Rear glass */}
        <mesh position={[0, y + spec.height * 0.38, cabinZ - spec.length * 0.16]} rotation={[-0.32, 0, 0]}>
          <boxGeometry args={[spec.width * 0.58, spec.height * 0.28, 0.05]} />
          <meshStandardMaterial color={spec.glass} metalness={0.3} roughness={0.04} transparent opacity={ghost ? 0.2 : 0.62} />
        </mesh>
        {/* Side glass */}
        <mesh position={[spec.width * 0.31, y + spec.height * 0.38, cabinZ]}>
          <boxGeometry args={[0.03, spec.height * 0.26, spec.length * 0.3]} />
          <meshStandardMaterial color={spec.glass} metalness={0.2} roughness={0.06} transparent opacity={ghost ? 0.18 : 0.58} />
        </mesh>
        <mesh position={[-spec.width * 0.31, y + spec.height * 0.38, cabinZ]}>
          <boxGeometry args={[0.03, spec.height * 0.26, spec.length * 0.3]} />
          <meshStandardMaterial color={spec.glass} metalness={0.2} roughness={0.06} transparent opacity={ghost ? 0.18 : 0.58} />
        </mesh>
        {/* Bumpers */}
        <mesh position={[0, y - spec.height * 0.14, spec.length * 0.48]}>
          <boxGeometry args={[spec.width * 0.9, spec.height * 0.16, 0.1]} />
          <meshStandardMaterial color="#1c1e22" metalness={0.4} roughness={0.5} />
        </mesh>
        <mesh position={[0, y - spec.height * 0.12, -spec.length * 0.48]}>
          <boxGeometry args={[spec.width * 0.88, spec.height * 0.14, 0.08]} />
          <meshStandardMaterial color="#1c1e22" metalness={0.4} roughness={0.5} />
        </mesh>
        {/* Grille */}
        <mesh position={[0, y - 0.01, spec.length * 0.5]}>
          <boxGeometry args={[0.58, 0.12, 0.03]} />
          <meshStandardMaterial color="#111214" metalness={0.85} roughness={0.25} />
        </mesh>
        {/* Wing */}
        <mesh position={[0, y + spec.height * 0.26, -spec.length * 0.44]}>
          <boxGeometry args={[spec.width * 0.7, 0.04 + spec.wing * 0.12, 0.16]} />
          <meshStandardMaterial color={spec.accent} metalness={0.7} roughness={0.25} />
        </mesh>
        {/* Driver */}
        <group ref={driver} position={[0, y + spec.height * 0.42, cabinZ]}>
          <mesh position={[0, 0.12, 0]}>
            <sphereGeometry args={[0.11, 8, 6]} />
            <meshStandardMaterial color="#c4a484" roughness={0.7} />
          </mesh>
          <mesh position={[0, -0.08, 0]}>
            <capsuleGeometry args={[0.1, 0.18, 4, 6]} />
            <meshStandardMaterial color="#1a1c20" roughness={0.6} />
          </mesh>
        </group>
        <group ref={wheel} position={[0, y + spec.height * 0.32, cabinZ + 0.18]}>
          <mesh>
            <torusGeometry args={[0.12, 0.018, 8, 16]} />
            <meshStandardMaterial color="#1a1c20" roughness={0.4} />
          </mesh>
        </group>
        <mesh position={[spec.width * 0.42, y + spec.height * 0.38, cabinZ + 0.15]}>
          <boxGeometry args={[0.08, 0.06, 0.14]} />
          <meshStandardMaterial color={spec.accent} metalness={0.7} roughness={0.2} />
        </mesh>
        <mesh position={[-spec.width * 0.42, y + spec.height * 0.38, cabinZ + 0.15]}>
          <boxGeometry args={[0.08, 0.06, 0.14]} />
          <meshStandardMaterial color={spec.accent} metalness={0.7} roughness={0.2} />
        </mesh>
        </group>
        {/* Headlights */}
        <mesh position={[0.42, y + 0.02, spec.length * 0.5]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.09, 0.09, 0.05, 12]} />
          <meshStandardMaterial color="#fff6e0" emissive="#fff6e0" emissiveIntensity={2.2} toneMapped={false} />
        </mesh>
        <mesh position={[-0.42, y + 0.02, spec.length * 0.5]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.09, 0.09, 0.05, 12]} />
          <meshStandardMaterial color="#fff6e0" emissive="#fff6e0" emissiveIntensity={2.2} toneMapped={false} />
        </mesh>
        {/* Taillights */}
        <mesh position={[0.55, y + 0.04, -spec.length * 0.48]}>
          <boxGeometry args={[0.28, 0.08, 0.05]} />
          <meshStandardMaterial color="#e23a32" emissive="#e23a32" emissiveIntensity={1.6} toneMapped={false} />
        </mesh>
        <mesh position={[-0.55, y + 0.04, -spec.length * 0.48]}>
          <boxGeometry args={[0.28, 0.08, 0.05]} />
          <meshStandardMaterial color="#e23a32" emissive="#e23a32" emissiveIntensity={1.6} toneMapped={false} />
        </mesh>
        {/* Exhausts */}
        <mesh position={[0.22, y - spec.height * 0.22, -spec.length * 0.5]}>
          <cylinderGeometry args={[0.04, 0.04, 0.12, 8]} />
          <meshStandardMaterial color="#2a2e34" metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh position={[-0.22, y - spec.height * 0.22, -spec.length * 0.5]}>
          <cylinderGeometry args={[0.04, 0.04, 0.12, 8]} />
          <meshStandardMaterial color="#2a2e34" metalness={0.9} roughness={0.2} />
        </mesh>
        {tex ? (
          <mesh position={[0, y + spec.height * 0.82, cabinZ]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.55, 0.55]} />
            <meshBasicMaterial map={tex} toneMapped={false} />
          </mesh>
        ) : null}
        {player ? (
          <>
            <primitive object={target} position={[0, y, spec.length * 0.5 + 14]} />
            <spotLight ref={spotL} position={[0.4, y + 0.3, spec.length * 0.48]} target={target} angle={0.42} penumbra={0.55} distance={38} intensity={10} color="#fff3d4" />
            <spotLight ref={spotR} position={[-0.4, y + 0.3, spec.length * 0.48]} target={target} angle={0.42} penumbra={0.55} distance={38} intensity={10} color="#fff3d4" />
          </>
        ) : null}
      </group>
      {[
        [-spec.width * 0.48, spec.length * 0.3],
        [spec.width * 0.48, spec.length * 0.3],
        [-spec.width * 0.48, -spec.length * 0.3],
        [spec.width * 0.48, -spec.length * 0.3],
      ].map(([x, z], i) => (
        <group key={i} position={[x, 0.32, z]}>
          <group ref={(node) => { spins.current[i] = node; }}>
            <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.34, 0.34, 0.26, 18]} />
              <meshStandardMaterial color="#1a1c20" roughness={0.7} />
            </mesh>
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.22, 0.22, 0.28, 12]} />
              <meshStandardMaterial color="#d0d4da" metalness={0.92} roughness={0.15} />
            </mesh>
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.08, 0.08, 0.3, 8]} />
              <meshStandardMaterial color="#8a9098" metalness={0.8} roughness={0.3} />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  );
}

export function Traffic() {
  const carId = useGame((s) => s.carId);
  const player = carById(carId);
  const ai = [0, 1, 2, 3, 4].map((i) => CARS[(CARS.indexOf(player) + 1 + i) % CARS.length]);
  return (
    <group>
      <CarView spec={player} index={0} plate={1} player />
      {ai.map((spec, i) => (
        <CarView key={`${spec.id}-${i}`} spec={spec} index={i + 1} plate={i + 2} />
      ))}
      <CarView spec={player} index={6} plate={1} ghost />
      <PoliceCar />
    </group>
  );
}

function PoliceCar() {
  const ref = useRef<THREE.Group>(null);
  const speed = useRef(0);
  const dist = useRef(16);
  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    const sim = runtime.sim;
    const show = sim.heat > 2.2 && !sim.finished;
    g.visible = show;
    if (!show) { speed.current = 0; dist.current = 16; return; }
    const target = Math.max(20, sim.speed * 0.95 + (sim.off ? 8 : 2));
    speed.current += (target - speed.current) * Math.min(1, dt * 1.8);
    const closing = (speed.current - sim.speed) * 0.15;
    dist.current = Math.max(2.4, Math.min(20, dist.current - closing * dt));
    sim.chaseDist = dist.current;
    const fx = -Math.sin(sim.yaw);
    const fz = -Math.cos(sim.yaw);
    const bob = Math.sin(Date.now() * 0.012) * 0.04;
    g.position.set(sim.x - fx * dist.current, sim.y + 0.02 + bob, sim.z - fz * dist.current);
    g.rotation.set(sim.pitch * 0.3, sim.yaw + Math.PI, 0);
  });
  return (
    <group ref={ref} visible={false}>
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[1.9, 0.5, 4.4]} />
        <meshStandardMaterial color="#1a3a6a" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.95, -0.2]}>
        <boxGeometry args={[1.6, 0.4, 1.8]} />
        <meshStandardMaterial color="#0e1a2a" metalness={0.4} roughness={0.2} />
      </mesh>
      <mesh position={[0.3, 1.15, -0.2]}>
        <boxGeometry args={[0.25, 0.12, 0.4]} />
        <meshStandardMaterial color="#e23a32" emissive="#e23a32" emissiveIntensity={3} toneMapped={false} />
      </mesh>
      <mesh position={[-0.3, 1.15, -0.2]}>
        <boxGeometry args={[0.25, 0.12, 0.4]} />
        <meshStandardMaterial color="#3a6ae2" emissive="#3a6ae2" emissiveIntensity={3} toneMapped={false} />
      </mesh>
    </group>
  );
}
