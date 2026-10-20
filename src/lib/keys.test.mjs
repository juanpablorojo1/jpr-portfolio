// Tests del paso con flechas (auditoría de sonido F / I-03): node --test (sin dependencias).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { arrowStep } from './keys.js';

test('arrowStep: → avanza una, ← retrocede una', () => {
  assert.equal(arrowStep({ key: 'ArrowRight', repeat: false }), 1);
  assert.equal(arrowStep({ key: 'ArrowLeft', repeat: false }), -1);
});

test('arrowStep: la tecla mantenida (e.repeat) no da paso: una cara o una pantalla por pulsación', () => {
  assert.equal(arrowStep({ key: 'ArrowRight', repeat: true }), 0);
  assert.equal(arrowStep({ key: 'ArrowLeft', repeat: true }), 0);
});

test('arrowStep: cualquier otra tecla no da paso', () => {
  for (const key of ['ArrowUp', 'ArrowDown', 'Enter', ' ', 'Escape', 'Tab', 'a']) assert.equal(arrowStep({ key, repeat: false }), 0, key);
});
