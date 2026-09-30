import React, { useState, useEffect } from 'react';
import { CONFIG, ITEMS, type ItemId, money } from '../../../shared/config';
import { BUILDINGS, distance } from '../../../shared/world';
import type { Listing } from '../../../shared/types';
import { useGameStore } from '../../stores/gameStore';
import { action, getListings } from '../../services/api';
import { ModalWrapper } from './ModalWrapper';

export function MarketModal({ onClose, initialTab = 'wholesale' }: { onClose: () => void; initialTab?: 'wholesale' | 'p2p' }) {
  const [tab, setTab] = useState<'wholesale' | 'p2p'>(initialTab);
  const player = useGameStore(s => s.player);
  const world = useGameStore(s => s.world);
  const connected = useGameStore(s => s.connected);
  const position = useGameStore(s => s.position);
  const [loading, setLoading] = useState(false);

  // Wholesale state
  const [selectedItem, setSelectedItem] = useState<ItemId>('beans');
  const [tradeMode, setTradeMode] = useState<'buy' | 'sell'>('buy');
  const [tradeQty, setTradeQty] = useState(5);

  // P2P Marketplace state
  const [listings, setListings] = useState<Listing[]>([]);
  const [p2pSubTab, setP2pSubTab] = useState<'browse' | 'create'>('browse');
  const [listItem, setListItem] = useState<ItemId>('beans');
  const [listQty, setListQty] = useState(5);
  const [listPrice, setListPrice] = useState(1200); // 1200 cents = $12.00
  const [buyQtyMap, setBuyQtyMap] = useState<Record<string, number>>({});

  useEffect(() => {
    loadListings();
    if (tab !== 'p2p') return;
    const timer = setInterval(() => { void loadListings(true); }, 5000);
    return () => clearInterval(timer);
  }, [tab]);

  const loadListings = async (silent = false) => {
    try {
      const data = await getListings();
      setListings(data);
    } catch (error) {
      if (!silent) useGameStore.getState().notify(error instanceof Error ? error.message : 'Không thể tải chợ cư dân.', true);
    }
  };

  if (!player) return null;

  // Wholesale calculations
  const currentPrice = (world.prices as Record<ItemId, number>)[selectedItem] ?? ITEMS[selectedItem].basePrice;
  const unitCost = tradeMode === 'buy' ? currentPrice : Math.floor(currentPrice * 0.75);
  const totalCost = unitCost * tradeQty;
  const inBag = player.inventory.find(i => i.itemId === selectedItem)?.quantity || 0;
  const marketOpen = Math.floor(world.minutes / 60) % 24 >= 6 && Math.floor(world.minutes / 60) % 24 < 22;
  const nearMarket = distance(position, BUILDINGS.find(b => b.id === 'market')!.door) <= CONFIG.interactionDistance;

  const handleWholesaleTrade = async () => {
    try {
      setLoading(true);
      await action({
        type: tradeMode === 'buy' ? 'BUY_ITEM' : 'SELL_ITEM',
        itemId: selectedItem,
        quantity: tradeQty,
      });
    } catch {
      // Notification handled in action()
    } finally {
      setLoading(false);
    }
  };

  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await action({
        type: 'CREATE_LISTING',
        itemId: listItem,
        quantity: listQty,
        price: listPrice,
      });
      setP2pSubTab('browse');
      await loadListings();
    } catch {
      // Notification handled in action()
    } finally {
      setLoading(false);
    }
  };

  const handleBuyListing = async (listingId: string, maxQty: number) => {
    const qty = Math.min(buyQtyMap[listingId] || maxQty, maxQty, CONFIG.maxQuantity);
    try {
      setLoading(true);
      await action({
        type: 'BUY_LISTING',
        listingId,
        quantity: qty,
      });
      await loadListings();
    } catch {
      // Notification handled in action()
    } finally {
      setLoading(false);
    }
  };

  const handleCancelListing = async (listingId: string) => {
    try {
      setLoading(true);
      await action({
        type: 'CANCEL_LISTING',
        listingId,
      });
      await loadListings();
    } catch {
      // Notification handled in action()
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalWrapper
      title={tab === 'wholesale' ? 'Chợ đầu mối Mầm Xanh' : 'Chợ cư dân P2P'}
      badge={tab === 'wholesale' ? 'Giá động theo cung/cầu' : 'Giao dịch giữa người chơi'}
      icon="🛒"
      onClose={onClose}
      width="640px"
    >
      {/* Top Main Tabs */}
      <div className="tab-group mb-3">
        <button
          className={`tab-btn ${tab === 'wholesale' ? 'active' : ''}`}
          onClick={() => setTab('wholesale')}
        >
          🌾 Chợ đầu mối (Thị trấn)
        </button>
        <button
          className={`tab-btn ${tab === 'p2p' ? 'active' : ''}`}
          onClick={() => setTab('p2p')}
        >
          🛍️ Chợ cư dân P2P ({listings.length})
        </button>
      </div>

      {tab === 'wholesale' ? (
        <div className="wholesale-view">
          {/* Sub trade mode: Buy / Sell */}
          <div className="trade-mode-toggle mb-3">
            <button
              className={`mode-btn ${tradeMode === 'buy' ? 'active-buy' : ''}`}
              onClick={() => { setTradeMode('buy'); setTradeQty(5); }}
            >
              📥 Mua nguyên liệu
            </button>
            <button
              className={`mode-btn ${tradeMode === 'sell' ? 'active-sell' : ''}`}
              onClick={() => { setTradeMode('sell'); setTradeQty(Math.min(5, inBag)); }}
            >
              📤 Bán lại cho chợ (-25%)
            </button>
          </div>

          {/* Items Selector */}
          <div className="item-cards-grid mb-3">
            {(Object.keys(ITEMS) as ItemId[]).map(id => {
              const item = ITEMS[id];
              const price = (world.prices as Record<ItemId, number>)[id] ?? item.basePrice;
              const has = player.inventory.find(i => i.itemId === id)?.quantity || 0;
              const isSelected = selectedItem === id;
              return (
                <div
                  key={id}
                  className={`market-item-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => { setSelectedItem(id); setTradeQty(1); }}
                >
                  <span className="item-card-icon">{item.icon}</span>
                  <div className="item-card-title">{item.name}</div>
                  <div className="item-card-price">{money(price)} / gói</div>
                  <div className="item-card-stock">Trong túi: <strong>{has}</strong></div>
                </div>
              );
            })}
          </div>

          {/* Trade Details & Quantity Picker */}
          <div className="trade-calculator card-panel">
            <div className="calc-row">
              <span>Mặt hàng đã chọn:</span>
              <strong>{ITEMS[selectedItem].icon} {ITEMS[selectedItem].name}</strong>
            </div>
            <div className="calc-row">
              <span>Đơn giá {tradeMode === 'buy' ? 'mua' : 'bán'}:</span>
              <span className="text-highlight">{money(unitCost)} / gói</span>
            </div>
            <div className="calc-row">
              <span>Số lượng:</span>
              <div className="qty-picker">
                <button
                  type="button"
                  className="qty-btn"
                  onClick={() => setTradeQty(Math.max(1, tradeQty - 1))}
                >
                  −
                </button>
                <input
                  type="number"
                  className="qty-input"
                  min={1}
                  max={tradeMode === 'buy' ? CONFIG.maxQuantity : Math.min(CONFIG.maxQuantity, inBag)}
                  value={tradeQty}
                  onChange={e => setTradeQty(Math.max(1, parseInt(e.target.value) || 1))}
                />
                <button
                  type="button"
                  className="qty-btn"
                  onClick={() => setTradeQty(tradeQty + 1)}
                >
                  +
                </button>
                <button
                  type="button"
                  className="qty-preset-btn"
                  onClick={() => setTradeQty(5)}
                >
                  5
                </button>
                <button
                  type="button"
                  className="qty-preset-btn"
                  onClick={() => setTradeQty(20)}
                >
                  20
                </button>
                {tradeMode === 'sell' && (
                  <button
                    type="button"
                    className="qty-preset-btn"
                  onClick={() => setTradeQty(Math.max(1, Math.min(CONFIG.maxQuantity, inBag)))}
                  >
                    Tất cả ({inBag})
                  </button>
                )}
              </div>
            </div>
            <div className="calc-total-bar">
              <span>Tổng thanh toán:</span>
              <strong className={`total-amount ${tradeMode === 'buy' ? 'text-red' : 'text-green'}`}>
                {tradeMode === 'buy' ? '−' : '+'}{money(totalCost)}
              </strong>
            </div>
          </div>

          <p>{!connected ? 'Đang chờ kết nối máy chủ.' : !nearMarket ? 'Hãy đi tới cửa Chợ Mầm Xanh để mua hoặc bán hàng đầu mối.' : !marketOpen ? 'Chợ đầu mối mở cửa 06:00–22:00. Chợ cư dân P2P vẫn hoạt động.' : 'Bạn đang giao dịch tại chợ đầu mối.'}</p>
          <div className="action-row mt-3">
            <button
              className={`btn-primary btn-large ${tradeMode === 'buy' ? 'buy-btn' : 'sell-btn'}`}
              disabled={loading || !connected || !nearMarket || !marketOpen || tradeQty < 1 || tradeQty > CONFIG.maxQuantity || (tradeMode === 'buy' && player.cash < totalCost) || (tradeMode === 'sell' && inBag < tradeQty)}
              onClick={handleWholesaleTrade}
            >
              {loading
                ? 'Đang thực hiện...'
                : tradeMode === 'buy'
                ? `Xác nhận Mua (${money(totalCost)})`
                : `Xác nhận Bán (${money(totalCost)})`}
            </button>
          </div>
        </div>
      ) : (
        <div className="p2p-view">
          {/* P2P Sub navigation */}
          <div className="sub-tab-group mb-3">
            <button
              className={`sub-tab-btn ${p2pSubTab === 'browse' ? 'active' : ''}`}
              onClick={() => setP2pSubTab('browse')}
            >
              📋 Danh sách hàng đang bán ({listings.length})
            </button>
            <button
              className={`sub-tab-btn ${p2pSubTab === 'create' ? 'active' : ''}`}
              onClick={() => setP2pSubTab('create')}
            >
              ➕ Đăng tin bán mới
            </button>
          </div>

          {p2pSubTab === 'browse' ? (
            <div className="listings-container">
              {listings.length === 0 ? (
                <div className="empty-state">
                  <span>🍃</span>
                  <p>Chưa có cư dân nào đăng bán mặt hàng trên chợ.</p>
                  <button className="btn-secondary" onClick={() => setP2pSubTab('create')}>
                    Trở thành người đầu tiên đăng tin!
                  </button>
                </div>
              ) : (
                <div className="listings-list">
                  {listings.map(item => {
                    const isOwn = item.sellerId === player.id;
                    const itemDef = ITEMS[item.itemId] ?? { name: item.itemId, icon: '📦' };
                    const buyQty = Math.min(buyQtyMap[item.id] || item.quantity, item.quantity, CONFIG.maxQuantity);
                    const canAfford = player.cash >= item.price * buyQty;

                    return (
                      <div key={item.id} className={`listing-card ${isOwn ? 'own-listing' : ''}`}>
                        <div className="listing-info">
                          <span className="listing-icon">{itemDef.icon}</span>
                          <div>
                            <div className="listing-title">
                              <strong>{itemDef.name}</strong> × {item.quantity} gói
                              {isOwn && <span className="own-badge">Tin của bạn</span>}
                            </div>
                            <div className="listing-meta">
                              Người bán: <span>{item.sellerName}</span> · Đơn giá: <strong>{money(item.price)}</strong> / gói
                            </div>
                          </div>
                        </div>

                        <div className="listing-actions">
                          {isOwn ? (
                            <button
                              className="btn-danger btn-sm"
                              onClick={() => handleCancelListing(item.id)}
                              disabled={loading}
                            >
                              Hủy tin & hoàn kho
                            </button>
                          ) : (
                            <div className="buy-p2p-wrap">
                              {item.quantity > 1 && (
                                <input
                                  type="number"
                                  className="qty-input-sm"
                                  min={1}
                                  max={Math.min(CONFIG.maxQuantity, item.quantity)}
                                  value={buyQty}
                                  onChange={e =>
                                    setBuyQtyMap({
                                      ...buyQtyMap,
                                      [item.id]: Math.min(item.quantity, Math.max(1, parseInt(e.target.value) || 1)),
                                    })
                                  }
                                />
                              )}
                              <button
                                className="btn-primary btn-sm"
                                onClick={() => handleBuyListing(item.id, item.quantity)}
                                disabled={loading || !canAfford}
                              >
                                Mua ({money(item.price * buyQty)})
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleCreateListing} className="create-listing-form card-panel">
              <h4 className="panel-title">Đăng hàng lên chợ cư dân</h4>
              <p className="panel-desc">
                Hàng hóa sẽ được đưa vào cơ chế giữ an toàn (Escrow) của hệ thống cho đến khi có người mua hoặc bạn hủy tin.
              </p>

              <div className="form-group">
                <label className="form-label">Chọn mặt hàng từ túi đồ</label>
                <select
                  className="form-select"
                  value={listItem}
                  onChange={e => setListItem(e.target.value as ItemId)}
                >
                  {(Object.keys(ITEMS) as ItemId[]).map(id => {
                    const count = player.inventory.find(i => i.itemId === id)?.quantity || 0;
                    return (
                      <option key={id} value={id} disabled={count === 0}>
                        {ITEMS[id].icon} {ITEMS[id].name} (Có trong túi: {count})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group flex-1">
                  <label className="form-label">Số lượng đăng bán</label>
                  <input
                    type="number"
                    className="form-input"
                    min={1}
                    max={Math.min(CONFIG.maxQuantity, player.inventory.find(i => i.itemId === listItem)?.quantity || 1)}
                    value={listQty}
                    onChange={e => setListQty(Math.max(1, parseInt(e.target.value) || 1))}
                    required
                  />
                </div>

                <div className="form-group flex-1">
                  <label className="form-label">Giá bán mỗi gói ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    min={0.01}
                    max={1000}
                    value={(listPrice / 100).toFixed(2)}
                    onChange={e => setListPrice(Math.round((parseFloat(e.target.value) || 1) * 100))}
                    required
                  />
                </div>
              </div>

              <div className="listing-summary-box">
                Tổng giá trị dự kiến: <strong>{money(listPrice * listQty)}</strong>
              </div>

              <button
                type="submit"
                className="btn-primary btn-large mt-3"
                disabled={loading || listQty < 1 || listQty > CONFIG.maxQuantity || (player.inventory.find(i => i.itemId === listItem)?.quantity || 0) < listQty}
              >
                {loading ? 'Đang đăng tin...' : 'Xác nhận Đăng tin bán'}
              </button>
            </form>
          )}
        </div>
      )}
    </ModalWrapper>
  );
}
