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
