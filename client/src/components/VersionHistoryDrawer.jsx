import React, { useEffect, useState } from 'react';
import { versions } from '../api';

export default function VersionHistoryDrawer({
  docId,
  activePreviewId,
  onPreviewVersion,
  onClose,
  onRestore,
  canRestore,
}) {
  const [versionList, setVersionList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingSnapshotId, setLoadingSnapshotId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchVersions = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await versions.getAll(docId);
        setVersionList(res.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load version history');
      } finally {
        setLoading(false);
      }
    };
    fetchVersions();
  }, [docId]);

  const handleSelectVersion = async (v) => {
    try {
      setLoadingSnapshotId(v.id);
      const res = await versions.getById(docId, v.id);
      onPreviewVersion(res.data);
    } catch (err) {
      alert('Failed to load version snapshot content');
    } finally {
      setLoadingSnapshotId(null);
    }
  };

  const handleRestoreClick = (e, v) => {
    e.stopPropagation();
    if (window.confirm(`Restore document to Version #${v.version_number}? Your current state will be backed up.`)) {
      onRestore(v);
    }
  };

  return (
    <aside className="version-drawer">
      <div className="version-drawer-header">
        <div className="version-title-wrap">
          <span className="version-icon">🕒</span>
          <h2 className="version-drawer-title">Version History</h2>
        </div>
        <button className="version-close-btn" onClick={onClose} title="Close history">
          ✕
        </button>
      </div>

      <p className="version-drawer-subtitle">
        Browse and restore snapshots of this document over time.
      </p>

      {error && <div className="version-error">{error}</div>}

      <div className="version-list-container">
        {loading ? (
          <div className="version-loading">Loading revision timeline...</div>
        ) : versionList.length === 0 ? (
          <div className="version-empty">No versions recorded yet.</div>
        ) : (
          versionList.map((v, index) => {
            const isCurrent = index === 0 && !activePreviewId;
            const isSelected = activePreviewId === v.id;

            return (
              <div
                key={v.id}
                className={`version-card ${isSelected ? 'selected' : ''} ${
                  isCurrent ? 'current-version' : ''
                }`}
                onClick={() => handleSelectVersion(v)}
              >
                <div className="version-card-top">
                  <div className="version-meta-left">
                    <span className="version-number-tag">
                      v{v.version_number}
                    </span>
                    <span className="version-timestamp">
                      {new Date(v.created_at).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {isCurrent && (
                    <span className="badge badge-owner">Current</span>
                  )}
                  {isSelected && !isCurrent && (
                    <span className="badge badge-open">Previewing</span>
                  )}
                </div>

                <div className="version-label-text">
                  🏷️ {v.label || 'Snapshot'}
                </div>

                <div className="version-card-bottom">
                  <div className="version-author">
                    <span className="user-avatar-circle small">
                      {v.author_name ? v.author_name[0] : 'U'}
                    </span>
                    <span className="version-author-name">{v.author_name}</span>
                  </div>

                  <div className="version-card-actions">
                    <button
                      type="button"
                      className="btn-link"
                      disabled={loadingSnapshotId === v.id}
                    >
                      {loadingSnapshotId === v.id ? 'Loading...' : isSelected ? 'Previewing' : 'Preview'}
                    </button>

                    {canRestore && !isCurrent && (
                      <button
                        type="button"
                        className="btn-link btn-primary-link"
                        onClick={(e) => handleRestoreClick(e, v)}
                      >
                        Restore
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
