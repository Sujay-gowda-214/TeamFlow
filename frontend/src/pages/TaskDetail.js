import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MdArrowBack, MdSend, MdDelete, MdEdit } from 'react-icons/md';
import { tasksAPI, commentsAPI, teamsAPI } from '../api';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { format, formatDistanceToNow } from 'date-fns';

export default function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [task, setTask] = useState(null);
  const [comments, setComments] = useState([]);
  const [users, setUsers] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [showEdit, setShowEdit] = useState(false);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    tasksAPI.get(id)
      .then(({ data: taskData }) => Promise.all([
        commentsAPI.list(id),
        teamsAPI.get(taskData.project),
      ]).then(([{ data: commentData }, { data: teamData }]) => {
        setTask(taskData);
        setComments(commentData);
        setUsers(teamData.members.map((member) => member.user));
        setForm({
          title: taskData.title, description: taskData.description, assigned_to: taskData.assigned_to?.id || '',
          priority: taskData.priority, status: taskData.status, deadline: taskData.deadline ? taskData.deadline.slice(0, 16) : '',
          tags: taskData.tags, estimated_hours: taskData.estimated_hours || '', actual_hours: taskData.actual_hours || '',
        });
      }))
      .catch(() => {
        toast.error('Could not load this task.');
        navigate('/tasks');
      });
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);

  const handleUpdateTask = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form };
      if (!payload.assigned_to) payload.assigned_to = null;
      if (payload.estimated_hours === '') payload.estimated_hours = null;
      if (payload.actual_hours === '') payload.actual_hours = null;
      if (!payload.deadline) payload.deadline = null;
      const { data } = await tasksAPI.update(id, payload);
      setTask(data);
      setShowEdit(false);
      toast.success('Task updated!');
    } catch { toast.error('Failed to update task'); }
    finally { setLoading(false); }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      const { data } = await commentsAPI.create(id, { text: commentText });
      setComments([...comments, data]);
      setCommentText('');
    } catch { toast.error('Failed to post comment'); }
  };

  const handleDeleteComment = async (cId) => {
    try {
      await commentsAPI.delete(cId);
      setComments(comments.filter((c) => c.id !== cId));
      toast.success('Comment deleted');
    } catch { toast.error('Failed to delete comment'); }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      const { data } = await tasksAPI.update(id, { status: newStatus });
      setTask(data);
      toast.success('Status updated');
    } catch { toast.error('Failed to update status'); }
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  if (!task) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-secondary btn-sm btn-icon" onClick={() => navigate(-1)}><MdArrowBack /></button>
          <div>
            <h2 className="page-title" style={{ fontSize: 20 }}>{task.title}</h2>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <StatusBadge status={task.status} />
              <PriorityBadge priority={task.priority} />
              {task.is_overdue && <span className="badge badge-critical">Overdue</span>}
            </div>
          </div>
        </div>
        <button className="btn btn-secondary" onClick={() => setShowEdit(true)}><MdEdit /> Edit Task</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-title" style={{ marginBottom: 12 }}>Description</div>
            <p style={{ fontSize: 14, color: task.description ? 'var(--text-primary)' : 'var(--text-muted)', lineHeight: 1.7 }}>
              {task.description || 'No description provided.'}
            </p>
            {task.tags && (
              <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {task.tags.split(',').map((tag, i) => <span key={i} className="tag">{tag.trim()}</span>)}
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-title" style={{ marginBottom: 16 }}>Comments ({comments.length})</div>
            {comments.map((c) => (
              <div key={c.id} className="comment-item">
                <div className="avatar avatar-sm" style={{ background: c.user?.avatar_color || '#4F46E5' }}>
                  {c.user?.full_name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div className="comment-body">
                  <span className="comment-author">{c.user?.full_name}</span>
                  <span className="comment-time">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
                  <div className="comment-text">{c.text}</div>
                  {c.user?.id === user?.id && (
                    <button className="btn btn-sm" style={{ marginTop: 6, color: 'var(--danger)', background: 'none', padding: '2px 4px' }}
                      onClick={() => handleDeleteComment(c.id)}>
                      <MdDelete size={14} /> Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
            <form onSubmit={handleComment} style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <div className="avatar avatar-sm" style={{ background: '#4F46E5', flexShrink: 0, marginTop: 4 }}>
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </div>
              <div style={{ flex: 1, display: 'flex', gap: 8 }}>
                <input className="form-control" placeholder="Add a comment..." value={commentText} onChange={(e) => setCommentText(e.target.value)} />
                <button className="btn btn-primary btn-icon" type="submit"><MdSend /></button>
              </div>
            </form>
          </div>
        </div>

        <div>
          <div className="card" style={{ marginBottom: 12 }}>
            <div className="section-title">Details</div>
            {[
              { label: 'Project', value: task.project_name },
              { label: 'Assigned To', value: task.assigned_to?.full_name || 'Unassigned' },
              { label: 'Created By', value: task.created_by?.full_name },
              { label: 'Deadline', value: task.deadline ? format(new Date(task.deadline), 'd MMM yyyy, h:mm a') : '—' },
              { label: 'Estimated', value: task.estimated_hours ? `${task.estimated_hours}h` : '—' },
              { label: 'Actual', value: task.actual_hours ? `${task.actual_hours}h` : '—' },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{value}</span>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="section-title">Change Status</div>
            {['todo', 'in_progress', 'review', 'done'].map((s) => (
              <button key={s} className={`btn btn-sm ${task.status === s ? 'btn-primary' : 'btn-secondary'}`}
                style={{ width: '100%', justifyContent: 'flex-start', marginBottom: 6 }}
                onClick={() => handleStatusChange(s)}>
                <StatusBadge status={s} />
              </button>
            ))}
          </div>
        </div>
      </div>

      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit Task"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowEdit(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleUpdateTask} disabled={loading}>{loading ? 'Saving…' : 'Save Changes'}</button>
          </>
        }>
        <form onSubmit={handleUpdateTask}>
          <div className="form-group">
            <label className="form-label">Title</label>
            <input className="form-control" value={form.title || ''} onChange={set('title')} required />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-control" rows={3} value={form.description || ''} onChange={set('description')} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Assigned To</label>
              <select className="form-control form-select" value={form.assigned_to || ''} onChange={set('assigned_to')}>
                <option value="">Unassigned</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-control form-select" value={form.status || 'todo'} onChange={set('status')}>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="review">In Review</option>
                <option value="done">Done</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="form-control form-select" value={form.priority || 'medium'} onChange={set('priority')}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Deadline</label>
              <input className="form-control" type="datetime-local" value={form.deadline || ''} onChange={set('deadline')} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Estimated Hours</label>
              <input className="form-control" type="number" step="0.5" value={form.estimated_hours || ''} onChange={set('estimated_hours')} />
            </div>
            <div className="form-group">
              <label className="form-label">Actual Hours</label>
              <input className="form-control" type="number" step="0.5" value={form.actual_hours || ''} onChange={set('actual_hours')} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Tags (comma separated)</label>
            <input className="form-control" value={form.tags || ''} onChange={set('tags')} />
          </div>
        </form>
      </Modal>
    </div>
  );
}
