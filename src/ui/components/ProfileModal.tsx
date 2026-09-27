import React from 'react';
import { money } from '../../../shared/config';
import { useGameStore } from '../../stores/gameStore';
import { ChibiAvatar } from './ChibiAvatar';
import { ModalWrapper } from './ModalWrapper';

export function ProfileModal({ onClose }: { onClose: () => void }) {
  const player = useGameStore(s => s.player);

  if (!player) return null;

  const bizValuation = player.businesses.reduce((sum, b) => sum + b.valuation, 0);
  const invValuation = player.inventory.reduce((sum, i) => sum + i.cost, 0);

  return (
    <ModalWrapper
      title="Hồ Sơ Cư Dân & Sổ Cái Tài Chính"
      badge={`Cư dân: ${player.name}`}
      icon="👤"
      onClose={onClose}
      width="640px"
    >
      {/* Profile Header */}
      <div className="profile-header-card card-panel mb-3">
        <div className="profile-avatar-box">
          <ChibiAvatar index={player.avatar} size={54} />
        </div>
        <div className="profile-info">
          <h3 className="profile-username">{player.name}</h3>
          <div className="profile-tags">
            <span className="profile-tag">🏙️ Cư dân Mầm Xanh</span>
            <span className="profile-tag">
              📈 Kỹ năng thương mại: Cấp {player.skills.commerce}
            </span>
            <span className="profile-tag">
              {player.apartment ? '🏠 Căn hộ: Nhà của Nắng' : '🏕️ Chưa có căn hộ riêng'}
            </span>
          </div>
        </div>
      </div>

      {/* Net Worth Breakdown */}
      <div className="networth-card card-panel mb-3">
        <div className="networth-header">
          <span>👑 TỔNG GIÁ TRỊ TÀI SẢN RÒNG (NET WORTH)</span>
          <strong className="networth-total-num">{money(player.netWorth)}</strong>
        </div>
        <div className="networth-breakdown-grid">
          <div className="nw-item">
            <span>💵 Tiền mặt:</span>
            <strong>{money(player.cash)}</strong>
          </div>
          <div className="nw-item">
            <span>🏦 Tiền gửi ngân hàng:</span>
            <strong>{money(player.bankBalance)}</strong>
          </div>
          <div className="nw-item">
            <span>📦 Hàng tồn kho:</span>
            <strong>{money(invValuation)}</strong>
          </div>
          <div className="nw-item">
            <span>🏢 Định giá quán cà phê:</span>
            <strong>{money(bizValuation)}</strong>
          </div>
        </div>
      </div>

      {/* Financial Ledger (Sổ cái giao dịch) */}
      <div className="ledger-card card-panel">
        <h4 className="ledger-title">📜 Sổ Cái Giao Dịch Gần Nhất</h4>
        {player.ledger.length === 0 ? (
          <p className="empty-text">Chưa có giao dịch phát sinh.</p>
        ) : (
          <div className="ledger-list">
            {player.ledger.map(entry => {
              const isPositive = entry.amount >= 0;
              const date = new Date(entry.createdAt);
              const timeStr = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

              return (
                <div key={entry.id} className="ledger-row">
                  <div className="ledger-left">
                    <span className="ledger-time">{timeStr}</span>
                    <span className="ledger-label">{entry.label}</span>
                  </div>
                  <strong className={`ledger-amount ${isPositive ? 'text-green' : 'text-red'}`}>
                    {isPositive ? '+' : ''}{money(entry.amount)}
                  </strong>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ModalWrapper>
  );
}
