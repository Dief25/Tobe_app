import express from 'express';
import cors from 'cors';

const MAX_TITLE_LENGTH = 200;

function validateTitle(title) {
  if (typeof title !== 'string') return 'Title must be a string.';
  const trimmed = title.trim();
  if (!trimmed) return 'Title cannot be empty.';
  if (trimmed.length > MAX_TITLE_LENGTH) return `Title must be at most ${MAX_TITLE_LENGTH} characters.`;
  return null;
}

// Wraps async handlers so rejected promises reach the error middleware.
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function createApp(store) {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '10kb' }));

  const router = express.Router();

  router.get('/health', (_req, res) => res.json({ status: 'ok' }));

  // List all tasks
  router.get('/tasks', asyncHandler(async (_req, res) => {
    res.json(await store.list());
  }));

  // Get one task
  router.get('/tasks/:id', asyncHandler(async (req, res) => {
    const task = await store.get(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found.' });
    res.json(task);
  }));

  // Create a task
  router.post('/tasks', asyncHandler(async (req, res) => {
    const error = validateTitle(req.body?.title);
    if (error) return res.status(400).json({ error });
    const task = await store.create({ title: req.body.title.trim() });
    res.status(201).json(task);
  }));

  // Update a task (title and/or completed)
  router.patch('/tasks/:id', asyncHandler(async (req, res) => {
    const { title, completed } = req.body ?? {};
    const changes = {};

    if (title !== undefined) {
      const error = validateTitle(title);
      if (error) return res.status(400).json({ error });
      changes.title = title.trim();
    }
    if (completed !== undefined) {
      if (typeof completed !== 'boolean') return res.status(400).json({ error: 'Completed must be a boolean.' });
      changes.completed = completed;
    }
    if (Object.keys(changes).length === 0) {
      return res.status(400).json({ error: 'Provide a title or completed value to update.' });
    }

    const task = await store.update(req.params.id, changes);
    if (!task) return res.status(404).json({ error: 'Task not found.' });
    res.json(task);
  }));

  // Delete all completed tasks
  router.delete('/tasks', asyncHandler(async (req, res) => {
    if (req.query.completed !== 'true') {
      return res.status(400).json({ error: 'Use ?completed=true to clear completed tasks.' });
    }
    const deleted = await store.removeCompleted();
    res.json({ deleted });
  }));

  // Delete a task
  router.delete('/tasks/:id', asyncHandler(async (req, res) => {
    const removed = await store.remove(req.params.id);
    if (!removed) return res.status(404).json({ error: 'Task not found.' });
    res.status(204).end();
  }));

  app.use('/api', router);

  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found.' }));

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body.' });
    console.error(err);
    res.status(500).json({ error: 'Something went wrong.' });
  });

  return app;
}
