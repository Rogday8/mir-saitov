import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { lockScroll, scrollToId, scrollToTop } from '../lib/smooth';

export const NAV = [
  { id: 'works', label: 'Работы' },
  { id: 'team', label: 'Команда' },
  { id: 'security', label: 'Защита' },
  { id: 'contact', label: 'Контакты' },
];

// Знак: планета с кольцом — одним цветом, без градиента
export const Logo: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox="0 0 64 64" className={className} aria-hidden>
    <circle cx="32" cy="32" r="12" fill="#c8ff4d" />
    <g className="origin-center animate-[spin_9s_linear_infinite]" style={{ transformBox: 'fill-box' }}>
      <ellipse cx="32" cy="32" rx="27" ry="9" fill="none" stroke="#eeebe5" strokeWidth="3" transform="rotate(-24 32 32)" />
    </g>
  </svg>
);

// Шапка — ровная полоса во всю ширину. На первом экране прозрачная, дальше — сплошной фон.
// При прокрутке вниз прячется, при прокрутке вверх возвращается.
const Header: React.FC = () => {
  const [solid, setSolid] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let last = window.scrollY;
    const on = () => {
      const y = window.scrollY;
      setSolid(y > 40);
      if (Math.abs(y - last) > 6) {
        setHidden(y > last && y > 400);
        last = y;
      }
    };
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
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-[transform,background-color] duration-500 ease-out-expo ${solid ? 'bg-void' : 'bg-transparent'} ${hidden && !open ? '-translate-y-full' : ''}`}
      >
        <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between gap-6 px-5 sm:h-[72px] sm:px-10">
          <button onClick={scrollToTop} className="flex items-center gap-2.5" aria-label="Мир сайтов — наверх">
            <Logo className="h-7 w-7" />
            <span className="font-display text-[15px] font-semibold tracking-tight">Мир сайтов</span>
          </button>
          <nav className="hidden items-center gap-8 lg:flex" aria-label="Разделы">
            {NAV.map((n) => (
              <button key={n.id} onClick={() => go(n.id)} className="text-[15px] font-medium text-haze transition-colors hover:text-mist">
                {n.label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <button
              onClick={() => go('contact')}
              className="hidden rounded-full bg-lime px-5 py-2.5 text-[14px] font-semibold text-void transition-colors hover:bg-mist sm:block"
            >
              Обсудить проект
            </button>
            <button
              onClick={() => setOpen((v) => !v)}
              className="relative grid h-10 w-10 place-items-center lg:hidden"
              aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
              aria-expanded={open}
            >
              <span className={`absolute h-[2px] w-5 bg-mist transition-transform duration-300 ${open ? 'rotate-45' : '-translate-y-[4px]'}`} />
              <span className={`absolute h-[2px] w-5 bg-mist transition-transform duration-300 ${open ? '-rotate-45' : 'translate-y-[4px]'}`} />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-40 flex flex-col justify-between bg-void px-5 pb-10 pt-28 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          >
            <nav className="flex flex-col" aria-label="Меню">
              {NAV.map((n, i) => (
                <motion.button
                  key={n.id}
                  onClick={() => go(n.id)}
                  className="py-2 text-left font-head text-[12vw] font-semibold leading-[1.05] tracking-[-0.03em] sm:text-6xl"
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 + i * 0.06, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                >
                  {n.label}
                </motion.button>
              ))}
            </nav>
            <button onClick={() => go('contact')} className="w-full rounded-full bg-lime py-4 text-[16px] font-semibold text-void">
              Обсудить проект
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Header;
