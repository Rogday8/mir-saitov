import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { TEAM } from '../data';
import RunnerGame from './RunnerGame';
import { Rise } from './ui';

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
    <section id="team" className="relative mx-auto max-w-[1500px] px-5 py-32 sm:px-10 sm:py-48">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="font-head text-[11vw] font-semibold leading-[0.95] tracking-[-0.045em] sm:text-[7vw] lg:text-[4.6vw]">
            <Rise text="Кто делает" />
            <br />
            <Rise text="эти миры" delay={0.12} />
          </h2>
        </div>
        <p className="max-w-sm text-[17px] leading-[1.55] text-haze">Наша башня у Москва-Сити. На каждом этаже — один из нас: нажмите на этаж, и лифт отвезёт вас в гости.</p>
      </div>

      <div ref={box} className="relative mt-14 h-[80vh] min-h-[580px] overflow-hidden rounded-[6px] bg-[#121725]">
        {near && (
          <Suspense fallback={<div className="grid h-full place-items-center text-[15px] text-haze">Загружаем город</div>}>
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
                className={`flex items-center gap-3 rounded-full p-1.5 text-left transition-colors sm:pr-4 ${on ? 'bg-mist text-void' : 'bg-void/85 hover:bg-void'}`}
              >
                <span className={`grid h-7 w-7 place-items-center rounded-full text-[13px] font-semibold tabular-nums ${on ? 'bg-void text-mist' : 'bg-white/10'}`}>{i}</span>
                <span className="hidden leading-tight sm:block">
                  <span className="block text-[13px] font-semibold">{f.title}</span>
                  <span className={`block text-[12px] ${on ? 'text-void/60' : 'text-haze'}`}>{f.name}</span>
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
              className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-void/85 px-4 py-2 text-[14px] text-haze"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              Нажмите на этаж<span className="hidden sm:inline"> башни. Потяните, чтобы повернуть город</span>
            </motion.div>
          ) : (
            <motion.div
              key={selected}
              className="absolute bottom-3 left-3 right-3 rounded-[6px] bg-void p-5 sm:bottom-auto sm:left-auto sm:right-5 sm:top-5 sm:w-[360px] sm:p-7"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="text-[14px] text-haze">
                Этаж {selected}, {FLOOR_LIST[selected].title.charAt(0).toLowerCase() + FLOOR_LIST[selected].title.slice(1)}
              </div>
              {member ? (
                <>
                  <div className="mt-4 flex items-center gap-4">
                    <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full bg-white/[0.06]">
                      <img src={`${base}${member.head}`} alt="" className="h-full w-full object-contain" />
                    </span>
                    <div>
                      <div className="font-head text-[26px] font-semibold leading-[1.05] tracking-[-0.02em]">{member.name}</div>
                      <div className="mt-1 text-[14px] text-haze">{member.role}</div>
                    </div>
                  </div>
                  <p className="mt-5 text-[16px] leading-[1.55]">{member.bio}</p>
                </>
              ) : (
                <>
                  <div className="mt-3 font-head text-[26px] font-semibold tracking-[-0.02em]">Мир сайтов</div>
                  <p className="mt-3 text-[16px] leading-[1.55]">
                    Здесь встречаем гостей. Выше — три этажа команды: фронтенд и анимации, продюсирование, дизайн и 3D. Каждый этаж обставлен под характер того, кто на нём работает.
                  </p>
                </>
              )}
              <div className="mt-5 flex flex-wrap gap-2">
                {selected < FLOOR_LIST.length - 1 && (
                  <button onClick={() => setSelected(selected + 1)} className="rounded-full bg-lime px-5 py-2.5 text-[14px] font-semibold text-void">
                    Этаж выше
                  </button>
                )}
                <button onClick={() => setSelected(null)} className="rounded-full bg-white/[0.08] px-5 py-2.5 text-[14px] font-semibold hover:bg-white/[0.14]">
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
