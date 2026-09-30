import { describe, expect, it } from 'vitest';
import { resolveEndpoints } from '../src/services/endpoints';

describe('Vercel / Render endpoints', () => {
  const page = { protocol: 'https:', host: 'game-peak.vercel.app' };
  it('uses the REST backend for gameplay when no WS override is configured', () => {
    expect(resolveEndpoints({ VITE_API_URL: 'https://game-peak.onrender.com/' }, page)).toEqual({
      apiBase: 'https://game-peak.onrender.com/api', websocketUrl: 'wss://game-peak.onrender.com/ws',
    });
  });
  it('accepts an API suffix without duplicating it', () => {
    expect(resolveEndpoints({ VITE_API_URL: ' https://game-peak.onrender.com/api/ ' }, page).websocketUrl).toBe('wss://game-peak.onrender.com/ws');
    expect(resolveEndpoints({ VITE_API_URL: 'https://game-peak.onrender.com/api' }, page).apiBase).toBe('https://game-peak.onrender.com/api');
  });
  it('keeps legacy deployment variables and prefers VITE_WS_URL', () => {
    expect(resolveEndpoints({ VITE_COLYSEUS_URL: 'game-peak.onrender.com' }, page).websocketUrl).toBe('wss://game-peak.onrender.com/ws');
    expect(resolveEndpoints({ VITE_WS_URL: 'https://game-peak.onrender.com/ws', VITE_COLYSEUS_URL: 'ws://localhost:2567' }, page).websocketUrl).toBe('wss://game-peak.onrender.com/ws');
  });
  it('uses the Vite proxy locally and rejects mixed content in production', () => {
    expect(resolveEndpoints({}, { protocol: 'http:', host: 'localhost:5173' })).toEqual({ apiBase: '/api', websocketUrl: 'ws://localhost:5173/ws' });
    expect(() => resolveEndpoints({ VITE_COLYSEUS_URL: 'ws://localhost:2567' }, page)).toThrow('wss://');
  });
});
