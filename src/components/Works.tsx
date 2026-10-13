import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useTransform } from 'motion/react';
import { WORKS, type Work } from '../data';
import { useSectionProgress } from '../lib/progress';
import { scrollToId } from '../lib/smooth';
import { BrowserFrame, PhoneFrame } from './Devices';
import LiveModal from './LiveModal';
import { Arrow, Eyebrow, Magnetic, SplitReveal } from './ui';

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

const Scene: React.FC<{ w: Work; i: number; onLive: (w: Work) => void; desktop: boolean }> = ({ w, i, onLive, desktop }) => {
  const ref = useRef<HTMLElement>(null);
  const p = useSectionProgress(ref);
  const phoneY = useTransform(p, [0, 1], [140, -140]);
  const extraY = useTransform(p, [0, 1], [220, -200]);
  const numY = useTransform(p, [0, 1], [-80, 80]);
  const flip = i % 2 === 1;
  const n = String(i + 1).padStart(2, '0');

  return (
    <article ref={ref} id={`work-${w.slug}`} data-work={i} className="relative flex items-center py-24 sm:py-32 lg:min-h-screen lg:py-24" style={{ color: w.ink }}>
      {/* огромный номер на фоне */}
      <motion.div
        aria-hidden
        style={{ y: numY, WebkitTextStroke: `1px ${w.ink}22` }}
        className={`pointer-events-none absolute top-10 select-none font-display text-[38vw] font-bold leading-none text-transparent lg:text-[26vw] ${flip ? 'left-[-2vw]' : 'right-[-2vw]'}`}
      >
        {n}
      </motion.div>

      <div className="relative mx-auto grid w-full max-w-[1500px] items-center gap-12 px-5 sm:px-10 lg:grid-cols-12 lg:gap-10">
        {/* текст */}
        <div className={`order-2 lg:col-span-5 ${flip ? 'lg:order-2 lg:col-start-8' : 'lg:order-1'}`}>
          <div className="mb-6 flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em]">
            <span style={{ color: w.accent }}>{n}</span>
            <span className="opacity-40">/</span>
            <span className="opacity-70">{w.kind}</span>
            <span className="ml-1 rounded-full border px-2.5 py-1 text-[10px]" style={{ borderColor: `${w.ink}33` }}>
              {w.status === 'Работает' && <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full align-middle" style={{ background: '#3ddc84' }} />}
              {w.status} · {w.year}
            </span>
          </div>
          <h3 className="font-display text-[13vw] font-semibold leading-[0.9] tracking-[-0.035em] sm:text-[8vw] lg:text-[5.4vw]">
            <SplitReveal text={w.name} />
          </h3>
          <motion.p
            className="mt-6 max-w-xl text-[16px] leading-relaxed opacity-80 sm:text-[18px]"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 0.8, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            {w.lead}
          </motion.p>
          <motion.ul
            className="mt-7 flex flex-wrap gap-2"
            initial="hide"
            whileInView="show"
            viewport={{ once: true }}
            variants={{ show: { transition: { staggerChildren: 0.06, delayChildren: 0.35 } } }}
          >
            {w.features.map((f) => (
              <motion.li
                key={f}
                variants={{ hide: { opacity: 0, y: 14, scale: 0.9 }, show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 22 } } }}
                className="rounded-full border px-3.5 py-1.5 text-[13px] font-semibold"
                style={{ borderColor: `${w.ink}26`, background: `${w.ink}0a` }}
              >
                {f}
              </motion.li>
            ))}
          </motion.ul>
          <div className="mt-6 font-mono text-[11px] uppercase tracking-[0.2em] opacity-55">{w.stack.join(' · ')}</div>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            {w.embed && (
              <Magnetic>
                <button
                  onClick={() => onLive(w)}
                  className="group relative flex items-center gap-3 overflow-hidden rounded-full py-3.5 pl-6 pr-4 font-bold"
                  style={{ background: w.accent, color: w.bg }}
                >
                  <span className="relative z-10">Посмотреть вживую</span>
                  <span className="relative z-10 grid h-7 w-7 place-items-center rounded-full transition-transform duration-500 group-hover:scale-110" style={{ background: w.bg, color: w.accent }}>
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </span>
                </button>
              </Magnetic>
            )}
            <Magnetic>
              <a
                href={w.url}
                target="_blank"
                rel="noreferrer"
                className="group flex items-center gap-2 rounded-full border px-6 py-3.5 font-bold transition-colors"
                style={w.embed ? { borderColor: `${w.ink}40` } : { background: w.accent, color: '#fff', borderColor: w.accent }}
              >
                Открыть сайт
                <Arrow className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </a>
            </Magnetic>
          </div>
        </div>

        {/* устройства */}
        <div className={`relative order-1 mt-6 lg:col-span-7 lg:my-0 ${flip ? 'lg:order-1' : 'lg:order-2'}`}>
          <motion.div
            initial={{ opacity: 0, y: 80, rotate: flip ? -2 : 2 }}
            whileInView={{ opacity: 1, y: 0, rotate: 0 }}
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
          <div className="-mt-10 flex items-start justify-center gap-4 px-2 lg:hidden">
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
};

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
    const root = document.documentElement.style;
    root.setProperty('--page-bg', cur ? cur.bg : '#07060c');
    root.setProperty('--page-glow', cur ? `${cur.accent}2e` : 'transparent');
  }, [cur]);
  const isDesktop = useIsDesktop();

  return (
    <section id="works" ref={section} className="relative">
      <div className="relative mx-auto max-w-[1500px] px-5 pb-10 pt-28 sm:px-10 sm:pt-40">
        <Eyebrow n="01">Работы</Eyebrow>
        <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <h2 className="font-display text-[14vw] font-semibold leading-[0.88] tracking-[-0.04em] sm:text-[10vw] lg:text-[7.5vw]">
            <SplitReveal text="Галактика" />
            <br />
            <SplitReveal text="проектов" delay={0.2} aurora />
          </h2>
          <p className="max-w-sm text-[15px] leading-relaxed text-haze sm:text-[17px]">
            Каждый сайт — свой мир со своим характером. Листайте: страница перекрасится под каждый из них, а промо-сайты можно открыть вживую прямо здесь.
          </p>
        </div>
      </div>

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
            className="fixed bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1 rounded-full border border-white/15 bg-void/90 p-1.5 text-mist shadow-2xl lg:bg-void/70 lg:backdrop-blur-xl"
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
              <span className="font-mono text-[11px] text-haze">
                <span className="text-mist">{String(active + 1).padStart(2, '0')}</span> / {String(WORKS.length).padStart(2, '0')}
              </span>
              <AnimatePresence mode="wait">
                <motion.span
                  key={cur.slug}
                  initial={{ y: 12, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -12, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="truncate whitespace-nowrap font-display text-[13px] font-semibold"
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
