import Phaser from 'phaser';
import { BUILDINGS, PARK, WORLD } from '../../../shared/world';

function label(scene: Phaser.Scene, x: number, y: number, text: string, size = 12, color = '#476556') {
  return scene.add.text(x, y, text, { fontFamily: 'Arial, sans-serif', fontSize: size, color, fontStyle: 'bold', align: 'center' }).setOrigin(0.5).setDepth(y + 10);
}
export function drawTown(scene: Phaser.Scene) {
  const g = scene.add.graphics().setDepth(-100);
  g.fillStyle(0xbcd7a4).fillRect(0, 0, WORLD.width, WORLD.height);
  // Repeatable lawn speckles, with no external assets.
  for (let i = 0; i < 1800; i++) {
    const x = (i * 127.7) % WORLD.width, y = (i * 83.9) % WORLD.height;
    g.fillStyle(i % 3 ? 0xaacb95 : 0xd4e5b7, 0.55).fillRoundedRect(x, y, 3, 6, 2);
  }
  g.fillStyle(0xe9dfca).fillRoundedRect(50, 500, 1830, 225, 25).fillRoundedRect(495, 105, 145, 1190, 20).fillRoundedRect(1080, 105, 135, 1190, 20).fillRoundedRect(90, 1010, 1770, 130, 20);
  g.fillStyle(0x9eada5).fillRect(0, 586, WORLD.width, 96).fillRect(539, 0, 64, WORLD.height).fillRect(1120, 0, 64, WORLD.height);
  g.lineStyle(2, 0xc3cdc2);
  for (let x = 15; x < WORLD.width; x += 45) g.lineBetween(x, 634, x + 22, 634);
  for (let y = 20; y < WORLD.height; y += 46) { g.lineBetween(571, y, 571, y + 22); g.lineBetween(1152, y, 1152, y + 22); }
  g.fillStyle(0xf7f1dd);
  for (const cx of [500, 1090, 1560]) for (let i = 0; i < 7; i++) g.fillRoundedRect(cx, 591 + i * 13, 39, 7, 2);
  for (let x = 70; x < 1880; x += 42) {
    g.lineStyle(1, 0xd3ccb8, 0.55)
      .lineBetween(x, 505, x, 580)
      .lineBetween(x, 688, x, 722)
      .lineBetween(x, 1015, x, 1135);
  }
  // Park, pond, fountain and walking paths.
  g.fillStyle(0x739958, 0.15).fillRoundedRect(PARK.x + 5, PARK.y + 7, PARK.w, PARK.h, 35);
  g.fillStyle(0xa8c88b).fillRoundedRect(PARK.x, PARK.y, PARK.w, PARK.h, 35);
  g.fillStyle(0xebdabb).fillRoundedRect(793, 800, 43, 245, 15).fillRoundedRect(680, 931, 363, 34, 12);
  g.fillStyle(0xe7e0c8).fillRoundedRect(867, 807, 168, 116, 37);
  g.fillStyle(0x8dc8c7).fillRoundedRect(876, 815, 151, 99, 33);
  g.lineStyle(3, 0xc0e4df).strokeEllipse(949, 861, 105, 53);
  g.fillStyle(0xe8e7ce).fillCircle(949, 861, 14);
  g.fillStyle(0xb8e6e0).fillEllipse(949, 850, 22, 12);
  label(scene, 808, 991, 'CÔNG VIÊN MẦM', 12);
  // Building silhouettes stay in depth order, while characters use their feet position.
  for (const b of BUILDINGS) {
    const bg = scene.add.graphics().setDepth(b.y + b.h);
    bg.fillStyle(0x3e6755, 0.13).fillRoundedRect(b.x + 10, b.y + 18, b.w + 5, b.h, 15);
    bg.fillStyle(b.color).fillRoundedRect(b.x, b.y + 22, b.w, b.h - 22, 12);
    bg.fillStyle(0xffffff, 0.25).fillRect(b.x + 7, b.y + 37, b.w - 14, 14);
    bg.fillStyle(b.roof).fillRoundedRect(b.x - 9, b.y, b.w + 18, 68, 12);
    bg.fillStyle(0x000000, 0.09).fillRect(b.x - 6, b.y + 53, b.w + 12, 14);
    bg.lineStyle(2, 0xffffff, 0.16);
    for (let x = b.x + 8; x < b.x + b.w; x += 24) bg.lineBetween(x, b.y + 9, x, b.y + 50);
    for (const x of [b.x + 22, b.x + b.w - 70]) {
      bg.fillStyle(0xfff6dc).fillRoundedRect(x - 4, b.y + 89, 56, 56, 5);
      bg.fillStyle(0x7daca9).fillRoundedRect(x, b.y + 93, 48, 48, 3);
      bg.fillStyle(0xc1e0d1, 0.7).fillTriangle(x + 3, b.y + 95, x + 44, b.y + 95, x + 3, b.y + 132);
      bg.lineStyle(3, 0xf9ebcc).lineBetween(x + 24, b.y + 93, x + 24, b.y + 141).lineBetween(x, b.y + 117, x + 48, b.y + 117);
      bg.fillStyle(0xc89978).fillRoundedRect(x - 4, b.y + 143, 56, 8, 2);
    }
    const dx = b.door.x;
    bg.fillStyle(0x699189).fillRoundedRect(dx - 23, b.y + b.h - 75, 46, 75, { tl: 20, tr: 20, bl: 0, br: 0 });
    bg.fillStyle(0xd4e9d8).fillRoundedRect(dx - 17, b.y + b.h - 64, 34, 39, 10);
    bg.fillStyle(0xf8e1a4).fillCircle(dx + 13, b.y + b.h - 16, 3);
    bg.fillStyle(0xe4cfaf).fillRoundedRect(dx - 37, b.y + b.h - 1, 74, 12, 3);
    if (['market', 'cafe', 'property'].includes(b.kind)) {
      for (let i = 0; i < 8; i++) {
        bg.fillStyle(i % 2 ? 0xfff2d6 : b.roof).fillRect(b.x + 14 + i * (b.w - 28) / 8, b.y + 67, (b.w - 28) / 8, 22);
        bg.fillCircle(b.x + 14 + (i + 0.5) * (b.w - 28) / 8, b.y + 89, (b.w - 28) / 17);
      }
    }
    const signW = b.name.length > 14 ? 200 : 170;
    bg.fillStyle(0xfff9e9).fillRoundedRect(dx - signW / 2, b.y + 26, signW, 26, 5);
    label(scene, dx, b.y + 39, b.name, b.name.length > 14 ? 10.5 : b.w < 240 ? 10 : 12).setDepth(b.y + b.h + 1);
    if (b.kind === 'property') {
      bg.fillStyle(0xfff2cc).fillRoundedRect(b.x + 10, b.y + b.h - 43, 78, 32, 4);
      label(scene, b.x + 49, b.y + b.h - 27, 'FOR RENT', 10, '#a16e4e').setDepth(b.y + b.h + 1);
    }
    if (b.kind === 'market') for (let i = 0; i < 3; i++) {
      bg.fillStyle(0xc3976e).fillRoundedRect(b.x + 35 + i * 72, b.y + b.h + 12, 48, 26, 3);
      for (let j = 0; j < 6; j++) bg.fillStyle([0xdf987a, 0xd6bc66, 0x8eb575][i]).fillCircle(b.x + 43 + i * 72 + j % 3 * 15, b.y + b.h + 18 + Math.floor(j / 3) * 11, 6);
    }
  }
  const treePositions = [[95, 270], [470, 335], [117, 840], [464, 925], [680, 837], [708, 896], [1038, 780], [1060, 996], [1240, 265], [1580, 320], [1585, 902], [1840, 180], [146, 1200], [375, 1210], [765, 1180], [1005, 1205], [1450, 1190], [1760, 1190], [260, 150], [845, 152], [1420, 110]];
  for (let i = 0; i < treePositions.length; i++) {
    const [x, y] = treePositions[i], t = scene.add.graphics().setDepth(y);
    t.fillStyle(0x527d53, 0.16).fillEllipse(x + 8, y + 5, 68, 27);
    t.fillStyle(0x967857).fillRoundedRect(x - 6, y - 43, 12, 48, 3);
    t.fillStyle(i % 5 === 0 ? 0xdbb1ab : 0x7eaa72).fillCircle(x, y - 58, 35).fillCircle(x - 20, y - 42, 26).fillCircle(x + 20, y - 44, 27);
    t.fillStyle(i % 5 === 0 ? 0xf0c7bf : 0x9ac084).fillCircle(x - 8, y - 68, 24).fillCircle(x + 19, y - 51, 20);
    t.fillStyle(0xffffff, 0.12).fillEllipse(x - 13, y - 76, 17, 9);
  }
  for (const [x, y] of [[735, 913], [1000, 985], [120, 555], [1240, 711], [1700, 710], [480, 1085], [1340, 1085], [1680, 1085]]) {
    const bench = scene.add.graphics().setDepth(y);
    bench.fillStyle(0x4e7262).fillRect(x - 21, y - 9, 5, 21).fillRect(x + 17, y - 9, 5, 21);
    bench.fillStyle(0xba936f).fillRoundedRect(x - 30, y - 21, 60, 8, 3).fillRoundedRect(x - 30, y - 10, 60, 9, 3);
  }
  for (let i = 0; i < 90; i++) {
    const x = 120 + i * 97 % 1700, y = i % 2 ? 1170 + i * 13 % 130 : 120 + i * 7 % 80;
    g.fillStyle([0xf8e7a2, 0xeab0a0, 0xffffff][i % 3]).fillCircle(x, y, 3);
  }

  label(scene, 925, 695, 'MẦM XANH  /  DOWNTOWN', 13, '#748477').setDepth(-1);
}

