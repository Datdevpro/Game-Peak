import type { Action, PlayerState, ServerMessage, Listing } from '../../shared/types';
import { useGameStore } from '../stores/gameStore';
import { gameEvents } from '../game/bridge';
const SESSION_KEY = 'gamepeak.session';
let socket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
let stopped = false;
const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api`
  : '/api';

export function token() { return sessionStorage.getItem(SESSION_KEY); }
async function request<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', ...(token() ? { Authorization: `Bearer ${token()}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
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
export function connect() {
  stopped = false; clearTimeout(reconnectTimer); socket?.close();
  const wsUrl = import.meta.env.VITE_COLYSEUS_URL || `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws`;
  const ws = new WebSocket(wsUrl); socket = ws;
  ws.onopen = () => ws.send(JSON.stringify({ type: 'auth', token: token() }));
  ws.onmessage = event => {
    const data = JSON.parse(event.data as string) as ServerMessage;
    if (data.type === 'world') useGameStore.setState({ world: data.world, connected: true });
    else if (data.type === 'state') useGameStore.setState({ player: data.player });
    else if (data.type === 'sale') gameEvents.dispatchEvent(new CustomEvent('sale', { detail: data }));
    else if (data.type === 'error') useGameStore.getState().notify(data.message, true);
  };
  ws.onclose = event => {
    if (socket !== ws) return;
    useGameStore.setState({ connected: false });
    if (event.code === 4001) { sessionStorage.removeItem(SESSION_KEY); useGameStore.setState({ player: null }); return; }
    if (!stopped && token()) reconnectTimer = setTimeout(connect, 1800);
  };
}
export function sendMovement(x: number, y: number) {
  if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'input', x, y }));
}
export async function action(intent: Action) {
  const result = await request<{ player: PlayerState; message: string }>('/action', { ...intent, requestId: crypto.randomUUID() });
  const oldCash = useGameStore.getState().player?.cash ?? result.player.cash;
  useGameStore.setState({ player: result.player });
  useGameStore.getState().notify(result.message);
  gameEvents.dispatchEvent(new CustomEvent('money', { detail: result.player.cash - oldCash }));
  return result;
}
export const getListings = () => request<Listing[]>('/marketplace');
export const sendDebug = (command: unknown) => request<{ ok: boolean }>('/debug', command);
