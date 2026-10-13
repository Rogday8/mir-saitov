import React from 'react';
import type { Member } from '../data';

// Человечек-«чиби»: большая голова (вырезанное фото) на маленьком нарисованном теле.
// mode: idle — покачивается, run — бежит, cheer — прыгает с поднятыми руками.
export type ChibiMode = 'idle' | 'run' | 'cheer';

const base = import.meta.env.BASE_URL;

const Chibi: React.FC<{ m: Member; size?: number; mode?: ChibiMode; className?: string; flip?: boolean }> = ({ m, size = 120, mode = 'idle', className = '', flip }) => {
  const bodyW = size * 0.58;
  return (
    <div
      className={`chibi chibi-${mode} relative select-none ${className}`}
      style={{ width: size, height: size * 1.42, transform: flip ? 'scaleX(-1)' : undefined }}
      aria-label={m.name}
    >
      {/* тень */}
      <div className="chibi-shadow absolute bottom-0 left-1/2 h-[6%] w-[52%] -translate-x-1/2 rounded-[50%] bg-black/35 blur-[2px]" />
      <div className="chibi-bob absolute inset-0">
        {/* тело */}
        <svg viewBox="0 0 60 64" className="absolute left-1/2 -translate-x-1/2" style={{ width: bodyW, top: size * 0.74 }} aria-hidden>
          <g className="chibi-leg-l" style={{ transformOrigin: '24px 40px' }}>
            <rect x="20" y="38" width="9" height="20" rx="4.5" fill="#1d1c26" />
            <rect x="17" y="54" width="13" height="7" rx="3.5" fill="#f3f1ff" />
          </g>
          <g className="chibi-leg-r" style={{ transformOrigin: '36px 40px' }}>
            <rect x="31" y="38" width="9" height="20" rx="4.5" fill="#1d1c26" />
            <rect x="30" y="54" width="13" height="7" rx="3.5" fill="#f3f1ff" />
          </g>
          <g className="chibi-arm-l" style={{ transformOrigin: '14px 10px' }}>
            <rect x="6" y="8" width="9" height="24" rx="4.5" fill={m.shirt} />
            <circle cx="10.5" cy="31" r="4.5" fill="#f1c7a8" />
          </g>
          <g className="chibi-arm-r" style={{ transformOrigin: '46px 10px' }}>
            <rect x="45" y="8" width="9" height="24" rx="4.5" fill={m.shirt} />
            <circle cx="49.5" cy="31" r="4.5" fill="#f1c7a8" />
          </g>
          <rect x="12" y="4" width="36" height="38" rx="12" fill={m.shirt} />
          {/* значок команды на груди */}
          <circle cx="30" cy="22" r="6.5" fill={m.color} />
          <circle cx="30" cy="22" r="2.6" fill={m.shirt} />
        </svg>
        {/* голова */}
        <img
          src={`${base}${m.head}`}
          alt=""
          draggable={false}
          className="chibi-head absolute left-1/2 top-0 -translate-x-1/2 drop-shadow-[0_6px_12px_rgba(0,0,0,.35)]"
          style={{ width: size * 0.92 }}
        />
      </div>
    </div>
  );
};

export default Chibi;
