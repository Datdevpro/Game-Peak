import { CONFIG } from './config';
import type { Point } from './types';
export const WORLD = { width: 1920, height: 1400 };
export interface Building { id: string; name: string; x: number; y: number; w: number; h: number; color: number; roof: number; kind: 'bank' | 'market' | 'property' | 'cafe' | 'office' | 'apartment' | 'fashion'; door: Point }
export const BUILDINGS: Building[] = [
  { id: 'bank', name: 'NGÂN HÀNG LÁ', x: 180, y: 270, w: 260, h: 215, color: 0xf5e4c8, roof: 0x78a696, kind: 'bank', door: { x: 310, y: 515 } },
  { id: 'market', name: 'CHỢ MẦM XANH', x: 690, y: 270, w: 310, h: 210, color: 0xfbe1bd, roof: 0xe69573, kind: 'market', door: { x: 845, y: 515 } },
  { id: 'fashion', name: 'CỬA HÀNG THỜI TRANG', x: 1280, y: 205, w: 260, h: 270, color: 0xe1e5ef, roof: 0x91a9c3, kind: 'fashion', door: { x: 1410, y: 515 } },
  { id: 'lot-1', name: 'MẶT BẰNG 01', x: 190, y: 795, w: 250, h: 195, color: 0xf6ddc9, roof: 0xd18e7b, kind: 'property', door: { x: 315, y: 1020 } },
  { id: 'lot-2', name: 'MẶT BẰNG 02', x: 1300, y: 795, w: 250, h: 195, color: 0xf0e5c6, roof: 0xc5aa6c, kind: 'property', door: { x: 1425, y: 1020 } },
  { id: 'cafe', name: 'MỘC COFFEE', x: 1640, y: 300, w: 210, h: 180, color: 0xf6d6c9, roof: 0xb68eaa, kind: 'cafe', door: { x: 1745, y: 515 } },
  { id: 'apartment', name: 'NHÀ CỦA NẮNG', x: 1630, y: 780, w: 230, h: 210, color: 0xf6e8b9, roof: 0x8eafbf, kind: 'apartment', door: { x: 1745, y: 1020 } },
];
export const PARK = { x: 665, y: 790, w: 395, h: 215 };
export const WAYPOINTS: Point[] = [
  { x: 110, y: 560 }, { x: 550, y: 560 }, { x: 1130, y: 560 }, { x: 1590, y: 560 }, { x: 1810, y: 560 },
  { x: 110, y: 700 }, { x: 550, y: 700 }, { x: 1130, y: 700 }, { x: 1590, y: 700 }, { x: 1810, y: 700 },
  { x: 110, y: 1050 }, { x: 550, y: 1050 }, { x: 1130, y: 1050 }, { x: 1590, y: 1050 }, { x: 1810, y: 1050 },
  { x: 820, y: 1040 }, { x: 820, y: 920 },
];
export function blocked(x: number, y: number, radius = 12) {
  if (x < radius || y < radius || x > WORLD.width - radius || y > WORLD.height - radius) return true;
  return BUILDINGS.some(b => x > b.x - radius && x < b.x + b.w + radius && y > b.y - radius && y < b.y + b.h + radius)
    || (x > 874 - radius && x < 1028 + radius && y > 814 - radius && y < 916 + radius);
}
export function movePoint(p: Point, dx: number, dy: number, dt: number, speed = CONFIG.playerSpeed): Point {
  const length = Math.hypot(dx, dy); if (!length) return { ...p };
  const x = p.x + dx / Math.max(1, length) * speed * dt;
  const y = p.y + dy / Math.max(1, length) * speed * dt;
  const next = { ...p };
  if (!blocked(x, p.y)) next.x = x;
  if (!blocked(next.x, y)) next.y = y;
  return next;
}
export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
// A* runs only when destinations change, on a shared 40px walkability grid.
export function findPath(from: Point, to: Point): Point[] {
  const size = 40, cols = WORLD.width / size, rows = Math.ceil(WORLD.height / size);
  const cell = (p: Point) => ({ x: Math.max(0, Math.min(cols - 1, Math.floor(p.x / size))), y: Math.max(0, Math.min(rows - 1, Math.floor(p.y / size))) });
  const start = cell(from), end = cell(to), key = (x: number, y: number) => y * cols + x;
  const sk = key(start.x, start.y), ek = key(end.x, end.y);
  const open = new Set([sk]), came = new Map<number, number>(), g = new Map([[sk, 0]]);
  let reached = sk;
  for (let count = 0; open.size && count < 1900; count++) {
    let best = -1, score = Infinity;
    for (const k of open) { const f = (g.get(k) ?? Infinity) + Math.abs(k % cols - end.x) + Math.abs(Math.floor(k / cols) - end.y); if (f < score) { score = f; best = k; } }
    if (best === ek) { reached = best; break; }
    open.delete(best);
    const x = best % cols, y = Math.floor(best / cols);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows || blocked(nx * size + size / 2, ny * size + size / 2)) continue;
      const nk = key(nx, ny), cost = (g.get(best) ?? 0) + 1;
      if (cost < (g.get(nk) ?? Infinity)) { came.set(nk, best); g.set(nk, cost); open.add(nk); }
    }
  }
  if (reached !== ek) return [];
  const result: Point[] = []; let k = ek;
  while (k !== sk) { result.unshift({ x: k % cols * size + size / 2, y: Math.floor(k / cols) * size + size / 2 }); k = came.get(k)!; }
  if (!blocked(to.x, to.y)) result.push(to);
  return result;
}
