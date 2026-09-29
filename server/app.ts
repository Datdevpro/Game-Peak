import express, { type Request, type Response, type NextFunction } from 'express';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { WebSocketServer, WebSocket } from 'ws';
import { z } from 'zod';
import { GameDatabase } from './database/db';
import { AuthService } from './services/AuthService';
import { GameService } from './services/GameService';
import { GameError, ensure } from './services/errors';
import { TownRoom } from './systems/TownRoom';
const credentials = z.object({ username: z.string().trim().regex(/^[\p{L}\p{N}_ -]{3,20}$/u), password: z.string().min(8).max(128), avatar: z.number().int().min(0).max(23).default(0) });
const movement = z.object({ type: z.literal('input'), x: z.number().finite().min(-1).max(1), y: z.number().finite().min(-1).max(1) });
const debugCommand = z.discriminatedUnion('type', [z.object({ type: z.literal('time'), hour: z.number().min(0).max(23.99) }), z.object({ type: z.literal('weather'), weather: z.enum(['sunny', 'cloudy', 'rain']) }), z.object({ type: z.literal('money') }), z.object({ type: z.literal('npc') }), z.object({ type: z.literal('event'), index: z.number().int().min(0).max(2) })]);
export function createGameServer(options: { databasePath?: string; debug?: boolean; production?: boolean; allowedOrigins?: string[] } = {}) {
  const db = new GameDatabase(options.databasePath), service = new GameService(db), auth = new AuthService(db);
  const debug = !options.production && options.debug === true;
  const room = new TownRoom(service, debug), app = express(), http = createServer(app);
  const wsServer = new WebSocketServer({ server: http, path: '/ws', maxPayload: 8192 });
  const sockets = new Map<string, WebSocket>(), socketTokens = new Map<WebSocket, string>();
  const buckets = new Map<string, { count: number; reset: number }>();
  const allowedOrigins = options.allowedOrigins ?? ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3001'];
  function originAllowed(origin: string | undefined, host: string | undefined) {
    if (!origin) return true;
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) return true;
    try {
      const originHost = new URL(origin).host;
      if (originHost === host) return true;
      if (originHost.endsWith('.vercel.app')) return true;
      return false;
    } catch { return false; }
  }
  function rate(key: string, limit: number, window = 60_000) {
    const now = Date.now(); let bucket = buckets.get(key);
    if (!bucket || bucket.reset < now) { bucket = { count: 0, reset: now + window }; buckets.set(key, bucket); }
    ensure(++bucket.count <= limit, 'Bạn thao tác quá nhanh. Vui lòng chờ một chút.', 429);
  }
  const bearer = (req: Request) => req.headers.authorization?.replace(/^Bearer /, '') ?? '';
  function requirePlayer(req: Request) { const id = auth.resolve(bearer(req)); ensure(id, 'Phiên đăng nhập đã hết hạn.', 401); return id; }
  function send(ws: WebSocket, data: unknown) { if (ws.readyState === WebSocket.OPEN && ws.bufferedAmount < 256_000) ws.send(JSON.stringify(data)); }
  function sendState(ids: string[]) { for (const id of new Set(ids)) { const ws = sockets.get(id); if (ws) send(ws, { type: 'state', player: service.players.snapshot(id, service.economy.prices, room.players.get(id)?.actor) }); } }
  app.disable('x-powered-by'); app.use(express.json({ limit: '8kb' }));
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && originAllowed(origin, req.headers.host)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else if (allowedOrigins.includes('*')) {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });
  app.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    try { ensure(originAllowed(req.headers.origin, req.headers.host), 'Nguồn truy cập không được phép.', 403); rate(`api:${req.ip}`, 600); next(); } catch (e) { next(e); }
  });
  app.get('/api/health', (_req, res) => res.json({ ok: true, town: 'Mầm Xanh' }));
  app.post('/api/auth/:mode', async (req, res) => {
    if (req.params.mode === 'logout') {
      const id = requirePlayer(req), token = bearer(req); auth.logout(token);
      const ws = sockets.get(id); if (ws && socketTokens.get(ws) === token) ws.close(4001, 'Logged out');
      res.json({ ok: true }); return;
    }
    rate(`auth:${req.ip}`, 20);
    const input = credentials.parse(req.body);
    ensure(req.params.mode === 'login' || req.params.mode === 'register', 'Không tìm thấy thao tác.', 404);
    const result = req.params.mode === 'register' ? await auth.register(input.username, input.password, input.avatar) : await auth.login(input.username, input.password);
    res.json({ token: result.token, player: service.players.snapshot(result.id, service.economy.prices) });
  });
  app.get('/api/me', (req, res) => { const id = requirePlayer(req); res.json(service.players.snapshot(id, service.economy.prices, room.players.get(id)?.actor)); });
  app.get('/api/marketplace', (req, res) => { requirePlayer(req); res.json(service.marketplace.list()); });
  app.post('/api/action', (req, res) => {
    const id = requirePlayer(req); rate(`action:${id}`, 120);
    const result = service.execute(id, req.body, room.players.get(id)?.actor, room.time.day, room.time.hour);
    sendState(result.affected); res.json({ message: result.message, player: service.players.snapshot(id, service.economy.prices, room.players.get(id)?.actor) });
  });
  if (debug) app.post('/api/debug', (req, res) => {
    const id = requirePlayer(req), command = debugCommand.parse(req.body); rate(`debug:${id}`, 30);
    switch (command.type) {
      case 'time': room.time.setHour(command.hour); break;
      case 'weather': room.weather.kind = command.weather; break;
      case 'money': db.transaction(() => service.players.credit(id, 100_000, 'DEV · Tiền kiểm thử')); break;
      case 'npc': room.npcs.spawn(); break;
      case 'event': room.events.trigger(room.time.minutes, command.index); break;
    }
    room.checkpoint(); sendState([id]); res.json({ ok: true });
  });
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Không tìm thấy chức năng.' }));
  if (options.production) { app.use(express.static(resolve('dist'))); app.get('/{*path}', (_req, res) => res.sendFile(resolve('dist/index.html'))); }
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof z.ZodError) { res.status(400).json({ error: 'Dữ liệu không hợp lệ. Kiểm tra tên, mật khẩu, số lượng và giá.' }); return; }
    if (error instanceof GameError) { res.status(error.status).json({ error: error.message }); return; }
    if (error instanceof SyntaxError) { res.status(400).json({ error: 'Yêu cầu không hợp lệ.' }); return; }
    console.error(error); res.status(500).json({ error: 'Không thể hoàn tất giao dịch. Dữ liệu chưa được thay đổi.' });
  });
  wsServer.on('connection', (ws, req) => {
    if (!originAllowed(req.headers.origin, req.headers.host) || wsServer.clients.size > 100) { ws.close(1008); return; }
    let playerId: string | null = null, lastInput = 0, alive = true;
    const deadline = setTimeout(() => { if (!playerId) ws.close(4001); }, 5000);
    const heartbeat = setInterval(() => {
      if (!alive || (playerId && !auth.resolve(socketTokens.get(ws) ?? ''))) { ws.terminate(); return; }
      alive = false; ws.ping();
    }, 15000);
    ws.on('pong', () => { alive = true; });
    ws.on('message', buffer => {
      try {
        const message: unknown = JSON.parse(buffer.toString());
        if (!playerId) {
          const input = z.object({ type: z.literal('auth'), token: z.string().max(128) }).parse(message);
          const id = auth.resolve(input.token); if (!id) { ws.close(4001); return; }
          const old = sockets.get(id); if (old) old.close(4001, 'Account connected elsewhere');
          playerId = id; clearTimeout(deadline); socketTokens.set(ws, input.token); sockets.set(id, ws); room.join(id);
          send(ws, { type: 'world', world: room.snapshot() }); sendState([id]); return;
        }
        rate(`ws:${playerId}`, 1200);
        if (Date.now() - lastInput < 45) return;
        const input = movement.parse(message); lastInput = Date.now(); room.input(playerId, input.x, input.y);
      } catch (e) { if (e instanceof GameError && e.status === 429) ws.close(1008); else send(ws, { type: 'error', message: 'Dữ liệu di chuyển không hợp lệ.' }); }
    });
    ws.on('error', () => ws.close());
    ws.on('close', () => { clearTimeout(deadline); clearInterval(heartbeat); socketTokens.delete(ws); if (playerId && sockets.get(playerId) === ws) { sockets.delete(playerId); room.leave(playerId); } });
  });
  room.on('world', world => { const message = JSON.stringify({ type: 'world', world }); for (const ws of sockets.values()) if (ws.readyState === WebSocket.OPEN && ws.bufferedAmount < 256_000) ws.send(message); });
  room.on('dirty', sendState);
  room.on('sale', sale => { for (const ws of sockets.values()) send(ws, { type: 'sale', ...sale }); });
  const cleanup = setInterval(() => { for (const [key, bucket] of buckets) if (bucket.reset < Date.now()) buckets.delete(key); db.run('DELETE FROM requests WHERE created_at<?', Date.now() - 7 * 86400000); }, 60000);
  return { app, http, db, service, auth, room,
    listen: (port: number, host = '127.0.0.1') => new Promise<void>(resolve => { http.listen(port, host, () => { room.start(); resolve(); }); }),
    close: async () => { clearInterval(cleanup); room.stop(); for (const ws of wsServer.clients) ws.terminate(); await new Promise<void>(resolve => wsServer.close(() => resolve())); await new Promise<void>(resolve => http.close(() => resolve())); db.close(); },
  };
}
