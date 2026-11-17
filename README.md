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
