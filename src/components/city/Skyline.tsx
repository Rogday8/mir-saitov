import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { edgePath, noPointLights, profileGeometry, ringPath, roundedPoly, roundedRect, superellipse, tube, type Profile } from './arch';
import { FACADE_U, FACADE_V, dot, facade, plaza, rand, road, sign, type FacadeStyle } from './textures';

// Город вокруг нашей башни, кольцами — как Москва:
// площадь → Бульварное кольцо с машинами → парк с павильонами → второе кольцо →
// кольцо небоскрёбов (позади башни — кластер Москва-Сити) → река → дальняя застройка.
// Шесть проспектов расходятся лучами; все здания стоят на своих участках и не пересекаются.

type V3 = [number, number, number];
const TAU = Math.PI * 2;
const deg = (d: number) => (d * Math.PI) / 180;
/** азимут как у камеры: 0 — на +z, по часовой при взгляде сверху */
const polar = (a: number, r: number): [number, number] => [Math.sin(a) * r, Math.cos(a) * r];

export const AVENUE0 = 0.55; // проспект прямо к камере
export const AVENUES = Array.from({ length: 6 }, (_, k) => AVENUE0 + (k * TAU) / 6);
const RING1 = { r: 26, w: 6 };
const RING2 = { r: 52.5, w: 5 };
const AVE_W = 5;

// ——— материалы (общие, с кэшем) ———
const mats = new Map<string, THREE.Material>();
function cached<T extends THREE.Material>(key: string, make: () => T): T {
  let m = mats.get(key) as T | undefined;
  if (!m) {
    m = make();
    if ((m as unknown as THREE.MeshStandardMaterial).isMeshStandardMaterial) noPointLights(m, key === 'city' ? 'city' : 'std');
    mats.set(key, m);
  }
  return m;
}
const glass = (tint: string, style: FacadeStyle, seed: number, lit = 0.2) =>
  cached(`g-${tint}-${style}-${seed}-${lit}`, () => {
    const f = facade(seed, style, lit);
    return new THREE.MeshStandardMaterial({ color: tint, map: f.map, emissive: '#ffffff', emissiveMap: f.emissive, emissiveIntensity: 0.95, metalness: 0.82, roughness: 0.18 });
  });
const roofMat = () => cached('roof', () => new THREE.MeshStandardMaterial({ color: '#191822', roughness: 0.85, metalness: 0.2 }));
const concrete = (c = '#d9d7e0') => cached(`conc-${c}`, () => new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, metalness: 0.1 }));
/** светодиод: цвет ярче 1 — его подхватывает свечение (bloom) */
const led = (c: string, k = 2.2) => cached(`led-${c}-${k}`, () => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), toneMapped: false }));
const podiumMat = () =>
  cached('podium', () => {
    const f = facade(3, 'lobby', 1);
    return new THREE.MeshStandardMaterial({ color: '#5b5868', map: f.map, emissive: '#ffffff', emissiveMap: f.emissive, emissiveIntensity: 0.3, metalness: 0.82, roughness: 0.18 });
  });
const treeMat = () => cached('tree', () => new THREE.MeshStandardMaterial({ color: '#1f4a33', emissive: '#0b2a20', emissiveIntensity: 0.5, flatShading: true, roughness: 0.85 }));

// ——— проектирование башен ———
type Part = { geo: THREE.BufferGeometry; mat: THREE.Material | THREE.Material[]; pos?: V3 };
interface Built {
  parts: Part[];
  /** точки красных огней на крыше */
  beacons: V3[];
}

function body(p: Profile, mat: THREE.Material, roof: THREE.Material = roofMat(), pos?: V3): Part {
  return { geo: profileGeometry({ top: true, ...p }), mat: [mat, roof], pos };
}
function crown(p: Profile, color: string, t = 1, r = 0.14, k = 2.4, dy = -0.25): Part {
  return { geo: tube(ringPath(p, t, 0.1, dy), r, true), mat: led(color, k) };
}
function edges(p: Profile, ks: number[], color: string, r = 0.09, k = 1.8): Part[] {
  return ks.map((kk) => ({ geo: tube(edgePath(p, kk, 0.07, 48), r), mat: led(color, k) }));
}
function podium(w: number, d: number, h = 2.6, rho = 1.4): Part[] {
  const p: Profile = { shape: roundedRect(w, d, rho), h, levels: 1, smooth: true };
  return [body(p, podiumMat(), concrete('#3a3846')), { geo: tube(ringPath(p, 1, 0.06, 0), 0.06, true), mat: led('#ffd9a0', 1.4) }];
}
function spire(y: number, h: number, r = 0.45): Part {
  const g = new THREE.CylinderGeometry(0.04, r, h, 12);
  g.translate(0, y + h / 2, 0);
  return { geo: g, mat: concrete('#c9d3e6') };
}

/** «Восток»: треугольник со скруглёнными углами, сужается, светятся рёбра, шпиль */
function vostok(h: number, seed: number, rot = 0.5, withSpire = true): Built {
  const shape = roundedPoly(3, 8.6, 2.6, 8, rot);
  const p: Profile = { shape, h, levels: 24, scale: (t) => 1 - 0.2 * t, smooth: true, u0: seed * 3 };
  const parts = [body(p, glass('#6f8fc4', 'ribbon', seed, 0.3)), crown(p, '#bfe3ff'), ...edges(p, [4, 13, 22], '#9fd8ff'), ...podium(17, 17)];
  if (withSpire) parts.push(spire(h, 18));
  return { parts, beacons: [[0, h + (withSpire ? 18 : 0.6), 0]] };
}

