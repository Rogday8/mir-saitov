import * as THREE from 'three';
import { FACADE_U, FACADE_V } from './textures';

// Архитектурный конструктор: план этажа (многоугольник в плоскости x-z) «протягивается» вверх
// с сужением и закруткой. UV — в единицах сцены, поэтому этажи и окна у всех башен одного размера.

export type Pt = [number, number];

/** Правильный многоугольник со скруглёнными углами (n углов, R — до вершины, rho — радиус скругления) */
export function roundedPoly(n: number, R: number, rho: number, segs = 6, rot = 0): Pt[] {
  const half = Math.PI / n;
  const rin = R * Math.cos(half);
  const cr = (rin - rho) / Math.cos(half);
  const out: Pt[] = [];
  const s = rho > 0 ? segs : 0;
  for (let k = 0; k < n; k++) {
    const a = rot + k * 2 * half;
    const cx = Math.cos(a) * cr;
    const cz = Math.sin(a) * cr;
    for (let i = 0; i <= s; i++) {
      const th = s ? a - half + (i / s) * 2 * half : a;
      out.push([cx + Math.cos(th) * rho, cz + Math.sin(th) * rho]);
    }
  }
  return out;
}

/** Прямоугольник со скруглёнными углами */
export function roundedRect(w: number, d: number, rho: number, segs = 6): Pt[] {
  const out: Pt[] = [];
  const cs: Pt[] = [
    [w / 2 - rho, d / 2 - rho],
    [-w / 2 + rho, d / 2 - rho],
    [-w / 2 + rho, -d / 2 + rho],
    [w / 2 - rho, -d / 2 + rho],
  ];
  cs.forEach(([cx, cz], k) => {
    for (let i = 0; i <= segs; i++) {
      const th = (k + i / segs) * (Math.PI / 2);
      out.push([cx + Math.cos(th) * rho, cz + Math.sin(th) * rho]);
    }
  });
  return out;
}

/** Суперэллипс: p=2 — эллипс, p≈4 — «сквиркл», p<2 — линза с мягкими остриями */
export function superellipse(a: number, b: number, p: number, n = 64): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const c = Math.cos(t);
    const s = Math.sin(t);
    out.push([a * Math.sign(c) * Math.abs(c) ** (2 / p), b * Math.sign(s) * Math.abs(s) ** (2 / p)]);
  }
  return out;
}

export interface Profile {
  shape: Pt[];
  h: number;
  y0?: number;
  levels?: number;
  scale?: (t: number) => number;
  twist?: (t: number) => number;
  smooth?: boolean;
  /** крышка сверху (группа 1) */
  top?: boolean;
  /** крышка снизу (для парящих плит) */
  bottom?: boolean;
  /** сдвиг всех точек наружу, в единицах — для светящихся поясов поверх фасада */
  grow?: number;
  /** сдвиг u, чтобы окна у соседних башен не совпадали */
  u0?: number;
}

export function levelPoints(o: Profile, t: number): Pt[] {
  const s = o.scale ? o.scale(t) : 1;
  const a = o.twist ? o.twist(t) : 0;
  const c = Math.cos(a);
  const sn = Math.sin(a);
  const g = o.grow || 0;
  return o.shape.map(([x, z]) => {
    let px = x * s;
    let pz = z * s;
    if (g) {
      const l = Math.hypot(px, pz) || 1;
      px += (px / l) * g;
      pz += (pz / l) * g;
    }
    return [px * c - pz * sn, px * sn + pz * c] as Pt;
  });
}

const centroid = (p: Pt[]): Pt => {
  let x = 0;
  let z = 0;
  p.forEach((q) => {
    x += q[0];
    z += q[1];
  });
  return [x / p.length, z / p.length];
};

