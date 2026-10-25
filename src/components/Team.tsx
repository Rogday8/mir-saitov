import React from 'react';
import RunnerGame from './RunnerGame';
import Tower from './Tower';
import { Eyebrow, SplitReveal } from './ui';

// «Кто делает эти миры»: подъём на лифте по башне — лобби, этажи команды, крыша (Tower.tsx).
// Прежний 3D-город (components/city/) сейчас не подключён.
const Team: React.FC = () => (
  <section id="team" className="relative py-28 sm:py-36">
    <div className="mx-auto max-w-[1500px] px-5 sm:px-10">
      <Eyebrow n="04">Команда</Eyebrow>
      <h2 className="mt-8 font-display text-[12vw] font-semibold leading-[0.9] tracking-[-0.04em] sm:text-[8vw] lg:text-[5.6vw]">
        <SplitReveal text="Кто делает" /> <SplitReveal text="эти миры" delay={0.2} aurora />
      </h2>
    </div>

    <div className="mt-12">
      <Tower />
    </div>

    <div className="mx-auto max-w-[1500px] px-5 sm:px-10">
      <RunnerGame />
    </div>
  </section>
);

export default Team;
