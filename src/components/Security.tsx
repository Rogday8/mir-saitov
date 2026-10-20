import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { TEAM } from '../data';
import { scrollToId } from '../lib/smooth';
import { Rise, Up } from './ui';

// «Защита»: демонстрация — сайт захватывает вирус-вымогатель, появляется команда «Мира сайтов»,
// устраняет угрозу и возвращает сайт. Ниже — из чего состоит защита.
type Phase = 'idle' | 'loading' | 'site' | 'attack' | 'ransom' | 'rescue' | 'safe';

const base = import.meta.env.BASE_URL;

const RESCUE = [
  { t: 'Атака обнаружена: вымогатель шифрует файлы', ok: false },
  { t: 'Сервер изолирован, внешний доступ закрыт', ok: true },
  { t: 'Источник атаки заблокирован', ok: true },
  { t: 'Восстановление из резервной копии за 03:00', ok: true },
  { t: 'Уязвимость закрыта, ключи доступа обновлены', ok: true },
  { t: 'Угроза устранена. Данные клиентов не пострадали', ok: true },
];

const CRYPT = [
  'encrypt /var/www/catalog ............ 100%',
  'encrypt /db/orders.sql .............. 100%',
  'encrypt /db/customers.sql ........... 87%',
  'lock admin panel .................... ok',
  'replace index.html .................. ok',
  'send keys to remote host ............ ok',
];

const SHIELD = [
  { t: 'HTTPS', d: 'Сертификат с автопродлением: данные между покупателем и сайтом не перехватить.' },
  { t: 'Резервные копии', d: 'Каждый день, автоматически. Если что-то случится — вернём сайт и данные из копии.' },
  { t: 'Вход в админку', d: 'Пароль и код из Telegram, блокировка после неверных попыток, уведомление о каждом входе.' },
  { t: 'Защита от ботов', d: 'Ограничиваем частоту запросов и проверяем формы — подбор паролей и спам не проходят.' },
  { t: 'Обновления', d: 'Следим за уязвимостями в библиотеках и за доступностью сайта, вовремя обновляем.' },
  { t: 'Персональные данные', d: 'Согласия, политика и хранение данных клиентов — по требованиям 152-ФЗ.' },
];

const PRODUCTS = [
  { n: 'Смартфон', p: '79 990 ₽', icon: 'M19 4h10a2 2 0 0 1 2 2v20a2 2 0 0 1-2 2H19a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM22 7h4M23 25h2' },
  { n: 'Ноутбук', p: '129 990 ₽', icon: 'M12 7h24a1.5 1.5 0 0 1 1.5 1.5V23h-27V8.5A1.5 1.5 0 0 1 12 7zM7 23h34l-2 3H9zM21 24.5h6' },
  { n: 'Наушники', p: '19 990 ₽', icon: 'M13 20v-4a11 11 0 0 1 22 0v4M13 19h3a1.5 1.5 0 0 1 1.5 1.5v4A1.5 1.5 0 0 1 16 26h-1.5a1.5 1.5 0 0 1-1.5-1.5zM35 19h-3a1.5 1.5 0 0 0-1.5 1.5v4A1.5 1.5 0 0 0 32 26h1.5a1.5 1.5 0 0 0 1.5-1.5z' },
];

