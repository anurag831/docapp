import React, { useEffect } from 'react';
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

export default function TipTapEditor({
  content,
  onChange,
  editable = true,
  onSelectionChange,
}) {
  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content: parseInitialContent(content),
    editable,
    onUpdate: ({ editor }) => {
      if (onChange) {
        onChange(JSON.stringify(editor.getJSON()));
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

  // Keep editor content in sync when loaded/changed externally
  useEffect(() => {
    if (!editor) return;
    const currentJson = JSON.stringify(editor.getJSON());
    const parsed = parseInitialContent(content);
    const parsedJson = typeof parsed === 'object' ? JSON.stringify(parsed) : parsed;

    if (parsedJson && parsedJson !== currentJson) {
      editor.commands.setContent(parsed, false);
    }
  }, [content, editor]);

  if (!editor) {
    return <div className="editor-loading">Loading editor...</div>;
  }

  return (
    <div className={`tiptap-wrapper ${!editable ? 'readonly-mode' : ''}`}>
      {/* Show toolbar when editable */}
      {editable && (
        <div className="editor-toolbar">
          <button
            type="button"
            id="btn-bold"
            className={`toolbar-btn ${editor.isActive('bold') ? 'is-active' : ''}`}
            onMouseDown={(e) => {
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
            className={`toolbar-btn ${editor.isActive('italic') ? 'is-active' : ''}`}
            onMouseDown={(e) => {
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
            className={`toolbar-btn ${editor.isActive('underline') ? 'is-active' : ''}`}
            onMouseDown={(e) => {
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
            className={`toolbar-btn ${editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}`}
            onMouseDown={(e) => {
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
            className={`toolbar-btn ${editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}`}
            onMouseDown={(e) => {
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
            className={`toolbar-btn ${editor.isActive('heading', { level: 3 }) ? 'is-active' : ''}`}
            onMouseDown={(e) => {
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
            className={`toolbar-btn ${editor.isActive('bulletList') ? 'is-active' : ''}`}
            onMouseDown={(e) => {
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
            className={`toolbar-btn ${editor.isActive('orderedList') ? 'is-active' : ''}`}
            onMouseDown={(e) => {
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
            className={`toolbar-btn ${editor.isActive('blockquote') ? 'is-active' : ''}`}
            onMouseDown={(e) => {
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
            className="toolbar-btn"
            onMouseDown={(e) => {
              e.preventDefault();
              editor.chain().focus().setHorizontalRule().run();
            }}
            title="Horizontal Rule"
          >
            —
          </button>
        </div>
      )}

      <div className="editor-content-container">
        <EditorContent editor={editor} className="tiptap-editor-area" />
      </div>
    </div>
  );
}
