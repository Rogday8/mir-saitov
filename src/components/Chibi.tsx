import React, { useId } from 'react';
import type { Member } from '../data';

// Человечек: голова (вырезанное фото) на нарисованной фигуре в худи.
// mode: idle — покачивается, run — идёт/бежит, cheer — подпрыгивает с поднятыми руками.
export type ChibiMode = 'idle' | 'run' | 'cheer';

const base = import.meta.env.BASE_URL;
const SKIN = '#e8bd9d';

// осветлить/затемнить цвет #rrggbb
const shade = (hex: string, k: number) => {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k))));
  return `rgb(${ch(n >> 16)}, ${ch((n >> 8) & 255)}, ${ch(n & 255)})`;
};

const Chibi: React.FC<{ m: Member; size?: number; mode?: ChibiMode; className?: string; flip?: boolean }> = ({ m, size = 120, mode = 'idle', className = '', flip }) => {
  const id = useId().replace(/:/g, '');
  const bodyW = size * 0.74;
  const light = shade(m.shirt, 0.18);
  const dark = shade(m.shirt, -0.32);
  return (
    <div className={`chibi chibi-${mode} relative select-none ${className}`} style={{ width: size, height: size * 1.6, transform: flip ? 'scaleX(-1)' : undefined }} aria-label={m.name}>
      <div className="chibi-shadow absolute bottom-0 left-1/2 h-[5%] w-[46%] -translate-x-1/2 rounded-[50%] bg-black/40 blur-[3px]" />
      <div className="chibi-bob absolute inset-0">
        <svg viewBox="0 0 80 90" className="absolute left-1/2 -translate-x-1/2 overflow-visible" style={{ width: bodyW, top: size * 0.78 }} aria-hidden>
          <defs>
            <linearGradient id={`hood-${id}`} x1="0" y1="0" x2="0.35" y2="1">
              <stop offset="0" stopColor={light} />
              <stop offset="1" stopColor={dark} />
            </linearGradient>
            <linearGradient id={`pants-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#2a2a3a" />
              <stop offset="1" stopColor="#17161f" />
            </linearGradient>
          </defs>

          {/* ноги */}
          <g className="chibi-leg-l" style={{ transformOrigin: '33px 52px' }}>
            <path d="M28 50h10v26a5 5 0 0 1-10 0z" fill={`url(#pants-${id})`} />
            <path d="M23.5 78.5c0-2.5 2-4 4.5-4h7.5c2.2 0 3.5 1.6 3.5 3.6V82a2 2 0 0 1-2 2H25.5a2 2 0 0 1-2-2z" fill="#f4f2fb" />
            <path d="M23.5 81.5h15.5V82a2 2 0 0 1-2 2H25.5a2 2 0 0 1-2-2z" fill="#b9b6c8" />
          </g>
          <g className="chibi-leg-r" style={{ transformOrigin: '47px 52px' }}>
            <path d="M42 50h10v26a5 5 0 0 1-10 0z" fill={`url(#pants-${id})`} />
            <path d="M41 78.1c0-2 1.3-3.6 3.5-3.6H52c2.5 0 4.5 1.5 4.5 4V82a2 2 0 0 1-2 2H43a2 2 0 0 1-2-2z" fill="#f4f2fb" />
            <path d="M41 81.5h15.5V82a2 2 0 0 1-2 2H43a2 2 0 0 1-2-2z" fill="#b9b6c8" />
          </g>

          {/* руки-рукава */}
          <g className="chibi-arm-l" style={{ transformOrigin: '20px 17px' }}>
            <path d="M15.5 17.5c1.2-3 7.3-3.2 8.8.4l-1.3 26.3a4 4 0 0 1-4 3.8h-.6a4 4 0 0 1-4-4.2z" fill={dark} />
            <rect x="13.6" y="42.5" width="9.8" height="4.6" rx="2.3" fill={shade(m.shirt, -0.45)} />
            <circle cx="18.4" cy="50.6" r="4.1" fill={SKIN} />
          </g>
          <g className="chibi-arm-r" style={{ transformOrigin: '60px 17px' }}>
            <path d="M64.5 17.5c-1.2-3-7.3-3.2-8.8.4l1.3 26.3a4 4 0 0 0 4 3.8h.6a4 4 0 0 0 4-4.2z" fill={dark} />
            <rect x="56.6" y="42.5" width="9.8" height="4.6" rx="2.3" fill={shade(m.shirt, -0.45)} />
            <circle cx="61.6" cy="50.6" r="4.1" fill={SKIN} />
          </g>

          {/* шея */}
          <rect x="35" y="2" width="10" height="12" rx="4" fill={shade(SKIN, -0.12)} />

          {/* худи */}
          <path d="M22 15.5C28 11 33 10.5 40 10.5S52 11 58 15.5l3.4 9.5c.9 9.6.3 19.4-1.2 28.4-6.6 2.4-13.4 3.2-20.2 3.2s-13.6-.8-20.2-3.2C18.3 44.4 17.7 34.6 18.6 25z" fill={`url(#hood-${id})`} />
          {/* капюшон за шеей */}
          <path d="M29 13.2c3-3 6.6-4.2 11-4.2s8 1.2 11 4.2c-2.6 3.7-6.5 5.6-11 5.6s-8.4-1.9-11-5.6z" fill={dark} />
          <path d="M32 13.4c2.3-1.9 5-2.8 8-2.8s5.7.9 8 2.8c-2.1 2.2-4.9 3.4-8 3.4s-5.9-1.2-8-3.4z" fill={shade(m.shirt, -0.5)} />
          {/* шнурки */}
          <path d="M37 18.5l-1 11M43 18.5l1 11" stroke="#f1eff8" strokeWidth="1.3" strokeLinecap="round" />
          <rect x="34.9" y="29.2" width="2.2" height="3.4" rx="1" fill="#f1eff8" />
          <rect x="43" y="29.2" width="2.2" height="3.4" rx="1" fill="#f1eff8" />
          {/* карман и низ */}
          <path d="M27.5 40.5h25l1.8 9.5c-4.7 1-9.4 1.4-14.3 1.4s-9.6-.4-14.3-1.4z" fill={shade(m.shirt, -0.22)} />
          <path d="M20.1 50.4c6.5 2.2 13.2 3 19.9 3s13.4-.8 19.9-3l.3 3c-6.6 2.4-13.4 3.2-20.2 3.2s-13.6-.8-20.2-3.2z" fill={shade(m.shirt, -0.4)} />
          {/* знак студии на груди */}
          <g transform="translate(51.5 24)">
            <circle r="2.4" fill={m.color} />
            <ellipse rx="4.6" ry="1.5" fill="none" stroke={m.color} strokeWidth="0.9" transform="rotate(-24)" />
          </g>
        </svg>
        <img
          src={`${base}${m.head}`}
          alt=""
          draggable={false}
          className="chibi-head absolute left-1/2 top-0 -translate-x-1/2 drop-shadow-[0_6px_10px_rgba(0,0,0,.4)]"
          style={{ height: size * 0.86, width: 'auto', maxWidth: size * 0.9 }}
        />
      </div>
    </div>
  );
};

export default Chibi;
