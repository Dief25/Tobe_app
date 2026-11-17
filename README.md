# Tobe_app
To be or not to be (To Do List) App

A full-stack to-do list with a **React** frontend (Vite) and an **Express** REST API.

## Features

- Add, edit, delete, and complete tasks
- Edit by double-clicking a task or using the pencil button (Enter saves, Esc cancels)
- Filter by **All / Active / Completed**, with a progress ring and a "Clear completed" action
- Changes appear instantly and are rolled back if the server rejects them
- Light and dark themes (follows your system setting), a responsive layout, and keyboard-accessible controls
- Tasks are saved to a JSON file on the server, so there's no database to set up

## Project structure

```
├── client/                 React app (Vite)
│   └── src/
│       ├── App.jsx         Page layout, filtering, and counts
│       ├── useTasks.js     Task state and server sync
│       ├── api.js          Fetch wrapper for the REST API
│       ├── styles.css      Design tokens and styles
│       └── components/     TaskForm, TaskList, TaskItem, FilterBar, ProgressRing
└── server/                 Express API
    ├── src/
    │   ├── app.js          Routes and validation
    │   ├── store.js        JSON-file task storage
    │   └── index.js        Server entry point
    └── test/api.test.js    API tests (node:test + supertest)
```

## Getting started

Requires Node.js 18+.

```bash
npm install
npm run dev
```

The app opens at http://localhost:5173. The API runs on http://localhost:4000, and Vite forwards `/api` requests to it.

### Production

```bash
npm run build
npm start
```

Express serves the built React app and the API together at http://localhost:4000.

### Tests

```bash
npm test
```

### Running in GitHub Codespaces

The repo includes a dev container config (`.devcontainer/devcontainer.json`). It uses Node.js 22, runs `npm install` when the codespace is created, and forwards the app's ports.

1. On the repository page on GitHub, click **Code** → **Codespaces** → **Create codespace on main** (or choose your branch from the branch picker first).
2. Wait for the codespace to finish building. Dependencies are installed automatically; you'll see `npm install` run in the terminal.
3. In the terminal, start the app:

   ```bash
   npm run dev
   ```

4. Codespaces opens the web app (port **5173**) in a new browser tab automatically. If it doesn't, open the **Ports** tab, find **Web app (Vite)**, and click the globe icon. The URL looks like `https://<codespace-name>-5173.app.github.dev`.

   You only need port 5173. The frontend sends API calls to the Express server (port 4000) through Vite's proxy, so you don't have to make port 4000 public.

5. To run the tests, open a second terminal (**+** in the terminal panel) and run:

   ```bash
   npm test
   ```

To try the production build instead, stop the dev server (Ctrl+C), then run:

```bash
npm run build && npm start
```

and open port **4000** from the **Ports** tab.

**Notes**

- Tasks are saved in `server/data/tasks.json` inside the codespace. They survive stopping and restarting the codespace, but are lost when the codespace is deleted. The file is git-ignored, so it is never committed.
- If you open the codespace from an older branch without the dev container config, run `npm install` yourself before step 3.
- If you see *"Blocked request. This host is not allowed"*, make sure `client/vite.config.js` still has `allowedHosts: ['.app.github.dev']`.

### Configuration

| Variable    | Default                  | Description                       |
| ----------- | ------------------------ | --------------------------------- |
| `PORT`      | `4000`                   | API server port                   |
| `DATA_FILE` | `server/data/tasks.json` | Where tasks are saved             |

## API

All endpoints are under `/api` and use JSON.

| Method   | Endpoint                     | Body                                   | Description                |
| -------- | ---------------------------- | -------------------------------------- | -------------------------- |
| `GET`    | `/tasks`                     |                                        | List all tasks             |
| `GET`    | `/tasks/:id`                 |                                        | Get one task               |
| `POST`   | `/tasks`                     | `{ "title": "Buy milk" }`              | Create a task              |
| `PATCH`  | `/tasks/:id`                 | `{ "title"?: string, "completed"?: boolean }` | Edit or complete a task |
| `DELETE` | `/tasks/:id`                 |                                        | Delete a task              |
| `DELETE` | `/tasks?completed=true`      |                                        | Delete all completed tasks |
| `GET`    | `/health`                    |                                        | Health check               |

A task looks like this:

```json
{
  "id": "b3f1c6e2-…",
  "title": "Buy milk",
  "completed": false,
  "createdAt": "2026-11-17T16:30:12.286Z",
  "updatedAt": "2026-11-17T16:30:12.286Z"
}
```

Titles are trimmed and must be 1–200 characters. Invalid requests return `400` with `{ "error": "..." }`, and unknown IDs return `404`.
