import React, { useState } from 'react';
import { authenticate } from '../../services/api';
import { ChibiAvatar } from './ChibiAvatar';

interface Props {
  onSuccess?: () => void;
}

export function AuthModal({ onSuccess }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [avatar, setAvatar] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim()) {
      setError('Vui lòng nhập tên nhân vật (3–20 ký tự).');
      return;
    }
    if (password.length < 8) {
      setError('Mật khẩu tối thiểu 8 ký tự.');
      return;
    }
    try {
      setLoading(true);
      await authenticate(mode, username.trim(), password, avatar);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể xác thực.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async () => {
    setError('');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const guestUser = `CuDan_${randomSuffix}`;
    const guestPass = 'gamepeak2026';
    const guestAvatar = Math.floor(Math.random() * 24);
    try {
      setLoading(true);
      await authenticate('register', guestUser, guestPass, guestAvatar);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tạo tài khoản nhanh.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-overlay">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-brand">
            <span className="auth-logo">✳</span>
            <div>
              <h1 className="auth-title">GAMEPEAK</h1>
              <p className="auth-subtitle">Thị trấn mô phỏng kinh doanh & làm giàu</p>
            </div>
          </div>
          <div className="auth-tabs">
            <button
              type="button"
              className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
              onClick={() => { setMode('register'); setError(''); }}
            >
              Đăng ký mới
            </button>
            <button
              type="button"
              className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
              onClick={() => { setMode('login'); setError(''); }}
            >
              Đăng nhập
            </button>
          </div>
        </div>

        {error && <div className="auth-error-box">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">Tên nhân vật / Cư dân</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ví dụ: DatMaster, BinhYen, ..."
              value={username}
              onChange={e => setUsername(e.target.value)}
              minLength={3}
              maxLength={20}
              autoFocus
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Mật khẩu bảo mật</label>
            <input
              type="password"
              className="form-input"
              placeholder="Tối thiểu 8 ký tự"
              value={password}
              onChange={e => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>

          {mode === 'register' && (
            <div className="form-group">
              <label className="form-label">
                Chọn ngoại hình Chibi <span>(Cư dân #{avatar + 1})</span>
              </label>
              <div className="avatar-grid">
                {Array.from({ length: 24 }).map((_, i) => (
                  <button
                    type="button"
                    key={i}
                    className={`avatar-option ${avatar === i ? 'selected' : ''}`}
                    onClick={() => setAvatar(i)}
                    title={`Ngoại hình #${i + 1}`}
                  >
                    <ChibiAvatar index={i} size={36} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {mode === 'register' && (
            <div className="auth-perk-box">
              🎁 <strong>Vốn khởi nghiệp:</strong> Nhận ngay <strong>$100,000.00</strong> tiền mặt khi gia nhập thị trấn Mầm Xanh!
            </div>
          )}

          <div className="auth-actions">
            <button type="submit" className="btn-primary auth-submit-btn" disabled={loading}>
              {loading ? 'Đang xử lý...' : mode === 'register' ? 'Bắt đầu cuộc sống mới' : 'Đăng nhập vào thị trấn'}
            </button>

            <button
              type="button"
              className="btn-secondary auth-quick-btn"
              onClick={handleQuickDemo}
              disabled={loading}
            >
              ⚡ Vào nhanh không cần gõ (Tài khoản mẫu)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