// Демо-магазин внутри окна
const Store: React.FC<{ broken: boolean }> = ({ broken }) => (
  <div className={`h-full bg-[#f6f4ef] text-[#1b1a17] transition-[filter] duration-300 ${broken ? 'sec-corrupt' : ''}`}>
    <div className="flex items-center justify-between border-b border-black/10 px-5 py-3 sm:px-7">
      <div className="font-head text-[15px] font-semibold tracking-tight">Север · техника</div>
      <div className="hidden gap-5 text-[12px] font-medium text-black/60 sm:flex">
        <span>Каталог</span>
        <span>Доставка</span>
        <span>Контакты</span>
      </div>
      <div className="rounded-full bg-black px-3 py-1 text-[11px] font-semibold text-white">Корзина · 2</div>
    </div>
    <div className="grid gap-4 p-5 sm:grid-cols-[1.2fr_1fr] sm:p-7">
      <div className="flex flex-col justify-center">
        <div className="text-[12px] text-black/50">Новинки недели</div>
        <div className="mt-2 font-head text-[26px] font-semibold leading-[1.05] tracking-tight sm:text-[34px]">Ноутбуки и смартфоны с доставкой сегодня</div>
        <div className="mt-4 flex gap-2">
          <span className="rounded-full bg-black px-4 py-2 text-[12px] font-semibold text-white">Смотреть каталог</span>
          <span className="rounded-full border border-black/15 px-4 py-2 text-[12px] font-semibold">Trade-in</span>
        </div>
      </div>
      <div className="relative min-h-[130px] overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#d9d4c7,#efe9dc)]">
        <div className="absolute bottom-0 left-1/2 h-[78%] w-[44%] -translate-x-1/2 rounded-t-[18px] border-[5px] border-b-0 border-[#2b2a27] bg-[linear-gradient(160deg,#3a3f52,#1c1e26)]" />
      </div>
    </div>
    <div className="grid grid-cols-3 gap-3 px-5 pb-6 sm:px-7">
      {PRODUCTS.map((pr) => (
        <div key={pr.n} className="rounded-xl bg-white p-3 shadow-[0_1px_0_rgba(0,0,0,.05)]">
          <div className="grid h-16 place-items-center rounded-lg bg-[#efebe2] text-[#3a3833] sm:h-24">
            <svg viewBox="0 0 48 32" className="h-10 w-14 sm:h-14 sm:w-20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d={pr.icon} />
            </svg>
          </div>
          <div className="mt-2 text-[12px] font-medium">{pr.n}</div>
          <div className="text-[13px] font-semibold">{pr.p}</div>
        </div>
      ))}
    </div>
  </div>
);

const pad = (n: number) => String(n).padStart(2, '0');

