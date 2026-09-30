import type { Action, PlayerState, ServerMessage, Listing } from '../../shared/types';
import { useGameStore } from '../stores/gameStore';
import { gameEvents } from '../game/bridge';
import { resolveEndpoints } from './endpoints';
const SESSION_KEY = 'gamepeak.session';
let socket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
let stopped = false;
const endpoints = () => resolveEndpoints({ VITE_API_URL: import.meta.env.VITE_API_URL, VITE_WS_URL: import.meta.env.VITE_WS_URL, VITE_COLYSEUS_URL: import.meta.env.VITE_COLYSEUS_URL }, location);

export function token() { return sessionStorage.getItem(SESSION_KEY); }
async function request<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(`${endpoints().apiBase}${url}`, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', ...(token() ? { Authorization: `Bearer ${token()}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('Máy chủ trả về dữ liệu không hợp lệ. Kiểm tra URL API của bản deploy.');
  const data = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(data.error || 'Không thể kết nối máy chủ.');
  return data;
}
export async function authenticate(mode: 'login' | 'register', username: string, password: string, avatar: number) {
  const result = await request<{ token: string; player: PlayerState }>(`/auth/${mode}`, { username, password, avatar });
  sessionStorage.setItem(SESSION_KEY, result.token);
  useGameStore.setState({ player: result.player, panel: null }); connect();
}
export async function restoreSession() {
  if (token()) {
    try { const player = await request<PlayerState>('/me'); useGameStore.setState({ player }); connect(); }
    catch (error) { useGameStore.getState().notify(error instanceof Error ? error.message : 'Phiên đã hết hạn.', true); }
  }
  useGameStore.setState({ ready: true });
}
export async function logout() {
  await request('/auth/logout', {}); stopped = true; clearTimeout(reconnectTimer); socket?.close();
  sessionStorage.removeItem(SESSION_KEY); useGameStore.setState({ player: null, connected: false, panel: null });
}
export function getWebSocketUrl(): string {
  return endpoints().websocketUrl;
}

export function connect() {
  stopped = false; clearTimeout(reconnectTimer);
  const previous = socket; socket = null; previous?.close();
  useGameStore.setState({ connected: false });
  if (!token()) return;
  try {
    const wsUrl = getWebSocketUrl();
    console.log('[GamePeak] Connecting WebSocket:', wsUrl);
    const ws = new WebSocket(wsUrl); socket = ws;
    const deadline = setTimeout(() => { if (socket === ws && !useGameStore.getState().connected) ws.close(4000, 'World snapshot timeout'); }, 15000);
    ws.onopen = () => {
      if (socket !== ws) return;
      console.log('[GamePeak] WebSocket connected successfully!');
      ws.send(JSON.stringify({ type: 'auth', token: token() }));
    };
    ws.onmessage = event => {
      if (socket !== ws) return;
      let data: ServerMessage;
      try { data = JSON.parse(event.data as string) as ServerMessage; }
      catch { useGameStore.getState().notify('Máy chủ game trả về sai giao thức kết nối.', true); ws.close(4002, 'Invalid game protocol'); return; }
      if (data.type === 'world') { clearTimeout(deadline); useGameStore.setState({ world: data.world, connected: true }); }
      else if (data.type === 'state') useGameStore.setState({ player: data.player });
      else if (data.type === 'sale') gameEvents.dispatchEvent(new CustomEvent('sale', { detail: data }));
      else if (data.type === 'error') useGameStore.getState().notify(data.message, true);
    };
    ws.onerror = err => {
      console.warn('[GamePeak] WebSocket error:', err);
    };
    ws.onclose = event => {
      clearTimeout(deadline);
      if (socket !== ws) return;
      console.warn('[GamePeak] WebSocket closed. Code:', event.code, 'Reason:', event.reason || 'none');
      useGameStore.setState({ connected: false });
      if (event.code === 4001) { sessionStorage.removeItem(SESSION_KEY); useGameStore.setState({ player: null }); useGameStore.getState().notify('Phiên đăng nhập hết hạn hoặc tài khoản đã kết nối ở nơi khác.', true); return; }
      if (!stopped && token()) reconnectTimer = setTimeout(connect, 1800);
    };
  } catch (err) {
    console.error('[GamePeak] Failed to create WebSocket:', err);
    useGameStore.getState().notify(err instanceof Error ? err.message : 'Không thể kết nối máy chủ game.', true);
  }
}
export function sendMovement(x: number, y: number) {
  if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'input', x, y }));
}
export async function action(intent: Action) {
  try {
  const result = await request<{ player: PlayerState; message: string }>('/action', { ...intent, requestId: crypto.randomUUID() });
  const oldCash = useGameStore.getState().player?.cash ?? result.player.cash;
  useGameStore.setState({ player: result.player });
  useGameStore.getState().notify(result.message);
  gameEvents.dispatchEvent(new CustomEvent('money', { detail: result.player.cash - oldCash }));
  return result;
  } catch (error) {
    useGameStore.getState().notify(error instanceof Error ? error.message : 'Không thể hoàn tất giao dịch. Vui lòng thử lại.', true);
    throw error;
  }
}
export const getListings = () => request<Listing[]>('/marketplace');
export const sendDebug = (command: unknown) => request<{ ok: boolean }>('/debug', command);