/** Боковая поверхность (группа 0) + крышки (группа 1) */
export function profileGeometry(o: Profile): THREE.BufferGeometry {
  const L = o.levels ?? 1;
  const y0 = o.y0 ?? 0;
  const u0 = o.u0 ?? 0;
  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const rings = Array.from({ length: L + 1 }, (_, i) => levelPoints(o, i / L));
  const N = rings[0].length;
  const cols = o.smooth ? N + 1 : N * 2;

  const outward = (pts: Pt[], j0: number, j1: number, px: number, pz: number): Pt => {
    const dx = pts[j1][0] - pts[j0][0];
    const dz = pts[j1][1] - pts[j0][1];
    let nx = dz;
    let nz = -dx;
    const c = centroid(pts);
    if (nx * (px - c[0]) + nz * (pz - c[1]) < 0) {
      nx = -nx;
      nz = -nz;
    }
    const l = Math.hypot(nx, nz) || 1;
    return [nx / l, nz / l];
  };

  for (let i = 0; i <= L; i++) {
    const pts = rings[i];
    const y = y0 + (i / L) * o.h;
    let acc = u0;
    if (o.smooth) {
      for (let j = 0; j <= N; j++) {
        const p = pts[j % N];
        if (j > 0) {
          const q = pts[j - 1];
          acc += Math.hypot(p[0] - q[0], p[1] - q[1]);
        }
        const [nx, nz] = outward(pts, (j - 1 + N) % N, (j + 1) % N, p[0], p[1]);
        pos.push(p[0], y, p[1]);
        nor.push(nx, 0, nz);
        uv.push(acc / FACADE_U, y / FACADE_V);
      }
    } else {
      for (let j = 0; j < N; j++) {
        const a = pts[j];
        const b = pts[(j + 1) % N];
        const [nx, nz] = outward(pts, j, (j + 1) % N, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
        pos.push(a[0], y, a[1]);
        nor.push(nx, 0, nz);
        uv.push(acc / FACADE_U, y / FACADE_V);
        acc += Math.hypot(b[0] - a[0], b[1] - a[1]);
        pos.push(b[0], y, b[1]);
        nor.push(nx, 0, nz);
        uv.push(acc / FACADE_U, y / FACADE_V);
      }
    }
  }

  // направление обхода выбираем так, чтобы лицевая сторона смотрела наружу
  const P = (k: number) => new THREE.Vector3(pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]);
  const a0 = P(0);
  const b0 = P(1);
  const c0 = P(cols);
  const fn = new THREE.Vector3().subVectors(b0, a0).cross(new THREE.Vector3().subVectors(c0, a0));
  const flip = fn.x * nor[0] + fn.z * nor[2] < 0;
  const quad = (a: number, b: number, c: number, d: number) => {
    if (flip) idx.push(a, c, b, b, c, d);
    else idx.push(a, b, c, b, d, c);
  };
  for (let i = 0; i < L; i++) {
    for (let j = 0; j < N; j++) {
      const a = o.smooth ? i * cols + j : i * cols + j * 2;
      quad(a, a + 1, a + cols, a + cols + 1);
    }
  }
  const sideCount = idx.length;

  const cap = (pts: Pt[], y: number, up: boolean) => {
    const base = pos.length / 3;
    const c = centroid(pts);
    pos.push(c[0], y, c[1]);
    nor.push(0, up ? 1 : -1, 0);
    uv.push(0, 0);
    pts.forEach((p) => {
      pos.push(p[0], y, p[1]);
      nor.push(0, up ? 1 : -1, 0);
      uv.push(0, 0);
    });
    // ориентация многоугольника: знак площади
    let area = 0;
    for (let j = 0; j < pts.length; j++) {
      const p = pts[j];
      const q = pts[(j + 1) % pts.length];
      area += p[0] * q[1] - q[0] * p[1];
    }
    // при взгляде сверху (+y) лицевая сторона — обход по часовой в координатах (x, z)
    const ccw = area > 0;
    for (let j = 0; j < pts.length; j++) {
      const p = base + 1 + j;
      const q = base + 1 + ((j + 1) % pts.length);
      if (ccw === up) idx.push(base, q, p);
      else idx.push(base, p, q);
    }
  };
  if (o.top) cap(rings[L], y0 + o.h, true);
  if (o.bottom) cap(rings[0], y0, false);

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.addGroup(0, sideCount, 0);
  if (idx.length > sideCount) g.addGroup(sideCount, idx.length - sideCount, 1);
  g.computeBoundingSphere();
  return g;
}

/** Трубка вдоль ломаной — светодиодные ленты по рёбрам и кромкам */
export function tube(points: THREE.Vector3[], radius: number, closed = false, radial = 6) {
  const curve = new THREE.CatmullRomCurve3(points, closed, 'centripetal');
  return new THREE.TubeGeometry(curve, Math.max(8, points.length * 3), radius, radial, closed);
}

/** Путь ребра башни: точка k плана на всех уровнях */
export function edgePath(o: Profile, k: number, out = 0.06, steps = 40) {
  const y0 = o.y0 ?? 0;
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const p = levelPoints({ ...o, grow: (o.grow || 0) + out }, t)[k];
    pts.push(new THREE.Vector3(p[0], y0 + t * o.h, p[1]));
  }
  return pts;
}

/** Контур уровня t (для светящейся короны) */
export function ringPath(o: Profile, t: number, out = 0.08, dy = 0) {
  const y = (o.y0 ?? 0) + t * o.h + dy;
  return levelPoints({ ...o, grow: (o.grow || 0) + out }, t).map((p) => new THREE.Vector3(p[0], y, p[1]));
}

/**
 * Материал города не освещается лампами в комнатах башни: точечные источники
 * считаются только для интерьеров, а не для каждого пикселя улиц и небоскрёбов.
 */
export function noPointLights<T extends THREE.Material>(m: T, tag: string): T {
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => {
    prev.call(m, sh, r);
    sh.fragmentShader = sh.fragmentShader.replace('#include <lights_fragment_begin>', THREE.ShaderChunk.lights_fragment_begin.replace(/NUM_POINT_LIGHTS/g, '0'));
  };
  m.customProgramCacheKey = () => `city-${tag}`;
  return m;
}
