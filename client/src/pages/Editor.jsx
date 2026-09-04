import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { docs } from '../api';
import TipTapEditor from '../components/TipTapEditor';
import ShareModal from '../components/ShareModal';
import CommentsSidebar from '../components/CommentsSidebar';
import PresenceBar from '../components/PresenceBar';
import { downloadMarkdown } from '../utils/markdownExporter';
import { usePresence } from '../hooks/usePresence';

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
  const [showComments, setShowComments] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [openCommentsCount, setOpenCommentsCount] = useState(0);
  const [selectedText, setSelectedText] = useState('');

  const debounceTimerRef = useRef(null);
  const contentRef = useRef('');
  const exportDropdownRef = useRef(null);

  const currentUserId = localStorage.getItem('userId');
  const currentUserName = localStorage.getItem('userName') || 'User';

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

  const userRole = doc?.role || (doc?.relation === 'owned' ? 'owner' : 'editor');
  const isEditable = userRole === 'owner' || userRole === 'editor';

  // Real-time Presence Hook
  const {
    collaborators,
    connected,
    remoteUpdate,
    notifyTyping,
    broadcastSaved,
    clearRemoteUpdate,
  } = usePresence(id, currentUserId, currentUserName, userRole);

  // Close export dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(e.target)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Silent auto-save content (only for owner/editor)
  const autoSaveContent = useCallback(
    async (newContent) => {
      if (!isEditable) return;
      try {
        setSaveStatus('Saving...');
        await docs.update(id, { content: newContent });
        broadcastSaved();
        setSaveStatus(`Auto-saved at ${new Date().toLocaleTimeString()}`);
      } catch (err) {
        setSaveStatus('Auto-save failed');
      }
    },
    [id, isEditable, broadcastSaved]
  );

  // Content change handler from TipTap
  const handleContentChange = (newContentJson) => {
    if (!isEditable) return;
    setContent(newContentJson);
    contentRef.current = newContentJson;

    // Trigger typing notification via WebSockets
    notifyTyping();

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
    if (!isEditable) return;
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    try {
      setSaveStatus('Saving...');
      const payload = { content: contentRef.current };
      if (userRole === 'owner') {
        payload.title = title;
      }
      const res = await docs.update(id, payload);
      setDoc(res.data);
      broadcastSaved();
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
      broadcastSaved();
      setSaveStatus(`Saved at ${new Date().toLocaleTimeString()}`);
    } catch (err) {
      setError('Failed to update title');
    }
  };

  const handleShareSuccess = (sharedUser) => {
    setDoc((prev) => {
      const existing = prev.shares || [];
      const filtered = existing.filter((u) => u.id !== sharedUser.id);
      return {
        ...prev,
        shares: [...filtered, sharedUser],
      };
    });
  };

  const handleTextSelection = (text) => {
    setSelectedText(text);
    if (text && userRole === 'commenter' && !showComments) {
      setShowComments(true);
    }
  };

  const handleExportMarkdown = () => {
    setShowExportMenu(false);
    downloadMarkdown(title, contentRef.current || content);
  };

  const handleExportPDF = () => {
    setShowExportMenu(false);
    window.print();
  };

  const handleApplyRemoteUpdate = async () => {
    clearRemoteUpdate();
    await fetchDocument();
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
      {/* Printable Title (visible only during window.print) */}
      <div className="print-title-header">
        <h1 className="print-doc-title">{title || 'Untitled'}</h1>
        <div className="print-doc-meta">Document exported from DocApp</div>
      </div>

      {/* Remote update notification banner */}
      {remoteUpdate && (
        <div className="remote-update-banner">
          <span>
            🔄 <strong>{remoteUpdate.updatedBy}</strong> just saved changes to this document.
          </span>
          <div className="remote-update-actions">
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={handleApplyRemoteUpdate}
            >
              Update View
            </button>
            <button
              type="button"
              className="remote-dismiss-btn"
              onClick={clearRemoteUpdate}
              title="Dismiss notice"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Editor Header */}
      <header className="editor-header">
        <div className="editor-header-left">
          <Link to="/" className="back-link">
            ← Back to Dashboard
          </Link>

          <div className="editor-title-row">
            <div className="editor-title-container">
              {userRole === 'owner' ? (
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
                <h1 className="editor-title-display">{title}</h1>
              )}
            </div>

            {/* Role Badge */}
            <span className={`badge badge-${userRole}`}>
              {userRole === 'owner'
                ? 'Owner'
                : userRole === 'editor'
                ? 'Editor'
                : userRole === 'commenter'
                ? 'Commenter'
                : 'Viewer'}
            </span>
          </div>

          {/* Role Status Note */}
          {userRole === 'editor' && (
            <span className="shared-note">
              You can edit content but not rename (shared document)
            </span>
          )}
        </div>

        <div className="editor-header-right">
          {/* Live Collaborators Presence Bar */}
          <PresenceBar
            collaborators={collaborators}
            currentUserId={currentUserId}
            connected={connected}
          />

          {isEditable && (
            <>
              <span className="save-status-indicator" id="save-status">
                {saveStatus}
              </span>
              <button id="btn-save" className="btn btn-primary" onClick={handleManualSave}>
                Save
              </button>
            </>
          )}

          {/* Export Dropdown Menu */}
          <div className="dropdown-container" ref={exportDropdownRef}>
            <button
              id="btn-export"
              className="btn btn-outline"
              onClick={() => setShowExportMenu((prev) => !prev)}
              title="Export document"
            >
              ⬇️ Export ▾
            </button>
            {showExportMenu && (
              <div className="dropdown-menu">
                <button
                  type="button"
                  className="dropdown-item"
                  id="btn-export-md"
                  onClick={handleExportMarkdown}
                >
                  <span className="dropdown-item-icon">📄</span>
                  <div>
                    <span className="dropdown-item-title">Export as Markdown</span>
                    <span className="dropdown-item-desc">Download standard .md file</span>
                  </div>
                </button>
                <button
                  type="button"
                  className="dropdown-item"
                  id="btn-export-pdf"
                  onClick={handleExportPDF}
                >
                  <span className="dropdown-item-icon">📑</span>
                  <div>
                    <span className="dropdown-item-title">Export as PDF</span>
                    <span className="dropdown-item-desc">Print or save as PDF document</span>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Comments Sidebar Toggle Button */}
          <button
            id="btn-toggle-comments"
            className={`btn ${showComments ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setShowComments((prev) => !prev)}
            title="Toggle comments & suggestions"
          >
            💬 Comments {openCommentsCount > 0 && <span className="comment-counter">{openCommentsCount}</span>}
          </button>

          {/* Share Button (Owner Only) */}
          {userRole === 'owner' && (
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

      {/* Mode Banner */}
      {userRole === 'commenter' && (
        <div className="mode-banner mode-banner-commenter">
          <span className="mode-icon">💡</span>
          <div>
            <strong>Suggestion & Commenting Mode:</strong> Document content is read-only.
            Highlight text and use the Comments sidebar to submit suggestions.
          </div>
        </div>
      )}

      {userRole === 'viewer' && (
        <div className="mode-banner mode-banner-viewer">
          <span className="mode-icon">👁️</span>
          <div>
            <strong>Viewing Mode:</strong> You have read-only access to view this document.
          </div>
        </div>
      )}

      {/* Main Editor Layout */}
      <div className="editor-layout-wrap">
        <main className={`editor-main-area ${showComments ? 'with-sidebar' : ''}`}>
          <TipTapEditor
            content={content}
            onChange={handleContentChange}
            editable={isEditable}
            onSelectionChange={handleTextSelection}
          />
        </main>

        {/* Comments Sidebar */}
        {showComments && (
          <CommentsSidebar
            docId={doc?.id}
            userRole={userRole}
            selectedText={selectedText}
            onClose={() => setShowComments(false)}
            onCommentCountChange={setOpenCommentsCount}
          />
        )}
      </div>

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
