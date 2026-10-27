import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValue, useMotionValueEvent, useScroll, useSpring, useTransform, type MotionValue } from 'motion/react';
import { TEAM, type Member } from '../data';
import { finePointer, scrollToId } from '../lib/smooth';

// «Башня»: подъём на лифте по зданию у Москва-Сити. Всё в 2D (фото и слои),
// объём — за счёт перспективы, наклона этажей и параллакса. Прокрутка вниз = лифт едет вверх:
// лобби → три этажа команды → крыша. Этажи за тёмным тонированным стеклом; у текущего
// стекло светлеет, по бокам выплывают плашки с тем, чем занимаются на этаже.
// На фото — точки: наведите (или нажмите на телефоне), чтобы прочитать подсказку.

const base = import.meta.env.BASE_URL;
const img = (n: string) => `${base}floors/${n}.webp`;
// крошечная (40px) размытая копия фото — растянутая, она и есть «матовое стекло», без CSS-фильтров
const blurImg = (n: string) => `${base}floors/blur/${n}.webp`;

/** Точка на фото: координаты в процентах кадра, заголовок и пара строк */
interface Spot {
  x: number;
  y: number;
  t: string;
  d: string;
}
/** Плашка сбоку этажа: крупно и подпись */
interface Chip {
  t: string;
  s: string;
}
interface Floor {
  key: string;
  title: string;
  photo: string;
  accent: string;
  member?: Member;
  text?: string;
  cta?: boolean;
  spots: Spot[];
  chips: Chip[];
}

const FLOORS: Floor[] = [
  {
    key: 'lobby',
    title: 'Лобби',
    photo: 'lobby',
    accent: '#c8ff4d',
    text: 'Мир сайтов — студия из трёх человек. Поднимайтесь: на каждом этаже работает один из нас.',
    spots: [
      { x: 50, y: 30, t: 'Первая встреча', d: 'Обсуждаем задачу, смотрим примеры, которые вам нравятся, и прикидываем сроки.' },
      { x: 72, y: 55, t: 'Работаем удалённо', d: 'Созвоны, демо и правки онлайн — из любого города.' },
      { x: 30, y: 72, t: 'Без лишних посредников', d: 'Вы общаетесь напрямую с теми, кто делает сайт.' },
    ],
    chips: [
      { t: '3 человека', s: 'вся студия' },
      { t: 'Онлайн', s: 'созвоны и демо' },
      { t: 'Напрямую', s: 'без посредников' },
      { t: 'С нуля', s: 'под вашу задачу' },
    ],
  },
  {
    key: 'neon',
    title: TEAM[0].floor,
    photo: 'neon',
    accent: TEAM[0].color,
    member: TEAM[0],
    spots: [
      { x: 50, y: 46, t: 'Интерфейсы', d: 'React, анимации, 3D на странице — и всё это быстро открывается на телефоне.' },
      { x: 20, y: 40, t: 'Плавность', d: 'Анимации без рывков: проверяем на слабых телефонах, а не только на мощном компьютере.' },
      { x: 79, y: 36, t: 'Любой экран', d: 'Компьютер, планшет, телефон и встроенный браузер Telegram.' },
    ],
    chips: [
      { t: 'React', s: 'интерфейсы' },
      { t: 'Motion', s: 'анимации' },
      { t: 'Three.js', s: '3D в браузере' },
      { t: '60 к/с', s: 'без рывков' },
    ],
  },
  {
    key: 'office',
    title: TEAM[1].floor,
    photo: 'office',
    accent: TEAM[1].color,
    member: TEAM[1],
    spots: [
      { x: 56, y: 68, t: 'План проекта', d: 'Этапы, сроки и ответственные — заранее и в одном месте.' },
      { x: 24, y: 42, t: 'Связь с вами', d: 'Показываем прогресс по ходу работы, а не только в конце.' },
      { x: 86, y: 46, t: 'Тексты и структура', d: 'Помогаем собрать содержание сайта, если его ещё нет.' },
    ],
    chips: [
      { t: 'Бриф', s: 'задача на бумаге' },
      { t: 'Этапы', s: 'сроки заранее' },
      { t: 'Демо', s: 'прогресс по ходу' },
      { t: 'Telegram', s: 'связь в один клик' },
    ],
  },
  {
    key: 'studio',
    title: TEAM[2].floor,
    photo: 'studio',
    accent: TEAM[2].color,
    member: TEAM[2],
    spots: [
      { x: 44, y: 38, t: 'Макеты', d: 'Сначала дизайн ключевых экранов — вы видите сайт до того, как он написан.' },
      { x: 52, y: 76, t: 'Свои фото и 3D', d: 'Снимаем и моделируем товары, если готовых материалов нет.' },
      { x: 79, y: 50, t: 'Фирменный стиль', d: 'Шрифты, цвета и детали, по которым сайт узнают с первого экрана.' },
    ],
    chips: [
      { t: 'Figma', s: 'макеты' },
      { t: 'Blender', s: '3D-модели' },
      { t: 'Шрифты', s: 'и цвета' },
      { t: 'Фото', s: 'товаров и команды' },
    ],
  },
  {
    key: 'roof',
    title: 'Крыша',
    photo: 'roof',
    accent: '#c8ff4d',
    text: 'Отсюда виден весь город — и ваш будущий сайт тоже. Расскажите, каким он должен быть.',
    cta: true,
    spots: [
      { x: 50, y: 32, t: 'Запуск', d: 'Домен, хостинг, HTTPS и скорость загрузки — берём на себя.' },
      { x: 26, y: 62, t: 'После запуска', d: 'Остаёмся рядом: правки, доработки и новые функции.' },
    ],
    chips: [
      { t: 'Домен', s: 'и HTTPS' },
      { t: 'Хостинг', s: 'настроим сами' },
      { t: 'Скорость', s: 'быстрая загрузка' },
      { t: 'Поддержка', s: 'после запуска' },
    ],
  },
];
const N = FLOORS.length;
const INTRO = 1.4; // подлёт к башне
const TAIL = 0.6; // задержка на крыше перед следующим разделом
const TOTAL = INTRO + N + TAIL;
const GAP = 34; // промежуток между этажами, px
const EASE = [0.16, 1, 0.3, 1] as const;

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (t: number) => t * t * (3 - 2 * t);

