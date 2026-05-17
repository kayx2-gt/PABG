import { useEffect, useState } from 'react';
import { deleteUser, fetchUsers, updateUser, updateUserSuspension } from '../api/adminApi';
import { addAction } from '../utils/actionLogger';

const emptyForm = {
  name: '',
  email: '',
};

const emptySuspensionForm = {
  reason: '',
  duration: 'permanent',
};

const Users = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [actingUserId, setActingUserId] = useState<string | null>(null);
  const [isSuspensionModalOpen, setIsSuspensionModalOpen] = useState(false);
  const [suspensionTarget, setSuspensionTarget] = useState<any | null>(null);
  const [suspensionForm, setSuspensionForm] = useState(emptySuspensionForm);

  const isEditing = selectedUserId !== '';

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await fetchUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const resetModal = () => {
    setIsModalOpen(false);
    setSelectedUserId('');
    setForm(emptyForm);
    setSaving(false);
  };

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const openEditModal = (user: any) => {
    setSelectedUserId(user.id);
    setForm({
      name: user.name || '',
      email: user.email || '',
    });
    setIsModalOpen(true);
  };

  const resetSuspensionModal = () => {
    setIsSuspensionModalOpen(false);
    setSuspensionTarget(null);
    setSuspensionForm(emptySuspensionForm);
  };

  const formatSuspensionDate = (value?: string | null) => {
    if (!value) return 'Permanent';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Permanent';
    return date.toLocaleString();
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      alert('Name is required.');
      return;
    }

    setSaving(true);
    try {
      const result = await updateUser(selectedUserId, { name: form.name.trim() });
      if (result.success) {
        addAction('edit', `User: ${form.name.trim()}`);
        resetModal();
        loadUsers();
      } else {
        alert(result.error || 'Failed to save user.');
      }
    } catch (error) {
      alert('Failed to save user.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user: any) => {
    if (!window.confirm(`Delete ${user.name || user.email}? This will remove the user record and all related data.`)) return;

    setActingUserId(user.id);
    try {
      const result = await deleteUser(user.id);
      if (result.success) {
        addAction('delete', `User: ${user.name || user.email}`);
        loadUsers();
      } else {
        alert(result.error || 'Failed to delete user.');
      }
    } catch (error) {
      alert('Failed to delete user.');
    } finally {
      setActingUserId(null);
    }
  };

  const handleSuspensionToggle = async (user: any) => {
    if (user.isSuspended) {
      setActingUserId(user.id);
      try {
        const result = await updateUserSuspension(user.id, false, '', null);
        if (result.success) {
          addAction('edit', `Unsuspended: ${user.name || user.email}`);
          loadUsers();
        } else {
          alert(result.error || 'Failed to update suspension.');
        }
      } catch (error) {
        alert('Failed to update suspension.');
      } finally {
        setActingUserId(null);
      }
      return;
    }

    setSuspensionTarget(user);
    setSuspensionForm({
      reason: user.suspensionReason || '',
      duration: 'permanent',
    });
    setIsSuspensionModalOpen(true);
  };

  const handleConfirmSuspension = async () => {
    if (!suspensionTarget) return;
    if (!suspensionForm.reason.trim()) {
      alert('Suspension reason is required.');
      return;
    }

    const durationMap: Record<string, number | null> = {
      '1': 1,
      '7': 7,
      '30': 30,
      permanent: null,
    };

    setActingUserId(suspensionTarget.id);
    setSaving(true);
    try {
      const result = await updateUserSuspension(
        suspensionTarget.id,
        true,
        suspensionForm.reason.trim(),
        durationMap[suspensionForm.duration]
      );
      if (result.success) {
        addAction('edit', `Suspended: ${suspensionTarget.name || suspensionTarget.email}`);
        loadUsers();
        resetSuspensionModal();
      } else {
        alert(result.error || 'Failed to update suspension.');
      }
    } catch (error) {
      alert('Failed to update suspension.');
    } finally {
      setSaving(false);
      setActingUserId(null);
    }
  };

  return (
    <div className="users-page">
      <div className="page-header">
        <h1 className="page-title">Managed Users</h1>
      </div>

      <div className="data-card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Name</th>
                <th>Email</th>
                <th>Status</th>
                <th>Total Points</th>
                <th>Games Played</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length > 0 ? (
                users.map((user, index) => (
                  <tr key={user.id}>
                    <td><span className="badge badge-lime">#{index + 1}</span></td>
                    <td style={{ fontWeight: '700' }}>{user.name}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{user.email}</td>
                    <td>
                      <div className="status-stack">
                        <span
                          className="badge"
                          style={{
                            backgroundColor: user.isSuspended ? 'rgba(255, 75, 75, 0.1)' : 'var(--primary-glow)',
                            color: user.isSuspended ? 'var(--error)' : 'var(--primary)',
                          }}
                        >
                          {user.isSuspended ? 'Suspended' : 'Active'}
                        </span>
                        {user.isSuspended && (
                          <span className="status-meta">
                            Until: {formatSuspensionDate(user.suspendedUntil)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ fontWeight: '800', color: 'var(--primary)' }}>{user.totalPoints || 0} pts</td>
                    <td>{user.totalGamesPlayed || user.gamesPlayed || 0}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <button className="btn-outline" onClick={() => openEditModal(user)}>Edit</button>
                        <button
                          className="btn-outline"
                          onClick={() => handleSuspensionToggle(user)}
                          disabled={actingUserId === user.id}
                          style={{
                            color: user.isSuspended ? 'var(--primary)' : 'var(--error)',
                            borderColor: user.isSuspended ? 'var(--border)' : 'rgba(255, 75, 75, 0.2)',
                          }}
                        >
                          {actingUserId === user.id ? 'Saving...' : user.isSuspended ? 'Unsuspend' : 'Suspend'}
                        </button>
                        <button
                          className="btn-outline"
                          onClick={() => handleDelete(user)}
                          disabled={actingUserId === user.id}
                          style={{ color: 'var(--error)', borderColor: 'rgba(255, 75, 75, 0.2)' }}
                        >
                          {actingUserId === user.id ? 'Working...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                    No users found in the database.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-backdrop" onClick={resetModal}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Edit User</h2>
                <p className="modal-subtitle">Update the display name. Score and games played are updated automatically through gameplay.</p>
              </div>
              <button className="btn-outline" onClick={resetModal}>Close</button>
            </div>

            <div className="form-grid">
              <label className="form-field">
                <span>Name</span>
                <input value={form.name} onChange={(event) => handleChange('name', event.target.value)} />
              </label>

              <label className="form-field">
                <span>Email</span>
                <input
                  value={form.email}
                  onChange={(event) => handleChange('email', event.target.value)}
                  disabled={isEditing}
                />
              </label>
            </div>

            <div className="modal-actions">
              <button className="btn-outline" onClick={resetModal}>Cancel</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Update User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isSuspensionModalOpen && suspensionTarget && (
        <div className="modal-backdrop" onClick={resetSuspensionModal}>
          <div className="modal-card suspension-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Suspend User</h2>
                <p className="modal-subtitle">Pause access for {suspensionTarget.name || suspensionTarget.email} and choose how long the suspension should last.</p>
              </div>
              <button className="btn-outline" onClick={resetSuspensionModal}>Close</button>
            </div>

            <div className="suspension-banner">
              Suspended accounts cannot use protected app features until the suspension expires or is manually removed.
            </div>

            <div className="form-grid">
              <label className="form-field form-field-full">
                <span>Reason</span>
                <textarea
                  value={suspensionForm.reason}
                  onChange={(event) => setSuspensionForm((current) => ({ ...current, reason: event.target.value }))}
                  rows={4}
                />
              </label>

              <label className="form-field form-field-full">
                <span>Duration</span>
                <select
                  value={suspensionForm.duration}
                  onChange={(event) => setSuspensionForm((current) => ({ ...current, duration: event.target.value }))}
                >
                  <option value="1">1 day</option>
                  <option value="7">7 days</option>
                  <option value="30">30 days</option>
                  <option value="permanent">Permanent</option>
                </select>
              </label>
            </div>

            <div className="modal-actions">
              <button className="btn-outline" onClick={resetSuspensionModal}>Cancel</button>
              <button className="btn-primary btn-danger" onClick={handleConfirmSuspension} disabled={saving}>
                {saving ? 'Applying...' : 'Confirm Suspension'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
