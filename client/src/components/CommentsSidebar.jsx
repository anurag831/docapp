import React, { useEffect, useState, useCallback } from 'react';
import { comments } from '../api';

export default function CommentsSidebar({
  docId,
  userRole,
  selectedText = '',
  onClose,
  onCommentCountChange,
}) {
  const [commentList, setCommentList] = useState([]);
  const [newText, setNewText] = useState('');
  const [quoteText, setQuoteText] = useState(selectedText);
  const [filter, setFilter] = useState('open'); // 'all' | 'open' | 'resolved'
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const currentUserId = parseInt(localStorage.getItem('userId'), 10);

  // Sync quoted text if user selected new text in editor
  useEffect(() => {
    if (selectedText) {
      setQuoteText(selectedText);
    }
  }, [selectedText]);

  const fetchComments = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await comments.getAll(docId);
      setCommentList(res.data);
      const openCount = res.data.filter((c) => c.status === 'open').length;
      if (onCommentCountChange) {
        onCommentCountChange(openCount);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load comments');
    } finally {
      setLoading(false);
    }
  }, [docId, onCommentCountChange]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newText.trim()) return;

    try {
      setSubmitting(true);
      setError('');
      const res = await comments.create(docId, {
        text: newText.trim(),
        selected_text: quoteText ? quoteText.trim() : null,
      });

      setCommentList((prev) => {
        const updated = [...prev, res.data];
        const openCount = updated.filter((c) => c.status === 'open').length;
        if (onCommentCountChange) onCommentCountChange(openCount);
        return updated;
      });

      setNewText('');
      setQuoteText('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (comment) => {
    const nextStatus = comment.status === 'open' ? 'resolved' : 'open';
    try {
      const res = await comments.updateStatus(docId, comment.id, nextStatus);
      setCommentList((prev) => {
        const updated = prev.map((c) => (c.id === comment.id ? res.data : c));
        const openCount = updated.filter((c) => c.status === 'open').length;
        if (onCommentCountChange) onCommentCountChange(openCount);
        return updated;
      });
    } catch (err) {
      setError('Failed to update status');
    }
  };

  const handleDelete = async (commentId) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await comments.delete(docId, commentId);
      setCommentList((prev) => {
        const updated = prev.filter((c) => c.id !== commentId);
        const openCount = updated.filter((c) => c.status === 'open').length;
        if (onCommentCountChange) onCommentCountChange(openCount);
        return updated;
      });
    } catch (err) {
      setError('Failed to delete comment');
    }
  };

  const filteredComments = commentList.filter((c) => {
    if (filter === 'all') return true;
    return c.status === filter;
  });

  const canComment = userRole !== 'viewer';

  return (
    <aside className="comments-sidebar">
      <div className="comments-header">
        <div className="comments-title-wrap">
          <span className="comments-icon">💬</span>
          <h2 className="comments-title">Comments & Suggestions</h2>
        </div>
        <button className="comments-close-btn" onClick={onClose} title="Close comments">
          ✕
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="comments-tabs">
        <button
          className={`comments-tab ${filter === 'open' ? 'active' : ''}`}
          onClick={() => setFilter('open')}
        >
          Open ({commentList.filter((c) => c.status === 'open').length})
        </button>
        <button
          className={`comments-tab ${filter === 'resolved' ? 'active' : ''}`}
          onClick={() => setFilter('resolved')}
        >
          Resolved ({commentList.filter((c) => c.status === 'resolved').length})
        </button>
        <button
          className={`comments-tab ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All ({commentList.length})
        </button>
      </div>

      {error && <div className="comments-error">{error}</div>}

      {/* Add New Comment / Suggestion */}
      {canComment ? (
        <form className="comment-form" onSubmit={handleAddComment}>
          {quoteText && (
            <div className="quoted-selection-banner">
              <span className="quote-label">Referenced text:</span>
              <p className="quote-content">"{quoteText}"</p>
              <button
                type="button"
                className="quote-clear-btn"
                onClick={() => setQuoteText('')}
                title="Remove excerpt reference"
              >
                ✕
              </button>
            </div>
          )}

          <textarea
            className="comment-input"
            placeholder={
              quoteText
                ? 'Add a suggestion or comment on referenced text...'
                : 'Add a comment or suggestion for this document...'
            }
            rows={3}
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
          />

          <div className="comment-form-actions">
            <button
              type="submit"
              id="btn-add-comment"
              className="btn btn-primary btn-sm"
              disabled={submitting || !newText.trim()}
            >
              {submitting ? 'Posting...' : 'Comment'}
            </button>
          </div>
        </form>
      ) : (
        <div className="viewer-comment-notice">
          👁️ You are viewing this document in read-only mode. Comments cannot be submitted.
        </div>
      )}

      {/* Comments List */}
      <div className="comments-list-container">
        {loading ? (
          <div className="comments-loading">Loading comments...</div>
        ) : filteredComments.length === 0 ? (
          <div className="comments-empty">
            {filter === 'open'
              ? 'No open comments or suggestions.'
              : filter === 'resolved'
              ? 'No resolved comments.'
              : 'No comments on this document yet.'}
          </div>
        ) : (
          filteredComments.map((comment) => {
            const isAuthor = comment.user_id === currentUserId;
            const canDelete = isAuthor || userRole === 'owner';
            const canResolve = userRole !== 'viewer';

            return (
              <div
                key={comment.id}
                className={`comment-card ${comment.status === 'resolved' ? 'resolved' : ''}`}
              >
                <div className="comment-card-header">
                  <div className="comment-author-info">
                    <span className="user-avatar-circle small">
                      {comment.author_name ? comment.author_name[0] : 'U'}
                    </span>
                    <div>
                      <span className="comment-author-name">{comment.author_name}</span>
                      <span className="comment-date">
                        {new Date(comment.created_at).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`badge ${
                      comment.status === 'resolved' ? 'badge-resolved' : 'badge-open'
                    }`}
                  >
                    {comment.status === 'resolved' ? 'Resolved' : 'Open'}
                  </span>
                </div>

                {comment.selected_text && (
                  <blockquote className="comment-quote">
                    "{comment.selected_text}"
                  </blockquote>
                )}

                <div className="comment-body">{comment.text}</div>

                <div className="comment-card-footer">
                  {canResolve && (
                    <button
                      type="button"
                      className="btn-link"
                      onClick={() => handleToggleStatus(comment)}
                    >
                      {comment.status === 'open' ? '✓ Resolve' : '↺ Re-open'}
                    </button>
                  )}

                  {canDelete && (
                    <button
                      type="button"
                      className="btn-link btn-danger-link"
                      onClick={() => handleDelete(comment.id)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
