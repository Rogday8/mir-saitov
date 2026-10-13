// Запись превью наших сайтов: видео прокрутки (CDP screencast → ffmpeg), постер и скриншот с телефона.
// node record.mjs <outDir> [slug ...]
import { chromium } from 'playwright-core';
import ffmpeg from 'ffmpeg-static';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve(process.argv[2]);
const only = process.argv.slice(3);
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

const SITES = [
  { slug: 'apple-favorite', url: 'https://rogday.ru/', wait: 5000, seconds: 16 },
  { slug: 'gerbariy', url: 'https://rogday8.github.io/flow-3/', wait: 5500, seconds: 16 },
  { slug: 'pole', url: 'https://rogday8.github.io/flow_2/', wait: 4500, seconds: 16 },
  { slug: 'maison-petale', url: 'https://rogday8.github.io/flow_1/', wait: 4500, seconds: 16 },
  { slug: 'zerno', url: 'https://rogday8.github.io/coffeerog/', wait: 6000, seconds: 16 },
  { slug: 'bubble-tea', url: 'https://rogday8.github.io/bubletealove/', wait: 4500, seconds: 16 },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });

async function closePopups(page) {
  await page.evaluate(() => {
    // всплывашка «Предзаказ» на Apple Favorite: жмём её крестик
    const el = [...document.querySelectorAll('*')].find((e) => e.children.length === 0 && /Оформить предзаказ/.test(e.textContent || ''));
    let box = el;
    for (let i = 0; i < 8 && box; i++) {
      const x = [...box.querySelectorAll('button')].find((b) => !/предзаказ/i.test(b.textContent || ''));
      if (x) { x.click(); return; }
      box = box.parentElement;
    }
  }).catch(() => {});
  await sleep(600);
}


const browser = await chromium.launch({ executablePath: EDGE, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });

for (const s of SITES) {
  if (only.length && !only.includes(s.slug)) continue;
  console.log('→', s.slug);
  // ——— компьютер: видео прокрутки
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, locale: 'ru-RU' });
  const page = await ctx.newPage();
  await page.goto(s.url, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
  await sleep(s.wait);
  // закрываем cookie-плашки, если есть (только «Отклонить/Закрыть» — без согласий)
  for (const t of ['Только необходимые', 'Отклонить', 'Закрыть']) {
    const b = page.getByRole('button', { name: t }).first();
    if (await b.isVisible().catch(() => false)) await b.click().catch(() => {});
  }
  await closePopups(page);
  await page.screenshot({ path: path.join(OUT, `${s.slug}-poster.jpg`), type: 'jpeg', quality: 86 });

  const frames = path.join(OUT, `_frames-${s.slug}`);
  fs.rmSync(frames, { recursive: true, force: true });
  fs.mkdirSync(frames);
  const cdp = await ctx.newCDPSession(page);
  const shots = [];
  cdp.on('Page.screencastFrame', async (f) => {
    shots.push({ t: f.metadata.timestamp, data: f.data });
    await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 80, maxWidth: 1440, maxHeight: 900, everyNthFrame: 1 });
  await page.mouse.move(720, 450);
  await sleep(1200);
  // плавная прокрутка колесом (сайты с Lenis её сглаживают), с паузами
  const steps = Math.round((s.seconds * 1000 - 2500) / 90);
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, 70);
    await sleep(90);
    if (i % 45 === 44) await sleep(500);
  }
  await sleep(1200);
  await cdp.send('Page.stopScreencast');
  await sleep(300);

  // кадры → ровные 25 fps (повторяем кадр, пока не пришёл следующий)
  shots.sort((a, b) => a.t - b.t);
  const fps = 25;
  const t0 = shots[0].t;
  const dur = shots[shots.length - 1].t - t0;
  let n = 0;
  for (let k = 0; k <= dur * fps; k++) {
    const t = t0 + k / fps;
    let j = 0;
    while (j + 1 < shots.length && shots[j + 1].t <= t) j++;
    fs.writeFileSync(path.join(frames, `f${String(n++).padStart(5, '0')}.jpg`), Buffer.from(shots[j].data, 'base64'));
  }
  const mp4 = path.join(OUT, `${s.slug}.mp4`);
  execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', path.join(frames, 'f%05d.jpg'), '-vf', 'scale=1152:-2', '-c:v', 'libx264', '-preset', 'slow', '-crf', '31', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', mp4]);
  fs.rmSync(frames, { recursive: true, force: true });
  console.log('  video', (fs.statSync(mp4).size / 1e6).toFixed(2), 'MB,', shots.length, 'frames,', dur.toFixed(1), 's');
  await ctx.close();

  // ——— телефон: первый экран
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ru-RU' });
  const mp = await m.newPage();
  await mp.goto(s.url, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
  await sleep(s.wait);
  for (const t of ['Только необходимые', 'Отклонить', 'Закрыть']) {
    const b = mp.getByRole('button', { name: t }).first();
    if (await b.isVisible().catch(() => false)) await b.click().catch(() => {});
  }
  await closePopups(mp);
  await mp.screenshot({ path: path.join(OUT, `${s.slug}-mobile.jpg`), type: 'jpeg', quality: 84 });
  await m.close();
}
await browser.close();