/** «Эволюция»: сквиркл, закрученный на 150°, спиральные светящиеся рёбра */
function evolution(h: number, seed: number): Built {
  const shape = superellipse(5.4, 5.4, 3.6, 64);
  const p: Profile = { shape, h, levels: 56, twist: (t) => t * 2.6, smooth: true, u0: seed * 3 };
  return {
    parts: [body(p, glass('#8b95d6', 'ribbon', seed, 0.26)), crown(p, '#c9b8ff'), ...edges(p, [8, 24, 40, 56], '#b9a4ff', 0.1, 2.2), ...podium(14, 14)],
    beacons: [[0, h + 0.6, 0]],
  };
}

/** «Меркурий»: срезанные углы, сильное сужение, бронзовое стекло с ламелями */
function mercury(h: number, seed: number): Built {
  const shape = roundedPoly(4, 9.6, 2.2, 1, Math.PI / 4);
  const p: Profile = { shape, h, levels: 1, scale: (t) => 1 - 0.42 * t, smooth: false, u0: seed * 3 };
  return {
    parts: [body(p, glass('#c79a5a', 'fins', seed, 0.32)), crown(p, '#ffcf7a', 1, 0.16), ...edges(p, [0, 2, 4, 6], '#ffcf7a', 0.08, 1.6), ...podium(16, 16), spire(h, 9, 0.3)],
    beacons: [[0, h + 9, 0]],
  };
}

/** «ОКО»: квадрат со скруглёнными углами, вертикальные ламели, корона-каркас */
function oko(h: number, seed: number, w = 11, d = 11): Built {
  const shape = roundedRect(w, d, 1.4, 3);
  const p: Profile = { shape, h, levels: 1, scale: (t) => 1 - 0.06 * t, smooth: false, u0: seed * 3 };
  const top: Profile = { ...p, y0: h, h: 3.2, scale: () => 0.94 };
  const parts: Part[] = [
    body(p, glass('#4f73a6', 'fins', seed, 0.28)),
    crown(p, '#5fe8ff'),
    crown(top, '#5fe8ff', 1, 0.12, 2),
    ...edges(p, [1, 5, 9, 13], '#5fe8ff', 0.08, 1.6),
    ...podium(w + 6, d + 6),
  ];
  // стойки короны
  [1, 5, 9, 13].forEach((k) => parts.push({ geo: tube(edgePath(top, k, 0.0, 2), 0.12), mat: concrete('#cfd7e6') }));
  return { parts, beacons: [[0, h + 3.4, 0]] };
}

/** «Город Столиц»: стопка сдвинутых блоков, между ними светящиеся террасы */
function stack(h: number, seed: number, w = 10, d = 9, n = 6): Built {
  const parts: Part[] = [];
  const r = rand(seed);
  const hb = h / n;
  for (let i = 0; i < n; i++) {
    const s = 1 - i * 0.05;
    const p: Profile = { shape: roundedRect(w * s, d * s, 0.9, 4), h: hb, y0: i * hb, levels: 1, smooth: true, twist: () => (i % 2 ? 0.16 : -0.06), u0: i * 5 };
    const dx = (r() - 0.5) * 1.4;
    const dz = (r() - 0.5) * 1.2;
    parts.push(body(p, glass('#5d6c8f', 'office', seed + i, 0.3), roofMat(), [dx, 0, dz]));
    if (i > 0) {
      const slab: Profile = { shape: roundedRect(w * s + 1.6, d * s + 1.4, 1.2, 4), h: 0.36, y0: i * hb - 0.18, levels: 1, smooth: true, top: true, bottom: true, twist: () => 0.05 };
      parts.push({ geo: profileGeometry(slab), mat: [led('#ffd9a0', 1.1), concrete()] });
    }
  }
  parts.push(...podium(w + 6, d + 6));
  return { parts, beacons: [[0, h + 0.6, 0]] };
}

/** «Нева»: скруглённый квадрат с диагональной сеткой */
function diagrid(h: number, seed: number, w = 8.4, glow = '#e6efff'): Built {
  const p: Profile = { shape: roundedRect(w, w, 2.4, 8), h, levels: 1, smooth: true, u0: seed * 3 };
  return { parts: [body(p, glass('#7b8db5', 'diagrid', seed, 0.22)), crown(p, glow), ...podium(w + 6, w + 6)], beacons: [[0, h + 0.6, 0]] };
}

/** «Империя»: широкая пластина-линза */
function slab(h: number, seed: number): Built {
  const p: Profile = { shape: superellipse(8.2, 3.8, 2.6, 64), h, levels: 1, smooth: true, u0: seed * 3 };
  return {
    parts: [body(p, glass('#5f70a0', 'office', seed, 0.34)), crown(p, '#a58bff'), ...edges(p, [0, 32], '#a58bff', 0.1, 2), ...podium(22, 13)],
    beacons: [
      [-6, h + 0.6, 0],
      [6, h + 0.6, 0],
    ],
  };
}

/** «Огурец»: круглая башня с выпуклым силуэтом и диагональной сеткой, светящийся купол */
function gherkin(h: number, seed: number): Built {
  const R = 6.4;
  const prof = (t: number) => Math.sin(Math.PI * (0.18 + 0.76 * t)) ** 0.6;
  const p: Profile = { shape: superellipse(R, R, 2, 48), h, levels: 36, scale: prof, smooth: true, u0: seed * 3 };
  const rt = R * prof(1);
  const dome = new THREE.SphereGeometry(rt, 32, 12, 0, TAU, 0, Math.PI / 2);
  dome.translate(0, h, 0);
  return { parts: [body(p, glass('#4d8a96', 'diagrid', seed, 0.24)), { geo: dome, mat: led('#bff6ff', 1.1) }, ...podium(15, 15)], beacons: [[0, h + rt, 0]] };
}

