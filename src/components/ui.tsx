import React, { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'motion/react';
import { finePointer, reducedMotion } from '../lib/smooth';

// Кнопка/ссылка, которая «притягивается» к курсору
export const Magnetic: React.FC<{ children: React.ReactNode; strength?: number; className?: string }> = ({ children, strength = 0.35, className = '' }) => {
  const ref = useRef<HTMLDivElement>(null);
  const x = useSpring(useMotionValue(0), { stiffness: 220, damping: 16, mass: 0.4 });
  const y = useSpring(useMotionValue(0), { stiffness: 220, damping: 16, mass: 0.4 });
  const onMove = (e: React.PointerEvent) => {
    if (!finePointer() || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * strength);
    y.set((e.clientY - (r.top + r.height / 2)) * strength);
  };
  const reset = () => {
    x.set(0);
    y.set(0);
  };
  return (
    <motion.div ref={ref} onPointerMove={onMove} onPointerLeave={reset} style={{ x, y }} className={`inline-block ${className}`}>
      {children}
    </motion.div>
  );
};

// Градиент «аврора» по буквам: у каждой буквы — свой кусок общего градиента.
// background-clip: text не работает на родителе, если буквы внутри анимируются по отдельности.
export const auroraLetter = (i: number, n: number): React.CSSProperties => ({
  backgroundImage: 'linear-gradient(100deg, #8b6cff, #3ee6ff 45%, #c8ff4d 85%)',
  backgroundSize: `${Math.max(1, n) * 100}% 100%`,
  backgroundPosition: `${n > 1 ? (i / (n - 1)) * 100 : 0}% 0`,
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
});

// Заголовок, который собирается по буквам снизу вверх
export const SplitReveal: React.FC<{ text: string; className?: string; delay?: number; stagger?: number; once?: boolean; aurora?: boolean }> = ({
  text,
  className = '',
  delay = 0,
  stagger = 0.035,
  once = true,
  aurora = false,
}) => {
  const words = text.split(' ');
  const total = text.replace(/ /g, '').length;
  let i = 0;
  return (
    <motion.span className={`inline ${className}`} initial="hide" whileInView="show" viewport={{ once, margin: '-10% 0px' }} aria-label={text}>
      {words.map((w, wi) => (
        <span key={wi} className="inline-block whitespace-nowrap" aria-hidden>
          {[...w].map((ch) => {
            const d = delay + i++ * stagger;
            return (
              <span key={i} className="inline-block overflow-hidden align-bottom pb-[0.08em] -mb-[0.08em]">
                <motion.span
                  className="inline-block will-change-transform"
                  style={aurora ? auroraLetter(i - 1, total) : undefined}
                  variants={{ hide: { y: '110%', rotate: 8 }, show: { y: '0%', rotate: 0, transition: { duration: 0.9, delay: d, ease: [0.16, 1, 0.3, 1] } } }}
                >
                  {ch}
                </motion.span>
              </span>
            );
          })}
          {wi < words.length - 1 && <span className="inline-block">&nbsp;</span>}
        </span>
      ))}
    </motion.span>
  );
};

// Текст «перебирает» символы при наведении — как терминал
const GLYPHS = 'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЭЮЯ0123456789#%&*+=<>/';
export const Scramble: React.FC<{ text: string; className?: string; trigger?: 'hover' | 'view' }> = ({ text, className = '', trigger = 'hover' }) => {
  const [out, setOut] = useState(text);
  const raf = useRef(0);
  const ref = useRef<HTMLSpanElement>(null);
  const run = () => {
    if (reducedMotion()) return;
    cancelAnimationFrame(raf.current);
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 650);
      const done = Math.floor(p * text.length);
      setOut(
        [...text]
          .map((c, k) => (k < done || c === ' ' ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0]))
          .join(''),
      );
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  };
  useEffect(() => {
    if (trigger !== 'view' || !ref.current) return;
    const io = new IntersectionObserver((e) => e[0].isIntersecting && (run(), io.disconnect()), { threshold: 0.6 });
    io.observe(ref.current);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger, text]);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  return (
    <span ref={ref} className={className} onPointerEnter={trigger === 'hover' ? run : undefined} aria-label={text}>
      <span aria-hidden>{out}</span>
    </span>
  );
};

// Появление блока при прокрутке
export const Reveal: React.FC<{ children: React.ReactNode; delay?: number; y?: number; className?: string }> = ({ children, delay = 0, y = 40, className = '' }) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, y }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-8% 0px' }}
    transition={{ duration: 1, delay, ease: [0.16, 1, 0.3, 1] }}
  >
    {children}
  </motion.div>
);

// Подпись раздела: номер + название моноширинным
export const Eyebrow: React.FC<{ n: string; children: React.ReactNode; className?: string }> = ({ n, children, className = '' }) => (
  <div className={`flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.28em] text-haze ${className}`}>
    <span className="text-lime">{n}</span>
    <span className="h-px w-10 bg-white/20" />
    <span>{children}</span>
  </div>
);

// Стрелка ↗
export const Arrow: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox="0 0 24 24" className={`w-[1em] h-[1em] ${className}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M7 17 17 7M8 7h9v9" />
  </svg>
);
