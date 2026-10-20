import React, { useMemo } from 'react';
import { useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { noPointLights } from './arch';
import { AVENUES, AVE_W, deg, nearRiver, polar } from './layout';

// Настоящие небоскрёбы со Sketchfab (CC BY 4.0, авторы — в подвале сайта): сжаты в public/city/*.glb.
// Каталог — габариты каждого здания в единицах файла (сняты заранее), чтобы расставить их
// без загрузки: дома, дороги и дальняя застройка знают места друг друга ещё до того, как модели скачаются.

type Source = 'asian' | 'atlanta' | 'singapore' | 'skyline' | 'msu';
interface Piece {
  src: Source;
  /** имя сетки в файле (для набора из многих зданий) */
  mesh?: string;
  w: number;
  d: number;
  h: number;
  /** масштаб в сцене */
  s: number;
}

const A = 0.3; // азиатский набор: 300 → 90 единиц, самые высокие — как башни Сити
const ASIAN: [string, number, number, number][] = [
  ['BACKGROUND_BUILDINGS_1009', 61.5, 46.5, 300.5],
  ['BACKGROUND_BUILDINGS_1008', 42.8, 42.8, 260.2],
  ['BACKGROUND_BUILDING_2_BACKGROUND', 65, 92.6, 235.6],
  ['BACKGROUND_BUILDING_2007', 56.1, 52.1, 192.5],
  ['BACKGROUND_BUILDINGS_1_BACKGROUND', 89.9, 37.7, 182.4],
  ['BACKGROUND_BUILDING_2008', 44.9, 44.8, 180.6],
  ['BACKGROUND_BUILDINGS_1001', 36.6, 27.4, 163.3],
  ['BACKGROUND_BUILDINGS_1007', 56, 44.4, 150.5],
  ['BACKGROUND_BUILDINGS_1006', 38.4, 38.1, 132.6],
  ['BACKGROUND_BUILDINGS_1002', 49.7, 49.7, 127.9],
  ['BACKGROUND_BUILDINGS_1004', 63.8, 25.5, 123.7],
  ['BACKGROUND_BUILDING_2001', 42.5, 51.3, 103.4],
  ['BACKGROUND_BUILDINGS_1003', 44.6, 38, 97.4],
  ['BACKGROUND_BUILDING_2005', 74.5, 25.4, 95],
  ['BACKGROUND_BUILDINGS_1005', 27.2, 29.6, 90.1],
  ['BACKGROUND_BUILDING_2003', 38.7, 20.7, 75.9],
  ['BACKGROUND_BUILDING_2002', 80.5, 25.2, 71.9],
  ['BACKGROUND_BUILDING_2004', 38, 78, 66.3],
  ['BACKGROUND_BUILDING_2006', 23.7, 27.7, 55.7],
];

const PIECES: Piece[] = [
  { src: 'atlanta', w: 60.8, d: 96.8, h: 212, s: 0.4 },
  { src: 'singapore', w: 59.3, d: 56.4, h: 105.8, s: 0.62 },
  ...ASIAN.map(([mesh, w, d, h]) => ({ src: 'asian' as const, mesh, w, d, h, s: A })),
];

export interface Placed {
  piece: Piece;
  x: number;
  z: number;
  ry: number;
  /** радиус участка (с запасом) */
  br: number;
}

const brOf = (p: Piece) => 0.5 * Math.hypot(p.w, p.d) * p.s + 1.5;

/** Участки, уже занятые процедурными башнями «Сити» (Эволюция и Федерация) — модели их обходят */
export const FIXED: { x: number; z: number; br: number }[] = [];
export function reserve(x: number, z: number, br: number) {
  FIXED.push({ x, z, br });
}

function freeSpot(x: number, z: number, br: number, placed: { x: number; z: number; br: number }[]) {
  const r = Math.hypot(x, z);
  if (r - br < 62) return false; // камера облетает город на радиусе ~57 — внутрь кольца дома не заходят
  const a = Math.atan2(x, z);
  for (const av of AVENUES) if (Math.cos(a - av) > 0 && Math.abs(Math.sin(a - av)) * r < br + AVE_W / 2 + 1.5) return false;
  if (nearRiver(x, z, br + 2)) return false;
  for (const q of placed) if ((q.x - x) ** 2 + (q.z - z) ** 2 < (q.br + br + 2) ** 2) return false;
  return true;
}

// Самые высокие здания встают кластером за нашей башней (как Москва-Сити), остальные — по бокам и дальше
const CLUSTER = deg(211.5);
const OFFSETS = [0, 14, -14, 27, -27, 40, -40, 54, -54, 68, -68, 84, -84, 100, -100, 118, -118, 140, -140, 160, -160, 180];

function placeAll(): Placed[] {
  const out: Placed[] = [];
  const taken = () => [...FIXED, ...out];
  const order = [...PIECES].sort((a, b) => b.h * b.s - a.h * a.s);
  let k = 0;
  for (const piece of order) {
    const br = brOf(piece);
    let done = false;
    for (let tries = 0; tries < OFFSETS.length && !done; tries++) {
      const off = OFFSETS[(k + tries) % OFFSETS.length];
      for (let r = 62 + br; r < 150 && !done; r += 3) {
        for (const j of [0, 4, -4, 8, -8]) {
          const a = CLUSTER + deg(off + j);
          const [x, z] = polar(a, r);
          if (freeSpot(x, z, br, taken())) {
            // фасадом примерно к центру, с небольшим разворотом — чтобы ряд не выглядел штампованным
            out.push({ piece, x, z, ry: a + Math.PI + deg(((k * 37) % 30) - 15), br });
            done = true;
            break;
          }
        }
      }
    }
    k++;
  }
  return out;
}

// Кварталы-«задники» из ночного набора (12 башен одним куском) и МГУ — дальше, за рекой
const SKYLINE: Piece = { src: 'skyline', w: 195.5, d: 172.6, h: 82, s: 0.42 };
const MSU: Piece = { src: 'msu', w: 15, d: 7.8, h: 8.5, s: 7.5 };

function placeFar(): Placed[] {
  const out: Placed[] = [];
  const add = (piece: Piece, aDeg: number, r0: number) => {
    const br = brOf(piece);
    for (let r = r0; r < 320; r += 4) {
      const [x, z] = polar(deg(aDeg), r);
      if (freeSpot(x, z, br, [...FIXED, ...PLACED, ...out])) {
        out.push({ piece, x, z, ry: deg(aDeg) + Math.PI, br });
        return;
      }
    }
  };
  add(MSU, 121.5, 175);
  for (const a of [61.5, 1.5, 301.5, 241.5, 181.5]) add(SKYLINE, a, 150);
  return out;
}

export let PLACED: Placed[] = [];
export let FAR: Placed[] = [];
/** вызывается после того, как процедурные башни зарезервировали свои участки */
export function layoutModels() {
  if (PLACED.length) return;
  PLACED = placeAll();
  FAR = placeFar();
}
/** участок занят зданием (для дальней застройки из простых коробок) */
export function occupied(x: number, z: number, pad = 0) {
  return [...FIXED, ...PLACED, ...FAR].some((q) => (q.x - x) ** 2 + (q.z - z) ** 2 < (q.br + pad) ** 2);
}

// ——— загрузка и подготовка ———
const url = (n: string) => `${import.meta.env.BASE_URL}city/${n}.glb`;
const FILES: Record<Source, string> = { asian: 'asian-night', atlanta: 'atlanta', singapore: 'singapore', skyline: 'night-skyline', msu: 'msu' };

/**
 * Физические материалы (лак, спекуляр) заменяем на обычные стандартные — заметно легче для видеокарты,
 * а ночью разницы не видно. И отключаем для них лампы комнат башни (см. noPointLights).
 */
const converted = new WeakMap<THREE.Material, THREE.Material>();
function lighten(m: THREE.Material): THREE.Material {
  const hit = converted.get(m);
  if (hit) return hit;
  const src = m as THREE.MeshPhysicalMaterial;
  const out = new THREE.MeshStandardMaterial({
    name: src.name,
    map: src.map,
    color: src.color,
    emissive: src.emissive,
    emissiveMap: src.emissiveMap,
    emissiveIntensity: Math.max(1, src.emissiveIntensity ?? 1) * 1.15,
    normalMap: src.normalMap,
    roughnessMap: src.roughnessMap,
    metalnessMap: src.metalnessMap,
    roughness: src.roughness ?? 0.5,
    metalness: src.metalness ?? 0.2,
    transparent: src.transparent,
    opacity: src.opacity,
    alphaMap: src.alphaMap,
    alphaTest: src.alphaTest,
    side: src.side,
    depthWrite: src.depthWrite,
  });
  noPointLights(out, `model-${out.transparent ? 't' : 'o'}`);
  converted.set(m, out);
  return out;
}
function prepare(root: THREE.Object3D) {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(lighten) : lighten(mesh.material);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
  });
}

