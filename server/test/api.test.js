import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createStore } from '../src/store.js';

let app;
beforeEach(() => {
  app = createApp(createStore());
});

test('starts with an empty task list', async () => {
  const res = await request(app).get('/api/tasks').expect(200);
  assert.deepEqual(res.body, []);
});

test('creates a task with a trimmed title', async () => {
  const res = await request(app).post('/api/tasks').send({ title: '  Buy milk  ' }).expect(201);
  assert.equal(res.body.title, 'Buy milk');
  assert.equal(res.body.completed, false);
  assert.ok(res.body.id);

  const list = await request(app).get('/api/tasks').expect(200);
  assert.equal(list.body.length, 1);
});

test('rejects empty or invalid titles', async () => {
  await request(app).post('/api/tasks').send({ title: '   ' }).expect(400);
  await request(app).post('/api/tasks').send({}).expect(400);
  await request(app).post('/api/tasks').send({ title: 'x'.repeat(201) }).expect(400);
});

test('rejects malformed JSON', async () => {
  await request(app).post('/api/tasks').set('Content-Type', 'application/json').send('{bad').expect(400);
});

test('edits a task title', async () => {
  const { body: task } = await request(app).post('/api/tasks').send({ title: 'Old' });
  const res = await request(app).patch(`/api/tasks/${task.id}`).send({ title: 'New' }).expect(200);
  assert.equal(res.body.title, 'New');
});

test('marks a task complete and incomplete', async () => {
  const { body: task } = await request(app).post('/api/tasks').send({ title: 'Do it' });
  let res = await request(app).patch(`/api/tasks/${task.id}`).send({ completed: true }).expect(200);
  assert.equal(res.body.completed, true);
  res = await request(app).patch(`/api/tasks/${task.id}`).send({ completed: false }).expect(200);
  assert.equal(res.body.completed, false);
});

test('validates update payloads', async () => {
  const { body: task } = await request(app).post('/api/tasks').send({ title: 'Do it' });
  await request(app).patch(`/api/tasks/${task.id}`).send({}).expect(400);
  await request(app).patch(`/api/tasks/${task.id}`).send({ completed: 'yes' }).expect(400);
  await request(app).patch(`/api/tasks/${task.id}`).send({ title: '' }).expect(400);
});

test('deletes a task', async () => {
  const { body: task } = await request(app).post('/api/tasks').send({ title: 'Delete me' });
  await request(app).delete(`/api/tasks/${task.id}`).expect(204);
  await request(app).get(`/api/tasks/${task.id}`).expect(404);
  await request(app).delete(`/api/tasks/${task.id}`).expect(404);
});

test('clears completed tasks only', async () => {
  const { body: a } = await request(app).post('/api/tasks').send({ title: 'A' });
  await request(app).post('/api/tasks').send({ title: 'B' });
  await request(app).patch(`/api/tasks/${a.id}`).send({ completed: true });

  const res = await request(app).delete('/api/tasks?completed=true').expect(200);
  assert.equal(res.body.deleted, 1);
  const list = await request(app).get('/api/tasks');
  assert.deepEqual(list.body.map((t) => t.title), ['B']);
});

test('returns 404 for unknown tasks and routes', async () => {
  await request(app).patch('/api/tasks/nope').send({ completed: true }).expect(404);
  await request(app).get('/api/unknown').expect(404);
});
