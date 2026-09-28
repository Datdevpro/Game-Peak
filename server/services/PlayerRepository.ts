import { randomUUID } from 'node:crypto';
import { BUSINESS_DEFINITIONS, calculateSavingsPayout, type ItemId } from '../../shared/config';
import type { Business, InventoryItem, PlayerState, Point, SavingsDeposit } from '../../shared/types';
import { GameDatabase } from '../database/db';
import { ensure } from './errors';
export interface ProfileRow { id: string; username: string; avatar: number; x: number; y: number; apartment: number; commerce: number }
export interface BusinessRow { id: string; owner_id: string; property_id: string; type: 'coffee'; name: string; level: number; equipped: number; is_open: number; price: number; revenue: number; cogs: number; rent: number; salary: number; utility: number; reputation: number; customers: number; last_charged_day: number; servings: number; stock_cost: number }
export const businessQuery = 'SELECT b.*,i.servings,i.cost AS stock_cost FROM businesses b JOIN business_inventory i ON i.business_id=b.id';
export function toBusiness(b: BusinessRow): Business {
  const def = BUSINESS_DEFINITIONS[b.type];
  return { id: b.id, ownerId: b.owner_id, propertyId: b.property_id, type: b.type, name: b.name, level: b.level, equipped: !!b.equipped, open: !!b.is_open, price: b.price, servings: b.servings, stockCost: b.stock_cost, revenue: b.revenue, cogs: b.cogs, rent: b.rent, salary: b.salary, utility: b.utility, profit: b.revenue - b.cogs - b.rent - b.salary - b.utility, reputation: b.reputation, customers: b.customers, valuation: Math.round((b.equipped ? def.equipment : 0) * 0.8 + (b.level - 1) * def.upgrade * 0.8) + b.stock_cost };
}
export class PlayerRepository {
  constructor(readonly db: GameDatabase) {}
  profile(id: string) { const p = this.db.get<ProfileRow>('SELECT id,username,avatar,x,y,apartment,commerce FROM profiles WHERE id=?', id); ensure(p, 'Không tìm thấy tài khoản.', 401); return p; }
  wallet(id: string) { const w = this.db.get<{ cash: number; bank: number }>('SELECT cash,bank FROM player_wallets WHERE player_id=?', id); ensure(w, 'Không tìm thấy ví.'); return w; }
  inventory(id: string) { return this.db.all<InventoryItem>('SELECT item_id AS itemId,quantity,cost FROM inventory_items WHERE player_id=? AND quantity>0', id); }
  addItem(id: string, item: ItemId, quantity: number, cost: number) {
    this.db.run('INSERT INTO inventory_items VALUES(?,?,?,?) ON CONFLICT(player_id,item_id) DO UPDATE SET quantity=quantity+excluded.quantity,cost=cost+excluded.cost', id, item, quantity, cost);
  }
  takeItem(id: string, item: ItemId, quantity: number) {
    const row = this.db.get<{ quantity: number; cost: number }>('SELECT quantity,cost FROM inventory_items WHERE player_id=? AND item_id=?', id, item);
    ensure(row && row.quantity >= quantity, 'Bạn chưa có đủ hàng trong túi.');
    const cost = quantity === row.quantity ? row.cost : Math.floor(row.cost * quantity / row.quantity);
    this.db.run('UPDATE inventory_items SET quantity=quantity-?,cost=cost-? WHERE player_id=? AND item_id=?', quantity, cost, id, item); return cost;
  }
  debit(id: string, amount: number, label: string, businessId: string | null = null) {
    ensure(Number.isSafeInteger(amount) && amount >= 0, 'Số tiền không hợp lệ.');
    ensure(this.wallet(id).cash >= amount, 'Tiền mặt không đủ cho giao dịch này.');
    this.db.run('UPDATE player_wallets SET cash=cash-? WHERE player_id=?', amount, id); this.ledger(id, -amount, label, businessId);
  }
  credit(id: string, amount: number, label: string, businessId: string | null = null) {
    ensure(Number.isSafeInteger(amount) && amount >= 0, 'Số tiền không hợp lệ.');
    this.db.run('UPDATE player_wallets SET cash=cash+? WHERE player_id=?', amount, id); this.ledger(id, amount, label, businessId);
  }
  ledger(id: string, amount: number, label: string, businessId: string | null = null) { this.db.run('INSERT INTO ledger VALUES(?,?,?,?,?,?)', randomUUID(), id, businessId, label, amount, Date.now()); }
  businesses(id?: string) { return this.db.all<BusinessRow>(businessQuery + (id ? ' WHERE b.owner_id=?' : ''), ...(id ? [id] : [])).map(toBusiness); }

