import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';

describe('Render entrypoint', () => {
  it.each(['server/index.ts', 'server/colyseus/index.ts'])('%s: HTTP auth, native gameplay, transactions and logout', async entrypoint => {
    const reservation = createServer();
    reservation.listen(0, '127.0.0.1');
    await once(reservation, 'listening');
    const port = (reservation.address() as { port: number }).port;
    await new Promise<void>(resolve => reservation.close(() => resolve()));
    const child = spawn(process.execPath, ['--import', 'tsx', entrypoint], {
      env: { ...process.env, PORT: String(port), COLYSEUS_PORT: String(port), HOST: '127.0.0.1', DATABASE_PATH: ':memory:', NODE_ENV: 'production', ALLOWED_ORIGINS: 'https://game.example.com' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let logs = '';
    child.stdout.on('data', b => { logs += b; });
    child.stderr.on('data', b => { logs += b; });
    let ws: WebSocket | undefined;
    try {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error(logs || 'Startup timeout')), 10000);
        child.once('error', reject);
        child.once('exit', () => { clearTimeout(timeout); reject(new Error(logs)); });
        child.stdout.on('data', () => { if (logs.includes('listening') || logs.includes('Gamepeak server:')) { clearTimeout(timeout); resolve(); } });
      });
      const base = `http://127.0.0.1:${port}`;
      const response = await fetch(`${base}/api/auth/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://game.example.com' },
        body: JSON.stringify({ username: 'DeployPlayer', password: 'password123', avatar: 0 }),
      });
      expect(response.status).toBe(200);
      expect(response.headers.get('access-control-allow-origin')).toBe('https://game.example.com');
      const { token, player } = await response.json();
      const login = await fetch(`${base}/api/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'DeployPlayer', password: 'password123' }),
      });
      expect(login.status).toBe(200);
      ws = new WebSocket(`ws://127.0.0.1:${port}/ws`, { origin: 'https://game.example.com' });
      const socket = ws;
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`No movement received: ${logs}`)), 5000);
        let startX: number | undefined;
        socket.on('open', () => socket.send(JSON.stringify({ type: 'auth', token })));
        socket.on('error', error => { clearTimeout(timer); reject(new Error(`${error.message}\n${logs}`)); });
        socket.on('close', code => { clearTimeout(timer); reject(new Error(`Closed ${code}\n${logs}`)); });
        socket.on('message', data => {
          const msg = JSON.parse(data.toString());
          if (msg.type !== 'world') return;
          const actor = msg.world.players.find((p: { id: string }) => p.id === player.id);
          if (!actor) return;
          if (startX === undefined) { startX = actor.x; socket.send(JSON.stringify({ type: 'input', x: 1, y: 0 })); }
          else if (actor.x > startX) { clearTimeout(timer); resolve(); }
        });
      });
      expect((await fetch(`${base}/api/health`)).status).toBe(200);
      expect((await fetch(`${base}/api/me`, { headers: { Authorization: `Bearer ${token}` } })).status).toBe(200);
      const action = await fetch(`${base}/api/action`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type: 'BUY_FASHION_ITEM', itemId: 'cap', requestId: crypto.randomUUID() }),
      });
      expect(action.status).toBe(200);
      expect((await action.json()).player.cash).toBeLessThan(player.cash);
      if (entrypoint.includes('colyseus')) {
        const reservation = await fetch(`${base}/matchmake/joinOrCreate/town`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }),
        });
        expect(reservation.status).toBe(200);
        const seat = await reservation.json();
        expect(seat.sessionId).toBeTruthy();
      }
      const closed = once(ws, 'close');
      expect((await fetch(`${base}/api/auth/logout`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: '{}' })).status).toBe(200);
      expect((await closed)[0]).toBe(4001);
      expect((await fetch(`${base}/api/me`, { headers: { Authorization: `Bearer ${token}` } })).status).toBe(401);
    } finally {
      ws?.terminate();
      if (child.exitCode === null && child.signalCode === null) { const exited = once(child, 'exit'); child.kill(); await exited; }
    }
  }, 20000);
});
