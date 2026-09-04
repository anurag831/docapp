const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('../db');

// Ensure upload directory exists
const uploadDir = path.resolve(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const upload = multer({ dest: uploadDir });

// Middleware: all routes require x-user-id header
router.use((req, res, next) => {
  const userIdHeader = req.headers['x-user-id'];
  if (!userIdHeader) {
    return res.status(401).json({ error: 'x-user-id header is required' });
  }
  const userId = parseInt(userIdHeader, 10);
  if (isNaN(userId)) {
    return res.status(401).json({ error: 'Invalid x-user-id header' });
  }
  req.userId = userId;
  next();
});

// Helper to fetch single document with access check and user's role
function getDocumentWithAccess(docId, userId) {
  const doc = db.prepare(`
    SELECT 
      d.id,
      d.title,
      d.content,
      d.owner_id,
      d.created_at,
      d.updated_at,
      u.name AS owner_name,
      CASE 
        WHEN d.owner_id = ? THEN 'owned'
        ELSE 'shared'
      END AS relation,
      CASE
        WHEN d.owner_id = ? THEN 'owner'
        ELSE COALESCE(s.role, 'editor')
      END AS role
    FROM documents d
    JOIN users u ON d.owner_id = u.id
    LEFT JOIN shares s ON d.id = s.document_id AND s.shared_with = ?
    WHERE d.id = ? AND (d.owner_id = ? OR s.id IS NOT NULL)
  `).get(userId, userId, userId, docId, userId);

  if (doc) {
    doc.shares = db.prepare(`
      SELECT u.id, u.name, u.email, COALESCE(s.role, 'editor') AS role
      FROM shares s
      JOIN users u ON s.shared_with = u.id
      WHERE s.document_id = ?
    `).all(docId);
  }

  return doc;
}

// POST /api/documents/upload - REGISTERED BEFORE /:id ROUTES
router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const originalname = req.file.originalname;
  const ext = path.extname(originalname).toLowerCase();
  if (ext !== '.txt' && ext !== '.md') {
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(400).json({ error: 'Only .txt and .md files are allowed' });
  }

  const fileContent = fs.readFileSync(req.file.path, 'utf8');
  if (fs.existsSync(req.file.path)) {
    fs.unlinkSync(req.file.path);
  }

  const lines = fileContent.split(/\r?\n/);
  const paragraphs = lines
    .filter(line => line.length > 0)
    .map(line => ({
      type: 'paragraph',
      content: [{ type: 'text', text: line }]
    }));

  const docJson = {
    type: 'doc',
    content: paragraphs
  };

  const title = path.basename(originalname, path.extname(originalname));
  const content = JSON.stringify(docJson);

  const stmt = db.prepare('INSERT INTO documents (title, content, owner_id) VALUES (?, ?, ?)');
  const result = stmt.run(title, content, req.userId);

  res.json({ id: result.lastInsertRowid, title });
});

// GET /api/documents - list visible documents with role
router.get('/', (req, res) => {
  const documents = db.prepare(`
    SELECT 
      d.id,
      d.title,
      d.content,
      d.owner_id,
      d.created_at,
      d.updated_at,
      u.name AS owner_name,
      CASE 
        WHEN d.owner_id = ? THEN 'owned'
        ELSE 'shared'
      END AS relation,
      CASE
        WHEN d.owner_id = ? THEN 'owner'
        ELSE COALESCE(s.role, 'editor')
      END AS role
    FROM documents d
    JOIN users u ON d.owner_id = u.id
    LEFT JOIN shares s ON d.id = s.document_id AND s.shared_with = ?
    WHERE d.owner_id = ? OR s.id IS NOT NULL
    ORDER BY d.updated_at DESC
  `).all(req.userId, req.userId, req.userId, req.userId);

  res.json(documents);
});

// POST /api/documents - create blank/new document
router.post('/', (req, res) => {
  const { title, content } = req.body || {};
  const docTitle = title !== undefined && title.trim() !== '' ? title.trim() : 'Untitled';
  const docContent = content !== undefined ? content : '';

  const stmt = db.prepare('INSERT INTO documents (title, content, owner_id) VALUES (?, ?, ?)');
  const result = stmt.run(docTitle, docContent, req.userId);

  res.json({
    id: result.lastInsertRowid,
    title: docTitle,
    content: docContent
  });
});

