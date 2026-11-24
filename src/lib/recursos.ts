import { readFileSync } from 'node:fs';
import path from 'node:path';
import { marked } from 'marked';
import { RECURSOS, type Recurso } from '../content/recursos';

/* Lee un recurso (src/content/recursos/<slug>.md, textual del bot) y lo pasa a HTML en el build (páginas estáticas).
   - Título: el H1 sin el prefijo de la palabra («HARVEY · …»).
   - Se saca la línea de firma del bot («Palabra: **X** · …», «Juan Pablo Rojo · @jrojo.ia»): la página ya dice quién
     es y cuál es la palabra.
   - Sin HTML crudo del markdown (se escapa) y solo links https; los externos abren en otra pestaña.
   - Cada h2 lleva un id para poder enlazar a la sección. */

export type RecursoPage = Recurso & { title: string; html: string };

const DIR = path.join(process.cwd(), 'src', 'content', 'recursos');

const slugify = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z]+;/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);

export function getRecurso(slug: string): RecursoPage | null {
  const meta = RECURSOS.find((r) => r.slug === slug);
  if (!meta) return null;
  const md = readFileSync(path.join(DIR, `${slug}.md`), 'utf8').replace(/\r\n/g, '\n');
  const h1 = /^#\s+(.+)$/m.exec(md)?.[1] ?? meta.palabra;
  const title = h1.replace(/^[A-ZÁÉÍÓÚÑ]+\s·\s/, '').trim();
  const body = md
    .replace(/^#\s+.+\n+/m, '')
    .replace(/^(Palabra:|Juan Pablo Rojo · @jrojo\.ia).*\n+/m, '');
  let html = marked.parse(body.replace(/</g, '&lt;'), { gfm: true, async: false }) as string;
  const bad = (html.match(/href="[^"]*"/g) ?? []).map((m) => m.slice(6, -1)).filter((h) => !h.startsWith('https://'));
  if (bad.length) throw new Error(`recurso ${slug}: links que no son https: ${bad.join(', ')}`);
  html = html.replace(/<a href="(https:\/\/[^"]+)">/g, (_, href: string) =>
    href.startsWith('https://www.juanpablorojo.info')
      ? `<a href="${href}">`
      : `<a href="${href}" target="_blank" rel="noopener">`,
  );
  const seen = new Set<string>();
  html = html.replace(/<h2>(.+?)<\/h2>/g, (_, inner: string) => {
    let id = slugify(inner) || 'seccion';
    while (seen.has(id)) id += '-2';
    seen.add(id);
    return `<h2 id="${id}">${inner}</h2>`;
  });
  return { ...meta, title, html };
}
