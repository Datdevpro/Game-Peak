import Phaser from 'phaser';
import { CONFIG, money } from '../../../shared/config';
import { BUILDINGS, WORLD, distance, findPath, movePoint } from '../../../shared/world';
import type { Actor, Point, ServerMessage } from '../../../shared/types';
import { useGameStore } from '../../stores/gameStore';
import { controls, gameEvents } from '../bridge';
import { sendMovement } from '../../services/api';
import { drawTown, makeAvatar } from '../art/town';
import { LightingManager } from '../systems/LightingManager';
import { audio } from '../systems/AudioManager';

interface Visual { sprite: Phaser.GameObjects.Image; name: Phaser.GameObjects.Text; umbrella: Phaser.GameObjects.Arc }
export class TownScene extends Phaser.Scene {
  private player!: Visual;
  private actors = new Map<string, Visual>();
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private lighting!: LightingManager;
  private path: Point[] = [];
  private lastTarget: Point | null = null;
  private lastNetwork = 0;
  private lastHud = 0;
  private playerId = '';
  private preview: Actor[] = [];
  private lastDx = 0;
  private lastDy = 0;
  constructor() { super('Town'); }
  create() {
    drawTown(this);
    this.player = this.createVisual({ ...CONFIG.spawn, id: 'preview', name: 'Bạn', avatar: 0, direction: 0, moving: false });
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,E,ESC', false) as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.keyboard!.clearCaptures();
    this.cameras.main.setBounds(0, 0, WORLD.width, WORLD.height).startFollow(this.player.sprite, false, 0.08, 0.08);
    this.setZoom(); this.scale.on('resize', this.setZoom, this);
    this.lighting = new LightingManager(this);
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (useGameStore.getState().panel || !useGameStore.getState().player) return;
      const p = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const building = BUILDINGS.find(b => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h + 25);
      controls.target = building ? building.door : { x: p.x, y: p.y };
      const ring = this.add.circle(controls.target.x, controls.target.y, 10, 0xffffff, 0.2).setStrokeStyle(2, 0xffffff).setDepth(3000);
      this.tweens.add({ targets: ring, scale: 1.8, alpha: 0, duration: 500, onComplete: () => ring.destroy() });
    });
    for (let i = 0; i < 24; i++) this.preview.push({ id: `preview-${i}`, name: '', avatar: i, x: 130 + i * 71, y: i % 2 ? 550 : 706, moving: true, direction: 1 });
    gameEvents.addEventListener('money', this.onMoney);
    gameEvents.addEventListener('sale', this.onSale);
    this.events.once('shutdown', () => { gameEvents.removeEventListener('money', this.onMoney); gameEvents.removeEventListener('sale', this.onSale); this.scale.off('resize', this.setZoom, this); });
  }
  private setZoom() { this.cameras.main.setZoom(this.scale.width < 600 ? 0.82 : Math.min(1.13, this.scale.width / 1350)); }
  private createVisual(actor: Actor): Visual {
    const sprite = this.add.image(actor.x, actor.y, makeAvatar(this, actor.avatar)).setOrigin(0.5, 0.9);
    const name = this.add.text(actor.x, actor.y - 69, actor.name, { fontFamily: 'Arial', fontSize: '11px', color: '#355e4a', backgroundColor: '#fffaf0dd', padding: { x: 7, y: 4 } }).setOrigin(0.5);
    const umbrella = this.add.circle(actor.x, actor.y - 56, 24, 0x7688b5, 0.95).setStrokeStyle(1.5, 0xeef2ff, 0.8).setVisible(false);
    return { sprite, name, umbrella };
  }
  private position(v: Visual, actor: Actor, time: number, dt: number, snap = false) {
    const factor = snap ? 1 : Math.min(1, dt * 12);
    v.sprite.x += (actor.x - v.sprite.x) * factor; v.sprite.y += (actor.y - v.sprite.y) * factor;
    const bob = actor.moving ? Math.sin(time * 0.015 + actor.avatar) * 1.6 : 0;
    v.sprite.setAngle(actor.moving ? Math.sin(time * 0.012) * 3 : 0).setScale(actor.direction === -1 ? -1 : 1, 1).setDepth(v.sprite.y);
    v.sprite.setOrigin(0.5, 0.9 + bob / 64);
    v.name.setText(actor.name).setPosition(v.sprite.x, v.sprite.y - 72).setDepth(v.sprite.y + 1);
    const ox = actor.direction === -1 ? -8 : 8;
    v.umbrella.setPosition(v.sprite.x + ox, v.sprite.y - 56).setDepth(v.sprite.y - 1).setVisible(useGameStore.getState().world.weather === 'rain');
  }
  private onMoney = (event: Event) => { const amount = (event as CustomEvent<number>).detail; if (amount) { this.float(this.player.sprite.x, this.player.sprite.y - 80, (amount > 0 ? '+' : '−') + money(Math.abs(amount)), amount > 0); audio.play(amount > 0 ? 'coin' : 'click'); } };
  private onSale = (event: Event) => {
    const sale = (event as CustomEvent<Extract<ServerMessage, { type: 'sale' }>>).detail;
    const b = BUILDINGS.find(b => b.id === sale.propertyId); if (b) this.float(b.door.x, b.door.y - 60, `♥ +${money(sale.amount)}`, true);
    if (sale.ownerId === useGameStore.getState().player?.id) audio.play('coin');
  };
  private float(x: number, y: number, text: string, positive: boolean) {
    const label = this.add.text(x, y, text, { fontFamily: 'Arial', fontSize: '18px', fontStyle: 'bold', color: positive ? '#287349' : '#bb6658', backgroundColor: '#fff8e8', padding: { x: 8, y: 5 } }).setOrigin(0.5).setDepth(5000);
    this.tweens.add({ targets: label, y: y - 55, alpha: 0, duration: 1800, ease: 'Sine.easeOut', onComplete: () => label.destroy() });
  }
  update(time: number, delta: number) {
    if (!this.player) return;
    const dt = Math.min(delta / 1000, 0.05), state = useGameStore.getState();
    const active = state.player;
    if (active && active.id !== this.playerId) { this.playerId = active.id; this.player.sprite.setPosition(active.x, active.y).setTexture(makeAvatar(this, active.avatar)); }
    if (Phaser.Input.Keyboard.JustDown(this.keys.ESC)) state.setPanel(null);
    const focused = document.activeElement?.tagName;
    const allowed = active && !state.panel && focused !== 'INPUT' && focused !== 'TEXTAREA' && focused !== 'SELECT';
    let dx = 0, dy = 0;
    if (allowed) {
      dx = Number(this.keys.D.isDown || this.keys.RIGHT.isDown) - Number(this.keys.A.isDown || this.keys.LEFT.isDown) + controls.x;
      dy = Number(this.keys.S.isDown || this.keys.DOWN.isDown) - Number(this.keys.W.isDown || this.keys.UP.isDown) + controls.y;
      if (dx || dy) { controls.target = null; this.path = []; }
      if (controls.target !== this.lastTarget) { this.lastTarget = controls.target; this.path = controls.target ? findPath(this.player.sprite, controls.target) : []; }
      if (!dx && !dy && this.path.length) {
        const p = this.path[0]; if (distance(this.player.sprite, p) < 9) this.path.shift(); else { dx = p.x - this.player.sprite.x; dy = p.y - this.player.sprite.y; const len = Math.hypot(dx, dy); dx /= len; dy /= len; }
      }
    }
    const length = Math.hypot(dx, dy); if (length > 1) { dx /= length; dy /= length; }
    let pos = movePoint(this.player.sprite, dx, dy, dt);
    if (active && !state.connected) { dx = 0; dy = 0; pos = { x: this.player.sprite.x, y: this.player.sprite.y }; }
    const authoritative = state.world.players.find(p => p.id === active?.id);
    if (authoritative) {
      const d = distance(pos, authoritative);
      if (d > 140) {
        pos.x = authoritative.x;
        pos.y = authoritative.y;
      } else {
        const isMoving = dx !== 0 || dy !== 0;
        const threshold = isMoving ? 24 : 0.5;
        if (d > threshold) {
          const factor = isMoving ? Math.min(1, dt * 5) : Math.min(1, dt * 10);
          pos.x += (authoritative.x - pos.x) * factor;
          pos.y += (authoritative.y - pos.y) * factor;
        }
      }
    }
    this.position(this.player, { ...pos, id: active?.id ?? '', name: active?.name ?? 'Một khởi đầu mới', avatar: active?.avatar ?? 0, direction: dx < 0 ? -1 : 1, moving: !!(dx || dy) }, time, dt, true);
    const isMoving = dx !== 0 || dy !== 0;
    const stateChanged = dx !== this.lastDx || dy !== this.lastDy;
    if (time - this.lastNetwork >= CONFIG.tickMs || (stateChanged && !isMoving && time - this.lastNetwork >= 50)) {
      sendMovement(dx, dy);
      this.lastNetwork = time;
      this.lastDx = dx;
      this.lastDy = dy;
    }
    const entities = active ? [...state.world.npcs, ...state.world.players.filter(p => p.id !== active.id)] : this.preview.map((p, i) => ({ ...p, x: 100 + (i * 73 + time * 0.022) % 1710 }));
    const present = new Set(entities.map(a => a.id));
    for (const [id, v] of this.actors) if (!present.has(id)) { v.sprite.destroy(); v.name.destroy(); v.umbrella.destroy(); this.actors.delete(id); }
    for (const actor of entities) {
      let v = this.actors.get(actor.id); if (!v) { v = this.createVisual(actor); this.actors.set(actor.id, v); }
      this.position(v, actor, time, dt);
      const hidden = 'state' in actor && (actor.state === 'home' || actor.state === 'working');
      v.sprite.setVisible(!hidden); v.name.setVisible(!hidden && (!actor.id.startsWith('npc') || actor.id === 'npc-fashion')); if (hidden) v.umbrella.setVisible(false);
    }
    let nearest = BUILDINGS.find(b => distance(pos, b.door) < CONFIG.interactionDistance);
    const nearNpc = !nearest ? state.world.npcs.find(n => !['home', 'working'].includes(n.state) && distance(pos, n) < 65) : undefined;
    if (allowed && (Phaser.Input.Keyboard.JustDown(this.keys.E) || controls.interact)) {
      controls.interact = false;
      if (nearest) {
        if (nearest.kind === 'fashion' || nearest.id === 'fashion') state.setPanel('fashion');
        else if (nearest.kind === 'cafe' || nearest.kind === 'office') state.setPanel('npc', nearest.id);
        else state.setPanel(nearest.kind, nearest.id);
      } else if (nearNpc) {
        if (nearNpc.id === 'npc-fashion') state.setPanel('fashion');
        else state.setPanel('npc', nearNpc.id);
      }
    } else controls.interact = false;
    if (time - this.lastHud > 250) { useGameStore.setState({ position: pos, nearby: nearest?.name ?? nearNpc?.name ?? '', fps: Math.round(this.game.loop.actualFps) }); this.lastHud = time; }
    this.lighting.update(state.world, time, dt);
  }
}
