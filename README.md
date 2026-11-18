# Tobe_app
To be or not to be (To Do List) App

A full-stack to-do list with a **React** frontend (Vite) and an **Express** REST API.

## Features

- **Private lists, no sign-up**: every visitor automatically gets their own list. Nobody else can see or change it
- **Name your list**: click the pencil next to the title and type your name, so "My Tasks" becomes "Dief's To-Do List"
- Add, edit, delete, and complete tasks
- Give each task an optional **description** (shown in lighter text under it) and an **importance**: Low, Medium, High or Urgent
- **Drag to reorder**: hold the grip button next to a task and drag it. The order is saved. With a keyboard, focus the grip, press Space, move with the arrow keys, and press Space again
- Edit by double-clicking a task or using the pencil button (Enter saves, Esc cancels)
- **Celebrations**: completing a task bursts sparks from its checkbox; finishing every task sets off a bigger burst and a 🎉 over the 100% ring
- Springy "pop" animations on clicks, new tasks, deletes, filters and counters (turned off automatically when your system asks for reduced motion)
- Filter by **All / Active / Completed**, with a progress ring and a "Clear completed" action
- Changes appear instantly and are rolled back if the server rejects them
- A light blue theme with rounded corners, plus a dark variant (follows your system setting), a responsive layout, and keyboard-accessible controls
- Tasks are saved in a Supabase (PostgreSQL) database in production, or a local JSON file when no database is configured

## Project structure

```
├── client/                 React app (Vite)
│   └── src/
│       ├── App.jsx         Page layout, filtering, and counts
│       ├── TasksContext.jsx  Shares task state and API actions with all components
│       ├── useTasks.js     Task state and server sync (loading, errors, rollback)
│       ├── api.js          Fetch wrapper for the REST API
│       ├── listKey.js      Creates and remembers this browser's private list key
│       ├── celebrate.js    Spark and confetti bursts
│       ├── styles.css      Design tokens and styles
│       └── components/     Header, TaskForm, TaskList (drag and drop), TaskItem, Priority, FilterBar, ProgressRing
└── server/                 Express API
    ├── src/
    │   ├── app.js          Express app setup (CORS, JSON parsing, routing)
    │   ├── routes/tasks.js Task endpoints
    │   ├── validation.js   Request body validation
    │   ├── errors.js       Error types and error-handling middleware
    │   ├── owner.js        Reads the list key from each request
    │   ├── routes/list.js  The list's optional name
    │   ├── store.js        JSON-file task storage (local fallback)
    │   ├── supabaseStore.js  Supabase (PostgreSQL) task storage
    │   └── index.js        Server entry point
    ├── supabase/schema.sql SQL that creates the tasks table in Supabase
    └── test/               API tests (node:test + supertest)
```

## How private lists work

There are no accounts. On the first visit, the browser creates a long random **list key** and saves it in `localStorage`. Every API request sends it in an `X-List-Key` header. The server stores only a SHA-256 hash of the key and uses it to scope every query, so each request can only read and change its own list. Asking for another list's task returns `404`.

Because the list belongs to the browser:

- A different device or browser, a private window, or clearing the browser's site data opens a **new, empty list**. The old list can't be recovered without its key.
- Tasks created before private lists existed have no owner, so no list shows them. To delete them in Supabase, run `delete from public.tasks where owner_id is null;`.

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

> **Storage:** Set up Supabase (next section) so tasks are saved permanently. Without it, the deployed API falls back to a temporary file, and tasks can disappear when Vercel restarts the function.

To test both services together locally the way Vercel runs them:

```bash
npx vercel dev
```

### Database: Supabase (PostgreSQL)

The server stores tasks in Supabase when `SUPABASE_URL` and a secret key are set. Otherwise it uses a local JSON file. The API and the React app work the same either way.

**1. Create the table.** In your Supabase project, open **SQL Editor** → **New query**, paste the contents of [`server/supabase/schema.sql`](server/supabase/schema.sql), and click **Run**. This creates:

| Column       | Type                       | Notes                               |
| ------------ | -------------------------- | ----------------------------------- |
| `id`         | `bigint`                   | Primary key, auto-increment         |
| `text`       | `text`                     | Required, 1–200 characters          |
| `completed`  | `boolean`                  | Defaults to `false`                 |
| `created_at` | `timestamp with time zone` | Defaults to `now()`                 |
| `description`| `text`                     | Optional, up to 500 characters      |
| `owner_id`   | `text`                     | SHA-256 hash of the list key that owns the task |
| `priority`   | `text`                     | `low`, `medium` (default), `high` or `urgent` |
| `position`   | `double precision`         | Manual order (highest first); new tasks go on top |

It also creates a `lists` table (`owner_id`, `name`) for list names, and a `reorder_tasks` function that saves a new order in one call; only the server's secret key may run it.

> **Upgrading?** If you created the table with an earlier version of this file, just run the whole file again. It adds the new columns without touching your existing tasks.

It also turns on **row level security** with no policies, so the public (anon/publishable) key can't read or change tasks. Only the server, using the secret key, can.

