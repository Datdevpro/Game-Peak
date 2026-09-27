import { randomUUID } from 'node:crypto';
import { BUSINESS_DEFINITIONS, WEATHER, type WeatherKind } from '../../shared/config';
import type { WorldEvent } from '../../shared/types';
import { PlayerRepository, businessQuery, type BusinessRow } from './PlayerRepository';
import { ensure } from './errors';
export class BusinessManager {
  constructor(private players: PlayerRepository) {}
  get(id: string, ownerId?: string) {
    const b = this.find(id);
    ensure(b && (!ownerId || b.owner_id === ownerId), 'Bạn không sở hữu quán này.', 403); return b;
  }
  find(id: string) {
    return this.players.db.get<BusinessRow>(businessQuery + ' WHERE b.id=?', id);
  }
  openShops(): BusinessRow[] {
    return this.players.db.all<BusinessRow>(businessQuery + ' WHERE b.is_open=1 AND i.servings>0');
  }
  rent(owner: string, property: string, name: string, day: number) {
    const db = this.players.db;
    const row = db.get<{ owner_id: string | null }>('SELECT owner_id FROM properties WHERE id=?', property);
    ensure(row && !row.owner_id, 'Mặt bằng này đã có người thuê.', 409);
    ensure(!db.get('SELECT id FROM properties WHERE owner_id=?', owner), 'V1 cho phép mỗi cư dân thuê một quán.');
    const def = BUSINESS_DEFINITIONS.coffee, id = randomUUID();
    this.players.debit(owner, def.rent, 'Thuê mặt bằng · ngày đầu');
    db.run('UPDATE properties SET owner_id=?,rented_at=? WHERE id=?', owner, Date.now(), property);
    db.run('INSERT INTO businesses(id,owner_id,property_id,type,name,price,rent,last_charged_day,created_at) VALUES(?,?,?,?,?,?,?,?,?)', id, owner, property, 'coffee', name, def.defaultPrice, def.rent, day, Date.now());
    db.run('INSERT INTO business_inventory(business_id) VALUES(?)', id);
  }
  equipment(owner: string, id: string) {
    const b = this.get(id, owner); ensure(!b.equipped, 'Quán đã có máy pha.');
    this.players.debit(owner, BUSINESS_DEFINITIONS[b.type].equipment, 'Mua máy pha cà phê', id);
    this.players.db.run('UPDATE businesses SET equipped=1 WHERE id=?', id);
  }
  stock(owner: string, id: string, quantity: number) {
    const b = this.get(id, owner), def = BUSINESS_DEFINITIONS[b.type];
    const cost = this.players.takeItem(owner, def.input, quantity);
    this.players.db.run('UPDATE business_inventory SET servings=servings+?,cost=cost+? WHERE business_id=?', quantity * def.servings, cost, id);
  }
  toggle(owner: string, id: string, open: boolean) {
    const b = this.get(id, owner);
    ensure(!open || (b.equipped && b.servings > 0), 'Cần có máy pha và nguyên liệu trước khi mở cửa.');
    this.players.db.run('UPDATE businesses SET is_open=? WHERE id=?', Number(open), id);
  }
  price(owner: string, id: string, price: number) { this.get(id, owner); this.players.db.run('UPDATE businesses SET price=? WHERE id=?', price, id); }
  upgrade(owner: string, id: string) {
    const b = this.get(id, owner); ensure(b.level < 5 && b.equipped, 'Cần có máy pha và quán chưa đạt cấp tối đa.');
    this.players.debit(owner, BUSINESS_DEFINITIONS[b.type].upgrade, 'Nâng cấp không gian quán', id);
    this.players.db.run('UPDATE businesses SET level=level+1,reputation=MIN(2,reputation+0.15) WHERE id=?', id);
  }
  purchaseProbability(b: BusinessRow, weather: WeatherKind, event: WorldEvent | null, travelDistance = 0) {
    const def = BUSINESS_DEFINITIONS[b.type];
    return Math.min(0.97, def.baseDemand * Math.min(1.4, def.defaultPrice / b.price) * b.reputation * WEATHER[weather].demand * (event?.demandFactor ?? 1) * (1 / (1 + travelDistance / 4000)));
  }
  sale(id: string) {
    return this.players.db.transaction(() => {
      const b = this.find(id); if (!b || !b.is_open || !b.equipped || b.servings <= 0) return null;
      const cost = b.servings === 1 ? b.stock_cost : Math.floor(b.stock_cost / b.servings);
      this.players.db.run('UPDATE business_inventory SET servings=servings-1,cost=cost-? WHERE business_id=?', cost, id);
      this.players.db.run('UPDATE businesses SET revenue=revenue+?,cogs=cogs+?,customers=customers+1,reputation=MIN(2,reputation+0.001),is_open=CASE WHEN ?=1 THEN 0 ELSE is_open END WHERE id=?', b.price, cost, b.servings, id);
      this.players.credit(b.owner_id, b.price, 'Khách mua cà phê', id);
      return { businessId: b.id, propertyId: b.property_id, amount: b.price, ownerId: b.owner_id };
    });
  }
  chargeDay(day: number) {
    const affected: string[] = [];
    this.players.db.transaction(() => {
      for (const b of this.players.db.all<BusinessRow>(businessQuery + ' WHERE b.last_charged_day<?', day)) {
        const def = BUSINESS_DEFINITIONS[b.type], salary = b.is_open ? def.salary : 0, utility = b.is_open ? def.utility : 0;
        const due = def.rent + salary + utility;
        if (this.players.wallet(b.owner_id).cash >= due) {
          this.players.debit(b.owner_id, due, 'Chi phí vận hành ngày mới', b.id);
          this.players.db.run('UPDATE businesses SET rent=rent+?,salary=salary+?,utility=utility+?,last_charged_day=? WHERE id=?', def.rent, salary, utility, day, b.id);
        } else {
          // No negative wallets: close until the owner pays this day's bill to reopen.
          this.players.db.run('UPDATE businesses SET is_open=0 WHERE id=?', b.id);
        }
        affected.push(b.owner_id);
      }
    });
    return affected;
  }
}
