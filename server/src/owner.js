import { createHash } from 'node:crypto';
import { HttpError } from './errors.js';

// The browser makes a long random key once and sends it on every request.
// Whoever has the key owns that list; there are no accounts or passwords.
const KEY_PATTERN = /^[A-Za-z0-9_-]{32,128}$/;
export const LIST_KEY_HEADER = 'X-List-Key';

/**
 * Sets req.ownerId from the X-List-Key header. The key itself is never
 * stored: the database only sees its SHA-256 hash, so reading the
 * database doesn't reveal anyone's key.
 */
export function identifyList(req, _res, next) {
  const key = req.get(LIST_KEY_HEADER);
  if (!key || !KEY_PATTERN.test(key)) {
    return next(new HttpError(401, 'Missing or invalid list key. Reload the page and try again.'));
  }
  req.ownerId = createHash('sha256').update(key).digest('hex');
  next();
}
