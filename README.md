# 🚀 ez-mokapi

**Run any JS/TS/Python function as a REST endpoint in 2 seconds.**

Every mock API tool I tried solved the problem... eventually. But they all came with ceremony: a config file to write, a UI to click through, a server to scaffold, or a JSON schema to maintain. I just wanted to point at a file I'd already written and get an endpoint. I'd been writing Node for years and it felt obvious that this should be a one-liner in the terminal. So I built ez-mokapi: no config, no boilerplate, no context-switching. Write a function, run a command, get a URL.

ez-mokapi is a lightning-fast, zero-config CLI tool designed for developers who need to mock, simulate, or experiment with APIs instantly. Turn any simple script file into a fully functional local web server. No complex routing, no boilerplate, just write a function and go.

[![npm version](https://img.shields.io/npm/v/ez-mokapi.svg)](https://www.npmjs.com)

---

## ⚡ Features

- **Zero Config**: Point it at a file, get an endpoint immediately.
- **Multi-language Support**: Write handlers in JavaScript, TypeScript (natively, without manual building), or Python.
- **Smart Routing**: 
  - Pass a single file: Acts as a catch-all endpoint (`/*`).
  - Pass multiple files: Auto-maps each file to a dedicated route (e.g., `users.ts` -> `/users`).
- **Live Reloading**: Use `--watch` to automatically hot-reload your handler logic to see changes instantly without restarting the server.
- **Network Simulation**: Easily simulate slow connections by injecting lag using `--delay`.
- **CORS Support**: Enable permissive CORS headers with a single `--cors` flag for direct frontend integration.
- **Simulate error handling**: Easily simulate error handling by returning an error object from the handler function.

---
<img width="1158" height="378" alt="Screenshot 2026-03-24 220508" src="https://github.com/user-attachments/assets/12e5bfa0-9c82-437c-97bc-7b81175299eb" />
---

## 🛠️ Quick Start

### Running Your Own Mocks

Create a tiny JavaScript handler (`mock.js`):
```js
export default (req) => {
  return { id: 1, message: "Hello from Mokapi!" };
};
```

Run it:
```bash
npx ez-mokapi mock.js --port 3001
```
Test it: `curl http://localhost:3001` or `irm http://localhost:3001`

---

## 📖 The Handler Contract

ez-mokapi expects your file to export a **default function**. This function receives the incoming request details and its return value is sent back as the HTTP response.

### TypeScript / JavaScript

```typescript
// users.ts
export default (req) => {
  // `req` contains method, path, params, query, headers, and parsed JSON body.
  
  if (req.method === 'POST') {
    return { status: 201, body: { success: true, data: req.body }};
  }
  
  // Return standard JSON objects out of the box
  return [
    { id: 1, name: "Alice" },
    { id: 2, name: "Bob" }
  ];
};
```

### Python

```python
# data.py
def mock_handler(req):
    # 'req' is a dictionary with similar shape: method, path, body, etc.
    return {
        "status": 200,
        "body": {
            "message": "Hello from Python",
            "received_method": req.get("method")
        }
    }
```

---

## 🗺️ Routing: Single vs. Multiple Files

ez-mokapi adapts its routing based on how many files you provide:

### Single File (Catch-All)
If you provide a single file, Mokapi creates a "Catch-All" route (`/*`):
```bash
npx ez-mokapi index.ts
```
*Requests to `/users`, `/payments`, or `/any/nested/path` will all be routed to `index.ts`.*

### Multiple Files (File-based Routing)
If you provide multiple files, Mokapi auto-maps them to specific endpoints based on their filenames:
```bash
npx ez-mokapi users.js auth.ts
```
* `users.js` handles requests to `/users`.
* `auth.ts` handles requests to `/auth`.

---

## ⚙️ Request & Response Objects

ez-mokapi makes the incoming HTTP request highly accessible to your handler function. 

### `MokapiRequest`
Your handler function is passed a request object containing the following properties:
- `method` (String): The HTTP method (GET, POST, etc.)
- `path` (String): The request URL path
- `query` (Object): Parsed query string parameters
- `headers` (Object): Incoming HTTP headers
- `body` (Object/String): The request payload (automatically parsed as JSON if applicable)

### Returning a Response
Your function can return one of two types of responses:

1. **Direct Payload (Implicit 200 OK)**:
   Return an object, array, or string directly, and ez-mokapi will wrap it in an HTTP 200.
   ```javascript
   export default () => ({ status: 'active' });
   ```

2. **Structured Response (Custom Status & Headers)**:
   Return an object with a `status` and `body` property (and optionally `headers`) to control the exact shape of the HTTP response.
   ```javascript
   export default () => ({
     status: 404,
     headers: { 'X-Custom-Header': 'demo' },
     body: { error: 'Not Found' }
   });
   ```

---

## 🔧 CLI Options

| Flag | Shortcut | Description | Default |
| :--- | :--- | :--- | :--- |
| `--port` | `-p` | Port to bind the local server | `3001` |
| `--delay` | `-d` | Artificial network delay in milliseconds | `0` |
| `--method` | `-m` | Filter acceptable HTTP methods (`GET`, `POST`, `ALL`, etc.) | `ALL` |
| `--watch` (coming soon) | `-w` | Watch handler file(s) for changes and live-reload them | `false` |
| `--cors` | | Enable permissive CORS headers | `false` |
| `--json` | | Output only structured JSON logs | `false` |
| `--no-banner`| | Skip printing the Mokapi ASCII banner | |
| `--demo` | | Prints a minimal mock file and runs it automatically for you | |
| `--help` | `-h` | Display help output with an example handler. | |

---

## 💡 Use Cases

* **Frontend Development**: Unblock UI teams immediately. Stub out API responses that match expected backend definitions to keep working before the backend is out of staging.
* **Testing Edge Cases**: Want to see how your frontend responds when a request takes exactly `4.5` seconds or throws a chaotic HTTP 500 error? Easily simulate this with the `--delay` flag and a custom status return object.
* **Webhook Receivers**: Need to accept and log an external webhook on your local machine instantly? Just point Mokapi at a simple script that logs the incoming `req.body` payload.
