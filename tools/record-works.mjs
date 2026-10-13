// Запись превью наших сайтов: плавная прокрутка (на каждом кадре, без рывков колёсиком),
// CDP screencast → ровные 30 fps → mp4 с мягким появлением/затуханием, чтобы повтор не дёргался.
// Пишет версию для компьютера (<slug>.mp4) и для телефона (<slug>-m.mp4), плюс постеры.
//   npm i -D playwright-core ffmpeg-static
//   node tools/record-works.mjs public/works [slug ...] [--mobile-only|--desktop-only]
import { chromium } from 'playwright-core';
import ffmpeg from 'ffmpeg-static';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const OUT = path.resolve(args[0]);
const only = args.slice(1).filter((a) => !a.startsWith('--'));
const mobileOnly = args.includes('--mobile-only');
const desktopOnly = args.includes('--desktop-only');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

const SITES = [
  { slug: 'apple-favorite', url: 'https://rogday.ru/', wait: 5000 },
  { slug: 'apple-favorite-tg', url: 'https://rogday.ru/tg', wait: 4500, mobileOnly: true },
  { slug: 'gerbariy', url: 'https://rogday8.github.io/flow-3/', wait: 5500 },
  { slug: 'pole', url: 'https://rogday8.github.io/flow_2/', wait: 4500 },
  { slug: 'maison-petale', url: 'https://rogday8.github.io/flow_1/', wait: 4500 },
  { slug: 'zerno', url: 'https://rogday8.github.io/coffeerog/', wait: 6000 },
  { slug: 'bubble-tea', url: 'https://rogday8.github.io/bubletealove/', wait: 4500 },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });

async function closePopups(page) {
  for (const t of ['Только необходимые', 'Отклонить']) {
    const b = page.getByRole('button', { name: t }).first();
    if (await b.isVisible().catch(() => false)) await b.click().catch(() => {});
  }
  await page
    .evaluate(() => {
      // всплывашка «Предзаказ» на Apple Favorite: жмём её крестик
      const el = [...document.querySelectorAll('*')].find((e) => e.children.length === 0 && /Оформить предзаказ/.test(e.textContent || ''));
      let box = el;
      for (let i = 0; i < 8 && box; i++) {
        const x = [...box.querySelectorAll('button')].find((b) => !/предзаказ/i.test(b.textContent || ''));
        if (x) return x.click();
        box = box.parentElement;
      }
    })
    .catch(() => {});
  await sleep(600);
}

async function record(browser, s, mobile) {
  const vp = mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 };
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile, locale: 'ru-RU' });
  const page = await ctx.newPage();
  await page.goto(s.url, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
  await sleep(s.wait);
  await closePopups(page);
  const tag = mobile ? '-m' : '';
  await page.screenshot({ path: path.join(OUT, `_${s.slug}${tag}-poster.jpg`), type: 'jpeg', quality: 88 });

  const cdp = await ctx.newCDPSession(page);
  const shots = [];
  cdp.on('Page.screencastFrame', async (f) => {
    shots.push({ t: f.metadata.timestamp, data: f.data });
    await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 85, maxWidth: vp.width * (mobile ? 2 : 1), maxHeight: vp.height * (mobile ? 2 : 1) });
  await sleep(1300);
  // плавная прокрутка: ease-in-out на каждом кадре, без упора в самый низ страницы
  await page.evaluate(
    ({ secs }) =>
      new Promise((res) => {
        const max = document.documentElement.scrollHeight - innerHeight;
        const dist = Math.max(0, Math.min(max - 40, innerHeight * 7));
        const dur = secs * 1000;
        const y0 = scrollY;
        const t0 = performance.now();
        const step = (t) => {
          const p = Math.min(1, (t - t0) / dur);
          const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
          window.scrollTo(0, y0 + dist * e);
          if (p < 1) requestAnimationFrame(step);
          else res();
        };
        requestAnimationFrame(step);
      }),
    { secs: mobile ? 13 : 15 },
  );
  await sleep(1300);
  await cdp.send('Page.stopScreencast');
  await sleep(300);
  await ctx.close();

  // кадры → ровные 30 fps
  const frames = path.join(OUT, `_frames-${s.slug}${tag}`);
  fs.rmSync(frames, { recursive: true, force: true });
  fs.mkdirSync(frames);
  shots.sort((a, b) => a.t - b.t);
  const fps = 30;
  const t0 = shots[0].t;
  const dur = shots[shots.length - 1].t - t0;
  let n = 0;
  let j = 0;
  for (let k = 0; k <= dur * fps; k++) {
    const t = t0 + k / fps;
    while (j + 1 < shots.length && shots[j + 1].t <= t) j++;
    fs.writeFileSync(path.join(frames, `f${String(n++).padStart(5, '0')}.jpg`), Buffer.from(shots[j].data, 'base64'));
  }
  const total = n / fps;
  const out = path.join(OUT, `${s.slug}${tag}.mp4`);
  const scale = mobile ? 'scale=414:-2' : 'scale=1280:-2';
  execFileSync(ffmpeg, [
    '-y', '-loglevel', 'error', '-framerate', String(fps), '-i', path.join(frames, 'f%05d.jpg'),
    '-vf', `${scale},fade=t=in:st=0:d=0.45,fade=t=out:st=${(total - 0.6).toFixed(2)}:d=0.6`,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', mobile ? '29' : '28', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', out,
  ]);
  fs.rmSync(frames, { recursive: true, force: true });
  // насколько ровно шли кадры (медиана и 90-й перцентиль интервала)
  const gaps = shots.slice(1).map((x, i) => x.t - shots[i].t).sort((a, b) => a - b);
  const q = (p) => (gaps[Math.floor(gaps.length * p)] * 1000).toFixed(0);
  console.log(`  ${s.slug}${tag}: ${(fs.statSync(out).size / 1e6).toFixed(2)} MB, ${total.toFixed(1)} s, кадров ${shots.length}, интервал медиана ${q(0.5)} мс / p90 ${q(0.9)} мс`);
}

const browser = await chromium.launch({
  executablePath: EDGE,
  headless: true,
  // рисуем видеокартой — иначе тяжёлые сайты (3D) в записи подтормаживают
  args: ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'],
});
for (const s of SITES) {
  if (only.length && !only.includes(s.slug)) continue;
  console.log('→', s.slug);
  if (!mobileOnly && !s.mobileOnly) await record(browser, s, false);
  if (!desktopOnly) await record(browser, s, true);
}
await browser.close();