/** Закрученный шестигранник с гранёным фасадом */
function hexTwist(h: number, seed: number, glow = '#ff9ccf'): Built {
  const p: Profile = { shape: roundedPoly(6, 6.6, 0.5, 2), h, levels: 44, twist: (t) => t * 1.5, smooth: false, u0: seed * 3 };
  return {
    parts: [body(p, glass('#6b78a3', 'ribbon', seed, 0.26)), crown(p, glow), ...edges(p, [1, 4, 7, 10, 13, 16], glow, 0.08, 1.8), ...podium(15, 15)],
    beacons: [[0, h + 0.6, 0]],
  };
}

/** Спиральная башня: светящийся ствол и плиты этажей, каждая повёрнута чуть больше */
function spiral(h: number, seed: number, glow = '#ffe2b8'): Built {
  const core: Profile = { shape: superellipse(2.9, 2.9, 2, 32), h, levels: 1, smooth: true, u0: seed * 3 };
  const plates: THREE.BufferGeometry[] = [];
  const pl = superellipse(5.2, 3.7, 2.3, 48);
  let i = 0;
  for (let y = 1.2; y < h - 0.4; y += 1.25, i++) {
    const tw = i * 0.075;
    const g = profileGeometry({ shape: pl, h: 0.26, y0: y, levels: 1, smooth: true, top: true, bottom: true, twist: () => tw });
    g.clearGroups();
    plates.push(g);
  }
  const last = (i - 1) * 0.075;
  return {
    parts: [
      body(core, glass('#7a6f80', 'office', seed, 0.7)),
      { geo: mergeGeometries(plates), mat: concrete('#e8e6ee') },
      { geo: tube(ringPath({ shape: pl, h, twist: () => last }, 1, 0.08, -0.3), 0.1, true), mat: led(glow, 1.8) },
      ...podium(13, 11),
    ],
    beacons: [[0, h + 0.6, 0]],
  };
}

/** Линза с мягкими остриями, слегка закручена */
function lens(h: number, seed: number, glow = '#8b6cff'): Built {
  const p: Profile = { shape: superellipse(7, 2.8, 1.55, 64), h, levels: 20, twist: (t) => t * 0.4, smooth: true, u0: seed * 3 };
  return { parts: [body(p, glass('#7470b2', 'ribbon', seed, 0.28)), crown(p, glow), ...edges(p, [0, 32], glow, 0.1, 2.2), ...podium(18, 11)], beacons: [[0, h + 0.6, 0]] };
}

/** Ступенчатое здание с садами на террасах */
function terraced(seed: number): Built {
  const parts: Part[] = [];
  const green = concrete('#2f5a3c');
  const r = rand(seed);
  const crowns: THREE.BufferGeometry[] = [];
  const n = 5;
  for (let i = 0; i < n; i++) {
    const w = 15 - i * 2.2;
    const d = 11.5 - i * 1.7;
    parts.push(body({ shape: roundedRect(w, d, 1.6, 6), h: 6, y0: i * 6, levels: 1, smooth: true, u0: i * 7 }, glass('#6a7593', 'office', seed + i, 0.36), green));
    // деревья по краю террасы
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * TAU + r() * 0.3;
      const g = new THREE.IcosahedronGeometry(0.55 + r() * 0.35, 0);
      g.translate((Math.cos(a) * (w - 1.4)) / 2.15, i * 6 + 6.5, (Math.sin(a) * (d - 1.4)) / 2.15);
      crowns.push(g);
    }
  }
  parts.push({ geo: mergeGeometries(crowns), mat: cached('terr-tree', () => new THREE.MeshStandardMaterial({ color: '#3d7a4c', emissive: '#14402a', emissiveIntensity: 0.6, flatShading: true, roughness: 0.8 })) });
  parts.push(...podium(19, 15, 1.2));
  return { parts, beacons: [[0, 30.6, 0]] };
}

/** Сквиркл с короной заданного цвета */
function squircle(h: number, seed: number, glow: string, tint = '#6d7ba0'): Built {
  const p: Profile = { shape: superellipse(5, 5, 4, 48), h, levels: 1, smooth: true, u0: seed * 3 };
  return { parts: [body(p, glass(tint, 'office', seed, 0.3)), crown(p, glow), ...podium(13, 13)], beacons: [[0, h + 0.6, 0]] };
}

interface Site {
  name: string;
  a: number; // азимут, град
  r: number;
  ry?: number;
  build: () => Built;
}

