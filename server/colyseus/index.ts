import { Server } from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { createGameServer } from '../app';
import { ColyseusTownRoom } from './TownRoom';

const port = Number(process.env.COLYSEUS_PORT || process.env.PORT || 2567);
const host = process.env.HOST || '0.0.0.0';
const isProduction = process.env.NODE_ENV !== 'development';

const server = createGameServer({
  production: isProduction,
  debug: process.env.ENABLE_DEBUG === 'true',
  allowedOrigins: ['*'],
});

const gameServer = new Server({
  transport: new WebSocketTransport({
    server: server.http,
  }),
});

gameServer.define('town', ColyseusTownRoom, {
  service: server.service,
  auth: server.auth,
});

await server.listen(port, host);
console.log(`Colyseus & Native WS Multiplayer Server listening on http://${host}:${port}`);

let closing = false;
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    if (closing) return;
    closing = true;
    void gameServer.gracefullyShutdown()
      .then(() => server.close())
      .then(() => process.exit(0));
  });
}
