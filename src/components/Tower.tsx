import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValue, useMotionValueEvent, useScroll, useSpring, useTransform, type MotionValue } from 'motion/react';
import { TEAM, type Member } from '../data';
import { finePointer, scrollToId } from '../lib/smooth';

// «Башня»: подъём на лифте по зданию у Москва-Сити. Всё в 2D (фото и слои),
// объём — за счёт перспективы, наклона этажей и параллакса. Прокрутка вниз = лифт едет вверх:
// лобби → три этажа команды → крыша. На текущем этаже поворачиваются пластины жалюзи,
// на фото — точки: наведите (или нажмите на телефоне), чтобы прочитать подсказку.

const base = import.meta.env.BASE_URL;
const img = (n: string) => `${base}floors/${n}.webp`;

/** Точка на фото: координаты в процентах кадра, заголовок и пара строк */
interface Spot {
  x: number;
  y: number;
  t: string;
  d: string;
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
  },
];
const N = FLOORS.length;
const INTRO = 1.4; // подлёт к башне
const TAIL = 0.6; // задержка на крыше перед следующим разделом
const TOTAL = INTRO + N + TAIL;
const SLATS = 9; // пластины жалюзи
const GAP = 34; // промежуток между этажами, px

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

// ——— пластина жалюзи: поворачивается вокруг своей оси, открывая комнату ———
const Slat: React.FC<{ k: number; open: MotionValue<number> }> = ({ k, open }) => {
  // открываются волной слева направо
  const t = useTransform(open, (o) => smooth(clamp(o * 1.5 - (k / SLATS) * 0.5)));
  const rotateY = useTransform(t, (v) => v * 90);
  const opacity = useTransform(t, (v) => 1 - smooth(v));
  return (
    <motion.div
      className="h-full flex-1 origin-center"
      style={{
        rotateY,
        opacity,
        background: 'linear-gradient(90deg, rgba(14,16,28,.92), rgba(40,46,70,.82) 45%, rgba(18,20,34,.92))',
        boxShadow: 'inset -1px 0 0 rgba(255,255,255,.07), inset 1px 0 0 rgba(0,0,0,.4)',
      }}
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
  // жалюзи: на подлёте закрыты у всех, у текущего этажа открываются
  const open = useTransform([ad, intro] as MotionValue<number>[], ([a, it]: number[]) => clamp(1 - a * 1.6) * it);
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
        {/* жалюзи */}
        <div className="pointer-events-none absolute inset-0 flex" style={{ perspective: 900 }}>
          {Array.from({ length: SLATS }, (_, k) => (
            <Slat key={k} k={k} open={open} />
          ))}
        </div>
        {/* верхняя кромка — мягкий свет потолка */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${f.accent}, transparent)` }} />
      </motion.div>
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