// Участки подобраны так, что между зданиями (вместе со стилобатами) и до проспектов остаётся зазор
export const SITES: Site[] = [
  // кластер Москва-Сити — за нашей башней (вокруг проспекта 211.5°)
  { name: 'Эволюция', a: 221.5, r: 70, build: () => evolution(64, 11) },
  { name: 'Федерация. Восток', a: 232.5, r: 90, build: () => vostok(92, 12) },
  { name: 'Федерация. Запад', a: 244.5, r: 70, build: () => vostok(66, 13, 0.5 + Math.PI, false) },
  { name: 'Город Столиц', a: 255.5, r: 90, build: () => stack(70, 14) },
  { name: 'Нева', a: 262.5, r: 70, build: () => diagrid(62, 15) },
  { name: 'Меркурий', a: 201.5, r: 70, build: () => mercury(76, 16) },
  { name: 'ОКО', a: 190.5, r: 90, build: () => oko(84, 17) },
  { name: 'ОКО. Юг', a: 179.5, r: 70, build: () => oko(54, 18, 9.5, 8.5) },
  { name: 'Империя', a: 168.5, r: 90, ry: 0.4, build: () => slab(50, 19) },
  { name: 'Нева 2', a: 160.5, r: 70, build: () => diagrid(56, 20, 8, '#c8ff4d') },
  // правая сторона
  { name: 'Огурец', a: 103.5, r: 74, build: () => gherkin(44, 21) },
  { name: 'Грань', a: 118.5, r: 90, build: () => hexTwist(70, 22) },
  { name: 'Спираль', a: 131.5, r: 72, build: () => spiral(52, 23) },
  { name: 'Сквиркл', a: 142.5, r: 88, build: () => squircle(46, 24, '#3ee6ff') },
  // левая сторона
  { name: 'Линза', a: 282.5, r: 72, ry: 0.7, build: () => lens(58, 25) },
  { name: 'Сады', a: 297.5, r: 90, ry: 0.3, build: () => terraced(26) },
  { name: 'Линза 2', a: 309.5, r: 72, ry: -0.5, build: () => lens(46, 27, '#3ee6ff') },
  { name: 'Треугольник', a: 321.5, r: 88, build: () => vostok(48, 28, 1.2, false) },
  // со стороны камеры — ниже, чтобы не закрывать вид при облёте
  { name: 'Сетка', a: 343.5, r: 80, build: () => diagrid(44, 29, 8, '#ff9ccf') },
  { name: 'Блоки', a: 358.5, r: 92, build: () => stack(36, 30, 9, 8, 4) },
  { name: 'Спираль 2', a: 12.5, r: 80, build: () => spiral(40, 31, '#c8ff4d') },
  { name: 'Сквиркл 2', a: 23.5, r: 92, build: () => squircle(34, 32, '#8b6cff', '#7d6f9c') },
  { name: 'Треугольник 2', a: 43.5, r: 82, build: () => vostok(40, 33, 0.2, false) },
  { name: 'Линза 3', a: 58.5, r: 94, ry: 1.2, build: () => lens(38, 34, '#c8ff4d') },
  { name: 'Грань 2', a: 72.5, r: 80, build: () => hexTwist(46, 35, '#3ee6ff') },
  { name: 'Сквиркл 3', a: 83.5, r: 94, build: () => squircle(30, 36, '#ff9ccf') },
];

// красные огни на крышах мигают все вместе — как у настоящих высоток
const beaconMat = new THREE.MeshBasicMaterial({ color: '#ff2a2a', toneMapped: false });

const Tower: React.FC<{ s: Site }> = ({ s }) => {
  const b = useMemo(() => s.build(), [s]);
  const [x, z] = polar(deg(s.a), s.r);
  // фасадом к центру
  const ry = deg(s.a) + Math.PI + (s.ry || 0);
  return (
    <group position={[x, 0, z]} rotation={[0, ry, 0]}>
      {b.parts.map((p, i) => (
        <mesh key={i} geometry={p.geo} material={p.mat} position={p.pos} />
      ))}
      {b.beacons.map((p, i) => (
        <mesh key={`b${i}`} position={p} material={beaconMat}>
          <sphereGeometry args={[0.32, 8, 8]} />
        </mesh>
      ))}
    </group>
  );
};

// ——— небо: градиент и звёзды ———
export const SKY_HORIZON = '#1a1530';
const Sky: React.FC = () => {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: { cH: { value: new THREE.Color(SKY_HORIZON) }, cM: { value: new THREE.Color('#0d0a1c') }, cZ: { value: new THREE.Color('#05040b') }, cGlow: { value: new THREE.Color('#3a2a6a') } },
        vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: `uniform vec3 cH; uniform vec3 cM; uniform vec3 cZ; uniform vec3 cGlow; varying vec3 vP;
          void main(){
            float h = max(vP.y, 0.0);
            vec3 c = mix(cH, cM, smoothstep(0.0, 0.18, h));
            c = mix(c, cZ, smoothstep(0.18, 0.7, h));
            // зарево над Сити (позади башни)
            vec2 d = normalize(vec2(-0.52, -0.85));
            float g = max(dot(normalize(vP.xz), d), 0.0);
            c += cGlow * pow(g, 6.0) * (1.0 - smoothstep(0.0, 0.35, h)) * 0.55;
            gl_FragColor = vec4(c, 1.0);
          }`,
      }),
    [],
  );
  const stars = useMemo(() => {
    const r = rand(9);
    const p: number[] = [];
    for (let i = 0; i < 1400; i++) {
      const a = r() * TAU;
      const y = 0.12 + r() * 0.88;
      const s = Math.sqrt(1 - y * y);
      p.push(Math.cos(a) * s * 820, y * 820, Math.sin(a) * s * 820);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    return g;
  }, []);
  return (
    <group>
      <mesh material={mat} renderOrder={-1}>
        <sphereGeometry args={[900, 32, 16]} />
      </mesh>
      <points geometry={stars}>
        <pointsMaterial color="#c9c6ff" size={1.6} sizeAttenuation={false} fog={false} transparent opacity={0.75} depthWrite={false} />
      </points>
    </group>
  );
};

