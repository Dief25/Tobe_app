// Runs the real API against a Supabase project (or a local PostgREST that
// mimics one). Skipped unless these are set:
//   SUPABASE_TEST_URL, SUPABASE_TEST_SERVICE_KEY  (and optionally SUPABASE_TEST_ANON_KEY)
// WARNING: use a throwaway project; this test deletes every completed task.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createClient } from '@supabase/supabase-js';
import { createApp } from '../src/app.js';
import { createSupabaseStore } from '../src/supabaseStore.js';

const url = process.env.SUPABASE_TEST_URL;
const key = process.env.SUPABASE_TEST_SERVICE_KEY;
const anonKey = process.env.SUPABASE_TEST_ANON_KEY;
const skip = !(url && key) && 'set SUPABASE_TEST_URL and SUPABASE_TEST_SERVICE_KEY to run';

let app;
before(() => {
  if (!skip) app = createApp(createSupabaseStore({ url, key }));
});

test('health reports Supabase storage', { skip }, async () => {
  const res = await request(app).get('/api/health').expect(200);
  assert.equal(res.body.storage, 'supabase');
});

test('create, list (newest first), toggle, rename, delete', { skip }, async () => {
  const first = (await request(app).post('/api/tasks').send({ title: '  First ' }).expect(201)).body;
  const second = (await request(app).post('/api/tasks').send({ title: 'Second' }).expect(201)).body;

  assert.equal(typeof first.id, 'number');
  assert.equal(first.title, 'First');
  assert.equal(first.completed, false);
  assert.ok(!Number.isNaN(Date.parse(first.createdAt)));

  const ids = (await request(app).get('/api/tasks').expect(200)).body.map((t) => t.id);
  assert.ok(ids.indexOf(second.id) < ids.indexOf(first.id), 'newest first');

  let res = await request(app).put(`/api/tasks/${first.id}`).send({ completed: true }).expect(200);
  assert.equal(res.body.completed, true);
  assert.equal(res.body.title, 'First');
  res = await request(app).put(`/api/tasks/${first.id}`).send({ title: 'First, renamed', completed: false }).expect(200);
  assert.deepEqual([res.body.title, res.body.completed], ['First, renamed', false]);
  assert.equal((await request(app).get(`/api/tasks/${first.id}`).expect(200)).body.title, 'First, renamed');

  await request(app).delete(`/api/tasks/${first.id}`).expect(204);
  await request(app).delete(`/api/tasks/${first.id}`).expect(404);
  await request(app).delete(`/api/tasks/${second.id}`).expect(204);
});

test('missing and malformed ids are 404, not 500', { skip }, async () => {
  for (const id of ['999999999999', 'abc', '-1', '99999999999999999999']) {
    await request(app).get(`/api/tasks/${id}`).expect(404);
    await request(app).put(`/api/tasks/${id}`).send({ completed: true }).expect(404);
    await request(app).delete(`/api/tasks/${id}`).expect(404);
  }
});

test('clear completed deletes only completed tasks', { skip }, async () => {
  const done = (await request(app).post('/api/tasks').send({ title: 'Done' })).body;
  const open = (await request(app).post('/api/tasks').send({ title: 'Open' })).body;
  await request(app).put(`/api/tasks/${done.id}`).send({ completed: true });

  const res = await request(app).delete('/api/tasks?completed=true').expect(200);
  assert.ok(res.body.deleted >= 1);
  await request(app).get(`/api/tasks/${done.id}`).expect(404);
  await request(app).get(`/api/tasks/${open.id}`).expect(200);
  await request(app).delete(`/api/tasks/${open.id}`).expect(204);
});

test('description and priority are stored and updated', { skip }, async () => {
  const { body: task } = await request(app).post('/api/tasks').send({ title: 'Taxes', description: 'Before Friday', priority: 'urgent' }).expect(201);
  assert.deepEqual([task.description, task.priority], ['Before Friday', 'urgent']);
  const res = await request(app).put(`/api/tasks/${task.id}`).send({ description: 'Done early', priority: 'low' }).expect(200);
  assert.deepEqual([res.body.title, res.body.description, res.body.priority], ['Taxes', 'Done early', 'low']);
  await request(app).delete(`/api/tasks/${task.id}`).expect(204);
});

test('reordering is saved and new tasks still go on top', { skip }, async () => {
  for (const title of ['R1', 'R2', 'R3']) await request(app).post('/api/tasks').send({ title });
  const before = (await request(app).get('/api/tasks')).body;
  const reversed = before.map((t) => t.id).reverse();

  await request(app).put('/api/tasks/order').send({ ids: reversed }).expect(204);
  assert.deepEqual((await request(app).get('/api/tasks')).body.map((t) => t.id), reversed);

  const { body: fresh } = await request(app).post('/api/tasks').send({ title: 'Newest' });
  const after = (await request(app).get('/api/tasks')).body.map((t) => t.id);
  assert.deepEqual(after, [fresh.id, ...reversed]);

  for (const t of (await request(app).get('/api/tasks')).body.filter((t) => /^R\d$|^Newest$/.test(t.title))) {
    await request(app).delete(`/api/tasks/${t.id}`).expect(204);
  }
});

test('the public anon key cannot read or write tasks (row level security)', { skip: skip || (!anonKey && 'set SUPABASE_TEST_ANON_KEY') }, async () => {
  const task = (await request(app).post('/api/tasks').send({ title: 'Private' })).body;
  const anon = createClient(url, anonKey, { auth: { persistSession: false } });

  const read = await anon.from('tasks').select();
  assert.deepEqual(read.data, [], 'anon sees no rows');
  const write = await anon.from('tasks').insert([{ text: 'sneaky' }]);
  assert.equal(write.error?.code, '42501', 'anon insert is rejected');
  const rpc = await anon.rpc('reorder_tasks', { task_ids: [task.id] });
  assert.ok(rpc.error, 'anon cannot call reorder_tasks');

  await request(app).delete(`/api/tasks/${task.id}`).expect(204);
});
