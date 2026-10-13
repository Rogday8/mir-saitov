import React, { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { TEAM, type Member } from '../data';
import Chibi from './Chibi';
import { Eyebrow, SplitReveal } from './ui';

// «Стол команды»: всё, что на нём лежит, можно таскать. Клик по человечку — прыгает и выкрикивает девиз.
const NOTES = [
  { t: 'Дедлайн? Успеем 😎', c: '#c8ff4d', r: -6 },
  { t: 'Кофе ×3 ☕', c: '#ffd66b', r: 5 },
  { t: 'Пиксель к пикселю', c: '#ff9ccf', r: -3 },
  { t: 'Баги — не пройдут', c: '#9be7ff', r: 7 },
];

const Person: React.FC<{ m: Member; desk: React.RefObject<HTMLDivElement | null>; start: { x: string; y: string }; size: number }> = ({ m, desk, start, size }) => {
  const [cheer, setCheer] = useState(false);
  const [dragging, setDragging] = useState(false);
  const moved = useRef(false);
  return (
    <motion.div
      drag
      dragConstraints={desk}
      dragElastic={0.15}
      dragTransition={{ bounceStiffness: 300, bounceDamping: 18 }}
      onDragStart={() => {
        moved.current = true;
        setDragging(true);
      }}
      onDragEnd={() => setDragging(false)}
      onPointerDown={() => (moved.current = false)}
      onClick={() => {
        if (moved.current) return;
        setCheer(true);
        setTimeout(() => setCheer(false), 1800);
      }}
      whileDrag={{ scale: 1.08, rotate: -4, zIndex: 30 }}
      className="absolute z-10 cursor-grab touch-none active:cursor-grabbing"
      style={{ left: start.x, top: start.y }}
      data-cursor="Тащи"
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
      <Chibi m={m} size={size} mode={cheer ? 'cheer' : dragging ? 'run' : 'idle'} />
      <div className="mt-1 text-center">
        <div className="font-display text-[15px] font-semibold" style={{ color: m.color }}>
          {m.name}
        </div>
        <div className="text-[11px] text-haze">{m.role}</div>
      </div>
    </motion.div>
  );
};

const Team: React.FC = () => {
  const desk = useRef<HTMLDivElement>(null);
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
          ← всё на этом столе можно двигать. Нажмите на любого из нас — узнаете наш девиз →
        </p>
      </div>

      <div
        ref={desk}
        className="relative mt-12 h-[620px] overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle,rgba(255,255,255,.07)_1px,transparent_1.5px)] [background-size:22px_22px] sm:h-[560px]"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_40%,rgba(139,108,255,.14),transparent_70%)]" />
        {TEAM.map((m, i) => (
          <Person key={m.id} m={m} desk={desk} start={spots[i]} size={small ? 82 : 118} />
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
            data-cursor="Тащи"
          >
            {n.t}
          </motion.div>
        ))}
        {/* карточка «сыграйте с нами» */}
        <motion.a
          href="#/play"
          drag
          dragConstraints={desk}
          whileDrag={{ scale: 1.08, zIndex: 30 }}
          initial={{ rotate: 4 }}
          className="absolute right-[4%] top-[6%] z-[6] hidden w-56 touch-none rounded-2xl border border-white/15 bg-void/90 p-4 shadow-2xl md:block"
          onClick={(e) => e.preventDefault()}
          onDoubleClick={() => (window.location.hash = '#/play')}
          data-cursor="Тащи"
        >
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-lime">на выступлении</div>
          <div className="mt-1 font-display text-lg font-semibold leading-tight">Гонка болельщиков</div>
          <p className="mt-1 text-[12px] leading-snug text-haze">Зал сканирует QR и жмёт кнопку в телефоне — мы бежим наперегонки.</p>
          <span className="mt-3 inline-block font-mono text-[10px] uppercase tracking-[0.2em] text-haze/70">двойной клик — открыть пульт</span>
        </motion.a>
      </div>
    </section>
  );
};

export default Team;
