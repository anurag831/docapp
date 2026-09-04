import React, { useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';

function parseInitialContent(raw) {
  if (!raw) return '';
  if (typeof raw === 'object') return raw;
  try {
    const parsed = JSON.parse(raw);
    return parsed;
  } catch (err) {
    return raw;
  }
}

function isContentEmpty(raw) {
  if (!raw) return true;
  if (typeof raw === 'string' && raw.trim() === '') return true;

  let obj = raw;
  if (typeof raw === 'string') {
    try {
      obj = JSON.parse(raw);
    } catch {
      return raw.trim() === '';
    }
  }

  if (typeof obj === 'object' && obj !== null) {
    if (obj.type === 'doc') {
      if (!obj.content || obj.content.length === 0) return true;
      if (
        obj.content.length === 1 &&
        obj.content[0].type === 'paragraph' &&
        (!obj.content[0].content || obj.content[0].content.length === 0)
      ) {
        return true;
      }
    }
  }

  return false;
}

export default function TipTapEditor({
  content,
  onChange,
  editable = true,
  showPreviewToolbar = false,
  onSelectionChange,
}) {
  const isSettingContentRef = useRef(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content: parseInitialContent(content),
    editable,
    onUpdate: ({ editor }) => {
      if (isSettingContentRef.current) return;
      if (onChangeRef.current) {
        onChangeRef.current(JSON.stringify(editor.getJSON()));
      }
    },
    onSelectionUpdate: ({ editor }) => {
      if (onSelectionChange) {
        const { from, to } = editor.state.selection;
        if (from !== to) {
          const selectedText = editor.state.doc.textBetween(from, to, ' ');
          onSelectionChange(selectedText);
        } else {
          onSelectionChange('');
        }
      }
    },
  });

  // Keep editor editable state in sync
  useEffect(() => {
    if (editor && editor.isEditable !== editable) {
      editor.setEditable(editable);
    }
  }, [editable, editor]);

  // Keep editor content in sync when loaded/changed externally (including previewing & exiting preview)
  useEffect(() => {
    if (!editor) return;

    const targetEmpty = isContentEmpty(content);
    if (targetEmpty) {
      if (!editor.isEmpty) {
        isSettingContentRef.current = true;
        editor.commands.setContent('', false);
        setTimeout(() => {
          isSettingContentRef.current = false;
        }, 50);
      }
      return;
    }

    const currentJson = JSON.stringify(editor.getJSON());
    const parsed = parseInitialContent(content);
    const parsedJson = typeof parsed === 'object' ? JSON.stringify(parsed) : parsed;

    if (parsedJson !== currentJson) {
      isSettingContentRef.current = true;
      editor.commands.setContent(parsed, false);
      setTimeout(() => {
        isSettingContentRef.current = false;
      }, 50);
    }
  }, [content, editor]);

  if (!editor) {
    return <div className="editor-loading">Loading editor...</div>;
  }

  const renderToolbar = editable || showPreviewToolbar;

  return (
    <div className={`tiptap-wrapper ${!editable && !showPreviewToolbar ? 'readonly-mode' : ''}`}>
      {/* Show toolbar when editable or in preview */}
      {renderToolbar && (
        <div className={`editor-toolbar ${!editable ? 'preview-toolbar' : ''}`}>
          <button
            type="button"
            id="btn-bold"
            disabled={!editable}
            className={`toolbar-btn ${editor.isActive('bold') ? 'is-active' : ''}`}
            onMouseDown={(e) => {
              if (!editable) return;
              e.preventDefault();
              editor.chain().focus().toggleBold().run();
            }}
            title="Bold"
          >
            <strong>B</strong>
          </button>

          <button
            type="button"
            id="btn-italic"
            disabled={!editable}
            className={`toolbar-btn ${editor.isActive('italic') ? 'is-active' : ''}`}
            onMouseDown={(e) => {
              if (!editable) return;
              e.preventDefault();
              editor.chain().focus().toggleItalic().run();
            }}
            title="Italic"
          >
            <em>I</em>
          </button>

          <button
            type="button"
            id="btn-underline"
            disabled={!editable}
            className={`toolbar-btn ${editor.isActive('underline') ? 'is-active' : ''}`}
            onMouseDown={(e) => {
              if (!editable) return;
              e.preventDefault();
              editor.chain().focus().toggleUnderline().run();
            }}
            title="Underline"
          >
            <u>U</u>
          </button>

          <span className="toolbar-separator" />

          <button
            type="button"
            id="btn-h1"
            disabled={!editable}
            className={`toolbar-btn ${editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}`}
            onMouseDown={(e) => {
              if (!editable) return;
              e.preventDefault();
              editor.chain().focus().toggleHeading({ level: 1 }).run();
            }}
            title="Heading 1"
          >
            H1
          </button>

          <button
            type="button"
            id="btn-h2"
            disabled={!editable}
            className={`toolbar-btn ${editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}`}
            onMouseDown={(e) => {
              if (!editable) return;
              e.preventDefault();
              editor.chain().focus().toggleHeading({ level: 2 }).run();
            }}
            title="Heading 2"
          >
            H2
          </button>

          <button
            type="button"
            id="btn-h3"
            disabled={!editable}
            className={`toolbar-btn ${editor.isActive('heading', { level: 3 }) ? 'is-active' : ''}`}
            onMouseDown={(e) => {
              if (!editable) return;
              e.preventDefault();
              editor.chain().focus().toggleHeading({ level: 3 }).run();
            }}
            title="Heading 3"
          >
            H3
          </button>

          <span className="toolbar-separator" />

          <button
            type="button"
            id="btn-bullet-list"
            disabled={!editable}
            className={`toolbar-btn ${editor.isActive('bulletList') ? 'is-active' : ''}`}
            onMouseDown={(e) => {
              if (!editable) return;
              e.preventDefault();
              editor.chain().focus().toggleBulletList().run();
            }}
            title="Bullet List"
          >
            • List
          </button>

          <button
            type="button"
            id="btn-ordered-list"
            disabled={!editable}
            className={`toolbar-btn ${editor.isActive('orderedList') ? 'is-active' : ''}`}
            onMouseDown={(e) => {
              if (!editable) return;
              e.preventDefault();
              editor.chain().focus().toggleOrderedList().run();
            }}
            title="Numbered List"
          >
            1. List
          </button>

          <span className="toolbar-separator" />

          <button
            type="button"
            id="btn-blockquote"
            disabled={!editable}
            className={`toolbar-btn ${editor.isActive('blockquote') ? 'is-active' : ''}`}
            onMouseDown={(e) => {
              if (!editable) return;
              e.preventDefault();
              editor.chain().focus().toggleBlockquote().run();
            }}
            title="Blockquote"
          >
            " "
          </button>

          <button
            type="button"
            id="btn-horizontal-rule"
            disabled={!editable}
            className="toolbar-btn"
            onMouseDown={(e) => {
              if (!editable) return;
              e.preventDefault();
              editor.chain().focus().setHorizontalRule().run();
            }}
            title="Horizontal Rule"
          >
            —
          </button>

          {!editable && (
            <span className="preview-toolbar-badge">
              🔒 Read-Only Snapshot
            </span>
          )}
        </div>
      )}

      <div className="editor-content-container">
        <EditorContent editor={editor} className="tiptap-editor-area" />
      </div>
    </div>
  );
}