/** Одно здание, выровненное: центр участка в (0, 0), основание на земле, высота в единицах сцены */
function normalize(obj: THREE.Object3D, s: number) {
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj);
  const c = box.getCenter(new THREE.Vector3());
  const g = new THREE.Group();
  obj.position.sub(new THREE.Vector3(c.x, box.min.y, c.z));
  g.add(obj);
  g.scale.setScalar(s);
  return g;
}

/** Из набора на много зданий достаём одно (и красные огни над ним) */
function extract(scene: THREE.Object3D, meshName: string) {
  scene.updateMatrixWorld(true);
  let target: THREE.Mesh | null = null;
  scene.traverse((o) => {
    if (!target && (o as THREE.Mesh).isMesh && o.name.startsWith(meshName.replace(/\./g, ''))) target = o as THREE.Mesh;
  });
  if (!target) return null;
  const t = target as THREE.Mesh;
  const box = new THREE.Box3().setFromObject(t);
  const g = new THREE.Group();
  const add = (m: THREE.Mesh) => {
    const c = new THREE.Mesh(m.geometry, m.material);
    c.applyMatrix4(m.matrixWorld);
    g.add(c);
  };
  add(t);
  // огни на крыше этого здания
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || !/FLARE|Flare/.test(m.name)) return;
    const b = new THREE.Box3().setFromObject(m);
    const c = b.getCenter(new THREE.Vector3());
    if (c.x > box.min.x - 4 && c.x < box.max.x + 4 && c.z > box.min.z - 4 && c.z < box.max.z + 4 && c.y > box.max.y - 30) add(m);
  });
  return g;
}

