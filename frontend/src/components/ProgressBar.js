import React from 'react';

export default function ProgressBar({ value, showLabel = true }) {
  const pct = Math.min(100, Math.max(0, value || 0));
  const color = pct === 100 ? '#10B981' : pct >= 60 ? '#4F46E5' : pct >= 30 ? '#F59E0B' : '#EF4444';
  return (
    <div>
      <div className="progress-bar-wrap">
        <div className="progress-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      {showLabel && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4, fontSize: 11, color: 'var(--text-muted)' }}>
          {pct}%
        </div>
      )}
    </div>
  );
}
