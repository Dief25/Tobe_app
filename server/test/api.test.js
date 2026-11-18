import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createStore } from '../src/store.js';

// Every request belongs to one private list (see src/owner.js).
const LIST_KEY = 'test-list-key-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const api = (target) => request.agent(target).set('X-List-Key', LIST_KEY);


let app;
beforeEach(() => {
  app = createApp(createStore());
});

test('starts with an empty task list', async () => {
  const res = await api(app).get('/api/tasks').expect(200);
  assert.deepEqual(res.body, []);
});

test('creates a task with a trimmed title', async () => {
  const res = await api(app).post('/api/tasks').send({ title: '  Buy milk  ' }).expect(201);
  assert.equal(res.body.title, 'Buy milk');
  assert.equal(res.body.completed, false);
  assert.ok(res.body.id);

  const list = await api(app).get('/api/tasks').expect(200);
  assert.equal(list.body.length, 1);
});

test('rejects empty or invalid titles', async () => {
  await api(app).post('/api/tasks').send({ title: '   ' }).expect(400);
  await api(app).post('/api/tasks').send({}).expect(400);
  await api(app).post('/api/tasks').send({ title: 'x'.repeat(201) }).expect(400);
});

test('rejects malformed JSON', async () => {
  await api(app).post('/api/tasks').set('Content-Type', 'application/json').send('{bad').expect(400);
});

test('edits a task title', async () => {
  const { body: task } = await api(app).post('/api/tasks').send({ title: 'Old' });
  const res = await api(app).patch(`/api/tasks/${task.id}`).send({ title: 'New' }).expect(200);
  assert.equal(res.body.title, 'New');
});

test('marks a task complete and incomplete', async () => {
  const { body: task } = await api(app).post('/api/tasks').send({ title: 'Do it' });
  let res = await api(app).patch(`/api/tasks/${task.id}`).send({ completed: true }).expect(200);
  assert.equal(res.body.completed, true);
  res = await api(app).patch(`/api/tasks/${task.id}`).send({ completed: false }).expect(200);
  assert.equal(res.body.completed, false);
});

test('validates update payloads', async () => {
  const { body: task } = await api(app).post('/api/tasks').send({ title: 'Do it' });
  await api(app).patch(`/api/tasks/${task.id}`).send({}).expect(400);
  await api(app).patch(`/api/tasks/${task.id}`).send({ completed: 'yes' }).expect(400);
  await api(app).patch(`/api/tasks/${task.id}`).send({ title: '' }).expect(400);
});

test('deletes a task', async () => {
  const { body: task } = await api(app).post('/api/tasks').send({ title: 'Delete me' });
  await api(app).delete(`/api/tasks/${task.id}`).expect(204);
  await api(app).get(`/api/tasks/${task.id}`).expect(404);
  await api(app).delete(`/api/tasks/${task.id}`).expect(404);
});

test('clears completed tasks only', async () => {
  const { body: a } = await api(app).post('/api/tasks').send({ title: 'A' });
  await api(app).post('/api/tasks').send({ title: 'B' });
  await api(app).patch(`/api/tasks/${a.id}`).send({ completed: true });

  const res = await api(app).delete('/api/tasks?completed=true').expect(200);
  assert.equal(res.body.deleted, 1);
  const list = await api(app).get('/api/tasks');
  assert.deepEqual(list.body.map((t) => t.title), ['B']);
});

test('returns 404 for unknown tasks and routes', async () => {
  await api(app).patch('/api/tasks/nope').send({ completed: true }).expect(404);
  await api(app).get('/api/unknown').expect(404);
});

test('serves the API with or without the /api prefix', async () => {
  await api(app).get('/health').expect(200).then((r) => assert.equal(r.body.status, 'ok'));
  await api(app).post('/tasks').send({ title: 'No prefix' }).expect(201);
  const res = await api(app).get('/api/tasks').expect(200);
  assert.equal(res.body[0].title, 'No prefix');
});

test('PUT replaces a task (toggle and rename)', async () => {
  const { body: task } = await api(app).post('/api/tasks').send({ title: 'Original' });
  let res = await api(app).put(`/api/tasks/${task.id}`).send({ title: 'Original', completed: true }).expect(200);
  assert.equal(res.body.completed, true);
  res = await api(app).put(`/api/tasks/${task.id}`).send({ title: '  Renamed ', completed: false }).expect(200);
  assert.equal(res.body.title, 'Renamed');
  assert.equal(res.body.completed, false);
});

