import { Server } from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { createGameServer } from '../app';
import { ColyseusTownRoom } from './TownRoom';

const port = Number(process.env.PORT || process.env.COLYSEUS_PORT || 2567);
const host = process.env.HOST || '0.0.0.0';
const isProduction = process.env.NODE_ENV !== 'development';

const server = createGameServer({
  externalWebSockets: true,
  production: isProduction,
  debug: process.env.ENABLE_DEBUG === 'true',
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',').map(origin => origin.trim()).filter(Boolean),
});

const transport = new WebSocketTransport({ noServer: true });
transport.attachToServer(server.http, { filter: req => req.url?.split('?')[0] !== '/ws' });
const gameServer = new Server({ transport, gracefullyShutdown: false });

gameServer.define('town', ColyseusTownRoom, {
  service: server.service,
  auth: server.auth,
  simulation: server.room,
});

await gameServer.listen(port, host);
console.log(`Colyseus & Native WS Multiplayer Server listening on http://${host}:${port}`);

let closing = false;
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    if (closing) return;
    closing = true;
    void gameServer.gracefullyShutdown(false)
      .then(() => server.close())
      .then(() => process.exit(0));
  });
}
