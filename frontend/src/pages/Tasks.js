import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdSearch, MdFilterList } from 'react-icons/md';
import { tasksAPI } from '../api';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

export default function Tasks() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [myOnly, setMyOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    tasksAPI.list({ my_tasks: myOnly ? 'true' : undefined })
      .then(({ data }) => setTasks(data))
      .catch(() => toast.error('Could not load tasks. Please try again.'))
      .finally(() => setLoading(false));
  }, [myOnly]);

  const filtered = tasks.filter((t) => {
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase()) || t.project_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || t.status === statusFilter;
    const matchPriority = !priorityFilter || t.priority === priorityFilter;
    return matchSearch && matchStatus && matchPriority;
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">{myOnly ? 'My Tasks' : 'All Tasks'}</h2>
          <p className="page-subtitle">{filtered.length} tasks</p>
        </div>
      </div>

      <div className="search-filter-bar">
        <div className="search-input-wrap">
          <MdSearch className="search-icon" size={18} />
          <input className="search-input" placeholder="Search tasks..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="review">In Review</option>
          <option value="done">Done</option>
        </select>
        <select className="filter-select" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
          <option value="">All Priority</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
        <button className={`btn ${myOnly ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setMyOnly(!myOnly)}>
          <MdFilterList /> {myOnly ? 'My Tasks' : 'All Tasks'}
        </button>
      </div>

      {loading
        ? <div className="loading-screen" style={{ minHeight: 200 }}><div className="spinner" /></div>
        : filtered.length === 0
          ? <div className="empty-state"><div className="empty-state-icon">✅</div><p>No tasks found.</p></div>
          : (
            <div className="card">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Task</th><th>Project</th><th>Assigned To</th><th>Status</th><th>Priority</th><th>Deadline</th><th>Comments</th></tr>
                  </thead>
                  <tbody>
                    {filtered.map((task) => (
                      <tr key={task.id} onClick={() => navigate(`/tasks/${task.id}`)} style={{ cursor: 'pointer' }}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{task.title}</div>
                          {task.tags && (
                            <div style={{ marginTop: 4, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                              {task.tags.split(',').map((tag, i) => <span key={i} className="tag">{tag.trim()}</span>)}
                            </div>
                          )}
                        </td>
                        <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{task.project_name}</td>
                        <td>
                          {task.assigned_to ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div className="avatar avatar-sm" style={{ background: task.assigned_to.avatar_color }}>
                                {task.assigned_to.full_name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                              </div>
                              <span style={{ fontSize: 13 }}>{task.assigned_to.full_name}</span>
                            </div>
                          ) : <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Unassigned</span>}
                        </td>
                        <td><StatusBadge status={task.status} /></td>
                        <td><PriorityBadge priority={task.priority} /></td>
                        <td style={{ fontSize: 12, color: task.is_overdue ? 'var(--danger)' : 'var(--text-muted)', fontWeight: task.is_overdue ? 600 : 400 }}>
                          {task.deadline ? formatDistanceToNow(new Date(task.deadline), { addSuffix: true }) : '—'}
                        </td>
                        <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{task.comment_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
      }
    </div>
  );
}
