import express from 'express';
import { HttpError, asyncHandler, methodNotAllowed, requireJson } from '../errors.js';
import { parseTaskChanges, parseTitle } from '../validation.js';

/**
 * Task routes, mounted at /api:
 *   GET    /tasks                  list all tasks (newest first)
 *   POST   /tasks                  create a task           { title }
 *   DELETE /tasks?completed=true   delete all completed tasks
 *   GET    /tasks/:id              get one task
 *   PUT    /tasks/:id              update a task           { title?, completed? }
 *   PATCH  /tasks/:id              same as PUT
 *   DELETE /tasks/:id              delete a task
 */
export function tasksRouter(store) {
  const router = express.Router();

  const findOr404 = async (id) => {
    const task = await store.get(id);
    if (!task) throw new HttpError(404, `Task not found: ${id}`);
    return task;
  };

  // Shared by PUT and PATCH: toggle complete, edit the text, or both.
  const updateTask = asyncHandler(async (req, res) => {
    const changes = parseTaskChanges(req.body);
    await findOr404(req.params.id);
    res.json(await store.update(req.params.id, changes));
  });

  router
    .route('/tasks')
    .get(asyncHandler(async (_req, res) => {
      res.json(await store.list());
    }))
    .post(requireJson, asyncHandler(async (req, res) => {
      const task = await store.create({ title: parseTitle(req.body?.title) });
      res.status(201).location(`${req.baseUrl}/tasks/${task.id}`).json(task);
    }))
    .delete(asyncHandler(async (req, res) => {
      if (req.query.completed !== 'true') {
        throw new HttpError(400, 'To delete tasks in bulk, use DELETE /api/tasks?completed=true.');
      }
      res.json({ deleted: await store.removeCompleted() });
    }))
    .all(methodNotAllowed(['GET', 'POST', 'DELETE']));

  router
    .route('/tasks/:id')
    .get(asyncHandler(async (req, res) => {
      res.json(await findOr404(req.params.id));
    }))
    .put(requireJson, updateTask)
    .patch(requireJson, updateTask)
    .delete(asyncHandler(async (req, res) => {
      if (!(await store.remove(req.params.id))) throw new HttpError(404, `Task not found: ${req.params.id}`);
      res.status(204).end();
    }))
    .all(methodNotAllowed(['GET', 'PUT', 'PATCH', 'DELETE']));

  return router;
}
