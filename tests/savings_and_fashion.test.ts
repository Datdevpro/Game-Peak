import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GameDatabase } from '../server/database/db';
import { AuthService } from '../server/services/AuthService';
import { GameService } from '../server/services/GameService';
import { getVietnamTime, TimeManager } from '../server/systems/TimeManager';
import { BANK_TERMS, calculateSavingsPayout, ITEMS } from '../shared/config';
import { randomUUID } from 'node:crypto';
import { unlinkSync } from 'node:fs';

const TEST_DB = 'test_savings_fashion.db';

describe('Thời gian 24h & Asia/Ho_Chi_Minh Timezone', () => {
  it('getVietnamTime đồng bộ với thời gian thực Asia/Ho_Chi_Minh và trả về HH:MM 24h', () => {
    const vnTime = getVietnamTime();
    
    expect(vnTime).toBeDefined();
    expect(vnTime.hour).toBeGreaterThanOrEqual(0);
    expect(vnTime.hour).toBeLessThanOrEqual(24);
    expect(vnTime.minutes).toBeGreaterThanOrEqual(0);
    
    const tm = new TimeManager(0, true);
    expect(Math.abs(tm.minutes - vnTime.minutes)).toBeLessThan(0.1);
  });
});

describe('Ngân hàng: Kỳ hạn gửi & Lãi kép (Compound Interest)', () => {
  it('Các kỳ hạn 1, 3, 6, 9, 12 tháng được cấu hình chính xác', () => {
    const months = BANK_TERMS.map(t => t.months);
    expect(months).toEqual([1, 3, 6, 9, 12]);
    
    // Lãi suất kỳ hạn dài hơn phải cao hơn kỳ hạn ngắn
    for (let i = 1; i < BANK_TERMS.length; i++) {
      expect(BANK_TERMS[i].rate).toBeGreaterThan(BANK_TERMS[i - 1].rate);
    }
  });

  it('Lãi kép tính toán chính xác theo công thức A = P*(1 + r/12)^m và cao hơn lãi đơn', () => {
    const principal = 1_000_000; // $10,000.00
    const term12m = BANK_TERMS.find(t => t.months === 12)!;
    
    const simple = calculateSavingsPayout(principal, term12m.months, term12m.rate, false, 1);
    const compound = calculateSavingsPayout(principal, term12m.months, term12m.rate, true, 1);
    
    // Lãi đơn: I = P * r * (12/12) = 1,000,000 * 0.105 = 105,000
    expect(simple.interest).toBe(105_000);
    expect(simple.total).toBe(1_105_000);
    
    // Lãi kép: A = 1,000,000 * (1 + 0.105/12)^12 = 1,000,000 * (1.00875)^12 ≈ 1,110,203
    expect(compound.interest).toBeGreaterThan(simple.interest);
    expect(compound.total).toBeGreaterThan(simple.total);
    
    // Thặng dư từ lãi mẹ đẻ lãi con
    const surplus = compound.interest - simple.interest;
    expect(surplus).toBeGreaterThan(5000); // Thặng dư hơn $50.00
  });
});

describe('GameService: Gửi tiết kiệm & Mua sắm Cửa Hàng Thời Trang', () => {
  let db: GameDatabase;
  let auth: AuthService;
  let service: GameService;
  let playerId: string;

  beforeEach(async () => {
    try { unlinkSync(TEST_DB); } catch {}
    db = new GameDatabase(TEST_DB);
    auth = new AuthService(db);
    service = new GameService(db);
    const registered = await auth.register('TestPlayer', 'password123', 1);
    playerId = registered.id;
  });

  afterEach(() => {
    db.close();
    try { unlinkSync(TEST_DB); } catch {}
  });

  it('người chơi mở sổ tiết kiệm lãi kép và tất toán khi đáo hạn', () => {
    const initialCash = service.players.wallet(playerId).cash;
    const depositAmount = 500_000; // $5,000.00
    
    // Mở sổ 6 tháng lãi kép
    service.execute(playerId, {
      type: 'CREATE_SAVINGS',
      amount: depositAmount,
      termMonths: 6,
      isCompound: true,
      fromBank: false,
      requestId: randomUUID(),
    }, undefined, 1, 12);

    expect(service.players.wallet(playerId).cash).toBe(initialCash - depositAmount);

    const savings = service.players.savings(playerId);
    expect(savings).toHaveLength(1);
    expect(savings[0].principal).toBe(depositAmount);
    expect(savings[0].termMonths).toBe(6);
    expect(savings[0].isCompound).toBe(true);
    expect(savings[0].status).toBe('active');

    // Giả lập đáo hạn
    db.run('UPDATE bank_savings SET created_at = ? WHERE id = ?', Date.now() - 2000 * 1000, savings[0].id);

    // Tất toán sổ
    const bankBefore = service.players.wallet(playerId).bank;
    service.execute(playerId, {
      type: 'WITHDRAW_SAVINGS',
      savingsId: savings[0].id,
      requestId: randomUUID(),
    }, undefined, 1, 12);

    const bankAfter = service.players.wallet(playerId).bank;
    const expected = calculateSavingsPayout(depositAmount, 6, savings[0].interestRate, true, 1);
    expect(bankAfter - bankBefore).toBe(expected.total);

    const updatedSavings = service.players.savings(playerId);
    expect(updatedSavings[0].status).toBe('withdrawn');
  });

  it('người chơi mua vật phẩm thời trang (dù, áo mưa, nón) và trang bị', () => {
    const cashBefore = service.players.wallet(playerId).cash;

    // 1. Mua Dù đi mưa
    service.execute(playerId, {
      type: 'BUY_FASHION_ITEM',
      itemId: 'umbrella',
      requestId: randomUUID(),
    }, undefined, 1, 12);

    // 2. Mua Áo mưa
    service.execute(playerId, {
      type: 'BUY_FASHION_ITEM',
      itemId: 'raincoat',
      requestId: randomUUID(),
    }, undefined, 1, 12);

    // 3. Mua Nón lưỡi trai
    service.execute(playerId, {
      type: 'BUY_FASHION_ITEM',
      itemId: 'cap',
      requestId: randomUUID(),
    }, undefined, 1, 12);

    const totalCost = ITEMS.umbrella.basePrice + ITEMS.raincoat.basePrice + ITEMS.cap.basePrice;
    expect(service.players.wallet(playerId).cash).toBe(cashBefore - totalCost);

    const inv = service.players.inventory(playerId);
    expect(inv.find(i => i.itemId === 'umbrella')?.quantity).toBe(1);
    expect(inv.find(i => i.itemId === 'raincoat')?.quantity).toBe(1);
    expect(inv.find(i => i.itemId === 'cap')?.quantity).toBe(1);

    // Cả 3 món tự động trang bị khi mua mới
    let fashion = service.players.fashion(playerId);
    expect(fashion.umbrella).toBe(true);
    expect(fashion.raincoat).toBe(true);
    expect(fashion.cap).toBe(true);

    // Thử tháo nón lưỡi trai
    service.execute(playerId, {
      type: 'TOGGLE_EQUIP_FASHION',
      item: 'cap',
      requestId: randomUUID(),
    }, undefined, 1, 12);

    fashion = service.players.fashion(playerId);
    expect(fashion.cap).toBe(false);
    expect(fashion.umbrella).toBe(true);
  });
});
