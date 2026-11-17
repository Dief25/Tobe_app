/** An error with an HTTP status whose message is safe to show to clients. */
export class HttpError extends Error {
  constructor(status, message, headers = {}) {
    super(message);
    this.status = status;
    this.headers = headers;
  }
}

// Wraps async route handlers so thrown errors and rejected promises reach
// the error handler (Express 4 doesn't do this on its own).
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/** Rejects write requests whose body isn't JSON. */
export function requireJson(req, _res, next) {
  if (!req.is('application/json')) {
    return next(new HttpError(415, 'Send a JSON body with the header Content-Type: application/json.'));
  }
  next();
}

/** 405 for a known path used with the wrong method. */
export const methodNotAllowed = (allowed) => (req, _res, next) =>
  next(new HttpError(405, `${req.method} is not allowed here. Use ${allowed.join(', ')}.`, { Allow: allowed.join(', ') }));

/** JSON 404 that names the path Express received (useful behind proxies/rewrites). */
export function notFound(req, res) {
  console.warn(`404: no route for ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
}

/** Turns any error into a JSON response; unexpected errors become a generic 500. */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err instanceof HttpError) {
    res.set(err.headers);
    return res.status(err.status).json({ error: err.message });
  }

  // Errors raised by express.json() while reading the body.
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'The request body is not valid JSON.' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'The request body is too large (limit 10 KB).' });
  if (err.expose && err.status >= 400 && err.status < 500) return res.status(err.status).json({ error: err.message });

  // Anything else is a bug or an infrastructure failure: log it, hide details.
  console.error(`500 on ${req.method} ${req.originalUrl}:`, err);
  res.status(500).json({ error: 'Something went wrong on the server. Please try again.' });
}
