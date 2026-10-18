import React, { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CONTACTS, TEAM } from '../data';
import Chibi from './Chibi';
import { Arrow, Eyebrow, Magnetic } from './ui';

// Финал: бриф в пять шагов — справа сразу собирается готовое сообщение. Ниже — что будет дальше и частые вопросы.
const TYPES = ['Интернет-магазин', 'Промо-сайт', 'Лендинг', 'Telegram Mini App', '3D-сайт', 'Корпоративный сайт', 'Пока не знаю'];
const FEATURES = ['Каталог и корзина', 'Онлайн-оплата', 'Админ-панель', 'Заявки в Telegram', '3D-модели', 'Анимации', 'Личный кабинет', 'Блог / новости', 'Мультиязычность', 'Интеграция с CRM'];
const TERMS = ['Как можно скорее', '2–4 недели', '1–2 месяца', 'Не горит'];
const BUDGETS = ['до 50 тыс. ₽', '50–150 тыс. ₽', '150–300 тыс. ₽', '300 тыс. ₽ +', 'Обсудим'];
const STEPS = ['Что делаем', 'Что нужно', 'Сроки', 'Бюджет', 'О вас'];

const NEXT = [
  { t: 'Отвечаем', d: 'Читаем бриф и пишем вам — уточним детали и предложим, как сделать лучше.' },
  { t: 'Созваниваемся', d: 'Короткий звонок: обсуждаем идею, показываем похожие работы, называем сроки и цену.' },
  { t: 'Показываем концепт', d: 'Первые экраны в дизайне — вы видите сайт до того, как он написан.' },
];

const FAQ = [
  { q: 'Сколько стоит сайт?', a: 'Зависит от задачи: лендинг, промо-сайт и магазин с админкой — разные по объёму работы. Заполните бриф — назовём точную цену после короткого созвона.' },
  { q: 'Сколько времени займёт?', a: 'Лендинг — от пары недель, магазин с админкой и интеграциями — дольше. Сроки фиксируем до старта и держим вас в курсе по ходу работы.' },
  { q: 'Можно будет менять сайт самим?', a: 'Да. Для магазинов делаем админ-панель: товары, цены, заказы и тексты меняются без программиста.' },
  { q: 'Поможете с доменом и хостингом?', a: 'Да: домен, хостинг, HTTPS, настройка скорости и запуск — берём на себя.' },
  { q: 'Что после запуска?', a: 'Остаёмся рядом: правки, доработки и новые функции — по мере роста вашего бизнеса.' },
];

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

