import { HttpError } from './errors.js';

/**
 * Used on Vercel when the database isn't set up. Every call fails with a
 * 503 that explains what's missing, instead of silently saving tasks to a
 * temporary file where they would vanish.
 */
export function createUnconfiguredStore(problem) {
  const fail = async () => {
    throw new HttpError(503, problem);
  };
  return {
    kind: 'not-configured',
    problem,
    list: fail,
    get: fail,
    create: fail,
    update: fail,
    remove: fail,
    reorder: fail,
    removeCompleted: fail,
    getListName: fail,
    setListName: fail,
  };
}
