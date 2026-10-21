import React from 'react';
import { NAV } from './Header';
import { scrollToId, scrollToTop } from '../lib/smooth';
import { CREDITS } from '../data';

// Подвал: короткий призыв, разделы и авторы использованных 3D-моделей (лицензия CC BY требует указать)
const Footer: React.FC = () => (
  <footer className="relative bg-night">
    <div className="mx-auto grid max-w-[1500px] gap-14 px-5 pb-10 pt-24 sm:px-10 lg:grid-cols-12">
      <div className="lg:col-span-7">
        <p className="font-head text-[10vw] font-semibold leading-[0.95] tracking-[-0.045em] sm:text-[6vw] lg:text-[4.2vw]">Есть идея сайта?</p>
        <button onClick={() => scrollToId('contact')} className="mt-8 rounded-full bg-lime px-7 py-4 text-[16px] font-semibold text-void transition-colors hover:bg-mist">
          Рассказать о проекте
        </button>
      </div>
      <nav className="flex flex-col items-start gap-3 lg:col-span-2" aria-label="Разделы">
        {NAV.map((n) => (
          <button key={n.id} onClick={() => scrollToId(n.id)} className="text-[16px] text-haze transition-colors hover:text-mist">
            {n.label}
          </button>
        ))}
      </nav>
      <p className="text-[15px] leading-[1.55] text-haze lg:col-span-3">Мир сайтов — студия из Москвы. Делаем магазины с админкой, промо-сайты с 3D и мини-приложения в Telegram.</p>
    </div>
    <div className="mx-auto flex max-w-[1500px] flex-col gap-3 px-5 pb-8 text-[13px] text-haze/80 sm:flex-row sm:items-end sm:justify-between sm:px-10">
      <div className="max-w-3xl">
        <span>© {new Date().getFullYear()} Мир сайтов. Все права защищены: код, дизайн и тексты сайта нельзя копировать без нашего разрешения.</span>
        {CREDITS.length > 0 && (
          <span>
            {' '}3D-модели:{' '}
            {CREDITS.map((c, i) => (
              <React.Fragment key={c.url}>
                <a href={c.url} target="_blank" rel="noreferrer" className="underline-offset-2 hover:text-mist hover:underline">
                  «{c.name}» — {c.author}
                </a>
                {i < CREDITS.length - 1 ? ', ' : ''}
              </React.Fragment>
            ))}
            {' '}(CC BY 4.0, Sketchfab).
          </span>
        )}
      </div>
      <button onClick={scrollToTop} className="shrink-0 text-left hover:text-mist">
        Наверх
      </button>
    </div>
  </footer>
);

export default Footer;
