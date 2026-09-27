import { createGameServer } from './app';
const port = Number(process.env.PORT || 3001), host = process.env.HOST || '127.0.0.1';
const server = createGameServer({ production: process.env.NODE_ENV === 'production', debug: process.env.ENABLE_DEBUG === 'true', allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') });
await server.listen(port, host);
console.log(`Gamepeak server: http://${host}:${port} · debug ${server.room.debug ? 'ON' : 'OFF'}`);
let closing = false;
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => { if (closing) return; closing = true; void server.close().then(() => process.exit(0)); });
