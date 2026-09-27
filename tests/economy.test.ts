import { describe, expect, it } from 'vitest';
import { GameDatabase } from '../server/database/db';
import { AuthService } from '../server/services/AuthService';
import { GameService } from '../server/services/GameService';
import { NPCManager } from '../server/systems/NPCManager';
import { CONFIG, ITEMS } from '../shared/config';
import { BUILDINGS, distance } from '../shared/world';

function setup() {
  const db = new GameDatabase(':memory:');
  const auth = new AuthService(db);
  const service = new GameService(db);
  return { db, auth, service };
}

describe('kinh tế và cửa hàng', () => {
  it('đăng ký cấp đúng số dư khởi đầu và ghi nhận ví', async () => {
    const { auth, service } = setup();
    const user = await auth.register('tester1', 'password123', 0);
    const snap = service.players.snapshot(user.id, service.economy.prices);
    expect(snap.cash).toBe(CONFIG.startingCash);
    expect(snap.bankBalance).toBe(0);
    expect(snap.netWorth).toBe(CONFIG.startingCash);
  });

  it('giao dịch ngân hàng gửi và rút tiền chính xác', async () => {
    const { auth, service } = setup();
    const user = await auth.register('banker', 'password123', 0);
    service.execute(user.id, { type: 'DEPOSIT', amount: 300_000, requestId: '11111111-1111-4111-8111-111111111111' }, undefined, 1);
    let snap = service.players.snapshot(user.id, service.economy.prices);
    expect(snap.cash).toBe(CONFIG.startingCash - 300_000);
    expect(snap.bankBalance).toBe(300_000);
    expect(snap.netWorth).toBe(CONFIG.startingCash);

    service.execute(user.id, { type: 'WITHDRAW', amount: 100_000, requestId: '22222222-2222-4222-8222-222222222222' }, undefined, 1);
    snap = service.players.snapshot(user.id, service.economy.prices);
    expect(snap.cash).toBe(CONFIG.startingCash - 200_000);
    expect(snap.bankBalance).toBe(200_000);
  });

  it('mua bán tại chợ đầu mối tính giá vốn thực tế và cập nhật tồn kho', async () => {
    const { auth, service } = setup();
    const user = await auth.register('trader', 'password123', 0);
    const marketDoor = BUILDINGS.find(b => b.id === 'market')!.door;

    // Buy 10 coffee beans
    const unitPrice = service.economy.prices.beans;
    service.execute(user.id, { type: 'BUY_ITEM', itemId: 'beans', quantity: 10, requestId: '33333333-3333-4333-8333-333333333333' }, marketDoor, 1, 10);
    let snap = service.players.snapshot(user.id, service.economy.prices);
    const item = snap.inventory.find(i => i.itemId === 'beans');
    expect(item).toBeDefined();
    expect(item!.quantity).toBe(10);
    expect(item!.cost).toBe(unitPrice * 10);
    expect(snap.cash).toBe(CONFIG.startingCash - unitPrice * 10);

    // Sell 4 coffee beans back to wholesale market
    const sellUnit = Math.floor(unitPrice * 0.75);
    service.execute(user.id, { type: 'SELL_ITEM', itemId: 'beans', quantity: 4, requestId: '44444444-4444-4444-8444-444444444444' }, marketDoor, 1, 10);
    snap = service.players.snapshot(user.id, service.economy.prices);
    const remaining = snap.inventory.find(i => i.itemId === 'beans')!;
    expect(remaining.quantity).toBe(6);
    expect(remaining.cost).toBe(unitPrice * 6);
  });

  it('marketplace giữ hàng khi đăng bán và hoàn lại khi hủy tin', async () => {
    const { auth, service } = setup();
    const seller = await auth.register('seller', 'password123', 0);
    const marketDoor = BUILDINGS.find(b => b.id === 'market')!.door;

    service.execute(seller.id, { type: 'BUY_ITEM', itemId: 'beans', quantity: 10, requestId: '55555555-5555-4555-8555-555555555555' }, marketDoor, 1, 10);
    
    // Create marketplace listing for 6 beans
    service.execute(seller.id, { type: 'CREATE_LISTING', itemId: 'beans', quantity: 6, price: 1200, requestId: '66666666-6666-4666-8666-666666666666' }, undefined, 1);
    let snap = service.players.snapshot(seller.id, service.economy.prices);
    expect(snap.inventory.find(i => i.itemId === 'beans')!.quantity).toBe(4);
    // Net worth still includes the escrowed stock
    expect(snap.netWorth).toBeGreaterThan(snap.cash);

    const listings = service.marketplace.list();
    expect(listings.length).toBe(1);
    expect(listings[0].quantity).toBe(6);

    // Cancel listing
    service.execute(seller.id, { type: 'CANCEL_LISTING', listingId: listings[0].id, requestId: '77777777-7777-4777-8777-777777777777' }, undefined, 1);
    snap = service.players.snapshot(seller.id, service.economy.prices);
    expect(snap.inventory.find(i => i.itemId === 'beans')!.quantity).toBe(10);
    expect(service.marketplace.list().length).toBe(0);
  });

  it('giao dịch marketplace giữa 2 người chơi chuyển tiền và hàng an toàn', async () => {
    const { auth, service } = setup();
    const seller = await auth.register('seller2', 'password123', 0);
    const buyer = await auth.register('buyer2', 'password123', 0);
    const marketDoor = BUILDINGS.find(b => b.id === 'market')!.door;

    service.execute(seller.id, { type: 'BUY_ITEM', itemId: 'beans', quantity: 10, requestId: '88888888-8888-4888-8888-888888888888' }, marketDoor, 1, 10);
    service.execute(seller.id, { type: 'CREATE_LISTING', itemId: 'beans', quantity: 5, price: 1500, requestId: '99999999-9999-4999-8999-999999999999' }, undefined, 1);

    const listing = service.marketplace.list()[0];
    const sellerCashBefore = service.players.wallet(seller.id).cash;
    const buyerCashBefore = service.players.wallet(buyer.id).cash;

    // Buyer buys 5 beans
    service.execute(buyer.id, { type: 'BUY_LISTING', listingId: listing.id, quantity: 5, requestId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }, undefined, 1);

    expect(service.players.wallet(seller.id).cash).toBe(sellerCashBefore + 7500);
    expect(service.players.wallet(buyer.id).cash).toBe(buyerCashBefore - 7500);
    const buyerBeans = service.players.inventory(buyer.id).find(i => i.itemId === 'beans');
    expect(buyerBeans!.quantity).toBe(5);
    expect(buyerBeans!.cost).toBe(7500);
  });

  it('chống race condition khi 2 người cùng mua món cuối của marketplace', async () => {
    const { auth, service } = setup();
    const seller = await auth.register('sellerRace', 'password123', 0);
    const buyerA = await auth.register('buyerA', 'password123', 0);
    const buyerB = await auth.register('buyerB', 'password123', 0);
    const marketDoor = BUILDINGS.find(b => b.id === 'market')!.door;

    service.execute(seller.id, { type: 'BUY_ITEM', itemId: 'beans', quantity: 1, requestId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' }, marketDoor, 1, 10);
    service.execute(seller.id, { type: 'CREATE_LISTING', itemId: 'beans', quantity: 1, price: 1000, requestId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' }, undefined, 1);

    const listing = service.marketplace.list()[0];

    // First buyer succeeds
    service.execute(buyerA.id, { type: 'BUY_LISTING', listingId: listing.id, quantity: 1, requestId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' }, undefined, 1);

    // Second buyer must fail because stock is exhausted
    expect(() => {
      service.execute(buyerB.id, { type: 'BUY_LISTING', listingId: listing.id, quantity: 1, requestId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee' }, undefined, 1);
    }).toThrow(/hết hàng/);
  });

  it('chuỗi vận hành quán cà phê: thuê, sắm máy, nhập kho, định giá và tính lợi nhuận', async () => {
    const { auth, service } = setup();
    const owner = await auth.register('barista', 'password123', 0);
    const lot1Door = BUILDINGS.find(b => b.id === 'lot-1')!.door;
    const marketDoor = BUILDINGS.find(b => b.id === 'market')!.door;

    // Rent property
    service.execute(owner.id, { type: 'RENT_PROPERTY', propertyId: 'lot-1', name: 'Mầm Coffee', requestId: 'ffffffff-ffff-4fff-8fff-ffffffffffff' }, lot1Door, 1);
    let biz = service.players.businesses(owner.id)[0];
    expect(biz).toBeDefined();
    expect(biz.name).toBe('Mầm Coffee');
    expect(biz.open).toBe(false);

    // Buy beans from market
    service.execute(owner.id, { type: 'BUY_ITEM', itemId: 'beans', quantity: 10, requestId: '10101010-1010-4010-8010-101010101010' }, marketDoor, 1, 10);

    // Buy equipment
    service.execute(owner.id, { type: 'BUY_EQUIPMENT', businessId: biz.id, requestId: '20202020-2020-4020-8020-202020202020' }, undefined, 1);
    biz = service.players.businesses(owner.id)[0];
    expect(biz.equipped).toBe(true);

    // Stock 5 beans (turns into 5 * 4 = 20 servings)
    service.execute(owner.id, { type: 'STOCK_BUSINESS', businessId: biz.id, quantity: 5, requestId: '30303030-3030-4030-8030-303030303030' }, undefined, 1);
    biz = service.players.businesses(owner.id)[0];
    expect(biz.servings).toBe(20);

    // Set coffee price to $5.00 (500 cents)
    service.execute(owner.id, { type: 'SET_PRICE', businessId: biz.id, price: 500, requestId: '40404040-4040-4040-8040-404040404040' }, undefined, 1);

    // Open shop
    service.execute(owner.id, { type: 'TOGGLE_BUSINESS', businessId: biz.id, open: true, requestId: '50505050-5050-4050-8050-505050505050' }, undefined, 1);
    biz = service.players.businesses(owner.id)[0];
    expect(biz.open).toBe(true);
  });

  it('khách NPC tới quán: chỉ phát sinh doanh thu khi khách thực sự tới quán', async () => {
    const { auth, service } = setup();
    const owner = await auth.register('cafeOwner', 'password123', 0);
    const lot1Door = BUILDINGS.find(b => b.id === 'lot-1')!.door;
    const marketDoor = BUILDINGS.find(b => b.id === 'market')!.door;

    // Set up open coffee shop
    service.execute(owner.id, { type: 'RENT_PROPERTY', propertyId: 'lot-1', name: 'Góc Phố', requestId: '60606060-6060-4060-8060-606060606060' }, lot1Door, 1);
    const biz = service.players.businesses(owner.id)[0];
    service.execute(owner.id, { type: 'BUY_ITEM', itemId: 'beans', quantity: 5, requestId: '70707070-7070-4070-8070-707070707070' }, marketDoor, 1, 10);
    service.execute(owner.id, { type: 'BUY_EQUIPMENT', businessId: biz.id, requestId: '80808080-8080-4080-8080-808080808080' }, undefined, 1);
    service.execute(owner.id, { type: 'STOCK_BUSINESS', businessId: biz.id, quantity: 5, requestId: '90909090-9090-4090-8090-909090909090' }, undefined, 1);
    service.execute(owner.id, { type: 'TOGGLE_BUSINESS', businessId: biz.id, open: true, requestId: 'a0a0a0a0-a0a0-40a0-80a0-a0a0a0a0a0a0' }, undefined, 1);

    const initialCash = service.players.wallet(owner.id).cash;
    let salesRecorded = 0;

    // Create NPCManager with deterministic random (returns 0.1 so conditions always pass)
    const npcs = new NPCManager(service.businesses, () => {
      salesRecorded++;
    }, () => 0.1);

    // Advance simulation so decision cycle triggers and NPC chooses the coffee shop
    let shoppingNpc = undefined;
    for (let i = 0; i < 5; i++) {
      npcs.update(1, 12, 'sunny', null);
      shoppingNpc = npcs.actors.find(a => a.targetBusiness === biz.id);
      if (shoppingNpc) break;
    }

    expect(shoppingNpc).toBeDefined();
    expect(shoppingNpc!.state).toBe('walking');

    // Revenue has NOT happened yet because NPC is still walking on the way
    expect(salesRecorded).toBe(0);
    expect(service.players.wallet(owner.id).cash).toBe(initialCash);

    // Simulate travel time: step by step until NPC reaches destination and makes purchase
    for (let step = 0; step < 80; step++) {
      npcs.update(0.5, 12, 'sunny', null);
      if (salesRecorded > 0) break;
    }

    // Now NPC has arrived, waited, and completed the purchase!
    expect(salesRecorded).toBeGreaterThan(0);
    const updatedBiz = service.players.businesses(owner.id)[0];
    expect(updatedBiz.customers).toBeGreaterThan(0);
    expect(updatedBiz.revenue).toBeGreaterThan(0);
    expect(updatedBiz.servings).toBeLessThan(20);
    expect(service.players.wallet(owner.id).cash).toBeGreaterThan(initialCash);
  });
});