// ——— площадь у башни ———
const Plaza: React.FC = () => {
  const tex = useMemo(() => plaza(), []);
  const trees = useMemo(() => {
    const out: [number, number][] = [];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU + 0.1;
      // не ставим деревья перед открытой стороной башни
      const da = Math.atan2(Math.sin(a - AVENUE0), Math.cos(a - AVENUE0));
      if (Math.abs(da) < 0.75) continue;
      out.push(polar(a, 16.3));
    }
    return out;
  }, []);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} receiveShadow>
        <circleGeometry args={[22.5, 96]} />
        <primitive object={cached('plaza', () => new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, metalness: 0.1 }))} attach="material" />
      </mesh>
      {/* светящиеся кольца в мощении */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} material={led('#c8ff4d', 1.1)}>
        <ringGeometry args={[12.55, 12.75, 128]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} material={led('#8b6cff', 1.6)}>
        <ringGeometry args={[21.9, 22.15, 160]} />
      </mesh>
      {trees.map(([x, z], i) => (
        <group key={i} position={[x, 0.03, z]}>
          <mesh position={[0, 0.3, 0]} material={concrete('#3a3846')}>
            <cylinderGeometry args={[0.9, 0.9, 0.6, 24]} />
          </mesh>
          <mesh position={[0, 0.62, 0]} rotation={[Math.PI / 2, 0, 0]} material={led('#c8ff4d', 0.9)}>
            <torusGeometry args={[0.9, 0.035, 6, 32]} />
          </mesh>
          <mesh position={[0, 1.1, 0]} material={concrete('#4a3a2e')}>
            <cylinderGeometry args={[0.08, 0.12, 1.2, 8]} />
          </mesh>
          <mesh position={[0, 2.1, 0]} material={treeMat()} castShadow>
            <icosahedronGeometry args={[0.95, 1]} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

// ——— дороги: кольца и лучи-проспекты ———
function annulus(r: number, w: number, seg = 256, y = 0.02) {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * TAU;
    const [x0, z0] = polar(a, r - w / 2);
    const [x1, z1] = polar(a, r + w / 2);
    pos.push(x0, y, z0, x1, y, z1);
    const u = (a * r) / 16;
    uv.push(u, 0, u, 1);
    if (i < seg) {
      const k = i * 2;
      idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
    }
  }
  return flatGeometry(pos, idx, uv);
}

/** плоская геометрия на земле: проверяем, что лицевая сторона смотрит вверх */
function flatGeometry(pos: number[], idx: number[], uv?: number[]) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  if (uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  if (g.attributes.normal.getY(0) < 0) {
    for (let i = 0; i < idx.length; i += 3) [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]];
    g.setIndex(idx);
    g.computeVertexNormals();
  }
  return g;
}

/** отрезок проспекта от r0 до r1 по азимуту a */
function avenueGeo(a: number, r0: number, r1: number, w = AVE_W, y = 0.035) {
  const g = new THREE.PlaneGeometry(r1 - r0, w);
  g.rotateX(-Math.PI / 2);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setX(i, (uv.getX(i) * (r1 - r0)) / 16);
  g.translate((r0 + r1) / 2, y, 0);
  g.rotateY(a - Math.PI / 2);
  return g;
}

// ——— река ———
const RIVER_PTS = (() => {
  const pts: THREE.Vector3[] = [];
  const add = (a: number, r: number) => {
    const [x, z] = polar(a, r);
    pts.push(new THREE.Vector3(x, 0, z));
  };
  add(deg(70), 330);
  add(deg(84), 200);
  add(deg(98), 130);
  for (let d = 112; d <= 318; d += 14) add(deg(d), 114 + Math.sin(deg(d) * 3) * 3);
  add(deg(332), 130);
  add(deg(345), 200);
  add(deg(358), 330);
  return pts;
})();
const RIVER_CURVE = new THREE.CatmullRomCurve3(RIVER_PTS);
const RIVER_W = 12;
const RIVER_SAMPLES = RIVER_CURVE.getSpacedPoints(600);
function nearRiver(x: number, z: number, pad = 0) {
  const lim = (RIVER_W / 2 + pad) ** 2;
  for (const p of RIVER_SAMPLES) if ((p.x - x) ** 2 + (p.z - z) ** 2 < lim) return true;
  return false;
}
/** участки проспекта, где он пересекает реку (по радиусу) */
function crossings(a: number, r0: number, r1: number) {
  const out: [number, number][] = [];
  let start = -1;
  for (let r = r0; r <= r1; r += 0.5) {
    const [x, z] = polar(a, r);
    const w = nearRiver(x, z, 1.5);
    if (w && start < 0) start = r;
    if (!w && start >= 0) {
      out.push([start, r]);
      start = -1;
    }
  }
  return out;
}
const AVE_R0 = RING1.r + RING1.w / 2;
const AVE_R1 = 290;
const BRIDGES = AVENUES.map((a) => crossings(a, AVE_R0, AVE_R1));

const River: React.FC = () => {
  const { water, lamps } = useMemo(() => {
    const N = 600;
    const pos: number[] = [];
    const idx: number[] = [];
    const lp: number[] = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const p = RIVER_CURVE.getPointAt(t);
      const tan = RIVER_CURVE.getTangentAt(t);
      const nx = -tan.z;
      const nz = tan.x;
      pos.push(p.x + (nx * RIVER_W) / 2, 0.045, p.z + (nz * RIVER_W) / 2, p.x - (nx * RIVER_W) / 2, 0.045, p.z - (nz * RIVER_W) / 2);
      if (i < N) {
        const a = i * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
      const e = RIVER_W / 2 + 0.8;
      if (i % 3 === 0) lp.push(p.x + nx * e, 0.6, p.z + nz * e, p.x - nx * e, 0.6, p.z - nz * e);
    }
    const l = new THREE.BufferGeometry();
    l.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
    return { water: flatGeometry(pos, idx), lamps: l };
  }, []);
  const dotTex = useMemo(() => dot(), []);
  return (
    <group>
      <mesh geometry={water}>
        <primitive object={cached('water', () => new THREE.MeshStandardMaterial({ color: '#0b1630', metalness: 0.9, roughness: 0.12, emissive: '#0a1a3c', emissiveIntensity: 0.5 }))} attach="material" />
      </mesh>
      <points geometry={lamps}>
        <pointsMaterial map={dotTex} color="#ffd38a" size={1.5} sizeAttenuation transparent depthWrite={false} toneMapped={false} />
      </points>
    </group>
  );
};

const Roads: React.FC = () => {
  const tex = useMemo(() => road(), []);
  const { rings, aves, deck, rails, lamps } = useMemo(() => {
    const rings = [annulus(RING1.r, RING1.w), annulus(RING2.r, RING2.w)];
    const aves: THREE.BufferGeometry[] = [];
    const decks: THREE.BufferGeometry[] = [];
    const railsG: THREE.BufferGeometry[] = [];
    AVENUES.forEach((a, k) => {
      let r = AVE_R0;
      for (const [b0, b1] of BRIDGES[k]) {
        if (b0 - 3 - r > 1) aves.push(avenueGeo(a, r, b0 - 3));
        const len = b1 - b0 + 6;
        const dg = new THREE.BoxGeometry(len, 0.5, AVE_W + 1);
        dg.translate((b0 + b1) / 2, 0.25, 0);
        dg.rotateY(a - Math.PI / 2);
        decks.push(dg);
        [-1, 1].forEach((sd) => {
          const rail = new THREE.BoxGeometry(len, 0.12, 0.12);
          rail.translate((b0 + b1) / 2, 0.85, sd * (AVE_W / 2 + 0.4));
          rail.rotateY(a - Math.PI / 2);
          railsG.push(rail);
        });
        r = b1 + 3;
      }
      aves.push(avenueGeo(a, r, AVE_R1));
    });
    // фонари: по обеим сторонам колец и проспектов
    const lp: number[] = [];
    [RING1, RING2].forEach(({ r, w }) => {
      const n = Math.round((TAU * r) / 4.5);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU;
        [r - w / 2 - 0.6, r + w / 2 + 0.6].forEach((rr) => {
          const [x, z] = polar(a, rr);
          lp.push(x, 0.9, z);
        });
      }
    });
    AVENUES.forEach((a) => {
      const nx = Math.cos(a);
      const nz = -Math.sin(a);
      for (let r = AVE_R0 + 3; r < AVE_R1; r += 5) {
        const [x, z] = polar(a, r);
        if (nearRiver(x, z, 1)) continue;
        [-1, 1].forEach((sd) => lp.push(x + nx * sd * (AVE_W / 2 + 0.6), 0.9, z + nz * sd * (AVE_W / 2 + 0.6)));
      }
    });
    const lamps = new THREE.BufferGeometry();
    lamps.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
    return { rings, aves: mergeGeometries(aves), deck: decks.length ? mergeGeometries(decks) : null, rails: railsG.length ? mergeGeometries(railsG) : null, lamps };
  }, []);
  const dotTex = useMemo(() => dot(), []);
  return (
    <group>
      {rings.map((g, i) => (
        <mesh key={i} geometry={g} receiveShadow>
          <primitive object={cached('road', () => new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, metalness: 0.15 }))} attach="material" />
        </mesh>
      ))}
      <mesh geometry={aves}>
        <primitive object={cached('road', () => new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, metalness: 0.15 }))} attach="material" />
      </mesh>
      {deck && <mesh geometry={deck} material={concrete('#3b3946')} />}
      {rails && <mesh geometry={rails} material={led('#ffd9a0', 1.4)} />}
      <points geometry={lamps}>
        <pointsMaterial map={dotTex} color="#ffe1a8" size={0.65} sizeAttenuation transparent depthWrite={false} toneMapped={false} />
      </points>
    </group>
  );
};

