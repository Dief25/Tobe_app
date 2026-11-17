import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

/**
 * A tiny JSON-file-backed task store. Writes are serialized through a
 * promise chain so concurrent requests can't clobber each other.
 * Pass `filePath: null` for a purely in-memory store (used by tests).
 */
export function createStore({ filePath = null } = {}) {
  let tasks = null;
  let writeQueue = Promise.resolve();

  async function load() {
    if (tasks) return tasks;
    if (!filePath) return (tasks = []);
    try {
      tasks = JSON.parse(await fs.readFile(filePath, 'utf8'));
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
      tasks = [];
    }
    return tasks;
  }

  function persist() {
    if (!filePath) return Promise.resolve();
    const snapshot = JSON.stringify(tasks, null, 2);
    writeQueue = writeQueue.then(async () => {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      const tmp = `${filePath}.tmp`;
      await fs.writeFile(tmp, snapshot);
      await fs.rename(tmp, filePath);
    });
    return writeQueue;
  }

  return {
    kind: filePath ? 'file' : 'memory',

    async list() {
      return [...(await load())];
    },

    async get(id) {
      return (await load()).find((t) => t.id === id) ?? null;
    },

    async create({ title }) {
      const list = await load();
      const now = new Date().toISOString();
      const task = { id: randomUUID(), title, completed: false, createdAt: now, updatedAt: now };
      list.unshift(task);
      await persist();
      return task;
    },

    async update(id, changes) {
      const list = await load();
      const task = list.find((t) => t.id === id);
      if (!task) return null;
      Object.assign(task, changes, { updatedAt: new Date().toISOString() });
      await persist();
      return task;
    },

    async remove(id) {
      const list = await load();
      const index = list.findIndex((t) => t.id === id);
      if (index === -1) return false;
      list.splice(index, 1);
      await persist();
      return true;
    },

    async removeCompleted() {
      const list = await load();
      const before = list.length;
      tasks = list.filter((t) => !t.completed);
      await persist();
      return before - tasks.length;
    },
  };
}
