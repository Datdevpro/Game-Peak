import { EventEmitter } from 'node:events';
import { CONFIG, type WeatherKind } from '../../shared/config';
import type { Actor, WorldEvent, WorldState } from '../../shared/types';
import { movePoint } from '../../shared/world';
import { GameService } from '../services/GameService';
import { TimeManager } from './TimeManager';
import { WeatherManager } from './WeatherManager';
import { EventManager } from './EventManager';
import { NPCManager } from './NPCManager';
interface Presence { actor: Actor; input: { x: number; y: number }; inputAt: number }
export class TownRoom extends EventEmitter {
  readonly time: TimeManager; readonly weather: WeatherManager; readonly events: EventManager; readonly npcs: NPCManager;
  readonly players = new Map<string, Presence>();
  private timer?: ReturnType<typeof setInterval>;
  private elapsed = 0; private checkpointElapsed = 0;
  constructor(readonly service: GameService, readonly debug = false) {
    super();
    const saved = service.db.get<{ minutes: number; weather: WeatherKind; event: string | null; economy: string }>('SELECT * FROM world_state WHERE id=1')!;
    this.time = new TimeManager(saved.minutes, true); this.weather = new WeatherManager(saved.weather, saved.minutes);
    this.events = new EventManager(saved.event ? JSON.parse(saved.event) as WorldEvent : null, saved.minutes);
    Object.assign(service.economy.pressure, JSON.parse(saved.economy));
    this.npcs = new NPCManager(service.businesses, sale => { this.emit('sale', sale); this.emit('dirty', [sale.ownerId]); });
  }
  start() {
    let previous = performance.now();
    this.timer = setInterval(() => { const now = performance.now(); this.tick(Math.min(0.25, (now - previous) / 1000)); previous = now; }, CONFIG.tickMs);
  }
  tick(dt: number) {
    this.time.update(dt); this.weather.update(this.time.minutes);
    const event = this.events.update(this.time.minutes);
    if (event) this.service.db.run('INSERT OR IGNORE INTO world_events VALUES(?,?,?,?,?)', event.id, event.name, this.time.minutes, event.endsAt, JSON.stringify(event));
    this.service.economy.update(this.time.minutes, this.events.current);
    const now = Date.now();
    for (const p of this.players.values()) {
      const fresh = now - p.inputAt < 400, x = fresh ? p.input.x : 0, y = fresh ? p.input.y : 0;
      const next = movePoint(p.actor, x, y, dt);
      p.actor.moving = next.x !== p.actor.x || next.y !== p.actor.y;
      if (x) p.actor.direction = x < 0 ? -1 : 1;
      p.actor.x = next.x; p.actor.y = next.y;
    }
    this.npcs.update(dt, this.time.hour, this.weather.kind, this.events.current);
    this.elapsed += dt; this.checkpointElapsed += dt;
    if (this.elapsed >= 1) { this.elapsed = 0; this.service.businesses.chargeDay(this.time.day); this.emit('dirty', [...this.players.keys()]); }
    if (this.checkpointElapsed >= 5) { this.checkpointElapsed = 0; this.checkpoint(); }
    this.emit('world', this.snapshot());
  }
  join(id: string) {
    if (this.players.has(id)) return;
    const p = this.service.players.profile(id);
    this.players.set(id, { actor: { id, name: p.username, avatar: p.avatar, x: p.x, y: p.y, moving: false, direction: 1 }, input: { x: 0, y: 0 }, inputAt: 0 });
  }
  leave(id: string) {
    const p = this.players.get(id); if (!p) return;
    this.service.db.run('UPDATE profiles SET x=?,y=? WHERE id=?', p.actor.x, p.actor.y, id); this.players.delete(id);
  }
  input(id: string, x: number, y: number) { const p = this.players.get(id); if (p) { p.input = { x, y }; p.inputAt = Date.now(); } }
  snapshot(): WorldState {
    return { minutes: this.time.minutes, day: this.time.day, weather: this.weather.kind, temperature: this.weather.temperature(this.time.hour), prices: this.service.economy.prices, event: this.events.current, players: [...this.players.values()].map(p => p.actor), npcs: this.npcs.actors,
      properties: this.service.db.all<{ id: string; ownerId: string | null; businessName: string | null; open: number }>('SELECT p.id,p.owner_id AS ownerId,b.name AS businessName,COALESCE(b.is_open,0) AS open FROM properties p LEFT JOIN businesses b ON b.property_id=p.id').map(p => ({ ...p, open: !!p.open })), debug: this.debug };
  }
  checkpoint() {
    this.service.db.transaction(() => {
      this.service.db.run('UPDATE world_state SET minutes=?,weather=?,event=?,economy=? WHERE id=1', this.time.minutes, this.weather.kind, this.events.current ? JSON.stringify(this.events.current) : null, JSON.stringify(this.service.economy.pressure));
      for (const p of this.players.values()) this.service.db.run('UPDATE profiles SET x=?,y=? WHERE id=?', p.actor.x, p.actor.y, p.actor.id);
    });
  }
  stop() { clearInterval(this.timer); this.checkpoint(); }
}
