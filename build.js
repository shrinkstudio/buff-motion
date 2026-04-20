import esbuild from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, 'src', 'scripts');
const watch = process.argv.includes('--watch');

// Single entry point — all scripts are imported via index.js
const entryPoints = [path.join(srcDir, 'index.js')];

const buildOptions = {
  entryPoints,
  bundle: true,
  minify: true,
  sourcemap: false,
  outdir: 'dist',
  outExtension: { '.js': '.min.js' },
  target: ['es2020'],
  format: 'iife',
};

async function run() {
  if (watch) {
    const ctx = await esbuild.context(buildOptions);
    await ctx.watch();
    console.log('Watching for changes...');
  } else {
    await esbuild.build(buildOptions);
    console.log(`Built ${entryPoints.length} file(s) to dist/`);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
