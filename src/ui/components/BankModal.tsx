import React, { useState, useEffect } from 'react';
import { money, BANK_TERMS, calculateSavingsPayout, type BankTermMonths } from '../../../shared/config';
import type { SavingsDeposit } from '../../../shared/types';
import { useGameStore } from '../../stores/gameStore';
import { action } from '../../services/api';
import { ModalWrapper } from './ModalWrapper';

export function BankModal({ onClose }: { onClose: () => void }) {
  const player = useGameStore(s => s.player);
  const [tab, setTab] = useState<'cash' | 'savings' | 'my-savings' | 'calculator'>('savings');
  
  // Cash transfer mode
  const [cashMode, setCashMode] = useState<'deposit' | 'withdraw'>('deposit');
  const [cashAmount, setCashAmount] = useState<number>(5000); // 5000 cents = $50.00
  
  // Term savings creation
  const [savingsAmount, setSavingsAmount] = useState<number>(20_000); // 20,000 cents = $200.00
  const [selectedTerm, setSelectedTerm] = useState<BankTermMonths>(6);
  const [isCompound, setIsCompound] = useState<boolean>(true);
  const [fromBank, setFromBank] = useState<boolean>(false);
  
  // Calculator interactive simulation amount
  const [calcAmount, setCalcAmount] = useState<number>(100_000); // $1,000.00

  // Tick timer for live remaining time and accrued interest count-up
  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const [loading, setLoading] = useState(false);

  if (!player) return null;

  const maxCashAvailable = cashMode === 'deposit' ? player.cash : player.bankBalance;
  const currentTermConfig = BANK_TERMS.find(t => t.months === selectedTerm) ?? BANK_TERMS[0];
  const maxSavingsSourceAvailable = fromBank ? player.bankBalance : player.cash;

  const activeSavings = (player.savings || []).filter(s => s.status === 'active');
  const historySavings = (player.savings || []).filter(s => s.status === 'withdrawn');
  const totalSavingsPrincipal = activeSavings.reduce((sum, s) => sum + s.principal, 0);
  const totalAccruedInterest = activeSavings.reduce((sum, s) => sum + s.currentInterest, 0);

  // Cash deposit/withdraw handler
  const handleCashTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cashAmount <= 0 || cashAmount > maxCashAvailable) return;
    try {
      setLoading(true);
      await action({
        type: cashMode === 'deposit' ? 'DEPOSIT' : 'WITHDRAW',
        amount: Math.round(cashAmount),
      });
    } finally {
      setLoading(false);
    }
  };

  // Open term savings handler
  const handleCreateSavings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingsAmount < currentTermConfig.minDeposit) return;
    if (savingsAmount > maxSavingsSourceAvailable) return;

    try {
      setLoading(true);
      await action({
        type: 'CREATE_SAVINGS',
        amount: Math.round(savingsAmount),
        termMonths: selectedTerm,
        isCompound,
        fromBank,
      });
      setTab('my-savings');
    } finally {
      setLoading(false);
    }
  };

  // Withdraw savings (all settlement) handler
  const handleWithdrawSavings = async (savings: SavingsDeposit) => {
    const elapsed = (now - savings.createdAt) / 1000;
    const isMatured = elapsed >= savings.durationSeconds;
    if (!isMatured) {
      const confirmEarly = window.confirm(
        `⚠️ Sổ này chưa đến ngày đáo hạn (${savings.termMonths} tháng)!\n\nNếu tất toán bây giờ, bạn sẽ bị mất toàn bộ lãi suất ưu đãi (${(savings.interestRate * 100).toFixed(1)}%/năm) và chỉ nhận lãi không kỳ hạn (0.5%/năm).\n\nBạn có chắc chắn muốn tất toán trước hạn không?`
      );
      if (!confirmEarly) return;
    }

    try {
      setLoading(true);
      await action({
        type: 'WITHDRAW_SAVINGS',
        savingsId: savings.id,
      });
    } finally {
      setLoading(false);
    }
  };

  // Live calculation preview for savings tab
  const compoundPreview = calculateSavingsPayout(savingsAmount, currentTermConfig.months, currentTermConfig.rate, true, 1);
  const simplePreview = calculateSavingsPayout(savingsAmount, currentTermConfig.months, currentTermConfig.rate, false, 1);
  const activePreview = isCompound ? compoundPreview : simplePreview;
  const extraCompoundBonus = compoundPreview.interest - simplePreview.interest;

  return (
    <ModalWrapper
      title="Ngân Hàng Lá — Chi Nhánh Mầm Xanh"
      badge="Tiết Kiệm Thông Minh · Lãi Kép Sinh Lời"
      icon="🏦"
      onClose={onClose}
      width="680px"
    >
      {/* Overview Stats Bar */}
      <div className="bank-summary-grid mb-3">
        <div className="bank-stat-card">
          <span className="stat-label">💵 Tiền mặt trong ví</span>
          <strong className="stat-value text-green">{money(player.cash)}</strong>
        </div>
        <div className="bank-stat-card">
          <span className="stat-label">🏦 Tiền gửi thanh toán</span>
          <strong className="stat-value text-blue">{money(player.bankBalance)}</strong>
        </div>
        <div className="bank-stat-card">
          <span className="stat-label">📑 Sổ tiết kiệm ({activeSavings.length})</span>
          <strong className="stat-value text-purple">{money(totalSavingsPrincipal)}</strong>
        </div>
        <div className="bank-stat-card">
          <span className="stat-label">✨ Lãi tích lũy hiện tại</span>
          <strong className="stat-value text-amber">+{money(totalAccruedInterest)}</strong>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="tab-group mb-3">
        <button
          className={`tab-btn ${tab === 'savings' ? 'active' : ''}`}
          onClick={() => setTab('savings')}
        >
          📑 Mở Sổ Tiết Kiệm
        </button>
        <button
          className={`tab-btn ${tab === 'my-savings' ? 'active' : ''}`}
          onClick={() => setTab('my-savings')}
        >
          🏦 Sổ Của Tôi ({activeSavings.length})
        </button>
        <button
          className={`tab-btn ${tab === 'calculator' ? 'active' : ''}`}
          onClick={() => setTab('calculator')}
        >
          🧮 Máy Tính Lãi Kép
        </button>
        <button
          className={`tab-btn ${tab === 'cash' ? 'active' : ''}`}
          onClick={() => setTab('cash')}
        >
          💵 Gửi / Rút Tiền Mặt
        </button>
      </div>

      {/* TAB 1: MỞ SỔ TIẾT KIỆM */}
      {tab === 'savings' && (
        <form onSubmit={handleCreateSavings} className="card-panel">
          <div className="savings-section-title">
            <span>1. Chọn kỳ hạn gửi tiết kiệm</span>
            <span className="text-muted text-sm">Thời hạn càng dài, lãi suất càng cao!</span>
          </div>

          <div className="bank-terms-grid mb-3">
            {BANK_TERMS.map((term) => {
              const isSelected = selectedTerm === term.months;
              return (
                <div
                  key={term.months}
                  className={`term-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedTerm(term.months)}
                >
                  <div className="term-duration">{term.label}</div>
                  <div className="term-rate">{term.rateLabel}</div>
                  <div className="term-meta">
                    Chu kỳ: {Math.round(term.durationSeconds / 60)} phút
                  </div>
                  <div className="term-min">
                    Tối thiểu: {money(term.minDeposit)}
                  </div>
                  {term.months >= 6 && <span className="term-badge">⭐ Ưu Đãi</span>}
                </div>
              );
            })}
          </div>

          {/* Nguồn tiền trích gửi */}
          <div className="form-group mb-3">
            <label className="form-label">2. Nguồn trích tiền gửi:</label>
            <div className="source-toggle-row">
              <button
                type="button"
                className={`source-btn ${!fromBank ? 'active' : ''}`}
                onClick={() => setFromBank(false)}
              >
                💵 Tiền mặt ví ({money(player.cash)})
              </button>
              <button
                type="button"
                className={`source-btn ${fromBank ? 'active' : ''}`}
                onClick={() => setFromBank(true)}
              >
                🏦 Tài khoản ngân hàng ({money(player.bankBalance)})
              </button>
            </div>
          </div>

          {/* Số tiền gửi */}
          <div className="form-group mb-3">
            <div className="label-with-balance">
              <label className="form-label">3. Số tiền muốn gửi tiết kiệm ($)</label>
              <span className="text-sm text-muted">
                Khả dụng: <strong>{money(maxSavingsSourceAvailable)}</strong>
              </span>
            </div>
            <div className="price-input-wrap">
              <span className="currency-prefix">$</span>
              <input
                type="number"
                step="1"
                min={currentTermConfig.minDeposit / 100}
                max={maxSavingsSourceAvailable / 100}
                className="form-input"
                value={(savingsAmount / 100).toFixed(0)}
                onChange={e => setSavingsAmount(Math.max(1, (parseFloat(e.target.value) || 0) * 100))}
                required
              />
            </div>
            <div className="preset-buttons-row mt-2">
              <button type="button" className="preset-btn" onClick={() => setSavingsAmount(Math.max(currentTermConfig.minDeposit, 50_000))}>
                $500
              </button>
              <button type="button" className="preset-btn" onClick={() => setSavingsAmount(Math.max(currentTermConfig.minDeposit, 100_000))}>
                $1,000
              </button>
              <button type="button" className="preset-btn" onClick={() => setSavingsAmount(Math.max(currentTermConfig.minDeposit, 500_000))}>
                $5,000
              </button>
              <button type="button" className="preset-btn-max" onClick={() => setSavingsAmount(maxSavingsSourceAvailable)}>
                Tối đa ({money(maxSavingsSourceAvailable)})
              </button>
            </div>
          </div>

          {/* Lựa chọn LÃI KÉP vs LÃI ĐƠN */}
          <div className="compound-toggle-card mb-3">
            <label className="compound-checkbox-label">
              <input
                type="checkbox"
                checked={isCompound}
                onChange={e => setIsCompound(e.target.checked)}
                className="custom-checkbox"
              />
              <div className="compound-text">
                <div className="compound-title">
                  ⚡ Áp dụng phương thức Lãi Kép (Lãi mẹ đẻ lãi con)
                  <span className="badge-glow">Khuyên dùng</span>
                </div>
                <div className="compound-desc">
                  {isCompound
                    ? 'Tiền lãi mỗi tháng tự động nhập vào gốc để tính lãi cho các tháng tiếp theo, gia tăng lợi nhuận đột phá!'
                    : 'Lãi đơn: Tiền lãi tính cố định dựa trên số vốn gốc ban đầu.'}
                </div>
              </div>
            </label>
          </div>

          {/* Thẻ dự toán lợi nhuận khi đáo hạn */}
          <div className="payout-estimate-box mb-3">
            <div className="estimate-header">
              <span>📊 BẢNG DỰ TOÁN KHI ĐÁO HẠN ({currentTermConfig.label})</span>
              <span className="badge-rate">{currentTermConfig.rateLabel}</span>
            </div>
            <div className="estimate-body">
              <div className="estimate-row">
                <span>Tiền gốc gửi ban đầu:</span>
                <strong>{money(savingsAmount)}</strong>
              </div>
              <div className="estimate-row">
                <span>Phương thức tính lãi:</span>
                <strong className={isCompound ? 'text-purple' : 'text-blue'}>
                  {isCompound ? 'Lãi kép nhập gốc định kỳ' : 'Lãi đơn truyền thống'}
                </strong>
              </div>
              <div className="estimate-row">
                <span>Tiền lãi nhận được khi đáo hạn:</span>
                <strong className="text-green text-lg">+{money(activePreview.interest)}</strong>
              </div>
              {isCompound && extraCompoundBonus > 0 && (
                <div className="estimate-row bonus-row">
                  <span>✨ Thặng dư từ lãi kép mang lại:</span>
                  <strong className="text-amber">+{money(extraCompoundBonus)}</strong>
                </div>
              )}
              <div className="estimate-divider"></div>
              <div className="estimate-row total-row">
                <span>Tổng tiền nhận về (Gốc + Lãi):</span>
                <strong className="text-blue text-xl">{money(activePreview.total)}</strong>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary btn-large btn-deposit w-full"
            disabled={loading || savingsAmount < currentTermConfig.minDeposit || savingsAmount > maxSavingsSourceAvailable}
          >
            {loading ? 'Đang tạo sổ tiết kiệm...' : `Xác Nhận Mở Sổ ${currentTermConfig.label} (${money(savingsAmount)})`}
          </button>
        </form>
      )}

      {/* TAB 2: SỔ TIẾT KIỆM CỦA TÔI */}
      {tab === 'my-savings' && (
        <div className="my-savings-view">
          {activeSavings.length === 0 ? (
            <div className="empty-savings-state card-panel">
              <div className="empty-icon">🌱</div>
              <h3>Bạn chưa có sổ tiết kiệm nào đang hoạt động</h3>
              <p className="text-muted mb-3">
                Hãy mở sổ tiết kiệm có kỳ hạn ngay hôm nay để dòng tiền sinh lời thụ động theo cấp số nhân với lãi kép!
              </p>
              <button className="btn-primary" onClick={() => setTab('savings')}>
                ➕ Mở Sổ Tiết Kiệm Ngay
              </button>
            </div>
          ) : (
            <div className="savings-list">
              {activeSavings.map((s) => {
                const elapsedSeconds = Math.max(0, (now - s.createdAt) / 1000);
                const isMatured = elapsedSeconds >= s.durationSeconds;
                const progress = Math.min(1, elapsedSeconds / s.durationSeconds);
                const remainingSecs = Math.max(0, Math.ceil(s.durationSeconds - elapsedSeconds));
                const mins = Math.floor(remainingSecs / 60);
                const secs = remainingSecs % 60;

                // Live dynamic interest calculation
                const livePayout = calculateSavingsPayout(s.principal, s.termMonths, s.interestRate, s.isCompound, progress);

                return (
                  <div key={s.id} className={`savings-card card-panel ${isMatured ? 'matured' : ''}`}>
                    <div className="savings-card-header">
                      <div className="savings-card-title">
                        <span className="savings-icon">📑</span>
                        <div>
                          <strong>Sổ Tiết Kiệm {s.termMonths} Tháng</strong>
                          <div className="savings-tags">
                            <span className="tag-rate">{(s.interestRate * 100).toFixed(1)}%/năm</span>
                            <span className={`tag-type ${s.isCompound ? 'tag-compound' : 'tag-simple'}`}>
                              {s.isCompound ? '⚡ Lãi Kép' : 'Lãi Đơn'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="savings-status-badge">
                        {isMatured ? (
                          <span className="badge-matured">🎉 ĐÃ ĐÁO HẠN</span>
                        ) : (
                          <span className="badge-running">⏳ Còn {mins}p {secs.toString().padStart(2, '0')}s</span>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="savings-progress-wrap">
                      <div
                        className={`savings-progress-bar ${isMatured ? 'complete' : ''}`}
                        style={{ width: `${(progress * 100).toFixed(1)}%` }}
                      ></div>
                    </div>

                    <div className="savings-details-grid">
                      <div className="detail-item">
                        <span className="detail-label">Tiền gốc</span>
                        <strong className="detail-val">{money(s.principal)}</strong>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Lãi hiện tại</span>
                        <strong className="detail-val text-green">+{money(livePayout.interest)}</strong>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Lãi khi đáo hạn</span>
                        <strong className="detail-val text-amber">
                          +{money(calculateSavingsPayout(s.principal, s.termMonths, s.interestRate, s.isCompound, 1).interest)}
                        </strong>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Tổng nhận về</span>
                        <strong className="detail-val text-blue">
                          {money(isMatured ? s.expectedPayout : livePayout.total)}
                        </strong>
                      </div>
                    </div>

                    <div className="savings-actions-row">
                      {isMatured ? (
                        <button
                          className="btn-primary btn-withdraw w-full btn-glow"
                          onClick={() => handleWithdrawSavings(s)}
                          disabled={loading}
                        >
                          🎉 Tất Toán & Nhận Đủ Gốc + Lãi ({money(s.expectedPayout)})
                        </button>
                      ) : (
                        <button
                          className="btn-secondary btn-withdraw-early"
                          onClick={() => handleWithdrawSavings(s)}
                          disabled={loading}
                        >
                          ⚠️ Rút trước hạn (Chỉ hưởng lãi 0.5%/năm)
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* History Accordion if any */}
          {historySavings.length > 0 && (
            <div className="savings-history-section mt-4">
              <h4 className="text-muted mb-2">📜 Lịch sử các sổ đã tất toán ({historySavings.length})</h4>
              <div className="history-list">
                {historySavings.slice(0, 5).map(h => (
                  <div key={h.id} className="history-item">
                    <span>Sổ {h.termMonths} tháng ({h.isCompound ? 'Lãi Kép' : 'Lãi Đơn'})</span>
                    <span>Gốc: {money(h.principal)}</span>
                    <span className="text-green">Lãi đã nhận: +{money(h.interestPaid)}</span>
                    <span className="text-muted text-sm">Đã tất toán</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: MÁY TÍNH LÃI KÉP & SO SÁNH */}
      {tab === 'calculator' && (
        <div className="calculator-view card-panel">
          <div className="calc-header mb-3">
            <h3>🧮 Bảng Mô Phỏng Sức Mạnh Của Lãi Kép</h3>
            <p className="text-muted text-sm">
              Albert Einstein từng gọi Lãi Kép là <em>"Kỳ quan thứ 8 của nhân loại"</em> — ai hiểu nó sẽ kiếm được tiền từ nó!
            </p>
          </div>

          <div className="form-group mb-3">
            <label className="form-label">Nhập số vốn giả định để so sánh ($)</label>
            <div className="price-input-wrap">
              <span className="currency-prefix">$</span>
              <input
                type="number"
                step="100"
                min="100"
                className="form-input"
                value={(calcAmount / 100).toFixed(0)}
                onChange={e => setCalcAmount(Math.max(100, (parseFloat(e.target.value) || 0) * 100))}
              />
            </div>
            <div className="preset-buttons-row mt-2">
              <button type="button" className="preset-btn" onClick={() => setCalcAmount(100_000)}>$1,000</button>
              <button type="button" className="preset-btn" onClick={() => setCalcAmount(500_000)}>$5,000</button>
              <button type="button" className="preset-btn" onClick={() => setCalcAmount(1_000_000)}>$10,000</button>
              <button type="button" className="preset-btn" onClick={() => setCalcAmount(5_000_000)}>$50,000</button>
            </div>
          </div>

          <div className="calc-comparison-table-wrap mb-3">
            <table className="calc-table">
              <thead>
                <tr>
                  <th>Kỳ hạn</th>
                  <th>Lãi suất</th>
                  <th>Lãi Đơn</th>
                  <th>Lãi Kép ⚡</th>
                  <th>Thặng dư Lãi Kép</th>
                </tr>
              </thead>
              <tbody>
                {BANK_TERMS.map(term => {
                  const sSimple = calculateSavingsPayout(calcAmount, term.months, term.rate, false, 1);
                  const sCompound = calculateSavingsPayout(calcAmount, term.months, term.rate, true, 1);
                  const diff = sCompound.interest - sSimple.interest;
                  return (
                    <tr key={term.months}>
                      <td><strong>{term.label}</strong></td>
                      <td><span className="tag-rate">{term.rateLabel}</span></td>
                      <td className="text-blue">+{money(sSimple.interest)}</td>
                      <td className="text-purple font-bold">+{money(sCompound.interest)}</td>
                      <td className="text-green font-bold">
                        {diff > 0 ? `+${money(diff)}` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="formula-explanation">
            <strong>💡 Công thức toán học tính lãi kép:</strong>
            <code>A = P × (1 + r / 12) ^ m</code>
            <p className="mt-1 text-sm text-muted">
              Trong đó: <strong>P</strong> là số tiền gốc, <strong>r</strong> là lãi suất hàng năm, <strong>m</strong> là số tháng gửi.
              Mỗi tháng trôi qua, lãi sinh ra được tự động gộp vào tiền gốc để làm vốn tính lãi cho tháng sau ("lãi mẹ đẻ lãi con").
            </p>
          </div>
        </div>
      )}

      {/* TAB 4: GỬI / RÚT TIỀN MẶT THANH TOÁN */}
      {tab === 'cash' && (
        <form onSubmit={handleCashTransaction} className="bank-form card-panel">
          <div className="tab-group mb-3">
            <button
              type="button"
              className={`tab-btn ${cashMode === 'deposit' ? 'active' : ''}`}
              onClick={() => { setCashMode('deposit'); setCashAmount(Math.min(5000, player.cash)); }}
            >
              📥 Gửi tiền vào tài khoản
            </button>
            <button
              type="button"
              className={`tab-btn ${cashMode === 'withdraw' ? 'active' : ''}`}
              onClick={() => { setCashMode('withdraw'); setCashAmount(Math.min(5000, player.bankBalance)); }}
            >
              📤 Rút tiền mặt về ví
            </button>
          </div>

          <div className="form-group">
            <label className="form-label">
              Số tiền muốn {cashMode === 'deposit' ? 'gửi' : 'rút'} ($)
            </label>
            <div className="price-input-wrap">
              <span className="currency-prefix">$</span>
              <input
                type="number"
                step="1"
                min={1}
                max={maxCashAvailable / 100}
                className="form-input"
                value={(cashAmount / 100).toFixed(0)}
                onChange={e => setCashAmount(Math.max(1, (parseFloat(e.target.value) || 0) * 100))}
                required
              />
            </div>
          </div>

          <div className="preset-buttons-row mb-3">
            <button type="button" className="preset-btn" onClick={() => setCashAmount(Math.min(100_000, maxCashAvailable))}>
              +$1,000
            </button>
            <button type="button" className="preset-btn" onClick={() => setCashAmount(Math.min(500_000, maxCashAvailable))}>
              +$5,000
            </button>
            <button type="button" className="preset-btn" onClick={() => setCashAmount(Math.min(2_000_000, maxCashAvailable))}>
              +$20,000
            </button>
            <button type="button" className="preset-btn-max" onClick={() => setCashAmount(maxCashAvailable)}>
              Tối đa ({money(maxCashAvailable)})
            </button>
          </div>

          <button
            type="submit"
            className={`btn-primary btn-large ${cashMode === 'deposit' ? 'btn-deposit' : 'btn-withdraw'}`}
            disabled={loading || cashAmount <= 0 || cashAmount > maxCashAvailable}
          >
            {loading
              ? 'Đang thực hiện giao dịch...'
              : cashMode === 'deposit'
              ? `Xác nhận Gửi Tiền (${money(cashAmount)})`
              : `Xác nhận Rút Tiền (${money(cashAmount)})`}
          </button>
        </form>
      )}
    </ModalWrapper>
  );
}
