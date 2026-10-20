import React from 'react';
import { Rise, Up } from './ui';

const STEPS = [
  { t: 'Знакомимся', d: 'Обсуждаем задачу, аудиторию и примеры, которые нравятся. Фиксируем, что должен уметь сайт и к какому сроку.' },
  { t: 'Рисуем', d: 'Собираем стиль, шрифты, анимации и ключевые экраны. Вы видите сайт до того, как он написан.' },
  { t: 'Делаем', d: 'Верстаем и оживляем: 3D, анимации, корзина, Telegram, админка. Показываем, как идёт работа.' },
  { t: 'Запускаем', d: 'Домен, хостинг, HTTPS и скорость загрузки. После запуска остаёмся рядом: поддержка и доработки.' },
];

// «Как работаем»: четыре шага — обычным списком, крупно, без иконок
const Process: React.FC = () => (
  <section id="process" className="relative mx-auto max-w-[1500px] px-5 py-32 sm:px-10 sm:py-48">
    <div className="grid gap-x-10 gap-y-14 lg:grid-cols-12">
      <h2 className="font-head text-[11vw] font-semibold leading-[0.95] tracking-[-0.045em] sm:text-[7vw] lg:col-span-4 lg:text-[4.6vw]">
        <Rise text="От идеи" />
        <br />
        <Rise text="до запуска" delay={0.12} />
      </h2>
      <ol className="lg:col-span-8">
        {STEPS.map((s, i) => (
          <Up as="li" key={s.t} delay={i * 0.07} className="grid gap-3 py-7 sm:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] sm:gap-10 sm:py-9">
            <h3 className="font-head text-[34px] font-semibold leading-[1.05] tracking-[-0.03em] sm:text-[44px]">{s.t}</h3>
            <p className="max-w-lg text-[17px] leading-[1.55] text-haze sm:pt-2">{s.d}</p>
          </Up>
        ))}
      </ol>
    </div>
  </section>
);

export default Process;
