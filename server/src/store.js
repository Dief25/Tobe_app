import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

// Tasks carry their owner internally; the API never returns it.
const toPublic = ({ owner, ...task }) => ({ ...task });

/**
 * A tiny JSON-file-backed store, for local development and tests. Every
 * method takes the owner (the hashed list key) and only touches that
 * owner's tasks. Writes are serialized so concurrent requests can't
 * clobber each other. Pass `filePath: null` for an in-memory store.
 */
export function createStore({ filePath = null } = {}) {
  let state = null; // { tasks: [...], lists: { [owner]: { name } } }
  let writeQueue = Promise.resolve();

  async function load() {
    if (state) return state;
    let saved = { tasks: [], lists: {} };
    if (filePath) {
      try {
        saved = JSON.parse(await fs.readFile(filePath, 'utf8'));
      } catch (err) {
        if (err.code !== 'ENOENT') throw err;
      }
    }
    // Older files were a plain array of shared tasks. Those have no owner,
    // so they are kept but no list can see them.
    if (Array.isArray(saved)) saved = { tasks: saved, lists: {} };
    state = {
      tasks: (saved.tasks ?? []).map((t) => ({ description: '', priority: 'medium', ...t })),
      lists: saved.lists ?? {},
    };
    return state;
  }

  function persist() {
    if (!filePath) return Promise.resolve();
    const snapshot = JSON.stringify(state, null, 2);
    writeQueue = writeQueue.then(async () => {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      const tmp = `${filePath}.tmp`;
      await fs.writeFile(tmp, snapshot);
      await fs.rename(tmp, filePath);
    });
    return writeQueue;
  }

  const find = async (owner, id) => (await load()).tasks.find((t) => t.owner === owner && t.id === id);

  return {
    kind: filePath ? 'file' : 'memory',

    async list(owner) {
      return (await load()).tasks.filter((t) => t.owner === owner).map(toPublic);
    },

    async get(owner, id) {
      const task = await find(owner, id);
      return task ? toPublic(task) : null;
    },

    async create(owner, { title, description = '', priority = 'medium' }) {
      const { tasks } = await load();
      const now = new Date().toISOString();
      const task = { id: randomUUID(), owner, title, description, priority, completed: false, createdAt: now, updatedAt: now };
      tasks.unshift(task);
      await persist();
      return toPublic(task);
    },

    async update(owner, id, changes) {
      const task = await find(owner, id);
      if (!task) return null;
      Object.assign(task, changes, { updatedAt: new Date().toISOString() });
      await persist();
      return toPublic(task);
    },

    async remove(owner, id) {
      const s = await load();
      const index = s.tasks.findIndex((t) => t.owner === owner && t.id === id);
      if (index === -1) return false;
      s.tasks.splice(index, 1);
      await persist();
      return true;
    },

    /** Puts this owner's tasks in the given order (top to bottom). */
    async reorder(owner, ids) {
      const s = await load();
      const mine = new Map(s.tasks.filter((t) => t.owner === owner).map((t) => [String(t.id), t]));
      const others = s.tasks.filter((t) => t.owner !== owner);
      s.tasks = [...ids.map((id) => mine.get(String(id))), ...others];
      await persist();
    },

    async removeCompleted(owner) {
      const s = await load();
      const before = s.tasks.length;
      s.tasks = s.tasks.filter((t) => !(t.owner === owner && t.completed));
      await persist();
      return before - s.tasks.length;
    },

    async getListName(owner) {
      return (await load()).lists[owner]?.name ?? '';
    },

    async setListName(owner, name) {
      (await load()).lists[owner] = { name };
      await persist();
    },
  };
}
