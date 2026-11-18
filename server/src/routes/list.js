import express from 'express';
import { asyncHandler, methodNotAllowed, requireJson } from '../errors.js';
import { parseListName } from '../validation.js';

/**
 * The list's optional name, mounted at /api:
 *   GET /list    -> { name }   ("" when not set)
 *   PUT /list    { name }      set or clear it
 */
export function listRouter(store) {
  const router = express.Router();
  router
    .route('/list')
    .get(asyncHandler(async (req, res) => {
      res.json({ name: await store.getListName(req.ownerId) });
    }))
    .put(requireJson, asyncHandler(async (req, res) => {
      const name = parseListName(req.body);
      await store.setListName(req.ownerId, name);
      res.json({ name });
    }))
    .all(methodNotAllowed(['GET', 'PUT']));
  return router;
}
