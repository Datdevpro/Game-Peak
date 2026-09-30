import { Room, Client } from 'colyseus';
import { TownState, PlayerSchema, NpcSchema } from './schema/TownState';
import { GameService } from '../services/GameService';
import { AuthService } from '../services/AuthService';
import { TownRoom as GameSimulationRoom } from '../systems/TownRoom';
import { z } from 'zod';
import type { ServerMessage, WorldState } from '../../shared/types';

const movement = z.object({ x: z.number().finite().min(-1).max(1), y: z.number().finite().min(-1).max(1) });

export class ColyseusTownRoom extends Room<{ state: TownState }> {
  maxClients = 100;
  private simRoom!: GameSimulationRoom;
  private service!: GameService;
  private auth!: AuthService;
  private ownsSimulation = false;
  private detach: Array<() => void> = [];

  onCreate(options: { service: GameService; auth: AuthService; debug?: boolean; simulation?: GameSimulationRoom }) {
    this.service = options.service;
    this.auth = options.auth;
    this.setState(new TownState());

    this.ownsSimulation = !options.simulation;
    this.simRoom = options.simulation ?? new GameSimulationRoom(this.service, options.debug ?? false);
    if (this.ownsSimulation) this.simRoom.start();

    // Sync simulation ticks to Colyseus state
    const onWorld = (world: WorldState) => {
      this.state.minutes = world.minutes;
      this.state.day = world.day;
      this.state.weather = world.weather;
      this.state.temperature = world.temperature;

      // Sync active players
      const activeIds = new Set(world.players.map(p => p.id));
      for (const id of this.state.players.keys()) if (!activeIds.has(id)) this.state.players.delete(id);
      for (const p of world.players) {
        let playerSchema = this.state.players.get(p.id);
        if (!playerSchema) {
          playerSchema = new PlayerSchema();
          playerSchema.id = p.id;
          playerSchema.name = p.name;
          playerSchema.avatar = p.avatar;
          this.state.players.set(p.id, playerSchema);
        }
        playerSchema.x = p.x;
        playerSchema.y = p.y;
        playerSchema.direction = p.direction;
        playerSchema.moving = p.moving;
      }

      // Sync NPCs
      if (this.state.npcs.length !== world.npcs.length) {
        this.state.npcs.clear();
        for (const n of world.npcs) {
          const npcSchema = new NpcSchema();
          npcSchema.id = n.id;
          npcSchema.name = n.name;
          npcSchema.avatar = n.avatar;
          npcSchema.x = n.x;
          npcSchema.y = n.y;
          npcSchema.direction = n.direction;
          npcSchema.moving = n.moving;
          npcSchema.state = n.state;
          npcSchema.archetype = n.archetype;
          this.state.npcs.push(npcSchema);
        }
      } else {
        for (let i = 0; i < world.npcs.length; i++) {
          const n = world.npcs[i];
          const npcSchema = this.state.npcs[i];
          if (npcSchema) {
            npcSchema.x = n.x;
            npcSchema.y = n.y;
            npcSchema.direction = n.direction;
            npcSchema.moving = n.moving;
            npcSchema.state = n.state;
          }
        }
      }
    };
    this.simRoom.on('world', onWorld);
    this.detach.push(() => this.simRoom.off('world', onWorld));

    const onSale = (sale: Omit<Extract<ServerMessage, { type: 'sale' }>, 'type'>) => {
      this.broadcast('sale', sale);
    };
    this.simRoom.on('sale', onSale);
    this.detach.push(() => this.simRoom.off('sale', onSale));

    const onDirty = (affectedIds: string[]) => {
      for (const id of affectedIds) {
        const client = this.clients.find(c => c.auth?.id === id);
        if (client) {
          client.send('state', {
            player: this.service.players.snapshot(
              id,
              this.service.economy.prices,
              this.simRoom.players.get(id)?.actor
            ),
          });
        }
      }
    };
    this.simRoom.on('dirty', onDirty);
    this.detach.push(() => this.simRoom.off('dirty', onDirty));

    // Movement input vector handler
    this.onMessage('input', (client, message: unknown) => {
      const input = movement.safeParse(message);
      if (client.auth?.id && input.success) {
        this.simRoom.input(client.auth.id, input.data.x, input.data.y);
      }
    });

    // Transactional action handler
    this.onMessage('action', (client, message: unknown) => {
      if (!client.auth?.id) return;
      try {
        const result = this.service.execute(
          client.auth.id,
          message,
          this.simRoom.players.get(client.auth.id)?.actor,
          this.simRoom.time.day,
          this.simRoom.time.hour,
          this.simRoom.time.useRealTime
        );
        client.send('action_result', {
          message: result.message,
          player: this.service.players.snapshot(
            client.auth.id,
            this.service.economy.prices,
            this.simRoom.players.get(client.auth.id)?.actor
          ),
        });
        this.simRoom.emit('dirty', result.affected);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Lỗi giao dịch';
        client.send('error', { message });
      }
    });
  }

  onAuth(_client: Client, options: { token?: string }) {
    if (!options.token) return null;
    const playerId = this.auth.resolve(options.token);
    if (!playerId) return null;
    return { id: playerId };
  }

  onJoin(client: Client, _options: { token?: string }) {
    const id = client.auth?.id;
    if (id) {
      this.simRoom.join(id, `colyseus:${client.sessionId}`);
    }
  }

  onLeave(client: Client, _code?: number) {
    const id = client.auth?.id;
    if (id) {
      this.simRoom.leave(id, `colyseus:${client.sessionId}`);
      if (!this.simRoom.players.has(id)) this.state.players.delete(id);
    }
  }

  onDispose() {
    for (const detach of this.detach) detach();
    this.detach = [];
    if (this.ownsSimulation) this.simRoom.stop();
  }
}
