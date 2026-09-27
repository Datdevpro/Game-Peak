import React from 'react';
import { useGameStore } from '../../stores/gameStore';
import { controls } from '../../game/bridge';

export function BottomDock() {
  const player = useGameStore(s => s.player);
  const panel = useGameStore(s => s.panel);
  const setPanel = useGameStore(s => s.setPanel);
  const nearby = useGameStore(s => s.nearby);

  if (!player) return null;

  const handleInteract = () => {
    controls.interact = true;
  };

  return (
    <nav className="bottom-dock-container">
      {/* Floating proximity interaction prompt */}
      {nearby && !panel && (
        <div className="proximity-prompt" onClick={handleInteract}>
          <span className="prompt-pulse">✨</span>
          <span className="prompt-text">
            Gần <strong>{nearby}</strong> — Nhấn <kbd>E</kbd> hoặc Chạm để tương tác
          </span>
          <span className="prompt-arrow">👉</span>
        </div>
      )}

      {/* Main navigation bar */}
      <div className="bottom-dock">
        <button
          className={`dock-btn ${panel === 'phone' ? 'active' : ''}`}
          onClick={() => setPanel(panel === 'phone' ? null : 'phone')}
          title="Mở Smartphone (Điện thoại cư dân)"
        >
          <span className="dock-icon">📱</span>
          <span className="dock-label">Menu</span>
        </button>

        <button
          className={`dock-btn ${panel === 'inventory' ? 'active' : ''}`}
          onClick={() => setPanel(panel === 'inventory' ? null : 'inventory')}
          title="Túi đồ cá nhân"
        >
          <span className="dock-icon">🎒</span>
          <span className="dock-label">Túi đồ</span>
          {player.inventory.length > 0 && (
            <span className="dock-badge">{player.inventory.reduce((a, b) => a + b.quantity, 0)}</span>
          )}
        </button>

        <button
          className={`dock-btn ${panel === 'business' ? 'active' : ''}`}
          onClick={() => setPanel(panel === 'business' ? null : 'business')}
          title="Quán cà phê & Kinh doanh"
        >
          <span className="dock-icon">☕</span>
          <span className="dock-label">Quán cà phê</span>
          {player.businesses.length > 0 && player.businesses[0].open && (
            <span className="dock-dot-open" title="Quán đang mở cửa" />
          )}
        </button>

        <button
          className={`dock-btn ${panel === 'market' ? 'active' : ''}`}
          onClick={() => setPanel(panel === 'market' ? null : 'market')}
          title="Chợ đầu mối & Giao dịch hàng hóa"
        >
          <span className="dock-icon">🛒</span>
          <span className="dock-label">Chợ đầu mối</span>
        </button>

        <button
          className={`dock-btn ${panel === 'bank' ? 'active' : ''}`}
          onClick={() => setPanel(panel === 'bank' ? null : 'bank')}
          title="Ngân hàng Lá (Gửi & Rút tiền)"
        >
          <span className="dock-icon">🏦</span>
          <span className="dock-label">Ngân hàng</span>
        </button>
      </div>
    </nav>
  );
}
