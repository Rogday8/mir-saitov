import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValue, useMotionValueEvent, useScroll, useTransform, type MotionValue } from 'motion/react';
import { TEAM, type Member } from '../data';
import { scrollToId } from '../lib/smooth';

// «Башня»: подъём на лифте по зданию у Москва-Сити. Всё в 2D (фото и слои),
// объём — за счёт перспективы, наклона этажей и параллакса. Прокрутка вниз = лифт едет вверх:
// лобби → три этажа команды → крыша. На каждом этаже стеклянный фасад «раздвигается», а сбоку
// выезжает карточка того, кто там работает.

const base = import.meta.env.BASE_URL;
const img = (n: string) => `${base}floors/${n}.webp`;

interface Floor {
  key: string;
  title: string;
  photo: string;
  accent: string;
  member?: Member;
  text?: string;
  cta?: boolean;
}

const FLOORS: Floor[] = [
  { key: 'lobby', title: 'Лобби', photo: 'lobby', accent: '#c8ff4d', text: 'Мир сайтов — студия из трёх человек. Поднимайтесь: на каждом этаже работает один из нас.' },
  { key: 'neon', title: TEAM[0].floor, photo: 'neon', accent: TEAM[0].color, member: TEAM[0] },
  { key: 'office', title: TEAM[1].floor, photo: 'office', accent: TEAM[1].color, member: TEAM[1] },
  { key: 'studio', title: TEAM[2].floor, photo: 'studio', accent: TEAM[2].color, member: TEAM[2] },
  { key: 'roof', title: 'Крыша', photo: 'roof', accent: '#c8ff4d', text: 'Отсюда виден весь город — и ваш будущий сайт тоже. Расскажите, каким он должен быть.', cta: true },
];
const N = FLOORS.length;
const INTRO = 1; // экран «подлёта» к башне
const TAIL = 0.6; // задержка на крыше перед следующим разделом
const TOTAL = INTRO + N + TAIL;

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (t: number) => t * t * (3 - 2 * t);

/** Номер этажа «с дробью»: на каждом этаже сначала стоим (читаем), потом едем к следующему */
function floorPos(p: number) {
  const s = p * TOTAL - INTRO;
  if (s <= 0) return 0;
  const i = Math.floor(s);
  if (i >= N - 1) return N - 1;
  const f = s - i;
  return i + smooth(clamp((f - 0.45) / 0.55));
}

