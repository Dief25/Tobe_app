import { test } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { mkdtempSync, readFileSync } from 'node:fs';
import request from 'supertest';

// Simulates how Vercel loads the server: VERCEL is set, the module's default
// export is the app, and nothing should call listen().
test('Vercel entry exports the app and persists to the data file', async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'tobe-'));
  process.env.VERCEL = '1';
  process.env.DATA_FILE = path.join(dir, 'tasks.json');

  const { default: app } = await import('../src/index.js');

  await request(app).get('/api/health').expect(200).then((r) => assert.equal(r.body.status, 'ok'));
  const { body } = await request(app).post('/api/tasks').send({ title: 'From Vercel' }).expect(201);
  const saved = JSON.parse(readFileSync(process.env.DATA_FILE, 'utf8'));
  assert.equal(saved[0].id, body.id);
});

test('unknown paths return a JSON 404 naming the path received', async () => {
  const { default: app } = await import('../src/index.js');
  const res = await request(app).get('/something/else').expect(404);
  assert.match(res.body.error, /GET \/something\/else/);
});
