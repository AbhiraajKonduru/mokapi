import Fastify from 'fastify';
import path from 'path';
import chokidar from 'chokidar';
import pc from 'picocolors';
import { MokapiServerOpts, MokapiRequest, MokapiResponse } from './types';
import { loadHandler } from './loader';
import { logRequest, logError, setJsonMode } from './logger';

export async function startServer(opts: MokapiServerOpts): Promise<void> {
  setJsonMode(opts.json);

  const fastify = Fastify({ logger: false });

  // Parse JSON bodies — register for all content types to avoid 415 errors
  fastify.addContentTypeParser('application/json', { parseAs: 'string' }, (_req, body, done) => {
    try {
      done(null, JSON.parse(body as string));
    } catch (err) {
      done(err as Error, undefined);
    }
  });

  // Allow any content-type (raw string passthrough) for non-JSON bodies
  fastify.addContentTypeParser('*', { parseAs: 'string' }, (_req, body, done) => {
    done(null, body);
  });

  // CORS preflight
  if (opts.cors) {
    fastify.addHook('onSend', async (_req, reply) => {
      reply.header('Access-Control-Allow-Origin', '*');
      reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      reply.header('Access-Control-Allow-Headers', '*');
    });

    fastify.options('/*', async (_req, reply) => {
      reply.status(204).send();
    });
  }

  // Register routes
  const filesToRegister = opts.files;

  for (const file of filesToRegister) {
    const routePattern = filesToRegister.length === 1 
      ? '/*' 
      : `/${path.basename(file, path.extname(file))}`;

    fastify.all(routePattern, async (req, reply) => {
      const start = Date.now();

      // Apply delay first
      if (opts.delay > 0) {
        await new Promise((r) => setTimeout(r, opts.delay));
      }

      // Method filter check
      if (opts.method !== 'ALL' && req.method !== opts.method) {
        const duration = Date.now() - start;
        logRequest(req.method, req.url, 405, duration);
        return reply.status(405).send({ error: 'Method Not Allowed' });
      }

      // Load handler
      let handler: unknown;
      try {
        handler = await loadHandler(file);
      } catch (err) {
        const duration = Date.now() - start;
        const message = err instanceof Error ? err.message : String(err);
        logRequest(req.method, req.url, 500, duration, message);
        logError(path.relative(process.cwd(), file), 0, message);
        return reply.status(500).send({ error: message });
      }

      // Build MokapiRequest
      const mokapiReq: MokapiRequest = {
        method: req.method,
        path: req.url,
        params: req.params as Record<string, string>,
        query: req.query as Record<string, string | string[]>,
        headers: req.headers as Record<string, string>,
        body: req.body,
      };

      // Execute handler
      let result: unknown;
      try {
        if (typeof handler !== 'function') {
          throw new Error(`Handler in ${file} must export a default function.`);
        }
        result = await (handler as (req: MokapiRequest) => unknown)(mokapiReq);
      } catch (err) {
        const duration = Date.now() - start;
        const message = err instanceof Error ? err.message : String(err);
        logRequest(req.method, req.url, 500, duration, message);
        logError(path.relative(process.cwd(), file), 0, message);
        return reply.status(500).send({ error: message });
      }

      // Shape the response
      const duration = Date.now() - start;
      if (
        result !== null &&
        typeof result === 'object' &&
        'status' in (result as object) &&
        typeof (result as MokapiResponse).status === 'number'
      ) {
        const res = result as MokapiResponse;
        if (res.headers) {
          for (const [k, v] of Object.entries(res.headers)) {
            reply.header(k, v);
          }
        }
        logRequest(req.method, req.url, res.status, duration);
        return reply.status(res.status).send(res.body);
      } else {
        logRequest(req.method, req.url, 200, duration);
        return reply.status(200).send(result);
      }
    });
  }

  // Watch mode
  if (opts.watch) {
    for (const file of opts.files) {
      const absFile = path.resolve(file);
      const watcher = chokidar.watch(absFile, { ignoreInitial: true });
      
      if (!opts.json) {
        console.log(`  ${pc.cyan('🔄')} Watching ${pc.bold(path.basename(absFile))} for changes...`);
      }

      watcher.on('change', () => {
        if (!opts.json) {
          console.log(`  ${pc.cyan('↺')} Handler reloaded: ${pc.bold(path.basename(absFile))}`);
        }
      });
    }
  }

  // Start listening
  try {
    await fastify.listen({ port: opts.port, host: '0.0.0.0' });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`[mokapi] Failed to start server: ${message}\n`);
    process.exit(1);
  }
}
