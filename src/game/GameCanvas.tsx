import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { TownScene } from './scenes/TownScene';
export function GameCanvas() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!root.current) return;
    const game = new Phaser.Game({ type: Phaser.AUTO, parent: root.current, backgroundColor: '#bcd7a4', antialias: true, scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' }, scene: [TownScene], input: { activePointers: 3 }, render: { roundPixels: true }, banner: false });
    return () => game.destroy(true);
  }, []);
  return <div className="game-canvas" ref={root} aria-label="Thị trấn Mầm Xanh — dùng WASD hoặc phím mũi tên để di chuyển" />;
}
