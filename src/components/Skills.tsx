import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, animate, motion, useInView, useMotionValue, useSpring } from 'motion/react';
import { finePointer } from '../lib/smooth';
import { Rise, Up } from './ui';

const base = import.meta.env.BASE_URL;

// ——— живые демо: каждое показывает умение в деле ———

// Магазин: товар «летит» в корзину, счётчик растёт
const ShopDemo: React.FC = () => {
  const [count, setCount] = useState(2);
  const [flying, setFlying] = useState<number[]>([]);
  const add = () => {
    const id = Date.now();
    setFlying((f) => [...f, id]);
    setTimeout(() => {
      setFlying((f) => f.filter((x) => x !== id));
      setCount((c) => c + 1);
    }, 650);
  };
  return (
    <div className="relative flex w-full max-w-[440px] items-end gap-4 sm:gap-6">
      <div className="relative w-[78%] bg-night p-3 sm:w-[62%]">
        <img src={`${base}works/apple-favorite-mobile.webp`} alt="" className="aspect-[4/3] w-full object-cover object-top" draggable={false} />
        <div className="mt-3 flex items-end justify-between gap-2">
          <div>
            <div className="text-[13px] text-haze">iPhone 17 Pro</div>
            <div className="whitespace-nowrap text-[18px] font-semibold tabular-nums">129 990 ₽</div>
          </div>
          <button onClick={add} className="whitespace-nowrap rounded-full bg-lime px-4 py-2 text-[13px] font-semibold text-void transition-transform active:scale-90">
            В корзину
          </button>
        </div>
        <AnimatePresence>
          {flying.map((id) => (
            <motion.span
              key={id}
              className="absolute bottom-5 right-6 z-10 h-3.5 w-3.5 rounded-full bg-lime"
              initial={{ x: 0, y: 0, scale: 1 }}
              animate={{ x: [0, 70, 150], y: [0, -110, -10], scale: [1, 1.1, 0.5] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.65, ease: 'easeInOut' }}
            />
          ))}
        </AnimatePresence>
      </div>
      <motion.div
        key={count}
        initial={{ scale: 1.25 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 15 }}
        className="relative mb-2 grid h-16 w-16 place-items-center rounded-full bg-night"
      >
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8Z" />
          <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
        </svg>
        <span className="absolute -right-1 -top-1 grid h-6 min-w-6 place-items-center rounded-full bg-lime px-1.5 text-[12px] font-bold text-void tabular-nums">{count}</span>
      </motion.div>
    </div>
  );
};

// 3D: каркасный глобус крутится сам и тянется за курсором
const GlobeDemo: React.FC = () => {
  const rx = useSpring(useMotionValue(-22), { stiffness: 80, damping: 14 });
  const ry = useSpring(useMotionValue(35), { stiffness: 80, damping: 14 });
  const box = useRef<HTMLDivElement>(null);
  const auto = useRef(35);
  const hovering = useRef(false);
  const inView = useInView(box);
  useEffect(() => {
    if (!inView) return;
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
  }, [ry, inView]);
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
      <motion.div className="relative h-44 w-44" style={{ transformStyle: 'preserve-3d', rotateX: rx, rotateY: ry }}>
        {Array.from({ length: 8 }, (_, i) => (
          <div key={`m${i}`} className="absolute inset-0 rounded-full border border-mist/45" style={{ transform: `rotateY(${i * 22.5}deg)` }} />
        ))}
        {[-0.66, -0.33, 0, 0.33, 0.66].map((k) => (
          <div
            key={`p${k}`}
            className={`absolute inset-0 rounded-full border ${k === 0 ? 'border-lime' : 'border-mist/30'}`}
            style={{ transform: `rotateX(90deg) translateZ(${k * 88}px) scale(${Math.sqrt(1 - k * k)})` }}
          />
        ))}
      </motion.div>
    </div>
  );
};

