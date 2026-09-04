/**
 * Converts TipTap ProseMirror JSON content to clean Markdown.
 */
export function tiptapJsonToMarkdown(jsonContent) {
  if (!jsonContent) return '';
  let doc = jsonContent;
  if (typeof jsonContent === 'string') {
    try {
      doc = JSON.parse(jsonContent);
    } catch (e) {
      return jsonContent;
    }
  }

  if (!doc || !doc.content || !Array.isArray(doc.content)) {
    return '';
  }

  function renderInline(node) {
    if (!node) return '';
    if (node.type === 'text') {
      let text = node.text || '';
      if (node.marks && Array.isArray(node.marks)) {
        for (const mark of node.marks) {
          if (mark.type === 'bold') text = `**${text}**`;
          else if (mark.type === 'italic') text = `*${text}*`;
          else if (mark.type === 'underline') text = `<u>${text}</u>`;
        }
      }
      return text;
    }
    if (node.type === 'hardBreak') return '\n';
    return '';
  }

  function renderNode(node) {
    if (!node) return '';

    switch (node.type) {
      case 'paragraph': {
        const text = (node.content || []).map(renderInline).join('');
        return text;
      }
      case 'heading': {
        const level = node.attrs?.level || 1;
        const prefix = '#'.repeat(level);
        const text = (node.content || []).map(renderInline).join('');
        return `${prefix} ${text}`;
      }
      case 'bulletList': {
        return (node.content || [])
          .map((item) => {
            const inner = (item.content || [])
              .map((p) => (p.content || []).map(renderInline).join(''))
              .join('\n  ');
            return `- ${inner}`;
          })
          .join('\n');
      }
      case 'orderedList': {
        const start = node.attrs?.start || 1;
        return (node.content || [])
          .map((item, idx) => {
            const inner = (item.content || [])
              .map((p) => (p.content || []).map(renderInline).join(''))
              .join('\n  ');
            return `${start + idx}. ${inner}`;
          })
          .join('\n');
      }
      case 'blockquote': {
        const text = (node.content || [])
          .map((p) => (p.content || []).map(renderInline).join(''))
          .join('\n> ');
        return `> ${text}`;
      }
      case 'horizontalRule': {
        return '---';
      }
      default: {
        if (node.content) {
          return node.content.map(renderNode).join('\n\n');
        }
        return '';
      }
    }
  }

  return doc.content.map(renderNode).filter(Boolean).join('\n\n');
}

/**
 * Triggers client-side download of document as Markdown (.md).
 */
export function downloadMarkdown(title, jsonContent) {
  const md = tiptapJsonToMarkdown(jsonContent);
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeTitle = (title || 'document').replace(/[/\\?%*:|"<>]/g, '-');
  a.download = `${safeTitle}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
