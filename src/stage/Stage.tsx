import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import type { MqttClient } from 'mqtt';
import { TEAM } from '../data';
import Chibi from '../components/Chibi';
import { Logo } from '../components/Header';
import { connect, makeRoom, topics, type InputMsg, type Phase, type StateMsg } from './net';
import NoiseMeter from './NoiseMeter';

// Большой экран для выступления: зал сканирует QR, выбирает героя и жмёт кнопку в телефоне —
// человечки бегут наперегонки. Клавиши: Пробел — старт, R — заново, B — боты (репетиция), F — во весь экран.

const TAPS_PER_PLAYER = 40; // столько нажатий в среднем на игрока до финиша — большая команда не выигрывает числом
const COUNTDOWN = 3000;
const RACE_LIMIT = 30000;

const roomKey = 'mir-stage-room';
const readRoom = () => {
  try {
    const r = sessionStorage.getItem(roomKey);
    if (r) return r;
    const n = makeRoom();
    sessionStorage.setItem(roomKey, n);
    return n;
  } catch {
    return makeRoom();
  }
};

const zero = () => Object.fromEntries(TEAM.map((m) => [m.id, 0])) as Record<string, number>;

const Stage: React.FC = () => {
  const [mode, setMode] = useState<'race' | 'noise'>('race');
  const [room, setRoom] = useState(readRoom);
  const [broker, setBroker] = useState(0);
  const [status, setStatus] = useState('Подключаемся…');
  const [qr, setQr] = useState('');
  const [phase, setPhase] = useState<Phase>('lobby');
  const [count, setCount] = useState(3);
  const [progress, setProgress] = useState<Record<string, number>>(zero);
  const [players, setPlayers] = useState<Record<string, number>>(zero);
  const [winner, setWinner] = useState<string | null>(null);
  const [bots, setBots] = useState(false);

  const client = useRef<MqttClient | null>(null);
  const roster = useRef(new Map<string, string>()); // игрок → команда
  const taps = useRef(zero());
  const phaseRef = useRef<Phase>('lobby');
  const startedAt = useRef(0);

  const playUrl = `${location.origin}${location.pathname}#/play?r=${room}&b=${broker}`;
  const shortUrl = `${location.host}${location.pathname.replace(/\/$/, '')}`;

  const counts = () => {
    const c = zero();
    roster.current.forEach((t) => (c[t] = (c[t] || 0) + 1));
    return c;
  };

  const publish = useCallback(
    (msg: Partial<StateMsg>, retain = false) => {
      const c = client.current;
      if (!c?.connected) return;
      const full: StateMsg = { phase: phaseRef.current, at: startedAt.current, progress: zero(), players: counts(), ...msg };
      c.publish(topics(room).state, JSON.stringify(full), { retain, qos: 0 });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [room],
  );

  const setPhaseAll = useCallback(
    (p: Phase, extra: Partial<StateMsg> = {}) => {
      phaseRef.current = p;
      setPhase(p);
      publish({ phase: p, ...extra }, true);
    },
    [publish],
  );

  // связь
  useEffect(() => {
    let alive = true;
    let c: MqttClient | null = null;
    connect(0, setStatus)
      .then(({ client: cl, broker: b }) => {
        if (!alive) return cl.end(true);
        c = cl;
        client.current = cl;
        setBroker(b);
        setStatus('online');
        cl.subscribe(topics(room).input);
        cl.on('message', (_, buf) => {
          let m: InputMsg;
          try {
            m = JSON.parse(buf.toString());
          } catch {
            return;
          }
          if (!m.p || !TEAM.some((t) => t.id === m.t)) return;
          // команду можно менять до старта; во время гонки — только новичкам
          if (phaseRef.current === 'lobby' || phaseRef.current === 'end' || !roster.current.has(m.p)) roster.current.set(m.p, m.t);
          if (phaseRef.current === 'race' && m.n > 0) {
            const team = roster.current.get(m.p)!;
            taps.current[team] += Math.min(m.n, 25); // не больше 25 нажатий за одно сообщение
          }
          setPlayers(counts());
        });
        cl.on('reconnect', () => setStatus('Переподключаемся…'));
        cl.on('connect', () => setStatus('online'));
        phaseRef.current = 'lobby';
        publish({ phase: 'lobby' }, true);
      })
      .catch((e: Error) => setStatus(e.message));
    return () => {
      alive = false;
      c?.end(true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room]);

  // QR-код на пульт в телефоне
  useEffect(() => {
    QRCode.toDataURL(playUrl, { margin: 1, width: 520, color: { dark: '#07060c', light: '#ffffff' }, errorCorrectionLevel: 'M' }).then(setQr);
  }, [playUrl]);

  // боты для репетиции: заходят и жмут с разной скоростью
  useEffect(() => {
    if (!bots) return;
    const ids = Array.from({ length: 12 }, (_, i) => `bot${i}`);
    ids.forEach((id, i) => roster.current.set(id, TEAM[i % TEAM.length].id));
    setPlayers(counts());
    const speed = Object.fromEntries(ids.map((id) => [id, 3 + Math.random() * 6]));
    const t = setInterval(() => {
      if (phaseRef.current !== 'race') return;
      ids.forEach((id) => {
        const team = roster.current.get(id);
        if (team && Math.random() < speed[id] / 10) taps.current[team] += 1;
      });
    }, 100);
    return () => {
      clearInterval(t);
      ids.forEach((id) => roster.current.delete(id));
      setPlayers(counts());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bots]);

  const start = useCallback(() => {
    if (phaseRef.current === 'count' || phaseRef.current === 'race') return;
    taps.current = zero();
    setProgress(zero());
    setWinner(null);
    startedAt.current = Date.now();
    setPhaseAll('count', { at: startedAt.current });
  }, [setPhaseAll]);

  const reset = useCallback(() => {
    taps.current = zero();
    setProgress(zero());
    setWinner(null);
    setPhaseAll('lobby');
  }, [setPhaseAll]);

  // отсчёт → гонка
  useEffect(() => {
    if (phase !== 'count') return;
    let raf = 0;
    const tick = () => {
      const left = COUNTDOWN - (Date.now() - startedAt.current);
      setCount(Math.max(0, Math.ceil(left / 1000)));
      if (left <= 0) {
        startedAt.current = Date.now();
        setPhaseAll('race', { at: startedAt.current });
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, setPhaseAll]);

  // гонка → финиш
  useEffect(() => {
    if (phase !== 'race') return;
    let raf = 0;
    let lastPub = 0;
    const tick = () => {
      const c = counts();
      const prog = Object.fromEntries(TEAM.map((m) => [m.id, Math.min(1, taps.current[m.id] / (TAPS_PER_PLAYER * Math.max(1, c[m.id])))])) as Record<string, number>;
      setProgress(prog);
      const now = Date.now();
      if (now - lastPub > 400) {
        lastPub = now;
        publish({ phase: 'race', progress: prog });
      }
      const done = TEAM.find((m) => prog[m.id] >= 1);
      if (done || now - startedAt.current > RACE_LIMIT) {
        const best = done?.id ?? [...TEAM].sort((a, b) => prog[b.id] - prog[a.id])[0].id;
        setWinner(best);
        setPhaseAll('end', { progress: prog, winner: best });
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // салют победителю
  useEffect(() => {
    if (phase !== 'end' || !winner) return;
    const color = TEAM.find((m) => m.id === winner)!.color;
    const end = Date.now() + 2600;
    const burst = () => {
      confetti({ particleCount: 70, spread: 90, origin: { x: 0.15 + Math.random() * 0.7, y: 0.3 }, colors: [color, '#ffffff', '#8b6cff'] });
      if (Date.now() < end) setTimeout(burst, 260);
    };
    burst();
  }, [phase, winner]);

  const fullscreen = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(() => {}));
  const newRoom = () => {
    const r = makeRoom();
    try {
      sessionStorage.setItem(roomKey, r);
    } catch {
      /* приватный режим */
    }
    roster.current.clear();
    setPlayers(zero());
    setRoom(r);
  };

  // клавиши ведущего
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (mode === 'race') (phaseRef.current === 'end' ? reset : start)();
      }
      if (e.code === 'KeyR') reset();
      if (e.code === 'KeyB') setBots((b) => !b);
      if (e.code === 'KeyF') fullscreen();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [mode, start, reset]);

  const total = Object.values(players).reduce((s, n) => s + n, 0);
  const win = TEAM.find((m) => m.id === winner);

  return (
    <div className="relative flex min-h-[100svh] flex-col overflow-hidden px-5 py-5 lg:px-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_60%_at_70%_30%,rgba(139,108,255,.22),transparent_70%),radial-gradient(40%_50%_at_10%_90%,rgba(200,255,77,.08),transparent_70%)]" />

      <header className="relative z-10 flex flex-wrap items-center justify-between gap-4">
        <a href="#/" className="flex items-center gap-3">
          <Logo className="h-9 w-9" />
          <span className="font-display text-lg font-semibold">Мир сайтов</span>
        </a>
        <div className="flex rounded-full border border-white/15 p-1">
          {(['race', 'noise'] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)} className={`rounded-full px-5 py-2 text-sm font-bold transition-colors ${mode === m ? 'bg-lime text-void' : 'text-haze hover:text-mist'}`}>
              {m === 'race' ? 'Гонка с телефонов' : 'Шумометр'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-haze">
          <span className={`h-2 w-2 rounded-full ${status === 'online' ? 'bg-[#3ddc84]' : 'animate-pulse bg-amber-400'}`} />
          {status === 'online' ? 'на связи' : status}
        </div>
      </header>

      {mode === 'noise' ? (
        <NoiseMeter />
      ) : (
        <main className="relative z-10 mt-6 grid flex-1 gap-6 lg:grid-cols-[minmax(300px,0.8fr)_2fr]">
          {/* QR и подключение */}
          <aside className="flex flex-col gap-5 rounded-[32px] border border-white/10 bg-night/70 p-6">
            <div className="font-display text-3xl font-semibold leading-tight xl:text-4xl">
              Сканируйте —<br />
              <span className="text-aurora">играем вместе!</span>
            </div>
            <div className="mx-auto w-full max-w-[320px] rounded-3xl bg-white p-3 shadow-[0_0_80px_rgba(200,255,77,.25)]">
              {qr ? <img src={qr} alt="QR-код для подключения" className="w-full" /> : <div className="aspect-square" />}
            </div>
            <div className="text-center">
              <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-haze">код комнаты</div>
              <div className="mt-1 font-display text-6xl font-bold tracking-[0.2em] text-lime">{room}</div>
              <div className="mt-2 font-mono text-[10px] text-haze/70">{shortUrl}/#/play</div>
            </div>
            <div className="mt-auto grid grid-cols-3 gap-2">
              {TEAM.map((m) => (
                <div key={m.id} className="rounded-2xl border border-white/10 p-2 text-center">
                  <div className="font-display text-2xl font-semibold" style={{ color: m.color }}>
                    {players[m.id] || 0}
                  </div>
                  <div className="truncate text-[11px] text-haze">{m.name}</div>
                </div>
              ))}
            </div>
            <div className="text-center font-mono text-[11px] uppercase tracking-[0.2em] text-haze">
              В игре: {total}
              {bots && ' · с ботами'}
            </div>
          </aside>

          {/* трасса */}
          <section className="relative flex min-h-[460px] flex-col overflow-hidden rounded-[32px] border border-white/10 bg-night/50 p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="font-display text-3xl font-semibold xl:text-5xl">Гонка болельщиков</div>
              <div className="font-mono text-xs uppercase tracking-[0.2em] text-haze">жмите кнопку в телефоне — ваш герой бежит</div>
            </div>
            <div className="relative mt-6 flex flex-1 flex-col justify-around gap-4">
              <div className="absolute bottom-0 right-[3%] top-0 w-4 rounded bg-[repeating-linear-gradient(0deg,#fff_0_14px,#07060c_14px_28px)] opacity-80" />
              {TEAM.map((m) => {
                const p = progress[m.id] || 0;
                const isWin = phase === 'end' && winner === m.id;
                return (
                  <div key={m.id} className="relative h-[28%] min-h-[130px]">
                    <div className="absolute inset-x-0 bottom-3 h-2 rounded-full bg-white/10">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: m.color, boxShadow: `0 0 24px ${m.color}` }}
                        animate={{ width: `${p * 97}%` }}
                        transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                      />
                    </div>
                    <motion.div className="absolute bottom-4" animate={{ left: `calc(${p * 97}% - ${p * 104}px)` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }}>
                      <Chibi m={m} size={104} mode={isWin ? 'cheer' : phase === 'race' ? 'run' : 'idle'} />
                    </motion.div>
                    <div className="absolute left-0 top-0 flex items-baseline gap-3">
                      <span className="font-display text-xl font-semibold" style={{ color: m.color }}>
                        {m.name}
                      </span>
                      <span className="font-mono text-xs text-haze">
                        {Math.round(p * 100)}% · {players[m.id] || 0} игр.
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <AnimatePresence>
              {phase === 'count' && (
                <motion.div key="count" className="absolute inset-0 grid place-items-center bg-void/60 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <AnimatePresence mode="popLayout">
                    <motion.div
                      key={count}
                      initial={{ scale: 2.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.4, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                      className="font-display text-[22vh] font-bold leading-none text-lime"
                    >
                      {count || 'Жми!'}
                    </motion.div>
                  </AnimatePresence>
                </motion.div>
              )}
              {phase === 'end' && win && (
                <motion.div key="end" className="absolute inset-0 grid place-items-center bg-void/75 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="flex flex-col items-center text-center">
                    <motion.div initial={{ scale: 0.3, y: 80 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 160, damping: 12 }}>
                      <Chibi m={win} size={210} mode="cheer" />
                    </motion.div>
                    <div className="mt-4 font-mono text-sm uppercase tracking-[0.3em] text-haze">Победили болельщики</div>
                    <div className="font-display text-6xl font-bold" style={{ color: win.color }}>
                      {win.name}
                    </div>
                    <div className="mt-2 text-2xl text-mist">«{win.cheer}»</div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </main>
      )}

      {mode === 'race' && (
        <footer className="relative z-10 mt-5 flex flex-wrap items-center justify-center gap-3">
          {phase === 'end' ? (
            <button onClick={reset} className="rounded-full bg-lime px-8 py-3.5 font-display text-lg font-semibold text-void">
              Ещё раунд
            </button>
          ) : (
            <button onClick={start} disabled={phase !== 'lobby'} className="rounded-full bg-lime px-8 py-3.5 font-display text-lg font-semibold text-void disabled:opacity-40">
              Старт
            </button>
          )}
          <button onClick={reset} className="rounded-full border border-white/20 px-6 py-3.5 font-bold">
            Сброс
          </button>
          <button onClick={() => setBots((b) => !b)} className={`rounded-full border px-6 py-3.5 font-bold ${bots ? 'border-lime text-lime' : 'border-white/20'}`}>
            Боты: {bots ? 'вкл' : 'выкл'}
          </button>
          <button onClick={newRoom} className="rounded-full border border-white/20 px-6 py-3.5 font-bold">
            Новая комната
          </button>
          <button onClick={fullscreen} className="rounded-full border border-white/20 px-6 py-3.5 font-bold">
            Во весь экран
          </button>
          <span className="w-full text-center font-mono text-[10px] uppercase tracking-[0.2em] text-haze/60">Пробел — старт · R — сброс · B — боты · F — экран</span>
        </footer>
      )}
    </div>
  );
};

export default Stage;
