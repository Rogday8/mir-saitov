import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { scrollToId } from '../lib/smooth';
import { Eyebrow, Magnetic, SplitReveal } from './ui';

// Мини-игра «Поймай баг»: 30 секунд, жуки ползают по «сайту», ловим кликом/тапом.
type Kind = 'bug' | 'fast' | 'gold' | 'feature';
interface Bug {
  id: number;
  kind: Kind;
  x: number; // 0..1
  y: number;
  a: number; // угол движения
  v: number; // скорость (доля ширины в секунду)
  turn: number;
  born: number;
  ttl: number;
}
interface Pop {
  id: number;
  x: number;
  y: number;
  text: string;
  good: boolean;
}

const DURATION = 30;
const POINTS: Record<Kind, number> = { bug: 10, fast: 25, gold: 60, feature: -20 };
const RANKS = [
  { min: 0, t: 'Стажёр QA', d: 'Баги пока побеждают. Но вы на верном пути!' },
  { min: 150, t: 'Тестировщик', d: 'Уверенно! Такой сайт уже можно показывать людям.' },
  { min: 320, t: 'Охотник за багами', d: 'Ни одного шанса для ошибок. Берём в команду?' },
  { min: 520, t: 'Легенда QA', d: 'Невероятно. Баги боятся одного вашего курсора.' },
];
const rankOf = (s: number) => [...RANKS].reverse().find((r) => s >= r.min)!;

const readBest = () => {
  try {
    return Number(localStorage.getItem('mir-bug-best') || 0);
  } catch {
    return 0;
  }
};

const BugSvg: React.FC<{ kind: Kind }> = ({ kind }) => {
  if (kind === 'feature')
    return (
      <svg viewBox="0 0 40 40" className="h-full w-full drop-shadow-[0_0_10px_rgba(62,230,255,.7)]" aria-hidden>
        <g className="origin-center animate-[flap_.35s_ease-in-out_infinite_alternate]" style={{ transformBox: 'fill-box' }}>
          <path d="M20 20C12 6 2 8 4 18c1 6 9 6 16 2Z" fill="#3ee6ff" opacity=".9" />
          <path d="M20 20c8-14 18-12 16-2-1 6-9 6-16 2Z" fill="#3ee6ff" opacity=".9" />
          <path d="M20 21c-6 3-10 10-5 12 3 1 5-5 5-12Zm0 0c6 3 10 10 5 12-3 1-5-5-5-12Z" fill="#8b6cff" />
        </g>
        <rect x="19" y="12" width="2" height="18" rx="1" fill="#ece9ff" />
      </svg>
    );
  const body = kind === 'fast' ? '#ff5fae' : kind === 'gold' ? '#c8ff4d' : '#8b6cff';
  const spot = kind === 'gold' ? '#07060c' : '#07060c';
  return (
    <svg viewBox="0 0 40 40" className="h-full w-full" style={{ filter: `drop-shadow(0 0 8px ${body}aa)` }} aria-hidden>
      <g className="animate-[legs_.18s_linear_infinite_alternate]" stroke="#ece9ff" strokeWidth="1.8" strokeLinecap="round">
        <path d="M14 15 7 11M13 21H5M14 27l-7 4M26 15l7-4M27 21h8M26 27l7 4" />
      </g>
      <ellipse cx="20" cy="22" rx="8.5" ry="10.5" fill={body} />
      <path d="M20 12v20" stroke={spot} strokeWidth="1.2" opacity=".6" />
      <circle cx="16.5" cy="20" r="1.8" fill={spot} opacity=".55" />
      <circle cx="23.5" cy="25" r="1.8" fill={spot} opacity=".55" />
      <circle cx="20" cy="10.5" r="4.6" fill="#1a1630" stroke={body} strokeWidth="1.2" />
      <path d="M18 7 15 2M22 7l3-5" stroke="#ece9ff" strokeWidth="1.4" strokeLinecap="round" />
      {kind === 'gold' && <path d="M20 17l1.5 3 3.3.5-2.4 2.3.6 3.3-3-1.6-3 1.6.6-3.3-2.4-2.3 3.3-.5Z" fill="#07060c" />}
    </svg>
  );
};

