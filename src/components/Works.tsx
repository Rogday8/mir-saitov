import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useTransform } from 'motion/react';
import { WORKS, type Work } from '../data';
import { useSectionProgress } from '../lib/progress';
import { scrollToId } from '../lib/smooth';
import { BrowserFrame, PhoneFrame } from './Devices';
import LiveModal from './LiveModal';
import { Arrow, Rise, Up } from './ui';

const base = import.meta.env.BASE_URL;

// На телефоне в окне браузера видео не играет (только в телефонах-макетах) — меньше нагрузка
function useIsDesktop() {
  const [d, setD] = useState(() => window.matchMedia('(min-width: 1024px)').matches);
  useEffect(() => {
    const m = window.matchMedia('(min-width: 1024px)');
    const on = () => setD(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return d;
}
const media = (slug: string, suffix = '') => `${base}works/${slug}${suffix}`;

// memo: при смене активной работы сцены не перерисовываются (иначе на границах работ подвисание ~70 мс)
const Scene = React.memo(function Scene({ w, i, onLive, desktop }: { w: Work; i: number; onLive: (w: Work) => void; desktop: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const p = useSectionProgress(ref);
  const phoneY = useTransform(p, [0, 1], [140, -140]);
  const extraY = useTransform(p, [0, 1], [220, -200]);
  const flip = i % 2 === 1;

  return (
    <article ref={ref} id={`work-${w.slug}`} data-work={i} className="relative flex items-center py-24 sm:py-32 lg:min-h-screen lg:py-24" style={{ color: w.ink }}>
      <div className="relative mx-auto grid w-full max-w-[1500px] items-center gap-12 px-5 sm:px-10 lg:grid-cols-12 lg:gap-10">
        {/* текст */}
        <div className={`order-2 lg:col-span-5 ${flip ? 'lg:order-2 lg:col-start-8' : 'lg:order-1'}`}>
          <p className="mb-5 text-[15px] opacity-70">
            {w.kind}, {w.year}
            {w.status === 'Работает' ? ' — работает' : ` — ${w.status.toLowerCase()}`}
          </p>
          <h3 className="font-head text-[14vw] font-semibold leading-[0.95] tracking-[-0.045em] sm:text-[9vw] lg:text-[5.6vw]">
            <Rise text={w.name} />
          </h3>
          <Up as="p" delay={0.15} className="mt-6 max-w-xl text-[17px] leading-[1.55] sm:text-[19px]">
            {w.lead}
          </Up>
          <Up delay={0.25} className="mt-7 max-w-xl">
            <p className="text-[15px] leading-[1.6] opacity-70">{w.features.join(' · ')}</p>
          </Up>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            {w.embed && (
              <button
                onClick={() => onLive(w)}
                className="rounded-full px-6 py-3.5 text-[15px] font-semibold transition-opacity hover:opacity-85"
                style={{ background: w.accent, color: w.bg }}
              >
                Посмотреть здесь
              </button>
            )}
            <a
              href={w.url}
              target="_blank"
              rel="noreferrer"
              className="group flex items-center gap-2 rounded-full px-6 py-3.5 text-[15px] font-semibold transition-opacity hover:opacity-85"
              style={w.embed ? { boxShadow: `inset 0 0 0 1.5px ${w.ink}55` } : { background: w.accent, color: '#fff' }}
            >
              Открыть сайт
              <Arrow className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </a>
          </div>
        </div>

        {/* устройства */}
        <div className={`relative order-1 mt-6 lg:col-span-7 lg:my-0 ${flip ? 'lg:order-1' : 'lg:order-2'}`}>
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-10% 0px' }}
            transition={{ duration: 1.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <BrowserFrame
              url={w.url}
              video={media(w.slug, '.mp4')}
              poster={media(w.slug, '.webp')}
              accent={w.accent}
              label={w.name}
              onOpen={w.embed ? () => onLive(w) : () => window.open(w.url, '_blank', 'noopener')}
              play={desktop}
            />
          </motion.div>
          {/* компьютер: телефоны лежат поверх окна и плывут при прокрутке */}
          <motion.div style={{ y: phoneY }} className={`absolute -bottom-20 hidden w-[28%] max-w-[210px] lg:block ${flip ? '-right-6' : '-left-8'}`}>
            <PhoneFrame src={media(w.slug, '-mobile.webp')} video={desktop ? media(w.slug, '-m.mp4') : undefined} alt={`${w.name} на телефоне`} />
          </motion.div>
          {w.extra && (
            <motion.div style={{ y: extraY }} className={`absolute -top-14 hidden w-[24%] max-w-[180px] lg:block ${flip ? '-left-4' : '-right-8'}`}>
              <PhoneFrame src={`${base}${w.extra.src}`} video={desktop && w.extra.video ? `${base}${w.extra.video}` : undefined} alt={w.extra.label} label={w.extra.label} />
            </motion.div>
          )}
          {/* телефон: макеты рядом под окном, крупно, с видео */}
          <div className="mt-8 flex items-start justify-center gap-4 px-2 lg:hidden">
            <PhoneFrame
              className="w-[44%] max-w-[200px]"
              src={media(w.slug, '-mobile.webp')}
              video={!desktop ? media(w.slug, '-m.mp4') : undefined}
              alt={`${w.name} на телефоне`}
            />
            {w.extra && (
              <PhoneFrame
                className="mt-8 w-[44%] max-w-[200px]"
                src={`${base}${w.extra.src}`}
                video={!desktop && w.extra.video ? `${base}${w.extra.video}` : undefined}
                alt={w.extra.label}
                label="Telegram"
              />
            )}
          </div>
        </div>
      </div>
    </article>
  );
});

const WorksHead = React.memo(function WorksHead() {
  return (
    <div className="relative mx-auto grid max-w-[1500px] gap-8 px-5 pb-8 pt-32 sm:px-10 sm:pt-44 lg:grid-cols-12">
      <h2 className="font-head text-[12vw] font-semibold leading-[0.95] tracking-[-0.045em] sm:text-[8vw] lg:col-span-8 lg:text-[6.2vw]">
        <Rise text="Шесть сайтов," />
        <br />
        <Rise text="шесть характеров" delay={0.12} />
      </h2>
      <Up as="p" delay={0.2} className="max-w-md self-end text-[17px] leading-[1.55] text-haze lg:col-span-4">
        Магазин с админкой и пять промо-сайтов. Листайте — страница перекрашивается в цвета каждого, а промо-сайты открываются прямо здесь.
      </Up>
    </div>
  );
});

const Works: React.FC = () => {
  const [active, setActive] = useState(-1);
  const [live, setLive] = useState<Work | null>(null);
  const [inSection, setInSection] = useState(false);
  const section = useRef<HTMLElement>(null);

  useEffect(() => {
    const scenes = [...document.querySelectorAll<HTMLElement>('[data-work]')];
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.work));
      },
      { rootMargin: '-48% 0px -48% 0px' },
    );
    scenes.forEach((s) => io.observe(s));
    const sec = new IntersectionObserver(
      (e) => {
        setInSection(e[0].isIntersecting);
        // ушли из раздела вверх или вниз — фон плавно возвращается к тёмному
        if (!e[0].isIntersecting) setActive(-1);
      },
      { rootMargin: '-40% 0px -40% 0px' },
    );
    if (section.current) sec.observe(section.current);
    return () => {
      io.disconnect();
      sec.disconnect();
    };
  }, []);

  // «Открыть работу» с планеты сайтов: промо-сайт — сразу вживую, магазин — прокрутить к его сцене
  useEffect(() => {
    const on = (e: Event) => {
      const w = WORKS.find((x) => x.slug === (e as CustomEvent<string>).detail);
      if (!w) return;
      if (w.embed) setLive(w);
      else scrollToId(`work-${w.slug}`);
    };
    window.addEventListener('mir:open-work', on);
    return () => window.removeEventListener('mir:open-work', on);
  }, []);

  const cur = active >= 0 ? WORKS[active] : null;
  // фон всей страницы (слой .page-bg) перекрашивается в цвета работы на экране — без швов между блоками
  useEffect(() => {
    const bg = document.getElementById('page-bg');
    if (!bg) return;
    bg.style.backgroundColor = cur ? cur.bg : '#0b0b0c';
    const glow = bg.firstElementChild as HTMLElement | null;
    if (glow) {
      glow.style.opacity = cur ? '1' : '0';
      // без цветного свечения: фон работы — один ровный цвет
      glow.style.background = 'none';
    }
  }, [cur]);
  const isDesktop = useIsDesktop();

  return (
    <section id="works" ref={section} className="relative">
      <WorksHead />

      {WORKS.map((w, i) => (
        <Scene key={w.slug} w={w} i={i} onLive={setLive} desktop={isDesktop} />
      ))}

      {/* плашка-навигатор по работам внизу экрана */}
      <AnimatePresence>
        {inSection && cur && (
          <motion.nav
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1 rounded-full bg-void p-1.5 text-mist shadow-[0_12px_40px_-12px_rgba(0,0,0,.6)]"
            aria-label="Работы"
          >
            <button
              onClick={() => active > 0 && scrollToId(`work-${WORKS[active - 1].slug}`)}
              disabled={active <= 0}
              className="grid h-9 w-9 place-items-center rounded-full transition-colors hover:bg-white/10 disabled:opacity-30"
              aria-label="Предыдущая работа"
            >
              ←
            </button>
            <div className="flex min-w-[170px] max-w-[60vw] items-center gap-3 px-2">
              <span className="text-[13px] tabular-nums text-haze">
                <span className="text-mist">{active + 1}</span> из {WORKS.length}
              </span>
              <AnimatePresence mode="wait">
                <motion.span
                  key={cur.slug}
                  initial={{ y: 12, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -12, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="truncate whitespace-nowrap text-[14px] font-semibold"
                >
                  {cur.name}
                </motion.span>
              </AnimatePresence>
            </div>
            <div className="mx-1 hidden h-1 w-20 overflow-hidden rounded-full bg-white/10 sm:block">
              <motion.div className="h-full rounded-full" style={{ background: cur.accent }} animate={{ width: `${((active + 1) / WORKS.length) * 100}%` }} />
            </div>
            <button
              onClick={() => active < WORKS.length - 1 && scrollToId(`work-${WORKS[active + 1].slug}`)}
              disabled={active >= WORKS.length - 1}
              className="grid h-9 w-9 place-items-center rounded-full transition-colors hover:bg-white/10 disabled:opacity-30"
              aria-label="Следующая работа"
            >
              →
            </button>
          </motion.nav>
        )}
      </AnimatePresence>

      <LiveModal work={live} onClose={() => setLive(null)} />
    </section>
  );
};

export default Works;