/** Номер этажа «с дробью»: на каждом этаже сначала стоим (читаем), потом едем к следующему */
function floorPos(p: number) {
  const s = p * TOTAL - INTRO;
  if (s <= 0) return 0;
  const i = Math.floor(s);
  if (i >= N - 1) return N - 1;
  const f = s - i;
  return i + smooth(clamp((f - 0.5) / 0.5));
}

// ——— плашка сбоку этажа: держится у края рамки, выплывает к текущему этажу ———
// l — слева или справа, y — высота в % кадра, z — насколько впереди этажа, k — сдвиг при движении лифта
const SLOTS = [
  { l: true, y: 12, z: 90, k: 60 },
  { l: false, y: 8, z: 140, k: -45 },
  { l: true, y: 80, z: 130, k: -70 },
  { l: false, y: 86, z: 70, k: 50 },
];
const SideChip: React.FC<{ c: Chip; n: number; accent: string; d: MotionValue<number> }> = ({ c, n, accent, d }) => {
  const s = SLOTS[n % SLOTS.length];
  const y = useTransform(d, (v) => v * s.k); // при движении плашки отстают по-разному — видна глубина
  return (
    <motion.div className="pointer-events-none absolute hidden lg:block" style={{ top: `${s.y}%`, [s.l ? 'left' : 'right']: 0, z: s.z, y }}>
      <div className={s.l ? 'translate-x-[20%] 2xl:-translate-x-[62%]' : '-translate-x-[20%] 2xl:translate-x-[62%]'}>
        <motion.div
          initial={{ opacity: 0, x: s.l ? -36 : 36, filter: 'blur(6px)' }}
          animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, x: s.l ? -20 : 20, filter: 'blur(6px)', transition: { duration: 0.3 } }}
          transition={{ duration: 0.8, delay: 0.15 + n * 0.1, ease: EASE }}
        >
          <div
            className="flex items-center gap-3 whitespace-nowrap rounded-2xl border border-white/12 bg-[#0a0910]/88 py-2.5 pl-3 pr-5 shadow-[0_20px_44px_-18px_rgba(0,0,0,.95)]"
            style={{ animation: `tower-float ${5 + n * 0.8}s ease-in-out ${-n * 1.3}s infinite` }}
          >
            <span className="h-8 w-[3px] rounded-full" style={{ background: accent, boxShadow: `0 0 12px ${accent}` }} />
            <span>
              <span className="block text-[16px] font-semibold leading-tight text-white">{c.t}</span>
              <span className="block text-[12px] text-haze">{c.s}</span>
            </span>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

