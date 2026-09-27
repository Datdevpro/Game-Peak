import React from 'react';
import { BUILDINGS, WORLD, type Building } from '../../../shared/world';
import { useGameStore } from '../../stores/gameStore';
import { controls } from '../../game/bridge';
import { ModalWrapper } from './ModalWrapper';

export function MapModal({ onClose }: { onClose: () => void }) {
  const position = useGameStore(s => s.position);
  const world = useGameStore(s => s.world);

  const handleNavigate = (door: { x: number; y: number }) => {
    controls.target = { ...door };
    onClose();
  };

  const scaleX = 100 / WORLD.width;
  const scaleY = 100 / WORLD.height;

  return (
    <ModalWrapper
      title="Bản Đồ Thị Trấn Mầm Xanh"
      badge="Nhấn vào địa điểm để tự động tìm đường đi tới"
      icon="🗺️"
      onClose={onClose}
      width="680px"
    >
      <div className="mini-map-container">
        {/* Park & Pond background */}
        <div
          className="map-park-area"
          style={{
            left: `${665 * scaleX}%`,
            top: `${790 * scaleY}%`,
            width: `${395 * scaleX}%`,
            height: `${215 * scaleY}%`,
          }}
        >
          <span className="park-pond" />
          <span className="park-label">Công Viên Mầm</span>
        </div>

        {/* Buildings */}
        {BUILDINGS.map((b: Building) => {
          const isOpenShop = world.properties.find(p => p.id === b.id)?.open;
          return (
            <div
              key={b.id}
              className={`map-building ${isOpenShop ? 'map-building-open' : ''}`}
              style={{
                left: `${b.x * scaleX}%`,
                top: `${b.y * scaleY}%`,
                width: `${b.w * scaleX}%`,
                height: `${b.h * scaleY}%`,
              }}
              onClick={() => handleNavigate(b.door)}
              title={`Nhấn để đi tới: ${b.name}`}
            >
              <div className="map-b-icon">
                {b.kind === 'bank'
                  ? '🏦'
                  : b.kind === 'market'
                  ? '🛒'
                  : b.kind === 'office'
                  ? '🏢'
                  : b.kind === 'cafe'
                  ? '☕'
                  : b.kind === 'apartment'
                  ? '🏠'
                  : '🏪'}
              </div>
              <div className="map-b-name">{b.name}</div>
              {isOpenShop && <span className="map-open-dot" title="Đang mở cửa" />}
            </div>
          );
        })}

        {/* Current Player Position */}
        <div
          className="map-player-pin"
          style={{
            left: `${position.x * scaleX}%`,
            top: `${position.y * scaleY}%`,
          }}
          title="Vị trí của bạn hiện tại"
        >
          <span className="player-pulse-ring" />
          <span className="player-pin-dot" />
        </div>
      </div>

      <div className="map-legend mt-3">
        <span className="legend-item">🔴 Bạn đang ở đây</span>
        <span className="legend-item">🟢 Quán đang mở cửa</span>
        <span className="legend-item">👉 Nhấn địa điểm để nhân vật tự đi bộ tới</span>
      </div>
    </ModalWrapper>
  );
}
