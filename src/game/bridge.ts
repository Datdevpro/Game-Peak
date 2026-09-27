import type { Point } from '../../shared/types';
export const controls = { x: 0, y: 0, target: null as Point | null, interact: false };
export const gameEvents = new EventTarget();
