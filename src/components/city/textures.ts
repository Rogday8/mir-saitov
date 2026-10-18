import * as THREE from 'three';

// Текстуры, нарисованные кодом на <canvas>: окна небоскрёбов, экраны, доска с планом, вывески.

const cache = new Map<string, THREE.CanvasTexture>();

function make(key: string, w: number, h: number, draw: (c: CanvasRenderingContext2D, w: number, h: number) => void) {
  const hit = cache.get(key);
  if (hit) return hit;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  draw(cv.getContext('2d')!, w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  cache.set(key, t);
  return t;
}

// детерминированный «случай»: одинаковая картинка при каждой загрузке
export function rand(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Фасад: сетка окон, часть горит тёплым, часть холодным светом. Повторяется по вертикали и горизонтали. */
export function windows(seed: number, cols = 8, rows = 24, lit = 0.4) {
  return make(`win-${seed}-${cols}-${rows}-${lit}`, cols * 16, rows * 16, (c, w, h) => {
    const r = rand(seed);
    c.fillStyle = '#000';
    c.fillRect(0, 0, w, h);
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) {
        const v = r();
        if (v < lit) {
          const warm = r() < 0.7;
          c.fillStyle = warm ? `rgba(255, ${200 + ((r() * 30) | 0)}, ${140 + ((r() * 50) | 0)}, ${0.55 + r() * 0.45})` : `rgba(150, 205, 255, ${0.45 + r() * 0.4})`;
        } else c.fillStyle = `rgba(40, 60, 90, ${0.12 + r() * 0.12})`;
        c.fillRect(x * 16 + 3, y * 16 + 4, 10, 9);
      }
  });
}

/** Экран с кодом (подсветка синтаксиса) */
export function codeScreen(seed: number, accent = '#c8ff4d') {
  return make(`code-${seed}-${accent}`, 512, 320, (c, w, h) => {
    const r = rand(seed);
    c.fillStyle = '#0c0b14';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#16141f';
    c.fillRect(0, 0, w, 26);
    ['#ff5f57', '#febc2e', '#28c840'].forEach((col, i) => {
      c.fillStyle = col;
      c.beginPath();
      c.arc(16 + i * 16, 13, 5, 0, Math.PI * 2);
      c.fill();
    });
    const palette = [accent, '#8b6cff', '#3ee6ff', '#ece9ff', '#ff9ccf'];
    for (let y = 44; y < h - 10; y += 18) {
      let x = 18 + ((r() * 4) | 0) * 22;
      const n = 2 + ((r() * 4) | 0);
      for (let k = 0; k < n && x < w - 30; k++) {
        const len = 30 + r() * 110;
        c.fillStyle = palette[(r() * palette.length) | 0];
        c.globalAlpha = 0.85;
        c.fillRect(x, y, len, 7);
        x += len + 12;
      }
    }
    c.globalAlpha = 1;
  });
}

/** Экран с каркасной 3D-моделью (для мастерской) */
export function renderScreen() {
  return make('render', 512, 320, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#11202a');
    g.addColorStop(1, '#0a1016');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(62,230,255,.25)';
    for (let x = 0; x < w; x += 32) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, h);
      c.stroke();
    }
    for (let y = 0; y < h; y += 32) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(w, y);
      c.stroke();
    }
    // каркасная сфера
    c.strokeStyle = '#3ee6ff';
    c.lineWidth = 1.6;
    const cx = w / 2;
    const cy = h / 2;
    const R = 110;
    for (let i = 0; i < 8; i++) {
      c.beginPath();
      c.ellipse(cx, cy, Math.abs(R * Math.cos((i * Math.PI) / 8)), R, 0, 0, Math.PI * 2);
      c.stroke();
    }
    for (let i = -3; i <= 3; i++) {
      const y = (i / 4) * R;
      c.beginPath();
      c.ellipse(cx, cy + y, Math.sqrt(R * R - y * y), 12 * Math.sqrt(1 - (y / R) ** 2), 0, 0, Math.PI * 2);
      c.stroke();
    }
  });
}

