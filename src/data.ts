// Всё, что меняется без программиста: работы, услуги, контакты.
// Картинки и видео работ лежат в public/works/<slug>*.{webp,mp4}.

export interface Work {
  slug: string;
  name: string;
  kind: string; // тип сайта
  status: string; // «работает» / «концепт»
  year: string;
  url: string;
  /** можно открыть сайт прямо внутри портфолио (если сайт не запрещает встраивание) */
  embed: boolean;
  lead: string;
  features: string[];
  stack: string[];
  /** цвета работы: фон сцены, акцент, текст на фоне */
  bg: string;
  accent: string;
  ink: string;
  /** дополнительный экран (например, Telegram-мини-приложение): постер и видео прокрутки */
  extra?: { src: string; video?: string; label: string };
}

export const WORKS: Work[] = [
  {
    slug: 'apple-favorite',
    name: 'Apple Favorite',
    kind: 'Интернет-магазин техники',
    status: 'Работает',
    year: '2026',
    url: 'https://rogday.ru/',
    embed: false,
    lead: 'Полноценный магазин: каталог на сотни моделей, корзина с опциями, заказы в Telegram, своя админ-панель и мини-приложение прямо в Telegram.',
    features: ['Каталог 650+ товаров', 'Админ-панель', 'Мини-приложение Telegram', 'Заказы в Telegram-бот', 'Trade-in и ремонт', '3D-модели товаров'],
    stack: ['React', 'Node.js', 'PostgreSQL', 'Telegram Bot API'],
    bg: '#05060a',
    accent: '#2f8bff',
    ink: '#f5f5f7',
    extra: { src: 'works/apple-favorite-tg.webp', video: 'works/apple-favorite-tg-m.mp4', label: 'Мини-приложение в Telegram' },
  },
  {
    slug: 'gerbariy',
    name: 'Гербарий №7',
    kind: 'Цветочная мастерская',
    status: 'Промо-сайт',
    year: '2026',
    url: 'https://rogday8.github.io/flow-3/',
    embed: true,
    lead: 'Ботанический архив вместо витрины: пергамент, сургуч, латинские названия — и букеты, которые хочется рассматривать, как коллекцию.',
    features: ['3D-карусель образцов', 'Атлас с лупой', 'Письмо на печатной машинке', 'Альбом с перелистыванием', 'Карта доставки'],
    stack: ['React', 'Motion', 'Tailwind'],
    bg: '#efe6d4',
    accent: '#8a1f2f',
    ink: '#2b1a14',
  },
  {
    slug: 'pole',
    name: 'ПОЛЕ',
    kind: 'Цветочная лавка',
    status: 'Промо-сайт',
    year: '2026',
    url: 'https://rogday8.github.io/flow_2/',
    embed: true,
    lead: 'Светлый журнальный стиль: буквы залиты цветами, наклейки можно таскать мышкой, а букет подбирается свайпами, как в приложении знакомств.',
    features: ['Буквы из фотографий', 'Перетаскиваемые наклейки', 'Свайп-подбор букета', 'Квиз', 'Сезонный круг'],
    stack: ['React', 'Motion', 'Tailwind'],
    bg: '#f4eedd',
    accent: '#e8a400',
    ink: '#1d3a24',
  },
  {
    slug: 'maison-petale',
    name: 'Maison Pétale',
    kind: 'Цветочный дом',
    status: 'Промо-сайт',
    year: '2026',
    url: 'https://rogday8.github.io/flow_1/',
    embed: true,
    lead: 'Тёмная элегантность и живые цветы: лепестки летят по экрану, а в конструкторе можно собрать свой букет и сразу увидеть цену.',
    features: ['Конструктор букета', 'Парящие цветы', 'Кинематографичный скролл', 'Подписка на букеты'],
    stack: ['React', 'Motion', 'Lenis'],
    bg: '#1a0b11',
    accent: '#f3a7bb',
    ink: '#fbeef1',
  },
  {
    slug: 'zerno',
    name: 'ЗЕРНО',
    kind: 'Кофейня',
    status: 'Промо-сайт',
    year: '2026',
    url: 'https://rogday8.github.io/coffeerog/',
    embed: true,
    lead: 'Кофейня медленного утра: 3D-чашка вращается за курсором, типографика живёт на скролле, а путь зерна рассказан как история.',
    features: ['3D-чашка на WebGL', 'Кинетическая типографика', 'Горизонтальная лента', 'Бронирование столика'],
    stack: ['React', 'Three.js', 'GSAP'],
    bg: '#20140e',
    accent: '#d0904f',
    ink: '#f6ead9',
  },
  {
    slug: 'bubble-tea',
    name: 'Bubble Tea Love',
    kind: 'Бар бабл-ти',
    status: 'Промо-сайт',
    year: '2026',
    url: 'https://rogday8.github.io/bubletealove/',
    embed: true,
    lead: 'Выбери вкус — и весь сайт перекрашивается под него. Стакан наполняется на глазах, а в конструкторе собирается свой напиток.',
    features: ['Сайт меняет цвет под вкус', 'Конструктор напитка', 'Анимированный стакан', 'Ритм-скролл'],
    stack: ['React', 'Motion', 'Tailwind'],
    bg: '#5c1219',
    accent: '#ffb3bd',
    ink: '#fff1f2',
  },
];

