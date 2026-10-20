import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { Rise, Up } from './ui';

// «Пульт сайта»: пишете задачу словами — «код» печатается в терминале, и мини-сайт справа сразу меняется.
type Cmd = 'gravity' | 'recolor' | 'confetti' | 'matrix' | 'runaway' | 'tilt' | 'night' | 'reset';

const COMMANDS: { id: Cmd; label: string; code: string[] }[] = [
  { id: 'gravity', label: 'включи гравитацию', code: ['import Matter from "matter-js"', 'engine.gravity.y = 1', 'blocks.forEach(toBody) // всё падает', '✓ Хватайте блоки и бросайте!'] },
  { id: 'recolor', label: 'перекрась сайт', code: ['const palette = pick(palettes)', 'site.style.setTheme(palette)', '✓ Новый цвет — за секунду'] },
  { id: 'confetti', label: 'запусти конфетти', code: ['import confetti from "canvas-confetti"', 'confetti({ particleCount: 180 })', '✓ Праздник!'] },
  { id: 'matrix', label: 'включи матрицу', code: ['const rain = new MatrixRain(canvas)', 'rain.start({ speed: 1.4 })', '✓ Добро пожаловать в Матрицу'] },
  { id: 'runaway', label: 'сделай кнопку-беглеца', code: ['button.onPointerNear = flee', 'flee = () => moveAway(cursor, 120)', '✓ Попробуйте нажать «Заказать» :)'] },
  { id: 'tilt', label: 'сделай 3D', code: ['site.style.perspective = "900px"', 'onMouseMove(tilt(site, 14))', '✓ Сайт поворачивается за мышью'] },
  { id: 'night', label: 'ночной режим', code: ['const dark = !site.dark', 'site.classList.toggle("dark", dark)', '✓ Глазам приятнее'] },
  { id: 'reset', label: 'верни как было', code: ['history.restore()', '✓ Всё на месте'] },
];

const KEYWORDS: [RegExp, Cmd][] = [
  [/гравит|упад|физик/i, 'gravity'],
  [/цвет|перекрас|красн|син|зелён|зелен|палитр/i, 'recolor'],
  [/конфет|салют|праздн/i, 'confetti'],
  [/матриц|хакер|код дожд/i, 'matrix'],
  [/беглец|убег|убега|кнопк/i, 'runaway'],
  [/3d|3д|объ[её]м|наклон|поворот/i, 'tilt'],
  [/ноч|т[её]мн|dark/i, 'night'],
  [/верн|сброс|обратно|отмен/i, 'reset'],
];

const PALETTES = [
  { bg: '#fff7ec', ink: '#2a160c', accent: '#ff5a1f', card: '#ffe3cc' },
  { bg: '#eef6ff', ink: '#0b1f3a', accent: '#2f6bff', card: '#d8e7ff' },
  { bg: '#f1ffe8', ink: '#123015', accent: '#2fb344', card: '#d9f7cc' },
  { bg: '#fff0f6', ink: '#3a0b22', accent: '#e8338a', card: '#ffd6ea' },
  { bg: '#f6f1ff', ink: '#1e0f3d', accent: '#7a4dff', card: '#e6dcff' },
];
const DEFAULT = { bg: '#f4f1ea', ink: '#17150f', accent: '#ff5a1f', card: '#e8e2d6' };

interface Line {
  id: number;
  text: string;
  kind: 'ask' | 'code' | 'ok' | 'info';
}

