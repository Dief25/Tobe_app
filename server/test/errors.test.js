import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createStore } from '../src/store.js';

const app = createApp(createStore());

test('POST returns 201 with a Location header', async () => {
  const res = await request(app).post('/api/tasks').send({ title: 'Located' }).expect(201);
  assert.equal(res.headers.location, `/api/tasks/${res.body.id}`);
});

test('non-JSON bodies get 415', async () => {
  const res = await request(app).post('/api/tasks').set('Content-Type', 'text/plain').send('hello').expect(415);
  assert.match(res.body.error, /Content-Type: application\/json/);
});

test('oversized bodies get 413, not 500', async () => {
  const res = await request(app).post('/api/tasks').send({ title: 'a'.repeat(20_000) }).expect(413);
  assert.match(res.body.error, /too large/);
});

test('invalid JSON gets 400', async () => {
  await request(app).post('/api/tasks').set('Content-Type', 'application/json').send('{"title":').expect(400);
});

test('wrong method on a known path gets 405 with an Allow header', async () => {
  let res = await request(app).post('/api/tasks/some-id').send({}).expect(405);
  assert.equal(res.headers.allow, 'GET, PUT, PATCH, DELETE');
  res = await request(app).put('/api/tasks').send({}).expect(405);
  assert.equal(res.headers.allow, 'GET, POST, DELETE');
});

test('every error response is JSON with an error message', async () => {
  for (const [method, path] of [['get', '/api/nope'], ['get', '/api/tasks/missing'], ['delete', '/api/tasks']]) {
    const res = await request(app)[method](path);
    assert.ok(res.status >= 400, `${method} ${path} -> ${res.status}`);
    assert.equal(typeof res.body.error, 'string');
  }
});

test('unexpected failures return a generic 500 without leaking details', async () => {
  const broken = createApp({
    ...createStore(),
    list: async () => { throw new Error('disk exploded at /secret/path'); },
  });
  const original = console.error;
  console.error = () => {};
  try {
    const res = await request(broken).get('/api/tasks').expect(500);
    assert.doesNotMatch(res.body.error, /secret|exploded/);
  } finally {
    console.error = original;
  }
});
