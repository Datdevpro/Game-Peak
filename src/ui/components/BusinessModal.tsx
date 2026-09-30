import React, { useState } from 'react';
import { BUSINESS_DEFINITIONS, CONFIG, money } from '../../../shared/config';
import { BUILDINGS, distance } from '../../../shared/world';
import { useGameStore } from '../../stores/gameStore';
import { action } from '../../services/api';
import { ModalWrapper } from './ModalWrapper';

export function BusinessModal({ onClose }: { onClose: () => void }) {
  const player = useGameStore(s => s.player);
  const world = useGameStore(s => s.world);
  const selected = useGameStore(s => s.selected);
  const connected = useGameStore(s => s.connected);
  const position = useGameStore(s => s.position);
  const [loading, setLoading] = useState(false);

  // Rental state (if not owned)
  const defaultProperty = selected && selected.startsWith('lot') ? selected : 'lot-1';
  const [propertyId, setPropertyId] = useState(defaultProperty);
  const [shopName, setShopName] = useState('Dat Coffee');

  // Stocking state
  const [stockQuantity, setStockQuantity] = useState(5);

  // Price setting state
  const business = player?.businesses[0];
  const [cupPrice, setCupPrice] = useState(business?.price ? business.price / 100 : 5);

  if (!player) return null;

  const def = BUSINESS_DEFINITIONS.coffee;
  const beanItem = player.inventory.find(i => i.itemId === 'beans');
  const beanCount = beanItem?.quantity || 0;
  const selectedProperty = world.properties.find(p => p.id === propertyId);
  const door = BUILDINGS.find(b => b.id === propertyId)!.door;
  const nearProperty = distance(position, door) <= CONFIG.interactionDistance;

  const handleRent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await action({
        type: 'RENT_PROPERTY',
        propertyId,
        name: shopName.trim(),
      });
    } catch {
      // Notification handled in action()
    } finally {
      setLoading(false);
    }
  };

  const handleBuyEquipment = async () => {
    if (!business) return;
    try {
      setLoading(true);
      await action({
        type: 'BUY_EQUIPMENT',
        businessId: business.id,
      });
    } catch {
      // Notification handled in action()
    } finally {
      setLoading(false);
    }
  };

  const handleStock = async () => {
    if (!business) return;
    try {
      setLoading(true);
      await action({
        type: 'STOCK_BUSINESS',
        businessId: business.id,
        quantity: stockQuantity,
      });
    } catch {
      // Notification handled in action()
    } finally {
      setLoading(false);
    }
  };

  const handleSetPrice = async () => {
    if (!business) return;
    try {
      setLoading(true);
      await action({
        type: 'SET_PRICE',
        businessId: business.id,
        price: Math.round(cupPrice * 100),
      });
    } catch {
      // Notification handled in action()
    } finally {
      setLoading(false);
    }
  };

  const handleToggleOpen = async () => {
    if (!business) return;
    try {
      setLoading(true);
      await action({
        type: 'TOGGLE_BUSINESS',
        businessId: business.id,
        open: !business.open,
      });
    } catch {
      // Notification handled in action()
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    if (!business) return;
    try {
      setLoading(true);
      await action({
        type: 'UPGRADE_BUSINESS',
        businessId: business.id,
      });
    } catch {
      // Notification handled in action()
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalWrapper
      title={business ? `Quán Cà Phê: ${business.name}` : 'Thuê Mặt Bằng Kinh Doanh'}
      badge={business ? (business.open ? 'Đang mở cửa' : 'Tạm nghỉ') : 'Mặt bằng thương mại'}
      icon="☕"
      onClose={onClose}
      width="680px"
    >
      {!business ? (
        <form onSubmit={handleRent} className="business-rent-form">
          <div className="callout-card mb-3">
            <span className="callout-icon">🏙️</span>
            <div>
              <strong>Khởi nghiệp kinh doanh cà phê tại thị trấn!</strong>
              <p>
                Thuê mặt bằng đẹp ở trung tâm, mua sắm máy pha chuyên dụng, nhập hạt cà phê hảo hạng và chào đón những vị khách NPC đầu tiên.
              </p>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Chọn vị trí mặt bằng</label>
            <div className="lot-selector-grid">
              {['lot-1', 'lot-2'].map(lot => {
                const property = world.properties.find(p => p.id === lot);
                const isOccupied = !!property?.ownerId;
                const isSelected = propertyId === lot;
                return (
                  <div
                    key={lot}
                    className={`lot-card ${isSelected ? 'selected' : ''} ${isOccupied ? 'occupied' : ''}`}
                    onClick={() => property && !isOccupied && setPropertyId(lot)}
                  >
                    <div className="lot-badge">{lot === 'lot-1' ? 'Mặt bằng 01 (Phía Tây)' : 'Mặt bằng 02 (Phía Đông)'}</div>
                    <div className="lot-price">Tiền thuê: <strong>{money(def.rent)} / ngày</strong></div>
                    <div className="lot-status">{!property ? 'Đang tải trạng thái…' : isOccupied ? '❌ Đã có người thuê' : '✅ Đang trống · Sẵn sàng thuê'}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Tên biển hiệu quán cà phê của bạn</label>
            <input
              type="text"
              className="form-input"
              value={shopName}
              onChange={e => setShopName(e.target.value)}
              placeholder="Ví dụ: Dat Coffee, Cafe Mầm Xanh, ..."
              minLength={2}
              maxLength={28}
              required
            />
          </div>

          <div className="calc-total-bar mb-3">
            <span>Chi phí thanh toán ngày đầu:</span>
            <strong>{money(def.rent)}</strong>
          </div>

          <p>{!connected ? 'Đang chờ kết nối máy chủ.' : !nearProperty ? `Hãy đi tới cửa ${propertyId === 'lot-1' ? 'Mặt bằng 01' : 'Mặt bằng 02'} để ký hợp đồng thuê.` : 'Bạn đang ở gần mặt bằng đã chọn.'}</p>
          <button
            type="submit"
            className="btn-primary btn-large"
            disabled={loading || !connected || !nearProperty || !selectedProperty || !!selectedProperty.ownerId || player.cash < def.rent || shopName.trim().length < 2}
          >
            {loading ? 'Đang ký hợp đồng thuê...' : `Ký hợp đồng thuê (${money(def.rent)})`}
          </button>
        </form>
      ) : (
        <div className="business-dashboard">
          {/* Top Status & Controls Bar */}
          <div className="business-top-bar card-panel mb-3">
            <div className="biz-identity">
              <span className="biz-badge-level">Cấp {business.level}/5</span>
              <span className="biz-reputation" title="Độ hài lòng & danh tiếng">
                ⭐ {Math.round(business.reputation * 100)}%
              </span>
              <span className="biz-customers">
                👥 {business.customers} lượt khách
              </span>
            </div>

            <button
              className={`biz-toggle-btn ${business.open ? 'btn-danger' : 'btn-success'}`}
              onClick={handleToggleOpen}
              disabled={loading || (!business.open && (!business.equipped || business.servings <= 0))}
              title={
                !business.equipped
                  ? 'Cần mua máy pha trước khi mở cửa'
                  : business.servings <= 0
                  ? 'Cần nhập nguyên liệu vào kho trước khi mở cửa'
                  : ''
              }
            >
              {business.open ? '🛑 Đóng cửa quán' : '🟢 Mở cửa đón khách'}
            </button>
          </div>

          {/* Operation Cards */}
          <div className="biz-ops-grid mb-3">
            {/* Equipment Card */}
            <div className="biz-op-card card-panel">
              <div className="op-header">
                <span className="op-icon">⚙️</span>
                <h4>Máy pha cà phê</h4>
              </div>
              <p className="op-desc">Thiết bị bắt buộc để pha chế và phục vụ khách hàng.</p>
              {business.equipped ? (
                <div className="status-pill status-ready">✅ Đã trang bị máy chuyên dụng</div>
              ) : (
                <button
                  className="btn-primary btn-sm"
                  onClick={handleBuyEquipment}
                  disabled={loading || player.cash < def.equipment}
                >
                  Mua máy ({money(def.equipment)})
                </button>
              )}
            </div>

            {/* Inventory / Stock Card */}
            <div className="biz-op-card card-panel">
              <div className="op-header">
                <span className="op-icon">🫘</span>
                <h4>Kho nguyên liệu</h4>
              </div>
              <div className="stock-display">
                Kho quán: <strong>{business.servings} tách</strong> cà phê
              </div>
              <p className="op-desc">
                1 gói hạt cà phê = 4 tách cà phê. Có trong túi: <strong>{beanCount} gói</strong>.
              </p>
              <div className="stock-action-wrap">
                <input
                  type="number"
                  className="qty-input-sm"
                  min={1}
                  max={Math.max(1, Math.min(CONFIG.maxQuantity, beanCount))}
                  value={stockQuantity}
                  onChange={e => setStockQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                />
                <button
                  className="btn-secondary btn-sm"
                  onClick={handleStock}
                  disabled={loading || stockQuantity < 1 || stockQuantity > CONFIG.maxQuantity || beanCount < stockQuantity}
                >
                  Nhập kho (+{stockQuantity * 4} tách)
                </button>
              </div>
            </div>

            {/* Pricing Card */}
            <div className="biz-op-card card-panel">
              <div className="op-header">
                <span className="op-icon">🏷️</span>
                <h4>Giá bán mỗi tách</h4>
              </div>
              <p className="op-desc">
                Giá khuyến nghị: $5.00. Giá thấp tăng khách, giá cao tăng doanh thu mỗi tách.
              </p>
              <div className="price-input-wrap">
                <span className="currency-prefix">$</span>
                <input
                  type="number"
                  step="0.5"
                  className="form-input price-input"
                  min={1}
                  max={50}
                  value={cupPrice}
                  onChange={e => setCupPrice(parseFloat(e.target.value) || 1)}
                />
                <button
                  className="btn-primary btn-sm"
                  onClick={handleSetPrice}
                  disabled={loading || cupPrice < 1 || cupPrice > 50 || Math.round(cupPrice * 100) === business.price}
                >
                  Lưu giá
                </button>
              </div>
            </div>

            {/* Upgrade Card */}
            <div className="biz-op-card card-panel">
              <div className="op-header">
                <span className="op-icon">✨</span>
                <h4>Nâng cấp không gian</h4>
              </div>
              <p className="op-desc">Tăng lượng khách tối đa cùng lúc và tăng danh tiếng cửa hàng.</p>
              {business.level >= 5 ? (
                <div className="status-pill status-ready">🏆 Đã đạt cấp tối đa</div>
              ) : (
                <button
                  className="btn-secondary btn-sm"
                  onClick={handleUpgrade}
                  disabled={loading || !business.equipped || player.cash < def.upgrade}
                >
                  Nâng cấp ({money(def.upgrade)})
                </button>
              )}
            </div>
          </div>

          {/* Financial Dashboard (Section 14 of Game Design) */}
          <div className="financial-dashboard card-panel">
            <h4 className="dashboard-title">📊 Báo Cáo Tài Chính Cửa Hàng</h4>
            <p className="dashboard-sub">
              Giúp bạn theo dõi hiệu quả kinh doanh thực tế: Doanh thu ≠ Lợi nhuận ròng.
            </p>

            <div className="finance-table">
              <div className="finance-row">
                <span>📈 Doanh thu bán cà phê (Revenue)</span>
                <strong className="text-green">+{money(business.revenue)}</strong>
              </div>
              <div className="finance-row">
                <span>📦 Giá vốn nguyên liệu đã dùng (COGS)</span>
                <strong className="text-red">−{money(business.cogs)}</strong>
              </div>
              <div className="finance-row">
                <span>🏠 Chi phí thuê mặt bằng tích lũy (Rent)</span>
                <strong className="text-red">−{money(business.rent)}</strong>
              </div>
              <div className="finance-row">
                <span>👨‍🍳 Lương nhân viên pha chế (Salary)</span>
                <strong className="text-red">−{money(business.salary)}</strong>
              </div>
              <div className="finance-row">
                <span>⚡ Điện, nước và tiện ích (Utility)</span>
                <strong className="text-red">−{money(business.utility)}</strong>
              </div>
              <div className="finance-divider" />
              <div className="finance-total-row">
                <span>💰 LỢI NHUẬN RÒNG (Net Profit)</span>
                <strong className={business.profit >= 0 ? 'text-profit-pos' : 'text-profit-neg'}>
                  {business.profit >= 0 ? '+' : ''}{money(business.profit)}
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </ModalWrapper>
  );
}
