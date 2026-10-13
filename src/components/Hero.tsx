import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { WORKS } from '../data';
import { scrollToId } from '../lib/smooth';
import { Arrow, Magnetic } from './ui';

const PlanetScene = lazy(() => import('./PlanetScene'));

const hasWebGL = () => {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
};

// Запасная «планета» без WebGL — CSS-градиенты
const CssPlanet: React.FC = () => (
  <div className="absolute right-[-10%] top-1/2 aspect-square w-[70vmin] -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_35%_30%,#3ee6ff,#8b6cff_45%,#14102a_75%)] shadow-[0_0_120px_40px_rgba(139,108,255,.35)] max-lg:right-1/2 max-lg:translate-x-1/2" />
);

const line = {
  hide: { y: '105%' },
  show: (i: number) => ({ y: '0%', transition: { duration: 1.2, delay: 0.15 + i * 0.12, ease: [0.16, 1, 0.3, 1] as const } }),
};

const Hero: React.FC<{ ready: boolean }> = ({ ready }) => {
  const box = useRef<HTMLElement>(null);
  const scroll = useRef(0);
  const [active, setActive] = useState(true);
  const [gl] = useState(hasWebGL);
  const [compact, setCompact] = useState(() => window.innerWidth < 1024);

  useEffect(() => {
    const onResize = () => setCompact(window.innerWidth < 1024);
    const onScroll = () => {
      const h = box.current?.offsetHeight || 1;
      scroll.current = Math.min(1.5, window.scrollY / h);
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onScroll, { passive: true });
    const io = new IntersectionObserver((e) => setActive(e[0].isIntersecting), { rootMargin: '100px' });
    if (box.current) io.observe(box.current);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll);
      io.disconnect();
    };
  }, []);

  const pick = (slug: string) => scrollToId(`work-${slug}`);

  return (
    <section ref={box} className="relative h-[100svh] min-h-[640px] overflow-hidden" aria-label="Мир сайтов">
      {/* сияние фона */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_70%_45%,rgba(139,108,255,.22),transparent_70%),radial-gradient(40%_40%_at_20%_80%,rgba(62,230,255,.10),transparent_70%)]" />

      <div data-planet className="absolute inset-0 max-lg:top-[-6%]">
        {gl ? (
          <Suspense fallback={null}>
            <motion.div className="h-full w-full" initial={{ opacity: 0, scale: 0.9 }} animate={ready ? { opacity: 1, scale: 1 } : {}} transition={{ duration: 2, ease: [0.16, 1, 0.3, 1] }}>
              <PlanetScene onPick={pick} scroll={scroll} active={active} compact={compact} />
            </motion.div>
          </Suspense>
        ) : (
          <CssPlanet />
        )}
      </div>

      <div className="pointer-events-none relative z-10 mx-auto flex h-full max-w-[1500px] flex-col justify-end px-5 pb-10 sm:px-10 sm:pb-14">
        <motion.div
          className="mb-auto mt-28 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.3em] text-haze"
          initial={{ opacity: 0 }}
          animate={ready ? { opacity: 1 } : {}}
          transition={{ delay: 0.6, duration: 1 }}
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-lime" />
          </span>
          Студия веб-разработки · берём проекты
        </motion.div>

        <h1 className="font-display font-semibold leading-[0.86] tracking-[-0.04em]">
          <span className="block overflow-hidden">
            <motion.span className="block text-[18vw] sm:text-[16vw] lg:text-[13.5vw]" variants={line} custom={0} initial="hide" animate={ready ? 'show' : 'hide'}>
              Мир
            </motion.span>
          </span>
          <span className="block overflow-hidden pb-[0.06em]">
            <motion.span className="text-aurora block text-[18vw] sm:text-[16vw] lg:text-[13.5vw]" variants={line} custom={1} initial="hide" animate={ready ? 'show' : 'hide'}>
              сайтов
            </motion.span>
          </span>
        </h1>

        <div className="mt-6 flex flex-col gap-6 sm:mt-8 lg:flex-row lg:items-end lg:justify-between">
          <motion.p
            className="max-w-md text-[15px] leading-relaxed text-haze sm:text-[17px]"
            initial={{ opacity: 0, y: 20 }}
            animate={ready ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.75, duration: 1, ease: [0.16, 1, 0.3, 1] }}
          >
            Создаём сайты, от которых не хочется уходить: магазины с админкой, промо-сайты с 3D и анимацией, мини-приложения в Telegram.{' '}
            <span className="text-mist">На орбите — {WORKS.length} наших работ, наведите на любую.</span>
          </motion.p>
          <motion.div
            className="pointer-events-auto flex flex-wrap items-center gap-3"
            initial={{ opacity: 0, y: 20 }}
            animate={ready ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.9, duration: 1, ease: [0.16, 1, 0.3, 1] }}
          >
            <Magnetic>
              <button
                onClick={() => scrollToId('works')}
                className="group relative flex items-center gap-3 overflow-hidden rounded-full bg-lime py-4 pl-7 pr-5 font-bold text-void"
              >
                <span className="relative z-10">Смотреть работы</span>
                <span className="relative z-10 grid h-8 w-8 place-items-center rounded-full bg-void text-lime transition-transform duration-500 group-hover:rotate-45">
                  <Arrow />
                </span>
                <span className="absolute inset-0 -translate-x-full bg-white transition-transform duration-500 ease-out-expo group-hover:translate-x-0" />
              </button>
            </Magnetic>
            <Magnetic>
              <button onClick={() => scrollToId('contact')} className="rounded-full border border-white/20 px-7 py-4 font-bold backdrop-blur-md transition-colors hover:border-white/50">
                Обсудить проект
              </button>
            </Magnetic>
          </motion.div>
        </div>
      </div>

      <motion.button
        onClick={() => scrollToId('works')}
        className="absolute bottom-6 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-haze lg:flex"
        initial={{ opacity: 0 }}
        animate={ready ? { opacity: 1 } : {}}
        transition={{ delay: 1.4 }}
        aria-label="Прокрутить к работам"
      >
        Листайте
        <span className="relative h-10 w-px overflow-hidden bg-white/15">
          <span className="absolute left-0 top-0 h-4 w-px animate-[drop_1.8s_ease-in-out_infinite] bg-lime" />
        </span>
      </motion.button>
      <style>{`@keyframes drop{0%{transform:translateY(-100%)}100%{transform:translateY(260%)}}`}</style>
    </section>
  );
};

export default Hero;
