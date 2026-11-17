import express from 'express';
import { HttpError, asyncHandler, methodNotAllowed, requireJson } from '../errors.js';
import { parseNewTask, parseOrder, parseTaskChanges } from '../validation.js';

/**
 * Task routes, mounted at /api:
 *   GET    /tasks                  list all tasks (newest first)
 *   POST   /tasks                  create a task           { title, description?, priority? }
 *   DELETE /tasks?completed=true   delete all completed tasks
 *   PUT    /tasks/order            save a new order        { ids: [...] }
 *   GET    /tasks/:id              get one task
 *   PUT    /tasks/:id              update a task           { title?, description?, priority?, completed? }
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
    const task = await store.update(req.params.id, changes);
    if (!task) throw new HttpError(404, `Task not found: ${req.params.id}`);
    res.json(task);
  });

  router
    .route('/tasks')
    .get(asyncHandler(async (_req, res) => {
      res.json(await store.list());
    }))
    .post(requireJson, asyncHandler(async (req, res) => {
      const task = await store.create(parseNewTask(req.body));
      res.status(201).location(`${req.baseUrl}/tasks/${task.id}`).json(task);
    }))
    .delete(asyncHandler(async (req, res) => {
      if (req.query.completed !== 'true') {
        throw new HttpError(400, 'To delete tasks in bulk, use DELETE /api/tasks?completed=true.');
      }
      res.json({ deleted: await store.removeCompleted() });
    }))
    .all(methodNotAllowed(['GET', 'POST', 'DELETE']));

  // Must come before /tasks/:id so "order" isn't treated as an id.
  router
    .route('/tasks/order')
    .put(requireJson, asyncHandler(async (req, res) => {
      const ids = parseOrder(req.body);
      // The order must list exactly the current tasks; otherwise the list
      // changed elsewhere (e.g. another tab) and the client should reload.
      const current = new Map((await store.list()).map((t) => [String(t.id), t.id]));
      if (ids.length !== current.size || !ids.every((id) => current.has(id))) {
        throw new HttpError(409, 'The task list has changed. Reload and try again.');
      }
      await store.reorder(ids.map((id) => current.get(id)));
      res.status(204).end();
    }))
    .all(methodNotAllowed(['PUT']));

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
