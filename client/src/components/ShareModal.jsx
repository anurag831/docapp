import React, { useEffect, useState } from 'react';
import { auth, docs } from '../api';

export default function ShareModal({ docId, existingShares = [], onClose, onShareSuccess }) {
  const [allUsers, setAllUsers] = useState([]);
  const [sharedUsers, setSharedUsers] = useState(existingShares);
  const [loading, setLoading] = useState(true);
  const [sharingEmail, setSharingEmail] = useState(null);
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

  const handleShare = async (user) => {
    try {
      setSharingEmail(user.email);
      setErrorMessage('');
      setSuccessMessage('');
      await docs.share(docId, user.email);
      setSharedUsers((prev) => [...prev, user]);
      setSuccessMessage(`Document shared with ${user.name}!`);
      if (onShareSuccess) {
        onShareSuccess(user);
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.error || 'Failed to share document');
    } finally {
      setSharingEmail(null);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Share Document</h2>
          <button className="modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {successMessage && <div className="modal-success">{successMessage}</div>}
          {errorMessage && <div className="modal-error">{errorMessage}</div>}

          {/* Already Shared With */}
          <div className="share-section">
            <h3 className="share-section-title">Already shared with</h3>
            {sharedUsers.length === 0 ? (
              <p className="share-empty-note">Not shared with anyone yet.</p>
            ) : (
              <ul className="shared-users-list">
                {sharedUsers.map((u) => (
                  <li key={u.id} className="shared-user-item">
                    <span className="user-avatar-circle">{u.name[0]}</span>
                    <div className="user-details">
                      <span className="user-name">{u.name}</span>
                      <span className="user-email">{u.email}</span>
                    </div>
                    <span className="badge badge-shared">Access granted</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Available Users to Share With */}
          <div className="share-section">
            <h3 className="share-section-title">People you can share with</h3>
            {loading ? (
              <p className="share-empty-note">Loading users...</p>
            ) : availableUsers.length === 0 ? (
              <p className="share-empty-note">All users have access to this document.</p>
            ) : (
              <ul className="available-users-list">
                {availableUsers.map((user) => (
                  <li key={user.id} className="available-user-item">
                    <div className="user-info-left">
                      <span className="user-avatar-circle">{user.name[0]}</span>
                      <div className="user-details">
                        <span className="user-name">{user.name}</span>
                        <span className="user-email">{user.email}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      disabled={sharingEmail === user.email}
                      onClick={() => handleShare(user)}
                    >
                      {sharingEmail === user.email ? 'Sharing...' : 'Share'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button id="btn-close-share" className="btn btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
