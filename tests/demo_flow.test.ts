import { describe, expect, it } from 'vitest';
import { createGameServer } from '../server/app';
import { BUILDINGS } from '../shared/world';
import { CONFIG } from '../shared/config';

describe('Demo Flow V1 Hoàn chỉnh (Section 35)', () => {
  it('thực hiện toàn bộ chuỗi trải nghiệm: đăng ký, mua hàng, thuê quán, bán cà phê cho NPC và giao dịch P2P', async () => {
    // 1. Start test server
    const server = createGameServer({ databasePath: ':memory:', debug: true });
    await server.listen(3099, '127.0.0.1');
    server.room.time.setHour(10);

    const api = async (path: string, body?: unknown, token?: string) => {
      const res = await fetch(`http://127.0.0.1:3099/api${path}`, {
        method: body ? 'POST' : 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok) throw new Error((data as any).error || 'Request failed');
      return data as any;
    };

    try {
      // Step 1: Player A đăng ký account "DatMaster"
      const regA = await api('/auth/register', {
        username: 'DatMaster',
        password: 'password123',
        avatar: 5,
      });
      const tokenA = regA.token;
      expect(tokenA).toBeDefined();

      // Step 2: Spawn với $100,000.00 (10,000,000 cents)
      const meA = await api('/me', undefined, tokenA);
      expect(meA.cash).toBe(CONFIG.startingCash);
      expect(meA.netWorth).toBe(CONFIG.startingCash);

      // Step 3: Player A đến chợ đầu mối (Chợ Mầm Xanh) mua 25 gói hạt cà phê
      const marketDoor = BUILDINGS.find(b => b.id === 'market')!.door;
      server.room.join(meA.id);
      server.room.players.get(meA.id)!.actor.x = marketDoor.x;
      server.room.players.get(meA.id)!.actor.y = marketDoor.y;

      const buyRes = await api('/action', {
        type: 'BUY_ITEM',
        itemId: 'beans',
        quantity: 25,
        requestId: crypto.randomUUID(),
      }, tokenA);
      expect(buyRes.player.inventory.find((i: any) => i.itemId === 'beans')?.quantity).toBe(25);

      // Step 4: Player A đến Mặt Bằng 01 (Commercial lot-1), thuê mặt bằng và đặt tên "Dat Coffee"
      const lot1Door = BUILDINGS.find(b => b.id === 'lot-1')!.door;
      server.room.players.get(meA.id)!.actor.x = lot1Door.x;
      server.room.players.get(meA.id)!.actor.y = lot1Door.y;

      await api('/action', {
        type: 'RENT_PROPERTY',
        propertyId: 'lot-1',
        name: 'Dat Coffee',
        requestId: crypto.randomUUID(),
      }, tokenA);

      let snapA = await api('/me', undefined, tokenA);
      const bizA = snapA.businesses[0];
      expect(bizA).toBeDefined();
      expect(bizA.name).toBe('Dat Coffee');

      // Step 5: Mua máy pha cà phê ($2,500.00 = 250,000 cents)
      await api('/action', {
        type: 'BUY_EQUIPMENT',
        businessId: bizA.id,
        requestId: crypto.randomUUID(),
      }, tokenA);

      // Step 6: Nhập 10 gói hạt vào kho quán cà phê (10 gói = 40 tách)
      await api('/action', {
        type: 'STOCK_BUSINESS',
        businessId: bizA.id,
        quantity: 10,
        requestId: crypto.randomUUID(),
      }, tokenA);

      // Step 7: Đặt giá cà phê $5.00 (500 cents)
      await api('/action', {
        type: 'SET_PRICE',
        businessId: bizA.id,
        price: 500,
        requestId: crypto.randomUUID(),
      }, tokenA);

      // Step 8: Mở cửa đón khách
      await api('/action', {
        type: 'TOGGLE_BUSINESS',
        businessId: bizA.id,
        open: true,
        requestId: crypto.randomUUID(),
      }, tokenA);

      snapA = await api('/me', undefined, tokenA);
      expect(snapA.businesses[0].open).toBe(true);
      expect(snapA.businesses[0].servings).toBe(40);

      // Step 9: NPC khách hàng tới quán -> phát sinh doanh thu khi khách tới
      const cashBefore = snapA.cash;
      // Advance simulation ticks so NPCs decide, travel to Dat Coffee, and buy coffee
      for (let tick = 0; tick < 300; tick++) {
        server.room.tick(0.2);
        if (server.service.players.businesses(meA.id)[0].customers > 0) break;
      }

      snapA = await api('/me', undefined, tokenA);
      const updatedBiz = snapA.businesses[0];
      expect(updatedBiz.customers).toBeGreaterThan(0);
      expect(updatedBiz.revenue).toBeGreaterThan(0);
      expect(updatedBiz.servings).toBeLessThan(40);
      expect(snapA.cash).toBeGreaterThan(cashBefore);

      // Step 10: Player A tạo tin đăng bán trên sàn P2P: 5 gói hạt cà phê giá $9.00/gói (900 cents)
      await api('/action', {
        type: 'CREATE_LISTING',
        itemId: 'beans',
        quantity: 5,
        price: 900,
        requestId: crypto.randomUUID(),
      }, tokenA);

      const marketListings = await api('/marketplace', undefined, tokenA);
      const listing = marketListings.find((l: any) => l.sellerId === meA.id);
      expect(listing).toBeDefined();
      expect(listing.quantity).toBe(5);
      expect(listing.price).toBe(900);

      // Step 11: Một account khác (Player B: "AnInvestor") đăng ký và mua tin đăng
      const regB = await api('/auth/register', {
        username: 'AnInvestor',
        password: 'password123',
        avatar: 2,
      });
      const tokenB = regB.token;

      const buyerCashBefore = (await api('/me', undefined, tokenB)).cash;
      const sellerCashBeforeTrade = (await api('/me', undefined, tokenA)).cash;

      await api('/action', {
        type: 'BUY_LISTING',
        listingId: listing.id,
        quantity: 5,
        requestId: crypto.randomUUID(),
      }, tokenB);

      // Tiền và hàng hóa của cả hai account được cập nhật nguyên tử!
      const sellerAfter = await api('/me', undefined, tokenA);
      const buyerAfter = await api('/me', undefined, tokenB);

      expect(sellerAfter.cash).toBe(sellerCashBeforeTrade + 5 * 900);
      expect(buyerAfter.cash).toBe(buyerCashBefore - 5 * 900);
      expect(buyerAfter.inventory.find((i: any) => i.itemId === 'beans')?.quantity).toBe(5);
    } finally {
      await server.close();
    }
  });
});
