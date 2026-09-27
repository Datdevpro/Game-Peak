import { ITEMS, type ItemId } from '../../shared/config';
import type { WorldEvent } from '../../shared/types';
export class EconomyManager {
  pressure: Record<ItemId, number> = { beans: 0, milk: 0, tea: 0 };
  prices: Record<ItemId, number> = { beans: 1000, milk: 400, tea: 700 };
  private lastMinute = -1;
  trade(item: ItemId, quantity: number) { this.pressure[item] = Math.max(-0.18, Math.min(0.25, this.pressure[item] + quantity * 0.0002)); }
  update(minutes: number, event: WorldEvent | null) {
    const minute = Math.floor(minutes);
    if (minute !== this.lastMinute) { for (const id of Object.keys(ITEMS) as ItemId[]) this.pressure[id] *= 0.997; this.lastMinute = minute; }
    for (const id of Object.keys(ITEMS) as ItemId[]) {
      const variation = Math.sin(minutes / 110 + ITEMS[id].basePrice) * 0.035;
      const eventFactor = id === 'beans' ? event?.priceFactor ?? 1 : 1;
      this.prices[id] = Math.round(ITEMS[id].basePrice * (1 + this.pressure[id] + variation) * eventFactor);
    }
  }
}