// ——— машины: фары и стоп-сигналы ———
interface Lane {
  kind: 'ring' | 'ave';
  r?: number;
  a?: number;
  off?: number;
  dir: 1 | -1;
  n: number;
  speed: number;
  color: string;
  bridges?: [number, number][];
}
const LANES: Lane[] = [
  { kind: 'ring', r: RING1.r - 1.4, dir: 1, n: 26, speed: 0.11, color: '#fff3d6' },
  { kind: 'ring', r: RING1.r + 1.4, dir: -1, n: 26, speed: 0.1, color: '#ff3b3b' },
  { kind: 'ring', r: RING2.r - 1.1, dir: -1, n: 40, speed: 0.06, color: '#fff3d6' },
  { kind: 'ring', r: RING2.r + 1.1, dir: 1, n: 40, speed: 0.065, color: '#ff3b3b' },
  ...AVENUES.flatMap((a, k): Lane[] => [
    { kind: 'ave', a, off: -1.2, dir: 1, n: 14, speed: 9, color: '#ff3b3b', bridges: BRIDGES[k] },
    { kind: 'ave', a, off: 1.2, dir: -1, n: 14, speed: 8, color: '#fff3d6', bridges: BRIDGES[k] },
  ]),
];

const Cars: React.FC = () => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const total = LANES.reduce((s, l) => s + l.n, 0);
  const seeds = useMemo(() => {
    const r = rand(5);
    return LANES.map((l) => Array.from({ length: l.n }, (_, i) => (i + r() * 0.6) / l.n));
  }, []);
  const o = useMemo(() => new THREE.Object3D(), []);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    let k = 0;
    const c = new THREE.Color();
    LANES.forEach((l) => {
      c.set(l.color).multiplyScalar(1.7);
      for (let i = 0; i < l.n; i++) m.setColorAt(k++, c);
    });
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, []);
  useFrame((st) => {
    const m = ref.current;
    if (!m) return;
    const t = st.clock.elapsedTime;
    let k = 0;
    LANES.forEach((l, li) => {
      for (let i = 0; i < l.n; i++) {
        const s0 = seeds[li][i];
        if (l.kind === 'ring') {
          const a = (s0 + l.dir * t * l.speed * (16 / l.r!)) * TAU;
          const [x, z] = polar(a, l.r!);
          o.position.set(x, 0.28, z);
          o.rotation.set(0, a + Math.PI / 2, 0);
        } else {
          const span = AVE_R1 - AVE_R0;
          let u = (s0 + (l.dir * t * l.speed) / span) % 1;
          if (u < 0) u += 1;
          const r = AVE_R0 + u * span;
          const [x, z] = polar(l.a!, r);
          const nx = Math.cos(l.a!);
          const nz = -Math.sin(l.a!);
          const onBridge = l.bridges!.some(([b0, b1]) => r > b0 - 3 && r < b1 + 3);
          o.position.set(x + nx * l.off!, onBridge ? 0.75 : 0.28, z + nz * l.off!);
          o.rotation.set(0, l.a!, 0);
        }
        o.updateMatrix();
        m.setMatrixAt(k++, o.matrix);
      }
    });
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, total]} frustumCulled={false}>
      <boxGeometry args={[0.3, 0.14, 0.7]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
};