  savings(id: string): SavingsDeposit[] {
    const rows = this.db.all<{
      id: string; player_id: string; principal: number; term_months: number;
      interest_rate: number; is_compound: number; created_at: number;
      duration_seconds: number; status: 'active' | 'withdrawn';
      withdrawn_at: number | null; interest_paid: number;
    }>('SELECT * FROM bank_savings WHERE player_id=? ORDER BY created_at DESC', id);

    const now = Date.now();
    return rows.map(r => {
      const elapsedSeconds = Math.max(0, (now - r.created_at) / 1000);
      const progress = Math.min(1, elapsedSeconds / r.duration_seconds);
      const isCompound = !!r.is_compound;

      const payout = calculateSavingsPayout(r.principal, r.term_months, r.interest_rate, isCompound, progress);
      const fullPayout = calculateSavingsPayout(r.principal, r.term_months, r.interest_rate, isCompound, 1);

      return {
        id: r.id,
        playerId: r.player_id,
        principal: r.principal,
        termMonths: r.term_months,
        interestRate: r.interest_rate,
        isCompound,
        createdAt: r.created_at,
        durationSeconds: r.duration_seconds,
        maturesAt: r.created_at + r.duration_seconds * 1000,
        status: r.status,
        withdrawnAt: r.withdrawn_at ?? undefined,
        interestPaid: r.interest_paid,
        currentInterest: r.status === 'withdrawn' ? r.interest_paid : payout.interest,
        expectedPayout: fullPayout.total,
      };
    });
  }

  fashion(id: string) {
    const row = this.db.get<{ umbrella: number; raincoat: number; cap: number }>(
      'SELECT umbrella, raincoat, cap FROM player_fashion WHERE player_id=?',
      id
    );
    return {
      umbrella: !!row?.umbrella,
      raincoat: !!row?.raincoat,
      cap: !!row?.cap,
    };
  }

  snapshot(id: string, prices: Record<ItemId, number>, position?: Point): PlayerState {
    const p = this.profile(id), wallet = this.wallet(id), inventory = this.inventory(id), businesses = this.businesses(id);
    const escrow = this.db.all<{ item_id: ItemId; quantity: number }>("SELECT item_id,quantity FROM marketplace_listings WHERE seller_id=? AND status='active'", id);
    const savings = this.savings(id);
    const activeSavings = savings.filter(s => s.status === 'active');
    const savingsTotal = activeSavings.reduce((sum, s) => sum + s.principal + s.currentInterest, 0);
    const fashion = this.fashion(id);

    const netWorth = wallet.cash + wallet.bank + savingsTotal + inventory.reduce((sum, item) => sum + item.quantity * (prices[item.itemId] ?? 0), 0) + escrow.reduce((sum, item) => sum + item.quantity * (prices[item.item_id] ?? 0), 0) + businesses.reduce((sum, b) => sum + b.valuation, 0);

    return {
      id, name: p.username, avatar: p.avatar, x: position?.x ?? p.x, y: position?.y ?? p.y, direction: 1, moving: false,
      cash: wallet.cash, bankBalance: wallet.bank, netWorth, inventory, businesses,
      apartment: !!p.apartment, skills: { commerce: p.commerce },
      ledger: this.db.all('SELECT id,label,amount,created_at AS createdAt FROM ledger WHERE player_id=? ORDER BY created_at DESC,rowid DESC LIMIT 20', id),
      savings,
      equippedFashion: fashion,
    };
  }
}
