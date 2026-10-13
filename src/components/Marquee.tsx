import React, { useRef } from 'react';
import { motion, useAnimationFrame, useInView, useMotionValue, useScroll, useSpring, useTransform, useVelocity, wrap } from 'motion/react';
import { SERVICES } from '../data';

// Лента, которая едет сама и ускоряется (и разворачивается) от скорости прокрутки
const Row: React.FC<{ items: string[]; base: number; className?: string }> = ({ items, base, className = '' }) => {
  const x = useMotionValue(0);
  const { scrollY } = useScroll();
  const vel = useSpring(useVelocity(scrollY), { damping: 50, stiffness: 400 });
  const factor = useTransform(vel, [-2000, 0, 2000], [-1.6, 0, 1.6], { clamp: true });
  const dir = useRef(1);
  const box = useRef<HTMLDivElement>(null);
  const inView = useInView(box); // за экраном лента не крутится
  const tx = useTransform(x, (v) => `${wrap(-50, 0, v)}%`);
  useAnimationFrame((_, delta) => {
    if (!inView) return;
    let move = dir.current * base * (delta / 1000);
    const f = factor.get();
    if (f < 0) dir.current = -1;
    else if (f > 0) dir.current = 1;
    move += dir.current * move * Math.abs(f);
    x.set(x.get() + move);
  });
  const list = [...items, ...items];
  return (
    <div ref={box} className={`flex overflow-hidden whitespace-nowrap ${className}`}>
      <motion.div className="flex shrink-0 items-center" style={{ x: tx }}>
        {[...list, ...list].map((s, i) => (
          <span key={i} className="flex items-center">
            <span className="px-6 sm:px-10">{s}</span>
            <svg viewBox="0 0 24 24" className="h-[0.55em] w-[0.55em] shrink-0" aria-hidden>
              <path d="M12 0 14.5 9.5 24 12 14.5 14.5 12 24 9.5 14.5 0 12 9.5 9.5Z" fill="currentColor" />
            </svg>
          </span>
        ))}
      </motion.div>
    </div>
  );
};

const Marquee: React.FC = () => (
  <section className="relative z-10 -my-6 overflow-hidden py-16" aria-label="Что делаем">
    <div className="-rotate-[3deg] scale-105 bg-lime py-4 font-display text-[7vw] font-semibold uppercase leading-none tracking-tight text-void sm:text-[4.2vw]">
      <Row items={SERVICES} base={-1.1} />
    </div>
    <div className="mt-[-1.2vw] rotate-[2deg] scale-105 border-y border-white/10 bg-night py-3 font-display text-[5vw] font-light uppercase leading-none tracking-tight text-mist sm:text-[2.6vw]">
      <Row items={[...SERVICES].reverse()} base={0.8} className="text-outline" />
    </div>
  </section>
);

export default Marquee;
