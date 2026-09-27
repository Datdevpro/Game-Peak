import { create } from 'zustand';
import { CONFIG, ITEMS } from '../../shared/config';
import type { Panel, PlayerState, WorldState } from '../../shared/types';
const previewWorld: WorldState = { minutes: 480, day: 1, weather: 'sunny', temperature: 27, prices: { beans: ITEMS.beans.basePrice, milk: ITEMS.milk.basePrice, tea: ITEMS.tea.basePrice }, event: null, players: [], npcs: [], properties: [], debug: false };
interface GameStore {
  player: PlayerState | null; world: WorldState; panel: Panel; selected: string;
  connected: boolean; ready: boolean; fps: number; position: { x: number; y: number }; nearby: string;
  toast: { text: string; error: boolean; id: number } | null;
  setPanel: (panel: Panel, selected?: string) => void;
  notify: (text: string, error?: boolean) => void;
}
export const useGameStore = create<GameStore>((set) => ({
  player: null, world: previewWorld, panel: null, selected: '', connected: false, ready: false, fps: 0, position: { ...CONFIG.spawn }, nearby: '', toast: null,
  setPanel: (panel, selected = '') => set({ panel, selected }),
  notify: (text, error = false) => set({ toast: { text, error, id: Date.now() } }),
}));
