import Phaser from 'phaser';
import { BUILDINGS } from '../../../shared/world';
import type { WorldState } from '../../../shared/types';

interface Firefly {
  x: number;
  y: number;
  phase: number;
  speed: number;
  radius: number;
}

export class LightingManager {
  private shade: Phaser.GameObjects.Rectangle;
  private lamps: Phaser.GameObjects.Graphics;
  private rain: Phaser.GameObjects.Graphics;
  private alpha = 0;
  private fireflies: Firefly[] = [];

  constructor(private scene: Phaser.Scene) {
    // Midnight twilight blue tint (deep atmospheric contrast)
    this.shade = scene.add
      .rectangle(0, 0, 1, 1, 0x081326)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(10000)
      .setAlpha(0);

    // Glowing elements drawn ABOVE the dark shade to pop out vividly
    this.lamps = scene.add.graphics().setDepth(10001);
    this.rain = scene.add.graphics().setDepth(10002).setScrollFactor(0);

    // Initialize 16 glowing fireflies floating in and around the park
    for (let i = 0; i < 16; i++) {
      this.fireflies.push({
        x: 690 + (i * 29) % 360,
        y: 810 + (i * 19) % 190,
        phase: i * 0.65,
        speed: 0.0016 + (i % 4) * 0.0007,
        radius: 10 + (i % 5) * 6,
      });
    }
  }

