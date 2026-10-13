# Мир сайтов

Сайт-визитка студии: наши работы, возможности, процесс, мини-игра «Поймай баг» и контакты.
Vite + React 19 + Tailwind 4 + Motion + Lenis + three.js (React Three Fiber).

## Запуск

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # готовый сайт в dist/
```

## Что где менять

- **Работы, услуги, контакты** — `src/data.ts`. Контакты (`CONTACTS`) пустые — впишите Telegram/почту/телефон, кнопки в блоке «Контакты» появятся сами.
- **Картинки и видео работ** — `public/works/<slug>.mp4`, `<slug>.webp` (постер 1152×720), `<slug>-thumb.webp` (для планеты 512×320), `<slug>-mobile.webp` (экран телефона).
- **Перезаписать видео работ**: `tools/record-works.mjs` — открывает сайты в Edge, плавно листает и пишет mp4
  (нужны `npm i -D playwright-core ffmpeg-static`): `node tools/record-works.mjs public/works [slug]`.
- **3D-планета** — `src/components/PlanetScene.tsx` (шейдеры процедурные, внешних моделей нет).

## Публикация на GitHub Pages

В репозитории уже есть `.github/workflows/pages.yml`. После первого `git push` в `main`:
Settings → Pages → Source: **GitHub Actions**. Сайт появится по адресу `https://<user>.github.io/<repo>/`
(пути относительные — работает и на своём домене).
