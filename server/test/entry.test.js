import { test } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { mkdtempSync, readFileSync } from 'node:fs';
import request from 'supertest';

// Every request belongs to one private list (see src/owner.js).
const LIST_KEY = 'test-list-key-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const api = (target) => request.agent(target).set('X-List-Key', LIST_KEY);


// Simulates how Vercel loads the server: VERCEL is set, the module's default
// export is the app, and nothing should call listen().
test('Vercel entry exports the app and persists to the data file', async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'tobe-'));
  process.env.VERCEL = '1';
  process.env.DATA_FILE = path.join(dir, 'tasks.json');

  const { default: app } = await import('../src/index.js');

  await api(app).get('/api/health').expect(200).then((r) => assert.equal(r.body.status, 'ok'));
  const { body } = await api(app).post('/api/tasks').send({ title: 'From Vercel' }).expect(201);
  const saved = JSON.parse(readFileSync(process.env.DATA_FILE, 'utf8'));
  assert.equal(saved.tasks[0].id, body.id);
});

test('unknown paths return a JSON 404 naming the path received', async () => {
  const { default: app } = await import('../src/index.js');
  const res = await api(app).get('/something/else').expect(404);
  assert.match(res.body.error, /GET \/something\/else/);
});
