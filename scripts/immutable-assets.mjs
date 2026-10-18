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

/** Archivos registrados cuyo contenido cambió con el mismo nombre. */
export function changedAssets() {
  return Object.entries(load()).filter(([u, h]) => existsSync(fileOf(u)) && sha(fileOf(u)) !== h).map(([u]) => u);
}

/** Entradas de headers() de next.config: una por archivo registrado que existe. */
export function immutableHeaders() {
  return Object.keys(load())
    .filter((u) => existsSync(fileOf(u)))
    .map((source) => ({ source, headers: [{ key: 'Cache-Control', value: IMMUTABLE }] }));
}

export function assertUnchanged() {
  const bad = changedAssets();
  if (bad.length) {
    throw new Error(
      `[immutable-assets] Estos archivos cambiaron de contenido con el mismo nombre:\n  ${bad.join('\n  ')}\n` +
      'Se sirven con caché immutable de un año: quien ya los vio se quedaría con la versión vieja. Publicá el ' +
      'archivo nuevo con otro nombre (por ejemplo -v2), actualizá la referencia y restaurá el original ' +
      '(git checkout -- <archivo>), o borralo. Después: node scripts/immutable-assets.mjs',
    );
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  assertUnchanged();
  if (process.argv.includes('--check')) {
    console.log(`[immutable-assets] ok: ${Object.keys(load()).length} archivos sin cambios`);
  } else {
    const old = load(), next = {};
    let added = 0;
    for (const d of DIRS) {
      if (!existsSync(join(PUBLIC, d))) continue;
      for (const f of walk(join(PUBLIC, d))) { const u = urlOf(f); next[u] = old[u] || sha(f); if (!old[u]) added++; }
    }
    const sorted = Object.fromEntries(Object.entries(next).sort(([a], [b]) => a.localeCompare(b)));
    writeFileSync(LIST, JSON.stringify(sorted, null, 1) + '\n');
    const removed = Object.keys(old).filter((u) => !(u in next)).length;
    console.log(`[immutable-assets] ${Object.keys(sorted).length} archivos (${added} nuevos, ${removed} sacados)`);
  }
}