// ——— полоса света: проносится мимо, пока лифт едет между этажами ———
const STREAKS = Array.from({ length: 22 }, (_, k) => {
  const r = (n: number) => {
    const v = Math.sin(k * 12.9898 + n * 78.233) * 43758.5453;
    return v - Math.floor(v);
  };
  // только по бокам, середина — для этажа
  return { x: k % 2 ? 1 + r(1) * 21 : 78 + r(1) * 21, h: 120 + r(2) * 260, sp: 0.6 + r(3) * 1.2, o: r(4) * 2000 };
});
const Streak: React.FC<{ s: (typeof STREAKS)[number]; pos: MotionValue<number>; travel: MotionValue<number> }> = ({ s, pos, travel }) => {
  // лифт едет вверх — огни уходят вниз
  const y = useTransform(pos, (v) => {
    const span = window.innerHeight + 600;
    return ((v * 900 * s.sp + s.o) % span) - 300;
  });
  const opacity = useTransform(travel, (t) => t * 0.75);
  return (
    <motion.div
      className="absolute top-0 w-px"
      style={{ left: `${s.x}%`, height: s.h, y, opacity, background: 'linear-gradient(to bottom, transparent, rgba(205,220,255,.6), transparent)' }}
    />
  );
};

// ——— точка на фото ———
const Hotspot: React.FC<{ s: Spot; accent: string; on: boolean; onToggle: () => void; onHover: (v: boolean) => void }> = ({ s, accent, on, onToggle, onHover }) => {
  // подсказка раскрывается внутрь кадра: у краёв — от точки, в середине — по центру под ней
  const side = s.x < 35 ? 'left-2' : s.x > 65 ? 'right-2' : 'left-1/2 -translate-x-1/2';
  return (
    <div className="absolute" style={{ left: `${s.x}%`, top: `${s.y}%` }}>
      <button
        type="button"
        aria-label={s.t}
        aria-expanded={on}
        onClick={onToggle}
        onPointerEnter={() => finePointer() && onHover(true)}
        onPointerLeave={() => finePointer() && onHover(false)}
        className="group relative -translate-x-1/2 -translate-y-1/2 p-3"
        data-cursor="Смотреть"
      >
        <span className="absolute left-1/2 top-1/2 h-9 w-9 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full opacity-40" style={{ background: accent }} />
        <span
          className="relative grid h-6 w-6 place-items-center rounded-full border-2 border-white/90 shadow-[0_0_20px_rgba(0,0,0,.6)] transition-transform duration-300 group-hover:scale-125"
          style={{ background: on ? accent : 'rgba(10,10,18,.55)' }}
        >
          <span className={`h-1.5 w-1.5 rounded-full transition-colors ${on ? 'bg-void' : 'bg-white'}`} />
        </span>
      </button>
      <AnimatePresence>
        {on && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className={`pointer-events-none absolute top-5 z-10 w-[min(230px,58vw)] rounded-2xl border border-white/15 bg-[#0b0a12]/90 p-4 backdrop-blur-md ${side}`}
            style={{ boxShadow: `0 20px 50px -20px rgba(0,0,0,.9), inset 0 1px 0 ${accent}55` }}
          >
            <div className="text-[14px] font-bold" style={{ color: accent }}>
              {s.t}
            </div>
            <p className="mt-1 text-[13px] leading-snug text-mist/85">{s.d}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ——— один этаж ———
const FloorView: React.FC<{ f: Floor; i: number; pos: MotionValue<number>; intro: MotionValue<number>; active: boolean }> = ({ f, i, pos, intro, active }) => {
  const d = useTransform(pos, (v) => i - v); // >0 — этаж выше текущего
  const ad = useTransform(d, (v) => Math.abs(v));
  // этажи выше видны чуть снизу, ниже — чуть сверху: глаз на уровне текущего этажа
  const rotateX = useTransform(d, (v) => clamp(v, -2, 2) * -7);
  const z = useTransform(ad, (v) => -Math.min(v, 2.5) * 120);
  const dim = useTransform(ad, (v) => Math.min(v, 1.4) * 0.5); // затемнение соседних этажей
  const photoY = useTransform(d, (v) => `${clamp(v, -1.5, 1.5) * -8}%`);
  const photoScale = useTransform(ad, (v) => 1.06 + Math.min(v, 1) * 0.06);
  // стекло: на подлёте тёмное у всех, у текущего этажа светлеет, по нему проходит полоса света
  const open = useTransform([ad, intro] as MotionValue<number>[], ([a, it]: number[]) => clamp(1 - a * 1.6) * it);
  const glass = useTransform(open, (o) => 1 - smooth(clamp(o * 1.25)));
  const sweepX = useTransform(open, (o) => `${-100 + o * 400}%`);
  const sweepO = useTransform(open, (o) => Math.sin(Math.PI * clamp(o)) * 0.9);
  const sheenX = useTransform(d, (v) => `${clamp(v, -2, 2) * 12}%`); // блик на стекле скользит при движении
  const glow = useTransform(ad, (v) => clamp(1 - v * 1.8));
  const ring = useTransform(glow, (g) => `0 0 0 1px rgba(255,255,255,${0.08 + g * 0.1}), 0 0 ${g * 60}px -10px ${f.accent}, 0 30px 80px -30px rgba(0,0,0,.9)`);

  const [spot, setSpot] = useState<number | null>(null);
  // точки показываем, только когда лифт остановился на этом этаже
  const [aligned, setAligned] = useState(false);
  useMotionValueEvent(ad, 'change', (v) => setAligned(v < 0.08));
  const showSpots = active && aligned;
  useEffect(() => {
    if (!showSpots) setSpot(null);
  }, [showSpots]);

  return (
    <motion.div className="relative" style={{ rotateX, z, transformStyle: 'preserve-3d', paddingTop: GAP }}>
      {/* промежуток между этажами: тонкая линия перекрытия и номер */}
      <div className="pointer-events-none absolute inset-x-6 top-0 flex h-[34px] items-center gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/35">
          {String(i).padStart(2, '0')} · {f.title}
        </span>
        <span className="h-px flex-1" style={{ background: `linear-gradient(90deg, ${f.accent}88, transparent)` }} />
      </div>
      <motion.div className="relative h-[var(--fh)] overflow-hidden rounded-[22px] bg-black" style={{ boxShadow: ring }}>
        {/* фото с параллаксом и точки на нём — один слой, чтобы точки «стояли» на предметах */}
        <motion.div className="absolute inset-x-0 top-[-10%] h-[120%]" style={{ y: photoY, scale: photoScale }}>
          <img src={img(f.photo)} alt="" draggable={false} className="absolute inset-0 h-full w-full object-cover" loading={i < 2 ? 'eager' : 'lazy'} />
          {showSpots &&
            f.spots.map((s, k) => (
              <Hotspot key={k} s={s} accent={f.accent} on={spot === k} onToggle={() => setSpot(spot === k ? null : k)} onHover={(v) => setSpot(v ? k : null)} />
            ))}
        </motion.div>
        {/* виньетка и затемнение соседних этажей */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_95%_at_50%_45%,transparent_58%,rgba(0,0,0,.6))]" />
        <motion.div className="pointer-events-none absolute inset-0 bg-[#05050a]" style={{ opacity: dim }} />
        {/* тонированное стекло: размытая комната, номер этажа и кто на нём */}
        <motion.div className="pointer-events-none absolute inset-0" style={{ opacity: glass }}>
          <img src={blurImg(f.photo)} alt="" draggable={false} className="absolute inset-0 h-full w-full scale-110 object-cover saturate-150" />
          <div className="absolute inset-0 bg-[#06050b]/80" />
          <div className="absolute inset-0" style={{ background: `radial-gradient(70% 90% at 50% 115%, ${f.accent}2e, transparent 70%)` }} />
          <motion.div
            className="absolute inset-y-0 -left-1/2 w-[200%]"
            style={{ x: sheenX, background: 'linear-gradient(110deg, transparent 40%, rgba(255,255,255,.07) 47%, rgba(255,255,255,.02) 52%, transparent 58%)' }}
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
            <span className="font-display text-[clamp(72px,11vw,170px)] font-semibold leading-none tracking-[-0.04em] text-transparent" style={{ WebkitTextStroke: `1.5px ${f.accent}b0` }}>
              {String(i).padStart(2, '0')}
            </span>
            <span className="mt-4 font-mono text-[11px] uppercase tracking-[0.35em] text-white/70">{f.title}</span>
            {f.member && (
              <span className="mt-2 text-[14px] text-white/45">
                {f.member.name} · {f.member.role}
              </span>
            )}
          </div>
        </motion.div>
        <motion.div
          className="pointer-events-none absolute inset-y-0 left-0 w-[35%]"
          style={{ x: sweepX, opacity: sweepO, mixBlendMode: 'screen', background: `linear-gradient(90deg, transparent, ${f.accent}33, rgba(255,255,255,.2), ${f.accent}33, transparent)` }}
        />
        {/* верхняя кромка — мягкий свет потолка */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${f.accent}, transparent)` }} />
      </motion.div>
      {/* плашки по бокам — только у текущего этажа */}
      <AnimatePresence>{active && f.chips.map((c, n) => <SideChip key={c.t} c={c} n={n} accent={f.accent} d={d} />)}</AnimatePresence>
    </motion.div>
  );
};

// ——— табло лифта ———
const Elevator: React.FC<{ cur: number; onGo: (i: number) => void }> = ({ cur, onGo }) => (
  <div className="pointer-events-auto flex flex-col items-center gap-3">
    <div className="relative grid h-16 w-16 place-items-center overflow-hidden rounded-2xl border border-white/15 bg-black/70 font-mono text-[32px] font-bold text-lime backdrop-blur">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={cur} initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -30, opacity: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
          {cur}
        </motion.span>
      </AnimatePresence>
      <span className="pointer-events-none absolute inset-x-0 top-1 text-center text-[8px] font-normal tracking-[0.3em] text-white/30">ЭТАЖ</span>
    </div>
    <div className="flex flex-col-reverse items-center gap-2">
      {FLOORS.map((f, i) => (
        <button
          key={f.key}
          onClick={() => onGo(i)}
          aria-label={`Этаж ${i}: ${f.title}`}
          className={`rounded-full transition-all duration-300 ${i === cur ? 'h-5 w-2.5 bg-lime' : 'h-2.5 w-2.5 bg-white/25 hover:bg-white/60'}`}
        />
      ))}
    </div>
  </div>
);

// ——— карточка этажа ———
const Info: React.FC<{ f: Floor; i: number }> = ({ f, i }) => (
  <motion.div
    initial={{ opacity: 0, x: 40, filter: 'blur(8px)' }}
    animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
    exit={{ opacity: 0, x: -24, filter: 'blur(8px)' }}
    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    className="pointer-events-auto relative overflow-hidden rounded-[24px] border border-white/12 bg-[#09080f]/88 p-5 backdrop-blur-xl sm:p-7"
  >
    <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${f.accent}, transparent)` }} />
    <div className="font-mono text-[11px] uppercase tracking-[0.25em]" style={{ color: f.accent }}>
      Этаж {i} · {f.title}
    </div>
    {f.member ? (
      <>
        <div className="mt-4 flex items-center gap-4">
          <span className="grid h-[72px] w-[72px] shrink-0 place-items-center overflow-hidden rounded-full" style={{ background: `${f.accent}22`, boxShadow: `inset 0 0 0 2px ${f.accent}66` }}>
            <img src={`${base}${f.member.head}`} alt="" className="h-full w-full object-contain pt-1" />
          </span>
          <div>
            <div className="font-display text-[26px] font-semibold leading-tight">{f.member.name}</div>
            <div className="text-[14px] text-haze">{f.member.role}</div>
          </div>
        </div>
        <p className="mt-4 text-[15px] leading-relaxed text-mist/90">{f.member.bio}</p>
      </>
    ) : (
      <>
        <div className="mt-3 font-display text-[28px] font-semibold leading-tight">{f.cta ? 'Вид на ваш проект' : 'Мир сайтов'}</div>
        <p className="mt-3 text-[15px] leading-relaxed text-mist/90">{f.text}</p>
        {f.cta && (
          <button onClick={() => scrollToId('contact')} className="mt-5 rounded-full bg-lime px-6 py-3 font-bold text-void">
            Обсудить проект
          </button>
        )}
      </>
    )}
    <div className="mt-5 flex items-center gap-2 text-[12px] text-haze">
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: f.accent }} />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ background: f.accent }} />
      </span>
      {finePointer() ? 'Наведите' : 'Нажмите'} на точки на фото
    </div>
  </motion.div>
);

