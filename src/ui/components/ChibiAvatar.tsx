import React from 'react';

const skins = ['#f4c6a2', '#e9b18a', '#c68c68', '#995d40'];
const shirts = ['#e99773', '#87b5a9', '#b3a1ca', '#e1bc63', '#91b3cf', '#d590a3'];
const hairs = ['#5e493e', '#916246', '#393e43', '#c79b5f'];

export function ChibiAvatar({ index, size = 48, className = '' }: { index: number; size?: number; className?: string }) {
  const skin = skins[index % 4];
  const shirt = shirts[index % shirts.length];
  const hair = hairs[index % 4];
  const hat = index % 3 === 0 ? shirts[(index + 2) % 6] : null;

  return (
    <svg width={size} height={(size * 64) / 48} viewBox="0 0 48 64" className={className} style={{ display: 'block', flexShrink: 0 }}>
      <ellipse cx="24" cy="58" rx="14" ry="4" fill="rgba(40, 70, 50, 0.2)" />
      <rect x="15" y="42" width="7" height="13" rx="3" fill="#5b6974" />
      <rect x="26" y="42" width="7" height="13" rx="3" fill="#5b6974" />
      <rect x="13" y="52" width="10" height="5" rx="2" fill="#faf0d9" />
      <rect x="26" y="52" width="10" height="5" rx="2" fill="#faf0d9" />
      <rect x="11" y="29" width="26" height="19" rx="7" fill={shirt} />
      <circle cx="10" cy="37" r="4" fill={skin} />
      <circle cx="38" cy="37" r="4" fill={skin} />
      <ellipse cx="24" cy="18" rx="16.5" ry="12" fill={hair} />
      <ellipse cx="24" cy="22" rx="13" ry="11" fill={skin} />
      <ellipse cx="21" cy="13" rx="12" ry="6" fill={hair} />
      <circle cx="11" cy="20" r="3.5" fill={hair} />
      {hat && (
        <>
          <rect x="6" y="6" width="36" height="7" rx="3" fill={hat} />
          <rect x="12" y="1" width="24" height="10" rx="5" fill={hat} />
        </>
      )}
      <circle cx="19" cy="22" r="1.8" fill="#2d282a" />
      <circle cx="29" cy="22" r="1.8" fill="#2d282a" />
      <circle cx="18.5" cy="21.5" r="0.6" fill="#ffffff" />
      <circle cx="28.5" cy="21.5" r="0.6" fill="#ffffff" />
      <ellipse cx="15" cy="26" rx="3" ry="1.5" fill="#e69b89" opacity="0.7" />
      <ellipse cx="33" cy="26" rx="3" ry="1.5" fill="#e69b89" opacity="0.7" />
      <path d="M 22 28 Q 24 30 26 28" stroke="#925e50" strokeWidth="1.2" fill="none" strokeLinecap="round" />
    </svg>
  );
}
