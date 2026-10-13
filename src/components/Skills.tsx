import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, animate, motion, useInView, useMotionValue, useSpring } from 'motion/react';
import { finePointer } from '../lib/smooth';
import { Eyebrow, Reveal, SplitReveal, auroraLetter } from './ui';

// Плитка с «прожектором» за курсором
const Tile: React.FC<{ className?: string; title: string; text: string; children: React.ReactNode; tag: string }> = ({ className = '', title, text, children, tag }) => {
  const ref = useRef<HTMLDivElement>(null);
  const move = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - r.left}px`);
    el.style.setProperty('--my', `${e.clientY - r.top}px`);
  };
  return (
    <div
      ref={ref}
      onPointerMove={move}
      className={`group relative flex flex-col overflow-hidden rounded-[28px] border border-white/10 bg-night/80 p-6 sm:p-7 ${className}`}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: 'radial-gradient(420px circle at var(--mx) var(--my), rgba(139,108,255,.16), transparent 60%)' }}
      />
      <div className="relative flex min-h-[190px] flex-1 items-center justify-center">{children}</div>
      <div className="relative mt-6">
        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.25em] text-lime">{tag}</div>
        <h3 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">{title}</h3>
        <p className="mt-2 max-w-md text-[14px] leading-relaxed text-haze">{text}</p>
      </div>
    </div>
  );
};

// 1. Магазин: товар «летит» в корзину, счётчик растёт
const ShopDemo: React.FC = () => {
  const [count, setCount] = useState(2);
  const [flying, setFlying] = useState<number[]>([]);
  const add = () => {
    const id = Date.now();
    setFlying((f) => [...f, id]);
    setTimeout(() => {
      setFlying((f) => f.filter((x) => x !== id));
      setCount((c) => c + 1);
    }, 700);
  };
  return (
    <div className="relative flex w-full max-w-[460px] items-center gap-5">
      <div className="relative w-[58%] rounded-3xl border border-white/10 bg-white/[0.04] p-4">
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_30%_30%,#3ee6ff,#8b6cff_55%,#1b1633)]">
          <motion.div
            className="absolute left-1/2 top-1/2 h-[64%] w-[34%] -translate-x-1/2 -translate-y-1/2 rounded-[18%] border border-white/40 bg-gradient-to-b from-white/30 to-white/5 shadow-2xl backdrop-blur"
            animate={{ rotate: [-6, 6, -6], y: ['-52%', '-46%', '-52%'] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
        <div className="mt-3 flex items-end justify-between">
          <div>
            <div className="text-[13px] font-semibold">Смартфон Nova</div>
            <div className="font-display text-lg font-semibold">89 990 ₽</div>
          </div>
          <button onClick={add} className="rounded-full bg-lime px-4 py-2 text-[12px] font-bold text-void transition-transform active:scale-90">
            В корзину
          </button>
        </div>
        <AnimatePresence>
          {flying.map((id) => (
            <motion.span
              key={id}
              className="absolute bottom-6 right-8 z-10 h-4 w-4 rounded-full bg-lime shadow-[0_0_20px_#c8ff4d]"
              initial={{ x: 0, y: 0, scale: 1 }}
              animate={{ x: [0, 60, 150], y: [0, -120, -40], scale: [1, 1.2, 0.4] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7, ease: 'easeInOut' }}
            />
          ))}
        </AnimatePresence>
      </div>
      <div className="flex flex-1 flex-col items-center gap-3">
        <motion.div key={count} initial={{ scale: 1.35 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 15 }} className="relative grid h-20 w-20 place-items-center rounded-3xl border border-white/15 bg-white/[0.05]">
          <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
            <path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8Z" />
            <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
          </svg>
          <span className="absolute -right-2 -top-2 grid h-7 min-w-7 place-items-center rounded-full bg-rose px-1.5 text-[12px] font-bold text-white">{count}</span>
        </motion.div>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-haze">Нажмите «В корзину»</span>
      </div>
    </div>
  );
};

// 2. 3D-куб, крутится сам и тянется за курсором
const CubeDemo: React.FC = () => {
  const rx = useSpring(useMotionValue(-22), { stiffness: 80, damping: 14 });
  const ry = useSpring(useMotionValue(35), { stiffness: 80, damping: 14 });
  const box = useRef<HTMLDivElement>(null);
  const auto = useRef(35);
  const hovering = useRef(false);
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      if (!hovering.current) {
        auto.current += 0.4;
        ry.set(auto.current);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [ry]);
  const faces = [
    { t: 'rotateY(0deg)', c: 'from-violet to-cyan' },
    { t: 'rotateY(90deg)', c: 'from-cyan to-lime' },
    { t: 'rotateY(180deg)', c: 'from-rose to-violet' },
    { t: 'rotateY(-90deg)', c: 'from-lime to-cyan' },
    { t: 'rotateX(90deg)', c: 'from-violet to-rose' },
    { t: 'rotateX(-90deg)', c: 'from-cyan to-violet' },
  ];
  return (
    <div
      ref={box}
      className="grid h-full w-full place-items-center"
      style={{ perspective: 700 }}
      onPointerMove={(e) => {
        if (!finePointer() || !box.current) return;
        hovering.current = true;
        const r = box.current.getBoundingClientRect();
        ry.set(auto.current + ((e.clientX - r.left) / r.width - 0.5) * 140);
        rx.set(-22 - ((e.clientY - r.top) / r.height - 0.5) * 90);
      }}
      onPointerLeave={() => {
        hovering.current = false;
        rx.set(-22);
      }}
    >
      <motion.div className="relative h-24 w-24" style={{ transformStyle: 'preserve-3d', rotateX: rx, rotateY: ry }}>
        {faces.map((f, i) => (
          <div
            key={i}
            className={`absolute inset-0 rounded-xl border border-white/30 bg-gradient-to-br ${f.c} opacity-90`}
            style={{ transform: `${f.t} translateZ(48px)`, backfaceVisibility: 'hidden' }}
          />
        ))}
      </motion.div>
    </div>
  );
};

// 3. Буквы разбегаются от курсора
const Letter: React.FC<{ ch: string; mouse: React.MutableRefObject<{ x: number; y: number } | null>; style?: React.CSSProperties }> = ({ ch, mouse, style }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const x = useSpring(0, { stiffness: 200, damping: 12 });
  const y = useSpring(0, { stiffness: 200, damping: 12 });
  const r = useSpring(0, { stiffness: 200, damping: 12 });
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const m = mouse.current;
      const el = ref.current;
      if (el) {
        if (m) {
          const b = el.getBoundingClientRect();
          const dx = b.left + b.width / 2 - m.x;
          const dy = b.top + b.height / 2 - m.y;
          const d = Math.hypot(dx, dy);
          const f = Math.max(0, 1 - d / 120);
          x.set((dx / (d || 1)) * f * 38);
          y.set((dy / (d || 1)) * f * 38);
          r.set(f * (dx > 0 ? 25 : -25));
        } else {
          x.set(0);
          y.set(0);
          r.set(0);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [mouse, x, y, r]);
  return (
    <motion.span ref={ref} className="inline-block" style={{ ...style, x, y, rotate: r }}>
      {ch}
    </motion.span>
  );
};
const MotionDemo: React.FC = () => {
  const mouse = useRef<{ x: number; y: number } | null>(null);
  return (
    <div
      className="grid h-full w-full place-items-center"
      onPointerMove={(e) => (mouse.current = { x: e.clientX, y: e.clientY })}
      onPointerLeave={() => (mouse.current = null)}
    >
      <div className="select-none text-center font-display text-[13vw] font-semibold leading-none tracking-tight sm:text-6xl">
        {[...'живое'].map((c, i) => (
          <Letter key={i} ch={c} mouse={mouse} style={auroraLetter(i, 5)} />
        ))}
        <div className="mt-3 font-mono text-[10px] font-normal uppercase tracking-[0.25em] text-haze">проведите курсором</div>
      </div>
    </div>
  );
};

// 4. Telegram: сообщения бота появляются по кругу
const MESSAGES = [
  { me: false, t: 'Здравствуйте! Хочу iPhone 17 Pro' },
  { me: true, t: 'Отличный выбор! Цвет и память?' },
  { me: false, t: 'Синий, 256 ГБ 💙' },
  { me: true, t: '✅ Заказ №1042 оформлен' },
];
const TelegramDemo: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: '-20% 0px' });
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const t = setInterval(() => setN((v) => (v + 1) % (MESSAGES.length + 2)), 1100);
    return () => clearInterval(t);
  }, [inView]);
  return (
    <div ref={ref} className="w-full max-w-[250px] rounded-[30px] border border-white/10 bg-[#17212b] p-3 shadow-2xl">
      <div className="mb-3 flex items-center gap-2 border-b border-white/10 pb-2.5">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-cyan to-violet text-[12px] font-bold">М</span>
        <div className="leading-tight">
          <div className="text-[13px] font-semibold">Магазин · бот</div>
          <div className="text-[10px] text-cyan">онлайн</div>
        </div>
      </div>
      <div className="flex h-[150px] flex-col justify-end gap-1.5">
        <AnimatePresence initial={false}>
          {MESSAGES.slice(0, Math.min(n, MESSAGES.length)).map((m, i) => (
            <motion.div
              key={i}
              layout
              initial={{ opacity: 0, y: 12, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              className={`max-w-[85%] rounded-2xl px-3 py-1.5 text-[12px] ${m.me ? 'self-end rounded-br-md bg-[#2b5278]' : 'self-start rounded-bl-md bg-[#232e3c]'}`}
            >
              {m.t}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

// 5. Админка: столбики растут, число считается
const AdminDemo: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-20% 0px' });
  const [total, setTotal] = useState(0);
  const bars = [38, 52, 44, 70, 58, 86, 74, 95];
  useEffect(() => {
    if (!inView) return;
    const c = animate(0, 1284, { duration: 2, ease: [0.16, 1, 0.3, 1], onUpdate: (v) => setTotal(Math.round(v)) });
    return () => c.stop();
  }, [inView]);
  return (
    <div ref={ref} className="w-full max-w-[320px] rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-haze">Заказы за месяц</span>
        <span className="font-mono text-[10px] text-lime">+24%</span>
      </div>
      <div className="mt-1 font-display text-3xl font-semibold">{total.toLocaleString('ru-RU')}</div>
      <div className="mt-4 flex h-24 items-end gap-1.5">
        {bars.map((b, i) => (
          <motion.div
            key={i}
            className="group relative flex-1 rounded-t-md bg-gradient-to-t from-violet/70 to-cyan"
            initial={{ height: 0 }}
            animate={inView ? { height: `${b}%` } : {}}
            transition={{ delay: 0.1 + i * 0.07, duration: 1, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="absolute -top-6 left-1/2 -translate-x-1/2 rounded bg-white px-1.5 py-0.5 font-mono text-[9px] font-bold text-void opacity-0 transition-opacity group-hover:opacity-100">{b * 13}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// 6. Адаптив: одна и та же страница перестраивается под компьютер, планшет и телефон
const WIDTHS = [300, 200, 112];
const ResponsiveDemo: React.FC = () => {
  const [k, setK] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setK((v) => (v + 1) % WIDTHS.length), 1800);
    return () => clearInterval(t);
  }, []);
  const narrow = k === 2;
  return (
    <motion.div
      className="rounded-2xl border-2 border-white/20 bg-white/[0.03] p-2.5"
      animate={{ width: WIDTHS[k] }}
      transition={{ type: 'spring', stiffness: 120, damping: 18 }}
    >
      <div className="mb-2 h-2.5 w-1/3 rounded-full bg-white/30" />
      <motion.div layout className="mb-2 h-14 rounded-lg bg-gradient-to-r from-violet to-cyan" />
      <motion.div layout className={`grid gap-1.5 ${narrow ? 'grid-cols-1' : k === 1 ? 'grid-cols-2' : 'grid-cols-3'}`}>
        {[0, 1, 2].map((i) => (
          <motion.div layout key={i} className="h-9 rounded-md bg-white/15" />
        ))}
      </motion.div>
    </motion.div>
  );
};

const Skills: React.FC = () => (
  <section id="skills" className="relative mx-auto max-w-[1500px] px-5 py-28 sm:px-10 sm:py-40">
    <Eyebrow n="02">Возможности</Eyebrow>
    <h2 className="mt-8 max-w-5xl font-display text-[12vw] font-semibold leading-[0.9] tracking-[-0.04em] sm:text-[8vw] lg:text-[5.6vw]">
      <SplitReveal text="Не просто красиво —" /> <span className="text-outline">
        <SplitReveal text="работает" delay={0.3} />
      </span>
    </h2>
    <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Reveal className="md:col-span-2">
        <Tile tag="Продажи" title="Интернет-магазины" text="Каталог, корзина, заказы прямо в Telegram и админка, где цены и товары меняются без программиста." className="h-full">
          <ShopDemo />
        </Tile>
      </Reveal>
      <Reveal delay={0.08}>
        <Tile tag="WebGL" title="3D прямо в браузере" text="Модели, планеты, товары, которые можно покрутить. Без плагинов и установки." className="h-full">
          <CubeDemo />
        </Tile>
      </Reveal>
      <Reveal>
        <Tile tag="Motion" title="Анимации с характером" text="Интерфейс отвечает на каждое движение — поэтому на сайте хочется задержаться." className="h-full">
          <MotionDemo />
        </Tile>
      </Reveal>
      <Reveal delay={0.08}>
        <Tile tag="Telegram" title="Мини-приложения и боты" text="Магазин внутри Telegram и заявки, которые сразу падают менеджеру в чат." className="h-full">
          <TelegramDemo />
        </Tile>
      </Reveal>
      <Reveal delay={0.16}>
        <Tile tag="Данные" title="Админ-панели" text="Заказы, остатки, статистика посещений и импорт прайсов — всё в одном месте." className="h-full">
          <AdminDemo />
        </Tile>
      </Reveal>
      <Reveal className="md:col-span-2 lg:col-span-3">
        <Tile tag="Адаптив" title="Идеально на любом экране" text="Компьютер, планшет, телефон, MacBook и встроенный браузер Telegram — вёрстка подстраивается под каждый." className="h-full">
          <div className="flex w-full flex-wrap items-center justify-center gap-10">
            <ResponsiveDemo />
            <div className="flex gap-3 font-mono text-[10px] uppercase tracking-[0.2em] text-haze">
              <span>Компьютер</span>
              <span className="text-white/20">→</span>
              <span>Планшет</span>
              <span className="text-white/20">→</span>
              <span>Телефон</span>
            </div>
          </div>
        </Tile>
      </Reveal>
    </div>
  </section>
);

export default Skills;
