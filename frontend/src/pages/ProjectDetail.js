import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MdAdd, MdArrowBack } from 'react-icons/md';
import { projectsAPI, tasksAPI, teamsAPI } from '../api';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';
import ProgressBar from '../components/ProgressBar';
import ActivityFeed from '../components/ActivityFeed';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const COLUMNS = [
  { key: 'todo', label: 'To Do', color: '#6B7280' },
  { key: 'in_progress', label: 'In Progress', color: '#2563EB' },
  { key: 'review', label: 'In Review', color: '#7C3AED' },
  { key: 'done', label: 'Done', color: '#16A34A' },
];

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [activities, setActivities] = useState([]);
  const [users, setUsers] = useState([]);
  const [tab, setTab] = useState('kanban');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', assigned_to: '', priority: 'medium', status: 'todo', deadline: '', tags: '', estimated_hours: '' });
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    projectsAPI.get(id)
      .then(({ data: projectData }) => Promise.all([
        tasksAPI.list({ project: id }),
        tasksAPI.activityLog({ project: id }),
        teamsAPI.get(projectData.team),
      ]).then(([{ data: taskData }, { data: activityData }, { data: teamData }]) => {
        setProject(projectData);
        setTasks(taskData);
        setActivities(activityData);
        setUsers(teamData.members.map((member) => member.user));
      }))
      .catch(() => {
        toast.error('Could not load this project.');
        navigate('/projects');
      });
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form, project: id };
      if (!payload.assigned_to) delete payload.assigned_to;
      if (!payload.deadline) delete payload.deadline;
      if (!payload.estimated_hours) delete payload.estimated_hours;
      await tasksAPI.create(payload);
      setShowTaskModal(false);
      setForm({ title: '', description: '', assigned_to: '', priority: 'medium', status: 'todo', deadline: '', tags: '', estimated_hours: '' });
      load();
      toast.success('Task created!');
    } catch { toast.error('Failed to create task'); }
    finally { setLoading(false); }
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  if (!project) return <div className="loading-screen"><div className="spinner" /></div>;

  const tasksByStatus = COLUMNS.reduce((acc, col) => {
    acc[col.key] = tasks.filter((t) => t.status === col.key);
    return acc;
  }, {});

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-secondary btn-sm btn-icon" onClick={() => navigate('/projects')}><MdArrowBack /></button>
          <div>
            <h2 className="page-title">{project.name}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <StatusBadge status={project.status} />
              <PriorityBadge priority={project.priority} />
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{project.team_name}</span>
            </div>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowTaskModal(true)}><MdAdd /> Add Task</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Progress</div>
          <ProgressBar value={project.progress} />
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6 }}>{project.task_done_count} of {project.task_count} tasks completed</div>
        </div>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Timeline</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>
            {project.start_date ? format(new Date(project.start_date), 'd MMM') : '—'} → {project.end_date ? format(new Date(project.end_date), 'd MMM yyyy') : '—'}
          </div>
        </div>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Team Members</div>
          <div className="member-stack">
            {project.members?.slice(0, 6).map((m) => (
              <div key={m.id} className="avatar avatar-sm" style={{ background: m.avatar_color }} title={m.full_name}>
                {m.full_name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="tabs">
        {['kanban', 'list', 'activity'].map((t) => (
          <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'kanban' ? 'Kanban Board' : t === 'list' ? 'Task List' : 'Activity'}
          </button>
        ))}
      </div>

      {tab === 'kanban' && (
        <div className="kanban-board">
          {COLUMNS.map((col) => (
            <div key={col.key} className="kanban-col">
              <div className="kanban-col-header">
                <span style={{ color: col.color }}>{col.label}</span>
                <span style={{ background: col.color + '22', color: col.color, fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>
                  {tasksByStatus[col.key].length}
                </span>
              </div>
              {tasksByStatus[col.key].map((task) => (
                <div key={task.id} className="kanban-task" onClick={() => navigate(`/tasks/${task.id}`)}>
                  <div className="kanban-task-title">{task.title}</div>
                  <div className="kanban-task-meta">
                    <PriorityBadge priority={task.priority} />
                    {task.assigned_to && (
                      <div className="avatar avatar-sm" style={{ background: task.assigned_to.avatar_color }} title={task.assigned_to.full_name}>
                        {task.assigned_to.full_name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  {task.deadline && (
                    <div style={{ fontSize: 10, color: task.is_overdue ? 'var(--danger)' : 'var(--text-muted)', marginTop: 6 }}>
                      {format(new Date(task.deadline), 'd MMM')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {tab === 'list' && (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Task</th><th>Assigned To</th><th>Status</th><th>Priority</th><th>Deadline</th></tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id} onClick={() => navigate(`/tasks/${task.id}`)} style={{ cursor: 'pointer' }}>
                    <td><strong>{task.title}</strong></td>
                    <td>{task.assigned_to?.full_name || '—'}</td>
                    <td><StatusBadge status={task.status} /></td>
                    <td><PriorityBadge priority={task.priority} /></td>
                    <td style={{ fontSize: 13, color: task.is_overdue ? 'var(--danger)' : 'var(--text-secondary)' }}>
                      {task.deadline ? format(new Date(task.deadline), 'd MMM yyyy') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'activity' && (
        <div className="card"><ActivityFeed activities={activities} /></div>
      )}

      <Modal open={showTaskModal} onClose={() => setShowTaskModal(false)} title="Add New Task"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowTaskModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleCreateTask} disabled={loading}>{loading ? 'Creating…' : 'Create Task'}</button>
          </>
        }>
        <form onSubmit={handleCreateTask}>
          <div className="form-group">
            <label className="form-label">Task Title *</label>
            <input className="form-control" placeholder="e.g. Implement login API" value={form.title} onChange={set('title')} required />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-control" rows={3} value={form.description} onChange={set('description')} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Assigned To</label>
              <select className="form-control form-select" value={form.assigned_to} onChange={set('assigned_to')}>
                <option value="">Unassigned</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="form-control form-select" value={form.priority} onChange={set('priority')}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-control form-select" value={form.status} onChange={set('status')}>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="review">In Review</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Deadline</label>
              <input className="form-control" type="datetime-local" value={form.deadline} onChange={set('deadline')} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Tags (comma separated)</label>
              <input className="form-control" placeholder="backend,api,auth" value={form.tags} onChange={set('tags')} />
            </div>
            <div className="form-group">
              <label className="form-label">Estimated Hours</label>
              <input className="form-control" type="number" step="0.5" placeholder="8" value={form.estimated_hours} onChange={set('estimated_hours')} />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
