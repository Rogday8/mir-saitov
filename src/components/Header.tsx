import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { lockScroll, scrollToId, scrollToTop } from '../lib/smooth';
import { Magnetic, Scramble } from './ui';

export const NAV = [
  { id: 'works', label: 'Работы' },
  { id: 'skills', label: 'Возможности' },
  { id: 'console', label: 'Пульт' },
  { id: 'team', label: 'Команда' },
  { id: 'game', label: 'Игра' },
  { id: 'contact', label: 'Контакты' },
];

export const Logo: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox="0 0 64 64" className={className} aria-hidden>
    <defs>
      <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#8b6cff" />
        <stop offset=".55" stopColor="#3ee6ff" />
        <stop offset="1" stopColor="#c8ff4d" />
      </linearGradient>
    </defs>
    <circle cx="32" cy="32" r="12" fill="url(#lg)" />
    <g className="origin-center animate-[spin_9s_linear_infinite]" style={{ transformBox: 'fill-box' }}>
      <ellipse cx="32" cy="32" rx="27" ry="9" fill="none" stroke="url(#lg)" strokeWidth="3" transform="rotate(-24 32 32)" />
    </g>
  </svg>
);

const Header: React.FC = () => {
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const on = () => setSolid(window.scrollY > 40);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  useEffect(() => lockScroll(open), [open]);

  const go = (id: string) => {
    setOpen(false);
    setTimeout(() => scrollToId(id), open ? 350 : 0);
  };

  return (
    <>
      <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${solid ? 'py-3' : 'py-5'}`}>
        <div
          className={`mx-3 flex items-center justify-between gap-4 rounded-full px-4 py-2 transition-all duration-500 sm:mx-6 sm:px-5 ${
            solid ? 'border border-white/10 bg-void/90 lg:bg-void/60 lg:backdrop-blur-xl' : 'border border-transparent'
          }`}
        >
          <button onClick={scrollToTop} className="flex items-center gap-2.5" aria-label="Мир сайтов — наверх">
            <Logo className="h-8 w-8" />
            <span className="font-display text-[15px] font-semibold tracking-tight">Мир сайтов</span>
          </button>
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Разделы">
            {NAV.map((n) => (
              <button key={n.id} onClick={() => go(n.id)} className="rounded-full px-4 py-2 text-[13px] font-semibold text-haze transition-colors hover:text-mist">
                <Scramble text={n.label} />
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
            <Magnetic>
              <button
                onClick={() => go('contact')}
                className="group relative overflow-hidden rounded-full bg-mist px-5 py-2.5 text-[13px] font-bold text-void"
              >
                <span className="relative z-10">Обсудить проект</span>
                <span className="absolute inset-0 translate-y-full rounded-full bg-lime transition-transform duration-500 ease-out-expo group-hover:translate-y-0" />
              </button>
            </Magnetic>
            </div>
            <button
              onClick={() => setOpen((v) => !v)}
              className="relative grid h-10 w-10 place-items-center rounded-full border border-white/15 lg:hidden"
              aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
              aria-expanded={open}
            >
              <span className={`absolute h-[2px] w-4 rounded bg-mist transition-transform duration-300 ${open ? 'rotate-45' : '-translate-y-[4px]'}`} />
              <span className={`absolute h-[2px] w-4 rounded bg-mist transition-transform duration-300 ${open ? '-rotate-45' : 'translate-y-[4px]'}`} />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-40 flex flex-col justify-end bg-void/95 px-6 pb-10 pt-28 backdrop-blur-xl lg:hidden"
            initial={{ clipPath: 'circle(0% at 92% 6%)' }}
            animate={{ clipPath: 'circle(150% at 92% 6%)' }}
            exit={{ clipPath: 'circle(0% at 92% 6%)' }}
            transition={{ duration: 0.7, ease: [0.76, 0, 0.24, 1] }}
          >
            <nav className="flex flex-col gap-1" aria-label="Меню">
              {NAV.map((n, i) => (
                <motion.button
                  key={n.id}
                  onClick={() => go(n.id)}
                  className="flex items-baseline gap-4 py-2 text-left font-display text-[11vw] font-semibold leading-none tracking-tight sm:text-6xl"
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.06, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                >
                  <span className="font-mono text-xs text-lime">0{i + 1}</span>
                  {n.label}
                </motion.button>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Header;
