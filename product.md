# Mokapi CLI — Product Specification v1.0

> **Run any JS/Python function as a REST endpoint in 2 seconds.**

---

## Overview

Mokapi is a zero-boilerplate, instant-on mock server runner for developers and AI agents. It is **not a framework** — it is a runner. Give it a single JS/TS or Python file, and it wraps that file's default export in a live HTTP server. Every incoming request executes the handler fresh, with no restart required.

**Design pillars:** Developer Experience (DX) · Speed · Scriptability · AI-agent friendliness.

---

## 1. The Handler Contract

### JavaScript / TypeScript

The target file must export a default function matching this signature:

```ts
type MokapiRequest = {
  method: string;                          // "GET" | "POST" | etc.
  path: string;                            // e.g. "/users/42"
  params: Record<string, string>;          // path params, future v2
  query: Record<string, string | string[]>; // ?foo=bar
  headers: Record<string, string>;
  body: any;                               // parsed JSON or raw string
};

type MokapiResponse =
  | any                                    // returned as-is → 200 JSON
  | { status: number; body: any; headers?: Record<string, string> };

export default function handler(req: MokapiRequest): MokapiResponse { ... }
```

**Return semantics:**
- Return a plain object/value → wrapped as `200 OK` with `Content-Type: application/json`.
- Return `{ status, body, headers? }` → respected as-is.
- Throw an error → Mokapi catches it, returns `500 { "error": "<message>" }`, and logs to stderr.

### Python

The Python file must print a single JSON object to stdout. Mokapi passes the request data via stdin as a JSON string.

```python
import sys, json

req = json.loads(sys.stdin.read())
# req keys: method, path, query, headers, body

print(json.dumps({ "status": 200, "body": { "hello": "world" } }))
```

Mokapi reads stdout as the response. Any output to stderr is surfaced in the Mokapi process log.

---

## 2. CLI Reference

### Primary Command

```
mokapi <file> [options]
```

| Flag | Short | Type | Default | Description |
|---|---|---|---|---|
| `--port` | `-p` | `number` | `3001` | Port to bind |
| `--delay` | `-d` | `number` (ms) | `0` | Artificial latency applied to **every** response, including errors |
| `--method` | `-m` | `string` | `ALL` | Filter to a single HTTP method. Other methods → `405 Method Not Allowed` |
| `--watch` | `-w` | `boolean` | `false` | Re-execute handler on file change (via chokidar); clears only the target file from require.cache |
| `--cors` | | `boolean` | `false` | Attach permissive CORS headers (`*`) to every response |
| `--json` | | `boolean` | `false` | Suppress banner/colors; emit only structured JSON log lines to stdout |
| `--no-banner` | | `boolean` | `false` | Skip ASCII logo; still print human-readable status lines |

### Examples

```bash
# Basic usage
mokapi handlers/users.ts

# Custom port + simulated 300ms network delay
mokapi handlers/users.ts -p 8080 -d 300

# Only handle POST, watch for changes
mokapi handlers/create-user.ts -m POST -w

# Silent mode for agent consumption
mokapi handlers/users.ts --json

# Python handler
mokapi handlers/users.py -p 4000
```

---

## 3. Engine Behavior

### Module Loading & Cache Busting

- JS/TS files: loaded via dynamic `import()` or `require()`.
- **Before every incoming request**, Mokapi deletes the handler file's entry from `require.cache` (and its immediate children if detectable). This means code changes take effect on the next request with no restart — even without `--watch`.
- `--watch` mode layers chokidar on top: on file change, Mokapi logs a reload notice and clears the cache proactively.

### Request Handling Flow

```
Incoming HTTP request
  → Apply --delay (if set)
  → Check --method filter (if set; else 405)
  → Clear require.cache for handler file
  → Import handler
  → Execute handler(req)
  → Serialize response → send
  → Log line (human or JSON mode)
```

### Error Handling

| Condition | HTTP response | Log |
|---|---|---|
| Handler throws at runtime | `500 { "error": "<message>" }` | Bold red to stderr with file/line snippet |
| Handler file has syntax error | `500 { "error": "<parse error>" }` | Bold red to stderr |
| `--method` filter mismatch | `405 { "error": "Method Not Allowed" }` | Dim log line |
| Python script exits non-zero | `500 { "error": "<stderr output>" }` | Bold red to stderr |

Mokapi **never crashes** on handler errors. The server stays alive.

---

## 4. Output & Logging

### Human Mode (default)

```
  ███╗   ███╗ ██████╗ ██╗  ██╗ █████╗ ██████╗ ██╗
  ████╗ ████║██╔═══██╗██║ ██╔╝██╔══██╗██╔══██╗██║
  ██╔████╔██║██║   ██║█████╔╝ ███████║██████╔╝██║
  ██║╚██╔╝██║██║   ██║██╔═██╗ ██╔══██║██╔═══╝ ██║
  ██║ ╚═╝ ██║╚██████╔╝██║  ██╗██║  ██║██║     ██║
  ╚═╝     ╚═╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝

  Run any JS/Python function as a REST endpoint in 2 seconds.

  ● Listening on http://localhost:3000
  ● Handler: handlers/users.ts
  ● Watch: off  |  Delay: 0ms  |  Method: ALL
```

Request log format:
```
  GET  /users              200 OK      (45ms)       ← green/cyan
  POST /users              201 Created (112ms)      ← green/cyan
  GET  /bad-route          500 Error   (8ms)        ← bold red
```

### JSON Mode (`--json`)

All output is newline-delimited JSON. No banner, no colors.

```json
{ "time": "2026-03-24T23:45:00Z", "method": "GET", "path": "/users", "status": 200, "durationMs": 45 }
{ "time": "2026-03-24T23:45:01Z", "method": "POST", "path": "/users", "status": 500, "durationMs": 8, "error": "Cannot read property 'id' of undefined" }
```

Errors also emit a one-line summary to **stderr** in all modes:
```
[mokapi] ERROR handlers/users.ts:12 — Cannot read property 'id' of undefined
```

---

## 5. Technical Stack

| Concern | Package |
|---|---|
| HTTP server | `fastify` |
| CLI parsing | `commander` |
| Terminal colors | `picocolors` |
| File watching | `chokidar` |
| ASCII logo | `figlet` + `gradient-string` |
| TypeScript runtime (dev) | `tsx` |
| Build/bundle | `tsup` (wraps esbuild) |

### Project Structure

```
mokapi/
├── src/
│   ├── index.ts          # CLI entrypoint (commander setup)
│   ├── server.ts         # Fastify server + request lifecycle
│   ├── loader.ts         # Dynamic import + cache busting
│   ├── python.ts         # child_process Python interop
│   ├── logger.ts         # Human + JSON log modes
│   └── banner.ts         # ASCII logo + startup info
├── dist/                 # tsup output (single CJS bundle)
├── package.json
└── tsconfig.json
```

### package.json essentials

```json
{
  "name": "mokapi",
  "bin": { "mokapi": "./dist/index.js" },
  "scripts": {
    "dev": "tsx src/index.ts",
    "build": "tsup src/index.ts --format cjs --shims --banner.js '#!/usr/bin/env node'",
    "prepublishOnly": "npm run build"
  }
}
```

The dist bundle must begin with `#!/usr/bin/env node` so `npx mokapi` works without a global install.