import path from 'path';
import { MokapiRequest } from './types';

// Register esbuild-register so TypeScript handler files can be loaded via require()
// This is a no-op if already registered or if running under tsx (which handles it natively)
let _esbuildRegistered = false;
function ensureTypeScriptSupport(): void {
  if (_esbuildRegistered) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { register } = require('esbuild-register/dist/node');
    register({ target: 'node18' });
    _esbuildRegistered = true;
  } catch {
    // esbuild-register not available — tsx is probably handling it
    _esbuildRegistered = true;
  }
}

// Lazy require for the Python runner to avoid loading it until needed
let _runPython: ((filePath: string, req: MokapiRequest) => Promise<unknown>) | null = null;

async function getPythonRunner() {
  if (!_runPython) {
    const pyModule = await import('./python');
    _runPython = pyModule.runPython;
  }
  return _runPython;
}

export async function loadHandler(filePath: string): Promise<unknown> {
  const resolved = path.resolve(filePath);

  // Python: delegate entirely to runPython
  if (resolved.endsWith('.py')) {
    const runPython = await getPythonRunner();
    return (req: MokapiRequest) => runPython(resolved, req);
  }

  // TypeScript: ensure esbuild-register is active
  if (resolved.endsWith('.ts') || resolved.endsWith('.tsx')) {
    ensureTypeScriptSupport();
  }

  // JS/TS: bust require cache before loading
  bustCache(resolved);

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require(resolved);
    const handler = mod.default !== undefined ? mod.default : mod;

    if (typeof handler !== 'function') {
      const errorMsg = `
# Mokapi saw your file but couldn't find a valid handler.
# A handler must be a function exported as 'default'.

# Example minimal handler:
export default (req) => {
  return { id: 1, name: "Alice" };
};
`;
      throw new Error(errorMsg);
    }

    return handler;
  } catch (err) {
    throw err; // re-throw with original message or our custom message
  }
}

function bustCache(resolved: string): void {
  // Try to get exact Node require.cache path which might differ in case on Windows
  let exactPath = resolved;
  try {
    exactPath = require.resolve(resolved);
  } catch {
    // Ignore if not resolvable
  }

  const dir = path.dirname(resolved);
  const exactDir = path.dirname(exactPath);

  // Delete the main file entry
  delete require.cache[resolved];
  delete require.cache[exactPath];

  // Delete any cached module whose path starts with the same directory
  // and is not inside node_modules (transitive local deps)
  for (const key of Object.keys(require.cache)) {
    if ((key.startsWith(dir) || key.startsWith(exactDir)) && !key.includes('node_modules')) {
      delete require.cache[key];
    }
  }
}