  update(world: WorldState, time: number, dt: number) {
    const hour = (world.minutes % 1440) / 60;

    // Smooth day/dusk/night cycle curve
    let night = 0;
    if (hour < 5) {
      night = 0.58;
    } else if (hour < 8) {
      night = ((8 - hour) / 3) * 0.58;
    } else if (hour < 17.5) {
      night = 0;
    } else if (hour < 20.5) {
      night = ((hour - 17.5) / 3) * 0.58;
    } else {
      night = 0.58;
    }

    const weatherBonus = world.weather === 'rain' ? 0.08 : world.weather === 'cloudy' ? 0.03 : 0;
    const target = night + weatherBonus;
    this.alpha += (target - this.alpha) * Math.min(1, dt * 2);
    this.shade.setSize(this.scene.scale.width, this.scene.scale.height).setAlpha(this.alpha);

    this.lamps.clear();

    // =========================================================================
    // 1. BUILDING WINDOWS & DOORS ILLUMINATION AT NIGHT
    // =========================================================================
    if (night > 0.04) {
      const windowAlpha = Math.min(0.96, night * 1.8);
      const glowAlpha = night * 0.22;
      const spillAlpha = night * 0.32;

      for (const b of BUILDINGS) {
        // A. Windows Glowing warmly with honey-gold light
        const windowXPositions = [b.x + 22, b.x + b.w - 70];
        for (const wx of windowXPositions) {
          const wy = b.y + 89;

          // Window outer soft aura
          this.lamps.fillStyle(0xffd54f, glowAlpha * 0.8).fillCircle(wx + 24, wy + 28, 48);

          // Glowing glass pane
          this.lamps.fillStyle(0xffea85, windowAlpha).fillRoundedRect(wx, wy + 4, 48, 48, 4);

          // Interior warm light core
          this.lamps.fillStyle(0xfff9c4, windowAlpha * 0.65).fillRoundedRect(wx + 4, wy + 8, 40, 40, 3);

          // Dark window mullion cross (giving depth to curtains & frames)
          this.lamps
            .lineStyle(2.5, 0x5d3a24, windowAlpha * 0.85)
            .lineBetween(wx + 24, wy + 4, wx + 24, wy + 52)
            .lineBetween(wx, wy + 28, wx + 48, wy + 28);
        }

        // B. Door Light Spill onto the entrance steps
        const dx = b.door.x;
        const dy = b.y + b.h;

        // Door glass pane glowing
        this.lamps
          .fillStyle(0xffea85, windowAlpha * 0.9)
          .fillRoundedRect(dx - 17, dy - 64, 34, 39, 10);

        // Warm light spill pool in front of the door onto sidewalk
        this.lamps.fillStyle(0xffd54f, spillAlpha * 0.45).fillEllipse(dx, dy + 10, 62, 24);
        this.lamps.fillStyle(0xfff8e1, spillAlpha * 0.75).fillEllipse(dx, dy + 7, 36, 14);

        // C. Store Signboard Backlit Glow
        const signW = b.name.length > 14 ? 200 : 170;
        this.lamps
          .fillStyle(0xfff8e1, night * 0.35)
          .fillRoundedRect(dx - signW / 2 - 2, b.y + 24, signW + 4, 30, 6);
      }
    }

    // =========================================================================
    // 2. STREET LAMPS WITH CONICAL BEAMS & PAVEMENT LIGHT POOLS
    // =========================================================================
    const streetLamps = [
      // Tuyến đường trên (vỉa hè ngang phía trên)
      { x: 150, y: 534 }, { x: 480, y: 534 }, { x: 670, y: 534 }, { x: 1040, y: 534 },
      { x: 1260, y: 534 }, { x: 1580, y: 534 }, { x: 1830, y: 534 },

      // Tuyến đường giữa (vỉa hè phía dưới lòng đường xe chạy)
      { x: 150, y: 692 }, { x: 480, y: 692 }, { x: 670, y: 692 }, { x: 1040, y: 692 },
      { x: 1260, y: 692 }, { x: 1580, y: 692 }, { x: 1830, y: 692 },

      // Tuyến phố đi bộ dọc (hai trục kết nối Bắc - Nam)
      { x: 505, y: 840 }, { x: 1105, y: 840 },

      // Công viên Mầm (lối dạo quanh hồ nước và ghế nghỉ)
      { x: 765, y: 840 }, { x: 765, y: 955 },

      // Tuyến đường đi bộ dưới cùng (dọc trước Mặt Bằng 01, Công Viên, Mặt Bằng 02, Nhà Của Nắng)
      { x: 130, y: 1040 }, { x: 470, y: 1040 }, { x: 670, y: 1040 }, { x: 1040, y: 1040 },
      { x: 1260, y: 1040 }, { x: 1560, y: 1040 }, { x: 1830, y: 1040 },
    ];

    for (const lamp of streetLamps) {
      const { x, y } = lamp;

      // When dark: Cast authentic street light pools & volumetric beams
      if (night > 0.02) {
        // Volumetric conical light beam from lantern down to sidewalk
        this.lamps
          .fillStyle(0xffe082, night * 0.075)
          .fillTriangle(x + 2, y + 2, x - 26, y + 42, x + 30, y + 42);

        // Ground Light Pool (vệt sáng elip rọi trên vỉa hè)
        // Outer soft ambient halo
        this.lamps.fillStyle(0xffd54f, night * 0.14).fillEllipse(x + 2, y + 42, 68, 28);
        // Mid-intensity pool
        this.lamps.fillStyle(0xffe082, night * 0.24).fillEllipse(x + 2, y + 42, 44, 18);
        // Bright ground core
        this.lamps.fillStyle(0xfffbeb, night * 0.38).fillEllipse(x + 2, y + 42, 22, 9);
      }

      // Lamp Physical Architecture
      // Base grounding shadow
      this.lamps.fillStyle(0x3e5548, 0.25).fillEllipse(x + 2, y + 40, 10, 4);
      // Dark green iron pole
      this.lamps.fillStyle(0x567362).fillRoundedRect(x, y, 5, 40, 2);
      // Lantern metal hood cap
      this.lamps.fillStyle(0x405b4c).fillRoundedRect(x - 6, y - 10, 17, 3, 1);
      // Lantern glass housing (bright glowing cream-gold)
      const lanternAlpha = Math.max(0.85, night * 1.5);
      this.lamps.fillStyle(0xfffae6, lanternAlpha).fillRoundedRect(x - 5, y - 8, 15, 14, 3);

      // Radial glowing lantern halos
      if (night > 0.02) {
        this.lamps.fillStyle(0xffdc80, night * 0.38).fillCircle(x + 2, y - 1, 15);
        this.lamps.fillStyle(0xffe082, night * 0.16).fillCircle(x + 2, y - 1, 28);
        this.lamps.fillStyle(0xffe082, night * 0.07).fillCircle(x + 2, y - 1, 46);
      }
    }

    // =========================================================================
    // 3. MAGICAL FIREFLIES IN PARK & GRASS AREAS
    // =========================================================================
    if (night > 0.05) {
      for (const f of this.fireflies) {
        const fx = f.x + Math.sin(time * f.speed + f.phase) * f.radius;
        const fy = f.y + Math.cos(time * f.speed * 1.3 + f.phase) * f.radius;
        const pulse = Math.max(0, Math.sin(time * 0.0035 + f.phase * 2));

        if (pulse > 0.12) {
          const glowAlpha = night * pulse;
          this.lamps.fillStyle(0xbbf7d0, glowAlpha * 0.4).fillCircle(fx, fy, 5);
          this.lamps.fillStyle(0xfef08a, glowAlpha * 0.8).fillCircle(fx, fy, 2.5);
          this.lamps.fillStyle(0xffffff, glowAlpha).fillCircle(fx, fy, 1.2);
        }
      }

      // Pond water shimmer reflections (reflection of night sky and lights)
      for (let i = 0; i < 4; i++) {
        const shimmerY = 835 + i * 20;
        const shimmerX = 910 + Math.sin(time * 0.002 + i) * 22;
        const shimmerW = 38 + Math.cos(time * 0.003 + i) * 14;
        this.lamps.fillStyle(0xa5f3fc, night * 0.22).fillRoundedRect(shimmerX, shimmerY, shimmerW, 2.5, 1);
      }
    }

    // =========================================================================
    // 4. RAIN SYSTEM
    // =========================================================================
    this.rain.clear();
    if (world.weather === 'rain') {
      const w = this.scene.scale.width,
        h = this.scene.scale.height;
      this.rain.lineStyle(1.5, 0xd9e9ee, 0.48);
      for (let i = 0; i < 100; i++) {
        const x = (i * 79 + time * 0.07) % w,
          y = (i * 113 + time * 0.45) % h;
        this.rain.lineBetween(x, y, x - 5, y + 15);
      }
    }
  }
}
