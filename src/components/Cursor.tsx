import React, { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'motion/react';
import { finePointer } from '../lib/smooth';

// Свой курсор: точка + тонкое кольцо. Цвет инвертируется под фоном (mix-blend: difference) — виден и на белом, и на тёмном.
// Над ссылками кольцо чуть растёт; data-cursor="aim" — прицел для игры. Мышь ушла из окна — курсор гаснет, а не «улетает».
const Cursor: React.FC = () => {
  const [on, setOn] = useState(false);
  const [mode, setMode] = useState<'base' | 'hover' | 'aim'>('base');
  const [visible, setVisible] = useState(false);
  const [down, setDown] = useState(false);
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const rx = useSpring(x, { stiffness: 500, damping: 36, mass: 0.5 });
  const ry = useSpring(y, { stiffness: 500, damping: 36, mass: 0.5 });
  const modeRef = useRef(mode);
  const visRef = useRef(false);

  useEffect(() => {
    if (!finePointer()) return;
    setOn(true);
    document.documentElement.classList.add('has-cursor');
    const move = (e: PointerEvent) => {
      if (!visRef.current) {
        // вернулись в окно: кольцо сразу на месте, без перелёта через экран
        x.jump(e.clientX);
        y.jump(e.clientY);
        rx.jump(e.clientX);
        ry.jump(e.clientY);
        visRef.current = true;
        setVisible(true);
      } else {
        x.set(e.clientX);
        y.set(e.clientY);
      }
      const t = e.target as HTMLElement | null;
      const next = t?.closest('[data-cursor="aim"]') ? 'aim' : t?.closest('a,button,[role=button],input,textarea,label,[data-hover]') ? 'hover' : 'base';
      if (next !== modeRef.current) {
        modeRef.current = next;
        setMode(next);
      }
    };
    const hide = () => {
      visRef.current = false;
      setVisible(false);
    };
    const d = () => setDown(true);
    const u = () => setDown(false);
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerdown', d);
    window.addEventListener('pointerup', u);
    document.documentElement.addEventListener('pointerleave', hide);
    window.addEventListener('blur', hide);
    return () => {
      document.documentElement.classList.remove('has-cursor');
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerdown', d);
      window.removeEventListener('pointerup', u);
      document.documentElement.removeEventListener('pointerleave', hide);
      window.removeEventListener('blur', hide);
    };
  }, [x, y, rx, ry]);

  if (!on) return null;
  return (
    <div className={`pointer-events-none fixed inset-0 z-[100] mix-blend-difference transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`} aria-hidden>
      {mode === 'aim' ? (
        <motion.svg viewBox="0 0 48 48" className="absolute left-0 top-0 h-12 w-12 text-white" style={{ x, y, translateX: '-50%', translateY: '-50%' }} animate={{ scale: down ? 0.8 : 1, rotate: down ? 45 : 0 }}>
          <circle cx="24" cy="24" r="15" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M24 2v12M24 34v12M2 24h12M34 24h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="24" cy="24" r="1.6" fill="currentColor" />
        </motion.svg>
      ) : (
        <>
          <motion.div className="absolute left-0 top-0 h-1.5 w-1.5 rounded-full bg-white" style={{ x, y, translateX: '-50%', translateY: '-50%' }} />
          <motion.div
            className="absolute left-0 top-0 rounded-full border border-white"
            style={{ x: rx, y: ry, translateX: '-50%', translateY: '-50%' }}
            animate={{ width: mode === 'hover' ? 46 : 30, height: mode === 'hover' ? 46 : 30, scale: down ? 0.8 : 1, opacity: mode === 'hover' ? 1 : 0.7 }}
            transition={{ type: 'spring', stiffness: 350, damping: 26 }}
          />
        </>
      )}
    </div>
  );
};

export default Cursor;
