// Read-only production probe: no registration, valid session or game writes.
import { WebSocket } from 'ws';

const frontend = process.argv[2] || 'https://game-peak.vercel.app';
const backend = process.argv[3] || 'https://game-peak.onrender.com';
const response = await fetch(`${backend}/api/health`, { headers: { Origin: frontend }, signal: AbortSignal.timeout(60000) });
console.log('Backend health:', response.status, await response.text());
console.log('Allowed origin:', response.headers.get('access-control-allow-origin'));
const html = await (await fetch(frontend, { signal: AbortSignal.timeout(30000) })).text();
const asset = html.match(/src="([^"\s]+\.js)"/)?.[1];
if (asset) {
  const bundle = await (await fetch(new URL(asset, frontend), { signal: AbortSignal.timeout(60000) })).text();
  const urls = [...new Set(bundle.match(/(?:https?|wss?):\/\/[a-zA-Z0-9.-]+\.onrender\.com(?:\/ws)?/g) || [])];
  console.log('Render URLs embedded in frontend:', urls);
}

async function probe(url) {
  return new Promise(resolve => {
    const ws = new WebSocket(url, { origin: frontend, handshakeTimeout: 20000 });
    const timer = setTimeout(() => { console.log('WS timeout:', url); ws.terminate(); }, 25000);
    ws.on('open', () => { console.log('WS handshake OK:', url); ws.send(JSON.stringify({ type: 'auth', token: 'invalid-probe-token' })); });
    ws.on('error', error => console.log('WS error:', url, error.message));
    ws.on('close', (code, reason) => { clearTimeout(timer); console.log('WS close:', code, reason.toString(), '(4001 expected for invalid token)'); resolve(); });
  });
}
await probe(`${backend.replace(/^http/, 'ws')}/ws`);