/** Доска продюсера: этапы проекта с карточками */
export function planBoard() {
  return make('plan', 640, 400, (c, w, h) => {
    c.fillStyle = '#f4f2ec';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#1b1a17';
    c.font = '600 26px Manrope, sans-serif';
    c.fillText('План запуска', 28, 46);
    const cols = ['Идея', 'Дизайн', 'Разработка', 'Запуск'];
    const colors = ['#c8ff4d', '#8b6cff', '#3ee6ff', '#ff9ccf'];
    cols.forEach((t, i) => {
      const x = 28 + i * 152;
      c.fillStyle = '#6b6860';
      c.font = '500 17px Manrope, sans-serif';
      c.fillText(t, x, 92);
      const n = 3 - (i === 3 ? 1 : 0);
      for (let k = 0; k < n; k++) {
        c.fillStyle = colors[i];
        c.fillRect(x, 110 + k * 78, 132, 62);
        c.fillStyle = 'rgba(0,0,0,.35)';
        c.fillRect(x + 12, 128 + k * 78, 90, 6);
        c.fillRect(x + 12, 142 + k * 78, 60, 6);
      }
    });
  });
}

/** Вывеска: текст на прозрачном фоне */
export function sign(text: string, color = '#c8ff4d', font = '700 120px Unbounded, sans-serif', w = 1400, h = 220) {
  return make(`sign-${text}-${color}-${font}-${w}`, w, h, (c) => {
    c.clearRect(0, 0, w, h);
    c.font = font;
    c.fillStyle = color;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.shadowColor = color;
    c.shadowBlur = 24;
    c.fillText(text, w / 2, h / 2 + 6);
  });
}

/** Картина в мастерской: мягкий градиент с формами */
export function artwork() {
  return make('art', 400, 500, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#3ee6ff');
    g.addColorStop(0.55, '#8b6cff');
    g.addColorStop(1, '#ff9ccf');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(255,255,255,.85)';
    c.beginPath();
    c.arc(w * 0.62, h * 0.38, 90, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = 'rgba(12,10,20,.85)';
    c.fillRect(w * 0.18, h * 0.6, w * 0.5, 26);
    c.fillRect(w * 0.18, h * 0.68, w * 0.32, 26);
  });
}

