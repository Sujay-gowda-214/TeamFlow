import React, { useEffect, useState } from 'react';
import { MdNotifications, MdCheckCircle, MdDelete } from 'react-icons/md';
import { notificationsAPI } from '../api';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const TYPE_ICONS = {
  task_assigned: '📋', task_updated: '✏️', task_completed: '✅',
  comment_added: '💬', project_updated: '📁', team_added: '👥',
  deadline_reminder: '⏰', general: '🔔',
};

export default function Notifications() {
  const [data, setData] = useState({ notifications: [], unread_count: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    notificationsAPI.list()
      .then(({ data }) => setData(data))
      .catch(() => toast.error('Could not load notifications. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  const markRead = async (id) => {
    try {
      await notificationsAPI.markRead(id);
      setData((prev) => ({
        ...prev,
        notifications: prev.notifications.map((n) => n.id === id ? { ...n, is_read: true } : n),
        unread_count: Math.max(0, prev.unread_count - 1),
      }));
    } catch {
      toast.error('Could not mark this notification as read.');
    }
  };

  const markAllRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      setData((prev) => ({
        ...prev,
        notifications: prev.notifications.map((n) => ({ ...n, is_read: true })),
        unread_count: 0,
      }));
      toast.success('All marked as read');
    } catch {
      toast.error('Could not update notifications.');
    }
  };

  const deleteNotification = async (id) => {
    try {
      await notificationsAPI.delete(id);
      setData((prev) => ({
        ...prev,
        notifications: prev.notifications.filter((n) => n.id !== id),
      }));
    } catch {
      toast.error('Could not delete this notification.');
    }
  };

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Notifications</h2>
          <p className="page-subtitle">{data.unread_count} unread</p>
        </div>
        {data.unread_count > 0 && (
          <button className="btn btn-secondary" onClick={markAllRead}><MdCheckCircle /> Mark All Read</button>
        )}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {data.notifications.length === 0
          ? <div className="empty-state" style={{ padding: 60 }}><div className="empty-state-icon"><MdNotifications /></div><p>All caught up! No notifications.</p></div>
          : data.notifications.map((n) => (
            <div key={n.id} className={`notification-item ${!n.is_read ? 'unread' : ''}`} onClick={() => !n.is_read && markRead(n.id)}>
              <div style={{ fontSize: 20, flexShrink: 0 }}>{TYPE_ICONS[n.notification_type] || '🔔'}</div>
              {!n.is_read && <div className="notification-dot" />}
              <div className="notification-content">
                <div className="notification-title">{n.title}</div>
                <div className="notification-msg">{n.message}</div>
                <div className="notification-time">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</div>
              </div>
              <button className="btn btn-sm btn-icon" title="Delete" onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                style={{ color: 'var(--text-muted)', background: 'none' }}>
                <MdDelete size={18} />
              </button>
            </div>
          ))
        }
      </div>
    </div>
  );
}
