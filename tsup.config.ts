import { defineConfig } from 'tsup'
import ts from 'typescript'

// Silence TS 6+ deprecation error (TS5101) for legacy baseUrl injected internally by tsup/rollup-plugin-dts
const majorTSVersion = parseInt(ts.version.split('.')[0], 10);

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    cli: 'src/cli.ts',
  },
  format: ['esm', 'cjs'],
  target: 'node18',
  outDir: 'dist',
  sourcemap: false,
  clean: true,
  shims: true,
  dts: {
    compilerOptions: majorTSVersion >= 6 ? { ignoreDeprecations: '6.0' } : {}
  },
  treeshake: true,
  splitting: true,
  platform: 'node',
  external: [
    'typescript',
    'openapi-types',
    'yargs',
    '@apidevtools/swagger-parser',
    'ajv',
    'fast-glob'
  ],
  // Keep chunk names readable and stable
  esbuildOptions(options) {
    options.chunkNames = '[name]'
  },
})
