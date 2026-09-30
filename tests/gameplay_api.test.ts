import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createGameServer } from '../server/app';
import { BUILDINGS } from '../shared/world';
import { BUSINESS_DEFINITIONS, CONFIG } from '../shared/config';

describe('gameplay through HTTP with server-owned positions', () => {
  let server: ReturnType<typeof createGameServer>;
  let base: string;
  let users: Array<{ id: string; token: string }>;
  const def = BUSINESS_DEFINITIONS.coffee;
  beforeEach(async () => {
    server = createGameServer({ databasePath: ':memory:' });
    await server.listen(0);
    server.room.stop(); // deterministic test clock; no NPC sales racing assertions
    server.room.time.setHour(10);
    base = `http://127.0.0.1:${(server.http.address() as { port: number }).port}/api`;
    users = await Promise.all(['AliceAudit', 'BobAudit', 'CarolAudit'].map(name => server.auth.register(name, 'password123', 0)));
    users.forEach(u => server.room.join(u.id));
  });
  afterEach(async () => server.close());
  function move(user: number, building: string) {
    Object.assign(server.room.players.get(users[user].id)!.actor, BUILDINGS.find(b => b.id === building)!.door);
  }
  async function act(user: number, intent: Record<string, unknown>) {
    const response = await fetch(`${base}/action`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${users[user].token}` }, body: JSON.stringify({ requestId: crypto.randomUUID(), ...intent }) });
    return { status: response.status, data: await response.json() };
  }
  const snapshot = (user: number) => server.service.players.snapshot(users[user].id, server.service.economy.prices);

  it('wholesale validates proximity, hours, quantities, money and inventory without partial writes', async () => {
    const buy = { type: 'BUY_ITEM', itemId: 'beans', quantity: 10 };
    expect((await act(0, buy)).status).toBe(400);
    move(0, 'market');
    server.room.time.setHour(23);
    expect((await act(0, buy)).data.error).toMatch(/06:00/);
    server.room.time.setHour(10);
    for (const quantity of [0, -1, 1.5, CONFIG.maxQuantity + 1]) expect((await act(0, { ...buy, quantity })).status).toBe(400);
    expect((await act(0, { ...buy, itemId: 'invalid' })).status).toBe(400);
    expect(snapshot(0).cash).toBe(CONFIG.startingCash);
    const price = server.service.economy.prices.beans;
    expect((await act(0, buy)).status).toBe(200);
    const before = snapshot(0);
    expect((await act(0, { type: 'SELL_ITEM', itemId: 'beans', quantity: 11 })).status).toBe(400);
    expect(snapshot(0)).toEqual(before);
    expect((await act(0, { type: 'SELL_ITEM', itemId: 'beans', quantity: 4 })).status).toBe(200);
    expect(snapshot(0).cash).toBe(CONFIG.startingCash - price * 10 + Math.floor(price * .75) * 4);
    expect(snapshot(0).inventory[0]).toMatchObject({ quantity: 6, cost: price * 6 });
    server.db.run('UPDATE player_wallets SET cash=0 WHERE player_id=?', users[0].id);
    const broke = snapshot(0);
    expect((await act(0, buy)).data.error).toMatch(/không đủ/);
    expect(snapshot(0)).toEqual(broke);
  });

  it('partial P2P sale, cancellation, idempotency and simultaneous last-item purchase conserve money and stock', async () => {
    move(0, 'market');
    await act(0, { type: 'BUY_ITEM', itemId: 'beans', quantity: 10 });
    await act(0, { type: 'CREATE_LISTING', itemId: 'beans', quantity: 6, price: 1234 });
    const listing = server.service.marketplace.list()[0];
    expect((await act(1, { type: 'CANCEL_LISTING', listingId: listing.id })).status).toBe(403);
    expect((await act(0, { type: 'BUY_LISTING', listingId: listing.id, quantity: 1 })).status).toBe(400);
    const cash = [snapshot(0).cash, snapshot(1).cash];
    const request = { type: 'BUY_LISTING', listingId: listing.id, quantity: 2, requestId: crypto.randomUUID() };
    expect((await act(1, request)).status).toBe(200);
    expect((await act(1, request)).status).toBe(200);
    expect(snapshot(0).cash).toBe(cash[0] + 2468);
    expect(snapshot(1).cash).toBe(cash[1] - 2468);
    expect(snapshot(1).inventory[0]).toMatchObject({ quantity: 2, cost: 2468 });
    expect((await act(0, { type: 'CANCEL_LISTING', listingId: listing.id })).status).toBe(200);
    expect(snapshot(0).inventory[0]).toMatchObject({ quantity: 8, cost: 8000 });
    expect((await act(0, { type: 'CANCEL_LISTING', listingId: listing.id })).status).toBe(403);
    await act(0, { type: 'CREATE_LISTING', itemId: 'beans', quantity: 1, price: 1000 });
    const last = server.service.marketplace.list()[0];
    const totalCash = users.reduce((sum, _, i) => sum + snapshot(i).cash, 0);
    const results = await Promise.all([1, 2].map(i => act(i, { type: 'BUY_LISTING', listingId: last.id, quantity: 1 })));
    expect(results.map(r => r.status).sort()).toEqual([200, 409]);
    expect(users.reduce((sum, _, i) => sum + snapshot(i).cash, 0)).toBe(totalCash);
    expect(users.reduce((sum, _, i) => sum + (snapshot(i).inventory[0]?.quantity ?? 0), 0)).toBe(10);
  });

  it.each(['lot-1', 'lot-2'])('%s: competing rentals, ownership checks and the complete coffee-shop lifecycle', async lot => {
    const rent = { type: 'RENT_PROPERTY', propertyId: lot, name: 'Audit Coffee' };
    expect((await act(0, rent)).status).toBe(400);
    move(0, lot); move(1, lot);
    server.db.run('UPDATE player_wallets SET cash=0 WHERE player_id=?', users[0].id);
    expect((await act(0, rent)).status).toBe(400);
    expect(server.db.get<{ owner_id: string | null }>('SELECT owner_id FROM properties WHERE id=?', lot)!.owner_id).toBeNull();
    server.db.run('UPDATE player_wallets SET cash=? WHERE player_id=?', CONFIG.startingCash, users[0].id);
    const results = await Promise.all([act(0, rent), act(1, rent)]);
    expect(results.map(r => r.status).sort()).toEqual([200, 409]);
    const owner = results.findIndex(r => r.status === 200), other = 1 - owner;
    const business = snapshot(owner).businesses[0];
    expect(business.propertyId).toBe(lot);
    expect(snapshot(owner).cash).toBe(CONFIG.startingCash - def.rent);
    expect(snapshot(other).cash).toBe(CONFIG.startingCash);
    for (const action of [
      { type: 'BUY_EQUIPMENT' }, { type: 'STOCK_BUSINESS', quantity: 1 },
      { type: 'SET_PRICE', price: 600 }, { type: 'TOGGLE_BUSINESS', open: true }, { type: 'UPGRADE_BUSINESS' },
    ]) expect((await act(other, { ...action, businessId: business.id })).status).toBe(403);
    const open = { type: 'TOGGLE_BUSINESS', businessId: business.id, open: true };
    expect((await act(owner, open)).status).toBe(400);
    expect((await act(owner, { type: 'BUY_EQUIPMENT', businessId: business.id })).status).toBe(200);
    const afterEquipment = snapshot(owner).cash;
    expect((await act(owner, { type: 'BUY_EQUIPMENT', businessId: business.id })).status).toBe(400);
    expect(snapshot(owner).cash).toBe(afterEquipment);
    expect((await act(owner, open)).status).toBe(400);
    move(owner, 'market');
    await act(owner, { type: 'BUY_ITEM', itemId: 'beans', quantity: 1 });
    expect((await act(owner, { type: 'STOCK_BUSINESS', businessId: business.id, quantity: 2 })).status).toBe(400);
    expect((await act(owner, { type: 'STOCK_BUSINESS', businessId: business.id, quantity: 1 })).status).toBe(200);
    expect((await act(owner, { type: 'SET_PRICE', businessId: business.id, price: 600 })).status).toBe(200);
    expect((await act(owner, open)).status).toBe(200);
    const beforeSales = snapshot(owner).cash;
    for (let i = 0; i < 4; i++) expect(server.service.businesses.sale(business.id)).not.toBeNull();
    expect(server.service.businesses.sale(business.id)).toBeNull();
    expect(snapshot(owner).cash).toBe(beforeSales + 2400);
    expect(snapshot(owner).businesses[0]).toMatchObject({ servings: 0, stockCost: 0, cogs: 1000, revenue: 2400, open: false, profit: 2400 - 1000 - def.rent });
    const otherLot = lot === 'lot-1' ? 'lot-2' : 'lot-1'; move(owner, otherLot);
    expect((await act(owner, { ...rent, propertyId: otherLot })).status).toBe(400);
    const day = server.room.time.day + 1;
    server.service.businesses.chargeDay(day);
    const afterCharge = snapshot(owner).cash;
    server.service.businesses.chargeDay(day);
    expect(snapshot(owner).cash).toBe(afterCharge);
    expect(afterCharge).toBe(beforeSales + 2400 - def.rent);
  });
});
