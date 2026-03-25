import { Command } from 'commander';
import path from 'path';

const program = new Command();

program
  .name('mokapi')
  .description('Run any JS/Python function as a REST endpoint in 2 seconds.')
  .argument('[files...]', 'Path to the handler file(s) (JS/TS/Python)')
  .option('--demo', 'Print a minimal mock file and run it', false)
  .option('-p, --port <number>', 'Port to bind', '3001')
  .option('-d, --delay <number>', 'Artificial delay in ms', '0')
  .option('-m, --method <method>', 'Filter to a single HTTP method (ALL, GET, POST, etc.)', 'ALL')
  .option('-w, --watch', 'Watch handler file for changes', false)
  .option('--cors', 'Enable permissive CORS headers', false)
  .option('--json', 'Output only structured JSON logs', false)
  .option('--no-banner', 'Skip ASCII banner')
  .addHelpText('after', `
Example JavaScript handler:
  export default (req) => {
    return { id: 1, name: "Alice" };
  };

Example usage:
  $ mokapi handler.js
  $ mokapi --demo
`)
  .action(async (files: string[] | undefined, opts) => {
    let resolvedFiles: string[] = [];

    if (opts.demo) {
      console.log('\n# Mokapi Demo mode');
      console.log('# Example minimal handler:');
      console.log('export default (req) => {');
      console.log('  return { id: 1, message: "Hello from Mokapi demo!" };');
      console.log('};\n');

      const demoFile = path.resolve(process.cwd(), 'demo-handler.ts');
      const fs = await import('fs');
      if (!fs.existsSync(demoFile)) {
        fs.writeFileSync(demoFile, 'export default (req) => { return { id: 1, message: "Hello from Mokapi demo!" }; };');
      }
      resolvedFiles = [demoFile];
    } else if (files && files.length > 0) {
      resolvedFiles = files.map(f => path.resolve(process.cwd(), f));
    }

    if (resolvedFiles.length === 0) {
      program.help();
      return;
    }

    const port = parseInt(opts.port, 10);
    const delay = parseInt(opts.delay, 10);
    const method = opts.method.toUpperCase();
    const watch = opts.watch as boolean;
    const cors = opts.cors as boolean;
    const json = opts.json as boolean;
    const noBanner = !opts.banner; // commander inverts --no-banner to opts.banner = false

    // Dynamically import to allow tree-shaking in build
    const { printBanner } = await import('./banner');
    const { startServer } = await import('./server');

    printBanner({ port, files: resolvedFiles, watch, delay, method, json, noBanner });

    await startServer({ files: resolvedFiles, port, delay, method, cors, json, watch });
  });

program.parse(process.argv);
