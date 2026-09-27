import React from 'react';
import { useGameStore } from '../../stores/gameStore';

export function PhoneModal({ onClose }: { onClose: () => void }) {
  const world = useGameStore(s => s.world);
  const player = useGameStore(s => s.player);
  const setPanel = useGameStore(s => s.setPanel);

  const hour = Math.floor(world.minutes / 60) % 24;
  const minute = Math.floor(world.minutes % 60);
  const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

  const apps = [
    { id: 'bank', name: 'Ngân hàng', icon: '🏦', color: '#38a169', badge: '' },
    { id: 'market', name: 'Chợ đầu mối', icon: '🛒', color: '#e53e3e', badge: '' },
    { id: 'marketplace', name: 'Chợ cư dân', icon: '🛍️', color: '#dd6b20', badge: 'P2P' },
    { id: 'business', name: 'Quán cà phê', icon: '☕', color: '#d69e2e', badge: player?.businesses[0]?.open ? 'Mở' : '' },
    { id: 'inventory', name: 'Túi đồ', icon: '🎒', color: '#3182ce', badge: `${player?.inventory.length || 0}` },
    { id: 'profile', name: 'Hồ sơ & Sổ cái', icon: '👤', color: '#805ad5', badge: '' },
    { id: 'map', name: 'Bản đồ', icon: '🗺️', color: '#319795', badge: '' },
    ...(world.debug ? [{ id: 'debug', name: 'Debug Dev', icon: '🛠️', color: '#718096', badge: 'Dev' }] : []),
  ];

  return (
    <div className="phone-overlay" onClick={onClose}>
      <div className="phone-frame" onClick={e => e.stopPropagation()}>
        <div className="phone-notch">
          <span className="notch-speaker" />
          <span className="notch-camera" />
        </div>

        <div className="phone-status-bar">
          <span className="phone-time">{timeStr}</span>
          <div className="phone-status-icons">
            <span>5G</span>
            <span>📶</span>
            <span>🔋 100%</span>
          </div>
        </div>

        <div className="phone-screen">
          <div className="phone-app-header">
            <h3 className="phone-welcome">Xin chào, {player?.name}!</h3>
            <p className="phone-sub">Mầm Xanh OS 2.0</p>
          </div>

          <div className="phone-app-grid">
            {apps.map(app => (
              <button
                key={app.id}
                className="phone-app-item"
                onClick={() => setPanel(app.id as any)}
              >
                <div className="app-icon-wrap" style={{ backgroundColor: app.color }}>
                  <span className="app-icon">{app.icon}</span>
                  {app.badge && <span className="app-badge">{app.badge}</span>}
                </div>
                <span className="app-name">{app.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="phone-home-bar" onClick={onClose} title="Nhấn để thoát" />
      </div>
    </div>
  );
}
