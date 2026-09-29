import { Server } from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { createServer } from 'node:http';
import express, { type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { ColyseusTownRoom } from './TownRoom';
import { GameDatabase } from '../database/db';
import { GameService } from '../services/GameService';
import { AuthService } from '../services/AuthService';
import { GameError, ensure } from '../services/errors';

const port = Number(process.env.COLYSEUS_PORT || process.env.PORT || 2567);
const host = process.env.HOST || '0.0.0.0';

const credentials = z.object({
  username: z.string().trim().regex(/^[\p{L}\p{N}_ -]{3,20}$/u),
  password: z.string().min(8).max(128),
  avatar: z.number().int().min(0).max(23).default(0),
});

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '16kb' }));

// CORS headers for Vercel and cross-origin access
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

const db = new GameDatabase();
const service = new GameService(db);
const auth = new AuthService(db);

const bearer = (req: Request) => req.headers.authorization?.replace(/^Bearer /, '') ?? '';
function requirePlayer(req: Request) {
  const id = auth.resolve(bearer(req));
  ensure(id, 'Phiên đăng nhập đã hết hạn.', 401);
  return id;
}

// Health checks
app.get('/health', (_req, res) => res.json({ status: 'ok', server: 'Colyseus TownRoom' }));
app.get('/api/health', (_req, res) => res.json({ ok: true, town: 'Mầm Xanh (Colyseus)' }));

// Auth endpoints
app.post('/api/auth/:mode', async (req, res, next) => {
  try {
    if (req.params.mode === 'logout') {
      const token = bearer(req);
      auth.logout(token);
      res.json({ ok: true });
      return;
    }
    const input = credentials.parse(req.body);
    ensure(req.params.mode === 'login' || req.params.mode === 'register', 'Không tìm thấy thao tác.', 404);
    const result = req.params.mode === 'register'
      ? await auth.register(input.username, input.password, input.avatar)
      : await auth.login(input.username, input.password);
    res.json({ token: result.token, player: service.players.snapshot(result.id, service.economy.prices) });
  } catch (err) {
    next(err);
  }
});

// Player profile & snapshot
app.get('/api/me', (req, res, next) => {
  try {
    const id = requirePlayer(req);
    res.json(service.players.snapshot(id, service.economy.prices));
  } catch (err) {
    next(err);
  }
});

// Marketplace
app.get('/api/marketplace', (req, res, next) => {
  try {
    requirePlayer(req);
    res.json(service.marketplace.list());
  } catch (err) {
    next(err);
  }
});

// Transactional action
app.post('/api/action', (req, res, next) => {
  try {
    const id = requirePlayer(req);
    const result = service.execute(id, req.body);
    res.json({ message: result.message, player: service.players.snapshot(id, service.economy.prices) });
  } catch (err) {
    next(err);
  }
});

// Error handling middleware
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof z.ZodError) {
    res.status(400).json({ error: 'Dữ liệu không hợp lệ. Kiểm tra tên và mật khẩu.' });
    return;
  }
  if (error instanceof GameError) {
    res.status(error.status).json({ error: error.message });
    return;
  }
  console.error(error);
  res.status(500).json({ error: 'Máy chủ gặp sự cố xử lý.' });
});

const httpServer = createServer(app);
const gameServer = new Server({
  transport: new WebSocketTransport({
    server: httpServer,
  }),
});

gameServer.define('town', ColyseusTownRoom, { service, auth });

httpServer.listen(port, host, () => {
  console.log(`Colyseus Multiplayer Server listening on ws://${host}:${port}`);
});

