/** Paso con flechas en el Tambor y en los visores de screens: → 1, ← −1, cualquier otra tecla 0. La tecla mantenida
    (e.repeat) no da paso: una cara o una pantalla por pulsación (auditoría de sonido 2026-10-20, F / I-03: con la
    repetición de Windows el Tambor disparaba 6 mat-drum por segundo y un visor 10 ui-step).
    @param {{ key: string, repeat: boolean }} e
    @returns {-1 | 0 | 1} */
export function arrowStep(e) {
  if (e.repeat) return 0;
  return e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
}
