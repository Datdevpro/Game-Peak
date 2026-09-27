import React, { useState } from 'react';
import { money } from '../../../shared/config';
import { useGameStore } from '../../stores/gameStore';
import { action } from '../../services/api';
import { ModalWrapper } from './ModalWrapper';

export function BankModal({ onClose }: { onClose: () => void }) {
  const player = useGameStore(s => s.player);
  const [mode, setMode] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState<number>(5000); // 5000 cents = $50.00
  const [loading, setLoading] = useState(false);

  if (!player) return null;

  const maxAvailable = mode === 'deposit' ? player.cash : player.bankBalance;

  const handleTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0 || amount > maxAvailable) return;
    try {
      setLoading(true);
      await action({
        type: mode === 'deposit' ? 'DEPOSIT' : 'WITHDRAW',
        amount: Math.round(amount),
      });
    } catch {
      // Notification handled in action()
    } finally {
      setLoading(false);
    }
  };

  const setPreset = (cents: number) => {
    setAmount(Math.min(cents, maxAvailable));
  };

  return (
    <ModalWrapper
      title="Ngân Hàng Lá — Chi Nhánh Mầm Xanh"
      badge="An toàn · Bảo mật · Tích lũy"
      icon="🏦"
      onClose={onClose}
      width="520px"
    >
      <div className="bank-summary-grid mb-3">
        <div className="bank-stat-card">
          <span className="stat-label">Tiền mặt trong ví</span>
          <strong className="stat-value text-green">💵 {money(player.cash)}</strong>
        </div>
        <div className="bank-stat-card">
          <span className="stat-label">Tiền gửi ngân hàng</span>
          <strong className="stat-value text-blue">🏦 {money(player.bankBalance)}</strong>
        </div>
      </div>

      <div className="tab-group mb-3">
        <button
          className={`tab-btn ${mode === 'deposit' ? 'active' : ''}`}
          onClick={() => { setMode('deposit'); setAmount(Math.min(5000, player.cash)); }}
        >
          📥 Gửi tiết kiệm vào ngân hàng
        </button>
        <button
          className={`tab-btn ${mode === 'withdraw' ? 'active' : ''}`}
          onClick={() => { setMode('withdraw'); setAmount(Math.min(5000, player.bankBalance)); }}
        >
          📤 Rút tiền mặt về ví
        </button>
      </div>

      <form onSubmit={handleTransaction} className="bank-form card-panel">
        <div className="form-group">
          <label className="form-label">
            Số tiền muốn {mode === 'deposit' ? 'gửi' : 'rút'} ($)
          </label>
          <div className="price-input-wrap">
            <span className="currency-prefix">$</span>
            <input
              type="number"
              step="1"
              min={1}
              max={maxAvailable / 100}
              className="form-input"
              value={(amount / 100).toFixed(0)}
              onChange={e => setAmount(Math.max(1, (parseFloat(e.target.value) || 0) * 100))}
              required
            />
          </div>
        </div>

        <div className="preset-buttons-row mb-3">
          <button type="button" className="preset-btn" onClick={() => setPreset(100_000)}>
            +$1,000
          </button>
          <button type="button" className="preset-btn" onClick={() => setPreset(500_000)}>
            +$5,000
          </button>
          <button type="button" className="preset-btn" onClick={() => setPreset(2_000_000)}>
            +$20,000
          </button>
          <button type="button" className="preset-btn-max" onClick={() => setAmount(maxAvailable)}>
            Tối đa ({money(maxAvailable)})
          </button>
        </div>

        <button
          type="submit"
          className={`btn-primary btn-large ${mode === 'deposit' ? 'btn-deposit' : 'btn-withdraw'}`}
          disabled={loading || amount <= 0 || amount > maxAvailable}
        >
          {loading
            ? 'Đang thực hiện giao dịch...'
            : mode === 'deposit'
            ? `Xác nhận Gửi Tiền (${money(amount)})`
            : `Xác nhận Rút Tiền (${money(amount)})`}
        </button>
      </form>
    </ModalWrapper>
  );
}
