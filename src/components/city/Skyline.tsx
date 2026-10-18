import React, { useMemo } from 'react';
import * as THREE from 'three';
import { rand, sign, windows } from './textures';

// Москва-Сити по мотивам настоящих силуэтов + Москва-река и низкая застройка вокруг.
// Высоты условные (в масштабе сцены), но соотношения и формы узнаваемые.

type Kind = 'box' | 'tri' | 'taper' | 'stepped' | 'twist' | 'oko';
interface TowerDef {
  name: string;
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  kind: Kind;
  tint: string;
  seed: number;
  rot?: number;
}

const TOWERS: TowerDef[] = [
  { name: 'Федерация Восток', x: -10, z: -64, w: 11, d: 11, h: 82, kind: 'tri', tint: '#33486e', seed: 1, rot: 0.3 },
  { name: 'Федерация Запад', x: -3, z: -55, w: 9, d: 9, h: 56, kind: 'tri', tint: '#33486e', seed: 2, rot: 2.4 },
  { name: 'Меркурий', x: 9, z: -60, w: 8, d: 8, h: 70, kind: 'taper', tint: '#6b4a2c', seed: 3, rot: 0.2 },
  { name: 'ОКО', x: 19, z: -66, w: 8, d: 8, h: 76, kind: 'oko', tint: '#2a3d5e', seed: 4 },
  { name: 'ОКО Юг', x: 25, z: -55, w: 7, d: 7, h: 50, kind: 'oko', tint: '#2a3d5e', seed: 5 },
  { name: 'Город Столиц', x: -21, z: -53, w: 8, d: 8, h: 60, kind: 'stepped', tint: '#38425c', seed: 6 },
  { name: 'Город Столиц 2', x: -28, z: -62, w: 7, d: 7, h: 48, kind: 'stepped', tint: '#38425c', seed: 7 },
  { name: 'Эволюция', x: 3, z: -40, w: 7, d: 7, h: 54, kind: 'twist', tint: '#3b5378', seed: 8 },
  { name: 'Нева Тауэрс', x: 33, z: -71, w: 7, d: 7, h: 72, kind: 'box', tint: '#2c3a56', seed: 9 },
  { name: 'Нева Тауэрс 2', x: 39, z: -62, w: 7, d: 7, h: 64, kind: 'box', tint: '#2c3a56', seed: 10 },
  { name: 'Империя', x: -15, z: -38, w: 10, d: 6, h: 46, kind: 'box', tint: '#33445f', seed: 11, rot: 0.15 },
  { name: 'Башня 2000', x: 17, z: -34, w: 6, d: 6, h: 30, kind: 'taper', tint: '#3a4258', seed: 12 },
];

function towerGeometry(t: TowerDef) {
  let g: THREE.BufferGeometry;
  switch (t.kind) {
    case 'tri': {
      g = new THREE.CylinderGeometry(t.w * 0.48, t.w * 0.62, t.h, 3, 24);
      break;
    }
    case 'taper': {
      g = new THREE.CylinderGeometry(t.w * 0.38, t.w * 0.68, t.h, 4, 24);
      g.rotateY(Math.PI / 4);
      break;
    }
    case 'twist': {
      g = new THREE.BoxGeometry(t.w, t.h, t.d, 1, 60, 1);
      const p = g.attributes.position;
      const v = new THREE.Vector3();
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i);
        const a = ((v.y + t.h / 2) / t.h) * 1.55;
        const x = v.x * Math.cos(a) - v.z * Math.sin(a);
        const z = v.x * Math.sin(a) + v.z * Math.cos(a);
        p.setXYZ(i, x, v.y, z);
      }
      g.computeVertexNormals();
      break;
    }
    case 'oko': {
      g = new THREE.BoxGeometry(t.w, t.h, t.d, 1, 24, 1);
      break;
    }
    default:
      g = new THREE.BoxGeometry(t.w, t.h, t.d, 1, 24, 1);
  }
  g.translate(0, t.h / 2, 0);
  return g;
}