// ——— один этаж ———
const FloorView: React.FC<{ f: Floor; i: number; pos: MotionValue<number>; intro: MotionValue<number> }> = ({ f, i, pos, intro }) => {
  const d = useTransform(pos, (v) => i - v); // >0 — этаж выше текущего
  const ad = useTransform(d, (v) => Math.abs(v));
  // этажи выше наклонены так, что видно потолок, ниже — пол: глаз находится на уровне текущего этажа
  const rotateX = useTransform(d, (v) => clamp(v, -2.2, 2.2) * -9);
  const z = useTransform(ad, (v) => -Math.min(v, 2.5) * 140);
  const bright = useTransform(ad, (v) => `brightness(${1 - Math.min(v, 1.6) * 0.26}) saturate(${1 - Math.min(v, 1) * 0.3})`);
  // параллакс фото внутри этажа
  const photoY = useTransform(d, (v) => `${clamp(v, -1.5, 1.5) * -9}%`);
  // стеклянный фасад: на подлёте закрыт у всех, у текущего этажа раздвигается
  const glass = useTransform([ad, intro] as MotionValue<number>[], ([a, it]: number[]) => Math.max(clamp(a * 1.4), 1 - it));
  const leftX = useTransform(glass, (g) => `${(1 - g) * -102}%`);
  const rightX = useTransform(glass, (g) => `${(1 - g) * 102}%`);

  return (
    <motion.div className="relative" style={{ rotateX, z, transformStyle: 'preserve-3d', filter: bright }}>
      {/* плита перекрытия над этажом: верхняя грань, торец и подсветка */}
      <div className="relative h-[22px]">
        <div className="absolute inset-x-[-1.5%] top-0 h-[14px] bg-gradient-to-b from-[#3a3946] to-[#24232d]" />
        <div className="absolute inset-x-[-1.5%] top-[14px] h-[8px] bg-[#16151d]" />
        <div className="absolute inset-x-[-1.5%] top-[13px] h-[2px]" style={{ background: f.accent, boxShadow: `0 0 16px ${f.accent}` }} />
      </div>
      <div className="relative h-[var(--fh)] overflow-hidden bg-black">
        <motion.img
          src={img(f.photo)}
          alt=""
          draggable={false}
          className="absolute inset-x-0 top-[-12%] h-[124%] w-full object-cover"
          style={{ y: photoY }}
          loading={i < 2 ? 'eager' : 'lazy'}
        />
        {/* затемнение по краям — глубина комнаты */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_40%,transparent_55%,rgba(0,0,0,.55))]" />
        {/* стекло фасада: две створки с импостами и бликом */}
        {(['l', 'r'] as const).map((side) => (
          <motion.div
            key={side}
            className={`pointer-events-none absolute inset-y-0 w-1/2 ${side === 'l' ? 'left-0' : 'right-0'}`}
            style={{
              x: side === 'l' ? leftX : rightX,
              // тонированное стекло: блик по диагонали + импосты; комната сквозь него видна
              background:
                'linear-gradient(115deg, rgba(190,215,255,.22), rgba(30,40,70,.38) 36%, rgba(170,200,255,.16) 52%, rgba(20,26,48,.45)), repeating-linear-gradient(90deg, rgba(255,255,255,.18) 0 2px, transparent 2px 25%)',
            }}
          />
        ))}
        {/* номер этажа на стене */}
        <div className="pointer-events-none absolute left-4 top-3 font-display text-[64px] font-bold leading-none text-white/10 sm:left-6 sm:text-[96px]">{i}</div>
      </div>
    </motion.div>
  );
};

// ——— табло лифта ———
const Elevator: React.FC<{ cur: number; onGo: (i: number) => void }> = ({ cur, onGo }) => (
  <div className="pointer-events-auto flex flex-col items-center gap-3">
    <div className="grid h-16 w-16 place-items-center rounded-2xl border border-white/15 bg-black/60 font-mono text-[34px] font-bold text-lime shadow-[0_0_30px_rgba(200,255,77,.15)] backdrop-blur">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={cur} initial={{ y: 26, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -26, opacity: 0 }} transition={{ duration: 0.35 }}>
          {cur}
        </motion.span>
      </AnimatePresence>
    </div>
    <div className="flex flex-col-reverse gap-1.5">
      {FLOORS.map((f, i) => (
        <button
          key={f.key}
          onClick={() => onGo(i)}
          aria-label={`Этаж ${i}: ${f.title}`}
          className={`h-2.5 w-2.5 rounded-full transition-all ${i === cur ? 'scale-125 bg-lime' : 'bg-white/25 hover:bg-white/60'}`}
        />
      ))}
    </div>
  </div>
);

// ——— карточка этажа ———
const Info: React.FC<{ f: Floor; i: number }> = ({ f, i }) => (
  <motion.div
    key={f.key}
    initial={{ opacity: 0, x: 40, filter: 'blur(6px)' }}
    animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
    exit={{ opacity: 0, x: -30, filter: 'blur(6px)' }}
    transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
    className="pointer-events-auto rounded-[24px] border border-white/12 bg-[#0b0a12]/85 p-5 backdrop-blur-xl sm:p-7"
  >
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
  </motion.div>
);

