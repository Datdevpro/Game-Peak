// Vite embeds these values at build time. REST and gameplay must use the same
// backend because the current server keeps sessions in its local SQLite DB.
export function resolveEndpoints(env: { VITE_API_URL?: string; VITE_WS_URL?: string; VITE_COLYSEUS_URL?: string }, page: { protocol: string; host: string }) {
  const api = env.VITE_API_URL?.trim().replace(/\/+$/, '');
  const apiBase = api ? (api.endsWith('/api') ? api : `${api}/api`) : '/api';
  const configured = env.VITE_WS_URL?.trim() || env.VITE_COLYSEUS_URL?.trim();
  const backend = configured || (api ? api.replace(/\/api$/, '') : `${page.protocol}//${page.host}`);
  const url = new URL(backend.includes('://') ? backend : `https://${backend}`);
  if (!['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol)) throw new Error('URL máy chủ game không hợp lệ.');
  url.protocol = url.protocol === 'https:' || url.protocol === 'wss:' ? 'wss:' : 'ws:';
  if (page.protocol === 'https:' && url.protocol !== 'wss:') throw new Error('Trang HTTPS cần kết nối game bằng wss://.');
  if (url.pathname === '/') url.pathname = '/ws';
  return { apiBase, websocketUrl: url.toString() };
}
