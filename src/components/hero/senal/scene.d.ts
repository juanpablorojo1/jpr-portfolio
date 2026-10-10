import type { Senal } from './signal';

export function bootScene(opts: {
  S: Senal;
  root: HTMLElement;
  after: HTMLElement;
  assetBase?: string;
}): { ready: Promise<void>; dispose: () => void };
