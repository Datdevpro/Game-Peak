import React from 'react';
import { money, WEATHER } from '../../../shared/config';
import { useGameStore } from '../../stores/gameStore';
import { logout } from '../../services/api';
import { audio } from '../../game/systems/AudioManager';
import { ChibiAvatar } from './ChibiAvatar';

export function TopHud() {
  const player = useGameStore(s => s.player);
  const world = useGameStore(s => s.world);
  const connected = useGameStore(s => s.connected);
  const fps = useGameStore(s => s.fps);
  const setPanel = useGameStore(s => s.setPanel);

  if (!player) return null;

  const hour = Math.floor(world.minutes / 60) % 24;
  const minute = Math.floor(world.minutes % 60);
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = (hour % 12 || 12).toString().padStart(2, '0');
  const displayMinute = minute.toString().padStart(2, '0');
  const timeString = `${displayHour}:${displayMinute} ${period}`;

  const weatherInfo = WEATHER[world.weather] ?? { name: 'Nắng', icon: '☀️' };
  const onlineCount = world.players.length;

  return (
    <header className="top-hud">
      {/* Top Left: Player Status Card */}
      <div className="hud-player-card" onClick={() => setPanel('profile')} title="Nhấn xem hồ sơ & sổ cái">
        <div className="hud-avatar-circle">
          <ChibiAvatar index={player.avatar} size={38} />
        </div>
        <div className="hud-player-info">
          <div className="hud-player-name">{player.name}</div>
          <div className="hud-balances">
            <span className="balance-item cash" title="Tiền mặt trong ví">
              💵 {money(player.cash)}
            </span>
            <span className="balance-item bank" title="Tiền gửi ngân hàng">
              🏦 {money(player.bankBalance)}
            </span>
            <span className="balance-item networth" title="Tổng tài sản ròng">
              👑 {money(player.netWorth)}
            </span>
          </div>
        </div>
      </div>

      {/* Top Center: Town Clock & Weather */}
      <div className="hud-clock-widget">
        <div className="clock-day-pill">
          <span className="day-text">NGÀY {world.day}</span>
          <span className="clock-time">{timeString}</span>
        </div>
        <div className="weather-pill" title={`Thời tiết: ${weatherInfo.name}`}>
          <span className="weather-icon">{weatherInfo.icon}</span>
          <span className="weather-temp">{Math.round(world.temperature)}°C</span>
          <span className="weather-desc">{weatherInfo.name}</span>
        </div>
        {world.event && (
          <div className="event-pill" title={world.event.description}>
            📢 {world.event.name}
          </div>
        )}
      </div>

      {/* Top Right: System status, Audio, Debug, Logout */}
      <div className="hud-right-bar">
        <div className="system-pill" title={`Độ ổn định: ${fps} FPS`}>
          <span className={`status-dot ${connected ? 'online' : 'offline'}`} />
          <span className="status-text">{connected ? `Online (${onlineCount})` : 'Mất kết nối'}</span>
        </div>

        <button
          className="hud-icon-btn"
          onClick={() => audio.toggle()}
          title="Bật/Tắt âm thanh"
          aria-label="Toggle Sound"
        >
          {audio.muted ? '🔇' : '🔊'}
        </button>

        {world.debug && (
          <button
            className="hud-icon-btn debug-btn"
            onClick={() => setPanel('debug')}
            title="Mở Debug Console"
            aria-label="Open Debug Console"
          >
            🛠️
          </button>
        )}

        <button
          className="hud-icon-btn logout-btn"
          onClick={logout}
          title="Đăng xuất tài khoản"
          aria-label="Logout"
        >
          🚪
        </button>
      </div>
    </header>
  );
}
