import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { PERKS, PROMOS, TEAM, type Member } from '../data';
import Chibi from './Chibi';

// «Убеги от дедлайна»: наш человечек бежит по ночному городу, прыгает через жуков и стопки ТЗ,
// пробегает под летящими дедлайнами, ловит кофе и звёзды. Очки → скидки, рекорды — в этом браузере.
type Kind = 'bug' | 'task' | 'deadline' | 'coffee' | 'star';
interface Obj {
  id: number;
  kind: Kind;
  x: number; // px от левого края поля
  w: number;
  h: number;
  y: number; // px от земли до низа объекта
  taken?: boolean;
}

const SIZES: Record<Kind, { w: number; h: number; y: number }> = {
  bug: { w: 40, h: 32, y: 0 },
  task: { w: 46, h: 66, y: 0 },
  deadline: { w: 92, h: 40, y: 150 }, // выше головы: стоя пробегаешь под ним, в прыжке — врезаешься
  coffee: { w: 34, h: 34, y: 140 },
  star: { w: 34, h: 34, y: 262 }, // только двойным прыжком
};
const GRAVITY = 2800;
const JUMP = 830; // одиночный прыжок ~125 px, двойной ~210 px
const PLAYER = { x: 70, w: 56, h: 140 }; // хитбокс вместе с большой головой

interface Rec {
  name: string;
  score: number;
  who: string;
}
const readTop = (): Rec[] => {
  try {
    return JSON.parse(localStorage.getItem('mir-run-top') || '[]');
  } catch {
    return [];
  }
};