/** Доски паркета */
export function parquet() {
  const t = make('parquet', 512, 512, (c, w, h) => {
    const r = rand(7);
    for (let y = 0; y < h; y += 32)
      for (let x = -((y / 32) % 2) * 64; x < w; x += 128) {
        const l = 92 + r() * 22;
        c.fillStyle = `rgb(${l + 30}, ${l - 4}, ${l - 40})`;
        c.fillRect(x, y, 126, 30);
      }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 2);
  return t;
}

// ——— фасады небоскрёбов ———
// Текстура покрывает FACADE_U × FACADE_V единиц сцены: 16 пролётов по 0.9 и 32 этажа по 0.62.
// UV в геометрии башен считаются в единицах сцены / эти размеры — поэтому этажи у всех башен одной высоты.
export const FACADE_U = 14.4;
export const FACADE_V = 19.84;
export type FacadeStyle = 'office' | 'ribbon' | 'diagrid' | 'fins' | 'lobby';

const BAYS = 16;
const FLOORS_N = 32;
const CW = 32; // пикселей на пролёт
const CH = 32; // пикселей на этаж

function wrapTex(t: THREE.CanvasTexture, color = true) {
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (!color) t.colorSpace = THREE.NoColorSpace;
  return t;
}

/** Фасад: map — структура (стекло, импосты, перекрытия), emissive — горящие офисы. */
export function facade(seed: number, style: FacadeStyle, lit = 0.28) {
  const W = BAYS * CW;
  const Hh = FLOORS_N * CH;
  const map = make(`fm-${seed}-${style}`, W, Hh, (c) => {
    const ribbon = style === 'ribbon';
    for (let f = 0; f < FLOORS_N; f++) {
      const y = f * CH;
      // стекло
      c.fillStyle = '#7d8494';
      c.fillRect(0, y, W, CH);
      // перекрытие / ленточная панель
      c.fillStyle = ribbon ? '#d9dbe2' : '#555a66';
      c.fillRect(0, y + CH - (ribbon ? 11 : 4), W, ribbon ? 11 : 4);
    }
    // импосты
    c.fillStyle = style === 'fins' ? '#e8eaf0' : '#a3a9b6';
    const mw = style === 'fins' ? 5 : 2;
    for (let b = 0; b < BAYS; b++) c.fillRect(b * CW, 0, mw, Hh);
    if (style === 'diagrid') diagridLines(c, W, Hh, '#e3e6ee', 4);
  });
  const emissive = make(`fe-${seed}-${style}-${lit}`, W, Hh, (c) => {
    const r = rand(seed * 977 + 13);
    c.fillStyle = '#000';
    c.fillRect(0, 0, W, Hh);
    const ribbon = style === 'ribbon';
    for (let f = 0; f < FLOORS_N; f++) {
      const y = f * CH;
      const gTop = y + 3;
      const gH = CH - (ribbon ? 15 : 8);
      // общий слабый свет этажа — стекло ночью чуть светится изнутри
      c.fillStyle = `rgba(70, 90, 150, ${0.07 + r() * 0.06})`;
      c.fillRect(0, gTop, W, gH);
      if (style === 'lobby') {
        const g = c.createLinearGradient(0, gTop, 0, gTop + gH);
        g.addColorStop(0, 'rgba(255, 228, 182, 0.95)');
        g.addColorStop(1, 'rgba(255, 196, 130, 0.55)');
        c.fillStyle = g;
        c.fillRect(0, gTop, W, gH);
        continue;
      }
      // офисы горят «кусками» по несколько пролётов подряд
      const floorLit = lit * (0.4 + r() * 1.2);
      let b = 0;
      while (b < BAYS) {
        if (r() < floorLit) {
          const run = 1 + ((r() * (ribbon ? 8 : 5)) | 0);
          const warm = r() < 0.72;
          const k = 0.55 + r() * 0.45;
          const g = c.createLinearGradient(0, gTop, 0, gTop + gH);
          g.addColorStop(0, warm ? `rgba(255, 236, 205, ${k})` : `rgba(222, 236, 255, ${k})`);
          g.addColorStop(1, warm ? `rgba(255, 200, 150, ${k * 0.5})` : `rgba(160, 196, 255, ${k * 0.45})`);
          c.fillStyle = g;
          for (let q = 0; q < run && b + q < BAYS; q++) c.fillRect((b + q) * CW + 3, gTop, CW - 4, gH);
          b += run;
        } else b += 1 + ((r() * 3) | 0);
      }
    }
    if (style === 'diagrid') diagridLines(c, W, Hh, 'rgba(170, 205, 255, 0.35)', 3);
  });
  return { map: wrapTex(map), emissive: wrapTex(emissive) };
}

// диагональная сетка, бесшовная по обеим осям
function diagridLines(c: CanvasRenderingContext2D, w: number, h: number, color: string, lw: number) {
  c.strokeStyle = color;
  c.lineWidth = lw;
  const step = w / 4; // 4 ромба по ширине
  const rise = h / 8; // 8 ромбов по высоте — тогда линии сходятся на краях
  for (let k = -12; k <= 12; k++) {
    c.beginPath();
    c.moveTo(k * step, 0);
    c.lineTo(k * step + (h / rise) * step, h);
    c.stroke();
    c.beginPath();
    c.moveTo(k * step, 0);
    c.lineTo(k * step - (h / rise) * step, h);
    c.stroke();
  }
}

/** Площадь у башни: полированный камень, концентрические швы и лучи */
export function plaza() {
  return make('plaza', 2048, 2048, (c, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    const g = c.createRadialGradient(cx, cy, 0, cx, cy, w / 2);
    g.addColorStop(0, '#2a2836');
    g.addColorStop(0.75, '#1c1b26');
    g.addColorStop(1, '#15141d');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    const R = w / 2;
    // кольца плитки
    for (let i = 1; i < 22; i++) {
      c.strokeStyle = i % 4 === 0 ? 'rgba(255,255,255,.16)' : 'rgba(255,255,255,.06)';
      c.lineWidth = i % 4 === 0 ? 3 : 1.5;
      c.beginPath();
      c.arc(cx, cy, (i / 22) * R, 0, Math.PI * 2);
      c.stroke();
    }
    // лучи
    for (let i = 0; i < 72; i++) {
      const a = (i / 72) * Math.PI * 2;
      c.strokeStyle = i % 6 === 0 ? 'rgba(255,255,255,.12)' : 'rgba(255,255,255,.045)';
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(cx + Math.cos(a) * R * 0.18, cy + Math.sin(a) * R * 0.18);
      c.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
      c.stroke();
    }
  });
}

/** Мягкая круглая точка — для фонарей и огней */
export function dot() {
  return make('dot', 64, 64, (c, w) => {
    const g = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(255,255,255,.85)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, w, w);
  });
}

/** Разметка дороги: тёмный асфальт и пунктир по центру (вдоль u) */
export function road() {
  const t = make('road', 256, 64, (c, w, h) => {
    c.fillStyle = '#17161f';
    c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(255,255,255,.08)';
    c.fillRect(0, 3, w, 2);
    c.fillRect(0, h - 5, w, 2);
    c.fillStyle = 'rgba(255,236,190,.5)';
    for (let x = 0; x < w; x += 64) c.fillRect(x, h / 2 - 1.5, 34, 3);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
