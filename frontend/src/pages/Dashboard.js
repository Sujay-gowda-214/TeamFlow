import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { MdFolder, MdTask, MdCheckCircle, MdWarning, MdTrendingUp, MdGroup } from 'react-icons/md';
import { projectsAPI, tasksAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import ProgressBar from '../components/ProgressBar';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';
import ActivityFeed from '../components/ActivityFeed';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const PIE_COLORS = ['#6B7280', '#3B82F6', '#8B5CF6', '#10B981'];

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      projectsAPI.dashboardStats(),
      tasksAPI.activityLog(),
      tasksAPI.list({ my_tasks: 'true' }),
    ]).then(([{ data: s }, { data: a }, { data: t }]) => {
      setStats(s);
      setActivities(a);
      setMyTasks(t.slice(0, 5));
    }).catch(() => {
      toast.error('Could not load your dashboard. Please try again.');
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  const taskStatusData = stats ? [
    { name: 'To Do', value: stats.tasks_todo },
    { name: 'In Progress', value: stats.tasks_in_progress },
    { name: 'Done', value: stats.tasks_done },
  ] : [];

  const projectBarData = stats?.recent_projects?.map((p) => ({
    name: p.name.length > 18 ? p.name.slice(0, 18) + '…' : p.name,
    progress: p.progress,
  })) || [];

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Suprabhat';
    if (h < 17) return 'Namaskar';
    return 'Shubh Sham';
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>{greeting()}, {user?.first_name || user?.username}! 🙏</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>Here's what's happening in your workspace today.</p>
      </div>

      <div className="stats-grid">
        {[
          { label: 'Total Projects', value: stats?.total_projects, icon: <MdFolder />, bg: '#EEF2FF', color: '#4F46E5' },
          { label: 'Active Projects', value: stats?.active_projects, icon: <MdTrendingUp />, bg: '#F0FDF4', color: '#16A34A' },
          { label: 'My Tasks', value: stats?.my_tasks, icon: <MdTask />, bg: '#EFF6FF', color: '#2563EB' },
          { label: 'Tasks Done', value: stats?.tasks_done, icon: <MdCheckCircle />, bg: '#F0FDF4', color: '#16A34A' },
          { label: 'Overdue', value: stats?.overdue_tasks, icon: <MdWarning />, bg: '#FFF1F2', color: '#E11D48' },
          { label: 'Completed Projects', value: stats?.completed_projects, icon: <MdGroup />, bg: '#FAF5FF', color: '#7C3AED' },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <div className="stat-icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
            <div>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value" style={{ color: s.color }}>{s.value ?? '—'}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="card">
          <div className="card-header"><span className="card-title">Project Progress</span></div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={projectBarData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [`${v}%`, 'Progress']} />
              <Bar dataKey="progress" fill="#4F46E5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">My Task Status</span></div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={taskStatusData} dataKey="value" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => value > 0 ? `${name}: ${value}` : ''}>
                {taskStatusData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">My Recent Tasks</span>
            <button className="btn btn-sm btn-secondary" onClick={() => navigate('/tasks')}>View All</button>
          </div>
          {myTasks.length === 0
            ? <div className="empty-state"><p>No tasks assigned to you.</p></div>
            : myTasks.map((task) => (
              <div key={task.id} className="task-card" onClick={() => navigate(`/tasks/${task.id}`)}>
                <div className="task-card-title">{task.title}</div>
                <div className="task-card-meta">
                  <StatusBadge status={task.status} />
                  <PriorityBadge priority={task.priority} />
                  {task.deadline && (
                    <span style={{ fontSize: 11, color: task.is_overdue ? 'var(--danger)' : 'var(--text-muted)' }}>
                      {formatDistanceToNow(new Date(task.deadline), { addSuffix: true })}
                    </span>
                  )}
                </div>
              </div>
            ))
          }
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">Recent Activity</span></div>
          <ActivityFeed activities={activities.slice(0, 8)} />
        </div>
      </div>

      {stats?.recent_projects?.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-header">
            <span className="card-title">Recent Projects</span>
            <button className="btn btn-sm btn-secondary" onClick={() => navigate('/projects')}>View All</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Project</th><th>Status</th><th>Priority</th><th>Progress</th><th>Team</th></tr>
              </thead>
              <tbody>
                {stats.recent_projects.map((p) => (
                  <tr key={p.id} onClick={() => navigate(`/projects/${p.id}`)} style={{ cursor: 'pointer' }}>
                    <td><strong>{p.name}</strong></td>
                    <td><StatusBadge status={p.status} /></td>
                    <td><PriorityBadge priority={p.priority} /></td>
                    <td style={{ width: 150 }}><ProgressBar value={p.progress} /></td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{p.team_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
