import React, { useMemo, useRef, useState } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { TEAM, type Member } from '../../data';
import { artwork, codeScreen, parquet, planBoard, renderScreen, sign } from './textures';
import { profileGeometry, ringPath, roundedRect, tube, type Profile } from './arch';

// Башня «Мир сайтов» в разрезе — как кукольный дом: передняя стена снята, видно все этажи.
// 0 — лобби, 1–3 — этажи команды (каждый под характер человека), сверху — крыша с вывеской.
export const W = 10; // ширина
export const D = 8; // глубина
export const H = 3.4; // высота этажа
export const LEVELS = 4;
/** башня стоит на подиуме — всё здание поднято на эту высоту */
export const BASE = 0.6;

export const FLOORS = [
  { title: 'Лобби', accent: '#c8ff4d', member: null as Member | null },
  ...TEAM.map((m) => ({ title: m.floor, accent: m.color, member: m })),
];

type V3 = [number, number, number];

// Коробка с материалом — основной «кирпичик» интерьера
const B: React.FC<{
  p: V3;
  s: V3;
  c: string;
  e?: string;
  ei?: number;
  r?: number;
  m?: number;
  rot?: V3;
  shadow?: boolean;
  o?: number;
}> = ({ p, s, c, e, ei = 1, r = 0.7, m = 0.05, rot, shadow = true, o }) => (
  <mesh position={p} rotation={rot} castShadow={shadow} receiveShadow>
    <boxGeometry args={s} />
    <meshStandardMaterial color={c} emissive={e || '#000000'} emissiveIntensity={e ? ei : 0} roughness={r} metalness={m} transparent={o !== undefined} opacity={o ?? 1} />
  </mesh>
);

// Плоскость с картинкой (экран, доска, вывеска)
const Pic: React.FC<{ p: V3; s: [number, number]; tex: THREE.Texture; rot?: V3; glow?: boolean; transparent?: boolean }> = ({ p, s, tex, rot, glow = true, transparent }) => (
  <mesh position={p} rotation={rot}>
    <planeGeometry args={s} />
    {glow ? <meshBasicMaterial map={tex} toneMapped={false} transparent={transparent} /> : <meshStandardMaterial map={tex} roughness={0.6} transparent={transparent} />}
  </mesh>
);

const Plant: React.FC<{ p: V3; s?: number }> = ({ p, s = 1 }) => (
  <group position={p} scale={s}>
    <mesh position={[0, 0.3, 0]} castShadow>
      <cylinderGeometry args={[0.32, 0.25, 0.6, 20]} />
      <meshStandardMaterial color="#2b2834" roughness={0.6} />
    </mesh>
    {[
      [0, 1.05, 0, 0.5],
      [0.22, 1.35, 0.1, 0.38],
      [-0.2, 1.3, -0.12, 0.36],
      [0.05, 1.62, -0.05, 0.3],
    ].map(([x, y, z, r], i) => (
      <mesh key={i} position={[x, y, z]} castShadow>
        <icosahedronGeometry args={[r, 1]} />
        <meshStandardMaterial color={i % 2 ? '#3f7d47' : '#2f6b3a'} roughness={0.8} flatShading />
      </mesh>
    ))}
  </group>
);