// Анимация: буквы разбегаются от курсора (считаем только когда мышь над демо)
type Pointer = { x: number; y: number } | null;
const Letter: React.FC<{ ch: string; subs: React.MutableRefObject<Set<(m: Pointer) => void>> }> = ({ ch, subs }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const x = useSpring(0, { stiffness: 200, damping: 12 });
  const y = useSpring(0, { stiffness: 200, damping: 12 });
  const r = useSpring(0, { stiffness: 200, damping: 12 });
  useEffect(() => {
    const fn = (m: Pointer) => {
      const el = ref.current;
      if (!el || !m) {
        x.set(0);
        y.set(0);
        r.set(0);
        return;
      }
      const b = el.getBoundingClientRect();
      const dx = b.left + b.width / 2 - m.x;
      const dy = b.top + b.height / 2 - m.y;
      const d = Math.hypot(dx, dy);
      const f = Math.max(0, 1 - d / 130);
      x.set((dx / (d || 1)) * f * 42);
      y.set((dy / (d || 1)) * f * 42);
      r.set(f * (dx > 0 ? 25 : -25));
    };
    const set = subs.current;
    set.add(fn);
    return () => {
      set.delete(fn);
    };
  }, [subs, x, y, r]);
  return (
    <motion.span ref={ref} className="inline-block" style={{ x, y, rotate: r }}>
      {ch}
    </motion.span>
  );
};
const MotionDemo: React.FC = () => {
  const subs = useRef(new Set<(m: Pointer) => void>());
  const send = (m: Pointer) => subs.current.forEach((fn) => fn(m));
  return (
    <div className="grid h-full w-full place-items-center" onPointerMove={(e) => send({ x: e.clientX, y: e.clientY })} onPointerLeave={() => send(null)}>
      <div className="select-none text-center">
        <div className="font-head text-[18vw] font-semibold leading-none tracking-[-0.05em] sm:text-[120px]">
          {[...'живое'].map((c, i) => (
            <Letter key={i} ch={c} subs={subs} />
          ))}
        </div>
        <p className="mt-4 text-[14px] text-haze">Проведите курсором по слову</p>
      </div>
    </div>
  );
};

