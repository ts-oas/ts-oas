import { defineConfig } from 'tsup'

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
  dts: true,
  treeshake: true,
  splitting: true,
  platform: 'node',
  external: [
    'typescript',
    'openapi-types',
    'yargs',
    '@apidevtools/swagger-parser',
    'ajv'
  ],
  // Keep chunk names readable and stable
  esbuildOptions(options) {
    options.chunkNames = '[name]'
  },
})
