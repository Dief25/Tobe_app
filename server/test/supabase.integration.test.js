// Runs the real API against a Supabase project (or a local PostgREST that
// mimics one). Skipped unless these are set:
//   SUPABASE_TEST_URL, SUPABASE_TEST_SERVICE_KEY  (and optionally SUPABASE_TEST_ANON_KEY)
// Uses fresh random list keys, so it only touches the lists it creates.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { createApp } from '../src/app.js';
import { createSupabaseStore } from '../src/supabaseStore.js';

const url = process.env.SUPABASE_TEST_URL;
const key = process.env.SUPABASE_TEST_SERVICE_KEY;
const anonKey = process.env.SUPABASE_TEST_ANON_KEY;
const skip = !(url && key) && 'set SUPABASE_TEST_URL and SUPABASE_TEST_SERVICE_KEY to run';

// Fresh random list keys each run, so these tests only ever touch their own lists.
const newKey = () => randomBytes(32).toString('base64url');
const KEY = newKey();
const OTHER_KEY = newKey();

let app;
const api = (listKey = KEY) => request.agent(app).set('X-List-Key', listKey);
before(() => {
  if (!skip) app = createApp(createSupabaseStore({ url, key }));
});

test('health reports Supabase storage', { skip }, async () => {
  const res = await request(app).get('/api/health').expect(200);
  assert.equal(res.body.storage, 'supabase');
});

test('create, list (newest first), toggle, rename, delete', { skip }, async () => {
  const first = (await api().post('/api/tasks').send({ title: '  First ' }).expect(201)).body;
  const second = (await api().post('/api/tasks').send({ title: 'Second' }).expect(201)).body;

  assert.equal(typeof first.id, 'number');
  assert.equal(first.title, 'First');
  assert.equal(first.completed, false);
  assert.ok(!Number.isNaN(Date.parse(first.createdAt)));

  const ids = (await api().get('/api/tasks').expect(200)).body.map((t) => t.id);
  assert.ok(ids.indexOf(second.id) < ids.indexOf(first.id), 'newest first');

  let res = await api().put(`/api/tasks/${first.id}`).send({ completed: true }).expect(200);
  assert.equal(res.body.completed, true);
  assert.equal(res.body.title, 'First');
  res = await api().put(`/api/tasks/${first.id}`).send({ title: 'First, renamed', completed: false }).expect(200);
  assert.deepEqual([res.body.title, res.body.completed], ['First, renamed', false]);
  assert.equal((await api().get(`/api/tasks/${first.id}`).expect(200)).body.title, 'First, renamed');

  await api().delete(`/api/tasks/${first.id}`).expect(204);
  await api().delete(`/api/tasks/${first.id}`).expect(404);
  await api().delete(`/api/tasks/${second.id}`).expect(204);
});

test('missing and malformed ids are 404, not 500', { skip }, async () => {
  for (const id of ['999999999999', 'abc', '-1', '99999999999999999999']) {
    await api().get(`/api/tasks/${id}`).expect(404);
    await api().put(`/api/tasks/${id}`).send({ completed: true }).expect(404);
    await api().delete(`/api/tasks/${id}`).expect(404);
  }
});

test('clear completed deletes only completed tasks', { skip }, async () => {
  const done = (await api().post('/api/tasks').send({ title: 'Done' })).body;
  const open = (await api().post('/api/tasks').send({ title: 'Open' })).body;
  await api().put(`/api/tasks/${done.id}`).send({ completed: true });

  const res = await api().delete('/api/tasks?completed=true').expect(200);
  assert.ok(res.body.deleted >= 1);
  await api().get(`/api/tasks/${done.id}`).expect(404);
  await api().get(`/api/tasks/${open.id}`).expect(200);
  await api().delete(`/api/tasks/${open.id}`).expect(204);
});

