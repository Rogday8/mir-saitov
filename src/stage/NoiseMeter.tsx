import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { TEAM } from '../data';
import Chibi from '../components/Chibi';

// Шумометр — запасной режим без интернета: зал по очереди кричит за своего героя, микрофон меряет громкость.
const MEASURE_MS = 4000;

const NoiseMeter: React.FC = () => {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [level, setLevel] = useState(0); // 0..1 сейчас
  const [current, setCurrent] = useState<string | null>(null); // чья очередь кричать
  const [left, setLeft] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>({});
  const analyser = useRef<AnalyserNode | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const levelRef = useRef(0);

  const enable = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      stream.current = s;
      const ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(s);
      const an = ctx.createAnalyser();
      an.fftSize = 1024;
      src.connect(an);
      analyser.current = an;
      setReady(true);
    } catch {
      setError('Нет доступа к микрофону — разрешите его в браузере');
    }
  };

  // громкость: RMS сигнала → децибелы → 0..1
  useEffect(() => {
    if (!ready) return;
    const buf = new Float32Array(1024);
    let raf = 0;
    const tick = () => {
      const an = analyser.current;
      if (an) {
        an.getFloatTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
        const db = 20 * Math.log10(Math.sqrt(sum / buf.length) + 1e-6);
        const v = Math.min(1, Math.max(0, (db + 55) / 50));
        levelRef.current = levelRef.current * 0.7 + v * 0.3;
        setLevel(levelRef.current);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ready]);

  useEffect(() => () => stream.current?.getTracks().forEach((t) => t.stop()), []);

  const measure = (id: string) => {
    if (current) return;
    setCurrent(id);
    const start = performance.now();
    const samples: number[] = [];
    const tick = () => {
      const t = performance.now() - start;
      samples.push(levelRef.current);
      setLeft(Math.max(0, MEASURE_MS - t));
      if (t < MEASURE_MS) requestAnimationFrame(tick);
      else {
        // счёт — средняя громкость самой шумной половины замеров (чтобы один хлопок не решал)
        const top = [...samples].sort((a, b) => b - a).slice(0, Math.max(1, samples.length >> 1));
        const score = Math.round((top.reduce((s, v) => s + v, 0) / top.length) * 100);
        setScores((s) => ({ ...s, [id]: score }));
        setCurrent(null);
      }
    };
    requestAnimationFrame(tick);
  };

  const done = TEAM.every((m) => scores[m.id] !== undefined);
  const winner = done ? [...TEAM].sort((a, b) => scores[b.id] - scores[a.id])[0] : null;
  useEffect(() => {
    if (!winner) return;
    confetti({ particleCount: 160, spread: 110, origin: { y: 0.4 }, colors: [winner.color, '#fff', '#8b6cff'] });
  }, [winner]);

  if (!ready)
    return (
      <div className="relative z-10 grid flex-1 place-items-center text-center">
        <div className="max-w-xl">
          <div className="font-display text-5xl font-semibold">Шумометр</div>
          <p className="mt-4 text-xl text-haze">Зал делится на три части — каждая кричит за своего героя. Кто громче, тот и победил. Нужен только микрофон ноутбука.</p>
          <button onClick={enable} className="mt-8 rounded-full bg-lime px-10 py-4 font-display text-xl font-semibold text-void">
            Включить микрофон
          </button>
          {error && <p className="mt-4 text-rose">{error}</p>}
        </div>
      </div>
    );

  return (
    <div className="relative z-10 mt-6 flex flex-1 flex-col">
      <div className="grid flex-1 gap-5 md:grid-cols-3">
        {TEAM.map((m) => {
          const active = current === m.id;
          const sc = scores[m.id];
          const isWin = winner?.id === m.id;
          return (
            <div key={m.id} className={`relative flex flex-col items-center justify-end overflow-hidden rounded-[32px] border-2 p-5 transition-colors ${active ? 'bg-white/[0.06]' : 'bg-night/60'}`} style={{ borderColor: active || isWin ? m.color : 'rgba(255,255,255,.1)' }}>
              {/* столбик громкости */}
              <div className="absolute inset-x-0 bottom-0 transition-[height] duration-100" style={{ height: `${(active ? level : (sc ?? 0) / 100) * 100}%`, background: `linear-gradient(to top, ${m.color}55, transparent)` }} />
              <motion.div animate={{ scale: active ? 1 + level * 0.5 : 1 }} transition={{ type: 'spring', stiffness: 300, damping: 15 }} className="relative">
                <Chibi m={m} size={140} mode={isWin ? 'cheer' : active ? 'run' : 'idle'} />
              </motion.div>
              <div className="relative mt-3 font-display text-2xl font-semibold" style={{ color: m.color }}>
                {m.name}
              </div>
              <div className="relative mt-1 font-display text-6xl font-bold">{active ? Math.round(level * 100) : sc ?? '—'}</div>
              <button
                onClick={() => measure(m.id)}
                disabled={!!current}
                className="relative mt-4 rounded-full px-6 py-3 font-bold text-void disabled:opacity-40"
                style={{ background: m.color }}
              >
                {active ? `Кричим! ${Math.ceil(left / 1000)}` : sc !== undefined ? 'Ещё раз' : 'Шумим!'}
              </button>
            </div>
          );
        })}
      </div>
      <AnimatePresence>
        {winner && (
          <motion.div className="mt-5 text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <span className="font-display text-4xl font-bold" style={{ color: winner.color }}>
              Громче всех — болельщики «{winner.name}»!
            </span>
            <button onClick={() => setScores({})} className="ml-4 rounded-full border border-white/20 px-5 py-2.5 font-bold">
              Заново
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NoiseMeter;
