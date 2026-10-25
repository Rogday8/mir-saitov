import React from 'react';
import { motion } from 'motion/react';
import { NAV } from './Header';
import { scrollToId, scrollToTop } from '../lib/smooth';

// Подвал: огромное «МИР САЙТОВ» — буквы подпрыгивают и вспыхивают под курсором
const Footer: React.FC = () => (
  <footer className="relative overflow-hidden border-t border-white/10 pt-16">
    <div className="mx-auto flex max-w-[1500px] flex-col gap-8 px-5 sm:flex-row sm:items-start sm:justify-between sm:px-10">
      <p className="max-w-xs text-[14px] leading-relaxed text-haze">Мир сайтов — студия, которая делает сайты с характером: красивые, быстрые и удобные.</p>
      <nav className="flex flex-wrap gap-x-6 gap-y-2" aria-label="Разделы">
        {NAV.map((n) => (
          <button key={n.id} onClick={() => scrollToId(n.id)} className="text-[14px] font-semibold text-haze transition-colors hover:text-lime">
            {n.label}
          </button>
        ))}
      </nav>
    </div>
    <div className="mt-10 flex select-none justify-center whitespace-nowrap px-2 font-display text-[9.4vw] font-bold leading-[0.8] tracking-[-0.01em]" aria-hidden>
      {[...'МИР САЙТОВ'].map((c, i) =>
        c === ' ' ? (
          <span key={i} className="inline-block w-[3vw]" />
        ) : (
          <motion.span
            key={i}
            className="text-outline inline-block transition-colors duration-300 hover:text-lime"
            whileHover={{ y: '-14%', rotate: i % 2 ? 6 : -6 }}
            transition={{ type: 'spring', stiffness: 400, damping: 12 }}
          >
            {c}
          </motion.span>
        ),
      )}
    </div>
    <div className="mx-auto mt-6 flex max-w-[1500px] items-center justify-between px-5 pb-6 font-mono text-[11px] uppercase tracking-[0.2em] text-haze sm:px-10">
      <span>
        © {new Date().getFullYear()} Мир сайтов · Все права защищены
        <span className="mt-1 block normal-case tracking-normal text-haze/60">
          Фото башни и этажей —{' '}
          <a href="https://unsplash.com" target="_blank" rel="noreferrer" className="hover:text-lime">
            Unsplash
          </a>
          : Evg Klimov, Adrien Olichon, Brian J. Tromp, Sandra Williams, Med Badr Chemmaoui, Platon Matakaev
        </span>
      </span>
      <button onClick={scrollToTop} className="hover:text-lime">
        Наверх ↑
      </button>
    </div>
  </footer>
);

export default Footer;