// ——— парк между кольцами: деревья и павильоны ———
const PAVILIONS = AVENUES.map((a) => ({ a: a + TAU / 12, r: 40 }));

/** Стеклянный павильон: тёплый свет внутри, тонкая белая крыша с козырьком, сад на крыше */
const Pavilion: React.FC<{ a: number; r: number; seed: number }> = ({ a, r, seed }) => {
  const g = useMemo(() => {
    const glassP: Profile = { shape: superellipse(4.2, 2.6, 3.4, 48), h: 2.6, y0: 0.03, levels: 1, smooth: true };
    const roof: Profile = { shape: superellipse(5, 3.3, 3.4, 48), h: 0.24, y0: 2.63, levels: 1, smooth: true, top: true, bottom: true };
    const garden: Profile = { shape: superellipse(3.6, 2.1, 3.4, 48), h: 0.14, y0: 2.87, levels: 1, smooth: true, top: true };
    return {
      glass: profileGeometry({ ...glassP, top: true }),
      roof: profileGeometry(roof),
      garden: profileGeometry(garden),
      edge: tube(ringPath(roof, 0, 0.02, 0.02), 0.04, true),
    };
  }, []);
  const [x, z] = polar(a, r);
  return (
    <group position={[x, 0, z]} rotation={[0, a, 0]}>
      <mesh geometry={g.glass} material={[podiumMat(), roofMat()]} />
      <mesh geometry={g.roof} material={[concrete('#ecebf2'), concrete('#ecebf2')]} />
      <mesh geometry={g.garden} material={[concrete('#2f5a3c'), concrete('#3b6b47')]} />
      <mesh geometry={g.edge} material={led(['#c8ff4d', '#8b6cff', '#3ee6ff'][seed % 3], 1.6)} />
    </group>
  );
};

const Park: React.FC = () => {
  const { trunks, crowns } = useMemo(() => {
    const r = rand(77);
    const o = new THREE.Object3D();
    const list: THREE.Matrix4[] = [];
    const pav = PAVILIONS.map((p) => polar(p.a, p.r));
    for (let tries = 0; tries < 5000 && list.length < 190; tries++) {
      const a = r() * TAU;
      const rr = 31.5 + r() * 17;
      // не на проспектах, не на дорожке и не у павильонов
      if (AVENUES.some((av) => Math.abs(Math.sin(a - av)) * rr < AVE_W / 2 + 1.6 && Math.cos(a - av) > 0)) continue;
      if (Math.abs(rr - 40) < 1.9) continue;
      const [x, z] = polar(a, rr);
      if (pav.some(([px, pz]) => (px - x) ** 2 + (pz - z) ** 2 < 7.5 ** 2)) continue;
      if (list.some((m) => (m.elements[12] - x) ** 2 + (m.elements[14] - z) ** 2 < 2.6 ** 2)) continue;
      o.position.set(x, 0, z);
      o.scale.setScalar(0.6 + r() * 0.45);
      o.rotation.y = r() * TAU;
      o.updateMatrix();
      list.push(o.matrix.clone());
    }
    const tg = new THREE.CylinderGeometry(0.08, 0.13, 1.4, 6);
    tg.translate(0, 0.7, 0);
    const cg = new THREE.IcosahedronGeometry(1, 1);
    cg.scale(1, 1.15, 1);
    cg.translate(0, 2.15, 0);
    const trunks = new THREE.InstancedMesh(tg, concrete('#4a3a2e'), list.length);
    const crowns = new THREE.InstancedMesh(cg, treeMat(), list.length);
    const col = new THREE.Color();
    list.forEach((m, i) => {
      trunks.setMatrixAt(i, m);
      crowns.setMatrixAt(i, m);
      col.setHSL(0.37 + r() * 0.08, 0.4, 0.2 + r() * 0.1);
      crowns.setColorAt(i, col);
    });
    trunks.frustumCulled = crowns.frustumCulled = false;
    return { trunks, crowns };
  }, []);
  const path = useMemo(() => annulus(40, 2.4, 256, 0.025), []);
  return (
    <group>
      <primitive object={trunks} />
      <primitive object={crowns} />
      <mesh geometry={path}>
        <primitive object={concrete('#2a2834')} attach="material" />
      </mesh>
      {PAVILIONS.map((p, i) => (
        <Pavilion key={i} a={p.a} r={p.r} seed={i} />
      ))}
    </group>
  );
};

