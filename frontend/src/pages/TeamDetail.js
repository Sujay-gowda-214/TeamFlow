import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MdArrowBack, MdAdd, MdPersonRemove } from 'react-icons/md';
import { teamsAPI, authAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function TeamDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [team, setTeam] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addUserId, setAddUserId] = useState('');
  const [addRole, setAddRole] = useState('member');
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    Promise.all([teamsAPI.get(id), authAPI.listUsers()])
      .then(([{ data: teamData }, { data: userData }]) => {
        setTeam(teamData);
        setAllUsers(userData);
      })
      .catch(() => {
        toast.error('Could not load this team.');
        navigate('/teams');
      });
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);

  const handleAddMember = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await teamsAPI.addMember(id, { user_id: addUserId, role: addRole });
      load();
      setShowAddModal(false);
      setAddUserId('');
      toast.success('Member added!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add member');
    } finally { setLoading(false); }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Remove this member from the team?')) return;
    try {
      await teamsAPI.removeMember(id, userId);
      load();
      toast.success('Member removed');
    } catch { toast.error('Failed to remove member'); }
  };

  if (!team) return <div className="loading-screen"><div className="spinner" /></div>;

  const memberUserIds = team.members.map((m) => m.user.id);
  const availableUsers = allUsers.filter((u) => !memberUserIds.includes(u.id));
  const currentMember = team.members.find((member) => member.user.id === user?.id);
  const canManageTeam = ['admin', 'manager'].includes(currentMember?.role);

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-secondary btn-sm btn-icon" onClick={() => navigate('/teams')}><MdArrowBack /></button>
          <div>
            <h2 className="page-title">{team.name}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 2 }}>{team.description}</p>
          </div>
        </div>
        {canManageTeam && <button className="btn btn-primary" onClick={() => setShowAddModal(true)}><MdAdd /> Add Member</button>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <div className="card-header"><span className="card-title">Team Members ({team.member_count})</span></div>
          {team.members.map((m) => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div className="avatar avatar-md" style={{ background: m.user.avatar_color || '#4F46E5' }}>
                {m.user.full_name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{m.user.full_name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{m.user.email}</div>
              </div>
              <span className={`badge badge-${m.role}`} style={{ textTransform: 'capitalize' }}>{m.role}</span>
              {canManageTeam && !(m.role === 'admin' && team.members.filter((member) => member.role === 'admin').length === 1) && (
                <button className="btn btn-sm btn-secondary btn-icon" title="Remove" onClick={() => handleRemoveMember(m.user.id)}>
                  <MdPersonRemove size={16} color="var(--danger)" />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">Team Projects ({team.project_count})</span></div>
          {team.project_count === 0
            ? <div className="empty-state" style={{ padding: 20 }}><p>No projects yet.</p></div>
            : <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Navigate to Projects to view team projects.</p>
          }
          <div style={{ marginTop: 16, padding: '12px', background: 'var(--bg)', borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Created</div>
            <div style={{ fontSize: 13, fontWeight: 500, marginTop: 2 }}>{format(new Date(team.created_at), 'd MMM yyyy')}</div>
          </div>
        </div>
      </div>

      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add Team Member"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleAddMember} disabled={loading || !addUserId}>{loading ? 'Adding…' : 'Add Member'}</button>
          </>
        }>
        <div className="form-group">
          <label className="form-label">Select User</label>
          <select className="form-control form-select" value={addUserId} onChange={(e) => setAddUserId(e.target.value)}>
            <option value="">Choose a user...</option>
            {availableUsers.map((u) => <option key={u.id} value={u.id}>{u.full_name} ({u.email})</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Role</label>
          <select className="form-control form-select" value={addRole} onChange={(e) => setAddRole(e.target.value)}>
            <option value="member">Member</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </Modal>
    </div>
  );
}
