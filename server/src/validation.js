import { HttpError } from './errors.js';

export const MAX_TITLE_LENGTH = 200;

/** Returns the trimmed title, or throws a 400 explaining what's wrong. */
export function parseTitle(title) {
  if (typeof title !== 'string') throw new HttpError(400, 'Title is required and must be a string.');
  const trimmed = title.trim();
  if (!trimmed) throw new HttpError(400, 'Title cannot be empty.');
  if (trimmed.length > MAX_TITLE_LENGTH) throw new HttpError(400, `Title must be at most ${MAX_TITLE_LENGTH} characters.`);
  return trimmed;
}

/**
 * Validates an update body. Accepts `title`, `completed`, or both;
 * at least one is required and unknown fields are rejected.
 */
export function parseTaskChanges(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(400, 'The request body must be a JSON object.');
  }

  const unknown = Object.keys(body).filter((key) => !['title', 'completed'].includes(key));
  if (unknown.length) throw new HttpError(400, `Unknown field(s): ${unknown.join(', ')}. Allowed: title, completed.`);

  const changes = {};
  if (body.title !== undefined) changes.title = parseTitle(body.title);
  if (body.completed !== undefined) {
    if (typeof body.completed !== 'boolean') throw new HttpError(400, 'Completed must be true or false.');
    changes.completed = body.completed;
  }
  if (Object.keys(changes).length === 0) {
    throw new HttpError(400, 'Provide "title" and/or "completed" to update.');
  }
  return changes;
}
