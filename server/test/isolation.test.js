import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createStore } from '../src/store.js';

const KEY_A = 'list-key-alice-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const KEY_B = 'list-key-bob-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

let app;
const as = (key) => request.agent(app).set('X-List-Key', key);
beforeEach(() => {
  app = createApp(createStore());
});

test('requests without a valid list key are rejected with 401', async () => {
  for (const req of [request(app).get('/api/tasks'), request(app).get('/api/list')]) {
    const res = await req.expect(401);
    assert.match(res.body.error, /list key/);
  }
  await request(app).post('/api/tasks').set('X-List-Key', 'short').send({ title: 'x' }).expect(401);
  await request(app).get('/api/tasks').set('X-List-Key', 'has spaces and !!! not allowed here at all').expect(401);
  await request(app).get('/api/health').expect(200); // health needs no key
});

test("each list only sees its own tasks", async () => {
  const alice = as(KEY_A), bob = as(KEY_B);
  const { body: a } = await alice.post('/api/tasks').send({ title: "Alice's secret" }).expect(201);
  await bob.post('/api/tasks').send({ title: "Bob's task" }).expect(201);

  assert.deepEqual((await alice.get('/api/tasks')).body.map((t) => t.title), ["Alice's secret"]);
  assert.deepEqual((await bob.get('/api/tasks')).body.map((t) => t.title), ["Bob's task"]);
  assert.ok(!('owner' in a), 'owner is never exposed');
});

test("one list cannot read, edit, or delete another list's task", async () => {
  const alice = as(KEY_A), bob = as(KEY_B);
  const { body: a } = await alice.post('/api/tasks').send({ title: 'Mine' });

  await bob.get(`/api/tasks/${a.id}`).expect(404);
  await bob.put(`/api/tasks/${a.id}`).send({ title: 'Hacked', completed: true }).expect(404);
  await bob.patch(`/api/tasks/${a.id}`).send({ completed: true }).expect(404);
  await bob.delete(`/api/tasks/${a.id}`).expect(404);

  const { body: still } = await alice.get(`/api/tasks/${a.id}`).expect(200);
  assert.deepEqual([still.title, still.completed], ['Mine', false]);
});

test("clearing completed tasks only affects your own list", async () => {
  const alice = as(KEY_A), bob = as(KEY_B);
  const { body: a } = await alice.post('/api/tasks').send({ title: 'Alice done' });
  const { body: b } = await bob.post('/api/tasks').send({ title: 'Bob done' });
  await alice.put(`/api/tasks/${a.id}`).send({ completed: true });
  await bob.put(`/api/tasks/${b.id}`).send({ completed: true });

  assert.equal((await alice.delete('/api/tasks?completed=true').expect(200)).body.deleted, 1);
  assert.equal((await bob.get('/api/tasks')).body.length, 1, "Bob's completed task is untouched");
});

test("reordering can't include or move another list's tasks", async () => {
  const alice = as(KEY_A), bob = as(KEY_B);
  const a1 = (await alice.post('/api/tasks').send({ title: 'A1' })).body.id;
  const a2 = (await alice.post('/api/tasks').send({ title: 'A2' })).body.id;
  const b1 = (await bob.post('/api/tasks').send({ title: 'B1' })).body.id;

  await bob.put('/api/tasks/order').send({ ids: [a1, a2, b1] }).expect(409);
  await alice.put('/api/tasks/order').send({ ids: [a1, a2] }).expect(204);
  assert.deepEqual((await alice.get('/api/tasks')).body.map((t) => t.title), ['A1', 'A2']);
  assert.deepEqual((await bob.get('/api/tasks')).body.map((t) => t.title), ['B1']);
});

test('each list has its own optional name', async () => {
  const alice = as(KEY_A), bob = as(KEY_B);
  assert.deepEqual((await alice.get('/api/list').expect(200)).body, { name: '' });

  assert.deepEqual((await alice.put('/api/list').send({ name: '  Dief ' }).expect(200)).body, { name: 'Dief' });
  assert.equal((await alice.get('/api/list')).body.name, 'Dief');
  assert.equal((await bob.get('/api/list')).body.name, '', "Bob doesn't see Alice's name");

  await alice.put('/api/list').send({ name: '' }).expect(200);
  assert.equal((await alice.get('/api/list')).body.name, '');

  await alice.put('/api/list').send({ name: 'x'.repeat(41) }).expect(400);
  await alice.put('/api/list').send({ name: 42 }).expect(400);
  await alice.put('/api/list').send({ title: 'Dief' }).expect(400);
  await alice.post('/api/list').send({ name: 'Dief' }).expect(405);
});
