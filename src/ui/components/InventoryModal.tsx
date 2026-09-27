import React from 'react';
import { ITEMS, money } from '../../../shared/config';
import { useGameStore } from '../../stores/gameStore';
import { ModalWrapper } from './ModalWrapper';

export function InventoryModal({ onClose }: { onClose: () => void }) {
  const player = useGameStore(s => s.player);
  const world = useGameStore(s => s.world);
  const setPanel = useGameStore(s => s.setPanel);

  if (!player) return null;

  const totalValue = player.inventory.reduce((sum, item) => {
    const marketPrice = world.prices[item.itemId] ?? ITEMS[item.itemId].basePrice;
    return sum + item.quantity * marketPrice;
  }, 0);

  return (
    <ModalWrapper
      title="Túi Đồ Cá Nhân"
      badge={`${player.inventory.reduce((a, b) => a + b.quantity, 0)} món hàng`}
      icon="🎒"
      onClose={onClose}
      width="580px"
    >
      <div className="inventory-header-card card-panel mb-3">
        <div>
          <span className="inv-stat-label">Tổng giá trị hàng hóa theo thị giá:</span>
          <strong className="inv-stat-value text-green">💰 {money(totalValue)}</strong>
        </div>
        <button
          className="btn-secondary btn-sm"
          onClick={() => setPanel('market')}
        >
          Đến Chợ mua thêm hàng 🛒
        </button>
      </div>

      {player.inventory.length === 0 ? (
        <div className="empty-state">
          <span>🎒</span>
          <p>Túi đồ hiện đang trống. Hãy ghé Chợ Mầm Xanh để mua nguyên liệu!</p>
          <button className="btn-primary" onClick={() => setPanel('market')}>
            Đến Chợ Mầm Xanh
          </button>
        </div>
      ) : (
        <div className="inventory-items-grid">
          {player.inventory.map(item => {
            const def = ITEMS[item.itemId];
            const marketPrice = world.prices[item.itemId] ?? def.basePrice;
            const avgCost = Math.round(item.cost / item.quantity);

            return (
              <div key={item.itemId} className="inventory-item-card card-panel">
                <div className="item-main">
                  <span className="item-big-icon">{def.icon}</span>
                  <div className="item-details">
                    <h4 className="item-name">{def.name}</h4>
                    <span className="item-category">{def.category}</span>
                    <p className="item-desc">{def.description}</p>
                  </div>
                  <div className="item-count-badge">×{item.quantity}</div>
                </div>

                <div className="item-finance-bar">
                  <div>
                    <span>Giá vốn TB: </span>
                    <strong>{money(avgCost)}</strong>
                  </div>
                  <div>
                    <span>Thị giá hiện tại: </span>
                    <strong className="text-highlight">{money(marketPrice)}</strong>
                  </div>
                  <div>
                    <span>Tổng trị giá: </span>
                    <strong className="text-green">{money(item.quantity * marketPrice)}</strong>
                  </div>
                </div>

                <div className="item-quick-actions">
                  <button
                    className="btn-secondary btn-xs"
                    onClick={() => setPanel('market')}
                  >
                    Bán cho chợ đầu mối
                  </button>
                  <button
                    className="btn-secondary btn-xs"
                    onClick={() => setPanel('market')}
                  >
                    Đăng bán P2P
                  </button>
                  {item.itemId === 'beans' && player.businesses.length > 0 && (
                    <button
                      className="btn-primary btn-xs"
                      onClick={() => setPanel('business')}
                    >
                      Nạp vào quán ☕
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </ModalWrapper>
  );
}
