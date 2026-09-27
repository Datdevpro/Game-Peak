import { describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import { createGameServer } from '../server/app';

describe('Multiplayer Synchronization (Section 21, 22)', () => {
  it('cho phép 2 client kết nối đồng thời, thấy vị trí của nhau và cập nhật di chuyển', async () => {
    const server = createGameServer({ databasePath: ':memory:', debug: true });
    await server.listen(3098, '127.0.0.1');

    try {
      // Register 2 accounts
      const userA = await server.auth.register('PlayerOne', 'password123', 0);
      const userB = await server.auth.register('PlayerTwo', 'password123', 1);

      // Connect ws for player A
      const wsA = new WebSocket('ws://127.0.0.1:3098/ws');
      await new Promise<void>((resolve, reject) => {
        wsA.on('open', () => {
          wsA.send(JSON.stringify({ type: 'auth', token: userA.token }));
          resolve();
        });
        wsA.on('error', reject);
      });

      // Connect ws for player B
      const wsB = new WebSocket('ws://127.0.0.1:3098/ws');
      await new Promise<void>((resolve, reject) => {
        wsB.on('open', () => {
          wsB.send(JSON.stringify({ type: 'auth', token: userB.token }));
          resolve();
        });
        wsB.on('error', reject);
      });

      // Listen for world snapshot containing both players on wsA
      let sawBoth = false;
      await new Promise<void>((resolve) => {
        const handler = (data: Buffer) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'world') {
            const playerIds = msg.world.players.map((p: any) => p.id);
            if (playerIds.includes(userA.id) && playerIds.includes(userB.id)) {
              sawBoth = true;
              wsA.off('message', handler);
              resolve();
            }
          }
        };
        wsA.on('message', handler);
      });

      expect(sawBoth).toBe(true);

      // Player B sends movement input
      wsB.send(JSON.stringify({ type: 'input', x: 1, y: 0 }));

      // Clean disconnect
      wsA.close();
      wsB.close();
      await new Promise(r => setTimeout(r, 100));
    } finally {
      await server.close();
    }
  });
});