test('PUT toggles complete or edits text on their own', async () => {
  const { body: task } = await api(app).post('/api/tasks').send({ title: 'Draft' });
  let res = await api(app).put(`/api/tasks/${task.id}`).send({ completed: true }).expect(200);
  assert.equal(res.body.completed, true);
  assert.equal(res.body.title, 'Draft');
  res = await api(app).put(`/api/tasks/${task.id}`).send({ title: 'Final' }).expect(200);
  assert.equal(res.body.title, 'Final');
  assert.equal(res.body.completed, true);
});

test('PUT validates the body and the task id', async () => {
  const { body: task } = await api(app).post('/api/tasks').send({ title: 'X' });
  await api(app).put(`/api/tasks/${task.id}`).send({}).expect(400);
  await api(app).put(`/api/tasks/${task.id}`).send({ completed: 'yes' }).expect(400);
  await api(app).put(`/api/tasks/${task.id}`).send({ title: '   ' }).expect(400);
  const res = await api(app).put(`/api/tasks/${task.id}`).send({ done: true }).expect(400);
  assert.match(res.body.error, /Unknown field/);
  await api(app).put('/api/tasks/missing').send({ completed: true }).expect(404);
});

test('tasks have a description and priority, with defaults', async () => {
  let res = await api(app).post('/api/tasks').send({ title: 'Plain' }).expect(201);
  assert.equal(res.body.description, '');
  assert.equal(res.body.priority, 'medium');

  res = await api(app).post('/api/tasks').send({ title: 'Taxes', description: '  Before Friday ', priority: 'urgent' }).expect(201);
  assert.equal(res.body.description, 'Before Friday');
  assert.equal(res.body.priority, 'urgent');

  res = await api(app).put(`/api/tasks/${res.body.id}`).send({ description: '', priority: 'low' }).expect(200);
  assert.deepEqual([res.body.title, res.body.description, res.body.priority], ['Taxes', '', 'low']);
});

test('rejects invalid description and priority', async () => {
  await api(app).post('/api/tasks').send({ title: 'X', priority: 'critical' }).expect(400);
  await api(app).post('/api/tasks').send({ title: 'X', description: 5 }).expect(400);
  await api(app).post('/api/tasks').send({ title: 'X', description: 'a'.repeat(501) }).expect(400);
  const { body: task } = await api(app).post('/api/tasks').send({ title: 'X' });
  await api(app).put(`/api/tasks/${task.id}`).send({ priority: 'HIGH' }).expect(400);
});

test('PUT /api/tasks/order saves a new order', async () => {
  const ids = [];
  for (const title of ['A', 'B', 'C']) ids.push((await api(app).post('/api/tasks').send({ title })).body.id);
  // Newest first: C, B, A. Move A to the top.
  const [a, b, c] = ids;
  await api(app).put('/api/tasks/order').send({ ids: [a, c, b] }).expect(204);
  let list = (await api(app).get('/api/tasks')).body.map((t) => t.title);
  assert.deepEqual(list, ['A', 'C', 'B']);

  // A new task still goes on top.
  await api(app).post('/api/tasks').send({ title: 'D' });
  list = (await api(app).get('/api/tasks')).body.map((t) => t.title);
  assert.deepEqual(list, ['D', 'A', 'C', 'B']);
});

test('reordering requires every current task exactly once', async () => {
  const a = (await api(app).post('/api/tasks').send({ title: 'A' })).body.id;
  const b = (await api(app).post('/api/tasks').send({ title: 'B' })).body.id;
  await api(app).put('/api/tasks/order').send({ ids: [a] }).expect(409);
  await api(app).put('/api/tasks/order').send({ ids: [a, b, 'ghost'] }).expect(409);
  await api(app).put('/api/tasks/order').send({ ids: [a, a] }).expect(400);
  await api(app).put('/api/tasks/order').send({ ids: 'a,b' }).expect(400);
  await api(app).get('/api/tasks/order').expect(405);
});

test('an old shared data file still loads, but its tasks belong to no list', async () => {
  const { mkdtempSync, writeFileSync } = await import('node:fs');
  const os = await import('node:os');
  const path = await import('node:path');
  const file = path.join(mkdtempSync(path.join(os.tmpdir(), 'tobe-old-')), 'tasks.json');
  writeFileSync(file, JSON.stringify([{ id: 'old-1', title: 'Shared old task', completed: false, createdAt: '2026-01-01T00:00:00.000Z' }]));

  const oldApp = createApp(createStore({ filePath: file }));
  assert.deepEqual((await api(oldApp).get('/api/tasks').expect(200)).body, []);
  await api(oldApp).get('/api/tasks/old-1').expect(404);
  await api(oldApp).post('/api/tasks').send({ title: 'New private task' }).expect(201);
});