const Console: React.FC = () => {
  const [lines, setLines] = useState<Line[]>([{ id: 0, text: 'Выберите задачу или напишите свою ↓', kind: 'info' }]);
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState('');
  const [theme, setTheme] = useState(DEFAULT);
  const [night, setNight] = useState(false);
  const [tilt, setTilt] = useState(false);
  const [runaway, setRunaway] = useState(false);
  const [matrix, setMatrix] = useState(false);
  const [gravity, setGravity] = useState(false);
  const [btnPos, setBtnPos] = useState({ x: 0, y: 0 });
  const [rot, setRot] = useState({ x: 0, y: 0 });
  const site = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const term = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);

  useEffect(() => {
    term.current?.scrollTo({ top: term.current.scrollHeight, behavior: 'smooth' });
  }, [lines]);

  const push = (kind: Line["kind"]) => {
    const id = nextId.current++;
    setLines((l) => [...l.slice(-14), { id, text: '', kind }]);
    return id;
  };
  const typeLine = (text: string, kind: Line['kind']) =>
    new Promise<void>((res) => {
      const id = push(kind);
      let i = 0;
      const t = setInterval(() => {
        i += 2;
        setLines((l) => l.map((x) => (x.id === id ? { ...x, text: text.slice(0, i) } : x)));
        if (i >= text.length) {
          clearInterval(t);
          res();
        }
      }, 14);
    });

  const run = async (cmd: Cmd, asked: string) => {
    if (typing) return;
    setTyping(true);
    await typeLine(`› ${asked}`, 'ask');
    await typeLine('◇ Разбираю задачу…', 'info');
    const c = COMMANDS.find((x) => x.id === cmd)!;
    for (const l of c.code) await typeLine(l.startsWith('✓') ? l : `+ ${l}`, l.startsWith('✓') ? 'ok' : 'code');
    apply(cmd);
    setTyping(false);
  };

  const apply = (cmd: Cmd) => {
    if (cmd === 'recolor') setTheme(PALETTES[(Math.random() * PALETTES.length) | 0]);
    if (cmd === 'night') setNight((n) => !n);
    if (cmd === 'tilt') setTilt(true);
    if (cmd === 'runaway') setRunaway(true);
    if (cmd === 'matrix') {
      setMatrix(true);
      setTimeout(() => setMatrix(false), 6500);
    }
    if (cmd === 'confetti') {
      const r = site.current?.getBoundingClientRect();
      if (r) confetti({ particleCount: 180, spread: 100, origin: { x: (r.left + r.width / 2) / innerWidth, y: (r.top + r.height / 3) / innerHeight }, colors: [theme.accent, '#c8ff4d', '#3ee6ff', '#ff5fae'] });
    }
    if (cmd === 'gravity') {
      setBtnPos({ x: 0, y: 0 });
      setRot({ x: 0, y: 0 });
      setTimeout(() => setGravity(true), 350);
    }
    if (cmd === 'reset') {
      setTheme(DEFAULT);
      setNight(false);
      setTilt(false);
      setRunaway(false);
      setMatrix(false);
      setGravity(false);
      setBtnPos({ x: 0, y: 0 });
      setRot({ x: 0, y: 0 });
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = input.trim();
    if (!q || typing) return;
    setInput('');
    const hit = KEYWORDS.find(([re]) => re.test(q));
    if (hit) run(hit[1], q);
    else {
      (async () => {
        setTyping(true);
        await typeLine(`› ${q}`, 'ask');
        await typeLine('◇ Такое сделаем на живом проекте. Здесь — только команды выше.', 'info');
        setTyping(false);
      })();
    }
  };

  // кнопка-беглец и 3D-наклон
  const onMove = (e: React.PointerEvent) => {
    const s = site.current;
    if (!s) return;
    const r = s.getBoundingClientRect();
    if (tilt && !gravity) setRot({ x: -((e.clientY - r.top) / r.height - 0.5) * 16, y: ((e.clientX - r.left) / r.width - 0.5) * 20 });
    if (runaway && !gravity && btn.current) {
      const b = btn.current.getBoundingClientRect();
      const dx = b.left + b.width / 2 - e.clientX;
      const dy = b.top + b.height / 2 - e.clientY;
      const d = Math.hypot(dx, dy);
      if (d < 110) {
        const nx = btnPos.x + (dx / (d || 1)) * 90;
        const ny = btnPos.y + (dy / (d || 1)) * 60;
        // не убегаем за пределы мини-сайта — отскакиваем к центру
        const maxX = r.width / 2 - 80;
        const maxY = r.height / 3;
        setBtnPos({ x: Math.abs(nx) > maxX ? -Math.sign(nx) * maxX * 0.4 : nx, y: Math.abs(ny) > maxY ? -Math.sign(ny) * maxY * 0.4 : ny });
      }
    }
  };

  const ink = night ? '#eeebe5' : theme.ink;
  const bg = night ? '#121214' : theme.bg;
  const card = night ? '#1d1d20' : theme.card;

  return (
    <section id="console" className="relative mx-auto max-w-[1500px] px-5 py-32 sm:px-10 sm:py-48">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="font-head text-[11vw] font-semibold leading-[0.95] tracking-[-0.045em] sm:text-[7vw] lg:text-[4.6vw]">
          <Rise text="Скажите словами —" />
          <br />
          <Rise text="сайт поменяется" delay={0.12} />
        </h2>
        <Up as="p" delay={0.2} className="mx-auto mt-6 max-w-xl text-[17px] leading-[1.55] text-haze">
          Так мы и работаем: задачу ставите обычными словами, а сайт меняется на глазах. Попробуйте — нажмите любую команду.
        </Up>
      </div>

      <div className="mt-16 grid gap-6 lg:grid-cols-[1fr_1.25fr]">
        {/* команды и терминал */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {COMMANDS.map((c) => (
              <button
                key={c.id}
                onClick={() => run(c.id, c.label)}
                disabled={typing}
                className={`rounded-full px-4 py-2.5 text-[14px] font-medium transition-colors disabled:opacity-50 ${c.id === 'reset' ? 'text-haze hover:text-mist' : 'bg-night hover:bg-lime hover:text-void'}`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="flex min-h-[320px] flex-1 flex-col overflow-hidden bg-night">
            <div ref={term} className="no-scrollbar flex-1 space-y-1.5 overflow-y-auto p-4 font-mono text-[13px] leading-relaxed">
              {lines.map((l) => (
                <div key={l.id} className={l.kind === 'ask' ? 'text-mist' : l.kind === 'ok' ? 'text-lime' : l.kind === 'code' ? 'text-mist/70' : 'text-haze'}>
                  {l.text}
                  {typing && l.id === nextId.current - 1 && <span className="ml-0.5 inline-block h-4 w-2 translate-y-0.5 animate-pulse bg-lime" />}
                </div>
              ))}
            </div>
            <form onSubmit={submit} className="flex items-center gap-2 bg-black/30 p-3">
              <span className="font-mono text-lime">›</span>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="напишите задачу: «перекрась в синий», «включи гравитацию»…"
                className="flex-1 bg-transparent font-mono text-[13px] text-mist placeholder-white/25 outline-none"
              />
              <button disabled={typing} className="rounded-full bg-lime px-3 py-1.5 font-mono text-[12px] font-bold text-void disabled:opacity-40">
                ↵
              </button>
            </form>
          </div>
        </div>

        {/* мини-сайт */}
        {/* наклон в 3D включается командой «сделай 3D» */}
        <div onPointerMove={onMove} onPointerLeave={() => setRot({ x: 0, y: 0 })} style={{ perspective: 900 }}>
          <motion.div
            ref={site}
            animate={{ rotateX: rot.x, rotateY: rot.y }}
            transition={{ type: 'spring', stiffness: 120, damping: 16 }}
            className="relative overflow-hidden rounded-[6px]"
            style={{ transformStyle: 'preserve-3d', background: bg, color: ink, transition: 'background .6s, color .6s' }}
          >
            <MiniSite gravity={gravity} accent={theme.accent} card={card} ink={ink} btnRef={btn} btnPos={btnPos} />
            <AnimatePresence>{matrix && <MatrixRain key="m" />}</AnimatePresence>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

// Мини-сайт: блоки с data-phys умеют «падать» (matter-js подгружается только для этой команды)
const MiniSite: React.FC<{ gravity: boolean; accent: string; card: string; ink: string; btnRef: React.RefObject<HTMLButtonElement | null>; btnPos: { x: number; y: number } }> = ({
  gravity,
  accent,
  card,
  ink,
  btnRef,
  btnPos,
}) => {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!gravity || !box.current) return;
    let stop = () => {};
    let cancelled = false;
    import('matter-js').then((M) => {
      if (cancelled || !box.current) return;
      const root = box.current;
      const R = root.getBoundingClientRect();
      const els = [...root.querySelectorAll<HTMLElement>('[data-phys]')];
      const engine = M.Engine.create({ gravity: { x: 0, y: 1 } });
      const items = els.map((el) => {
        const r = el.getBoundingClientRect();
        const cx = r.left - R.left + r.width / 2;
        const cy = r.top - R.top + r.height / 2;
        const body = M.Bodies.rectangle(cx, cy, r.width, r.height, { chamfer: { radius: 8 }, restitution: 0.35, friction: 0.3 });
        M.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.05);
        return { el, body, cx, cy };
      });
      const W = R.width;
      const H = R.height;
      const t = 60;
      const walls = [
        M.Bodies.rectangle(W / 2, H + t / 2, W * 2, t, { isStatic: true }),
        M.Bodies.rectangle(-t / 2, H / 2, t, H * 3, { isStatic: true }),
        M.Bodies.rectangle(W + t / 2, H / 2, t, H * 3, { isStatic: true }),
      ];
      M.Composite.add(engine.world, [...items.map((i) => i.body), ...walls]);

      // перетаскивание: пружина от точки блока к пальцу/мыши
      let grab: Matter.Constraint | null = null;
      const local = (e: PointerEvent) => {
        const r = root.getBoundingClientRect();
        return { x: e.clientX - r.left, y: e.clientY - r.top };
      };
      const down = (e: PointerEvent) => {
        const p = local(e);
        const hit = M.Query.point(items.map((i) => i.body), p)[0];
        if (!hit) return;
        e.preventDefault();
        grab = M.Constraint.create({ pointA: p, bodyB: hit, pointB: { x: p.x - hit.position.x, y: p.y - hit.position.y }, stiffness: 0.12, damping: 0.08, length: 0 });
        M.Composite.add(engine.world, grab);
      };
      const move = (e: PointerEvent) => {
        if (grab) grab.pointA = local(e);
      };
      const up = () => {
        if (grab) M.Composite.remove(engine.world, grab);
        grab = null;
      };
      root.addEventListener('pointerdown', down);
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);

      let raf = 0;
      const loop = () => {
        M.Engine.update(engine, 1000 / 60);
        for (const { el, body, cx, cy } of items) el.style.transform = `translate(${body.position.x - cx}px, ${body.position.y - cy}px) rotate(${body.angle}rad)`;
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
      stop = () => {
        cancelAnimationFrame(raf);
        root.removeEventListener('pointerdown', down);
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        items.forEach(({ el }) => {
          el.style.transition = 'transform .7s cubic-bezier(.16,1,.3,1)';
          el.style.transform = '';
          setTimeout(() => (el.style.transition = ''), 750);
        });
      };
    });
    return () => {
      cancelled = true;
      stop();
    };
  }, [gravity]);

  return (
    <div ref={box} className={`relative h-[440px] select-none p-6 sm:h-[480px] sm:p-8 ${gravity ? 'touch-none' : ''}`} data-cursor={gravity ? 'Хватай' : undefined}>
      <div className="flex items-center justify-between">
        <div data-phys className="rounded-lg px-1 font-head text-lg font-bold" style={{ color: accent }}>
          ●&nbsp;Бренд
        </div>
        <div className="flex gap-4 text-[13px] font-semibold opacity-70">
          <span data-phys>Каталог</span>
          <span data-phys>О нас</span>
          <span data-phys>Контакты</span>
        </div>
      </div>
      <div data-phys className="mt-10 inline-block font-head text-[34px] font-bold leading-[1.05] sm:text-[44px]">
        Ваш сайт
      </div>
      <br />
      <div data-phys className="inline-block font-head text-[34px] font-bold leading-[1.05] sm:text-[44px]" style={{ color: accent }}>
        оживает
      </div>
      <p data-phys className="mt-3 max-w-xs text-[14px] opacity-70">
        Меняется по одной фразе — без долгих ожиданий.
      </p>
      <motion.button
        ref={btnRef}
        data-phys
        animate={{ x: btnPos.x, y: btnPos.y }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        className="mt-5 rounded-full px-6 py-3 text-[14px] font-bold text-white"
        style={{ background: accent }}
        onClick={() => confetti({ particleCount: 60, spread: 70, colors: [accent, '#c8ff4d'] })}
      >
        Заказать
      </motion.button>
      <div className="absolute inset-x-6 bottom-6 grid grid-cols-3 gap-3 sm:inset-x-8">
        {['Быстро', 'Красиво', 'Удобно'].map((t) => (
          <div key={t} data-phys className="rounded-2xl p-4 text-[13px] font-bold transition-colors duration-500" style={{ background: card, color: ink }}>
            <div className="mb-2 h-6 w-6 rounded-full" style={{ background: accent }} />
            {t}
          </div>
        ))}
      </div>
    </div>
  );
};

// «Матрица»: зелёный дождь из символов поверх мини-сайта
const MatrixRain: React.FC = () => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d')!;
    const resize = () => {
      c.width = c.offsetWidth;
      c.height = c.offsetHeight;
    };
    resize();
    const size = 16;
    const cols = Math.ceil(c.width / size);
    const drops = Array.from({ length: cols }, () => Math.random() * -40);
    const glyphs = 'アイウエオカキクケコサシスセソ0123456789МИРСАЙТОВ<>/{}';
    let raf = 0;
    let last = 0;
    const draw = (t: number) => {
      raf = requestAnimationFrame(draw);
      if (t - last < 45) return;
      last = t;
      ctx.fillStyle = 'rgba(0, 8, 2, .16)';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.font = `${size}px JetBrains Mono, monospace`;
      drops.forEach((y, i) => {
        ctx.fillStyle = Math.random() < 0.05 ? '#eaffea' : '#39ff6a';
        ctx.fillText(glyphs[(Math.random() * glyphs.length) | 0], i * size, y * size);
        drops[i] = y * size > c.height && Math.random() > 0.97 ? 0 : y + 1;
      });
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <motion.canvas ref={ref} className="pointer-events-none absolute inset-0 h-full w-full" initial={{ opacity: 0 }} animate={{ opacity: 0.92 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }} />;
};

export default Console;