export function makeAvatar(scene: Phaser.Scene, index: number) {
  const key = `avatar-${index}`; if (scene.textures.exists(key)) return key;
  const g = scene.make.graphics({ x: 0, y: 0 });
  const skins = [0xf4c6a2, 0xe9b18a, 0xc68c68, 0x995d40];
  const shirts = [0xe99773, 0x87b5a9, 0xb3a1ca, 0xe1bc63, 0x91b3cf, 0xd590a3];
  const hair = [0x5e493e, 0x916246, 0x393e43, 0xc79b5f];
  g.fillStyle(0x325843, 0.16).fillEllipse(24, 56, 30, 9);
  g.fillStyle(0x5b6974).fillRoundedRect(15, 42, 7, 13, 3).fillRoundedRect(26, 42, 7, 13, 3);
  g.fillStyle(0xfaf0d9).fillRoundedRect(13, 52, 10, 5, 2).fillRoundedRect(26, 52, 10, 5, 2);
  g.fillStyle(shirts[index % shirts.length]).fillRoundedRect(11, 29, 26, 19, 8);
  g.fillStyle(skins[index % 4]).fillCircle(10, 37, 4).fillCircle(38, 37, 4).fillCircle(24, 21, 16);
  g.fillStyle(hair[index % 4]).fillEllipse(24, 12, 33, 20).fillCircle(10, 20, 4);
  g.fillStyle(skins[index % 4]).fillEllipse(25, 23, 26, 21);
  g.fillStyle(hair[index % 4]).fillEllipse(19, 12, 22, 11);
  if (index % 3 === 0) g.fillStyle(shirts[(index + 2) % 6]).fillRoundedRect(6, 6, 35, 7, 3).fillRoundedRect(12, 0, 24, 11, 5);
  g.fillStyle(0x3d393b).fillCircle(19, 23, 1.7).fillCircle(30, 23, 1.7);
  g.fillStyle(0xe69b89, 0.6).fillEllipse(15, 27, 6, 3).fillEllipse(34, 27, 6, 3);
  g.lineStyle(1.3, 0x925e50).lineBetween(23, 29, 26, 29);
  g.generateTexture(key, 48, 64); g.destroy(); return key;
}