// GET /api/documents/:id - retrieve document
router.get('/:id', (req, res) => {
  const docId = parseInt(req.params.id, 10);
  if (isNaN(docId)) {
    return res.status(404).json({ error: 'Document not found' });
  }

  const doc = getDocumentWithAccess(docId, req.userId);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found or access denied' });
  }

  res.json(doc);
});

// PUT /api/documents/:id - update document with role permissions
router.put('/:id', (req, res) => {
  const docId = parseInt(req.params.id, 10);
  if (isNaN(docId)) {
    return res.status(404).json({ error: 'Document not found' });
  }

  const existingDoc = getDocumentWithAccess(docId, req.userId);
  if (!existingDoc) {
    return res.status(404).json({ error: 'Document not found or access denied' });
  }

  // Permission checks based on role
  if (existingDoc.role === 'viewer') {
    return res.status(403).json({ error: 'Viewers have read-only access and cannot edit this document' });
  }

  if (existingDoc.role === 'commenter') {
    return res.status(403).json({ error: 'Commenters cannot edit document content directly. Use comments to suggest changes' });
  }

  const { title, content } = req.body || {};

  let updatedTitle = existingDoc.title;
  // Only owner can update title
  if (existingDoc.role === 'owner' && title !== undefined) {
    updatedTitle = title.trim() !== '' ? title.trim() : 'Untitled';
  }

  let updatedContent = existingDoc.content;
  if (content !== undefined) {
    updatedContent = content;
  }

  db.prepare(`
    UPDATE documents 
    SET title = ?, content = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(updatedTitle, updatedContent, docId);

  const updatedDoc = getDocumentWithAccess(docId, req.userId);
  res.json(updatedDoc);
});

// DELETE /api/documents/:id - owner only
router.delete('/:id', (req, res) => {
  const docId = parseInt(req.params.id, 10);
  if (isNaN(docId)) {
    return res.status(404).json({ error: 'Document not found' });
  }

  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(docId);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }

  if (doc.owner_id !== req.userId) {
    return res.status(403).json({ error: 'Only the owner can delete this document' });
  }

  db.prepare('DELETE FROM shares WHERE document_id = ?').run(docId);
  db.prepare('DELETE FROM comments WHERE document_id = ?').run(docId);
  db.prepare('DELETE FROM documents WHERE id = ?').run(docId);

  res.json({ success: true });
});

// POST /api/documents/:id/share - share document with specific role (editor, commenter, viewer)
router.post('/:id/share', (req, res) => {
  const docId = parseInt(req.params.id, 10);
  if (isNaN(docId)) {
    return res.status(404).json({ error: 'Document not found' });
  }

  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(docId);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }

  if (doc.owner_id !== req.userId) {
    return res.status(403).json({ error: 'Only the owner can share this document' });
  }

  const { shareWithEmail, role = 'editor' } = req.body || {};
  if (!shareWithEmail) {
    return res.status(400).json({ error: 'shareWithEmail is required' });
  }

  const validRoles = ['editor', 'commenter', 'viewer'];
  const targetRole = validRoles.includes(role) ? role : 'editor';

  const targetUser = db.prepare('SELECT id, name, email FROM users WHERE email = ?').get(shareWithEmail);
  if (!targetUser) {
    return res.status(404).json({ error: 'Target user not found' });
  }

  if (targetUser.id === req.userId) {
    return res.status(400).json({ error: 'Cannot share document with yourself' });
  }

  db.prepare(`
    INSERT INTO shares (document_id, shared_with, role) 
    VALUES (?, ?, ?)
    ON CONFLICT(document_id, shared_with) DO UPDATE SET role = excluded.role
  `).run(docId, targetUser.id, targetRole);

  res.json({ success: true, sharedWith: targetUser.name, role: targetRole });
});

// DELETE /api/documents/:id/share/:targetUserId - revoke share access
router.delete('/:id/share/:targetUserId', (req, res) => {
  const docId = parseInt(req.params.id, 10);
  const targetUserId = parseInt(req.params.targetUserId, 10);
  if (isNaN(docId) || isNaN(targetUserId)) {
    return res.status(400).json({ error: 'Invalid parameters' });
  }

  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(docId);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }

  if (doc.owner_id !== req.userId) {
    return res.status(403).json({ error: 'Only the owner can manage document sharing' });
  }

  db.prepare('DELETE FROM shares WHERE document_id = ? AND shared_with = ?').run(docId, targetUserId);
  res.json({ success: true });
});

// ==========================================
// COMMENTS & SUGGESTIONS API
// ==========================================

// GET /api/documents/:id/comments - retrieve all comments for document
router.get('/:id/comments', (req, res) => {
  const docId = parseInt(req.params.id, 10);
  if (isNaN(docId)) {
    return res.status(404).json({ error: 'Document not found' });
  }

  const doc = getDocumentWithAccess(docId, req.userId);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found or access denied' });
  }

  const comments = db.prepare(`
    SELECT 
      c.id,
      c.document_id,
      c.user_id,
      c.text,
      c.selected_text,
      c.status,
      c.created_at,
      u.name AS author_name,
      u.email AS author_email
    FROM comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.document_id = ?
    ORDER BY c.created_at ASC
  `).all(docId);

  res.json(comments);
});

// POST /api/documents/:id/comments - add a comment or suggestion
router.post('/:id/comments', (req, res) => {
  const docId = parseInt(req.params.id, 10);
  if (isNaN(docId)) {
    return res.status(404).json({ error: 'Document not found' });
  }

  const doc = getDocumentWithAccess(docId, req.userId);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found or access denied' });
  }

  if (doc.role === 'viewer') {
    return res.status(403).json({ error: 'Viewers have read-only access and cannot comment' });
  }

  const { text, selected_text } = req.body || {};
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Comment text is required' });
  }

  const stmt = db.prepare(`
    INSERT INTO comments (document_id, user_id, text, selected_text, status)
    VALUES (?, ?, ?, ?, 'open')
  `);
  const result = stmt.run(docId, req.userId, text.trim(), selected_text || null);

  const newComment = db.prepare(`
    SELECT 
      c.id,
      c.document_id,
      c.user_id,
      c.text,
      c.selected_text,
      c.status,
      c.created_at,
      u.name AS author_name,
      u.email AS author_email
    FROM comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.id = ?
  `).get(result.lastInsertRowid);

  res.json(newComment);
});

// PATCH /api/documents/:id/comments/:commentId - toggle status (open/resolved)
router.patch('/:id/comments/:commentId', (req, res) => {
  const docId = parseInt(req.params.id, 10);
  const commentId = parseInt(req.params.commentId, 10);
  if (isNaN(docId) || isNaN(commentId)) {
    return res.status(400).json({ error: 'Invalid parameters' });
  }

  const doc = getDocumentWithAccess(docId, req.userId);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found or access denied' });
  }

  if (doc.role === 'viewer') {
    return res.status(403).json({ error: 'Viewers cannot modify comments' });
  }

  const comment = db.prepare('SELECT * FROM comments WHERE id = ? AND document_id = ?').get(commentId, docId);
  if (!comment) {
    return res.status(404).json({ error: 'Comment not found' });
  }

  const { status } = req.body || {};
  const newStatus = status === 'resolved' ? 'resolved' : 'open';

  db.prepare('UPDATE comments SET status = ? WHERE id = ?').run(newStatus, commentId);

  const updatedComment = db.prepare(`
    SELECT 
      c.id,
      c.document_id,
      c.user_id,
      c.text,
      c.selected_text,
      c.status,
      c.created_at,
      u.name AS author_name,
      u.email AS author_email
    FROM comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.id = ?
  `).get(commentId);

  res.json(updatedComment);
});

// DELETE /api/documents/:id/comments/:commentId - delete comment
router.delete('/:id/comments/:commentId', (req, res) => {
  const docId = parseInt(req.params.id, 10);
  const commentId = parseInt(req.params.commentId, 10);
  if (isNaN(docId) || isNaN(commentId)) {
    return res.status(400).json({ error: 'Invalid parameters' });
  }

  const doc = getDocumentWithAccess(docId, req.userId);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found or access denied' });
  }

  const comment = db.prepare('SELECT * FROM comments WHERE id = ? AND document_id = ?').get(commentId, docId);
  if (!comment) {
    return res.status(404).json({ error: 'Comment not found' });
  }

  // Only author or document owner can delete comment
  if (comment.user_id !== req.userId && doc.role !== 'owner') {
    return res.status(403).json({ error: 'Only the comment author or document owner can delete this comment' });
  }

  db.prepare('DELETE FROM comments WHERE id = ?').run(commentId);
  res.json({ success: true });
});

module.exports = router;
