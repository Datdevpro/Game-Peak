import React, { useState } from 'react';
import { CONFIG, money } from '../../../shared/config';
import { useGameStore } from '../../stores/gameStore';
import { action } from '../../services/api';
import { ModalWrapper } from './ModalWrapper';

export function ApartmentModal({ onClose }: { onClose: () => void }) {
  const player = useGameStore(s => s.player);
  const [loading, setLoading] = useState(false);

  if (!player) return null;

  const handleRent = async () => {
    try {
      setLoading(true);
      await action({ type: 'RENT_APARTMENT' });
    } catch {
      // Notification handled in action()
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalWrapper
      title="Căn Hộ: Nhà Của Nắng"
      badge={player.apartment ? 'Căn hộ của bạn' : 'Căn hộ cho thuê'}
      icon="🏠"
      onClose={onClose}
      width="520px"
    >
      <div className="apartment-view card-panel">
        <div className="apt-illustration">
          <span>🛋️ 🪴 🪟 ☕</span>
        </div>

        {player.apartment ? (
          <div className="apt-owned-content">
            <h3 className="apt-welcome">Chào mừng bạn trở về nhà!</h3>
            <p className="apt-desc">
              Sau những giờ thương trường bận rộn tại thị trấn Mầm Xanh, đây là không gian ấm cúng, thư thái để bạn ngắm phố phường qua khung cửa sổ.
            </p>
            <div className="apt-features">
              <span>☕ Pha một tách trà ấm</span>
              <span>📚 Đọc bản tin kinh tế</span>
              <span>🌇 Ngắm hoàng hôn thị trấn</span>
            </div>
          </div>
        ) : (
          <div className="apt-rent-content">
            <h3 className="apt-welcome">Thuê căn hộ ấm cúng tại thị trấn</h3>
            <p className="apt-desc">
              Một căn hộ nhỏ ngập tràn ánh nắng phía đông công viên, gần các khu mua sắm và văn phòng.
            </p>
            <div className="calc-total-bar mb-3">
              <span>Giá thuê trọn gói:</span>
              <strong>{money(CONFIG.apartmentRent)}</strong>
            </div>
            <button
              className="btn-primary btn-large"
              onClick={handleRent}
              disabled={loading || player.cash < CONFIG.apartmentRent}
            >
              {loading ? 'Đang nhận chìa khóa...' : `Ký hợp đồng thuê (${money(CONFIG.apartmentRent)})`}
            </button>
          </div>
        )}
      </div>
    </ModalWrapper>
  );
}