// ——— дальняя застройка: кварталы по кольцам, у каждого дома свой участок ———
function cityMaterial() {
  return cached('city', () => {
    const f = facade(501, 'office', 0.24);
    const m = new THREE.MeshStandardMaterial({ color: '#ffffff', map: f.map, emissive: '#ffffff', emissiveMap: f.emissive, emissiveIntensity: 0.95, roughness: 0.45, metalness: 0.55 });
    // UV фасада считаем из размеров дома, чтобы окна были одного размера у низких и высоких домов
    m.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vRoof;').replace(
        '#include <uv_vertex>',
        `#include <uv_vertex>
          {
            vec3 sc = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
            vec3 lp = position * sc;
            float off = (instanceMatrix[3].x + instanceMatrix[3].z) * 0.37;
            vec2 f = abs(normal.x) > 0.5 ? vec2(lp.z, lp.y) : vec2(lp.x, lp.y);
            vRoof = abs(normal.y) > 0.5 ? 1.0 : 0.0;
            vec2 fuv = (f + vec2(off, 0.0)) / vec2(${FACADE_U.toFixed(1)}, ${FACADE_V.toFixed(1)});
            vMapUv = fuv;
            vEmissiveMapUv = fuv;
          }`,
      );
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vRoof;')
        .replace('#include <map_fragment>', '#include <map_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.05, 0.05, 0.07), vRoof);')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance *= (1.0 - vRoof);');
    };
    return m;
  });
}

const OuterCity: React.FC = () => {
  const mesh = useMemo(() => {
    const r = rand(42);
    const geo = new THREE.BoxGeometry(1, 1, 1);
    geo.translate(0, 0.5, 0);
    const cells: THREE.Matrix4[] = [];
    const cols: THREE.Color[] = [];
    const o = new THREE.Object3D();
    const tints = ['#5a6584', '#6a6f86', '#4f5c78', '#7a7486', '#5d6a7d'];
    for (let rr = 106; rr < 300; rr += 15) {
      const n = Math.floor((TAU * rr) / 15);
      for (let i = 0; i < n; i++) {
        const a = ((i + 0.5) / n) * TAU;
        // проспекты
        if (AVENUES.some((av) => Math.abs(Math.sin(a - av)) * rr < AVE_W / 2 + 6 && Math.cos(a - av) > 0)) continue;
        if (r() < 0.12) continue; // скверы
        const [x, z] = polar(a, rr);
        if (nearRiver(x, z, 9)) continue;
        const far = (rr - 106) / 194;
        const w = 7 + r() * 5;
        const d = 7 + r() * 4;
        const tall = r() < 0.08;
        const h = tall ? 18 + r() * 16 : 3 + r() * (13 - far * 7);
        o.position.set(x, 0, z);
        o.scale.set(w, h, d);
        o.rotation.set(0, a, 0);
        o.updateMatrix();
        cells.push(o.matrix.clone());
        cols.push(new THREE.Color(tints[(r() * tints.length) | 0]));
      }
    }
    const m = new THREE.InstancedMesh(geo, cityMaterial(), cells.length);
    cells.forEach((mx, i) => {
      m.setMatrixAt(i, mx);
      m.setColorAt(i, cols[i]);
    });
    m.frustumCulled = false;
    return m;
  }, []);
  return <primitive object={mesh} />;
};

// красные огни мигают
const Blink: React.FC = () => {
  useFrame((st) => {
    const k = 0.5 + 0.5 * Math.sin(st.clock.elapsedTime * 2.4);
    beaconMat.color.setRGB(0.4 + k * 2.4, 0.04, 0.04);
  });
  return null;
};

// Подписи на карте
const Label: React.FC<{ text: string; position: V3; scale: number; color?: string }> = ({ text, position, scale, color = '#ece9ff' }) => {
  const tex = useMemo(() => sign(text, color, '600 96px Manrope, sans-serif', 1200, 180), [text, color]);
  return (
    <sprite position={position} scale={[scale, scale * 0.15, 1]}>
      <spriteMaterial map={tex} transparent depthWrite={false} opacity={0.85} fog={false} />
    </sprite>
  );
};

const CITY_LABEL = polar(deg(211.5), 84);
const RIVER_LABEL = polar(deg(150), 122);

const Skyline: React.FC = () => (
  <group>
    <Sky />
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <circleGeometry args={[700, 64]} />
      <primitive object={cached('ground', () => new THREE.MeshStandardMaterial({ color: '#0d0c15', roughness: 0.92 }))} attach="material" />
    </mesh>
    <Plaza />
    <Roads />
    <Cars />
    <Park />
    <River />
    <OuterCity />
    {SITES.map((s) => (
      <Tower key={s.name} s={s} />
    ))}
    <Blink />
    <Label text="Москва-Сити" position={[CITY_LABEL[0], 108, CITY_LABEL[1]]} scale={34} />
    <Label text="Москва-река" position={[RIVER_LABEL[0], 3, RIVER_LABEL[1]]} scale={20} color="#9fbfff" />
  </group>
);

export default Skyline;
