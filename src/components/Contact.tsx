import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CONTACTS } from '../data';
import { Arrow, Rise, Up } from './ui';

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
    className={`rounded-full px-4 py-2.5 text-[15px] font-medium transition-colors duration-300 ${on ? 'bg-lime text-void' : 'bg-white/[0.06] hover:bg-white/[0.12]'}`}
  >
    {children}
  </button>
);

const Contact: React.FC = () => {
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
    <section id="contact" className="relative py-32 sm:py-48">
      <div className="relative mx-auto max-w-[1500px] px-5 sm:px-10">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
          <h2 className="font-head text-[15vw] font-semibold leading-[0.9] tracking-[-0.055em] sm:text-[11vw] lg:col-span-8 lg:text-[8.5vw]">
            <Rise text="Создадим" />
            <br />
            <Rise text="ваш мир?" delay={0.12} />
          </h2>
          <Up as="p" delay={0.2} className="max-w-md text-[17px] leading-[1.55] text-haze lg:col-span-4">
            Ответьте на пять коротких вопросов — справа соберётся готовое сообщение. Его останется отправить нам.
          </Up>
        </div>

        <div className="mt-14 grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-12">
          {/* шаги брифа */}
          <div className="rounded-[6px] bg-night p-5 sm:p-8">
            <div className="flex flex-wrap gap-1.5">
              {STEPS.map((s, i) => (
                <button
                  key={s}
                  onClick={() => setStep(i)}
                  className={`rounded-full px-4 py-2 text-[14px] font-medium transition-colors ${step === i ? 'bg-mist text-void' : 'text-haze hover:text-mist'}`}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="mt-3 h-1 overflow-hidden bg-white/10">
              <motion.div className="h-full bg-lime" animate={{ width: `${(filled / 5) * 100}%` }} />
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
                    <div className="font-head text-2xl font-semibold">Пара слов о вас</div>
                    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Как вас зовут" className="rounded-[6px] bg-white/[0.06] px-4 py-3.5 text-[16px] outline-none focus:bg-white/[0.1] focus:ring-2 focus:ring-lime" />
                    <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Telegram или телефон для ответа" className="rounded-[6px] bg-white/[0.06] px-4 py-3.5 text-[16px] outline-none focus:bg-white/[0.1] focus:ring-2 focus:ring-lime" />
                    <textarea value={about} onChange={(e) => setAbout(e.target.value)} rows={3} placeholder="О проекте: чем занимаетесь, что нравится, примеры сайтов" className="resize-none rounded-[6px] bg-white/[0.06] px-4 py-3.5 text-[16px] outline-none focus:bg-white/[0.1] focus:ring-2 focus:ring-lime" />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            <div className="mt-6 flex items-center justify-between">
              <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="rounded-full bg-white/[0.06] px-5 py-2.5 text-[15px] font-medium disabled:opacity-30">
                ← Назад
              </button>
              {step < STEPS.length - 1 ? (
                <button onClick={() => setStep((s) => s + 1)} className="rounded-full bg-mist px-6 py-2.5 text-[15px] font-semibold text-void">
                  Дальше →
                </button>
              ) : (
                <span className="text-[15px] text-lime">Готово — отправьте сообщение</span>
              )}
            </div>
          </div>

          {/* письмо */}
          <div className="flex flex-col gap-6 rounded-[6px] bg-mist p-6 text-void sm:p-8">
            <div>
              <div className="flex items-center justify-between text-[14px] text-void/60">
                <span>Ваше сообщение</span>
                <span>
                  {filled}/5
                </span>
              </div>
              <motion.pre layout className="mt-4 min-h-[160px] whitespace-pre-wrap font-sans text-[18px] leading-[1.5] text-void">
                {brief}
              </motion.pre>
            </div>
            <div className="mt-auto flex flex-wrap gap-3">
              {CONTACTS.telegram && (
                <a href={CONTACTS.telegram} target="_blank" rel="noreferrer" onClick={copy} className="flex items-center gap-2 rounded-full bg-void px-6 py-3.5 font-semibold text-mist">
                    Написать в Telegram <Arrow />
                  </a>
              )}
              {CONTACTS.email && (
                  <a
                    href={`mailto:${CONTACTS.email}?subject=${encodeURIComponent('Хочу сайт')}&body=${encodeURIComponent(brief)}`}
                    className="flex items-center gap-2 rounded-full px-6 py-3.5 font-semibold ring-1 ring-inset ring-void/25 hover:ring-void/60"
                  >
                    На почту <Arrow />
                  </a>
              )}
              {CONTACTS.phone && (
                <a href={`tel:${CONTACTS.phone.replace(/[^\d+]/g, '')}`} className="flex items-center rounded-full px-6 py-3.5 font-semibold ring-1 ring-inset ring-void/25 hover:ring-void/60">
                  {CONTACTS.phone}
                </a>
              )}
              <button onClick={copy} className={`rounded-full px-6 py-3.5 font-semibold ${hasContacts ? 'ring-1 ring-inset ring-void/25 hover:ring-void/60' : 'bg-void text-mist'}`}>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span key={String(copied)} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }} className="block">
                    {copied ? 'Скопировано ✓' : 'Скопировать текст'}
                  </motion.span>
                </AnimatePresence>
              </button>
            </div>
            {CONTACTS.telegram && <p className="-mt-3 text-[13px] text-void/60">Текст скопируется сам — останется вставить его в чат.</p>}
          </div>
        </div>

        {/* что дальше + вопросы */}
        <div className="mt-32 grid gap-16 lg:grid-cols-2 lg:gap-16">
          <div>
            <h3 className="font-head text-[32px] font-semibold tracking-[-0.03em]">Что будет после заявки</h3>
            <ol className="mt-8 space-y-7">
              {NEXT.map((n, i) => (
                <motion.li
                  key={n.t}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.12, duration: 0.7 }}
                >
                  <div className="text-[21px] font-semibold tracking-[-0.02em]">{n.t}</div>
                  <p className="mt-1 max-w-md text-[16px] leading-[1.55] text-haze">{n.d}</p>
                </motion.li>
              ))}
            </ol>
          </div>
          <div>
            <h3 className="font-head text-[32px] font-semibold tracking-[-0.03em]">Частые вопросы</h3>
            <div className="mt-6 space-y-1">
              {FAQ.map((f, i) => (
                <div key={f.q}>
                  <button onClick={() => setFaq(faq === i ? null : i)} className="flex w-full items-center justify-between gap-4 rounded-[6px] bg-white/[0.04] px-5 py-4 text-left text-[18px] font-semibold transition-colors hover:bg-white/[0.08]" aria-expanded={faq === i}>
                    {f.q}
                    <span className={`text-[22px] leading-none transition-transform duration-300 ${faq === i ? 'rotate-45 text-lime' : 'text-haze'}`}>+</span>
                  </button>
                  <AnimatePresence initial={false}>
                    {faq === i && (
                      <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden px-5 pb-5 pt-1 text-[16px] leading-[1.55] text-haze">
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
      <div className="text-[24px] font-semibold tracking-[-0.02em]">{title}</div>
      {hint && <span className="text-[14px] text-haze">{hint}</span>}
    </div>
    <div className="mt-5 flex flex-wrap gap-2">{children}</div>
  </div>
);

export default Contact;
