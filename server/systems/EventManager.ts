import { randomUUID } from 'node:crypto';
import type { WorldEvent } from '../../shared/types';
const DEFINITIONS = [
  { name: 'Lễ hội Mầm Xanh', description: 'Khách đến quán tăng 50%. Một ngày đẹp để mở cửa!', priceFactor: 1, demandFactor: 1.5 },
  { name: 'Thiếu hạt cà phê', description: 'Giá hạt cà phê tăng 25% trong 2 ngày.', priceFactor: 1.25, demandFactor: 1 },
  { name: 'Tuần lễ thu hoạch', description: 'Nguồn cung dồi dào, giá nguyên liệu giảm 15%.', priceFactor: 0.85, demandFactor: 1 },
];
export class EventManager {
  current: WorldEvent | null;
  private nextAt: number;
  constructor(current: WorldEvent | null, minutes: number) { this.current = current; this.nextAt = current?.endsAt ?? minutes + 90; }
  trigger(minutes: number, index = Math.floor(minutes / 1440) % DEFINITIONS.length) {
    const definition = DEFINITIONS[index % DEFINITIONS.length];
    this.current = { ...definition, id: randomUUID(), endsAt: minutes + 2880 }; this.nextAt = this.current.endsAt + 360;
    return this.current;
  }
  update(minutes: number) {
    if (this.current && minutes >= this.current.endsAt) { this.current = null; this.nextAt = minutes + 360; }
    if (!this.current && minutes >= this.nextAt) return this.trigger(minutes);
    return null;
  }
}
