import React from 'react';
import TipTapEditor from './TipTapEditor';

export default function VersionPreviewModal({
  version,
  canRestore,
  onRestore,
  onClose,
}) {
  if (!version) return null;

  const formattedDate = version.created_at
    ? new Date(version.created_at).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  const handleRestore = () => {
    if (
      window.confirm(
        `Restore document to Version #${version.version_number}? Your current editing state will be backed up.`
      )
    ) {
      onRestore(version);
    }
  };

  return (
    <div className="modal-backdrop version-preview-backdrop" onClick={onClose}>
      <div
        className="modal-card modal-preview-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar styled identical to the real Editor's header */}
        <div className="preview-top-bar">
          <div className="preview-top-left">
            <div className="preview-title-row">
              <span className="preview-doc-title">
                {version.title || 'Untitled'}
              </span>
              <span className="badge badge-version-num">
                v{version.version_number}
              </span>
              <span className="badge badge-preview-status">
                Preview Mode
              </span>
              {version.label && (
                <span className="preview-label-tag">
                  🏷️ {version.label}
                </span>
              )}
            </div>
            <div className="preview-submeta-row">
              <span>📅 Saved {formattedDate}</span>
              {version.author_name && (
                <span className="preview-author-tag">
                  <span className="user-avatar-circle mini">
                    {version.author_name[0]}
                  </span>
                  <span>{version.author_name}</span>
                </span>
              )}
              <span className="preview-draft-safe-pill">
                🛡️ Active draft preserved
              </span>
            </div>
          </div>

          <div className="preview-top-right">
            {canRestore && (
              <button
                type="button"
                id="btn-restore-version"
                className="btn btn-primary btn-sm"
                onClick={handleRestore}
              >
                Restore this version
              </button>
            )}
            <button
              type="button"
              id="btn-exit-preview"
              className="btn btn-outline btn-sm"
              onClick={onClose}
            >
              Exit Preview
            </button>
            <button
              type="button"
              className="preview-close-btn"
              onClick={onClose}
              title="Close Preview (Esc)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Editor Workspace: identical to the real editor layout */}
        <div className="preview-workspace">
          <div className="preview-editor-container">
            <TipTapEditor
              content={version.content}
              editable={false}
              showPreviewToolbar={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
