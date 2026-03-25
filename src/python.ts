import { spawn } from 'child_process';
import { MokapiRequest, MokapiResponse } from './types';

export function runPython(filePath: string, req: MokapiRequest): Promise<MokapiResponse> {
  return new Promise((resolve, reject) => {
    // Try python3 first, fall back to python
    const pythonBin = process.platform === 'win32' ? 'python' : 'python3';
    const child = spawn(pythonBin, [filePath], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    // Write request to stdin and close it
    child.stdin.write(JSON.stringify(req));
    child.stdin.end();

    child.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(stderr.trim() || `Python process exited with code ${code}`));
      }

      const raw = stdout.trim();
      try {
        const parsed = JSON.parse(raw) as MokapiResponse;
        resolve(parsed);
      } catch {
        reject(new Error(`Python handler returned invalid JSON: ${raw}`));
      }
    });

    child.on('error', (err) => {
      reject(new Error(`Failed to spawn Python: ${err.message}`));
    });
  });
}