// ——— человечек в 3D: тело из капсул, голова — фото, всегда смотрит в камеру ———
const Person: React.FC<{ m: Member; from: V3; to: V3 }> = ({ m, from, to }) => {
  const root = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Mesh>(null);
  const legR = useRef<THREE.Mesh>(null);
  const armL = useRef<THREE.Mesh>(null);
  const armR = useRef<THREE.Mesh>(null);
  const [aspect, setAspect] = useState(0.85);
  const head = useMemo(() => {
    const t = new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}${m.head}`, (tx) => {
      const img = tx.image as HTMLImageElement;
      if (img?.width) setAspect(img.width / img.height);
    });
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [m.head]);
  const dark = useMemo(() => new THREE.Color(m.shirt).multiplyScalar(0.7), [m.shirt]);
  const A = useMemo(() => new THREE.Vector3(...from), [from]);
  const Bv = useMemo(() => new THREE.Vector3(...to), [to]);
  const st = useRef({ t: Math.random() * 6 });

  useFrame((_, dt) => {
    const g = root.current;
    if (!g) return;
    // ходит туда-обратно с остановками: 4 c идёт, 2.5 c стоит
    const s = st.current;
    s.t += dt;
    const cycle = 13;
    const k = s.t % cycle;
    let p = 0;
    let walking = false;
    if (k < 4) {
      p = k / 4;
      walking = true;
    } else if (k < 6.5) p = 1;
    else if (k < 10.5) {
      p = 1 - (k - 6.5) / 4;
      walking = true;
    }
    const e = p * p * (3 - 2 * p);
    g.position.lerpVectors(A, Bv, e);
    const dir = k < 6.5 ? Bv.clone().sub(A) : A.clone().sub(Bv);
    const yaw = walking ? Math.atan2(dir.x, dir.z) : 0;
    g.rotation.y += (yaw - g.rotation.y) * Math.min(1, dt * 6);
    const sw = walking ? Math.sin(s.t * 9) * 0.55 : 0;
    if (legL.current) legL.current.rotation.x = sw;
    if (legR.current) legR.current.rotation.x = -sw;
    if (armL.current) armL.current.rotation.x = -sw * 0.8;
    if (armR.current) armR.current.rotation.x = sw * 0.8;
    g.position.y += walking ? Math.abs(Math.sin(s.t * 9)) * 0.04 : Math.sin(s.t * 2) * 0.012;
  });

  return (
    <group ref={root} position={from}>
      {/* ноги */}
      {[-0.11, 0.11].map((x, i) => (
        <group key={x} position={[x, 0.62, 0]}>
          <mesh ref={i ? legR : legL} position={[0, -0.3, 0]} castShadow>
            <capsuleGeometry args={[0.095, 0.42, 4, 10]} />
            <meshStandardMaterial color="#1f1e2a" roughness={0.8} />
          </mesh>
        </group>
      ))}
      <mesh position={[-0.11, 0.06, 0.04]} castShadow>
        <boxGeometry args={[0.17, 0.1, 0.3]} />
        <meshStandardMaterial color="#f1eff8" />
      </mesh>
      <mesh position={[0.11, 0.06, 0.04]} castShadow>
        <boxGeometry args={[0.17, 0.1, 0.3]} />
        <meshStandardMaterial color="#f1eff8" />
      </mesh>
      {/* корпус в худи */}
      <mesh position={[0, 0.98, 0]} scale={[1, 1, 0.78]} castShadow>
        <capsuleGeometry args={[0.25, 0.34, 6, 16]} />
        <meshStandardMaterial color={m.shirt} roughness={0.85} />
      </mesh>
      <mesh position={[0, 1.27, -0.08]} castShadow>
        <torusGeometry args={[0.15, 0.06, 8, 18]} />
        <meshStandardMaterial color={dark} roughness={0.9} />
      </mesh>
      {/* руки */}
      {[-0.33, 0.33].map((x, i) => (
        <group key={x} position={[x, 1.16, 0]}>
          <mesh ref={i ? armR : armL} position={[0, -0.24, 0]} rotation={[0, 0, i ? -0.1 : 0.1]} castShadow>
            <capsuleGeometry args={[0.075, 0.36, 4, 10]} />
            <meshStandardMaterial color={dark} roughness={0.85} />
          </mesh>
        </group>
      ))}
      {/* голова-фото */}
      <sprite position={[0, 1.78, 0]} scale={[0.92 * aspect, 0.92, 1]}>
        <spriteMaterial map={head} transparent />
      </sprite>
    </group>
  );
};

// ——— этажи ———
const Lobby: React.FC = () => {
  const logo = useMemo(() => sign('МИР САЙТОВ', '#c8ff4d', '700 130px Unbounded, sans-serif', 1600, 220), []);
  return (
    <group>
      <B p={[0, 0.13, 0]} s={[W - 0.4, 0.02, D - 0.2]} c="#d7d3cb" r={0.25} shadow={false} />
      <B p={[0, H / 2, -D / 2 + 0.1]} s={[W, H - 0.24, 0.2]} c="#24222e" />
      <B p={[-W / 2 + 0.1, H / 2, 0.1]} s={[0.2, H - 0.24, D - 0.2]} c="#2b2836" />
      <Pic p={[0.4, 2.05, -D / 2 + 0.22]} s={[6.2, 0.85]} tex={logo} transparent />
      {/* стойка ресепшен */}
      <B p={[0.6, 0.62, -1.4]} s={[3.4, 1.0, 0.9]} c="#1b1925" r={0.4} />
      <B p={[0.6, 1.14, -1.4]} s={[3.5, 0.05, 1.0]} c="#2a2836" e="#c8ff4d" ei={0.35} />
      <B p={[0.6, 0.62, -0.94]} s={[3.4, 0.06, 0.02]} c="#c8ff4d" e="#c8ff4d" ei={1.6} shadow={false} />
      <Plant p={[-3.8, 0.12, -3.1]} />
      <Plant p={[3.9, 0.12, -3.1]} s={0.85} />
      {/* диван для гостей */}
      <B p={[2.8, 0.38, 2.4]} s={[2.4, 0.42, 0.85]} c="#3a3647" />
      <B p={[2.8, 0.72, 2.78]} s={[2.4, 0.5, 0.18]} c="#3a3647" />
      <pointLight position={[0.5, 2.8, 0]} intensity={10} distance={13} decay={1} color="#fff1dc" />
    </group>
  );
};

const PixelStudio: React.FC<{ m: Member }> = ({ m }) => {
  const scr = useMemo(() => [codeScreen(11, m.color), codeScreen(12, '#3ee6ff'), codeScreen(13, '#8b6cff')], [m.color]);
  const neon = useMemo(() => sign('</>', '#3ee6ff', '700 150px JetBrains Mono, monospace', 600, 220), []);
  return (
    <group>
      <B p={[0, 0.13, 0]} s={[W - 0.4, 0.02, D - 0.2]} c="#15131f" r={0.5} shadow={false} />
      <B p={[0.4, 0.15, -0.6]} s={[5, 0.02, 3.4]} c="#2d2257" r={0.95} shadow={false} />
      <B p={[0, H / 2, -D / 2 + 0.1]} s={[W, H - 0.24, 0.2]} c="#191730" />
      <B p={[-W / 2 + 0.1, H / 2, 0.1]} s={[0.2, H - 0.24, D - 0.2]} c="#1c1a35" />
      {/* неон по стенам */}
      <B p={[0, 0.24, -D / 2 + 0.22]} s={[W - 0.5, 0.05, 0.05]} c={m.color} e={m.color} ei={2.2} shadow={false} />
      <B p={[-W / 2 + 0.22, 0.24, 0]} s={[0.05, 0.05, D - 0.4]} c={m.color} e={m.color} ei={2.2} shadow={false} />
      {[-3.6, -3.2].map((x) => (
        <B key={x} p={[x, 1.7, -D / 2 + 0.22]} s={[0.05, 2.4, 0.05]} c="#3ee6ff" e="#3ee6ff" ei={2} shadow={false} />
      ))}
      <Pic p={[-W / 2 + 0.22, 2.1, -0.4]} s={[2.2, 0.8]} tex={neon} rot={[0, Math.PI / 2, 0]} transparent />
      {/* стол с тремя мониторами */}
      <B p={[0.9, 0.96, -2.9]} s={[3.6, 0.08, 1.15]} c="#24213a" r={0.4} />
      {[-0.75, 2.55].map((x) => (
        <B key={x} p={[x, 0.54, -2.9]} s={[0.08, 0.8, 1.0]} c="#2f2b48" />
      ))}
      <B p={[0.9, 1.0, -2.55]} s={[1.1, 0.03, 0.32]} c="#2a2640" e={m.color} ei={0.25} />
      {[
        { x: 0.9, z: -3.25, ry: 0, i: 0 },
        { x: -0.45, z: -3.05, ry: 0.42, i: 1 },
        { x: 2.25, z: -3.05, ry: -0.42, i: 2 },
      ].map((s) => (
        <group key={s.i} position={[s.x, 1.58, s.z]} rotation={[0, s.ry, 0]}>
          <B p={[0, 0, -0.04]} s={[1.32, 0.8, 0.05]} c="#0d0c14" />
          <Pic p={[0, 0, 0]} s={[1.24, 0.72]} tex={scr[s.i]} />
          <B p={[0, -0.5, -0.04]} s={[0.08, 0.25, 0.08]} c="#0d0c14" />
        </group>
      ))}
      {/* игровое кресло */}
      <B p={[0.9, 0.62, -1.85]} s={[0.78, 0.14, 0.78]} c="#262038" />
      <B p={[0.9, 1.28, -1.5]} s={[0.78, 1.2, 0.14]} c="#262038" />
      <B p={[0.9, 1.28, -1.42]} s={[0.1, 1.1, 0.02]} c={m.color} e={m.color} ei={1.2} shadow={false} />
      <mesh position={[0.9, 0.3, -1.85]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, 0.5, 10]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      {/* полка с фигурками */}
      <B p={[-W / 2 + 0.45, 1.6, -2.2]} s={[0.5, 0.06, 2.2]} c="#2a2640" />
      <B p={[-W / 2 + 0.45, 2.35, -2.2]} s={[0.5, 0.06, 2.2]} c="#2a2640" />
      {[
        [-2.9, 1.78, '#8b6cff'],
        [-2.3, 1.78, '#ff9ccf'],
        [-1.7, 1.75, '#3ee6ff'],
        [-2.6, 2.52, '#c8ff4d'],
        [-1.9, 2.52, '#ece9ff'],
      ].map(([z, y, col], i) => (
        <B key={i} p={[-W / 2 + 0.45, y as number, z as number]} s={[0.24, 0.3, 0.24]} c={col as string} e={i === 3 ? (col as string) : undefined} ei={1.4} />
      ))}
      <pointLight position={[0.8, 2.7, -1.2]} intensity={11} distance={12} decay={1} color={m.color} />
      <pointLight position={[-3.4, 2.2, -2.6]} intensity={8} distance={10} decay={1} color="#3ee6ff" />
    </group>
  );
};

const ChiefOffice: React.FC<{ m: Member }> = ({ m }) => {
  const wood = useMemo(() => parquet(), []);
  const board = useMemo(() => planBoard(), []);
  const laptop = useMemo(() => codeScreen(21, '#8b6cff'), []);
  return (
    <group>
      <mesh position={[0, 0.13, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[W - 0.4, D - 0.2]} />
        <meshStandardMaterial map={wood} roughness={0.55} />
      </mesh>
      <B p={[0, H / 2, -D / 2 + 0.1]} s={[W, H - 0.24, 0.2]} c="#1f3a2f" />
      <B p={[-W / 2 + 0.1, H / 2, 0.1]} s={[0.2, H - 0.24, D - 0.2]} c="#e6dfd1" r={0.85} />
      {/* доска с планом проекта */}
      <B p={[-W / 2 + 0.24, 1.85, -0.4]} s={[0.06, 2.2, 3.5]} c="#2b2a27" />
      <Pic p={[-W / 2 + 0.28, 1.85, -0.4]} s={[3.36, 2.08]} tex={board} rot={[0, Math.PI / 2, 0]} glow={false} />
      {/* стол руководителя */}
      <B p={[1.4, 0.92, -2.5]} s={[3.2, 0.1, 1.35]} c="#6e4a31" r={0.45} />
      <B p={[1.4, 0.48, -3.05]} s={[3.1, 0.82, 0.08]} c="#5d3e29" />
      {[-0.1, 2.9].map((x) => (
        <B key={x} p={[x, 0.48, -2.5]} s={[0.1, 0.82, 1.25]} c="#5d3e29" />
      ))}
      <B p={[1.2, 0.99, -2.4]} s={[0.72, 0.03, 0.5]} c="#c9c9d1" m={0.6} r={0.3} />
      <group position={[1.2, 1.22, -2.67]} rotation={[-0.25, 0, 0]}>
        <B p={[0, 0, -0.01]} s={[0.72, 0.46, 0.02]} c="#c9c9d1" m={0.6} r={0.3} />
        <Pic p={[0, 0, 0.005]} s={[0.66, 0.4]} tex={laptop} />
      </group>
      <mesh position={[2.3, 1.07, -2.2]} castShadow>
        <cylinderGeometry args={[0.07, 0.1, 0.22, 16]} />
        <meshStandardMaterial color="#d7b25a" metalness={0.8} roughness={0.25} />
      </mesh>
      {/* кресло */}
      <B p={[1.4, 0.58, -1.6]} s={[0.8, 0.14, 0.75]} c="#2b211a" r={0.5} />
      <B p={[1.4, 1.1, -1.28]} s={[0.8, 0.95, 0.14]} c="#2b211a" r={0.5} />
      {/* книжный шкаф */}
      <B p={[-2.4, 1.3, -3.62]} s={[2.4, 2.36, 0.42]} c="#4e3524" />
      {[0.55, 1.15, 1.75].map((y) =>
        Array.from({ length: 7 }, (_, i) => (
          <B
            key={`${y}-${i}`}
            p={[-3.35 + i * 0.3, y + 0.24, -3.5]}
            s={[0.22, 0.42 - (i % 3) * 0.06, 0.28]}
            c={['#8b6cff', '#e9e2d4', '#2f6b3a', '#c8ff4d', '#d7b25a', '#5b43c4', '#ece9ff'][(i + y * 10) % 7 | 0]}
            shadow={false}
          />
        )),
      )}
      {/* диван и столик */}
      <B p={[-3.9, 0.4, 2.2]} s={[0.9, 0.42, 2.6]} c={m.shirt} r={0.9} />
      <B p={[-4.3, 0.78, 2.2]} s={[0.22, 0.6, 2.6]} c={m.shirt} r={0.9} />
      <B p={[-2.7, 0.48, 2.2]} s={[0.9, 0.06, 1.3]} c="#3b2a1f" />
      <Plant p={[3.9, 0.12, -3.2]} s={1.15} />
      <pointLight position={[0.5, 2.8, -0.5]} intensity={11} distance={13} decay={1} color="#ffd9a0" />
      <pointLight position={[-3, 2.2, 1.8]} intensity={5} distance={9} decay={1} color={m.color} />
    </group>
  );
};

const Atelier: React.FC<{ m: Member }> = ({ m }) => {
  const knot = useRef<THREE.Mesh>(null);
  const table = useRef<THREE.Mesh>(null);
  const render = useMemo(() => renderScreen(), []);
  const art = useMemo(() => artwork(), []);
  useFrame((_, dt) => {
    if (knot.current) knot.current.rotation.y += dt * 0.6;
    if (table.current) table.current.rotation.y += dt * 0.6;
  });
  return (
    <group>
      <B p={[0, 0.13, 0]} s={[W - 0.4, 0.02, D - 0.2]} c="#cfcac1" r={0.6} shadow={false} />
      <B p={[0, H / 2, -D / 2 + 0.1]} s={[W, H - 0.24, 0.2]} c="#e6e2da" r={0.9} />
      <B p={[-W / 2 + 0.1, H / 2, 0.1]} s={[0.2, H - 0.24, D - 0.2]} c="#dcd7ce" r={0.9} />
      <B p={[2.4, 1.6, -D / 2 + 0.21]} s={[3.6, 2.5, 0.02]} c={m.color} e={m.color} ei={0.25} shadow={false} />
      {/* большой монитор с моделью */}
      <B p={[-1.2, 1.85, -D / 2 + 0.24]} s={[2.7, 1.6, 0.06]} c="#111" />
      <Pic p={[-1.2, 1.85, -D / 2 + 0.28]} s={[2.56, 1.48]} tex={render} />
      {/* подиум с вращающейся скульптурой */}
      <B p={[1.4, 0.52, -0.9]} s={[1.0, 0.8, 1.0]} c="#f4f2ee" r={0.5} />
      <mesh ref={table} position={[1.4, 0.95, -0.9]} castShadow>
        <cylinderGeometry args={[0.45, 0.45, 0.06, 32]} />
        <meshStandardMaterial color="#d6d2ca" />
      </mesh>
      <mesh ref={knot} position={[1.4, 1.5, -0.9]} castShadow>
        <torusKnotGeometry args={[0.3, 0.1, 120, 16]} />
        <meshStandardMaterial color={m.color} metalness={0.7} roughness={0.2} />
      </mesh>
      <B p={[3.3, 0.42, 0.6]} s={[0.8, 0.6, 0.8]} c="#f4f2ee" r={0.5} />
      <mesh position={[3.3, 1.02, 0.6]} castShadow>
        <icosahedronGeometry args={[0.32, 0]} />
        <meshStandardMaterial color="#c8ff4d" roughness={0.55} flatShading />
      </mesh>
      <B p={[3.4, 0.62, -2.6]} s={[0.8, 1.0, 0.8]} c="#f4f2ee" r={0.5} />
      <mesh position={[3.4, 1.42, -2.6]} castShadow>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshStandardMaterial color="#8b6cff" roughness={0.15} metalness={0.3} />
      </mesh>
      {/* мольберт с картиной */}
      <group position={[-3.0, 0, 0.6]} rotation={[0, 0.5, 0]}>
        <B p={[-0.45, 0.95, 0]} s={[0.06, 1.8, 0.06]} c="#8a6a4a" rot={[0.12, 0, 0]} />
        <B p={[0.45, 0.95, 0]} s={[0.06, 1.8, 0.06]} c="#8a6a4a" rot={[0.12, 0, 0]} />
        <B p={[0, 0.9, -0.2]} s={[0.06, 1.7, 0.06]} c="#8a6a4a" rot={[-0.3, 0, 0]} />
        <B p={[0, 1.45, 0.05]} s={[1.1, 1.36, 0.04]} c="#f7f5f0" rot={[-0.1, 0, 0]} />
        <Pic p={[0, 1.45, 0.08]} s={[1.0, 1.25]} tex={art} rot={[-0.1, 0, 0]} glow={false} />
      </group>
      <pointLight position={[1.2, 2.8, -0.6]} intensity={13} distance={13} decay={1} color="#ffffff" />
      <pointLight position={[2.6, 2.0, -3.0]} intensity={6} distance={9} decay={1} color={m.color} />
    </group>
  );
};

// ——— башня целиком ———
const Office: React.FC<{ selected: number | null; hovered: number | null; onHover: (i: number | null) => void; onSelect: (i: number) => void }> = ({ selected, hovered, onHover, onSelect }) => {
  const cabin = useRef<THREE.Group>(null);
  const roofSign = useMemo(() => sign('МИР САЙТОВ', '#c8ff4d', '700 140px Unbounded, sans-serif', 1700, 240), []);
  const lift = useRef({ y: 0, idle: 0 });
  const glow = '#c8ff4d';
  const plinth = useMemo(() => {
    const low: Profile = { shape: roundedRect(20, 15.5, 1.8), h: 0.3, y0: -BASE + 0.03, levels: 1, smooth: true, top: true };
    const high: Profile = { shape: roundedRect(17.6, 13, 1.3), h: BASE - 0.33, y0: -BASE + 0.33, levels: 1, smooth: true, top: true };
    return { low: profileGeometry(low), high: profileGeometry(high), edge: tube(ringPath(high, 1, 0.03, -0.02), 0.035, true) };
  }, []);

  // свет в комнатах: у выбранного этажа — полный, в обзоре города — приглушённый
  const floorRefs = useRef<(THREE.Group | null)[]>([]);
  const lights = useRef<{ l: THREE.PointLight; base: number; floor: number }[] | null>(null);
  useFrame((_, dt) => {
    if (!lights.current) {
      lights.current = [];
      floorRefs.current.forEach((g, floor) =>
        g?.traverse((o) => {
          if ((o as THREE.PointLight).isPointLight) lights.current!.push({ l: o as THREE.PointLight, base: (o as THREE.PointLight).intensity, floor });
        }),
      );
    }
    for (const it of lights.current) {
      const k = selected === null ? 0.5 : selected === it.floor ? 1 : 0.3;
      it.l.intensity += (it.base * k - it.l.intensity) * Math.min(1, dt * 3);
    }
    const c = cabin.current;
    if (!c) return;
    // лифт едет к выбранному этажу, а без выбора — неспешно катается между этажами
    const L = lift.current;
    L.idle += dt;
    const target = selected ?? Math.floor((L.idle / 5) % LEVELS);
    L.y += (target * H - L.y) * Math.min(1, dt * 2.2);
    c.position.y = L.y + 0.14;
  });

  const click = (i: number) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > 6) return; // это был поворот города, а не клик
    onSelect(i);
  };

  return (
    <group position={[0, BASE, 0]}>
      {/* подиум в две ступени со светящейся кромкой */}
      <mesh geometry={plinth.low} position={[-0.9, 0, 0]} receiveShadow>
        <meshStandardMaterial color="#26242f" roughness={0.6} />
      </mesh>
      <mesh geometry={plinth.high} position={[-0.9, 0, 0]} receiveShadow>
        <meshStandardMaterial color="#4a4755" roughness={0.35} metalness={0.3} />
      </mesh>
      <mesh geometry={plinth.edge} position={[-0.9, 0, 0]}>
        <meshBasicMaterial color="#9fd03a" toneMapped={false} />
      </mesh>
      {/* перекрытия с подсвеченной кромкой */}
      {Array.from({ length: LEVELS + 1 }, (_, i) => {
        const acc = FLOORS[Math.min(i, LEVELS - 1)].accent;
        const on = hovered === i || selected === i;
        return (
          <group key={i} position={[0, i * H, 0]}>
            <B p={[0, 0, 0]} s={[W, 0.24, D]} c="#b9b6c4" r={0.5} />
            <B p={[0, 0.02, D / 2 + 0.01]} s={[W - 0.02, 0.06, 0.03]} c={acc} e={acc} ei={on ? 3.2 : 1.4} shadow={false} />
          </group>
        );
      })}
      {/* белый каркас: четыре пилона по углам, на передних — светящиеся линии */}
      {[
        [-W / 2 + 0.05, D / 2 - 0.05],
        [W / 2 - 0.05, D / 2 - 0.05],
        [-W / 2 + 0.05, -D / 2 + 0.05],
        [W / 2 - 0.05, -D / 2 + 0.05],
      ].map(([x, z], i) => (
        <group key={i}>
          <B p={[x, (LEVELS * H + 0.9) / 2 - 0.12, z]} s={[0.4, LEVELS * H + 0.9, 0.4]} c="#ecebf3" r={0.4} />
          {i < 2 && <B p={[x, (LEVELS * H + 0.9) / 2 - 0.12, z + 0.205]} s={[0.05, LEVELS * H + 0.86, 0.02]} c={glow} e={glow} ei={0.8} shadow={false} />}
        </group>
      ))}
      {/* ламели на боковом фасаде — вокруг шахты лифта */}
      {[-3.6, -2.9, 0.4, 1.1, 1.8, 2.5, 3.2].map((z) => (
        <B key={`s${z}`} p={[-W / 2 - 0.15, (LEVELS * H) / 2, z]} s={[0.26, LEVELS * H + 0.2, 0.08]} c="#e4e2ec" r={0.4} />
      ))}
      {/* ламели на задном фасаде */}
      {Array.from({ length: 12 }, (_, i) => (
        <B key={`f${i}`} p={[-4.4 + i * 0.8, (LEVELS * H) / 2, -D / 2 - 0.15]} s={[0.08, LEVELS * H + 0.2, 0.26]} c="#e4e2ec" r={0.4} />
      ))}
      <B p={[W / 2 - 0.05, (LEVELS * H) / 2, 0]} s={[0.04, LEVELS * H, D - 0.3]} c="#9fd4ff" o={0.07} r={0.05} m={0.9} shadow={false} />

      {/* этажи */}
      <group ref={(g) => (floorRefs.current[0] = g)} position={[0, 0, 0]}>
        <Lobby />
      </group>
      <group ref={(g) => (floorRefs.current[1] = g)} position={[0, H, 0]}>
        <PixelStudio m={TEAM[0]} />
        <Person m={TEAM[0]} from={[1.6, 0.14, -0.9]} to={[-1.6, 0.14, 1.6]} />
      </group>
      <group ref={(g) => (floorRefs.current[2] = g)} position={[0, H * 2, 0]}>
        <ChiefOffice m={TEAM[1]} />
        <Person m={TEAM[1]} from={[-2.4, 0.14, 0.2]} to={[1.8, 0.14, 0.4]} />
      </group>
      <group ref={(g) => (floorRefs.current[3] = g)} position={[0, H * 3, 0]}>
        <Atelier m={TEAM[2]} />
        <Person m={TEAM[2]} from={[0.2, 0.14, 0.6]} to={[-2.1, 0.14, 2.2]} />
      </group>

      {/* стеклянная шахта и кабина лифта */}
      <group position={[-W / 2 - 1.05, 0, -1.4]}>
        <B p={[0, (LEVELS * H) / 2, 0]} s={[1.8, LEVELS * H + 0.3, 2.0]} c="#9fd4ff" o={0.08} r={0.05} m={0.9} shadow={false} />
        {[-0.85, 0.85].map((x) => (
          <B key={x} p={[x, (LEVELS * H) / 2, 0.95]} s={[0.08, LEVELS * H + 0.3, 0.08]} c="#3a3846" />
        ))}
        <group ref={cabin}>
          <B p={[0, 1.3, 0]} s={[1.4, 2.5, 1.6]} c="#e9e6f5" e="#fff3dc" ei={0.35} r={0.3} />
          <B p={[0, 1.3, 0.81]} s={[1.0, 2.2, 0.02]} c="#b9d8ff" o={0.35} shadow={false} />
          <B p={[0, 2.5, 0]} s={[1.2, 0.04, 1.4]} c="#ffffff" e="#ffffff" ei={2} shadow={false} />
        </group>
      </group>

      {/* крыша: вывеска и антенна */}
      <group position={[0, LEVELS * H, 0]}>
        <B p={[0, 0.65, D / 2 - 0.4]} s={[W - 0.6, 1.0, 0.06]} c="#9fd4ff" o={0.12} shadow={false} />
        <Pic p={[0, 1.55, 1.2]} s={[8.6, 1.22]} tex={roofSign} transparent />
        <B p={[3.6, 1.6, -2.4]} s={[0.12, 3.2, 0.12]} c="#3a3846" />
        <mesh position={[3.6, 3.3, -2.4]}>
          <sphereGeometry args={[0.16, 10, 10]} />
          <meshBasicMaterial color="#ff3b3b" />
        </mesh>
      </group>

      {/* зоны клика по этажам */}
      {FLOORS.map((_, i) => (
        <mesh
          key={i}
          position={[0, i * H + H / 2, 0.3]}
          onPointerOver={(e) => {
            e.stopPropagation();
            onHover(i);
          }}
          onPointerOut={() => onHover(null)}
          onClick={click(i)}
        >
          <boxGeometry args={[W, H - 0.1, D]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
};

export default Office;
