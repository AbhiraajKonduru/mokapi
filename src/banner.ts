import figlet from 'figlet';
import gradient from 'gradient-string';
import pc from 'picocolors';
import path from 'path';

export interface BannerOpts {
  port: number;
  files: string[];
  watch: boolean;
  delay: number;
  method: string;
  json: boolean;
  noBanner: boolean;
}

export function printBanner(opts: BannerOpts): void {
  if (opts.json || opts.noBanner) return;

  const logo = figlet.textSync('MOKAPI', { font: 'ANSI Shadow' });
  console.log(gradient.cristal(logo));
  console.log(pc.dim('  Run any JS/Python function as a REST endpoint in 2 seconds.\n'));
  console.log(`  ${pc.bold(pc.green('●'))} Listening on ${pc.cyan(`http://localhost:${opts.port}`)}`);
  
  if (opts.files.length === 1) {
    console.log(`  ${pc.bold(pc.green('●'))} Handler:    ${pc.white(path.relative(process.cwd(), opts.files[0]) || opts.files[0])} (Mapped to: /*)`);
  } else {
    console.log(`  ${pc.bold(pc.green('●'))} Handlers:   ${pc.dim(`(${opts.files.length} files matched)`)}`);
    opts.files.forEach(f => {
      const rel = path.relative(process.cwd(), f);
      const name = path.basename(f, path.extname(f));
      console.log(`    ${pc.dim('→')} ${pc.white(rel)} ${pc.cyan(`=> /${name}`)}`);
    });
  }
  console.log(
    `  ${pc.bold(pc.green('●'))} Watch: ${opts.watch ? pc.green('on') : pc.dim('off')}  |  ` +
    `Delay: ${pc.yellow(opts.delay + 'ms')}  |  ` +
    `Method: ${pc.magenta(opts.method)}`
  );
  console.log('');
}
