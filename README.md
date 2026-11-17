# Tobe_app
To be or not to be (To Do List) App

A full-stack to-do list with a **React** frontend (Vite) and an **Express** REST API.

## Features

- Add, edit, delete, and complete tasks
- Edit by double-clicking a task or using the pencil button (Enter saves, Esc cancels)
- Filter by **All / Active / Completed**, with a progress ring and a "Clear completed" action
- Changes appear instantly and are rolled back if the server rejects them
- A light blue theme with rounded corners, plus a dark variant (follows your system setting), a responsive layout, and keyboard-accessible controls
- Tasks are saved to a JSON file on the server, so there's no database to set up

## Project structure

```
├── client/                 React app (Vite)
│   └── src/
│       ├── App.jsx         Page layout, filtering, and counts
│       ├── TasksContext.jsx  Shares task state and API actions with all components
│       ├── useTasks.js     Task state and server sync (loading, errors, rollback)
│       ├── api.js          Fetch wrapper for the REST API
│       ├── styles.css      Design tokens and styles
│       └── components/     Header, TaskForm, TaskList, TaskItem, FilterBar, ProgressRing
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

### Deploying to Vercel

`vercel.json` deploys the repo as one Vercel project with two services:

| Service  | Folder    | Framework | Public path | Purpose                     |
| -------- | --------- | --------- | ----------- | --------------------------- |
| `server` | `server/` | Express   | `/api/*`    | The REST API                |
| `client` | `client/` | Vite      | `/*`        | The React app (static site) |

The browser calls the API at the same-origin path `/api`, so no extra URLs or environment variables are needed. On Vercel, the Express app is exported from `server/src/index.js` instead of calling `listen()`.

> **Storage warning:** On Vercel, tasks are saved to the function's temporary directory. They are **not durable**: they can disappear when the function restarts and may differ between instances. Back the store (`server/src/store.js`) with a database before relying on the deployed app.

To test both services together locally the way Vercel runs them:

```bash
npx vercel dev
```

### Configuration

| Variable    | Default                  | Description                       |
| ----------- | ------------------------ | --------------------------------- |
| `PORT`      | `4000`                   | API server port                   |
| `DATA_FILE` | `server/data/tasks.json` | Where tasks are saved             |
| `VITE_API_URL` | `/api`                | Frontend only: base URL of the API, read when the client is built. Leave unset when the API is on the same domain (dev proxy, `npm start`, Vercel). See `client/.env.example`. |

## API

All endpoints are under `/api` and use JSON.

| Method   | Endpoint                     | Body                                   | Description                |
| -------- | ---------------------------- | -------------------------------------- | -------------------------- |
| `GET`    | `/tasks`                     |                                        | List all tasks             |
| `GET`    | `/tasks/:id`                 |                                        | Get one task               |
| `POST`   | `/tasks`                     | `{ "title": "Buy milk" }`              | Create a task              |
| `PUT`    | `/tasks/:id`                 | `{ "title": string, "completed": boolean }` | Replace a task (used to toggle and rename) |
| `PATCH`  | `/tasks/:id`                 | `{ "title"?: string, "completed"?: boolean }` | Change only some fields |
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
