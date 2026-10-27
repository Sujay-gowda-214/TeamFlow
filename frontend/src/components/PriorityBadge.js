import React from 'react';

const labels = { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' };

export default function PriorityBadge({ priority }) {
  return <span className={`badge badge-${priority}`}>{labels[priority] || priority}</span>;
}
