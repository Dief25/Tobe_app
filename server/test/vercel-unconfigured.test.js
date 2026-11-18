import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

// Each test file runs in its own process, so this env doesn't leak.
// Simulates a Vercel deployment with no Supabase settings and no DATA_FILE.
test('on Vercel without Supabase, the API explains instead of using a temporary file', async () => {
  process.env.VERCEL = '1';
  for (const name of ['SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEY', 'DATA_FILE']) {
    delete process.env[name];
  }
  const original = console.error;
  console.error = () => {};
  const { default: app } = await import('../src/index.js');
  console.error = original;

  const health = await request(app).get('/api/health').expect(503);
  assert.equal(health.body.storage, 'not-configured');
  assert.match(health.body.problem, /SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY/);

  const agent = request.agent(app).set('X-List-Key', 'k'.repeat(43));
  const res = await agent.get('/api/tasks').expect(503);
  assert.match(res.body.error, /database isn't connected/);
  await agent.post('/api/tasks').send({ title: 'Would vanish' }).expect(503);
});
