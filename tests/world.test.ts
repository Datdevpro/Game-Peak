import { describe, expect, it } from 'vitest';
import { blocked, BUILDINGS, findPath, movePoint } from '../shared/world';
import { CONFIG } from '../shared/config';
import { TimeManager } from '../server/systems/TimeManager';
import { WeatherManager } from '../server/systems/WeatherManager';
describe('thế giới', () => {
  it('tìm được đường tới mọi cửa từ điểm xuất phát, tránh vật cản', () => {
    for (const building of BUILDINGS) {
      const path = findPath(CONFIG.spawn, building.door);
      expect(path.length).toBeGreaterThan(0); expect(path.every(p => !blocked(p.x, p.y))).toBe(true);
    }
  });
  it('không đi xuyên tường và không chạy chéo nhanh hơn', () => {
    const p = { x: 680, y: 760 };
    expect(Math.hypot(movePoint(p, 1, 1, 0.1).x - p.x, movePoint(p, 1, 1, 0.1).y - p.y)).toBeCloseTo(CONFIG.playerSpeed * 0.1);
    const bank = BUILDINGS[0]; expect(movePoint({ x: bank.x - 13, y: bank.y + 120 }, 1, 0, 0.05).x).toBe(bank.x - 13);
  });
  it('một ngày là 24 phút thực, nhiệt độ có chu kỳ', () => {
    const time = new TimeManager(); time.update(CONFIG.daySeconds); expect(time.day).toBe(2); expect(time.hour).toBe(8);
    const weather = new WeatherManager(); expect(weather.temperature(14)).toBeGreaterThan(weather.temperature(2));
  });
});
