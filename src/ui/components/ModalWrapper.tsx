import React, { useEffect } from 'react';

interface Props {
  title: string;
  badge?: string;
  icon?: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: string;
}

export function ModalWrapper({ title, badge, icon, onClose, children, width = '560px' }: Props) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-card"
        style={{ maxWidth: width }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-title-wrap">
            {icon && <span className="modal-icon">{icon}</span>}
            <div>
              <h2 className="modal-title">{title}</h2>
              {badge && <span className="modal-badge">{badge}</span>}
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Đóng (ESC)">
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
