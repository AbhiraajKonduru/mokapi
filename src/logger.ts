import pc from 'picocolors';

let jsonMode = false;

export function setJsonMode(val: boolean): void {
  jsonMode = val;
}

export function logRequest(
  method: string,
  reqPath: string,
  status: number,
  durationMs: number,
  error?: string
): void {
  if (jsonMode) {
    const entry: Record<string, unknown> = {
      time: new Date().toISOString(),
      method,
      path: reqPath,
      status,
      durationMs,
    };
    if (error) entry.error = error;
    console.log(JSON.stringify(entry));
    return;
  }

  const statusStr = String(status);
  let statusColored: string;
  if (status >= 200 && status < 300) {
    statusColored = pc.green(statusStr);
  } else if (status >= 500) {
    statusColored = pc.bold(pc.red(statusStr));
  } else {
    statusColored = pc.dim(statusStr);
  }

  const methodPadded = method.padEnd(6);
  const durationStr = `(${durationMs}ms)`;

  if (error) {
    console.log(`  ${pc.cyan(methodPadded)} ${reqPath.padEnd(25)} ${statusColored} ${pc.dim(durationStr)} ${pc.red(error)}`);
  } else {
    console.log(`  ${pc.cyan(methodPadded)} ${reqPath.padEnd(25)} ${statusColored} ${pc.dim(durationStr)}`);
  }
}

export function logError(file: string, line: string | number, message: string): void {
  process.stderr.write(`${pc.bold(pc.red('[mokapi]'))} ERROR ${file}:${line} — ${message}\n`);
}