function useCity() {
  const loader = (l: GLTFLoader) => l.setMeshoptDecoder(MeshoptDecoder);
  const files = (Object.keys(FILES) as Source[]).map((k) => url(FILES[k]));
  const gltfs = useLoader(GLTFLoader, files, loader);
  return useMemo(() => {
    const by = {} as Record<Source, THREE.Object3D>;
    (Object.keys(FILES) as Source[]).forEach((k, i) => {
      prepare(gltfs[i].scene);
      by[k] = gltfs[i].scene;
    });
    // заготовки: по одной на здание, при расстановке — лёгкие копии (геометрия и материалы общие)
    const proto = new Map<string, THREE.Object3D>();
    const make = (p: Piece) => {
      const key = p.src + (p.mesh || '');
      let o = proto.get(key);
      if (!o) {
        const raw = p.mesh ? extract(by[p.src], p.mesh) : by[p.src].clone();
        o = raw ? normalize(raw, p.s) : new THREE.Group();
        proto.set(key, o);
      }
      return o.clone();
    };
    return [...PLACED, ...FAR].map((pl) => {
      const o = make(pl.piece);
      o.position.set(pl.x, 0, pl.z);
      o.rotation.y = pl.ry;
      return o;
    });
  }, [gltfs]);
}

const CityModels: React.FC = () => {
  const objs = useCity();
  return (
    <group>
      {objs.map((o, i) => (
        <primitive key={i} object={o} />
      ))}
    </group>
  );
};

export default CityModels;
