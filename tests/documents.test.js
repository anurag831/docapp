const request = require('supertest');
const app = require('../server/index');
const db = require('../server/db');

describe('Documents API', () => {
  beforeEach(() => {
    db.prepare('DELETE FROM comments').run();
    db.prepare('DELETE FROM document_versions').run();
    db.prepare('DELETE FROM shares').run();
    db.prepare('DELETE FROM documents').run();
    const insertUser = db.prepare('INSERT OR IGNORE INTO users (id, name, email) VALUES (?, ?, ?)');
    insertUser.run(1, 'Alice', 'alice@demo.com');
    insertUser.run(2, 'Bob', 'bob@demo.com');
    insertUser.run(3, 'Carol', 'carol@demo.com');
  });

  afterAll(() => {
    db.close();
  });

  // Original required tests
  test('POST /api/documents creates a document (x-user-id: 1)', async () => {
    const res = await request(app)
      .post('/api/documents')
      .set('x-user-id', '1')
      .send({ title: 'Test Document', content: '{"type":"doc","content":[]}' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id');
    expect(res.body.title).toBe('Test Document');
  });

  test('GET /api/documents/:id retrieves it (x-user-id: 1)', async () => {
    const createRes = await request(app)
      .post('/api/documents')
      .set('x-user-id', '1')
      .send({ title: 'Alice Doc', content: '' });

    const docId = createRes.body.id;

    const getRes = await request(app)
      .get(`/api/documents/${docId}`)
      .set('x-user-id', '1');

    expect(getRes.status).toBe(200);
    expect(getRes.body.id).toBe(docId);
    expect(getRes.body.title).toBe('Alice Doc');
    expect(getRes.body.relation).toBe('owned');
  });

  test('GET /api/documents/:id returns 404 for non-owner/non-shared user (x-user-id: 2)', async () => {
    const createRes = await request(app)
      .post('/api/documents')
      .set('x-user-id', '1')
      .send({ title: 'Private Doc', content: '' });

    const docId = createRes.body.id;

    const getRes = await request(app)
      .get(`/api/documents/${docId}`)
      .set('x-user-id', '2');

    expect(getRes.status).toBe(404);
  });

  test('POST /api/documents/:id/share shares with user 2; then GET by user 2 returns 200', async () => {
    const createRes = await request(app)
      .post('/api/documents')
      .set('x-user-id', '1')
      .send({ title: 'Shared Doc', content: '' });

    const docId = createRes.body.id;

    const shareRes = await request(app)
      .post(`/api/documents/${docId}/share`)
      .set('x-user-id', '1')
      .send({ shareWithEmail: 'bob@demo.com' });

    expect(shareRes.status).toBe(200);
    expect(shareRes.body.success).toBe(true);
    expect(shareRes.body.sharedWith).toBe('Bob');

    const getRes = await request(app)
      .get(`/api/documents/${docId}`)
      .set('x-user-id', '2');

    expect(getRes.status).toBe(200);
    expect(getRes.body.id).toBe(docId);
    expect(getRes.body.relation).toBe('shared');
  });

  // Role-Based Sharing Permissions tests
  describe('Role-Based Permissions & Sharing', () => {
    test('Can share with specific roles (commenter, viewer)', async () => {
      const createRes = await request(app)
        .post('/api/documents')
        .set('x-user-id', '1')
        .send({ title: 'Role Doc', content: '' });
      const docId = createRes.body.id;

      // Share with Bob as commenter
      const shareBob = await request(app)
        .post(`/api/documents/${docId}/share`)
        .set('x-user-id', '1')
        .send({ shareWithEmail: 'bob@demo.com', role: 'commenter' });
      expect(shareBob.status).toBe(200);
      expect(shareBob.body.role).toBe('commenter');

      // Bob retrieves doc with role: commenter
      const bobDoc = await request(app)
        .get(`/api/documents/${docId}`)
        .set('x-user-id', '2');
      expect(bobDoc.status).toBe(200);
      expect(bobDoc.body.role).toBe('commenter');

      // Commenter cannot edit document content directly
      const bobEdit = await request(app)
        .put(`/api/documents/${docId}`)
        .set('x-user-id', '2')
        .send({ content: 'new content' });
      expect(bobEdit.status).toBe(403);

      // Share with Carol as viewer
      const shareCarol = await request(app)
        .post(`/api/documents/${docId}/share`)
        .set('x-user-id', '1')
        .send({ shareWithEmail: 'carol@demo.com', role: 'viewer' });
      expect(shareCarol.status).toBe(200);
      expect(shareCarol.body.role).toBe('viewer');

      // Viewer cannot edit document content
      const carolEdit = await request(app)
        .put(`/api/documents/${docId}`)
        .set('x-user-id', '3')
        .send({ content: 'new content' });
      expect(carolEdit.status).toBe(403);
    });

    test('Owner can revoke shared access', async () => {
      const createRes = await request(app)
        .post('/api/documents')
        .set('x-user-id', '1')
        .send({ title: 'Doc to Revoke', content: '' });
      const docId = createRes.body.id;

      await request(app)
        .post(`/api/documents/${docId}/share`)
        .set('x-user-id', '1')
        .send({ shareWithEmail: 'bob@demo.com' });

      const revokeRes = await request(app)
        .delete(`/api/documents/${docId}/share/2`)
        .set('x-user-id', '1');
      expect(revokeRes.status).toBe(200);
      expect(revokeRes.body.success).toBe(true);

      const getRes = await request(app)
        .get(`/api/documents/${docId}`)
        .set('x-user-id', '2');
      expect(getRes.status).toBe(404);
    });
  });

  // Comments and Suggestions API tests
  describe('Comments & Suggestions Mode', () => {
    test('Commenter can add comments with selected text reference; Viewer cannot comment', async () => {
      const createRes = await request(app)
        .post('/api/documents')
        .set('x-user-id', '1')
        .send({ title: 'Comment Doc', content: '' });
      const docId = createRes.body.id;

      // Share with Bob as commenter and Carol as viewer
      await request(app)
        .post(`/api/documents/${docId}/share`)
        .set('x-user-id', '1')
        .send({ shareWithEmail: 'bob@demo.com', role: 'commenter' });

      await request(app)
        .post(`/api/documents/${docId}/share`)
        .set('x-user-id', '1')
        .send({ shareWithEmail: 'carol@demo.com', role: 'viewer' });

      // Bob adds a suggestion / comment
      const commentRes = await request(app)
        .post(`/api/documents/${docId}/comments`)
        .set('x-user-id', '2')
        .send({
          text: 'Consider changing this section to summarize key deliverables.',
          selected_text: 'deliverables paragraph'
        });

      expect(commentRes.status).toBe(200);
      expect(commentRes.body.text).toContain('deliverables');
      expect(commentRes.body.selected_text).toBe('deliverables paragraph');
      expect(commentRes.body.author_name).toBe('Bob');
      expect(commentRes.body.status).toBe('open');

      const commentId = commentRes.body.id;

      // Carol (viewer) attempts to comment -> 403
      const carolComment = await request(app)
        .post(`/api/documents/${docId}/comments`)
        .set('x-user-id', '3')
        .send({ text: 'Unauthorized comment' });
      expect(carolComment.status).toBe(403);

      // Alice (owner) resolves the comment
      const resolveRes = await request(app)
        .patch(`/api/documents/${docId}/comments/${commentId}`)
        .set('x-user-id', '1')
        .send({ status: 'resolved' });
      expect(resolveRes.status).toBe(200);
      expect(resolveRes.body.status).toBe('resolved');

      // Fetch all comments
      const listRes = await request(app)
        .get(`/api/documents/${docId}/comments`)
        .set('x-user-id', '2');
      expect(listRes.status).toBe(200);
      expect(listRes.body.length).toBe(1);
      expect(listRes.body[0].status).toBe('resolved');

      // Bob deletes his comment
      const deleteRes = await request(app)
        .delete(`/api/documents/${docId}/comments/${commentId}`)
        .set('x-user-id', '2');
      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.success).toBe(true);
    });
  });

  // Document Version History API tests
  describe('Document Version History', () => {
    test('Document creation automatically creates initial version snapshot (v1)', async () => {
      const createRes = await request(app)
        .post('/api/documents')
        .set('x-user-id', '1')
        .send({ title: 'Versioned Doc', content: 'Initial Text Content' });
      expect(createRes.status).toBe(200);
      const docId = createRes.body.id;

      const versionsRes = await request(app)
        .get(`/api/documents/${docId}/versions`)
        .set('x-user-id', '1');

      expect(versionsRes.status).toBe(200);
      expect(Array.isArray(versionsRes.body)).toBe(true);
      expect(versionsRes.body.length).toBe(1);
      expect(versionsRes.body[0].version_number).toBe(1);
      expect(versionsRes.body[0].label).toBe('Initial document');
      expect(versionsRes.body[0].author_name).toBe('Alice');
    });

    test('Manual save records checkpoint and creates new version snapshot', async () => {
      const createRes = await request(app)
        .post('/api/documents')
        .set('x-user-id', '1')
        .send({ title: 'Versioned Doc', content: 'V1 content' });
      const docId = createRes.body.id;

      // Manual save by Alice
      const updateRes = await request(app)
        .put(`/api/documents/${docId}`)
        .set('x-user-id', '1')
        .send({ content: 'V2 content updated manually', isManualSave: true });
      expect(updateRes.status).toBe(200);

      const versionsRes = await request(app)
        .get(`/api/documents/${docId}/versions`)
        .set('x-user-id', '1');

      expect(versionsRes.status).toBe(200);
      expect(versionsRes.body.length).toBe(2);
      // Ordered descending by version_number
      expect(versionsRes.body[0].version_number).toBe(2);
      expect(versionsRes.body[0].label).toBe('Manual save');
      expect(versionsRes.body[1].version_number).toBe(1);

      // Fetch snapshot of v1
      const v1Id = versionsRes.body[1].id;
      const v1SnapshotRes = await request(app)
        .get(`/api/documents/${docId}/versions/${v1Id}`)
        .set('x-user-id', '1');

      expect(v1SnapshotRes.status).toBe(200);
      expect(v1SnapshotRes.body.content).toBe('V1 content');
      expect(v1SnapshotRes.body.version_number).toBe(1);
    });

    test('Restoring past version creates non-destructive backup and rolls back document', async () => {
      const createRes = await request(app)
        .post('/api/documents')
        .set('x-user-id', '1')
        .send({ title: 'Original Title', content: 'Original content' });
      const docId = createRes.body.id;

      // Update document to V2
      await request(app)
        .put(`/api/documents/${docId}`)
        .set('x-user-id', '1')
        .send({ title: 'Changed Title', content: 'Modified content', isManualSave: true });

      // Get V1 snapshot ID
      const versionsRes = await request(app)
        .get(`/api/documents/${docId}/versions`)
        .set('x-user-id', '1');
      const v1 = versionsRes.body.find((v) => v.version_number === 1);

      // Restore V1
      const restoreRes = await request(app)
        .post(`/api/documents/${docId}/versions/${v1.id}/restore`)
        .set('x-user-id', '1');

      expect(restoreRes.status).toBe(200);
      expect(restoreRes.body.content).toBe('Original content');
      expect(restoreRes.body.title).toBe('Original Title');

      // Verify history timeline now contains backup and restored versions
      const allVersions = await request(app)
        .get(`/api/documents/${docId}/versions`)
        .set('x-user-id', '1');

      expect(allVersions.body.length).toBe(4);
      expect(allVersions.body[0].label).toContain('Restored from Version #1');
      expect(allVersions.body[1].label).toBe('Backup before restore');
    });

    test('Permissions: Viewer can view version history but cannot restore', async () => {
      const createRes = await request(app)
        .post('/api/documents')
        .set('x-user-id', '1')
        .send({ title: 'Doc', content: 'Base' });
      const docId = createRes.body.id;

      // Share with Carol as viewer
      await request(app)
        .post(`/api/documents/${docId}/share`)
        .set('x-user-id', '1')
        .send({ shareWithEmail: 'carol@demo.com', role: 'viewer' });

      // Carol views version history
      const carolViewRes = await request(app)
        .get(`/api/documents/${docId}/versions`)
        .set('x-user-id', '3');
      expect(carolViewRes.status).toBe(200);
      expect(carolViewRes.body.length).toBe(1);

      const v1Id = carolViewRes.body[0].id;

      // Carol attempts to restore -> 403 Forbidden
      const carolRestoreRes = await request(app)
        .post(`/api/documents/${docId}/versions/${v1Id}/restore`)
        .set('x-user-id', '3');
      expect(carolRestoreRes.status).toBe(403);
    });
  });
});
