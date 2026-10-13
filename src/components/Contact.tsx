import React, { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CONTACTS } from '../data';
import { Arrow, Eyebrow, Magnetic } from './ui';

const TYPES = ['Интернет-магазин', 'Промо-сайт', 'Лендинг', 'Telegram Mini App', '3D-сайт', 'Пока не знаю'];
const BUDGETS = ['до 50 тыс. ₽', '50–150 тыс. ₽', '150–300 тыс. ₽', '300 тыс. ₽ +'];

const Chip: React.FC<{ on: boolean; onClick: () => void; children: React.ReactNode }> = ({ on, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={on}
    className={`rounded-full border px-4 py-2.5 text-[14px] font-semibold transition-all duration-300 ${on ? 'border-lime bg-lime text-void' : 'border-white/15 hover:border-white/40'}`}
  >
    {children}
  </button>
);

// Финал: огромный вопрос с «прожектором» за курсором + короткий бриф в два клика
const Contact: React.FC = () => {
  const title = useRef<HTMLDivElement>(null);
  const [types, setTypes] = useState<string[]>([]);
  const [budget, setBudget] = useState('');
  const [copied, setCopied] = useState(false);

  const move = (e: React.PointerEvent) => {
    const el = title.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--x', `${((e.clientX - r.left) / r.width) * 100}%`);
    el.style.setProperty('--y', `${((e.clientY - r.top) / r.height) * 100}%`);
  };

  const brief = `Здравствуйте! Хочу сайт.${types.length ? `\nЧто нужно: ${types.join(', ')}.` : ''}${budget ? `\nБюджет: ${budget}.` : ''}`;
  const toggle = (t: string) => setTypes((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]));
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(brief);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      /* буфер обмена недоступен */
    }
  };
  const hasContacts = !!(CONTACTS.telegram || CONTACTS.email || CONTACTS.phone);

  return (
    <section id="contact" className="relative overflow-hidden py-28 sm:py-40" onPointerMove={move}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[70%] bg-[radial-gradient(50%_60%_at_50%_0%,rgba(139,108,255,.25),transparent_70%)]" />
      <div className="relative mx-auto max-w-[1500px] px-5 sm:px-10">
        <Eyebrow n="05">Контакты</Eyebrow>
        <div
          ref={title}
          className="mt-8 font-display text-[15vw] font-semibold leading-[0.86] tracking-[-0.045em] sm:text-[11vw] lg:text-[9vw]"
          style={{
            background: 'radial-gradient(28% 45% at var(--x,50%) var(--y,50%), #c8ff4d, #3ee6ff 35%, #8b6cff 60%, rgba(236,233,255,.92) 85%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          Создадим
          <br />
          ваш мир?
        </div>

        <div className="mt-14 grid gap-12 lg:grid-cols-2 lg:gap-20">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-haze">Что нужно</div>
            <div className="mt-4 flex flex-wrap gap-2">
              {TYPES.map((t) => (
                <Chip key={t} on={types.includes(t)} onClick={() => toggle(t)}>
                  {t}
                </Chip>
              ))}
            </div>
            <div className="mt-8 font-mono text-[11px] uppercase tracking-[0.25em] text-haze">Бюджет</div>
            <div className="mt-4 flex flex-wrap gap-2">
              {BUDGETS.map((b) => (
                <Chip key={b} on={budget === b} onClick={() => setBudget(budget === b ? '' : b)}>
                  {b}
                </Chip>
              ))}
            </div>
          </div>

          <div className="flex flex-col justify-between gap-8 rounded-[28px] border border-white/10 bg-night/70 p-6 backdrop-blur sm:p-8">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-haze">Ваше сообщение</div>
              <motion.pre layout className="mt-4 whitespace-pre-wrap font-sans text-[17px] leading-relaxed text-mist">
                {brief}
              </motion.pre>
            </div>
            <div className="flex flex-wrap gap-3">
              {CONTACTS.telegram && (
                <Magnetic>
                  <a href={CONTACTS.telegram} target="_blank" rel="noreferrer" onClick={copy} className="flex items-center gap-2 rounded-full bg-lime px-6 py-3.5 font-bold text-void">
                    Написать в Telegram <Arrow />
                  </a>
                </Magnetic>
              )}
              {CONTACTS.email && (
                <Magnetic>
                  <a
                    href={`mailto:${CONTACTS.email}?subject=${encodeURIComponent('Хочу сайт')}&body=${encodeURIComponent(brief)}`}
                    className="flex items-center gap-2 rounded-full border border-white/20 px-6 py-3.5 font-bold hover:border-white/50"
                  >
                    На почту <Arrow />
                  </a>
                </Magnetic>
              )}
              {CONTACTS.phone && (
                <a href={`tel:${CONTACTS.phone.replace(/[^\d+]/g, '')}`} className="flex items-center rounded-full border border-white/20 px-6 py-3.5 font-bold hover:border-white/50">
                  {CONTACTS.phone}
                </a>
              )}
              <button onClick={copy} className={`relative rounded-full px-6 py-3.5 font-bold ${hasContacts ? 'border border-white/20 hover:border-white/50' : 'bg-lime text-void'}`}>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span key={String(copied)} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }} className="block">
                    {copied ? 'Скопировано ✓' : 'Скопировать текст'}
                  </motion.span>
                </AnimatePresence>
              </button>
            </div>
            {CONTACTS.telegram && <p className="-mt-4 text-[12px] text-haze">Текст скопируется сам — останется вставить его в чат.</p>}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
