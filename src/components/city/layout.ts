import * as THREE from 'three';

// Общая планировка города: кольца, проспекты, река. Её используют и дороги, и расстановка зданий,
// чтобы дома никогда не вставали на проезжую часть и в воду.

export const TAU = Math.PI * 2;
export const deg = (d: number) => (d * Math.PI) / 180;
/** азимут как у камеры: 0 — на +z, по часовой при взгляде сверху */
export const polar = (a: number, r: number): [number, number] => [Math.sin(a) * r, Math.cos(a) * r];

export const AVENUE0 = 0.55; // проспект прямо к камере
export const AVENUES = Array.from({ length: 6 }, (_, k) => AVENUE0 + (k * TAU) / 6);
export const RING1 = { r: 26, w: 6 };
export const RING2 = { r: 52.5, w: 5 };
export const AVE_W = 5;

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
export const RIVER_CURVE = new THREE.CatmullRomCurve3(RIVER_PTS);
export const RIVER_W = 12;
const RIVER_SAMPLES = RIVER_CURVE.getSpacedPoints(600);
export function nearRiver(x: number, z: number, pad = 0) {
  const lim = (RIVER_W / 2 + pad) ** 2;
  for (const p of RIVER_SAMPLES) if ((p.x - x) ** 2 + (p.z - z) ** 2 < lim) return true;
  return false;
}

/** точка (x, z) лежит на проспекте (с запасом pad по обе стороны) */
export function onAvenue(x: number, z: number, pad = 0) {
  const r = Math.hypot(x, z);
  const a = Math.atan2(x, z);
  return AVENUES.some((av) => Math.cos(a - av) > 0 && Math.abs(Math.sin(a - av)) * r < AVE_W / 2 + pad);
}
