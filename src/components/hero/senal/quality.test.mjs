// Tests de los niveles de calidad (C-10): node --test (sin dependencias).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickLevel, initAdaptive, stepAdaptive, ADAPT } from './quality.js';

const nav = { deviceMemory: 8, hardwareConcurrency: 8 };
const q = (s) => new URLSearchParams(s);

test('pickLevel: ?q fuerza y apaga el ajuste; un valor inválido cae al automático', () => {
  assert.deepEqual(pickLevel(q('q=bajo'), 'nvidia', nav), { level: 'bajo', ceiling: 'bajo', forced: true, reason: '?q=bajo' });
  assert.equal(pickLevel(q('q=high'), 'intel · gen-12lp', nav).level, 'medio');
});

test('pickLevel: GPU por WebGPU + WebGL', () => {
  const cases = {
    'intel · gen-12lp | ANGLE (Intel, Intel(R) UHD Graphics (0x000046A3) Direct3D11)': 'medio',
    'amd · gcn-5 | ANGLE (AMD, AMD Radeon(TM) Graphics (0x00001638) Direct3D11)': 'medio',
    'amd · rdna-3 | ANGLE (AMD, AMD Radeon 780M Graphics)': 'medio',
    'amd · rdna-3 | ANGLE (AMD, AMD Radeon(TM) RX 7600 Direct3D11)': 'alto',
    'intel · xe-hpg | ANGLE (Intel, Intel(R) Arc(TM) A770 Graphics Direct3D11)': 'alto',
    'nvidia · ampere | ANGLE (NVIDIA, NVIDIA GeForce RTX 4060 Laptop GPU)': 'alto',
    'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)))': 'bajo',
    'ANGLE (Intel, Intel(R) HD Graphics, or similar)': 'medio',
    '': 'alto',
  };
  for (const [g, lv] of Object.entries(cases)) assert.equal(pickLevel(null, g, nav).level, lv, g);
});

test('pickLevel: manda WebGPU; WebGL sólo si WebGPU es ambiguo (R-03)', () => {
  const cases = {
    'webgpu: intel · xe-lpg | webgl: ANGLE (Intel, Intel(R) Arc(TM) Graphics (0x00007D55) Direct3D11)': 'medio',   // Meteor Lake
    'webgpu: intel · gen-12lp | webgl: ANGLE (NVIDIA, NVIDIA GeForce RTX 4060 Laptop GPU)': 'medio',                // Optimus
    'webgpu: intel · xe-hpg | webgl: ANGLE (Intel, Intel(R) Arc(TM) A770 Graphics Direct3D11)': 'alto',
    'webgpu: amd · gcn-5 | webgl: ANGLE (AMD, AMD Radeon(TM) Graphics (0x00001638) Direct3D11)': 'medio',
    'webgpu: amd · rdna-3 | webgl: ANGLE (AMD, AMD Radeon(TM) RX 7600 Direct3D11)': 'alto',
    'webgl: ANGLE (Intel, Intel(R) HD Graphics, or similar)': 'medio',
    'webgpu: nvidia · ampere | webgl: ANGLE (NVIDIA, NVIDIA GeForce RTX 4060 Laptop GPU)': 'alto',
  };
  for (const [g, lv] of Object.entries(cases)) assert.equal(pickLevel(null, g, nav).level, lv, g);
});

test('pickLevel: 4 GB o 4 hilos bajan un nivel', () => {
  assert.equal(pickLevel(null, 'nvidia geforce', { deviceMemory: 4, hardwareConcurrency: 8 }).level, 'medio');
  assert.equal(pickLevel(null, 'intel uhd', { deviceMemory: 8, hardwareConcurrency: 4 }).level, 'bajo');
});

// corre ventanas sobre el reductor y devuelve las acciones
const run = (st, fpsList, opts) => {
  const acts = [];
  for (const f of fpsList) { const r = stepAdaptive(st, f, opts); st = r.state; acts.push(r.action && (r.action.type === 'level' ? r.action.level : 'static')); }
  return { st, acts };
};

test('adaptive: baja de a un escalón desde el nivel efectivo (C-01)', () => {
  const { acts } = run(initAdaptive('alto'), [40, 40, 40]);
  assert.deepEqual(acts, ['medio', 'bajo', null]);
});

test('adaptive: la estática sólo desde bajo, con 4 ventanas < 24 fps y foco', () => {
  assert.deepEqual(run(initAdaptive('bajo'), [20, 20, 20, 20]).acts, [null, null, null, 'static']);
  assert.deepEqual(run(initAdaptive('bajo'), [20, 20, 20, 30, 20]).acts, [null, null, null, null, null]);
  assert.deepEqual(run(initAdaptive('bajo'), [20, 20, 20, 20], { focused: false }).acts, [null, null, null, null]);
  assert.deepEqual(run(initAdaptive('medio'), [20, 20, 20, 20, 20]).acts, ['bajo', null, null, null, 'static']);
});

test('adaptive: sube de a uno hasta el techo y nunca por encima', () => {
  const { acts } = run(initAdaptive('bajo', 'medio'), [60, 60, 60, 60, 60, 60]);
  assert.deepEqual(acts, [null, 'medio', null, null, null, null]);
});

test('adaptive: un rebote duplica need; tras bounceLock rebotes el techo queda fijo (C-09)', () => {
  let st = initAdaptive('medio');
  st = run(st, [40]).st;                                   // medio → bajo
  for (let k = 0; k < ADAPT.bounceLock; k++) {
    const r = run(st, Array(st.need).fill(60));            // sube a medio
    assert.equal(r.acts.at(-1), 'medio');
    st = run(r.st, [40]).st;                               // y vuelve a caer enseguida
    assert.equal(st.level, 'bajo');
  }
  assert.equal(st.ceiling, 'bajo');
  assert.ok(run(st, Array(40).fill(60)).acts.every((a) => a === null));
});

test('adaptive: una caída mucho después de subir no cuenta como rebote', () => {
  let st = run(initAdaptive('medio'), [40]).st;
  st = run(st, [60, 60]).st;                               // sube a medio
  const need = st.need;
  st = run(st, Array(ADAPT.bounceWindows + 2).fill(50)).st; // se sostiene
  st = run(st, [40]).st;
  assert.equal(st.need, need);
  assert.equal(st.bounces, 0);
});