const Security: React.FC = () => {
  const [phase, setPhase] = useState<Phase>('idle');
  const [lines, setLines] = useState(0);
  const [left, setLeft] = useState(24 * 3600 - 1);
  const timers = useRef<number[]>([]);

  const clear = () => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
  };
  const at = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));
  useEffect(() => clear, []);

  const run = () => {
    clear();
    setLines(0);
    setLeft(24 * 3600 - 1);
    setPhase('loading');
    at(900, () => setPhase('site'));
    at(3000, () => setPhase('attack'));
    at(5600, () => setPhase('ransom'));
    at(9200, () => setPhase('rescue'));
    RESCUE.forEach((_, i) => at(9900 + i * 750, () => setLines(i + 1)));
    at(9900 + RESCUE.length * 750 + 900, () => setPhase('safe'));
  };

  // таймер выкупа
  useEffect(() => {
    if (phase !== 'ransom' && phase !== 'rescue') return;
    const t = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [phase]);

  const broken = phase === 'attack';
  const locked = phase === 'ransom' || phase === 'rescue';

  return (
    <section id="security" className="relative mx-auto max-w-[1500px] px-5 py-32 sm:px-10 sm:py-48">
      <div className="max-w-4xl">
        <h2 className="font-head text-[11vw] font-semibold leading-[0.95] tracking-[-0.045em] sm:text-[7vw] lg:text-[4.6vw]">
          <Rise text="Что будет," />
          <br />
          <Rise text="если на сайт нападут" delay={0.12} />
        </h2>
        <Up as="p" delay={0.2} className="mt-6 max-w-xl text-[17px] leading-[1.55] text-haze">
          Обычный магазин атакует вирус-вымогатель. Посмотрите, как это выглядит и как мы возвращаем сайт за минуты.
        </Up>
      </div>

      <div className="relative mt-14">
        <div className="overflow-hidden rounded-[6px] bg-night">
          <div className="flex items-center px-4 py-2.5">
            <div className={`mx-auto flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] transition-colors ${locked || broken ? 'bg-[#3a0f14] text-[#ff8a84]' : 'bg-white/[0.06] text-white/60'}`}>
              <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <rect x="5" y="11" width="14" height="9" rx="2" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" />
              </svg>
              {locked || broken ? 'небезопасно · sever-shop.ru' : 'sever-shop.ru'}
            </div>
          </div>

          <div className="relative h-[460px] overflow-hidden sm:h-[540px]">
            {phase === 'idle' ? (
              <div className="grid h-full place-items-center bg-night">
                <div className="text-center">
                  <div className="font-head text-2xl font-semibold">Обычный интернет-магазин</div>
                  <p className="mx-auto mt-2 max-w-sm text-[14px] leading-relaxed text-haze">Откройте его — и посмотрите, что будет дальше.</p>
                  <button onClick={run} className="mt-6 rounded-full bg-lime px-8 py-3.5 font-head text-[16px] font-semibold text-void">
                    Открыть сайт
                  </button>
                </div>
              </div>
            ) : phase === 'loading' ? (
              <div className="grid h-full place-items-center bg-[#f6f4ef]">
                <span className="h-9 w-9 animate-spin rounded-full border-2 border-black/10 border-t-black/60" />
              </div>
            ) : (
              <Store broken={broken} />
            )}

            {/* помехи и строки шифрования */}
            <AnimatePresence>
              {broken && (
                <motion.div key="crypt" className="pointer-events-none absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="sec-scan absolute inset-0" />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#1a0306] via-[#1a0306]/80 to-transparent px-5 pb-5 pt-16 font-mono text-[11px] leading-relaxed text-[#ff6b6b] sm:text-[12px]">
                    {CRYPT.map((l, i) => (
                      <motion.div key={l} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.35 }}>
                        {l}
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* экран вымогателя */}
            <AnimatePresence>
              {locked && (
                <motion.div
                  key="ransom"
                  className="absolute inset-0 flex flex-col items-center justify-center bg-[radial-gradient(70%_60%_at_50%_40%,#2a0710,#0e0306)] px-6 text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ clipPath: 'inset(0 0 100% 0)', transition: { duration: 0.9, ease: [0.76, 0, 0.24, 1] } }}
                >
                  <div className="sec-scan absolute inset-0 opacity-40" />
                  <div className="relative">
                    <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-[#ff4d5e]/50 text-[#ff4d5e]">
                      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                        <rect x="5" y="11" width="14" height="10" rx="2" />
                        <path d="M8 11V7a4 4 0 0 1 8 0v4M12 15v2" />
                      </svg>
                    </div>
                    <div className="sec-glitch mt-5 font-head text-[28px] font-bold uppercase leading-none tracking-tight text-[#ff4d5e] sm:text-[44px]" data-text="Ваш сайт зашифрован">
                      Ваш сайт зашифрован
                    </div>
                    <p className="mx-auto mt-4 max-w-md text-[14px] leading-relaxed text-[#f3c9cc]">Каталог, заказы и данные клиентов заблокированы. Чтобы получить ключ, переведите 2 BTC до окончания таймера.</p>
                    <div className="mt-5 font-mono text-[34px] font-semibold tracking-[0.08em] text-white sm:text-[44px]">
                      {pad(Math.floor(left / 3600))}:{pad(Math.floor((left % 3600) / 60))}:{pad(left % 60)}
                    </div>
                    <div className="mx-auto mt-3 max-w-xs rounded-lg border border-[#ff4d5e]/30 px-3 py-2 font-mono text-[11px] text-[#ff8a92]">bc1q 7k2m 9x4f ···· ···· 8d3a</div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* команда «Мира сайтов» */}
            <AnimatePresence>
              {phase === 'rescue' && (
                <motion.div
                  key="rescue"
                  className="absolute bottom-4 left-4 right-4 rounded-2xl border border-lime/30 bg-[#0b0d0a]/95 p-4 shadow-2xl sm:left-auto sm:w-[430px]"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-2">
                      {TEAM.map((m) => (
                        <span key={m.id} className="h-9 w-9 overflow-hidden rounded-full border-2 border-[#0b0d0a] bg-white/10">
                          <img src={`${base}${m.head}`} alt="" className="h-full w-full object-cover object-top" />
                        </span>
                      ))}
                    </div>
                    <div>
                      <div className="font-head text-[15px] font-semibold text-lime">Мир сайтов на связи</div>
                      <div className="text-[11px] text-haze">дежурная команда · реагирование</div>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1.5 font-mono text-[12px]">
                    {RESCUE.slice(0, lines).map((l) => (
                      <motion.div key={l.t} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className="flex gap-2">
                        <span className={l.ok ? 'text-lime' : 'text-[#ff6b6b]'}>{l.ok ? '[ok]' : '[!!]'}</span>
                        <span className="text-mist/90">{l.t}</span>
                      </motion.div>
                    ))}
                    {lines < RESCUE.length && <span className="inline-block h-3.5 w-2 animate-pulse bg-lime" />}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* сайт снова работает */}
            <AnimatePresence>
              {phase === 'safe' && (
                <motion.div key="safe" className="pointer-events-none absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <motion.div
                    className="absolute inset-0 rounded-[2px] ring-4 ring-inset ring-lime/70"
                    initial={{ opacity: 1 }}
                    animate={{ opacity: [1, 0.2, 0.6, 0] }}
                    transition={{ duration: 1.6 }}
                  />
                  <motion.div
                    className="absolute right-4 top-4 flex items-center gap-2 rounded-full bg-[#0f1a06] py-2 pl-2.5 pr-4 text-[13px] font-semibold text-lime shadow-xl"
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.2 }}
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z" />
                      <path d="M9 12l2 2 4-4" />
                    </svg>
                    Сайт защищён
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="mt-5 flex min-h-[44px] flex-wrap items-center justify-center gap-3">
          {phase === 'safe' ? (
            <>
              <span className="text-[15px] text-mist">Сайт снова работает, данные клиентов на месте.</span>
              <button onClick={run} className="rounded-full bg-night px-5 py-2.5 text-[14px] font-semibold hover:bg-mist hover:text-void">
                Повторить атаку
              </button>
            </>
          ) : phase !== 'idle' ? (
            <span className="text-[15px] text-haze">
              {phase === 'loading' || phase === 'site' ? 'Открываем сайт' : phase === 'attack' ? 'Идёт атака' : phase === 'ransom' ? 'Сайт захвачен' : 'Устраняем угрозу'}
            </span>
          ) : null}
        </div>
      </div>

      {/* из чего состоит защита: обычный список, без иконок и карточек */}
      <div className="mt-32 grid gap-x-10 gap-y-12 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <h3 className="font-head text-[40px] font-semibold leading-[1] tracking-[-0.035em] sm:text-[52px]">Защищаем с первого дня</h3>
          <button onClick={() => scrollToId('contact')} className="mt-8 rounded-full bg-lime px-6 py-3.5 text-[15px] font-semibold text-void transition-colors hover:bg-mist">
            Проверить мой сайт
          </button>
        </div>
        <dl className="grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:col-span-8">
          {SHIELD.map((x, i) => (
            <Up key={x.t} delay={(i % 2) * 0.07}>
              <dt className="text-[22px] font-semibold tracking-[-0.02em]">{x.t}</dt>
              <dd className="mt-2 max-w-sm text-[16px] leading-[1.55] text-haze">{x.d}</dd>
            </Up>
          ))}
        </dl>
      </div>
    </section>
  );
};

export default Security;
