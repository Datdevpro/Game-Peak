import { CONFIG, WEATHER } from '../../shared/config';
import type { Npc, Point, WorldEvent } from '../../shared/types';
import type { WeatherKind } from '../../shared/config';
import { BUILDINGS, WAYPOINTS, distance, findPath } from '../../shared/world';
import { BusinessManager } from '../services/BusinessManager';
import { businessQuery, type BusinessRow } from '../services/PlayerRepository';
interface SimNpc { actor: Npc; path: Point[]; wait: number; destination: 'idle' | 'shopping' | 'working' | 'home' | 'sitting' | 'talking'; phase: string; travel: number }
const names = ['An', 'Bình', 'Chi', 'Duy', 'Hà', 'Khôi', 'Lan', 'Minh', 'Ngân', 'Phúc', 'Quỳnh', 'Sơn', 'Thảo', 'Uyên', 'Vũ', 'Yến', 'Bảo', 'Linh', 'Nam', 'Mai', 'Trúc', 'Tú', 'Huy', 'Nhi'];
const archetypes = ['OfficeWorker', 'Student', 'Shopper', 'Tourist', 'Resident'];
export class NPCManager {
  private entries: SimNpc[] = [];
  private decisionAccumulator = 0;
  constructor(private businesses: BusinessManager, private onSale: (sale: NonNullable<ReturnType<BusinessManager['sale']>>) => void, private random = Math.random) {
    for (let i = 0; i < CONFIG.npcCount; i++) this.spawn();
  }
  spawn() {
    if (this.entries.length >= 40) return;
    const i = this.entries.length, p = WAYPOINTS[i % 15];
    this.entries.push({ actor: { id: `npc-${i}`, name: names[i % names.length], avatar: i % 24, ...p, direction: 1, moving: false, state: 'idle', archetype: archetypes[i % 5] }, path: [], wait: i * 0.2, destination: 'idle', phase: '', travel: 0 });
  }
  get actors() { return this.entries.map(e => e.actor); }
  private go(e: SimNpc, point: Point, destination: SimNpc['destination']) {
    e.path = findPath(e.actor, point); e.destination = destination; e.actor.state = 'walking'; e.travel = distance(e.actor, point);
    if (!e.path.length) { e.actor.state = 'idle'; e.wait = 3; delete e.actor.targetBusiness; }
  }
  update(dt: number, hour: number, weather: WeatherKind, event: WorldEvent | null) {
    this.decisionAccumulator += dt;
    const decide = this.decisionAccumulator >= 1;
    if (decide) this.decisionAccumulator = 0;
    const shops = decide ? this.businesses.openShops() : [];
    for (let index = 0; index < this.entries.length; index++) {
      const e = this.entries[index], a = e.actor;
      e.wait -= dt;
      const night = hour < 6 || hour >= 21;
      const atWork = a.archetype === 'OfficeWorker' && hour >= 8 && hour < 17;
      const shelter = weather === 'rain' && index % 4 === 0;
      const phase = night && index % 4 !== 3 ? 'home' : atWork ? 'working' : shelter ? 'home' : 'outside';
      if (decide && e.phase !== phase) {
        e.phase = phase; delete a.targetBusiness;
        if (phase === 'home' || phase === 'working') {
          const b = BUILDINGS.find(b => b.id === (phase === 'home' ? 'apartment' : 'office'))!;
          this.go(e, b.door, phase); continue;
        }
        a.state = 'idle'; e.wait = this.random() * 3; e.path = [];
      }
      if (a.state === 'home' || a.state === 'working') { a.moving = false; continue; }
      if (e.path.length) {
        const target = e.path[0], d = distance(a, target), step = CONFIG.npcSpeed * dt;
        a.direction = target.x < a.x ? -1 : 1; a.moving = true;
        if (d <= step) { a.x = target.x; a.y = target.y; e.path.shift(); }
        else { a.x += (target.x - a.x) / d * step; a.y += (target.y - a.y) / d * step; }
        if (!e.path.length) { a.state = e.destination; a.moving = false; e.wait = a.state === 'shopping' ? 2 : 2 + this.random() * 5; }
        continue;
      }
      a.moving = false;
      if (a.state === 'shopping' && e.wait <= 0) {
        if (a.targetBusiness) {
          const b = this.businesses.find(a.targetBusiness);
          if (b && this.random() < this.businesses.purchaseProbability(b, weather, event, e.travel)) {
            const sale = this.businesses.sale(b.id); if (sale) this.onSale(sale);
          }
        }
        delete a.targetBusiness; a.state = 'idle'; e.wait = 3;
        this.go(e, WAYPOINTS[index % 15], 'idle'); continue;
      }
      if (!decide || e.wait > 0 || phase !== 'outside') continue;
      const available = shops.filter(b => this.entries.filter(n => n.actor.targetBusiness === b.id).length < 4 + b.level);
      if (available.length && this.random() < 0.7 * WEATHER[weather].traffic) {
        const b = available[Math.floor(this.random() * available.length)], building = BUILDINGS.find(x => x.id === b.property_id);
        if (building) {
          a.targetBusiness = b.id; this.go(e, { x: building.door.x + (index % 3 - 1) * 13, y: building.door.y - 5 }, 'shopping');
        }
      } else {
        const target = WAYPOINTS[Math.floor(this.random() * WAYPOINTS.length)];
        this.go(e, target, index % 7 === 0 ? 'talking' : target.y > 900 ? 'sitting' : 'idle');
      }
    }
  }
}
