import React, { useState } from 'react';
import { money, ITEMS } from '../../../shared/config';
import { useGameStore } from '../../stores/gameStore';
import { action } from '../../services/api';
import { ModalWrapper } from './ModalWrapper';

const FASHION_ITEMS = [
  {
    id: 'umbrella' as const,
    name: 'Dù đi mưa Pastel',
    icon: '☂️',
    price: 2500,
    badge: 'Chống ướt 100%',
    desc: 'Dù che mưa cao cấp chống thấm, tự động che bảo vệ bạn mỗi khi trời thị trấn đổ mưa rào.',
    effect: 'Tự động che chắn khi trời đổ mưa',
  },
  {
    id: 'raincoat' as const,
    name: 'Áo mưa Hàn Quốc',
    icon: '🧥',
    price: 3500,
    badge: 'Thời trang Thu Đông',
    desc: 'Áo mưa thời trang dáng dài chống gió lạnh, giữ ấm cơ thể trong những ngày mưa bão.',
    effect: 'Tăng vẻ thanh lịch & giữ ấm',
  },
  {
    id: 'cap' as const,
    name: 'Nón lưỡi trai Mầm Xanh',
    icon: '🧢',
    price: 1500,
    badge: 'Streetwear Năng Động',
    desc: 'Nón lưỡi trai thể thao cá tính, che nắng và tôn vinh phong cách cư dân sành điệu.',
    effect: 'Phong cách dạo phố nổi bật',
  },
];

export function FashionModal({ onClose }: { onClose: () => void }) {
  const player = useGameStore(s => s.player);
  const [activeTab, setActiveTab] = useState<'shop' | 'wardrobe'>('shop');
  const [loadingId, setLoadingId] = useState<string | null>(null);

  if (!player) return null;

  const inventoryMap = new Map(player.inventory.map(i => [i.itemId, i.quantity]));
  const equipped = player.equippedFashion ?? { umbrella: false, raincoat: false, cap: false };

  const handleBuy = async (itemId: 'umbrella' | 'raincoat' | 'cap') => {
    try {
      setLoadingId(itemId);
      await action({
        type: 'BUY_FASHION_ITEM',
        itemId,
      });
    } finally {
      setLoadingId(null);
    }
  };

  const handleToggleEquip = async (item: 'umbrella' | 'raincoat' | 'cap') => {
    try {
      setLoadingId(item);
      await action({
        type: 'TOGGLE_EQUIP_FASHION',
        item,
      });
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <ModalWrapper
      title="Cửa Hàng Thời Trang"
      badge="Phong cách · Tiện ích · Đẳng cấp"
      icon="👗"
      onClose={onClose}
      width="620px"
    >
      <div className="fashion-header-bar mb-3">
        <div className="fashion-intro">
          <span className="fashion-npc-tag">👤 Stylist Cô Ba Mầm Xanh</span>
          <p className="fashion-npc-quote">
            "Chào bạn! Cửa hàng hôm nay có dù pastel, áo mưa Hàn Quốc và nón lưỡi trai cực xịn cho cư dân!"
          </p>
        </div>
        <div className="fashion-wallet">
          <span className="wallet-label">Ví tiền mặt:</span>
          <strong className="wallet-amount text-green">💵 {money(player.cash)}</strong>
        </div>
      </div>

      <div className="tab-group mb-3">
        <button
          className={`tab-btn ${activeTab === 'shop' ? 'active' : ''}`}
          onClick={() => setActiveTab('shop')}
        >
          🛍️ Bộ sưu tập thời trang (3 vật phẩm)
        </button>
        <button
          className={`tab-btn ${activeTab === 'wardrobe' ? 'active' : ''}`}
          onClick={() => setActiveTab('wardrobe')}
        >
          🧳 Tủ đồ & Trang bị cá nhân
        </button>
      </div>

      {activeTab === 'shop' && (
        <div className="fashion-grid">
          {FASHION_ITEMS.map(item => {
            const owned = (inventoryMap.get(item.id) ?? 0) > 0;
            const isEquipped = !!equipped[item.id];
            const canAfford = player.cash >= item.price;

            return (
              <div key={item.id} className="fashion-card card-panel">
                <div className="fashion-card-top">
                  <div className="fashion-item-icon">{item.icon}</div>
                  <div className="fashion-item-header">
                    <div className="fashion-badge-row">
                      <span className="fashion-badge">{item.badge}</span>
                      {owned && <span className="badge-owned">Đã có trong tủ</span>}
                    </div>
                    <h3 className="fashion-item-name">{item.name}</h3>
                    <div className="fashion-item-price text-green">{money(item.price)}</div>
                  </div>
                </div>

                <p className="fashion-item-desc">{item.desc}</p>
                <div className="fashion-item-effect">✨ {item.effect}</div>

                <div className="fashion-card-actions">
                  <button
                    className={`btn-primary ${owned ? 'btn-secondary' : 'btn-buy'}`}
                    disabled={loadingId === item.id || (!owned && !canAfford)}
                    onClick={() => handleBuy(item.id)}
                  >
                    {loadingId === item.id
                      ? 'Đang mua...'
                      : owned
                      ? `Mua thêm (${money(item.price)})`
                      : canAfford
                      ? `Mua ngay · ${money(item.price)}`
                      : 'Không đủ tiền mặt'}
                  </button>

                  {owned && (
                    <button
                      className={`btn-toggle-equip ${isEquipped ? 'equipped' : ''}`}
                      disabled={loadingId === item.id}
                      onClick={() => handleToggleEquip(item.id)}
                    >
                      {isEquipped ? '✓ Đang mặc' : 'Mặc ngay'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'wardrobe' && (
        <div className="wardrobe-section">
          {FASHION_ITEMS.filter(item => (inventoryMap.get(item.id) ?? 0) > 0).length === 0 ? (
            <div className="wardrobe-empty card-panel">
              <span className="empty-icon">📭</span>
              <h4>Tủ đồ của bạn đang trống!</h4>
              <p>Bạn chưa sở hữu món thời trang nào. Hãy ghé tab <strong>Bộ sưu tập</strong> để sắm sửa nhé!</p>
              <button className="btn-primary mt-2" onClick={() => setActiveTab('shop')}>
                Khám phá Cửa Hàng
              </button>
            </div>
          ) : (
            <div className="wardrobe-list">
              {FASHION_ITEMS.map(item => {
                const count = inventoryMap.get(item.id) ?? 0;
                if (count <= 0) return null;
                const isEquipped = !!equipped[item.id];

                return (
                  <div key={item.id} className="wardrobe-item card-panel">
                    <div className="wardrobe-item-left">
                      <div className="wardrobe-icon">{item.icon}</div>
                      <div>
                        <div className="wardrobe-name-row">
                          <h4 className="wardrobe-item-name">{item.name}</h4>
                          <span className="wardrobe-qty">x{count}</span>
                          {isEquipped && <span className="badge-equipped-tag">ĐANG MẶC</span>}
                        </div>
                        <p className="wardrobe-desc">{item.desc}</p>
                      </div>
                    </div>

                    <button
                      className={`btn-primary btn-equip-action ${isEquipped ? 'btn-unequip' : ''}`}
                      disabled={loadingId === item.id}
                      onClick={() => handleToggleEquip(item.id)}
                    >
                      {loadingId === item.id ? '...' : isEquipped ? 'Tháo ra' : 'Trang bị'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </ModalWrapper>
  );
}
