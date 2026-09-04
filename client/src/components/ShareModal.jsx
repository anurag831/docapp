import React, { useEffect, useState } from 'react';
import { auth, docs } from '../api';

export default function ShareModal({ docId, existingShares = [], onClose, onShareSuccess }) {
  const [allUsers, setAllUsers] = useState([]);
  const [sharedUsers, setSharedUsers] = useState(existingShares);
  const [loading, setLoading] = useState(true);
  const [sharingEmail, setSharingEmail] = useState(null);
  const [selectedRoles, setSelectedRoles] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const currentUserId = parseInt(localStorage.getItem('userId'), 10);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const res = await auth.getUsers();
        setAllUsers(res.data);
      } catch (err) {
        setErrorMessage('Failed to load users list');
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const sharedUserIds = new Set(sharedUsers.map((u) => u.id));
  const availableUsers = allUsers.filter(
    (u) => u.id !== currentUserId && !sharedUserIds.has(u.id)
  );

  const handleRoleSelection = (userId, role) => {
    setSelectedRoles((prev) => ({ ...prev, [userId]: role }));
  };

  const handleShare = async (user) => {
    const role = selectedRoles[user.id] || 'editor';
    try {
      setSharingEmail(user.email);
      setErrorMessage('');
      setSuccessMessage('');
      await docs.share(docId, user.email, role);
      const updatedUser = { ...user, role };
      setSharedUsers((prev) => [...prev, updatedUser]);
      setSuccessMessage(`Document shared with ${user.name} as ${role}!`);
      if (onShareSuccess) {
        onShareSuccess(updatedUser);
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.error || 'Failed to share document');
    } finally {
      setSharingEmail(null);
    }
  };

  const handleUpdateRole = async (user, newRole) => {
    try {
      setErrorMessage('');
      setSuccessMessage('');
      await docs.share(docId, user.email, newRole);
      setSharedUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u))
      );
      setSuccessMessage(`Updated ${user.name}'s role to ${newRole}`);
    } catch (err) {
      setErrorMessage('Failed to update user role');
    }
  };

  const handleRevoke = async (user) => {
    if (!window.confirm(`Revoke document access for ${user.name}?`)) return;
    try {
      setErrorMessage('');
      setSuccessMessage('');
      await docs.revokeShare(docId, user.id);
      setSharedUsers((prev) => prev.filter((u) => u.id !== user.id));
      setSuccessMessage(`Revoked access for ${user.name}`);
    } catch (err) {
      setErrorMessage('Failed to revoke access');
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card modal-card-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Share Document & Manage Permissions</h2>
          <button className="modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {successMessage && <div className="modal-success">{successMessage}</div>}
          {errorMessage && <div className="modal-error">{errorMessage}</div>}

          {/* Already Shared With */}
          <div className="share-section">
            <h3 className="share-section-title">People with access</h3>
            {sharedUsers.length === 0 ? (
              <p className="share-empty-note">Not shared with anyone yet.</p>
            ) : (
              <ul className="shared-users-list">
                {sharedUsers.map((u) => (
                  <li key={u.id} className="shared-user-item">
                    <div className="user-info-left">
                      <span className="user-avatar-circle">{u.name[0]}</span>
                      <div className="user-details">
                        <span className="user-name">{u.name}</span>
                        <span className="user-email">{u.email}</span>
                      </div>
                    </div>

                    <div className="share-item-actions">
                      <select
                        className="role-select"
                        value={u.role || 'editor'}
                        onChange={(e) => handleUpdateRole(u, e.target.value)}
                      >
                        <option value="editor">Editor (Can edit)</option>
                        <option value="commenter">Commenter (Can comment)</option>
                        <option value="viewer">Viewer (Read-only)</option>
                      </select>

                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleRevoke(u)}
                        title="Revoke access"
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Available Users to Share With */}
          <div className="share-section">
            <h3 className="share-section-title">Share with team members</h3>
            {loading ? (
              <p className="share-empty-note">Loading users...</p>
            ) : availableUsers.length === 0 ? (
              <p className="share-empty-note">All users currently have access.</p>
            ) : (
              <ul className="available-users-list">
                {availableUsers.map((user) => {
                  const currentRole = selectedRoles[user.id] || 'editor';
                  return (
                    <li key={user.id} className="available-user-item">
                      <div className="user-info-left">
                        <span className="user-avatar-circle">{user.name[0]}</span>
                        <div className="user-details">
                          <span className="user-name">{user.name}</span>
                          <span className="user-email">{user.email}</span>
                        </div>
                      </div>

                      <div className="share-item-actions">
                        <select
                          className="role-select"
                          value={currentRole}
                          onChange={(e) => handleRoleSelection(user.id, e.target.value)}
                        >
                          <option value="editor">Editor</option>
                          <option value="commenter">Commenter</option>
                          <option value="viewer">Viewer</option>
                        </select>

                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          disabled={sharingEmail === user.email}
                          onClick={() => handleShare(user)}
                        >
                          {sharingEmail === user.email ? 'Sharing...' : 'Share'}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button id="btn-close-share" className="btn btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
