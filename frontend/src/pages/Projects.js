import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdAdd, MdSearch } from 'react-icons/md';
import { projectsAPI, teamsAPI } from '../api';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';
import ProgressBar from '../components/ProgressBar';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function Projects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [teams, setTeams] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', team: '', status: 'planning', priority: 'medium', start_date: '', end_date: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([projectsAPI.list(), teamsAPI.list()])
      .then(([{ data: projectData }, { data: teamData }]) => {
        setProjects(projectData);
        setTeams(teamData);
      })
      .catch(() => toast.error('Could not load projects and teams. Please try again.'));
  }, []);

  const filtered = projects.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.description?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await projectsAPI.create(form);
      setProjects([data, ...projects]);
      setShowModal(false);
      setForm({ name: '', description: '', team: '', status: 'planning', priority: 'medium', start_date: '', end_date: '' });
      toast.success('Project created!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Projects</h2>
          <p className="page-subtitle">{projects.length} projects in your workspace</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}><MdAdd /> New Project</button>
      </div>

      <div className="search-filter-bar">
        <div className="search-input-wrap">
          <MdSearch className="search-icon" size={18} />
          <input className="search-input" placeholder="Search projects..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          <option value="planning">Planning</option>
          <option value="active">Active</option>
          <option value="on_hold">On Hold</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {filtered.length === 0
        ? <div className="empty-state"><div className="empty-state-icon">📁</div><p>No projects found. Create your first project!</p></div>
        : <div className="projects-grid">
          {filtered.map((p) => (
            <div key={p.id} className="project-card" onClick={() => navigate(`/projects/${p.id}`)}>
              <div className="project-card-header">
                <div>
                  <div className="project-card-title">{p.name}</div>
                  <div className="project-card-team">{p.team_name}</div>
                </div>
                <PriorityBadge priority={p.priority} />
              </div>
              <p className="project-card-desc">{p.description || 'No description provided.'}</p>
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <StatusBadge status={p.status} />
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.task_done_count}/{p.task_count} tasks</span>
                </div>
                <ProgressBar value={p.progress} />
              </div>
              <div className="project-card-footer">
                <div className="member-stack">
                  {p.members?.slice(0, 4).map((m) => (
                    <div key={m.id} className="avatar avatar-sm" style={{ background: m.avatar_color }} title={m.full_name}>
                      {m.full_name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                  ))}
                  {p.members?.length > 4 && <div className="avatar avatar-sm" style={{ background: '#6B7280' }}>+{p.members.length - 4}</div>}
                </div>
                {p.end_date && (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Due {format(new Date(p.end_date), 'd MMM yyyy')}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      }

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Create New Project"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleCreate} disabled={loading}>{loading ? 'Creating…' : 'Create Project'}</button>
          </>
        }>
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label className="form-label">Project Name *</label>
            <input className="form-control" placeholder="e.g. Mobile App v2.0" value={form.name} onChange={set('name')} required />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-control" rows={3} placeholder="What is this project about?" value={form.description} onChange={set('description')} />
          </div>
          <div className="form-group">
            <label className="form-label">Team *</label>
            <select className="form-control form-select" value={form.team} onChange={set('team')} required>
              <option value="">Select Team</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-control form-select" value={form.status} onChange={set('status')}>
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
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
              <label className="form-label">Start Date</label>
              <input className="form-control" type="date" value={form.start_date} onChange={set('start_date')} />
            </div>
            <div className="form-group">
              <label className="form-label">End Date</label>
              <input className="form-control" type="date" value={form.end_date} onChange={set('end_date')} />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
