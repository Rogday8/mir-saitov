import React, { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'motion/react';
import { finePointer } from '../lib/smooth';

// Свой курсор: точка + кольцо. Над ссылками кольцо растёт, над элементами с data-cursor="текст" — показывает подпись.
const Cursor: React.FC = () => {
  const [on, setOn] = useState(false);
  const [label, setLabel] = useState('');
  const [hover, setHover] = useState(false);
  const [down, setDown] = useState(false);
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const rx = useSpring(x, { stiffness: 380, damping: 32, mass: 0.6 });
  const ry = useSpring(y, { stiffness: 380, damping: 32, mass: 0.6 });

  useEffect(() => {
    if (!finePointer()) return;
    setOn(true);
    document.documentElement.classList.add('has-cursor');
    const move = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
      const t = e.target as HTMLElement | null;
      const withLabel = t?.closest<HTMLElement>('[data-cursor]');
      setLabel(withLabel?.dataset.cursor || '');
      setHover(!!t?.closest('a,button,[role=button],input,label,[data-hover]'));
    };
    const d = () => setDown(true);
    const u = () => setDown(false);
    const leave = () => {
      x.set(-100);
      y.set(-100);
    };
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerdown', d);
    window.addEventListener('pointerup', u);
    document.addEventListener('pointerleave', leave);
    return () => {
      document.documentElement.classList.remove('has-cursor');
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerdown', d);
      window.removeEventListener('pointerup', u);
      document.removeEventListener('pointerleave', leave);
    };
  }, [x, y]);

  if (!on) return null;
  const size = label ? 96 : hover ? 56 : 34;
  return (
    <div className="pointer-events-none fixed inset-0 z-[100]" aria-hidden>
      <motion.div className="absolute left-0 top-0 h-1.5 w-1.5 rounded-full bg-white mix-blend-difference" style={{ x, y, translateX: '-50%', translateY: '-50%' }} />
      <motion.div
        className={`absolute left-0 top-0 grid place-items-center rounded-full border ${label ? 'border-transparent bg-lime text-void' : 'border-white/60 mix-blend-difference'}`}
        style={{ x: rx, y: ry, translateX: '-50%', translateY: '-50%' }}
        animate={{ width: size, height: size, scale: down ? 0.85 : 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      >
        {label && <span className="font-mono text-[10px] font-medium uppercase tracking-[0.18em]">{label}</span>}
      </motion.div>
    </div>
  );
};

export default Cursor;
