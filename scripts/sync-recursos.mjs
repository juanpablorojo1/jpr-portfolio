// Copia los recursos del bot de @jrojo.ia (sus .md) a src/content/recursos/, textuales.
//   node scripts/sync-recursos.mjs "C:/Users/juanp/Documents/Redes sociales Juampi/bot/recursos"
// Solo copia los slugs de src/content/recursos.ts; falla si falta alguno.
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const src = process.argv[2];
if (!src || !existsSync(src)) {
  console.error('Uso: node scripts/sync-recursos.mjs <carpeta bot/recursos>');
  process.exit(1);
}
const list = readFileSync(new URL('../src/content/recursos.ts', import.meta.url), 'utf8');
const slugs = [...list.matchAll(/slug: '([a-z0-9-]+)'/g)].map((m) => m[1]);
const out = new URL('../src/content/recursos/', import.meta.url);
mkdirSync(out, { recursive: true });
for (const s of slugs) {
  const from = path.join(src, `${s}.md`);
  if (!existsSync(from)) throw new Error(`falta ${from}`);
  copyFileSync(from, new URL(`${s}.md`, out));
  console.log(`- ${s}.md`);
}
