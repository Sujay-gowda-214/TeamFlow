import React from 'react';

const labels = {
  todo: 'To Do', in_progress: 'In Progress', review: 'In Review', done: 'Done',
  planning: 'Planning', active: 'Active', on_hold: 'On Hold', completed: 'Completed', cancelled: 'Cancelled',
};

export default function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{labels[status] || status}</span>;
}
