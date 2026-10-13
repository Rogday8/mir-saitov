import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, animate, motion, useInView, useMotionValue } from 'motion/react';
import { TEAM, type Member } from '../data';
import Chibi from './Chibi';
import RunnerGame from './RunnerGame';
import { Eyebrow, SplitReveal } from './ui';

// «Стол команды»: всё, что на нём лежит, можно таскать. Клик по человечку — прыгает и выкрикивает девиз.
const NOTES = [
  { t: 'Дедлайн? Успеем 😎', c: '#c8ff4d', r: -6 },
  { t: 'Кофе ×3 ☕', c: '#ffd66b', r: 5 },
  { t: 'Пиксель к пикселю', c: '#ff9ccf', r: -3 },
  { t: 'Баги — не пройдут', c: '#9be7ff', r: 7 },
];

const Person: React.FC<{ m: Member; desk: React.RefObject<HTMLDivElement | null>; start: { x: string; y: string }; size: number; active: boolean }> = ({
  m,
  desk,
  start,
  size,
  active,
}) => {
  const [cheer, setCheer] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [walking, setWalking] = useState(false);
  const [flip, setFlip] = useState(false);
  const moved = useRef(false);
  const busy = useRef(false);
  const self = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // сам гуляет по столу: идёт к случайной точке, отдыхает, идёт дальше (пока стол на экране и его не трогают)
  useEffect(() => {
    if (!active) return;
    let timer = 0;
    let anim: { stop: () => void } | null = null;
    const step = () => {
      const d = desk.current;
      const el = self.current;
      if (!d || !el || busy.current) {
        timer = window.setTimeout(step, 1500);
        return;
      }
      const D = d.getBoundingClientRect();
      const E = el.getBoundingClientRect();
      // текущее положение элемента внутри стола и куда можно дойти
      const curL = E.left - D.left;
      const curT = E.top - D.top;
      const tl = Math.random() * Math.max(0, D.width - E.width);
      const tt = Math.random() * Math.max(0, D.height * 0.55 - E.height * 0.3);
      const dx = tl - curL;
      const dy = tt - curT;
      const dist = Math.hypot(dx, dy);
      setFlip(dx < 0);
      setWalking(true);
      const dur = Math.max(1.2, dist / 70);
      const ax = animate(x, x.get() + dx, { duration: dur, ease: 'linear' });
      const ay = animate(y, y.get() + dy, { duration: dur, ease: 'linear' });
      anim = { stop: () => (ax.stop(), ay.stop()) };
      ax.then(() => {
        setWalking(false);
        timer = window.setTimeout(step, 2200 + Math.random() * 3500);
      });
    };
    timer = window.setTimeout(step, 1200 + Math.random() * 2500);
    return () => {
      clearTimeout(timer);
      anim?.stop();
      setWalking(false);
    };
  }, [active, desk, x, y]);

  return (
    <motion.div
      ref={self}
      drag
      dragConstraints={desk}
      dragElastic={0.15}
      dragTransition={{ bounceStiffness: 300, bounceDamping: 18 }}
      onDragStart={() => {
        moved.current = true;
        busy.current = true;
        setDragging(true);
      }}
      onDragEnd={() => {
        setDragging(false);
        setTimeout(() => (busy.current = false), 2500);
      }}
      onPointerDown={() => {
        moved.current = false;
        x.stop();
        y.stop();
        setWalking(false);
      }}
      onClick={() => {
        if (moved.current) return;
        busy.current = true;
        setCheer(true);
        setTimeout(() => {
          setCheer(false);
          busy.current = false;
        }, 1800);
      }}
      whileDrag={{ scale: 1.08, rotate: -4, zIndex: 30 }}
      className="absolute z-10 cursor-grab touch-none active:cursor-grabbing"
      style={{ left: start.x, top: start.y, x, y }}
    >
      <AnimatePresence>
        {cheer && (
          <motion.div
            className="absolute -top-12 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-2xl rounded-bl-sm bg-mist px-3 py-1.5 text-[13px] font-bold text-void shadow-xl"
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6 }}
          >
            {m.cheer}
          </motion.div>
        )}
      </AnimatePresence>
      <Chibi m={m} size={size} flip={flip} mode={cheer ? 'cheer' : dragging || walking ? 'run' : 'idle'} />
      <div className="mt-1 text-center">
        <div className="font-display text-[12px] font-semibold sm:text-[15px]" style={{ color: m.color }}>
          {m.name}
        </div>
        <div className="hidden text-[11px] text-haze sm:block">{m.role}</div>
      </div>
    </motion.div>
  );
};

const Team: React.FC = () => {
  const desk = useRef<HTMLDivElement>(null);
  const deskInView = useInView(desk, { margin: '-10% 0px' });
  // на телефоне человечки помельче и «лесенкой», чтобы не стоять друг на друге
  const small = typeof window !== 'undefined' && window.innerWidth < 640;
  const spots = small
    ? [
        { x: '3%', y: '4%' },
        { x: '36%', y: '31%' },
        { x: '68%', y: '5%' },
      ]
    : [
        { x: '8%', y: '18%' },
        { x: '40%', y: '10%' },
        { x: '70%', y: '22%' },
      ];
  return (
    <section id="team" className="relative mx-auto max-w-[1500px] px-5 py-28 sm:px-10 sm:py-36">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Eyebrow n="04">Команда</Eyebrow>
          <h2 className="mt-8 font-display text-[12vw] font-semibold leading-[0.9] tracking-[-0.04em] sm:text-[8vw] lg:text-[5.6vw]">
            <SplitReveal text="Кто делает" /> <SplitReveal text="эти миры" delay={0.2} aurora />
          </h2>
        </div>
        <p className="max-w-sm font-[Caveat,cursive] text-[15px] text-haze sm:text-[17px]">
          ← всё на этом столе можно двигать. Мы тут гуляем — поймайте любого и нажмите, узнаете девиз →
        </p>
      </div>

      <div
        ref={desk}
        className="relative mt-12 h-[620px] overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle,rgba(255,255,255,.07)_1px,transparent_1.5px)] [background-size:22px_22px] sm:h-[560px]"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_40%,rgba(139,108,255,.14),transparent_70%)]" />
        {TEAM.map((m, i) => (
          <Person key={m.id} m={m} desk={desk} start={spots[i]} size={small ? 82 : 118} active={deskInView} />
        ))}
        {NOTES.map((n, i) => (
          <motion.div
            key={n.t}
            drag
            dragConstraints={desk}
            dragElastic={0.2}
            whileDrag={{ scale: 1.1, rotate: 0, zIndex: 30 }}
            initial={{ rotate: n.r }}
            className="absolute z-[5] w-36 cursor-grab touch-none rounded-sm p-3 font-display text-[14px] font-semibold leading-snug text-void shadow-[0_12px_30px_rgba(0,0,0,.35)] active:cursor-grabbing"
            style={{ background: n.c, left: `${small ? [4, 50, 8, 52][i] : [6, 30, 58, 80][i]}%`, top: `${small ? [62, 66, 80, 82][i] : [64, 70, 66, 58][i]}%` }}
          >
            {n.t}
          </motion.div>
        ))}
      </div>

      <RunnerGame />
    </section>
  );
};

export default Team;
