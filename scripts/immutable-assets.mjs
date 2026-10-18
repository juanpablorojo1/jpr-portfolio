/* Caché larga para la media de public/ (perf, 2026-10-17, punto 9 del plan de rendimiento).
   Los archivos listados en immutable-assets.json salen con `Cache-Control: public, max-age=31536000, immutable`:
   una visita repetida no vuelve a pedirlos. Eso sólo es seguro si un archivo NUNCA cambia de contenido con el mismo
   nombre (el navegador se quedaría con el viejo hasta un año). Por eso:
   - El header se da archivo por archivo, sólo a los que están en la lista (un archivo nuevo sale con el default de
     siempre, max-age=0, hasta que se lo registra).
   - `next build` verifica el hash de cada archivo de la lista y FALLA si alguno cambió: para reemplazar un video,
     un póster o una imagen hay que publicarlo con otro nombre (sufijo -v2, -v3…) y actualizar la referencia.
   Uso:  node scripts/immutable-assets.mjs           registra los archivos nuevos y saca los borrados
         node scripts/immutable-assets.mjs --check   sólo verifica (lo mismo que hace el build) */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PUBLIC = join(ROOT, 'public');
const LIST = join(ROOT, 'scripts', 'immutable-assets.json');
// carpetas de media y sólo extensiones binarias (git no les convierte fines de línea: el hash es el mismo en Windows
// y en el build de Vercel). Quedan afuera los PDF del CV, og/, icons/ y los SVG, que se reemplazan en el lugar.
const DIRS = ['videos', 'projects', 'senal', 'images', 'sounds', 'fonts'];
const EXT = /\.(mp4|webm|m4a|jpe?g|png|webp|avif|hdr|woff2)$/i;
export const IMMUTABLE = 'public, max-age=31536000, immutable';

const sha = (f) => createHash('sha256').update(readFileSync(f)).digest('hex').slice(0, 16);
const walk = (d) => readdirSync(d).flatMap((n) => {
  const p = join(d, n);
  return statSync(p).isDirectory() ? walk(p) : EXT.test(n) ? [p] : [];
});
const urlOf = (p) => '/' + relative(PUBLIC, p).split(sep).join('/');
const load = () => (existsSync(LIST) ? JSON.parse(readFileSync(LIST, 'utf8')) : {});
const fileOf = (u) => join(PUBLIC, ...u.split('/'));

/* Lápidas (C-05): un archivo registrado que se borra NO sale de la lista; queda como `"removed:<hash>"`. Si después
   aparece otra vez un archivo en esa URL (borrar y volver a copiar uno nuevo con el mismo nombre), el build falla: quien
   ya vio el viejo lo tiene con caché immutable de un año. Una URL con lápida no se vuelve a usar: va con otro nombre. */
const TOMB = 'removed:';
const isTomb = (h) => typeof h === 'string' && h.startsWith(TOMB);

/** Pura: URLs en falta (cambió el contenido, o reapareció un archivo en una URL con lápida). */
export function violations(list, exists, hashOf) {
  return Object.entries(list).filter(([u, h]) => exists(u) && (isTomb(h) || hashOf(u) !== h)).map(([u]) => u);
}
/** Pura: la lista nueva a partir de la vieja y de los archivos en disco ({url: hash}); los que faltan quedan con lápida. */
export function nextRegistry(old, onDisk) {
  const next = {};
  for (const [u, h] of Object.entries(onDisk)) next[u] = old[u] && !isTomb(old[u]) ? old[u] : h;
  for (const [u, h] of Object.entries(old)) if (!(u in onDisk)) next[u] = isTomb(h) ? h : TOMB + h;
  return Object.fromEntries(Object.entries(next).sort(([a], [b]) => a.localeCompare(b)));
}

/** Archivos registrados cuyo contenido cambió con el mismo nombre, o que reaparecieron en una URL con lápida. */
export function changedAssets() {
  return violations(load(), (u) => existsSync(fileOf(u)), (u) => sha(fileOf(u)));
}

/** Entradas de headers() de next.config: una por archivo registrado que existe (las lápidas no). */
export function immutableHeaders() {
  return Object.entries(load())
    .filter(([u, h]) => !isTomb(h) && existsSync(fileOf(u)))
    .map(([source]) => ({ source, headers: [{ key: 'Cache-Control', value: IMMUTABLE }] }));
}

export function assertUnchanged() {
  const bad = changedAssets();
  if (bad.length) {
    throw new Error(
      `[immutable-assets] Estos archivos cambiaron de contenido con el mismo nombre (o volvieron a una URL borrada):\n  ${bad.join('\n  ')}\n` +
      'Se sirven con caché immutable de un año: quien ya los vio se quedaría con la versión vieja. Publicá el ' +
      'archivo nuevo con otro nombre (por ejemplo -v2), actualizá la referencia y restaurá el original ' +
      '(git checkout -- <archivo>) o sacalo de esa URL para siempre (queda con lápida: no se puede volver a usar). ' +
      'Después: node scripts/immutable-assets.mjs',
    );
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  assertUnchanged();
  if (process.argv.includes('--check')) {
    const l = load(), tombs = Object.values(l).filter(isTomb).length;
    console.log(`[immutable-assets] ok: ${Object.keys(l).length - tombs} archivos sin cambios, ${tombs} lápidas`);
  } else {
    const old = load(), onDisk = {};
    for (const d of DIRS) {
      if (!existsSync(join(PUBLIC, d))) continue;
      for (const f of walk(join(PUBLIC, d))) { const u = urlOf(f); onDisk[u] = old[u] && !isTomb(old[u]) ? old[u] : sha(f); }
    }
    const next = nextRegistry(old, onDisk);
    writeFileSync(LIST, JSON.stringify(next, null, 1) + '\n');
    const added = Object.keys(onDisk).filter((u) => !(u in old)).length;
    const removed = Object.keys(next).filter((u) => isTomb(next[u]) && !isTomb(old[u] || '')).length;
    console.log(`[immutable-assets] ${Object.keys(onDisk).length} archivos (${added} nuevos, ${removed} sacados con lápida)`);
  }
}
