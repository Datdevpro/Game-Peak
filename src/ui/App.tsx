import React, { useEffect } from 'react';
import { GameCanvas } from '../game/GameCanvas';
import { useGameStore } from '../stores/gameStore';
import { restoreSession } from '../services/api';

import { TopHud } from './components/TopHud';
import { BottomDock } from './components/BottomDock';
import { MobileControls } from './components/MobileControls';
import { AuthModal } from './components/AuthModal';
import { PhoneModal } from './components/PhoneModal';
import { MarketModal } from './components/MarketModal';
import { BusinessModal } from './components/BusinessModal';
import { BankModal } from './components/BankModal';
import { InventoryModal } from './components/InventoryModal';
import { ProfileModal } from './components/ProfileModal';
import { MapModal } from './components/MapModal';
import { ApartmentModal } from './components/ApartmentModal';
import { NpcModal } from './components/NpcModal';
import { FashionModal } from './components/FashionModal';
import { DebugModal } from './components/DebugModal';
import { Toast } from './components/Toast';

export function App() {
  const player = useGameStore(s => s.player);
  const panel = useGameStore(s => s.panel);
  const setPanel = useGameStore(s => s.setPanel);
  const ready = useGameStore(s => s.ready);

  useEffect(() => {
    restoreSession();
  }, []);

  return (
    <main className="app">
      {/* Background Phaser Canvas */}
      <GameCanvas />

      {/* Main UI Overlay */}
      {player ? (
        <>
          <TopHud />
          <BottomDock />
          <MobileControls />

          {/* Active Modal Panels */}
          {panel === 'phone' && <PhoneModal onClose={() => setPanel(null)} />}
          {panel === 'market' && <MarketModal onClose={() => setPanel(null)} initialTab="wholesale" />}
          {panel === 'marketplace' && <MarketModal onClose={() => setPanel(null)} initialTab="p2p" />}
          {(panel === 'business' || panel === 'property') && <BusinessModal onClose={() => setPanel(null)} />}
          {panel === 'bank' && <BankModal onClose={() => setPanel(null)} />}
          {panel === 'fashion' && <FashionModal onClose={() => setPanel(null)} />}
          {panel === 'inventory' && <InventoryModal onClose={() => setPanel(null)} />}
          {panel === 'profile' && <ProfileModal onClose={() => setPanel(null)} />}
          {panel === 'map' && <MapModal onClose={() => setPanel(null)} />}
          {panel === 'apartment' && <ApartmentModal onClose={() => setPanel(null)} />}
          {panel === 'npc' && <NpcModal onClose={() => setPanel(null)} />}
          {panel === 'debug' && <DebugModal onClose={() => setPanel(null)} />}
        </>
      ) : ready ? (
        <AuthModal />
      ) : (
        <div className="app-loading-screen">
          <div className="brand">
            ✳ GAMEPEAK <span>Đang kết nối vào thị trấn Mầm Xanh...</span>
          </div>
        </div>
      )}

      {/* Global Toast Alerts */}
      <Toast />
    </main>
  );
}
