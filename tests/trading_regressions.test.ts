import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { GameDatabase } from '../server/database/db';
import { AuthService } from '../server/services/AuthService';
import { GameService } from '../server/services/GameService';
import { BUILDINGS } from '../shared/world';
import { BUSINESS_DEFINITIONS } from '../shared/config';

describe('transaction invariants', () => {
  let db: GameDatabase, service: GameService, id: string;
  const market = BUILDINGS.find(b => b.id === 'market')!.door;
  beforeEach(async () => {
    db = new GameDatabase(':memory:'); service = new GameService(db);
    id = (await new AuthService(db).register('TradeAudit', 'password123', 0)).id;
  });
  afterEach(() => { db.close(); vi.useRealTimers(); });

  it('replaying a wholesale request cannot change money, stock or demand twice', () => {
    const request = { type: 'BUY_ITEM', itemId: 'beans', quantity: 10, requestId: randomUUID() };
    service.execute(id, request, market);
    const before = service.players.snapshot(id, service.economy.prices);
    const pressure = service.economy.pressure.beans;
    service.execute(id, request, market);
    expect(service.players.snapshot(id, service.economy.prices)).toEqual(before);
    expect(service.economy.pressure.beans).toBe(pressure);
    expect(() => service.execute(id, { ...request, quantity: 11 }, market)).toThrow(/Mã giao dịch/);
  });

  it.each(['SELL_ITEM', 'CREATE_LISTING'])('%s removes equipped fashion when the last owned item leaves the bag', type => {
    service.execute(id, { type: 'BUY_FASHION_ITEM', itemId: 'cap', requestId: randomUUID() });
    expect(service.players.fashion(id).cap).toBe(true);
    service.execute(id, { type, itemId: 'cap', quantity: 1, price: 1500, requestId: randomUUID() }, market);
    expect(service.players.inventory(id).find(i => i.itemId === 'cap')).toBeUndefined();
    expect(service.players.fashion(id).cap).toBe(false);
  });

  it('charges rent once per Vietnam calendar date across a month/year rollover', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-12-31T10:00:00+07:00'));
    const door = BUILDINGS.find(b => b.id === 'lot-1')!.door;
    service.execute(id, { type: 'RENT_PROPERTY', propertyId: 'lot-1', name: 'Calendar Cafe', requestId: randomUUID() }, door, 31, 10, true);
    const business = service.players.businesses(id)[0];
    const cash = service.players.wallet(id).cash;
    service.businesses.chargeDay(31, true);
    expect(service.players.wallet(id).cash).toBe(cash);
    vi.setSystemTime(new Date('2027-01-01T00:00:01+07:00'));
    expect(service.businesses.hasPaidDay(service.businesses.get(business.id), 1, true)).toBe(false);
    service.businesses.chargeDay(1, true);
    service.businesses.chargeDay(1, true);
    expect(service.players.wallet(id).cash).toBe(cash - BUSINESS_DEFINITIONS.coffee.rent);
    expect(service.businesses.hasPaidDay(service.businesses.get(business.id), 1, true)).toBe(true);
  });

  it('closes an underfunded shop, retries daily rent after funds arrive, and never charges twice', () => {
    const def = BUSINESS_DEFINITIONS.coffee;
    service.execute(id, { type: 'RENT_PROPERTY', propertyId: 'lot-1', name: 'Retry Cafe', requestId: randomUUID() }, BUILDINGS.find(b => b.id === 'lot-1')!.door);
    const business = service.players.businesses(id)[0];
    service.execute(id, { type: 'BUY_EQUIPMENT', businessId: business.id, requestId: randomUUID() });
    service.execute(id, { type: 'BUY_ITEM', itemId: 'beans', quantity: 1, requestId: randomUUID() }, market);
    service.execute(id, { type: 'STOCK_BUSINESS', businessId: business.id, quantity: 1, requestId: randomUUID() });
    service.execute(id, { type: 'TOGGLE_BUSINESS', businessId: business.id, open: true, requestId: randomUUID() });
    db.run('UPDATE player_wallets SET cash=0 WHERE player_id=?', id);
    service.businesses.chargeDay(2);
    expect(service.players.businesses(id)[0].open).toBe(false);
    expect(service.players.wallet(id).cash).toBe(0);
    expect(() => service.execute(id, { type: 'TOGGLE_BUSINESS', businessId: business.id, open: true, requestId: randomUUID() }, undefined, 2)).toThrow(/ngày mới/);
    db.run('UPDATE player_wallets SET cash=? WHERE player_id=?', def.rent, id);
    service.businesses.chargeDay(2);
    service.businesses.chargeDay(2);
    expect(service.players.wallet(id).cash).toBe(0);
    expect(service.players.businesses(id)[0].rent).toBe(def.rent * 2);
    expect(() => service.execute(id, { type: 'TOGGLE_BUSINESS', businessId: business.id, open: true, requestId: randomUUID() }, undefined, 2)).not.toThrow();
  });
});