const Tower: React.FC<{ t: TowerDef }> = ({ t }) => {
  const parts = useMemo(() => {
    const tex = windows(t.seed, 8, 24, 0.22).clone();
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(Math.max(1, Math.round(t.w / 3)), Math.max(1, Math.round(t.h / 12)));
    tex.needsUpdate = true;
    // тёмное стекло с отражениями + редкие горящие окна
    const mat = new THREE.MeshStandardMaterial({ color: t.tint, metalness: 0.9, roughness: 0.14, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.75 });
    if (t.kind !== 'stepped') return [{ geo: towerGeometry(t), y: 0, mat }];
    // «Город Столиц»: стопка сдвинутых блоков
    const out: { geo: THREE.BufferGeometry; y: number; mat: THREE.Material; dx?: number; dz?: number }[] = [];
    const n = 5;
    let y = 0;
    for (let i = 0; i < n; i++) {
      const hh = t.h / n;
      const s = 1 - i * 0.07;
      const g = new THREE.BoxGeometry(t.w * s, hh, t.d * s, 1, 6, 1);
      g.translate(0, hh / 2, 0);
      out.push({ geo: g, y, mat, dx: (i % 2) * 0.9, dz: ((i + 1) % 2) * 0.7 });
      y += hh;
    }
    return out;
  }, [t]);
  return (
    <group position={[t.x, 0, t.z]} rotation={[0, t.rot || 0, 0]}>
      {parts.map((p, i) => (
        <mesh key={i} geometry={p.geo} material={p.mat} position={[(p as { dx?: number }).dx || 0, p.y, (p as { dz?: number }).dz || 0]} />
      ))}
      {t.kind === 'tri' && (
        <mesh position={[0, t.h + 5, 0]}>
          <coneGeometry args={[0.35, 10, 6]} />
          <meshStandardMaterial color="#9fb6d8" emissive="#9fd4ff" emissiveIntensity={0.6} />
        </mesh>
      )}
      {/* красные огни на крыше — как у настоящих небоскрёбов */}
      <mesh position={[0, t.h + (t.kind === 'tri' ? 10.2 : 0.6), 0]}>
        <sphereGeometry args={[0.35, 8, 8]} />
        <meshBasicMaterial color="#ff3b3b" />
      </mesh>
    </group>
  );
};

// Москва-река: лента по кривой, набережные — цепочки огней
function riverGeometry(points: THREE.Vector3[], width: number) {
  const curve = new THREE.CatmullRomCurve3(points);
  const N = 160;
  const pos: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= N; i++) {
    const p = curve.getPoint(i / N);
    const tan = curve.getTangent(i / N);
    const nx = -tan.z;
    const nz = tan.x;
    pos.push(p.x + nx * width * 0.5, 0.02, p.z + nz * width * 0.5, p.x - nx * width * 0.5, 0.02, p.z - nz * width * 0.5);
    if (i < N) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return { g, curve };
}

const RIVER = [
  new THREE.Vector3(-160, 0, 2),
  new THREE.Vector3(-90, 0, 22),
  new THREE.Vector3(-40, 0, 26),
  new THREE.Vector3(0, 0, 20),
  new THREE.Vector3(40, 0, 28),
  new THREE.Vector3(90, 0, 14),
  new THREE.Vector3(160, 0, -16),
];

