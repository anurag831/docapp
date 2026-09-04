const request = require('supertest');
const app = require('../server/index');
const db = require('../server/db');

describe('Documents API', () => {
  beforeEach(() => {
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
});