**2. Copy your project's URL and secret key.** In Supabase, click **Connect** (or open **Project Settings** → **Data API**) to find the **Project URL**. Under **Project Settings** → **API Keys**, copy a **secret** key (`sb_secret_…`), or the legacy **`service_role`** key.

> Keep the secret key on the server only. Never put it in a `VITE_` variable or in frontend code.

**3. Add them to Vercel.** In your Vercel project, open **Settings** → **Environment Variables** and add:

| Key                         | Value                         |
| --------------------------- | ----------------------------- |
| `SUPABASE_URL`              | Your Project URL              |
| `SUPABASE_SERVICE_ROLE_KEY` | Your secret / service_role key |

Apply them to **Production and Preview**, then **redeploy** (variables only take effect on a new deployment).

**4. Check it.** Open `https://<your-app>.vercel.app/api/health`. It should show `{"status":"ok","storage":"supabase"}`. If it says `"storage":"file"`, the variables aren't set for that deployment.

**Running locally against Supabase:** set the same two variables before starting the server, for example:

```bash
SUPABASE_URL=https://<project>.supabase.co SUPABASE_SERVICE_ROLE_KEY=<secret key> npm run dev
```

**Integration tests:** `server/test/supabase.integration.test.js` runs the API against a real Supabase database. It is skipped unless `SUPABASE_TEST_URL` and `SUPABASE_TEST_SERVICE_KEY` are set (plus `SUPABASE_TEST_ANON_KEY` for the row-level-security check). Use a throwaway project: the test deletes completed tasks.

### Configuration

| Variable    | Default                  | Description                       |
| ----------- | ------------------------ | --------------------------------- |
| `PORT`      | `4000`                   | API server port                   |
| `SUPABASE_URL` | —                      | Supabase Project URL. With a secret key, enables database storage |
| `SUPABASE_SERVICE_ROLE_KEY` | —         | Supabase secret (`sb_secret_…`) or `service_role` key. `SUPABASE_SECRET_KEY` also works |
| `DATA_FILE` | `server/data/tasks.json` | Where tasks are saved when Supabase isn't configured |
| `VITE_API_URL` | `/api`                | Frontend only: base URL of the API, read when the client is built. Leave unset when the API is on the same domain (dev proxy, `npm start`, Vercel). See `client/.env.example`. |

## API

All endpoints are under `/api` and use JSON. Except `/health`, every request must include an `X-List-Key` header: 32–128 characters of letters, digits, `-` or `_`. Without one the server returns `401`. Each key sees only its own tasks and name.

| Method   | Endpoint                     | Body                                   | Description                |
| -------- | ---------------------------- | -------------------------------------- | -------------------------- |
| `GET`    | `/tasks`                     |                                        | List all tasks             |
| `GET`    | `/tasks/:id`                 |                                        | Get one task               |
| `POST`   | `/tasks`                     | `{ "title": "Buy milk", "description"?: string, "priority"?: "low" \| "medium" \| "high" \| "urgent" }` | Create a task (description defaults to `""`, priority to `"medium"`) |
| `PUT`    | `/tasks/order`               | `{ "ids": [id, id, ...] }`             | Save a new order, top to bottom. Must list every task once (`409` if the list changed) |
| `PUT`    | `/tasks/:id`                 | `{ "title"?, "description"?, "priority"?, "completed"? }` | Update any of these fields |
| `PATCH`  | `/tasks/:id`                 | same as `PUT`                          | Same as `PUT`              |
| `DELETE` | `/tasks/:id`                 |                                        | Delete a task              |
| `DELETE` | `/tasks?completed=true`      |                                        | Delete all completed tasks |
| `GET`    | `/list`                      |                                        | This list's name: `{ "name": "Dief" }` (`""` if not set) |
| `PUT`    | `/list`                      | `{ "name": string }`                   | Set the name (up to 40 characters); `""` clears it |
| `GET`    | `/health`                    |                                        | Health check; `storage` shows `supabase` or `file` |

A task looks like this:

```json
{
  "id": 42,
  "title": "Buy milk",
  "description": "Oat milk, 2 cartons",
  "priority": "high",
  "completed": false,
  "createdAt": "2026-11-17T16:30:12.286Z"
}
```

With Supabase, `id` is a number. With the local JSON file it's a UUID string, and tasks also include `updatedAt`.

Titles are trimmed and must be 1–200 characters. `POST` returns `201` with a `Location` header pointing at the new task.

### Error responses

Every error is JSON in the form `{ "error": "Human-readable message" }`:

| Status | When |
| ------ | ---- |
| `400`  | Invalid input: missing or empty title, `completed` not true/false, unknown fields, or malformed JSON |
| `401`  | Missing or invalid `X-List-Key` header |
| `404`  | No task with that ID in your list, or an unknown route |
| `409`  | Reorder request that doesn't list exactly the current tasks |
| `405`  | Wrong method for a path, e.g. `POST /api/tasks/:id` (the `Allow` header lists valid methods) |
| `413`  | Request body larger than 10 KB |
| `415`  | Body sent without `Content-Type: application/json` |
| `500`  | Unexpected server error (details are logged on the server, not sent to the client) |

The server code is split into `server/src/routes/tasks.js` (routes), `validation.js` (input checks) and `errors.js` (error classes and the error-handling middleware).
