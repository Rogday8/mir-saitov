import React, { useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { finePointer, reducedMotion } from '../lib/smooth';

const host = (url: string) => url.replace(/^https?:\/\//, '').replace(/\/$/, '');

// Видео играет только пока его видно (и не играет, если человек попросил «меньше движения»)
function useAutoplay(ref: React.RefObject<HTMLVideoElement | null>, enabled = true) {
  useEffect(() => {
    const v = ref.current;
    if (!v || !enabled) return;
    // заранее (за ~экран до появления) начинаем подгружать — старт видео не дёргает прокрутку
    const near = new IntersectionObserver(
      (e) => {
        if (e[0].isIntersecting && v.preload !== 'auto') {
          v.preload = 'auto';
          v.load();
        }
      },
      { rootMargin: '100% 0px' },
    );
    const io = new IntersectionObserver(
      (e) => {
        if (e[0].isIntersecting && !reducedMotion()) v.play().catch(() => {});
        else v.pause();
      },
      { threshold: 0.2 },
    );
    near.observe(v);
    io.observe(v);
    return () => {
      near.disconnect();
      io.disconnect();
    };
  }, [ref, enabled]);
}

// Окно браузера: видео прокрутки сайта, играет только когда видно. Наклоняется за курсором.
export const BrowserFrame: React.FC<{ url: string; video: string; poster: string; accent: string; onOpen?: () => void; label: string; play?: boolean }> = ({
  url,
  video,
  poster,
  accent,
  onOpen,
  label,
  play = true,
}) => {
  const box = useRef<HTMLDivElement>(null);
  const vid = useRef<HTMLVideoElement>(null);
  const rx = useSpring(useMotionValue(0), { stiffness: 150, damping: 18 });
  const ry = useSpring(useMotionValue(0), { stiffness: 150, damping: 18 });
  const glareX = useTransform(ry, [-10, 10], ['0%', '100%']);
  const glare = useTransform(glareX, (x) => `radial-gradient(60% 80% at ${x} 0%, rgba(255,255,255,.16), transparent 60%)`);

  useAutoplay(vid, play);

  const move = (e: React.PointerEvent) => {
    if (!finePointer() || !box.current) return;
    const r = box.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    ry.set(px * 12);
    rx.set(-py * 9);
  };
  const leave = () => {
    rx.set(0);
    ry.set(0);
  };

  return (
    <div style={{ perspective: 1400 }}>
      <motion.div
        ref={box}
        onPointerMove={move}
        onPointerLeave={leave}
        onClick={onOpen}
        data-cursor={onOpen ? 'Вживую' : 'Сайт'}
        style={{ rotateX: rx, rotateY: ry, transformStyle: 'preserve-3d' }}
        className="group relative overflow-hidden rounded-[18px] border border-white/15 bg-[#111018] shadow-[0_40px_120px_-30px_rgba(0,0,0,.75)] sm:rounded-[22px]"
      >
        <div className="flex items-center gap-2 border-b border-white/10 bg-[#16151f] px-3 py-2.5 sm:px-4">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          <div className="mx-auto flex max-w-[60%] items-center gap-1.5 truncate rounded-full bg-white/[0.06] px-3 py-1 font-mono text-[10px] text-white/60 sm:text-[11px]">
            <svg viewBox="0 0 24 24" className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <rect x="5" y="11" width="14" height="9" rx="2" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" />
            </svg>
            <span className="truncate">{host(url)}</span>
          </div>
          <span className="w-10" />
        </div>
        <div className="relative aspect-[16/10] overflow-hidden bg-black">
          <video
            ref={vid}
            className="h-full w-full object-cover"
            src={play ? video : undefined}
            poster={poster}
            muted
            loop
            playsInline
            preload="none"
            aria-label={`Видео: ${label}`}
          />
          {/* блик за курсором */}
          <motion.div
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            style={{ background: glare }}
          />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 opacity-60"
            style={{ background: `linear-gradient(to top, ${accent}33, transparent)` }}
          />
        </div>
      </motion.div>
    </div>
  );
};

// Телефон: видео прокрутки (если есть) или скриншот
export const PhoneFrame: React.FC<{ src: string; video?: string; alt: string; className?: string; label?: string }> = ({ src, video, alt, className = '', label }) => {
  const vid = useRef<HTMLVideoElement>(null);
  useAutoplay(vid, !!video);
  return (
    <div className={`relative ${className}`}>
      <div className="relative overflow-hidden rounded-[30px] border-[5px] border-[#1d1c26] bg-black shadow-[0_30px_80px_-20px_rgba(0,0,0,.8)] ring-1 ring-white/15 sm:rounded-[36px] sm:border-[6px]">
        <div className="absolute left-1/2 top-2 z-10 h-[14px] w-[34%] -translate-x-1/2 rounded-full bg-black" />
        {video ? (
          <video ref={vid} src={video} poster={src} muted loop playsInline preload="none" aria-label={alt} className="block aspect-[390/844] w-full object-cover object-top" />
        ) : (
          <img src={src} alt={alt} loading="lazy" className="block aspect-[390/844] w-full object-cover object-top" draggable={false} />
        )}
      </div>
      {label && (
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-void/85 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-mist">
          {label}
        </div>
      )}
    </div>
  );
};
