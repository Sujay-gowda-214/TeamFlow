import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MdNotifications } from 'react-icons/md';
import { notificationsAPI } from '../api';

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/projects': 'Projects',
  '/tasks': 'My Tasks',
  '/teams': 'Teams',
  '/notifications': 'Notifications',
  '/profile': 'Profile',
};

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const intervalRef = useRef(null);

  const title = Object.entries(PAGE_TITLES).find(([path]) => location.pathname.startsWith(path))?.[1] || 'TeamFlow';

  useEffect(() => {
    fetchUnread();
    intervalRef.current = setInterval(fetchUnread, 30000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const fetchUnread = async () => {
    try {
      const { data } = await notificationsAPI.list();
      setUnreadCount(data.unread_count || 0);
    } catch {}
  };

  return (
    <header className="navbar">
      <h1 className="navbar-title">{title}</h1>
      <div className="navbar-actions">
        <button className="notification-btn" onClick={() => navigate('/notifications')} title="Notifications">
          <MdNotifications size={22} />
          {unreadCount > 0 && (
            <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
          )}
        </button>
      </div>
    </header>
  );
}
