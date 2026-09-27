import Phaser from 'phaser';
import type { WorldState } from '../../../shared/types';
export class LightingManager {
  private shade: Phaser.GameObjects.Rectangle;
  private lamps: Phaser.GameObjects.Graphics;
  private rain: Phaser.GameObjects.Graphics;
  private alpha = 0;
  constructor(private scene: Phaser.Scene) {
    this.shade = scene.add.rectangle(0, 0, 1, 1, 0x172847).setOrigin(0).setScrollFactor(0).setDepth(10000).setAlpha(0);
    this.lamps = scene.add.graphics().setDepth(10001);
    this.rain = scene.add.graphics().setDepth(10002).setScrollFactor(0);
  }
  update(world: WorldState, time: number, dt: number) {
    const hour = world.minutes % 1440 / 60;
    const night = hour < 5 ? 0.48 : hour < 8 ? (8 - hour) / 3 * 0.48 : hour < 17.5 ? 0 : hour < 20 ? (hour - 17.5) / 2.5 * 0.48 : 0.48;
    const target = night + (world.weather === 'rain' ? 0.12 : world.weather === 'cloudy' ? 0.045 : 0);
    this.alpha += (target - this.alpha) * Math.min(1, dt * 1.5);
    this.shade.setSize(this.scene.scale.width, this.scene.scale.height).setAlpha(this.alpha);
    this.lamps.clear();
    for (const x of [150, 480, 670, 1040, 1260, 1580, 1830]) {
      this.lamps.fillStyle(0x567362).fillRoundedRect(x, 534, 5, 40, 2);
      this.lamps.fillStyle(0xffecc1).fillRoundedRect(x - 5, 526, 15, 14, 3);
      if (night > 0.02) for (let i = 4; i > 0; i--) this.lamps.fillStyle(0xffdc80, night * 0.06).fillCircle(x + 2, 533, i * 13);
    }
    this.rain.clear();
    if (world.weather === 'rain') {
      const w = this.scene.scale.width, h = this.scene.scale.height;
      this.rain.lineStyle(1.5, 0xd9e9ee, 0.48);
      for (let i = 0; i < 100; i++) { const x = (i * 79 + time * 0.07) % w, y = (i * 113 + time * 0.45) % h; this.rain.lineBetween(x, y, x - 5, y + 15); }
    }
  }
}