const ObjView: React.FC<{ kind: Kind }> = ({ kind }) => {
  if (kind === 'bug')
    return (
      <svg viewBox="0 0 40 32" className="h-full w-full drop-shadow-[0_0_8px_rgba(255,95,174,.7)]" aria-hidden>
        <ellipse cx="20" cy="19" rx="13" ry="11" fill="#ff5fae" />
        <circle cx="20" cy="8" r="5" fill="#2a1630" stroke="#ff5fae" />
        <path d="M8 14 2 10M8 20H1M9 26l-6 4M32 14l6-4M32 20h7M31 26l6 4" stroke="#ece9ff" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  if (kind === 'task')
    return (
      <div className="flex h-full w-full flex-col justify-end gap-[3px]">
        {[0, 1, 2].map((i) => (
          <div key={i} className="grid flex-1 place-items-center rounded-[4px] border border-white/40 bg-[#8b6cff] font-mono text-[9px] font-bold text-white" style={{ marginLeft: i % 2 ? 3 : 0 }}>
            ТЗ
          </div>
        ))}
      </div>
    );
  if (kind === 'deadline')
    return (
      <div className="flex h-full w-full items-center justify-center gap-1 rounded-full border-2 border-[#ff5f57] bg-[#2a0d14] px-2 font-display text-[12px] font-bold uppercase text-[#ff8a84] shadow-[0_0_20px_rgba(255,95,87,.6)]">
        ⏰ дедлайн
      </div>
    );
  return <div className="grid h-full w-full place-items-center text-[26px] drop-shadow-[0_0_10px_rgba(255,214,107,.9)]">{kind === 'coffee' ? '☕' : '⭐'}</div>;
};

const RunnerGame: React.FC = () => {
  const field = useRef<HTMLDivElement>(null);
  const playerEl = useRef<HTMLDivElement>(null);
  const scoreEl = useRef<HTMLSpanElement>(null);
  const groundEl = useRef<HTMLDivElement>(null);
  const cityEl = useRef<HTMLDivElement>(null);
  const objEls = useRef(new Map<number, HTMLDivElement>());
  const [who, setWho] = useState<Member>(TEAM[0]);
  const [state, setState] = useState<'menu' | 'play' | 'over'>('menu');
  const [objs, setObjs] = useState<Obj[]>([]);
  const [score, setScore] = useState(0);
  const [slow, setSlow] = useState(false);
  const [shield, setShield] = useState(0);
  const [jumping, setJumping] = useState(false);
  const [top, setTop] = useState<Rec[]>(readTop);
  const [name, setName] = useState('');
  const [saved, setSaved] = useState(false);
  const [visible, setVisible] = useState(true);

  const g = useRef({ y: 0, vy: 0, jumps: 0, speed: 360, dist: 0, bonus: 0, nextAt: 600, slowUntil: 0, shield: 0, t: 0, id: 1, objs: [] as Obj[] });

  const best = top[0]?.score || 0;
  const promo = [...PROMOS].reverse().find((p) => score >= p.score);
  const nextPromo = PROMOS.find((p) => score < p.score);

  // пауза, когда поле не видно — не грузим страницу
  useEffect(() => {
    const el = field.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => setVisible(e[0].isIntersecting), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const jump = useCallback(() => {
    const s = g.current;
    if (s.jumps >= 2) return;
    s.vy = JUMP * (s.jumps === 0 ? 1 : 0.82) * PERKS[who.id].jump;
    s.jumps += 1;
    setJumping(true);
  }, [who]);

  const start = () => {
    const s = g.current;
    Object.assign(s, { y: 0, vy: 0, jumps: 0, speed: 360, dist: 0, bonus: 0, nextAt: 700, slowUntil: 0, shield: PERKS[who.id].shield, t: 0, objs: [] });
    setShield(s.shield);
    setObjs([]);
    setScore(0);
    setSaved(false);
    setState('play');
  };

  // клавиши: пробел / стрелка вверх / W
  useEffect(() => {
    if (state !== 'play') return;
    const key = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        jump();
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [state, jump]);

  // игровой цикл: позиции пишем прямо в DOM, React трогаем только при появлении/исчезновении объектов
  useEffect(() => {
    if (state !== 'play' || !visible) return;
    let raf = 0;
    let last = performance.now();
    const W = () => field.current?.clientWidth || 800;
    const loop = (now: number) => {
      const s = g.current;
      const rdt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const slowNow = now < s.slowUntil;
      const dt = rdt * (slowNow ? 0.55 : 1);
      s.t += rdt;
      // на узком поле — помедленнее (иначе не успеть среагировать); очки считаем как на широком
      const k = Math.min(1, Math.max(0.62, W() / 1000));
      s.speed = Math.min(950, 360 + s.t * 14) * k;
      const dx = s.speed * dt;
      s.dist += dx / k;

      // прыжок
      s.vy -= GRAVITY * rdt;
      s.y = Math.max(0, s.y + s.vy * rdt);
      if (s.y === 0 && s.vy < 0) {
        s.vy = 0;
        if (s.jumps) {
          s.jumps = 0;
          setJumping(false);
        }
      }
      if (playerEl.current) playerEl.current.style.transform = `translateY(${-s.y}px)`;

      // новые объекты
      let changed = false;
      if (s.dist >= s.nextAt) {
        const r = Math.random();
        const kind: Kind = s.t < 3 ? 'bug' : r < 0.36 ? 'bug' : r < 0.62 ? 'task' : r < 0.82 ? 'deadline' : r < 0.93 ? 'coffee' : 'star';
        const sz = SIZES[kind];
        s.objs.push({ id: s.id++, kind, x: W() + 20, ...sz });
        // иногда — жук сразу за дедлайном
        if (kind === 'deadline' && Math.random() < 0.3) s.objs.push({ id: s.id++, kind: 'bug', x: W() + 260, ...SIZES.bug });
        s.nextAt = s.dist + (s.speed / k) * (0.75 + Math.random() * 0.9);
        changed = true;
      }

      // движение и столкновения
      const px1 = PLAYER.x + 10;
      const px2 = PLAYER.x + PLAYER.w - 10;
      const py1 = s.y;
      const py2 = s.y + PLAYER.h - 8;
      for (const o of s.objs) {
        o.x -= dx;
        const el = objEls.current.get(o.id);
        if (el) el.style.transform = `translateX(${o.x}px)`;
        if (o.taken) continue;
        const hit = o.x + 6 < px2 && o.x + o.w - 6 > px1 && o.y + 4 < py2 && o.y + o.h - 4 > py1;
        if (!hit) continue;
        if (o.kind === 'coffee' || o.kind === 'star') {
          o.taken = true;
          s.bonus += o.kind === 'star' ? 100 : 50;
          if (o.kind === 'coffee') {
            s.slowUntil = now + 2500 * PERKS[who.id].coffee;
            setSlow(true);
            setTimeout(() => setSlow(false), 2500 * PERKS[who.id].coffee);
          }
          if (el) el.style.opacity = '0';
          continue;
        }
        if (s.shield > 0) {
          s.shield -= 1;
          setShield(s.shield);
          o.taken = true;
          if (el) el.style.opacity = '0.2';
          continue;
        }
        // столкновение — конец забега
        const final = Math.floor(s.dist / 10) + s.bonus;
        setScore(final);
        setState('over');
        if (final > (readTop()[0]?.score || 0) && final > 0) confetti({ particleCount: 140, spread: 90, origin: { y: 0.6 }, colors: [who.color, '#fff', '#8b6cff'] });
        return;
      }
      const before = s.objs.length;
      s.objs = s.objs.filter((o) => o.x > -120);
      if (changed || s.objs.length !== before) setObjs([...s.objs]);

      // фон: земля и город едут с разной скоростью
      if (groundEl.current) groundEl.current.style.backgroundPositionX = `${-s.dist * k}px`;
      if (cityEl.current) cityEl.current.style.backgroundPositionX = `${-s.dist * k * 0.25}px`;
      if (scoreEl.current) scoreEl.current.textContent = String(Math.floor(s.dist / 10) + s.bonus);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [state, visible, who]);

  const save = () => {
    const rec = { name: name.trim().slice(0, 16) || 'Аноним', score, who: who.id };
    const next = [...readTop(), rec].sort((a, b) => b.score - a.score).slice(0, 5);
    try {
      localStorage.setItem('mir-run-top', JSON.stringify(next));
    } catch {
      /* приватный режим */
    }
    setTop(next);
    setSaved(true);
  };

  return (
    <div className="mt-16">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-lime">мини-игра · с нашими героями</div>
          <h3 className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">Убеги от дедлайна</h3>
        </div>
        <p className="max-w-sm text-[14px] leading-relaxed text-haze">Прыгайте через жуков и стопки ТЗ, пробегайте под дедлайнами, ловите кофе. Наберите очки — получите скидку на сайт.</p>
      </div>

      <div
        ref={field}
        onPointerDown={(e) => {
          if (state !== 'play') return;
          if ((e.target as HTMLElement).closest('button')) return;
          e.preventDefault();
          jump();
        }}
        data-hover=""
        className="relative mt-6 h-[360px] touch-none select-none overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,#0d0a24_0%,#1b1340_60%,#2a1b55_100%)] sm:h-[380px]"
      >
        {/* звёзды и город */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,.5)_1px,transparent_1.5px)] opacity-40 [background-size:46px_46px]" />
        <div
          ref={cityEl}
          className="pointer-events-none absolute inset-x-0 bottom-[60px] h-[150px] opacity-70"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='480' height='150'%3E%3Cg fill='%23382a6e'%3E%3Crect x='0' y='60' width='50' height='90'/%3E%3Crect x='55' y='20' width='40' height='130'/%3E%3Crect x='100' y='80' width='60' height='70'/%3E%3Crect x='165' y='40' width='34' height='110'/%3E%3Crect x='204' y='95' width='70' height='55'/%3E%3Crect x='280' y='10' width='46' height='140'/%3E%3Crect x='330' y='70' width='55' height='80'/%3E%3Crect x='390' y='45' width='40' height='105'/%3E%3Crect x='434' y='90' width='46' height='60'/%3E%3C/g%3E%3Cg fill='%23c8ff4d' opacity='.5'%3E%3Crect x='64' y='34' width='4' height='4'/%3E%3Crect x='76' y='54' width='4' height='4'/%3E%3Crect x='290' y='30' width='4' height='4'/%3E%3Crect x='306' y='60' width='4' height='4'/%3E%3Crect x='174' y='60' width='4' height='4'/%3E%3Crect x='400' y='70' width='4' height='4'/%3E%3C/g%3E%3C/svg%3E\")",
            backgroundRepeat: 'repeat-x',
            backgroundSize: '480px 150px',
          }}
        />
        {/* земля */}
        <div
          ref={groundEl}
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[60px] border-t-2 border-lime/70 bg-[#120d2a]"
          style={{ backgroundImage: 'repeating-linear-gradient(90deg, rgba(200,255,77,.25) 0 26px, transparent 26px 64px)', backgroundSize: '64px 2px', backgroundRepeat: 'repeat-x', backgroundPosition: '0 14px' }}
        />
        {slow && <div className="pointer-events-none absolute inset-0 bg-[#ffd66b]/10" />}

        {/* объекты */}
        {objs.map((o) => (
          <div
            key={o.id}
            ref={(el) => {
              if (el) objEls.current.set(o.id, el);
              else objEls.current.delete(o.id);
            }}
            className="pointer-events-none absolute left-0"
            style={{ width: o.w, height: o.h, bottom: 60 + o.y, transform: `translateX(${o.x}px)` }}
          >
            <ObjView kind={o.kind} />
          </div>
        ))}

        {/* игрок */}
        <div ref={playerEl} className="pointer-events-none absolute" style={{ left: PLAYER.x - 22, bottom: 56 }}>
          {shield > 0 && state === 'play' && <div className="absolute -inset-2 rounded-full border-2 border-cyan/70 shadow-[0_0_20px_#3ee6ff]" />}
          <Chibi m={who} size={96} mode={state === 'play' ? (jumping ? 'cheer' : 'run') : 'idle'} />
        </div>

        {/* счёт */}
        {state === 'play' && (
          <div className="absolute right-4 top-4 flex items-center gap-4 font-mono text-[13px] text-haze">
            {slow && <span className="text-[#ffd66b]">☕ замедление</span>}
            <span>
              очки <span ref={scoreEl} className="font-display text-xl font-semibold text-mist">0</span>
            </span>
          </div>
        )}

        {/* меню / итог */}
        <AnimatePresence>
          {state !== 'play' && (
            <motion.div className="absolute inset-0 z-10 flex items-center justify-center bg-void/70 p-4 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {state === 'menu' ? (
                <div className="flex w-full max-w-2xl flex-col items-center text-center">
                  <div className="font-display text-xl font-semibold">Выберите героя</div>
                  <div className="mt-4 grid w-full grid-cols-3 gap-2 sm:gap-3">
                    {TEAM.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setWho(m)}
                        className={`flex flex-col items-center rounded-2xl border-2 p-2 transition-all sm:p-3 ${who.id === m.id ? 'bg-white/[0.07]' : 'border-white/10 opacity-70 hover:opacity-100'}`}
                        style={{ borderColor: who.id === m.id ? m.color : undefined }}
                      >
                        <img src={`${import.meta.env.BASE_URL}${m.head}`} alt="" className="h-14 w-14 object-contain sm:h-16 sm:w-16" />
                        <span className="mt-1 font-display text-[13px] font-semibold sm:text-[15px]" style={{ color: m.color }}>
                          {m.name}
                        </span>
                        <span className="text-[10px] leading-tight text-haze sm:text-[11px]">{PERKS[m.id].label}</span>
                      </button>
                    ))}
                  </div>
                  <button onClick={start} className="mt-5 rounded-full bg-lime px-9 py-3.5 font-display text-lg font-semibold text-void">
                    Бежать!
                  </button>
                  <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-haze">пробел / клик / тап — прыжок · два раза — двойной</div>
                </div>
              ) : (
                <div className="grid w-full max-w-3xl items-center gap-5 sm:grid-cols-[1fr_1fr]">
                  <div className="text-center sm:text-left">
                    <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-haze">{score >= best && score > 0 ? 'новый рекорд!' : 'дедлайн догнал'}</div>
                    <div className="font-display text-6xl font-bold">
                      <span className="text-aurora">{score}</span>
                    </div>
                    {promo ? (
                      <div className="mt-3 rounded-2xl border border-lime/40 bg-lime/10 p-3">
                        <div className="text-[13px] text-haze">{promo.label} — код:</div>
                        <div className="font-mono text-2xl font-bold tracking-[0.2em] text-lime">{promo.code}</div>
                        <div className="text-[11px] text-haze">назовите его, когда будете заказывать сайт</div>
                      </div>
                    ) : (
                      nextPromo && <div className="mt-3 text-[13px] text-haze">До скидки «{nextPromo.label}» не хватило {nextPromo.score - score} очков</div>
                    )}
                    {!saved && score > 0 && (
                      <div className="mt-3 flex gap-2">
                        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ваше имя для рекордов" className="min-w-0 flex-1 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[14px] outline-none focus:border-lime" />
                        <button onClick={save} className="rounded-full border border-white/20 px-4 py-2 text-[13px] font-bold">
                          В таблицу
                        </button>
                      </div>
                    )}
                    <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
                      <button onClick={start} className="rounded-full bg-lime px-7 py-3 font-bold text-void">
                        Ещё забег
                      </button>
                      <button onClick={() => setState('menu')} className="rounded-full border border-white/20 px-6 py-3 font-bold">
                        Сменить героя
                      </button>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-night/80 p-4">
                    <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-haze">лучшие забеги</div>
                    <ol className="mt-3 space-y-2">
                      {top.length === 0 && <li className="text-[13px] text-haze">Пока пусто — станьте первым!</li>}
                      {top.map((r, i) => {
                        const m = TEAM.find((x) => x.id === r.who) || TEAM[0];
                        return (
                          <li key={i} className="flex items-center gap-3">
                            <span className="w-4 font-mono text-[12px] text-haze">{i + 1}</span>
                            <img src={`${import.meta.env.BASE_URL}${m.head}`} alt="" className="h-7 w-7 object-contain" />
                            <span className="flex-1 truncate text-[14px]">{r.name}</span>
                            <span className="font-display font-semibold" style={{ color: m.color }}>
                              {r.score}
                            </span>
                          </li>
                        );
                      })}
                    </ol>
                    <div className="mt-3 border-t border-white/10 pt-3 text-[11px] leading-snug text-haze">
                      {PROMOS.map((p) => (
                        <div key={p.code}>
                          {p.score}+ очков — {p.label.toLowerCase()}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default RunnerGame;
