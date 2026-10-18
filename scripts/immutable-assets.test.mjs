// Tests de la guarda de caché immutable (C-05 / C-10): node --test (sin dependencias).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { violations, nextRegistry } from './immutable-assets.mjs';

test('un archivo borrado queda con lápida y no pierde su URL', () => {
  const next = nextRegistry({ '/v/a.mp4': 'h1', '/v/b.mp4': 'h2' }, { '/v/a.mp4': 'h1' });
  assert.deepEqual(next, { '/v/a.mp4': 'h1', '/v/b.mp4': 'removed:h2' });
  assert.deepEqual(nextRegistry(next, { '/v/a.mp4': 'h1' }), next);       // la lápida se conserva
});

test('reaparecer en una URL con lápida es una violación, aunque sea otro contenido', () => {
  const list = { '/v/a.mp4': 'h1', '/v/b.mp4': 'removed:h2' };
  const exists = (u) => true, hash = (u) => (u === '/v/a.mp4' ? 'h1' : 'h9');
  assert.deepEqual(violations(list, exists, hash), ['/v/b.mp4']);
  assert.deepEqual(violations(list, (u) => u === '/v/a.mp4', hash), []);
});

test('un contenido distinto con el mismo nombre es una violación', () => {
  assert.deepEqual(violations({ '/v/a.mp4': 'h1' }, () => true, () => 'h2'), ['/v/a.mp4']);
});
