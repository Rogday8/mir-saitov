import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { reducedMotion } from '../lib/smooth';

// Заставка: счётчик 0 → 100 и название, потом «шторка» уезжает вверх. Показывается раз за визит.
const Loader: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const seen = (() => {
    try {
      return sessionStorage.getItem('mir-intro') === '1';
    } catch {
      return false;
    }
  })();
  const [n, setN] = useState(seen || reducedMotion() ? 100 : 0);
  const [show, setShow] = useState(!(seen || reducedMotion()));

  useEffect(() => {
    if (!show) {
      onDone();
      return;
    }
    let raf = 0;
    const start = performance.now();
    const fonts = document.fonts?.ready ?? Promise.resolve();
    let fontsReady = false;
    fonts.then(() => (fontsReady = true));
    const tick = (t: number) => {
      // до 90 — по времени, последние 10 — когда загрузились шрифты
      const p = Math.min(1, (t - start) / 1700);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = Math.round(eased * (fontsReady ? 100 : 90));
      setN(v);
      if (v < 100) raf = requestAnimationFrame(tick);
      else
        setTimeout(() => {
          try {
            sessionStorage.setItem('mir-intro', '1');
          } catch {
            /* приватный режим */
          }
          setShow(false);
          onDone();
        }, 250);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[90] flex flex-col justify-between bg-void p-6 sm:p-10"
          exit={{ clipPath: 'inset(0 0 100% 0)' }}
          initial={{ clipPath: 'inset(0 0 0% 0)' }}
          transition={{ duration: 1.05, ease: [0.76, 0, 0.24, 1] }}
        >
          <div className="flex justify-between font-mono text-[11px] uppercase tracking-[0.3em] text-haze">
            <span>Мир сайтов</span>
            <span>Загружаем вселенную</span>
          </div>
          <div className="relative">
            <div className="overflow-hidden">
              <motion.div
                className="font-display text-[15vw] font-semibold leading-[0.9] tracking-tight sm:text-[11vw]"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
              >
                <span className="text-aurora">{String(n).padStart(3, '0')}</span>
              </motion.div>
            </div>
            <div className="mt-6 h-px w-full bg-white/10">
              <div className="h-px bg-gradient-to-r from-violet via-cyan to-lime transition-[width] duration-100" style={{ width: `${n}%` }} />
            </div>
          </div>
          <div className="flex items-end justify-between font-mono text-[11px] uppercase tracking-[0.3em] text-haze">
            <span>Сайты · 3D · Анимации</span>
            <span>©{new Date().getFullYear()}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Loader;
