import { afterEach, expect, it, vi } from 'vitest';
import { action } from '../src/services/api';
import { useGameStore } from '../src/stores/gameStore';

afterEach(() => { vi.unstubAllGlobals(); useGameStore.setState({ toast: null }); });
it('shows a rejected trade instead of silently swallowing the server error', async () => {
  vi.stubGlobal('location', { protocol: 'http:', host: 'localhost:5173' });
  vi.stubGlobal('sessionStorage', { getItem: () => 'test-token' });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'Hãy đi tới cửa địa điểm này để tương tác.' }), { status: 400, headers: { 'Content-Type': 'application/json' } })));
  await expect(action({ type: 'BUY_ITEM', itemId: 'beans', quantity: 1 })).rejects.toThrow('Hãy đi tới cửa');
  expect(useGameStore.getState().toast).toMatchObject({ text: 'Hãy đi tới cửa địa điểm này để tương tác.', error: true });
});
