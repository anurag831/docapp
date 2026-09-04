import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { docs } from '../api';
import UploadButton from '../components/UploadButton';

export default function Dashboard() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [renamingId, setRenamingId] = useState(null);
  const [renameTitle, setRenameTitle] = useState('');

  const userName = localStorage.getItem('userName') || 'User';
  const userId = localStorage.getItem('userId');

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await docs.getAll();
      setDocuments(res.data);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.clear();
        navigate('/login', { replace: true });
      } else {
        setError(err.response?.data?.error || 'Failed to load documents');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userId) {
      navigate('/login', { replace: true });
      return;
    }
    fetchDocuments();
  }, [userId, navigate]);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login', { replace: true });
  };

  const handleCreateNew = async () => {
    try {
      const res = await docs.create({ title: 'Untitled', content: '' });
      navigate(`/editor/${res.data.id}`);
    } catch (err) {
      setError('Failed to create new document');
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }
    try {
      await docs.delete(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      setError('Failed to delete document');
    }
  };

  const startRename = (doc, e) => {
    e.stopPropagation();
    setRenamingId(doc.id);
    setRenameTitle(doc.title);
  };

  const saveRename = async (id) => {
    if (!renameTitle.trim()) {
      setRenamingId(null);
      return;
    }
    try {
      await docs.update(id, { title: renameTitle.trim() });
      setDocuments((prev) =>
        prev.map((d) => (d.id === id ? { ...d, title: renameTitle.trim() } : d))
      );
    } catch (err) {
      setError('Failed to rename document');
    } finally {
      setRenamingId(null);
    }
  };

  const ownedDocs = documents.filter((d) => d.relation === 'owned');
  const sharedDocs = documents.filter((d) => d.relation === 'shared');

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <div className="logo-container" onClick={() => navigate('/')}>
            <span className="logo-icon">📄</span>
            <span className="logo-title">DocApp</span>
          </div>
        </div>
        <div className="header-right">
          <span className="user-greeting">
            Signed in as <strong>{userName}</strong>
          </span>
          <button id="btn-logout" className="btn btn-outline" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="dashboard-main">
        <div className="dashboard-actions">
          <button id="btn-new-doc" className="btn btn-primary" onClick={handleCreateNew}>
            + New Document
          </button>
          <UploadButton onUploadSuccess={(newDoc) => navigate(`/editor/${newDoc.id}`)} />
        </div>

        {error && <div className="error-banner">{error}</div>}

        {loading ? (
          <div className="loading-indicator">Loading your documents...</div>
        ) : (
          <div className="documents-sections">
            {/* My Documents */}
            <section className="doc-section">
              <h2 className="section-title">My Documents</h2>
              {ownedDocs.length === 0 ? (
                <p className="empty-state">No documents yet</p>
              ) : (
                <div className="docs-grid">
                  {ownedDocs.map((doc) => (
                    <div
                      key={doc.id}
                      className="doc-card"
                      onClick={() => navigate(`/editor/${doc.id}`)}
                    >
                      <div className="doc-card-header">
                        <span className="badge badge-owned">Owner</span>
                        <div className="doc-card-actions">
                          <button
                            type="button"
                            className="btn-icon btn-rename"
                            onClick={(e) => startRename(doc, e)}
                            title="Rename"
                          >
                            ✏️
                          </button>
                          <button
                            type="button"
                            className="btn-icon btn-delete"
                            onClick={(e) => handleDelete(doc.id, e)}
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>

                      <div className="doc-card-body">
                        {renamingId === doc.id ? (
                          <input
                            type="text"
                            className="rename-input"
                            value={renameTitle}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => setRenameTitle(e.target.value)}
                            onBlur={() => saveRename(doc.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveRename(doc.id);
                              if (e.key === 'Escape') setRenamingId(null);
                            }}
                          />
                        ) : (
                          <h3 className="doc-title">{doc.title}</h3>
                        )}
                        <p className="doc-owner">Owner: You</p>
                        <p className="doc-timestamp">
                          Updated: {new Date(doc.updated_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Shared with Me */}
            <section className="doc-section">
              <h2 className="section-title">Shared with Me</h2>
              {sharedDocs.length === 0 ? (
                <p className="empty-state">No documents yet</p>
              ) : (
                <div className="docs-grid">
                  {sharedDocs.map((doc) => (
                    <div
                      key={doc.id}
                      className="doc-card"
                      onClick={() => navigate(`/editor/${doc.id}`)}
                    >
                      <div className="doc-card-header">
                        <span className="badge badge-shared">Shared</span>
                      </div>

                      <div className="doc-card-body">
                        <h3 className="doc-title">{doc.title}</h3>
                        <p className="doc-owner">Shared by {doc.owner_name}</p>
                        <p className="doc-timestamp">
                          Updated: {new Date(doc.updated_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
