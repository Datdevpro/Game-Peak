import { createGameServer } from './app';
const port = Number(process.env.PORT || 3001), host = process.env.HOST || '0.0.0.0';
const isProduction = process.env.NODE_ENV !== 'development';
const server = createGameServer({ production: isProduction, debug: process.env.ENABLE_DEBUG === 'true', allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',').map(origin => origin.trim()).filter(Boolean) });
await server.listen(port, host);
console.log(`Gamepeak server: http://${host}:${port} · mode ${isProduction ? 'PRODUCTION' : 'DEV'} · debug ${server.room.debug ? 'ON' : 'OFF'}`);
let closing = false;
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => { if (closing) return; closing = true; void server.close().then(() => process.exit(0)); });
