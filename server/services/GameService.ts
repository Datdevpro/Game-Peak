import { z } from 'zod';
import { CONFIG, ITEMS, type ItemId } from '../../shared/config';
import { BUILDINGS, distance } from '../../shared/world';
import type { Point } from '../../shared/types';
import { GameDatabase } from '../database/db';
import { PlayerRepository } from './PlayerRepository';
import { BusinessManager } from './BusinessManager';
import { MarketplaceManager } from './MarketplaceManager';
import { EconomyManager } from './EconomyManager';
import { ensure } from './errors';
const quantity = z.number().int().min(1).max(CONFIG.maxQuantity);
const itemId = z.enum(['beans', 'milk', 'tea']);
const id = z.string().min(1).max(80);
const intentSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('BUY_ITEM'), itemId, quantity }), z.object({ type: z.literal('SELL_ITEM'), itemId, quantity }),
  z.object({ type: z.literal('DEPOSIT'), amount: z.number().int().min(1).max(1_000_000_000) }), z.object({ type: z.literal('WITHDRAW'), amount: z.number().int().min(1).max(1_000_000_000) }),
  z.object({ type: z.literal('RENT_PROPERTY'), propertyId: id, name: z.string().trim().min(2).max(28) }),
  z.object({ type: z.literal('RENT_APARTMENT') }),
  z.object({ type: z.literal('BUY_EQUIPMENT'), businessId: id }),
  z.object({ type: z.literal('STOCK_BUSINESS'), businessId: id, quantity }),
  z.object({ type: z.literal('SET_PRICE'), businessId: id, price: z.number().int().min(100).max(5000) }),
  z.object({ type: z.literal('TOGGLE_BUSINESS'), businessId: id, open: z.boolean() }),
  z.object({ type: z.literal('UPGRADE_BUSINESS'), businessId: id }),
  z.object({ type: z.literal('CREATE_LISTING'), itemId, quantity, price: z.number().int().min(1).max(CONFIG.maxPrice) }),
  z.object({ type: z.literal('BUY_LISTING'), listingId: id, quantity }),
  z.object({ type: z.literal('CANCEL_LISTING'), listingId: id }),
]);
export class GameService {
  readonly players: PlayerRepository; readonly businesses: BusinessManager; readonly marketplace: MarketplaceManager;
  readonly economy = new EconomyManager();
  constructor(readonly db: GameDatabase) { this.players = new PlayerRepository(db); this.businesses = new BusinessManager(this.players); this.marketplace = new MarketplaceManager(this.players); }
  execute(playerId: string, raw: unknown, position: Point | undefined, day: number, hour = 12) {
    const envelope = z.object({ requestId: z.string().uuid() }).parse(raw);
    const intent = intentSchema.parse(raw), fingerprint = JSON.stringify(intent);
    const result = this.db.transaction(() => {
      const prior = this.db.get<{ fingerprint: string; result: string }>('SELECT fingerprint,result FROM requests WHERE player_id=? AND request_id=?', playerId, envelope.requestId);
      if (prior) { ensure(prior.fingerprint === fingerprint, 'Mã giao dịch đã được dùng cho thao tác khác.', 409); return JSON.parse(prior.result) as { message: string; affected: string[] }; }
      const near = (buildingId: string) => { const b = BUILDINGS.find(b => b.id === buildingId); ensure(b && position && distance(position, b.door) <= CONFIG.interactionDistance + 8, 'Hãy đi tới cửa địa điểm này để tương tác.'); };
      let message = 'Đã hoàn tất.', affected = [playerId];
      switch (intent.type) {
        case 'BUY_ITEM': case 'SELL_ITEM': {
          near('market'); ensure(hour >= 6 && hour < 22, 'Chợ đầu mối mở cửa từ 06:00 đến 22:00. Chợ cư dân vẫn mở trên điện thoại.');
          const buying = intent.type === 'BUY_ITEM', unit = Math.floor(this.economy.prices[intent.itemId] * (buying ? 1 : 0.75));
          if (buying) { this.players.debit(playerId, unit * intent.quantity, `Mua ${intent.quantity} ${ITEMS[intent.itemId].name}`); this.players.addItem(playerId, intent.itemId, intent.quantity, unit * intent.quantity); }
          else { this.players.takeItem(playerId, intent.itemId, intent.quantity); this.players.credit(playerId, unit * intent.quantity, `Bán ${intent.quantity} ${ITEMS[intent.itemId].name}`); }
          message = buying ? 'Hàng đã được thêm vào túi.' : 'Đã bán hàng cho chợ đầu mối.'; break;
        }
        case 'DEPOSIT': this.players.debit(playerId, intent.amount, 'Gửi tiết kiệm'); this.db.run('UPDATE player_wallets SET bank=bank+? WHERE player_id=?', intent.amount, playerId); message = 'Đã gửi tiền vào ngân hàng.'; break;
        case 'WITHDRAW': ensure(this.players.wallet(playerId).bank >= intent.amount, 'Số dư ngân hàng không đủ.'); this.db.run('UPDATE player_wallets SET bank=bank-? WHERE player_id=?', intent.amount, playerId); this.players.credit(playerId, intent.amount, 'Rút tiền ngân hàng'); message = 'Đã rút tiền về ví.'; break;
        case 'RENT_PROPERTY': near(intent.propertyId); this.businesses.rent(playerId, intent.propertyId, intent.name, day); message = 'Chìa khóa đã thuộc về bạn. Hãy trang bị quán!'; break;
        case 'RENT_APARTMENT': near('apartment'); ensure(!this.players.profile(playerId).apartment, 'Bạn đã thuê căn hộ.'); this.players.debit(playerId, CONFIG.apartmentRent, 'Thuê căn hộ · trọn thời gian V1'); this.db.run('UPDATE profiles SET apartment=1 WHERE id=?', playerId); message = 'Chào mừng về nhà!'; break;
        case 'BUY_EQUIPMENT': this.businesses.equipment(playerId, intent.businessId); message = 'Máy pha đã sẵn sàng.'; break;
        case 'STOCK_BUSINESS': this.businesses.stock(playerId, intent.businessId, intent.quantity); message = 'Đã chuyển hạt cà phê vào kho quán.'; break;
        case 'SET_PRICE': this.businesses.price(playerId, intent.businessId, intent.price); message = 'Đã cập nhật giá bán.'; break;
        case 'TOGGLE_BUSINESS': {
          const b = this.businesses.get(intent.businessId, playerId);
          ensure(!intent.open || b.last_charged_day >= day, 'Cần đủ tiền mặt để thanh toán chi phí ngày mới; hệ thống thử lại mỗi giây.');
          this.businesses.toggle(playerId, intent.businessId, intent.open); message = intent.open ? 'Quán đã mở cửa. Khách đang trên đường tới!' : 'Quán đã đóng cửa.'; break;
        }
        case 'UPGRADE_BUSINESS': this.businesses.upgrade(playerId, intent.businessId); message = 'Không gian mới, danh tiếng mới!'; break;
        case 'CREATE_LISTING': this.marketplace.create(playerId, intent.itemId, intent.quantity, intent.price); message = 'Tin đã lên chợ. Hàng được giữ an toàn chờ người mua.'; break;
        case 'BUY_LISTING': affected.push(this.marketplace.buy(playerId, intent.listingId, intent.quantity)); message = 'Giao dịch thành công. Hàng đã vào túi.'; break;
        case 'CANCEL_LISTING': this.marketplace.cancel(playerId, intent.listingId); message = 'Đã hủy tin và hoàn lại hàng.'; break;
      }
      const value = { message, affected };
      this.db.run('INSERT INTO requests VALUES(?,?,?,?,?)', playerId, envelope.requestId, fingerprint, JSON.stringify(value), Date.now());
      return value;
    });
    // Prices change on the next simulation tick, after the committed trade.
    if (intent.type === 'BUY_ITEM' || intent.type === 'SELL_ITEM') this.economy.trade(intent.itemId as ItemId, intent.quantity * (intent.type === 'BUY_ITEM' ? 1 : -1));
    return result;
  }
}
