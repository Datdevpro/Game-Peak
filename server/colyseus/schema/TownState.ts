import { Schema, type, MapSchema, ArraySchema } from '@colyseus/schema';

export class PlayerSchema extends Schema {
  @type('string') id: string = '';
  @type('string') name: string = '';
  @type('number') avatar: number = 0;
  @type('number') x: number = 0;
  @type('number') y: number = 0;
  @type('number') direction: number = 1;
  @type('boolean') moving: boolean = false;
}

export class NpcSchema extends Schema {
  @type('string') id: string = '';
  @type('string') name: string = '';
  @type('number') avatar: number = 0;
  @type('number') x: number = 0;
  @type('number') y: number = 0;
  @type('number') direction: number = 1;
  @type('boolean') moving: boolean = false;
  @type('string') state: string = 'idle';
  @type('string') archetype: string = '';
}

export class TownState extends Schema {
  @type('number') minutes: number = 480;
  @type('number') day: number = 1;
  @type('string') weather: string = 'sunny';
  @type('number') temperature: number = 26;
  @type({ map: PlayerSchema }) players = new MapSchema<PlayerSchema>();
  @type([NpcSchema]) npcs = new ArraySchema<NpcSchema>();
}
