// Сжимает модели со Sketchfab для сайта: текстуры → WebP не больше 1024 px, геометрия → meshopt.
// Исходники лежат в models-src/ (в git не попадают), результат — в public/city/.
// Запуск: node tools/optimize-models.mjs
import fs from 'node:fs';
import path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, meshopt, prune, textureCompress, weld } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';

const SRC = 'models-src';
const OUT = 'public/city';
// размер текстур: у дальних зданий хватит и 512
const SIZE = { 'msu.glb': 1024, 'singapore.glb': 1024, 'atlanta.glb': 1024, 'asian-night.glb': 1024, 'night-skyline.glb': 1024 };

await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
fs.mkdirSync(OUT, { recursive: true });

for (const f of fs.readdirSync(SRC).filter((x) => x.endsWith('.glb'))) {
  const doc = await io.read(path.join(SRC, f));
  const s = SIZE[f] || 1024;
  await doc.transform(
    dedup(),
    prune(),
    weld(),
    textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [s, s], quality: 80 }),
    meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
  );
  const out = path.join(OUT, f);
  await io.write(out, doc);
  const a = fs.statSync(path.join(SRC, f)).size;
  const b = fs.statSync(out).size;
  console.log(`${f}: ${(a / 1e6).toFixed(1)} МБ → ${(b / 1e6).toFixed(2)} МБ`);
}