const Contact: React.FC = () => {
  const title = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const [types, setTypes] = useState<string[]>([]);
  const [features, setFeatures] = useState<string[]>([]);
  const [term, setTerm] = useState('');
  const [budget, setBudget] = useState('');
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [about, setAbout] = useState('');
  const [copied, setCopied] = useState(false);
  const [faq, setFaq] = useState<number | null>(0);

  const move = (e: React.PointerEvent) => {
    const el = title.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--x', `${((e.clientX - r.left) / r.width) * 100}%`);
    el.style.setProperty('--y', `${((e.clientY - r.top) / r.height) * 100}%`);
  };
  const toggle = (list: string[], set: (v: string[]) => void, t: string) => set(list.includes(t) ? list.filter((x) => x !== t) : [...list, t]);

  const brief = [
    `Здравствуйте!${name ? ` Меня зовут ${name}.` : ''} Хочу сайт.`,
    types.length ? `Что нужно: ${types.join(', ')}.` : '',
    features.length ? `Важно: ${features.join(', ').toLowerCase()}.` : '',
    term ? `Сроки: ${term.toLowerCase()}.` : '',
    budget ? `Бюджет: ${budget}.` : '',
    about.trim() ? `\n${about.trim()}` : '',
    contact ? `\nКак связаться: ${contact}` : '',
  ]
    .filter(Boolean)
    .join('\n');
  const filled = [types.length > 0, features.length > 0, !!term, !!budget, !!(name || contact)].filter(Boolean).length;

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
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[80%] bg-[radial-gradient(45%_40%_at_50%_45%,rgba(139,108,255,.2),transparent_75%)]" />
      <div className="relative mx-auto max-w-[1500px] px-5 sm:px-10">
        <Eyebrow n="07">Контакты</Eyebrow>
        <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div
            ref={title}
            className="font-display text-[15vw] font-semibold leading-[0.86] tracking-[-0.045em] sm:text-[11vw] lg:text-[8.5vw]"
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
          <div className="flex items-end gap-1">
            {TEAM.map((m, i) => (
              <Chibi key={m.id} m={m} size={84} mode={filled >= 5 ? 'cheer' : 'idle'} className={i === 1 ? 'mb-3' : ''} />
            ))}
          </div>
        </div>

        <div className="mt-14 grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-12">
          {/* шаги брифа */}
          <div className="rounded-[28px] border border-white/10 bg-night/70 p-5 sm:p-7">
            <div className="flex flex-wrap gap-1.5">
              {STEPS.map((s, i) => (
                <button
                  key={s}
                  onClick={() => setStep(i)}
                  className={`flex items-center gap-2 rounded-full px-3.5 py-2 text-[12px] font-bold transition-colors ${step === i ? 'bg-mist text-void' : 'text-haze hover:text-mist'}`}
                >
                  <span className={`grid h-5 w-5 place-items-center rounded-full text-[10px] ${step === i ? 'bg-void text-mist' : 'bg-white/10'}`}>{i + 1}</span>
                  {s}
                </button>
              ))}
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
              <motion.div className="h-full rounded-full bg-gradient-to-r from-violet via-cyan to-lime" animate={{ width: `${(filled / 5) * 100}%` }} />
            </div>

            <AnimatePresence mode="wait">
              <motion.div key={step} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.3 }} className="mt-7 min-h-[230px]">
                {step === 0 && (
                  <Field title="Какой сайт нужен?" hint="можно несколько">
                    {TYPES.map((t) => (
                      <Chip key={t} on={types.includes(t)} onClick={() => toggle(types, setTypes, t)}>
                        {t}
                      </Chip>
                    ))}
                  </Field>
                )}
                {step === 1 && (
                  <Field title="Что должно быть на сайте?" hint="отметьте важное">
                    {FEATURES.map((t) => (
                      <Chip key={t} on={features.includes(t)} onClick={() => toggle(features, setFeatures, t)}>
                        {t}
                      </Chip>
                    ))}
                  </Field>
                )}
                {step === 2 && (
                  <Field title="Когда нужен запуск?">
                    {TERMS.map((t) => (
                      <Chip key={t} on={term === t} onClick={() => setTerm(term === t ? '' : t)}>
                        {t}
                      </Chip>
                    ))}
                  </Field>
                )}
                {step === 3 && (
                  <Field title="Ориентир по бюджету">
                    {BUDGETS.map((t) => (
                      <Chip key={t} on={budget === t} onClick={() => setBudget(budget === t ? '' : t)}>
                        {t}
                      </Chip>
                    ))}
                  </Field>
                )}
                {step === 4 && (
                  <div className="grid gap-3">
                    <div className="font-display text-2xl font-semibold">Пара слов о вас</div>
                    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Как вас зовут" className="rounded-2xl border border-white/15 bg-white/[0.04] px-4 py-3.5 text-[15px] outline-none focus:border-lime" />
                    <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Telegram или телефон для ответа" className="rounded-2xl border border-white/15 bg-white/[0.04] px-4 py-3.5 text-[15px] outline-none focus:border-lime" />
                    <textarea value={about} onChange={(e) => setAbout(e.target.value)} rows={3} placeholder="О проекте: чем занимаетесь, что нравится, примеры сайтов" className="resize-none rounded-2xl border border-white/15 bg-white/[0.04] px-4 py-3.5 text-[15px] outline-none focus:border-lime" />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            <div className="mt-6 flex items-center justify-between">
              <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="rounded-full border border-white/15 px-5 py-2.5 text-[14px] font-bold disabled:opacity-30">
                ← Назад
              </button>
              {step < STEPS.length - 1 ? (
                <button onClick={() => setStep((s) => s + 1)} className="rounded-full bg-mist px-6 py-2.5 text-[14px] font-bold text-void">
                  Дальше →
                </button>
              ) : (
                <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-lime">готово — отправьте справа</span>
              )}
            </div>
          </div>

          {/* письмо */}
          <div className="flex flex-col gap-6 rounded-[28px] border border-white/10 bg-[#0d0c15] p-6 sm:p-8">
            <div>
              <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.25em] text-haze">
                <span>Ваше сообщение</span>
                <span>
                  {filled}/5
                </span>
              </div>
              <motion.pre layout className="mt-4 min-h-[160px] whitespace-pre-wrap font-sans text-[16px] leading-relaxed text-mist">
                {brief}
              </motion.pre>
            </div>
            <div className="mt-auto flex flex-wrap gap-3">
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
              <button onClick={copy} className={`rounded-full px-6 py-3.5 font-bold ${hasContacts ? 'border border-white/20 hover:border-white/50' : 'bg-lime text-void'}`}>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span key={String(copied)} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }} className="block">
                    {copied ? 'Скопировано ✓' : 'Скопировать текст'}
                  </motion.span>
                </AnimatePresence>
              </button>
            </div>
            {CONTACTS.telegram && <p className="-mt-3 text-[12px] text-haze">Текст скопируется сам — останется вставить его в чат.</p>}
          </div>
        </div>

        {/* что дальше + вопросы */}
        <div className="mt-16 grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-haze">Что будет после заявки</div>
            <ol className="mt-6 space-y-6">
              {NEXT.map((n, i) => (
                <motion.li
                  key={n.t}
                  className="flex gap-5"
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.12, duration: 0.7 }}
                >
                  <span className="font-display text-4xl font-semibold text-lime">0{i + 1}</span>
                  <div>
                    <div className="font-display text-xl font-semibold">{n.t}</div>
                    <p className="mt-1 text-[15px] leading-relaxed text-haze">{n.d}</p>
                  </div>
                </motion.li>
              ))}
            </ol>
          </div>
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-haze">Частые вопросы</div>
            <div className="mt-4 divide-y divide-white/10 border-y border-white/10">
              {FAQ.map((f, i) => (
                <div key={f.q}>
                  <button onClick={() => setFaq(faq === i ? null : i)} className="flex w-full items-center justify-between gap-4 py-4 text-left font-display text-lg font-semibold" aria-expanded={faq === i}>
                    {f.q}
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/15 transition-transform duration-300 ${faq === i ? 'rotate-45 bg-lime text-void' : ''}`}>+</span>
                  </button>
                  <AnimatePresence initial={false}>
                    {faq === i && (
                      <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden pb-4 text-[15px] leading-relaxed text-haze">
                        {f.a}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const Field: React.FC<{ title: string; hint?: string; children: React.ReactNode }> = ({ title, hint, children }) => (
  <div>
    <div className="flex items-baseline gap-3">
      <div className="font-display text-2xl font-semibold">{title}</div>
      {hint && <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-haze">{hint}</span>}
    </div>
    <div className="mt-5 flex flex-wrap gap-2">{children}</div>
  </div>
);

export default Contact;
