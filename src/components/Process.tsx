import React, { useRef } from 'react';
import { motion, useSpring, useTransform } from 'motion/react';
import { useSectionProgress } from '../lib/progress';
import { Eyebrow, SplitReveal } from './ui';

const STEPS = [
  { t: 'Знакомство', d: 'Обсуждаем задачу, аудиторию и референсы. Фиксируем, что должен уметь сайт и к какому сроку.', icon: 'M4 12a8 8 0 1 0 16 0 8 8 0 0 0-16 0Zm5-1h.01M15 11h.01M9 15c1.5 1.3 4.5 1.3 6 0' },
  { t: 'Дизайн', d: 'Собираем концепцию: стиль, шрифты, анимации и ключевые экраны. Вы видите сайт до того, как он написан.', icon: 'M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9L12 3Z' },
  { t: 'Разработка', d: 'Верстаем и оживляем: 3D, анимации, корзина, Telegram, админка. Показываем прогресс по ходу.', icon: 'M8 8l-4 4 4 4M16 8l4 4-4 4M14 5l-4 14' },
  { t: 'Запуск', d: 'Домен, хостинг, HTTPS и скорость загрузки. После запуска остаёмся рядом: поддержка и доработки.', icon: 'M5 19c2-6 6-11 14-14-3 8-8 12-14 14Zm4-4-2 2m8-8a1.5 1.5 0 1 0 0-.01' },
];

const Process: React.FC = () => {
  const ref = useRef<HTMLElement>(null);
  const p = useSectionProgress(ref);
  const draw = useSpring(useTransform(p, [0.2, 0.62], [0, 1]), { stiffness: 80, damping: 20 });

  return (
    <section id="process" ref={ref} className="relative overflow-hidden py-28 sm:py-40">
      <div className="mx-auto max-w-[1500px] px-5 sm:px-10">
        <Eyebrow n="05">Как работаем</Eyebrow>
        <h2 className="mt-8 font-display text-[12vw] font-semibold leading-[0.9] tracking-[-0.04em] sm:text-[8vw] lg:text-[5.6vw]">
          <SplitReveal text="От идеи" /> <br className="sm:hidden" />
          <SplitReveal text="до запуска" delay={0.2} aurora />
        </h2>

        <div className="relative mt-16 sm:mt-24">
          {/* линия, которая рисуется при прокрутке */}
          <svg className="absolute left-0 top-[34px] hidden h-10 w-full lg:block" viewBox="0 0 1000 40" preserveAspectRatio="none" aria-hidden>
            <path d="M0 20 C 120 0, 200 40, 330 20 S 560 0, 670 20 S 880 40, 1000 20" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="2" />
            <motion.path
              d="M0 20 C 120 0, 200 40, 330 20 S 560 0, 670 20 S 880 40, 1000 20"
              fill="none"
              stroke="url(#pg)"
              strokeWidth="2.5"
              style={{ pathLength: draw }}
            />
            <defs>
              <linearGradient id="pg" x1="0" x2="1">
                <stop offset="0" stopColor="#8b6cff" />
                <stop offset=".5" stopColor="#3ee6ff" />
                <stop offset="1" stopColor="#c8ff4d" />
              </linearGradient>
            </defs>
          </svg>
          <ol className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            {STEPS.map((s, i) => (
              <motion.li
                key={s.t}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-10% 0px' }}
                transition={{ duration: 1, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
                className="relative"
              >
                <div className="relative z-10 mb-7 flex items-center gap-4">
                  <span className="grid h-[70px] w-[70px] place-items-center rounded-full border border-white/15 bg-void">
                    <svg viewBox="0 0 24 24" className="h-7 w-7 text-lime" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d={s.icon} />
                    </svg>
                  </span>
                  <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-haze">Шаг 0{i + 1}</span>
                </div>
                <h3 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{s.t}</h3>
                <p className="mt-3 max-w-xs text-[15px] leading-relaxed text-haze">{s.d}</p>
              </motion.li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
};

export default Process;
