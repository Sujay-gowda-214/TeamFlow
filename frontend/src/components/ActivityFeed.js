import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { MdAddTask, MdEdit, MdComment, MdFolder, MdCheck } from 'react-icons/md';

const ICONS = {
  created: MdAddTask,
  updated: MdEdit,
  commented: MdComment,
  completed: MdCheck,
};

export default function ActivityFeed({ activities }) {
  if (!activities?.length) return <div className="empty-state"><p>No activity yet.</p></div>;

  return (
    <div className="activity-feed">
      {activities.map((a) => {
        const Icon = ICONS[a.action] || MdFolder;
        return (
          <div key={a.id} className="activity-item">
            <div className="activity-icon"><Icon size={16} /></div>
            <div className="activity-content">
              <div className="activity-desc">
                <strong>{a.user?.full_name || a.user?.username}</strong> {a.description}
              </div>
              <div className="activity-time">
                {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