const Tower: React.FC = () => {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const pos = useTransform(scrollYProgress, floorPos);
  const intro = useTransform(scrollYProgress, (p) => smooth(clamp((p * TOTAL) / INTRO)));
  const [cur, setCur] = useState(0);
  const [showInfo, setShowInfo] = useState(false);
  useMotionValueEvent(pos, 'change', (v) => setCur(Math.round(v)));
  useMotionValueEvent(intro, 'change', (v) => setShowInfo(v > 0.92));

  // подлёт: башня издалека → крупно; фон-город отъезжает
  const scale = useTransform(intro, [0, 1], [0.3, 1]);
  // высота этажа с плитой — CSS-переменная --fh (на телефоне ниже); лобби (внизу стопки) в центре при pos = 0
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
  // верх стопки привязан к центру экрана; сдвигаем так, чтобы в центре был этаж pos (лобби — нижний в стопке)
  // на подлёте видна вся башня (центр — середина стопки), к концу подлёта камера опускается к лобби
  const stackY = useTransform([pos, floorH, intro] as MotionValue<number>[], ([v, fh, it]: number[]) => {
    const at = (N - 1) / 2 + (v - (N - 1) / 2) * it;
    return -(N - 0.5 - at) * fh;
  });
  const bgScale = useTransform(intro, [0, 1], [1.08, 1.2]);
  const bgY = useTransform(scrollYProgress, [0, 1], ['0%', '-10%']);
  const titleOpacity = useTransform(intro, [0, 0.6], [1, 0]);
  const titleY = useTransform(intro, [0, 0.6], [0, -60]);

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
    window.scrollTo({ top: top + (span * (INTRO + i + 0.2)) / TOTAL, behavior: 'smooth' });
  };

  return (
    <section ref={ref} className="relative" style={{ height: `${TOTAL * 100}vh` }}>
      <div className="sticky top-0 h-[100svh] overflow-hidden [--fh:50svh] sm:[--fh:58vh]">
        {/* ночной город за башней */}
        <motion.img src={img('city')} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ scale: bgScale, y: bgY }} draggable={false} />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,6,12,.82),rgba(7,6,12,.55)_40%,rgba(7,6,12,.9))]" />

        {/* башня: стопка этажей, лобби внизу */}
        <div className="absolute inset-0" style={{ perspective: '1400px' }}>
          <motion.div className="absolute inset-0" style={{ scale, transformStyle: 'preserve-3d' }}>
            <motion.div className="absolute left-1/2 top-1/2 w-[92vw] max-w-[980px] -translate-x-1/2 lg:left-[calc(50%-190px)] lg:w-[min(62vw,980px)]" style={{ y: stackY, transformStyle: 'preserve-3d' }}>
              {/* этажи кладём снизу вверх: каждый следующий — выше на высоту этажа с плитой */}
              <div ref={stack} className="flex flex-col-reverse" style={{ transformStyle: 'preserve-3d' }}>
                {FLOORS.map((f, i) => (
                  <FloorView key={f.key} f={f} i={i} pos={pos} intro={intro} />
                ))}
              </div>
              {/* колонны по краям — читается как одно здание */}
              <div className="pointer-events-none absolute -left-[1.5%] bottom-[-40px] top-[-60px] w-[10px] bg-gradient-to-r from-[#2c2b36] to-[#15141c]" />
              <div className="pointer-events-none absolute -right-[1.5%] bottom-[-40px] top-[-60px] w-[10px] bg-gradient-to-l from-[#2c2b36] to-[#15141c]" />
            </motion.div>
          </motion.div>
        </div>

        {/* заголовок подлёта */}
        <motion.div className="pointer-events-none absolute inset-x-0 top-[9vh] z-10 px-5 text-center" style={{ opacity: titleOpacity, y: titleY }}>
          <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-lime">Москва-Сити · наша башня</div>
          <div className="mx-auto mt-4 max-w-3xl font-display text-[9vw] font-semibold leading-[0.95] tracking-[-0.04em] sm:text-[5vw]">Поднимитесь к нам на лифте</div>
          <div className="mt-4 text-[14px] text-haze">Листайте вниз</div>
        </motion.div>

        {/* табло лифта */}
        <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 sm:left-8">
          {showInfo && <Elevator cur={cur} onGo={go} />}
        </div>

        {/* карточка этажа */}
        <div className="pointer-events-none absolute bottom-4 left-4 right-4 sm:bottom-auto sm:left-auto sm:right-8 sm:top-1/2 sm:w-[380px] sm:-translate-y-1/2">
          <AnimatePresence mode="wait">{showInfo && <Info key={cur} f={FLOORS[cur]} i={cur} />}</AnimatePresence>
        </div>
      </div>
    </section>
  );
};

export default Tower;
