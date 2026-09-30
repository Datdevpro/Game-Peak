import { describe, expect, it } from 'vitest';
import { TownState, PlayerSchema, NpcSchema } from '../server/colyseus/schema/TownState';
import { GameDatabase } from '../server/database/db';
import { GameService } from '../server/services/GameService';
import { AuthService } from '../server/services/AuthService';
import { ColyseusTownRoom } from '../server/colyseus/TownRoom';
import { TownRoom } from '../server/systems/TownRoom';

describe('Colyseus Room & Schema Serialization', () => {
  it('khởi tạo TownState với Schema Map và Array hợp lệ', () => {
    const state = new TownState();
    expect(state.minutes).toBe(480);
    expect(state.day).toBe(1);
    expect(state.weather).toBe('sunny');
    expect(state.players.size).toBe(0);
    expect(state.npcs.length).toBe(0);

    const player = new PlayerSchema();
    player.id = 'p-1';
    player.name = 'TestHero';
    player.x = 100;
    player.y = 200;
    player.direction = 1;
    player.moving = false;
    state.players.set(player.id, player);

    expect(state.players.get('p-1')?.name).toBe('TestHero');
    expect(state.players.get('p-1')?.x).toBe(100);

    const npc = new NpcSchema();
    npc.id = 'npc-1';
    npc.name = 'Chị Lan';
    npc.archetype = 'FARMER';
    npc.state = 'IDLE';
    state.npcs.push(npc);

    expect(state.npcs.length).toBe(1);
    expect(state.npcs[0].name).toBe('Chị Lan');
  });

  it('ColyseusTownRoom khởi tạo simulation room và dọn dẹp sạch khi dispose', () => {
    const db = new GameDatabase(':memory:');
    const service = new GameService(db);
    const auth = new AuthService(db);

    const room = new ColyseusTownRoom();
    room.onCreate({ service, auth, debug: true });

    expect(room.state).toBeDefined();
    expect(room.state.weather).toBeDefined();

    room.onDispose();
    db.close();
  });

  it('shares simulation and keeps presence until the last transport leaves', async () => {
    const db = new GameDatabase(':memory:');
    const service = new GameService(db);
    const auth = new AuthService(db);
    const sim = new TownRoom(service);
    const adapter = new ColyseusTownRoom();
    try {
      const user = await auth.register('SharedPlayer', 'password123', 0);
      adapter.onCreate({ service, auth, simulation: sim });
      sim.join(user.id);
      sim.join(user.id, 'colyseus:test-session');
      sim.tick(0.1);
      expect(adapter.state.players.has(user.id)).toBe(true);
      sim.leave(user.id, 'colyseus:test-session');
      expect(sim.players.has(user.id)).toBe(true);
      sim.leave(user.id);
      sim.tick(0.1);
      expect(adapter.state.players.has(user.id)).toBe(false);
      adapter.onDispose();
      expect(sim.listenerCount('world')).toBe(0);
      // Disposing an adapter must not shut down the shared game's simulation.
      sim.join(user.id);
      sim.input(user.id, 1, 0);
      const x = sim.players.get(user.id)!.actor.x;
      sim.tick(0.1);
      expect(sim.players.get(user.id)!.actor.x).toBeGreaterThan(x);
    } finally { adapter.onDispose(); sim.stop(); db.close(); }
  });
});
