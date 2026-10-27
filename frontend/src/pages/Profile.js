import React, { useState } from 'react';
import { MdEdit, MdSave, MdLock } from 'react-icons/md';
import { authAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';

const COLORS = ['#4F46E5', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#6366F1'];
const DEPARTMENTS = ['Engineering', 'Product', 'Design', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations', 'Other'];
const CITIES = ['Bengaluru', 'Mumbai', 'Delhi', 'Pune', 'Hyderabad', 'Chennai', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Noida', 'Gurugram'];

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [showPwModal, setShowPwModal] = useState(false);
  const [form, setForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    phone: user?.profile?.phone || '',
    department: user?.profile?.department || '',
    bio: user?.profile?.bio || '',
    city: user?.profile?.city || '',
    avatar_color: user?.profile?.avatar_color || '#4F46E5',
  });
  const [pwForm, setPwForm] = useState({ old_password: '', new_password: '', confirm: '' });
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data } = await authAPI.updateProfile(form);
      updateUser(data);
      setEditing(false);
      toast.success('Profile updated!');
    } catch { toast.error('Failed to update profile'); }
    finally { setLoading(false); }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwForm.new_password !== pwForm.confirm) { toast.error('Passwords do not match'); return; }
    setLoading(true);
    try {
      await authAPI.changePassword({ old_password: pwForm.old_password, new_password: pwForm.new_password });
      setShowPwModal(false);
      setPwForm({ old_password: '', new_password: '', confirm: '' });
      toast.success('Password changed!');
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to change password'); }
    finally { setLoading(false); }
  };

  const initials = `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`.toUpperCase() || user?.username?.[0]?.toUpperCase();

  return (
    <div style={{ maxWidth: 720 }}>
      <div className="page-header">
        <h2 className="page-title">My Profile</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => setShowPwModal(true)}><MdLock /> Change Password</button>
          {editing
            ? <button className="btn btn-primary" onClick={handleSave} disabled={loading}><MdSave /> {loading ? 'Saving…' : 'Save'}</button>
            : <button className="btn btn-secondary" onClick={() => setEditing(true)}><MdEdit /> Edit Profile</button>
          }
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28 }}>
          <div className="avatar avatar-xl" style={{ background: form.avatar_color }}>{initials}</div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{user?.first_name} {user?.last_name}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{user?.profile?.role} · {user?.profile?.department}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>{user?.profile?.city}</div>
          </div>
        </div>

        {editing && (
          <div style={{ marginBottom: 20 }}>
            <div className="form-label">Avatar Color</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              {COLORS.map((c) => (
                <button key={c} onClick={() => setForm({ ...form, avatar_color: c })}
                  style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: form.avatar_color === c ? '3px solid #111' : '2px solid transparent', cursor: 'pointer' }} />
              ))}
            </div>
          </div>
        )}

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">First Name</label>
            {editing ? <input className="form-control" value={form.first_name} onChange={set('first_name')} /> : <div style={{ fontSize: 14 }}>{user?.first_name || '—'}</div>}
          </div>
          <div className="form-group">
            <label className="form-label">Last Name</label>
            {editing ? <input className="form-control" value={form.last_name} onChange={set('last_name')} /> : <div style={{ fontSize: 14 }}>{user?.last_name || '—'}</div>}
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Email</label>
          {editing ? <input className="form-control" type="email" value={form.email} onChange={set('email')} /> : <div style={{ fontSize: 14 }}>{user?.email || '—'}</div>}
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Phone</label>
            {editing ? <input className="form-control" placeholder="+91-9XXXXXXXXX" value={form.phone} onChange={set('phone')} /> : <div style={{ fontSize: 14 }}>{user?.profile?.phone || '—'}</div>}
          </div>
          <div className="form-group">
            <label className="form-label">Department</label>
            {editing
              ? <select className="form-control form-select" value={form.department} onChange={set('department')}>{DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}</select>
              : <div style={{ fontSize: 14 }}>{user?.profile?.department || '—'}</div>}
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">City</label>
          {editing
            ? <select className="form-control form-select" value={form.city} onChange={set('city')}>{CITIES.map((c) => <option key={c}>{c}</option>)}</select>
            : <div style={{ fontSize: 14 }}>{user?.profile?.city || '—'}</div>}
        </div>
        <div className="form-group">
          <label className="form-label">Bio</label>
          {editing
            ? <textarea className="form-control" rows={3} value={form.bio} onChange={set('bio')} />
            : <div style={{ fontSize: 14, color: user?.profile?.bio ? 'var(--text-primary)' : 'var(--text-muted)' }}>{user?.profile?.bio || 'No bio yet.'}</div>}
        </div>

        <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--bg)', borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Account Role</div>
          <div style={{ fontSize: 14, fontWeight: 600, textTransform: 'capitalize' }}>{user?.profile?.role}</div>
        </div>
      </div>

      <Modal open={showPwModal} onClose={() => setShowPwModal(false)} title="Change Password"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowPwModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleChangePassword} disabled={loading}>{loading ? 'Saving…' : 'Change Password'}</button>
          </>
        }>
        <form onSubmit={handleChangePassword}>
          <div className="form-group">
            <label className="form-label">Current Password</label>
            <input className="form-control" type="password" value={pwForm.old_password} onChange={(e) => setPwForm({ ...pwForm, old_password: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">New Password</label>
            <input className="form-control" type="password" value={pwForm.new_password} onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">Confirm New Password</label>
            <input className="form-control" type="password" value={pwForm.confirm} onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })} required />
          </div>
        </form>
      </Modal>
    </div>
  );
}