const BugGame: React.FC = () => {
  const area = useRef<HTMLDivElement>(null);
  const bugs = useRef<Bug[]>([]);
  const [, setFrame] = useState(0);
  const [state, setState] = useState<'idle' | 'play' | 'over'>('idle');
  const [score, setScore] = useState(0);
  const [time, setTime] = useState(DURATION);
  const [combo, setCombo] = useState(0);
  const [pops, setPops] = useState<Pop[]>([]);
  const [splats, setSplats] = useState<{ id: number; x: number; y: number; c: string }[]>([]);
  const [best, setBest] = useState(readBest);
  const [newBest, setNewBest] = useState(false);
  const lastHit = useRef(0);
  const scoreRef = useRef(0);
  const nextId = useRef(1);

  const spawn = (now: number, elapsed: number) => {
    const r = Math.random();
    const kind: Kind = r < 0.06 ? 'gold' : r < 0.2 ? 'feature' : r < 0.42 ? 'fast' : 'bug';
    const edge = Math.floor(Math.random() * 4);
    const x = edge === 0 ? -0.05 : edge === 1 ? 1.05 : Math.random();
    const y = edge === 2 ? -0.08 : edge === 3 ? 1.08 : Math.random();
    const toward = Math.atan2(0.5 + (Math.random() - 0.5) * 0.5 - y, 0.5 + (Math.random() - 0.5) * 0.5 - x);
    const speedUp = 1 + elapsed / DURATION;
    bugs.current.push({
      id: nextId.current++,
      kind,
      x,
      y,
      a: toward,
      v: (kind === 'fast' ? 0.32 : kind === 'gold' ? 0.4 : kind === 'feature' ? 0.14 : 0.16) * speedUp,
      turn: (Math.random() - 0.5) * 2,
      born: now,
      ttl: kind === 'gold' ? 2600 : 9000,
    });
  };

  // игровой цикл
  useEffect(() => {
    if (state !== 'play') return;
    let raf = 0;
    let last = performance.now();
    const start = last;
    let acc = 0;
    // сразу три жука, чтобы не ждать
    for (let k = 0; k < 3; k++) spawn(last, 0);
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const elapsed = (now - start) / 1000;
      const left = Math.max(0, DURATION - elapsed);
      setTime(left);
      // чем дальше, тем чаще появляются
      acc += dt;
      const every = Math.max(0.35, 1.05 - elapsed * 0.025);
      if (acc > every && bugs.current.length < 14) {
        acc = 0;
        spawn(now, elapsed);
      }
      for (const b of bugs.current) {
        b.turn += (Math.random() - 0.5) * dt * 6;
        b.turn = Math.max(-2.2, Math.min(2.2, b.turn));
        b.a += b.turn * dt;
        // держим жуков в окне: разворачиваем к центру у краёв
        if (b.x < 0.04 || b.x > 0.96 || b.y < 0.06 || b.y > 0.94) {
          const to = Math.atan2(0.5 - b.y, 0.5 - b.x);
          b.a += Math.atan2(Math.sin(to - b.a), Math.cos(to - b.a)) * dt * 4;
        }
        b.x += Math.cos(b.a) * b.v * dt;
        b.y += Math.sin(b.a) * b.v * dt * 1.4;
      }
      bugs.current = bugs.current.filter((b) => now - b.born < b.ttl);
      setFrame((f) => f + 1);
      if (left <= 0) {
        bugs.current = [];
        setState('over');
        const s = scoreRef.current;
        if (s > readBest()) {
          try {
            localStorage.setItem('mir-bug-best', String(s));
          } catch {
            /* приватный режим */
          }
          setBest(s);
          setNewBest(true);
        }
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [state]);

  const begin = () => {
    bugs.current = [];
    scoreRef.current = 0;
    setScore(0);
    setCombo(0);
    setTime(DURATION);
    setPops([]);
    setSplats([]);
    setNewBest(false);
    setState('play');
  };

  const hit = useCallback((b: Bug, e: React.PointerEvent) => {
    e.stopPropagation();
    const now = performance.now();
    const good = b.kind !== 'feature';
    const c = good && now - lastHit.current < 900 ? Math.min(5, combo + 1) : good ? 1 : 0;
    lastHit.current = good ? now : 0;
    setCombo(c);
    const pts = good ? POINTS[b.kind] * Math.max(1, c) : POINTS.feature;
    scoreRef.current = Math.max(0, scoreRef.current + pts);
    setScore(scoreRef.current);
    bugs.current = bugs.current.filter((x) => x.id !== b.id);
    const id = nextId.current++;
    setPops((p) => [...p, { id, x: b.x, y: b.y, text: good ? `+${pts}${c > 1 ? ` ×${c}` : ''}` : 'Это фича! −20', good }]);
    setSplats((s) => [...s.slice(-14), { id, x: b.x, y: b.y, c: b.kind === 'fast' ? '#ff5fae' : b.kind === 'gold' ? '#c8ff4d' : b.kind === 'feature' ? '#3ee6ff' : '#8b6cff' }]);
    setTimeout(() => setPops((p) => p.filter((x) => x.id !== id)), 900);
  }, [combo]);

  const rank = rankOf(score);

  return (
    <section id="game" className="relative mx-auto max-w-[1500px] px-5 py-28 sm:px-10 sm:py-40">
      <style>{`@keyframes legs{from{transform:rotate(-6deg)}to{transform:rotate(6deg)}}@keyframes flap{from{transform:scaleX(1)}to{transform:scaleX(.55)}}`}</style>
      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Eyebrow n="04">Игра</Eyebrow>
          <h2 className="mt-8 font-display text-[12vw] font-semibold leading-[0.9] tracking-[-0.04em] sm:text-[8vw] lg:text-[5.6vw]">
            <SplitReveal text="Поймай" /> <SplitReveal text="баг" delay={0.2} aurora />
          </h2>
        </div>
        <p className="max-w-sm text-[15px] leading-relaxed text-haze sm:text-[17px]">
          Мы ловим ошибки до того, как их увидят ваши клиенты. Попробуйте сами: 30 секунд, жуки ускоряются. Только не трогайте голубые «фичи».
        </p>
      </div>

      <div className="mt-12 overflow-hidden rounded-[24px] border border-white/15 bg-[#0d0c15] shadow-[0_40px_120px_-40px_rgba(139,108,255,.5)]">
        {/* панель браузера + счёт */}
        <div className="flex items-center gap-3 border-b border-white/10 bg-[#14131d] px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          <div className="ml-2 hidden rounded-full bg-white/[0.06] px-3 py-1 font-mono text-[11px] text-white/60 sm:block">vash-sait.ru</div>
          <div className="ml-auto flex items-center gap-4 font-mono text-[12px]">
            <span className="text-haze">
              Счёт <b className="text-mist">{score}</b>
            </span>
            {combo > 1 && state === 'play' && <span className="text-lime">×{combo}</span>}
            <span className="text-haze">
              ⏱ <b className="text-mist">{Math.ceil(time)}</b>
            </span>
          </div>
        </div>
        <div className="h-1 bg-white/5">
          <div className="h-full bg-gradient-to-r from-violet via-cyan to-lime" style={{ width: `${(time / DURATION) * 100}%` }} />
        </div>

        <div
          ref={area}
          className="relative h-[62vh] max-h-[620px] min-h-[420px] touch-manipulation select-none overflow-hidden"
          data-cursor={state === 'play' ? 'Лови' : undefined}
        >
          {/* «сайт» под жуками */}
          <div className="pointer-events-none absolute inset-0 p-5 opacity-50 sm:p-8">
            <div className="flex items-center justify-between">
              <div className="h-3 w-24 rounded-full bg-white/15" />
              <div className="flex gap-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-2.5 w-12 rounded-full bg-white/10" />
                ))}
              </div>
            </div>
            <div className="mt-8 h-[38%] rounded-2xl bg-gradient-to-br from-violet/30 via-cyan/10 to-transparent" />
            <div className="mt-5 grid grid-cols-3 gap-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-24 rounded-xl bg-white/[0.06]" />
              ))}
            </div>
          </div>

          {/* пятна */}
          {splats.map((s) => (
            <motion.div
              key={s.id}
              className="pointer-events-none absolute h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{ left: `${s.x * 100}%`, top: `${s.y * 100}%`, background: `radial-gradient(circle, ${s.c}66, transparent 65%)` }}
              initial={{ scale: 0.3, opacity: 1 }}
              animate={{ scale: 1.6, opacity: 0.35 }}
              transition={{ duration: 0.5 }}
            />
          ))}

          {/* жуки */}
          {state === 'play' &&
            bugs.current.map((b) => (
              <button
                key={b.id}
                onPointerDown={(e) => hit(b, e)}
                className="absolute h-11 w-11 -translate-x-1/2 -translate-y-1/2 p-0.5 sm:h-10 sm:w-10"
                style={{ left: `${b.x * 100}%`, top: `${b.y * 100}%`, transform: `translate(-50%,-50%) rotate(${(b.a * 180) / Math.PI + 90}deg)` }}
                aria-label={b.kind === 'feature' ? 'Фича' : 'Баг'}
              >
                <BugSvg kind={b.kind} />
              </button>
            ))}

          {/* всплывающие очки */}
          <AnimatePresence>
            {pops.map((p) => (
              <motion.div
                key={p.id}
                className={`pointer-events-none absolute -translate-x-1/2 whitespace-nowrap font-display text-lg font-bold ${p.good ? 'text-lime' : 'text-cyan'}`}
                style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
                initial={{ opacity: 0, y: 0, scale: 0.6 }}
                animate={{ opacity: 1, y: -46, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              >
                {p.text}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* старт / итог */}
          <AnimatePresence mode="wait">
            {state !== 'play' && (
              <motion.div
                key={state}
                className="absolute inset-0 grid place-items-center bg-void/70 p-6 text-center backdrop-blur-md"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {state === 'idle' ? (
                  <div className="flex max-w-md flex-col items-center">
                    <div className="flex gap-3">
                      {(['bug', 'fast', 'gold', 'feature'] as Kind[]).map((k) => (
                        <div key={k} className="flex flex-col items-center gap-1">
                          <div className="h-11 w-11">
                            <BugSvg kind={k} />
                          </div>
                          <span className={`font-mono text-[11px] ${k === 'feature' ? 'text-cyan' : 'text-haze'}`}>{POINTS[k] > 0 ? `+${POINTS[k]}` : POINTS[k]}</span>
                        </div>
                      ))}
                    </div>
                    <p className="mt-5 text-[15px] leading-relaxed text-haze">
                      Ловите жуков кликом или тапом. Серия быстрых попаданий умножает очки. Голубые бабочки — это фичи, их не трогаем.
                    </p>
                    <Magnetic className="mt-7">
                      <button onClick={begin} className="rounded-full bg-lime px-9 py-4 font-display text-lg font-semibold text-void transition-transform active:scale-95">
                        Играть
                      </button>
                    </Magnetic>
                    {best > 0 && <div className="mt-4 font-mono text-[11px] uppercase tracking-[0.2em] text-haze">Ваш рекорд: {best}</div>}
                  </div>
                ) : (
                  <div className="flex max-w-md flex-col items-center">
                    <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-haze">{newBest ? 'Новый рекорд!' : `Рекорд: ${best}`}</div>
                    <motion.div
                      className="mt-2 font-display text-7xl font-semibold sm:text-8xl"
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 260, damping: 14 }}
                    >
                      <span className="text-aurora">{score}</span>
                    </motion.div>
                    <div className="mt-3 font-display text-2xl font-semibold">{rank.t}</div>
                    <p className="mt-2 text-[15px] text-haze">{rank.d}</p>
                    <div className="mt-7 flex flex-wrap justify-center gap-3">
                      <button onClick={begin} className="rounded-full bg-lime px-7 py-3.5 font-bold text-void transition-transform active:scale-95">
                        Ещё раз
                      </button>
                      <button onClick={() => scrollToId('contact')} className="rounded-full border border-white/20 px-7 py-3.5 font-bold hover:border-white/50">
                        Хочу сайт без багов
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};

export default BugGame;
