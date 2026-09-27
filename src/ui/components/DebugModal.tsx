import React, { useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { sendDebug } from '../../services/api';
import { ModalWrapper } from './ModalWrapper';

export function DebugModal({ onClose }: { onClose: () => void }) {
  const world = useGameStore(s => s.world);
  const fps = useGameStore(s => s.fps);
  const notify = useGameStore(s => s.notify);
  const [loading, setLoading] = useState(false);

  const handleCommand = async (command: unknown) => {
    try {
      setLoading(true);
      await sendDebug(command);
      notify('Lệnh Dev đã được thực thi thành công! ✨');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Lỗi thực thi lệnh dev.', true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalWrapper
      title="Bảng Điều Khiển Debug / Developer Console"
      badge={`FPS: ${fps} · ${world.npcs.length} NPCs`}
      icon="🛠️"
      onClose={onClose}
      width="600px"
    >
      <div className="debug-sections">
        {/* Time Control */}
        <div className="debug-card card-panel mb-3">
          <h4>⏰ Đổi thời gian trong ngày</h4>
          <div className="debug-btn-group">
            <button
              className="btn-secondary btn-sm"
              disabled={loading}
              onClick={() => handleCommand({ type: 'time', hour: 8 })}
            >
              🌅 Sáng (08:00)
            </button>
            <button
              className="btn-secondary btn-sm"
              disabled={loading}
              onClick={() => handleCommand({ type: 'time', hour: 12 })}
            >
              ☀️ Trưa (12:00)
            </button>
            <button
              className="btn-secondary btn-sm"
              disabled={loading}
              onClick={() => handleCommand({ type: 'time', hour: 17.5 })}
            >
              🌇 Hoàng hôn (17:30)
            </button>
            <button
              className="btn-secondary btn-sm"
              disabled={loading}
              onClick={() => handleCommand({ type: 'time', hour: 21 })}
            >
              🌙 Đêm (21:00)
            </button>
          </div>
        </div>

        {/* Weather Control */}
        <div className="debug-card card-panel mb-3">
          <h4>🌦️ Đổi thời tiết thế giới</h4>
          <div className="debug-btn-group">
            <button
              className="btn-secondary btn-sm"
              disabled={loading}
              onClick={() => handleCommand({ type: 'weather', weather: 'sunny' })}
            >
              ☀️ Nắng đẹp (28°C)
            </button>
            <button
              className="btn-secondary btn-sm"
              disabled={loading}
              onClick={() => handleCommand({ type: 'weather', weather: 'cloudy' })}
            >
              ☁️ Nhiều mây (25°C)
            </button>
            <button
              className="btn-secondary btn-sm"
              disabled={loading}
              onClick={() => handleCommand({ type: 'weather', weather: 'rain' })}
            >
              🌧️ Mưa (22°C + Ô dù)
            </button>
          </div>
        </div>

        {/* Economic / Cheats */}
        <div className="debug-card card-panel mb-3">
          <h4>💰 Tài nguyên & Dân số</h4>
          <div className="debug-btn-group">
            <button
              className="btn-primary btn-sm"
              disabled={loading}
              onClick={() => handleCommand({ type: 'money' })}
            >
              💵 Thêm $1,000.00 tiền kiểm thử
            </button>
            <button
              className="btn-secondary btn-sm"
              disabled={loading}
              onClick={() => handleCommand({ type: 'npc' })}
            >
              👥 Spawn thêm 1 NPC cư dân
            </button>
          </div>
        </div>

        {/* World Events */}
        <div className="debug-card card-panel">
          <h4>📢 Kích hoạt sự kiện thế giới (World Events)</h4>
          <div className="debug-btn-group">
            <button
              className="btn-secondary btn-sm"
              disabled={loading}
              onClick={() => handleCommand({ type: 'event', index: 0 })}
            >
              🫘 Khan hiếm hạt cà phê (+25% giá)
            </button>
            <button
              className="btn-secondary btn-sm"
              disabled={loading}
              onClick={() => handleCommand({ type: 'event', index: 1 })}
            >
              🔥 Đợt nắng nóng (+40% khách đồ uống)
            </button>
            <button
              className="btn-secondary btn-sm"
              disabled={loading}
              onClick={() => handleCommand({ type: 'event', index: 2 })}
            >
              🎉 Lễ hội thị trấn (+50% lưu lượng đi bộ)
            </button>
          </div>
        </div>
      </div>
    </ModalWrapper>
  );
}
