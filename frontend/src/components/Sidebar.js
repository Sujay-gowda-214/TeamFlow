import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { MdDashboard, MdFolder, MdTask, MdGroup, MdNotifications, MdPerson, MdLogout } from 'react-icons/md';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = user
    ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || user.username[0].toUpperCase()
    : '?';

  const avatarColor = user?.profile?.avatar_color || '#4F46E5';

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">T</div>
        <span className="sidebar-brand-name">TeamFlow</span>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Main</div>
        <NavLink to="/dashboard" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <MdDashboard /> Dashboard
        </NavLink>
        <NavLink to="/projects" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <MdFolder /> Projects
        </NavLink>
        <NavLink to="/tasks" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <MdTask /> My Tasks
        </NavLink>
        <NavLink to="/teams" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <MdGroup /> Teams
        </NavLink>

        <div className="sidebar-section-label" style={{ marginTop: 8 }}>Account</div>
        <NavLink to="/notifications" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <MdNotifications /> Notifications
        </NavLink>
        <NavLink to="/profile" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <MdPerson /> Profile
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user" onClick={handleLogout} title="Logout">
          <div className="avatar avatar-sm" style={{ background: avatarColor }}>{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.first_name} {user?.last_name}</div>
            <div className="sidebar-user-role">{user?.profile?.role}</div>
          </div>
          <MdLogout size={16} style={{ color: 'rgba(255,255,255,.4)', flexShrink: 0 }} />
        </div>
      </div>
    </aside>
  );
}
