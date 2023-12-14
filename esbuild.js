// require('./node_modules/esbuild-plugin-html/package.json').default;
require('esbuild').buildSync({
  entryPoints: ['src/index.ts'],
  bundle: true,
  minify: true,
  format: 'esm',
  platform: 'node',
  target: ['esnext'],
  tsconfig: 'tsconfig.build.json',
  outfile: 'dist/index.js',
  loader: {
    '.html': 'text',
    '.js': 'text',
  }
})
