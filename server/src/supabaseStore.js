import { createClient } from '@supabase/supabase-js';

const COLUMNS = 'id, text, description, priority, completed, created_at';
const MAX_BIGINT = 9223372036854775807n;

// Database row -> API task. The API (and the React app) use `title` and
// `createdAt`; the table uses `text` and `created_at`.
const toTask = (row) => ({
  id: row.id,
  title: row.text,
  description: row.description ?? '',
  priority: row.priority ?? 'medium',
  completed: row.completed,
  createdAt: new Date(row.created_at).toISOString(),
});

// Ids are bigints. Anything else can't exist, so treat it as "not found"
// instead of sending Postgres a value it would reject with an error.
const isValidId = (id) => /^\d{1,19}$/.test(String(id)) && BigInt(id) <= MAX_BIGINT;

function check(operation, { data, error }) {
  if (error) {
    throw new Error(`Supabase ${operation} failed: ${error.message}${error.code ? ` (code ${error.code})` : ''}`);
  }
  return data;
}

/**
 * Task store backed by a Supabase `tasks` table (see supabase/schema.sql).
 * Same interface as the JSON-file store in store.js.
 */
export function createSupabaseStore({ url, key, client } = {}) {
  const supabase =
    client ??
    createClient(url, key, {
      // Server-side use: no user sessions to persist or refresh.
      auth: { persistSession: false, autoRefreshToken: false },
    });
  const tasks = () => supabase.from('tasks');

  return {
    kind: 'supabase',

    // Highest position first. New tasks default to a high position (the
    // current time), so they appear at the top until the list is reordered.
    async list() {
      const rows = check(
        'list',
        await tasks()
          .select(COLUMNS)
          .order('position', { ascending: false })
          .order('id', { ascending: false }),
      );
      return rows.map(toTask);
    },

    async get(id) {
      if (!isValidId(id)) return null;
      const row = check('get', await tasks().select(COLUMNS).eq('id', id).maybeSingle());
      return row ? toTask(row) : null;
    },

    async create({ title, description = '', priority = 'medium' }) {
      const row = check(
        'create',
        await tasks().insert([{ text: title, description, priority, completed: false }]).select(COLUMNS).single(),
      );
      return toTask(row);
    },

    async update(id, changes) {
      if (!isValidId(id)) return null;
      const patch = {};
      if (changes.title !== undefined) patch.text = changes.title;
      if (changes.description !== undefined) patch.description = changes.description;
      if (changes.priority !== undefined) patch.priority = changes.priority;
      if (changes.completed !== undefined) patch.completed = changes.completed;
      const row = check('update', await tasks().update(patch).eq('id', id).select(COLUMNS).maybeSingle());
      return row ? toTask(row) : null;
    },

    async remove(id) {
      if (!isValidId(id)) return false;
      const rows = check('delete', await tasks().delete().eq('id', id).select('id'));
      return rows.length > 0;
    },

    /** Saves a new order in one call (see reorder_tasks in schema.sql). */
    async reorder(ids) {
      check('reorder', await supabase.rpc('reorder_tasks', { task_ids: ids.map(Number) }));
    },

    async removeCompleted() {
      const rows = check('delete completed', await tasks().delete().eq('completed', true).select('id'));
      return rows.length;
    },
  };
}
