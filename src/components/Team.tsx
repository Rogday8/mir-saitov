import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { TEAM } from '../data';
import RunnerGame from './RunnerGame';
import { Eyebrow, SplitReveal } from './ui';

// «Кто делает эти миры»: 3D-карта Москвы — Москва-Сити и наша башня в разрезе.
// На каждом этаже — один из нас, этаж оформлен под его характер. Клик по этажу — лифт и камера едут туда.
const CityScene = lazy(() => import('./city/CityScene'));

const base = import.meta.env.BASE_URL;
const FLOOR_LIST = [{ title: 'Лобби', name: 'Мир сайтов', color: '#c8ff4d' }, ...TEAM.map((m) => ({ title: m.floor, name: m.name, color: m.color }))];

const Team: React.FC = () => {
  const box = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false); // грузим 3D, только когда раздел рядом
  const [active, setActive] = useState(false); // рисуем кадры, только когда видно
  const [selected, setSelected] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [compact, setCompact] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const a = new IntersectionObserver((e) => e[0].isIntersecting && setNear(true), { rootMargin: '120% 0px' });
    const b = new IntersectionObserver((e) => setActive(e[0].isIntersecting), { rootMargin: '10% 0px' });
    a.observe(el);
    b.observe(el);
    const r = () => setCompact(window.innerWidth < 768);
    window.addEventListener('resize', r);
    return () => {
      a.disconnect();
      b.disconnect();
      window.removeEventListener('resize', r);
    };
  }, []);

  useEffect(() => {
    if (selected === null) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setSelected(null);
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [selected]);

  const member = selected !== null && selected > 0 ? TEAM[selected - 1] : null;

  return (
    <section id="team" className="relative mx-auto max-w-[1500px] px-5 py-28 sm:px-10 sm:py-36">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Eyebrow n="04">Команда</Eyebrow>
          <h2 className="mt-8 font-display text-[12vw] font-semibold leading-[0.9] tracking-[-0.04em] sm:text-[8vw] lg:text-[5.6vw]">
            <SplitReveal text="Кто делает" /> <SplitReveal text="эти миры" delay={0.2} aurora />
          </h2>
        </div>
        <p className="max-w-sm text-[15px] leading-relaxed text-haze">Наша башня у Москва-Сити. На каждом этаже — один из нас: нажмите на этаж, и лифт отвезёт вас в гости.</p>
      </div>

      <div ref={box} className="relative mt-12 h-[78vh] min-h-[560px] overflow-hidden rounded-[28px] border border-white/10 bg-[#0a0912]">
        {near && (
          <Suspense fallback={<div className="grid h-full place-items-center font-mono text-[11px] uppercase tracking-[0.25em] text-haze">Загружаем город</div>}>
            <CityScene selected={selected} hovered={hovered} onHover={setHovered} onSelect={setSelected} active={active} compact={compact} />
          </Suspense>
        )}

        {/* список этажей */}
        <div className="absolute left-3 top-3 flex gap-1.5 sm:left-5 sm:top-5 sm:flex-col">
          {[...FLOOR_LIST].reverse().map((f, ri) => {
            const i = FLOOR_LIST.length - 1 - ri;
            const on = selected === i;
            return (
              <button
                key={f.title}
                onClick={() => setSelected(on ? null : i)}
                onPointerEnter={() => setHovered(i)}
                onPointerLeave={() => setHovered(null)}
                className={`flex items-center gap-3 rounded-full border p-1.5 text-left sm:pr-4 transition-colors ${on ? 'border-white/30 bg-[#1f1d2a]' : 'border-white/10 bg-void/85 hover:border-white/25'}`}
              >
                <span className="grid h-7 w-7 place-items-center rounded-full font-mono text-[11px] font-bold text-void" style={{ background: f.color }}>
                  {i}
                </span>
                <span className="hidden leading-tight sm:block">
                  <span className="block text-[12px] font-semibold text-mist">{f.title}</span>
                  <span className="block text-[11px] text-haze">{f.name}</span>
                </span>
              </button>
            );
          })}
        </div>

        {/* подсказка / карточка этажа */}
        <AnimatePresence mode="wait">
          {selected === null ? (
            <motion.div
              key="hint"
              className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/10 bg-void/80 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-haze"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              нажмите на этаж<span className="hidden sm:inline"> башни · потяните, чтобы повернуть город</span>
            </motion.div>
          ) : (
            <motion.div
              key={selected}
              className="absolute bottom-3 left-3 right-3 rounded-[22px] border border-white/15 bg-void/90 p-5 sm:bottom-auto sm:left-auto sm:right-5 sm:top-5 sm:w-[340px] sm:p-6"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="font-mono text-[11px] uppercase tracking-[0.22em]" style={{ color: FLOOR_LIST[selected].color }}>
                Этаж {selected} · {FLOOR_LIST[selected].title}
              </div>
              {member ? (
                <>
                  <div className="mt-4 flex items-center gap-4">
                    <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white/[0.06]">
                      <img src={`${base}${member.head}`} alt="" className="h-full w-full object-contain" />
                    </span>
                    <div>
                      <div className="font-display text-2xl font-semibold leading-tight">{member.name}</div>
                      <div className="text-[13px] text-haze">{member.role}</div>
                    </div>
                  </div>
                  <p className="mt-4 text-[14px] leading-relaxed text-mist/90">{member.bio}</p>
                </>
              ) : (
                <>
                  <div className="mt-3 font-display text-2xl font-semibold">Мир сайтов</div>
                  <p className="mt-2 text-[14px] leading-relaxed text-mist/90">
                    Здесь встречаем гостей. Выше — три этажа команды: фронтенд и анимации, продюсирование, дизайн и 3D. Каждый этаж обставлен под характер того, кто на нём работает.
                  </p>
                </>
              )}
              <div className="mt-5 flex flex-wrap gap-2">
                {selected < FLOOR_LIST.length - 1 && (
                  <button onClick={() => setSelected(selected + 1)} className="rounded-full bg-mist px-4 py-2 text-[13px] font-bold text-void">
                    Этаж выше ↑
                  </button>
                )}
                <button onClick={() => setSelected(null)} className="rounded-full border border-white/20 px-4 py-2 text-[13px] font-bold hover:border-white/50">
                  К городу
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <RunnerGame />
    </section>
  );
};

export default Team;