// Telegram: переписка с ботом магазина (настоящие цвета Telegram — это кусок продукта)
const MESSAGES = [
  { me: false, t: 'Здравствуйте! Хочу iPhone 17 Pro' },
  { me: true, t: 'Отличный выбор! Цвет и память?' },
  { me: false, t: 'Синий, 256 ГБ' },
  { me: true, t: 'Заказ №1042 оформлен' },
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
    <div ref={ref} data-ui className="w-full max-w-[290px] rounded-[22px] bg-[#17212b] p-3.5">
      <div className="mb-3 flex items-center gap-2.5 pb-2">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-[#2b5278] text-[13px] font-bold">М</span>
        <div className="leading-tight">
          <div className="text-[14px] font-semibold">Магазин</div>
          <div className="text-[12px] text-[#6ab3f3]">бот</div>
        </div>
      </div>
      <div className="flex h-[170px] flex-col justify-end gap-1.5">
        <AnimatePresence initial={false}>
          {MESSAGES.slice(0, Math.min(n, MESSAGES.length)).map((m, i) => (
            <motion.div
              key={i}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`max-w-[85%] rounded-2xl px-3 py-1.5 text-[13px] ${m.me ? 'self-end rounded-br-md bg-[#2b5278]' : 'self-start rounded-bl-md bg-[#232e3c]'}`}
            >
              {m.t}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

// Админка: столбики растут, число считается
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
    <div ref={ref} data-ui className="w-full max-w-[340px] bg-night p-5">
      <div className="flex items-baseline justify-between text-[13px] text-haze">
        <span>Заказы за месяц</span>
        <span className="text-lime">+24%</span>
      </div>
      <div className="mt-1 text-[34px] font-semibold tabular-nums tracking-[-0.02em]">{total.toLocaleString('ru-RU')}</div>
      <div className="mt-4 flex h-28 items-end gap-1.5">
        {bars.map((b, i) => (
          <motion.div
            key={i}
            className={`flex-1 ${i === bars.length - 1 ? 'bg-lime' : 'bg-mist/25'}`}
            initial={{ height: 0 }}
            animate={inView ? { height: `${b}%` } : {}}
            transition={{ delay: 0.1 + i * 0.07, duration: 1, ease: [0.16, 1, 0.3, 1] }}
          />
        ))}
      </div>
    </div>
  );
};

// Адаптив: одна и та же страница перестраивается под компьютер, планшет и телефон
const WIDTHS = [320, 220, 120];
const ResponsiveDemo: React.FC = () => {
  const [k, setK] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const inView = useInView(box);
  useEffect(() => {
    if (!inView) return;
    const t = setInterval(() => setK((v) => (v + 1) % WIDTHS.length), 1800);
    return () => clearInterval(t);
  }, [inView]);
  return (
    <div className="flex flex-col items-center gap-4">
      <motion.div ref={box} className="bg-night p-2.5" animate={{ width: WIDTHS[k] }} transition={{ type: 'spring', stiffness: 120, damping: 18 }}>
        <div className="mb-2 h-2.5 w-1/3 bg-mist/35" />
        <motion.div layout className="mb-2 h-14 bg-lime/80" />
        <motion.div layout className={`grid gap-1.5 ${k === 2 ? 'grid-cols-1' : k === 1 ? 'grid-cols-2' : 'grid-cols-3'}`}>
          {[0, 1, 2].map((i) => (
            <motion.div layout key={i} className="h-9 bg-mist/15" />
          ))}
        </motion.div>
      </motion.div>
      <p className="text-[14px] text-haze">{['Компьютер', 'Планшет', 'Телефон'][k]}</p>
    </div>
  );
};

const ITEMS = [
  { title: 'Интернет-магазины', text: 'Каталог, корзина, заказы прямо в Telegram и админка, где цены и товары меняются без программиста.', demo: <ShopDemo /> },
  { title: '3D в браузере', text: 'Модели, планеты и товары, которые можно покрутить. Без плагинов и установки.', demo: <GlobeDemo /> },
  { title: 'Анимации', text: 'Интерфейс отвечает на каждое движение — на таком сайте хочется задержаться.', demo: <MotionDemo /> },
  { title: 'Telegram', text: 'Магазин внутри Telegram и заявки, которые сразу приходят менеджеру в чат.', demo: <TelegramDemo /> },
  { title: 'Админ-панели', text: 'Заказы, остатки, статистика посещений и импорт прайсов — в одном месте.', demo: <AdminDemo /> },
  { title: 'Любой экран', text: 'Компьютер, телефон и встроенный браузер Telegram — вёрстка подстраивается под каждый.', demo: <ResponsiveDemo /> },
];

// «Что мы делаем»: слева список, справа — живое демо выбранного пункта (на телефоне демо раскрывается под пунктом)
const Skills: React.FC = () => {
  const [cur, setCur] = useState(0);
  return (
    <section id="skills" className="relative mx-auto max-w-[1500px] px-5 py-32 sm:px-10 sm:py-48">
      <div className="grid gap-x-10 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <h2 className="font-head text-[11vw] font-semibold leading-[0.95] tracking-[-0.045em] sm:text-[7vw] lg:text-[4.6vw]">
            <Rise text="Не только красиво —" />
            <br />
            <Rise text="ещё и работает" delay={0.12} />
          </h2>
          <ul className="mt-14">
            {ITEMS.map((it, i) => {
              const on = cur === i;
              return (
                <Up as="li" key={it.title} delay={i * 0.05}>
                  <button
                    onClick={() => setCur(i)}
                    onPointerEnter={() => finePointer() && setCur(i)}
                    aria-expanded={on}
                    className="group block w-full py-4 text-left"
                  >
                    <span className={`block font-head text-[8vw] font-semibold leading-[1.05] tracking-[-0.035em] transition-colors duration-300 sm:text-[44px] ${on ? 'text-mist' : 'text-mist/30 group-hover:text-mist/60'}`}>
                      {it.title}
                    </span>
                    <span className={`mt-2 block max-w-md text-[16px] leading-[1.55] text-haze transition-opacity duration-300 ${on ? 'opacity-100' : 'opacity-0 max-lg:hidden'}`}>{it.text}</span>
                  </button>
                  {/* телефон: демо прямо под пунктом */}
                  {on && <div className="grid min-h-[300px] place-items-center bg-night/60 p-5 lg:hidden">{it.demo}</div>}
                </Up>
              );
            })}
          </ul>
        </div>
        {/* компьютер: одно большое демо, прилипает при прокрутке */}
        <div className="hidden lg:col-span-6 lg:block">
          <div className="sticky top-28 mt-[9.5vw] grid h-[560px] place-items-center bg-night/60 p-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={cur}
                className="grid h-full w-full place-items-center"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              >
                {ITEMS[cur].demo}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Skills;
