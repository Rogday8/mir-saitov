import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useAnimationControls } from 'motion/react';
import type { MqttClient } from 'mqtt';
import { TEAM, type Member } from '../data';
import Chibi from '../components/Chibi';
import { Logo } from '../components/Header';
import { connect, playerId, topics, type InputMsg, type StateMsg } from './net';

const base = import.meta.env.BASE_URL;

// Пульт в телефоне зрителя: выбрать героя и жать огромную кнопку, пока идёт гонка на большом экране.
const Play: React.FC<{ params: URLSearchParams }> = ({ params }) => {
  const [room, setRoom] = useState((params.get('r') || '').toUpperCase());
  const [code, setCode] = useState('');
  const [status, setStatus] = useState('');
  const [team, setTeam] = useState<Member | null>(null);
  const [state, setState] = useState<StateMsg | null>(null);
  const [mine, setMine] = useState(0);
  const press = useAnimationControls();
  const [count, setCount] = useState(3);
  const client = useRef<MqttClient | null>(null);
  const pending = useRef(0);
  const me = useRef(playerId());

  // связь с комнатой
  useEffect(() => {
    if (!room) return;
    let alive = true;
    const prefer = Number(params.get('b') || 0);
    connect(prefer, setStatus)
      .then(({ client: c }) => {
        if (!alive) return c.end(true);
        client.current = c;
        setStatus('online');
        c.subscribe(topics(room).state);
        c.on('message', (_, buf) => {
          try {
            setState(JSON.parse(buf.toString()));
          } catch {
            /* чужое сообщение */
          }
        });
      })
      .catch((e: Error) => setStatus(e.message));
    return () => {
      alive = false;
      client.current?.end(true);
      client.current = null;
    };
  }, [room, params]);

  const send = (msg: Omit<InputMsg, 'p'>) => client.current?.connected && client.current.publish(topics(room).input, JSON.stringify({ p: me.current, ...msg }));

  // «я тут» — раз в 5 секунд, чтобы экран не терял игрока после переподключения
  useEffect(() => {
    if (!team || status !== 'online') return;
    send({ t: team.id, n: 0, j: 1 });
    const t = setInterval(() => send({ t: team.id, n: 0, j: 1 }), 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team, status]);

  // нажатия уходят пачками 4 раза в секунду
  useEffect(() => {
    if (!team) return;
    const t = setInterval(() => {
      if (pending.current > 0) {
        send({ t: team.id, n: pending.current });
        pending.current = 0;
      }
    }, 250);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team, room]);

  // отсчёт перед стартом — по своим часам с момента получения
  useEffect(() => {
    if (state?.phase !== 'count') return;
    const start = Date.now();
    setMine(0);
    const t = setInterval(() => {
      const left = 3 - Math.floor((Date.now() - start) / 1000);
      setCount(Math.max(0, left));
    }, 100);
    return () => clearInterval(t);
  }, [state?.phase]);

  const tap = (e: React.PointerEvent) => {
    e.preventDefault();
    if (state?.phase !== 'race') return;
    pending.current += 1;
    setMine((n) => n + 1);
    press.start({ scale: [0.9, 1], transition: { duration: 0.18 } });
    navigator.vibrate?.(12);
  };

  // ——— экран «введите код» ———
  if (!room)
    return (
      <Shell>
        <div className="mt-16 text-center">
          <div className="font-display text-3xl font-semibold">Код комнаты</div>
          <p className="mt-2 text-haze">Он на большом экране</p>
          <form
            className="mt-6 flex flex-col items-center gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (code.trim().length >= 4) setRoom(code.trim().toUpperCase());
            }}
          >
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 4))}
              placeholder="ABCD"
              autoCapitalize="characters"
              className="w-48 rounded-2xl border border-white/20 bg-white/5 py-4 text-center font-display text-4xl tracking-[0.3em] text-mist outline-none focus:border-lime"
            />
            <button className="rounded-full bg-lime px-10 py-4 font-display text-lg font-semibold text-void">Войти</button>
          </form>
        </div>
      </Shell>
    );

  const phase = state?.phase ?? 'lobby';
  const myProgress = team && state ? state.progress[team.id] || 0 : 0;

  // ——— выбор героя ———
  if (!team)
    return (
      <Shell status={status}>
        <div className="mt-6 text-center">
          <div className="font-display text-3xl font-semibold leading-tight">За кого болеем?</div>
          <p className="mt-1 text-[15px] text-haze">Выберите героя — вы будете бежать за него</p>
        </div>
        <div className="mt-6 grid gap-3">
          {TEAM.map((m) => (
            <button
              key={m.id}
              onClick={() => setTeam(m)}
              className="flex items-center gap-4 rounded-3xl border-2 bg-white/[0.04] p-3 text-left active:scale-[0.98]"
              style={{ borderColor: `${m.color}66` }}
            >
              <img src={`${base}${m.head}`} alt="" className="h-16 w-16 object-contain" />
              <div className="flex-1">
                <div className="font-display text-xl font-semibold" style={{ color: m.color }}>
                  {m.name}
                </div>
                <div className="text-[13px] text-haze">{m.role}</div>
              </div>
              <span className="text-2xl">→</span>
            </button>
          ))}
        </div>
      </Shell>
    );

  // ——— игра ———
  return (
    <Shell status={status}>
      <div className="mt-2 flex items-center justify-center gap-2 text-[14px] text-haze">
        Вы за <b style={{ color: team.color }}>{team.name}</b>
        {(phase === 'lobby' || phase === 'end') && (
          <button onClick={() => setTeam(null)} className="ml-1 rounded-full border border-white/15 px-3 py-1 text-[12px]">
            сменить
          </button>
        )}
      </div>

      <div className="relative mt-5 flex flex-1 flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          {phase === 'lobby' && (
            <motion.div key="lobby" className="flex flex-col items-center text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Chibi m={team} size={150} mode="idle" />
              <div className="mt-5 font-display text-2xl font-semibold">Ждём старта</div>
              <p className="mt-1 text-haze">Смотрите на большой экран. Когда начнётся гонка — жмите кнопку как можно быстрее!</p>
            </motion.div>
          )}
          {phase === 'count' && (
            <motion.div key="count" className="font-display text-[34vw] font-bold text-lime" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}>
              {count || 'Жми!'}
            </motion.div>
          )}
          {phase === 'race' && (
            <motion.div key="race" className="flex w-full flex-col items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <motion.button
                onPointerDown={tap}
                animate={press}
                className="relative grid aspect-square w-[78vw] max-w-[340px] touch-none select-none place-items-center rounded-full"
                style={{ background: `radial-gradient(circle at 35% 30%, ${team.color}, ${team.color}88 60%, ${team.color}33)`, boxShadow: `0 0 80px ${team.color}66` }}
                aria-label="Жми!"
              >
                <img src={`${base}${team.head}`} alt="" draggable={false} className="pointer-events-none w-[62%] drop-shadow-xl" />
                <span className="absolute bottom-[10%] font-display text-2xl font-bold text-void">ЖМИ!</span>
              </motion.button>
              <div className="mt-5 font-mono text-sm text-haze">
                ваших нажатий: <b className="text-mist">{mine}</b>
              </div>
            </motion.div>
          )}
          {phase === 'end' && state?.winner && (
            <motion.div key="end" className="flex flex-col items-center text-center" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
              <Chibi m={TEAM.find((m) => m.id === state.winner)!} size={150} mode="cheer" />
              <div className="mt-4 font-display text-3xl font-bold">{state.winner === team.id ? 'Ваша команда победила!' : 'В этот раз не повезло'}</div>
              <p className="mt-2 text-haze">Вы нажали {mine} раз. Ждём следующий раунд!</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* прогресс команд */}
      {state && (phase === 'race' || phase === 'end') && (
        <div className="mt-6 space-y-2 pb-2">
          {TEAM.map((m) => (
            <div key={m.id} className="flex items-center gap-3">
              <img src={`${base}${m.head}`} alt="" className="h-7 w-7 object-contain" />
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${(state.progress[m.id] || 0) * 100}%`, background: m.color }} />
              </div>
              <span className="w-10 text-right font-mono text-[11px] text-haze">{Math.round((state.progress[m.id] || 0) * 100)}%</span>
            </div>
          ))}
          {team && phase === 'race' && <div className="text-center font-mono text-[10px] uppercase tracking-[0.2em] text-haze/70">ваша команда: {Math.round(myProgress * 100)}%</div>}
        </div>
      )}
    </Shell>
  );
};

const Shell: React.FC<{ children: React.ReactNode; status?: string }> = ({ children, status }) => (
  <div className="mx-auto flex min-h-[100svh] max-w-md flex-col px-5 pb-6 pt-5">
    <header className="flex items-center justify-between">
      <a href="#/" className="flex items-center gap-2">
        <Logo className="h-7 w-7" />
        <span className="font-display text-[15px] font-semibold">Мир сайтов</span>
      </a>
      {status !== undefined && (
        <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-haze">
          <span className={`h-1.5 w-1.5 rounded-full ${status === 'online' ? 'bg-[#3ddc84]' : 'animate-pulse bg-amber-400'}`} />
          {status === 'online' ? 'на связи' : status}
        </span>
      )}
    </header>
    {children}
  </div>
);

export default Play;
