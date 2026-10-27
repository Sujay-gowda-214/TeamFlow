import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdAdd, MdGroup } from 'react-icons/md';
import { teamsAPI } from '../api';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';

export default function Teams() {
  const navigate = useNavigate();
  const [teams, setTeams] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    teamsAPI.list()
      .then(({ data }) => setTeams(data))
      .catch(() => toast.error('Could not load teams. Please try again.'));
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await teamsAPI.create(form);
      setTeams([...teams, data]);
      setShowModal(false);
      setForm({ name: '', description: '' });
      toast.success('Team created!');
    } catch { toast.error('Failed to create team'); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Teams</h2>
          <p className="page-subtitle">{teams.length} teams in your workspace</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}><MdAdd /> New Team</button>
      </div>

      {teams.length === 0
        ? <div className="empty-state"><div className="empty-state-icon">👥</div><p>No teams yet. Create your first team!</p></div>
        : <div className="projects-grid">
          {teams.map((team) => (
            <div key={team.id} className="project-card" onClick={() => navigate(`/teams/${team.id}`)}>
              <div className="project-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 44, height: 44, background: 'var(--primary-light)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                    <MdGroup size={22} />
                  </div>
                  <div>
                    <div className="project-card-title">{team.name}</div>
                    <div className="project-card-team">{team.member_count} members · {team.project_count} projects</div>
                  </div>
                </div>
              </div>
              <p className="project-card-desc">{team.description || 'No description provided.'}</p>
              <div className="member-stack" style={{ marginTop: 8 }}>
                {team.members?.slice(0, 5).map((m) => (
                  <div key={m.id} className="avatar avatar-sm" style={{ background: m.user?.avatar_color || '#4F46E5' }} title={m.user?.full_name}>
                    {m.user?.full_name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                ))}
                {team.member_count > 5 && (
                  <div className="avatar avatar-sm" style={{ background: '#6B7280' }}>+{team.member_count - 5}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      }

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Create New Team"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleCreate} disabled={loading}>{loading ? 'Creating…' : 'Create Team'}</button>
          </>
        }>
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label className="form-label">Team Name *</label>
            <input className="form-control" placeholder="e.g. Alpha Engineering" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-control" rows={3} placeholder="What does this team do?" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        </form>
      </Modal>
    </div>
  );
}