test('description and priority are stored and updated', { skip }, async () => {
  const { body: task } = await api().post('/api/tasks').send({ title: 'Taxes', description: 'Before Friday', priority: 'urgent' }).expect(201);
  assert.deepEqual([task.description, task.priority], ['Before Friday', 'urgent']);
  const res = await api().put(`/api/tasks/${task.id}`).send({ description: 'Done early', priority: 'low' }).expect(200);
  assert.deepEqual([res.body.title, res.body.description, res.body.priority], ['Taxes', 'Done early', 'low']);
  await api().delete(`/api/tasks/${task.id}`).expect(204);
});

test('reordering is saved and new tasks still go on top', { skip }, async () => {
  for (const title of ['R1', 'R2', 'R3']) await api().post('/api/tasks').send({ title });
  const before = (await api().get('/api/tasks')).body;
  const reversed = before.map((t) => t.id).reverse();

  await api().put('/api/tasks/order').send({ ids: reversed }).expect(204);
  assert.deepEqual((await api().get('/api/tasks')).body.map((t) => t.id), reversed);

  const { body: fresh } = await api().post('/api/tasks').send({ title: 'Newest' });
  const after = (await api().get('/api/tasks')).body.map((t) => t.id);
  assert.deepEqual(after, [fresh.id, ...reversed]);

  for (const t of (await api().get('/api/tasks')).body.filter((t) => /^R\d$|^Newest$/.test(t.title))) {
    await api().delete(`/api/tasks/${t.id}`).expect(204);
  }
});

test("lists are private: another list key can't see or change your tasks", { skip }, async () => {
  const { body: mine } = await api().post('/api/tasks').send({ title: 'Only mine' }).expect(201);
  const other = api(OTHER_KEY);

  assert.ok(!(await other.get('/api/tasks')).body.some((t) => t.id === mine.id));
  await other.get(`/api/tasks/${mine.id}`).expect(404);
  await other.put(`/api/tasks/${mine.id}`).send({ title: 'Hacked' }).expect(404);
  await other.delete(`/api/tasks/${mine.id}`).expect(404);
  await other.put('/api/tasks/order').send({ ids: [mine.id] }).expect(409);

  assert.equal((await api().get(`/api/tasks/${mine.id}`).expect(200)).body.title, 'Only mine');
  await api().delete(`/api/tasks/${mine.id}`).expect(204);
});

test('tasks from before private lists (no owner) are hidden from every list', { skip }, async () => {
  const admin = createClient(url, key, { auth: { persistSession: false } });
  const { data: orphan, error } = await admin.from('tasks').insert([{ text: 'Shared from before' }]).select('id').single();
  assert.ifError(error);
  assert.ok(!(await api().get('/api/tasks')).body.some((t) => t.id === orphan.id));
  await api().get(`/api/tasks/${orphan.id}`).expect(404);
  await admin.from('tasks').delete().eq('id', orphan.id);
});

test('list names are saved per list', { skip }, async () => {
  assert.equal((await api().get('/api/list').expect(200)).body.name, '');
  await api().put('/api/list').send({ name: 'Dief' }).expect(200);
  assert.equal((await api().get('/api/list')).body.name, 'Dief');
  await api().put('/api/list').send({ name: 'Dief K' }).expect(200);
  assert.equal((await api().get('/api/list')).body.name, 'Dief K', 'second save updates the same row');
  assert.equal((await api(OTHER_KEY).get('/api/list')).body.name, '');
});

test('the public anon key cannot read or write tasks (row level security)', { skip: skip || (!anonKey && 'set SUPABASE_TEST_ANON_KEY') }, async () => {
  const task = (await api().post('/api/tasks').send({ title: 'Private' })).body;
  const anon = createClient(url, anonKey, { auth: { persistSession: false } });

  const read = await anon.from('tasks').select();
  assert.deepEqual(read.data, [], 'anon sees no rows');
  const write = await anon.from('tasks').insert([{ text: 'sneaky' }]);
  assert.equal(write.error?.code, '42501', 'anon insert is rejected');
  const rpc = await anon.rpc('reorder_tasks', { list_owner: 'x'.repeat(64), task_ids: [task.id] });
  assert.ok(rpc.error, 'anon cannot call reorder_tasks');
  assert.deepEqual((await anon.from('lists').select()).data, [], 'anon sees no list names');

  await api().delete(`/api/tasks/${task.id}`).expect(204);
});