const River: React.FC = () => {
  const { g, lamps } = useMemo(() => {
    const { g, curve } = riverGeometry(RIVER, 18);
    // фонари вдоль обеих набережных
    const lamps: THREE.Vector3[] = [];
    for (let i = 0; i <= 140; i++) {
      const p = curve.getPoint(i / 140);
      const tan = curve.getTangent(i / 140);
      const n = new THREE.Vector3(-tan.z, 0, tan.x);
      lamps.push(p.clone().addScaledVector(n, 10.5), p.clone().addScaledVector(n, -10.5));
    }
    return { g, lamps };
  }, []);
  const lampGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(lamps.flatMap((p) => [p.x, 0.5, p.z]), 3));
    return geo;
  }, [lamps]);
  return (
    <group>
      <mesh geometry={g} receiveShadow>
        <meshStandardMaterial color="#0d1a30" metalness={0.75} roughness={0.18} emissive="#0a1a3a" emissiveIntensity={0.4} />
      </mesh>
      <points geometry={lampGeo}>
        <pointsMaterial color="#ffd38a" size={0.7} sizeAttenuation transparent opacity={0.9} />
      </points>
    </group>
  );
};

// Невысокая застройка вокруг (одним InstancedMesh) — чтобы читалось как карта города
const District: React.FC = () => {
  const mesh = useMemo(() => {
    const r = rand(42);
    const geo = new THREE.BoxGeometry(1, 1, 1);
    geo.translate(0, 0.5, 0);
    const tex = windows(77, 6, 6, 0.16).clone();
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.needsUpdate = true;
    const mat = new THREE.MeshStandardMaterial({ color: '#121521', roughness: 0.85, metalness: 0.1, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.3 });
    const n = 380;
    const m = new THREE.InstancedMesh(geo, mat, n);
    // точки русла — чтобы не ставить дома в реку
    const curve = new THREE.CatmullRomCurve3(RIVER);
    const river = Array.from({ length: 220 }, (_, i) => curve.getPoint(i / 219));
    const nearRiver = (x: number, z: number) => river.some((p) => (p.x - x) ** 2 + (p.z - z) ** 2 < 15 * 15);
    const o = new THREE.Object3D();
    let k = 0;
    for (let tries = 0; tries < 6000 && k < n; tries++) {
      const x = (r() - 0.5) * 300;
      const z = -140 + r() * 210;
      // не ставим в реку, в Сити и рядом с нашей башней
      if (nearRiver(x, z)) continue;
      if (x > -38 && x < 50 && z > -82 && z < -26) continue;
      if (Math.abs(x) < 20 && z > -18 && z < 14) continue; // площадь вокруг нашей башни
      const w = 3 + r() * 6;
      const d = 3 + r() * 6;
      const h = 2 + r() * (z < -40 ? 14 : 8);
      o.position.set(x, 0, z);
      o.scale.set(w, h, d);
      o.rotation.y = Math.round(r() * 3) * (Math.PI / 2) + (r() - 0.5) * 0.2;
      o.updateMatrix();
      m.setMatrixAt(k++, o.matrix);
    }
    m.count = k;
    return m;
  }, []);
  return <primitive object={mesh} />;
};

// Подписи на карте
const Label: React.FC<{ text: string; position: [number, number, number]; scale: number; color?: string }> = ({ text, position, scale, color = '#ece9ff' }) => {
  const tex = useMemo(() => sign(text, color, '600 96px Manrope, sans-serif', 1200, 180), [text, color]);
  return (
    <sprite position={position} scale={[scale, scale * 0.15, 1]}>
      <spriteMaterial map={tex} transparent depthWrite={false} opacity={0.9} />
    </sprite>
  );
};

const Skyline: React.FC = () => (
  <group>
    {/* земля */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[700, 700]} />
      <meshStandardMaterial color="#0b0a12" roughness={0.95} />
    </mesh>
    <gridHelper args={[700, 140, '#1a1830', '#13121f']} position={[0, 0.01, 0]} />
    <River />
    <District />
    {TOWERS.map((t) => (
      <Tower key={t.name} t={t} />
    ))}
    <Label text="Москва-Сити" position={[8, 96, -58]} scale={36} />
    <Label text="Москва-река" position={[-60, 2, 30]} scale={22} color="#8fb4ff" />
  </group>
);

export default Skyline;