export const SERVICES = [
  'Интернет-магазины',
  'Промо-сайты',
  '3D и WebGL',
  'Telegram Mini Apps',
  'Админ-панели',
  'Анимации',
  'Лендинги',
  'Интеграции',
];

// Контакты студии: заполните — кнопки в блоке «Контакты» появятся сами.
export const CONTACTS = {
  telegram: '', // например 'https://t.me/username'
  email: '', // например 'hello@example.ru'
  phone: '', // например '+7 900 000-00-00'
};

// Команда — герои сценической гонки, «стола» и игры. Головы вырезаны из фото: public/team/head-N.webp.
// Имена и роли поменяйте на настоящие.
export interface Member {
  id: string;
  name: string;
  role: string;
  head: string;
  color: string; // цвет команды в гонке
  shirt: string; // цвет «худи» человечка
  cheer: string; // кричалка на большом экране
  floor: string; // название этажа в башне (раздел «Команда»)
  bio: string; // пара предложений: чем занимается
}
export const TEAM: Member[] = [
  { id: 'a', name: 'Мистер Пиксель', role: 'Фронтенд и анимации', head: 'team/head-1.webp', color: '#c8ff4d', shirt: '#55761a', cheer: 'Пиксель к пикселю!', floor: 'Неоновая студия', bio: 'Собирает интерфейсы и оживляет их: анимации, переходы, 3D на страницах. Отвечает за то, чтобы сайт быстро работал на любом устройстве.' },
  { id: 'b', name: 'Шеф Проекта', role: 'Продюсер и идеи', head: 'team/head-2.webp', color: '#8b6cff', shirt: '#5b43c4', cheer: 'Сроки — святое!', floor: 'Кабинет продюсера', bio: 'Ведёт проект от первого звонка до запуска: задачи, сроки, команда и связь с заказчиком. Следит, чтобы всё было сделано так, как договорились.' },
  { id: 'c', name: 'Маэстро 3D', role: 'Дизайн и 3D', head: 'team/head-3.webp', color: '#3ee6ff', shirt: '#137d92', cheer: 'Сделаем красиво!', floor: 'Мастерская 3D', bio: 'Придумывает стиль: шрифты, цвета, композицию, 3D-модели и сцены. Делает так, чтобы сайт запоминали с первого экрана.' },
];

// Награды в игре «Убеги от дедлайна»: сколько очков — какая скидка. Поменяйте на свои условия (или уберите коды).
export const PROMOS = [
  { score: 400, label: 'Скидка 5% на сайт', code: 'MIR5' },
  { score: 1000, label: 'Скидка 10% на сайт', code: 'MIR10' },
  { score: 2000, label: 'Скидка 15% на сайт', code: 'MIR15' },
];

// Особенности героев в игре (по id из TEAM)
export const PERKS: Record<string, { label: string; jump: number; coffee: number; shield: number }> = {
  a: { label: 'Прыгает выше всех', jump: 1.1, coffee: 1, shield: 0 },
  b: { label: 'Кофе действует вдвое дольше', jump: 1, coffee: 2, shield: 0 },
  c: { label: 'Переживает одно столкновение', jump: 1, coffee: 1, shield: 1 },
};

/** Авторы 3D-моделей со Sketchfab (лицензия CC BY 4.0 — обязательно указывать). Показываются в подвале. */
export const CREDITS: { name: string; author: string; url: string }[] = [];
