import React, { useEffect, useState } from 'react';
import { useGameStore } from '../../stores/gameStore';

export function Toast() {
  const toast = useGameStore(s => s.toast);
  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState<{ text: string; error: boolean; id: number } | null>(null);

  useEffect(() => {
    if (!toast) return;
    setCurrent(toast);
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
    }, 3800);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!current || !visible) return null;

  return (
    <div className={`toast-banner ${current.error ? 'toast-error' : 'toast-success'}`}>
      <span className="toast-icon">{current.error ? '⚠️' : '✨'}</span>
      <span className="toast-text">{current.text}</span>
      <button className="toast-close" onClick={() => setVisible(false)}>✕</button>
    </div>
  );
}
