import { randomUUID } from 'node:crypto';
import type { ItemId } from '../../shared/config';
import type { Listing } from '../../shared/types';
import { PlayerRepository } from './PlayerRepository';
import { ensure } from './errors';
interface ListingRow { id: string; seller_id: string; item_id: ItemId; quantity: number; price: number; cost: number; status: string }
// All mutation methods execute inside the caller's database transaction.
export class MarketplaceManager {
  constructor(private players: PlayerRepository) {}
  list() { return this.players.db.all<Listing>("SELECT l.id,l.seller_id AS sellerId,p.username AS sellerName,l.item_id AS itemId,l.quantity,l.price FROM marketplace_listings l JOIN profiles p ON p.id=l.seller_id WHERE l.status='active' AND l.quantity>0 ORDER BY l.created_at DESC LIMIT 100"); }
  create(id: string, item: ItemId, quantity: number, price: number) {
    const count = this.players.db.get<{ n: number }>("SELECT count(*) AS n FROM marketplace_listings WHERE seller_id=? AND status='active'", id)!.n;
    ensure(count < 25, 'Bạn có thể đăng tối đa 25 tin cùng lúc.');
    const cost = this.players.takeItem(id, item, quantity);
    this.players.db.run('INSERT INTO marketplace_listings(id,seller_id,item_id,quantity,price,cost,created_at) VALUES(?,?,?,?,?,?,?)', randomUUID(), id, item, quantity, price, cost, Date.now());
  }
  buy(id: string, listingId: string, quantity: number) {
    const db = this.players.db;
    const listing = db.get<ListingRow>('SELECT * FROM marketplace_listings WHERE id=?', listingId);
    ensure(listing && listing.status === 'active' && listing.quantity >= quantity, 'Tin này đã hết hàng hoặc không còn đủ số lượng.', 409);
    ensure(listing.seller_id !== id, 'Bạn không thể tự mua tin của mình.');
    const amount = quantity * listing.price;
    this.players.debit(id, amount, 'Mua hàng từ cư dân');
    this.players.credit(listing.seller_id, amount, 'Bán hàng trên chợ cư dân');
    this.players.addItem(id, listing.item_id, quantity, amount);
    const removedCost = quantity === listing.quantity ? listing.cost : Math.floor(listing.cost * quantity / listing.quantity);
    db.run("UPDATE marketplace_listings SET quantity=quantity-?,cost=cost-?,status=CASE WHEN quantity=? THEN 'sold' ELSE 'active' END WHERE id=?", quantity, removedCost, quantity, listing.id);
    db.run('INSERT INTO marketplace_transactions VALUES(?,?,?,?,?,?,?,?)', randomUUID(), listing.id, id, listing.seller_id, listing.item_id, quantity, amount, Date.now());
    db.run('UPDATE profiles SET commerce=commerce+1 WHERE id IN (?,?)', id, listing.seller_id);
    return listing.seller_id;
  }
  cancel(id: string, listingId: string) {
    const l = this.players.db.get<ListingRow>('SELECT * FROM marketplace_listings WHERE id=?', listingId);
    ensure(l && l.seller_id === id && l.status === 'active', 'Không thể hủy tin này.', 403);
    this.players.addItem(id, l.item_id, l.quantity, l.cost);
    this.players.db.run("UPDATE marketplace_listings SET quantity=0,cost=0,status='cancelled' WHERE id=?", listingId);
  }
}
