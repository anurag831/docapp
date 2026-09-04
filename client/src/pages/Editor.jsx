import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { docs } from '../api';
import TipTapEditor from '../components/TipTapEditor';
import ShareModal from '../components/ShareModal';

export default function Editor() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [doc, setDoc] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('');
  const [error, setError] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);

  const debounceTimerRef = useRef(null);
  const contentRef = useRef('');

  const fetchDocument = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await docs.getById(id);
      setDoc(res.data);
      setTitle(res.data.title);
      setContent(res.data.content);
      contentRef.current = res.data.content;
      setSaveStatus(`Saved at ${new Date(res.data.updated_at).toLocaleTimeString()}`);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.clear();
        navigate('/login', { replace: true });
      } else if (err.response?.status === 404) {
        navigate('/', { replace: true });
      } else {
        setError(err.response?.data?.error || 'Failed to load document');
      }
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchDocument();
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [fetchDocument]);

  // Silent auto-save content
  const autoSaveContent = useCallback(
    async (newContent) => {
      try {
        setSaveStatus('Saving...');
        await docs.update(id, { content: newContent });
        setSaveStatus(`Auto-saved at ${new Date().toLocaleTimeString()}`);
      } catch (err) {
        setSaveStatus('Auto-save failed');
      }
    },
    [id]
  );

  // Content change handler from TipTap
  const handleContentChange = (newContentJson) => {
    setContent(newContentJson);
    contentRef.current = newContentJson;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setSaveStatus('Unsaved changes...');
    debounceTimerRef.current = setTimeout(() => {
      autoSaveContent(newContentJson);
    }, 2000);
  };

  // Manual save button
  const handleManualSave = async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    try {
      setSaveStatus('Saving...');
      const payload = { content: contentRef.current };
      if (doc?.relation === 'owned') {
        payload.title = title;
      }
      const res = await docs.update(id, payload);
      setDoc(res.data);
      setSaveStatus(`Saved at ${new Date().toLocaleTimeString()}`);
    } catch (err) {
      setSaveStatus('Save failed');
      setError('Failed to save document');
    }
  };

  // Save title on blur or Enter
  const handleTitleBlur = async () => {
    setIsEditingTitle(false);
    if (!title.trim() || title === doc?.title) {
      setTitle(doc?.title || 'Untitled');
      return;
    }
    try {
      const res = await docs.update(id, { title: title.trim() });
      setDoc((prev) => ({ ...prev, title: res.data.title }));
      setTitle(res.data.title);
      setSaveStatus(`Saved at ${new Date().toLocaleTimeString()}`);
    } catch (err) {
      setError('Failed to update title');
    }
  };

  const handleShareSuccess = (sharedUser) => {
    setDoc((prev) => ({
      ...prev,
      shares: [...(prev.shares || []), sharedUser],
    }));
  };

  if (loading) {
    return <div className="editor-loading-screen">Loading document...</div>;
  }

  if (error && !doc) {
    return (
      <div className="editor-error-screen">
        <p className="error-message">{error}</p>
        <Link to="/" className="btn btn-outline">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="editor-page-container">
      {/* Editor Header */}
      <header className="editor-header">
        <div className="editor-header-left">
          <Link to="/" className="back-link">
            ← Back to Dashboard
          </Link>

          <div className="editor-title-container">
            {doc?.relation === 'owned' ? (
              isEditingTitle ? (
                <input
                  type="text"
                  className="editor-title-input"
                  value={title}
                  autoFocus
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={handleTitleBlur}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleTitleBlur();
                    if (e.key === 'Escape') {
                      setTitle(doc.title);
                      setIsEditingTitle(false);
                    }
                  }}
                />
              ) : (
                <h1
                  className="editor-title-display editable"
                  onClick={() => setIsEditingTitle(true)}
                  title="Click to rename"
                >
                  {title || 'Untitled'}
                </h1>
              )
            ) : (
              <div className="shared-title-wrap">
                <h1 className="editor-title-display">{title}</h1>
                <span className="shared-note">
                  You can edit content but not rename (shared document)
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="editor-header-right">
          <span className="save-status-indicator" id="save-status">
            {saveStatus}
          </span>

          <button id="btn-save" className="btn btn-primary" onClick={handleManualSave}>
            Save
          </button>

          {doc?.relation === 'owned' && (
            <button
              id="btn-share"
              className="btn btn-outline"
              onClick={() => setShowShareModal(true)}
            >
              Share
            </button>
          )}
        </div>
      </header>

      {/* Editor Body */}
      <main className="editor-body">
        <TipTapEditor
          content={content}
          onChange={handleContentChange}
          editable={true}
        />
      </main>

      {/* Share Modal */}
      {showShareModal && (
        <ShareModal
          docId={doc?.id}
          existingShares={doc?.shares || []}
          onClose={() => setShowShareModal(false)}
          onShareSuccess={handleShareSuccess}
        />
      )}
    </div>
  );
}