const Tower: React.FC = () => {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  // мягкая «пружина» поверх прокрутки — лифт едет плавно, без рывков от колёсика
  const p = useSpring(scrollYProgress, { stiffness: 110, damping: 26, mass: 0.6 });
  const pos = useTransform(p, floorPos);
  const intro = useTransform(p, (v) => smooth(clamp((v * TOTAL) / INTRO)));
  // 0 — стоим на этаже, 1 — середина пути между этажами
  const travel = useTransform(pos, (v) => Math.sin(Math.PI * (v - Math.floor(v))));
  const [cur, setCur] = useState(0);
  const [showInfo, setShowInfo] = useState(false);
  useMotionValueEvent(pos, 'change', (v) => setCur(Math.round(v)));
  useMotionValueEvent(intro, 'change', (v) => setShowInfo(v > 0.95));

  // подлёт: вся башня издалека → крупно; город за ней уходит в темноту
  const scale = useTransform(intro, [0, 1], [0.32, 1]);
  const bgScale = useTransform(intro, [0, 1], [1.05, 1.22]);
  const bgY = useTransform(p, [0, 1], ['0%', '-8%']);
  const shade = useTransform(intro, [0, 1], [0.55, 0.86]);
  const titleOpacity = useTransform(intro, [0, 0.5], [1, 0]);
  const titleY = useTransform(intro, [0, 0.5], [0, -50]);
  const titleBlur = useTransform(intro, [0, 0.5], ['blur(0px)', 'blur(10px)']);

  const stack = useRef<HTMLDivElement>(null);
  const floorH = useMotionValue(600);
  useEffect(() => {
    const el = stack.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const first = el.firstElementChild as HTMLElement | null;
      if (first) floorH.set(first.offsetHeight);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [floorH]);
  // верх стопки привязан к центру экрана; на подлёте видна вся башня, к концу камера опускается к лобби
  // на телефоне карточка внизу — поднимаем этаж выше центра, чтобы комнату было видно
  const lift = useMotionValue(0);
  useEffect(() => {
    const r = () => lift.set(window.innerWidth < 640 ? -window.innerHeight * 0.14 : 0);
    r();
    window.addEventListener('resize', r);
    return () => window.removeEventListener('resize', r);
  }, [lift]);
  const stackY = useTransform([pos, floorH, intro, lift] as MotionValue<number>[], ([v, fh, it, l]: number[]) => {
    const at = (N - 1) / 2 + (v - (N - 1) / 2) * it;
    return -(N - 0.5 - at) * fh - GAP / 2 + l * it;
  });

  const [h, setH] = useState(() => window.innerHeight);
  useEffect(() => {
    const r = () => setH(window.innerHeight);
    window.addEventListener('resize', r);
    return () => window.removeEventListener('resize', r);
  }, []);

  // клик по табло лифта — едем к этажу прокруткой
  const go = (i: number) => {
    const el = ref.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const span = el.offsetHeight - h;
    window.scrollTo({ top: top + (span * (INTRO + i + 0.25)) / TOTAL, behavior: 'smooth' });
  };

  return (
    <section ref={ref} className="relative" style={{ height: `${TOTAL * 100}vh` }}>
      <div className="sticky top-0 h-[100svh] overflow-hidden bg-[#05050a] [--fh:50svh] sm:[--fh:58vh]">
        {/* ночной город за башней */}
        <motion.img src={img('city')} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ scale: bgScale, y: bgY }} draggable={false} />
        <motion.div className="absolute inset-0 bg-[#05050a]" style={{ opacity: shade }} />
        <div className="absolute inset-0 bg-[radial-gradient(80%_70%_at_50%_50%,transparent,rgba(5,5,10,.85))]" />
        {/* огни за стеклом лифта — видны только в движении */}
        <div className="pointer-events-none absolute inset-0">
          {STREAKS.map((s, k) => (
            <Streak key={k} s={s} pos={pos} travel={travel} />
          ))}
        </div>
        {/* мягкие переходы сверху и снизу — раздел «вырастает» из страницы */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-28 bg-gradient-to-b from-[#07060c] to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-28 bg-gradient-to-t from-[#07060c] to-transparent" />

        {/* башня: стопка этажей, лобби внизу */}
        <div className="absolute inset-0" style={{ perspective: '1500px' }}>
          <motion.div className="absolute inset-0" style={{ scale, transformStyle: 'preserve-3d' }}>
            <motion.div
              className="absolute left-1/2 top-1/2 w-[92vw] max-w-[980px] -translate-x-1/2 lg:left-[calc(50%-190px)] lg:w-[min(62vw,980px)]"
              style={{ y: stackY, transformStyle: 'preserve-3d' }}
            >
              <div ref={stack} className="flex flex-col-reverse" style={{ transformStyle: 'preserve-3d' }}>
                {FLOORS.map((f, i) => (
                  <FloorView key={f.key} f={f} i={i} pos={pos} intro={intro} active={showInfo && cur === i} />
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* заголовок подлёта */}
        <motion.div className="pointer-events-none absolute inset-x-0 top-[12vh] z-20 px-5 text-center" style={{ opacity: titleOpacity, y: titleY, filter: titleBlur }}>
          <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-lime">Москва-Сити · наша башня</div>
          <div className="mx-auto mt-4 max-w-3xl font-display text-[9vw] font-semibold leading-[0.95] tracking-[-0.04em] sm:text-[5vw]">Поднимитесь к нам на лифте</div>
          <div className="mt-4 text-[14px] text-haze">Листайте вниз</div>
        </motion.div>

        {/* табло лифта */}
        <div className="pointer-events-none absolute left-3 top-1/2 z-20 -translate-y-1/2 sm:left-8">
          <AnimatePresence>
            {showInfo && (
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <Elevator cur={cur} onGo={go} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* карточка этажа */}
        <div className="pointer-events-none absolute bottom-4 left-4 right-4 z-20 sm:bottom-auto sm:left-auto sm:right-8 sm:top-1/2 sm:w-[380px] sm:-translate-y-1/2">
          <AnimatePresence mode="wait">{showInfo && <Info key={cur} f={FLOORS[cur]} i={cur} />}</AnimatePresence>
        </div>
      </div>
    </section>
  );
};

export default Tower;
