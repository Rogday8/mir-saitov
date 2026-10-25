import React from 'react';
import RunnerGame from './RunnerGame';
import { Eyebrow, SplitReveal } from './ui';

// «Кто делает эти миры». Окно под 3D пока пустое — содержимое будет новым.
// Прежний 3D-город (башня у Москва-Сити) лежит в components/city/ и сейчас не подключён.
const Team: React.FC = () => (
  <section id="team" className="relative mx-auto max-w-[1500px] px-5 py-28 sm:px-10 sm:py-36">
    <div>
      <Eyebrow n="04">Команда</Eyebrow>
      <h2 className="mt-8 font-display text-[12vw] font-semibold leading-[0.9] tracking-[-0.04em] sm:text-[8vw] lg:text-[5.6vw]">
        <SplitReveal text="Кто делает" /> <SplitReveal text="эти миры" delay={0.2} aurora />
      </h2>
    </div>

    <div className="relative mt-12 h-[78vh] min-h-[560px] overflow-hidden rounded-[28px] border border-white/10 bg-[#0a0912]" />

    <RunnerGame />
  </section>
);

export default Team;
