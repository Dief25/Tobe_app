import { HttpError } from './errors.js';

export const MAX_TITLE_LENGTH = 200;
export const MAX_DESCRIPTION_LENGTH = 500;
export const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
export const DEFAULT_PRIORITY = 'medium';
const MAX_ORDER_LENGTH = 10_000;

function requireObject(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(400, 'The request body must be a JSON object.');
  }
}

function rejectUnknown(body, allowed) {
  const unknown = Object.keys(body).filter((key) => !allowed.includes(key));
  if (unknown.length) {
    throw new HttpError(400, `Unknown field(s): ${unknown.join(', ')}. Allowed: ${allowed.join(', ')}.`);
  }
}

/** Returns the trimmed title, or throws a 400 explaining what's wrong. */
export function parseTitle(title) {
  if (typeof title !== 'string') throw new HttpError(400, 'Title is required and must be a string.');
  const trimmed = title.trim();
  if (!trimmed) throw new HttpError(400, 'Title cannot be empty.');
  if (trimmed.length > MAX_TITLE_LENGTH) throw new HttpError(400, `Title must be at most ${MAX_TITLE_LENGTH} characters.`);
  return trimmed;
}

/** Optional longer text shown under the title. Empty string means none. */
export function parseDescription(description) {
  if (typeof description !== 'string') throw new HttpError(400, 'Description must be a string.');
  const trimmed = description.trim();
  if (trimmed.length > MAX_DESCRIPTION_LENGTH) {
    throw new HttpError(400, `Description must be at most ${MAX_DESCRIPTION_LENGTH} characters.`);
  }
  return trimmed;
}

export function parsePriority(priority) {
  if (!PRIORITIES.includes(priority)) throw new HttpError(400, `Priority must be one of: ${PRIORITIES.join(', ')}.`);
  return priority;
}

/** Body of POST /tasks: `title` is required; `description` and `priority` are optional. */
export function parseNewTask(body) {
  requireObject(body);
  rejectUnknown(body, ['title', 'description', 'priority']);
  return {
    title: parseTitle(body.title),
    description: body.description === undefined ? '' : parseDescription(body.description),
    priority: body.priority === undefined ? DEFAULT_PRIORITY : parsePriority(body.priority),
  };
}

/** Body of PUT/PATCH /tasks/:id: any of the fields, at least one. */
export function parseTaskChanges(body) {
  requireObject(body);
  rejectUnknown(body, ['title', 'description', 'priority', 'completed']);

  const changes = {};
  if (body.title !== undefined) changes.title = parseTitle(body.title);
  if (body.description !== undefined) changes.description = parseDescription(body.description);
  if (body.priority !== undefined) changes.priority = parsePriority(body.priority);
  if (body.completed !== undefined) {
    if (typeof body.completed !== 'boolean') throw new HttpError(400, 'Completed must be true or false.');
    changes.completed = body.completed;
  }
  if (Object.keys(changes).length === 0) {
    throw new HttpError(400, 'Provide at least one of "title", "description", "priority" or "completed" to update.');
  }
  return changes;
}

/** Body of PUT /tasks/order: `{ ids: [...] }`, every task id once, top to bottom. */
export function parseOrder(body) {
  requireObject(body);
  rejectUnknown(body, ['ids']);
  const { ids } = body;
  if (!Array.isArray(ids) || ids.length > MAX_ORDER_LENGTH) {
    throw new HttpError(400, '"ids" must be an array of task ids, in the new order.');
  }
  if (!ids.every((id) => typeof id === 'string' || (typeof id === 'number' && Number.isSafeInteger(id)))) {
    throw new HttpError(400, 'Each id must be a string or an integer.');
  }
  if (new Set(ids.map(String)).size !== ids.length) throw new HttpError(400, '"ids" must not contain duplicates.');
  return ids.map(String);
}
