import { TsOAS } from "./lib/TypescriptOAS";

export { TsOAS };
export { createProgram } from "./util";
export * from "./types";

/**
 * @deprecated Will be removed in the next major version. Use named import instead:
 *
 * `import { TsOAS } from 'ts-oas'`
 */
const TypescriptOAS = TsOAS;
export default TypescriptOAS;