# Changelog

## v0.6.2

-   Fixed missing schema definitions for recursive types when `ref: false` (recursive types are always referenced in OpenAPI components and schemas).

## v0.6.1

**TypeScript 7 Codebases Support:** Added support for generating OpenAPI specs from TypeScript 7.0 codebases, alongside continued support for **TypeScript 4.7 through 6.x.** Moved `typescript` from `peerDependencies` to direct `dependencies` (`>=4.7.0 <7.0.0`) so that `ts-oas` provisions an internal compiler engine for TS 7 codebases while automatically deduplicating against the host in TS 4.7–6.x projects:

-   **TypeScript 4.7 – 6.x:** Leverages workspace's installed TypeScript compiler for type analysis.
-   **TypeScript 7.0:** Because TypeScript 7.0 is a native binary without programmatic JavaScript compiler APIs, `ts-oas` analyzes TS 7.0 codebases using its internal compiler engine.
-   **TypeScript 7.1+ (Upcoming):** The stable programmatic API is deferred to TypeScript 7.1 and is planned for upcoming releases of `ts-oas` to take direct advantage of TS 7.1+ multi-threaded performance.

#### Internal and Miscs

-   **Compiler Target & Options Modernization:** Upgraded default AST compiler target to `ES2022` (retiring deprecated `ES5`), added safe interop defaults, and hardened library handling across different TS versions (conditional use of compiler APIs and runtime guard).
-   **Compatibility Matrix Test:** Added a TypeScript matrix runner and CI workflow covering representative versions from 4.7 through 6.0.

## v0.6.0

#### ⚠️ BREAKING CHANGES (Deprecation Removal)

-   Removed the deprecated default export (`TypescriptOAS`). Use the named export `TsOAS` instead:

    ```ts
    // Before
    import TypescriptOAS from "ts-oas";
    // Now
    import { TsOAS } from "ts-oas";
    ```

-   Removed deprecated individual top-level types (`OpenApiSpec`, `PathsObject`, `ResponsesObject`, `RequestBodyObject`, `ParameterObject`, `Version`, `OpenApiSpecData`). Use the `OAS` namespace instead:

    ```ts
    // Before
    import { OperationObject, Version } from "ts-oas";
    // Now
    import { OAS } from "ts-oas";
    // Used as: OAS.Operation, OAS.Version
    ```

-   Removed the `tsNodeRegister` compiler option since the library has migrated away from `ts-node`.

#### Features

-   **Glob and tsconfig File Discovery:** Added support for glob patterns and automatic tsconfig-based file discovery in `createProgram` (#29).
    ```ts
    // You can now pass glob patterns or let it auto-discover files from your tsconfig
    const program = createProgram(["src/**/*.ts"], "tsconfig.json");
    ```

#### Internal and Miscs

-   **Dual ESM/CommonJS Support:** Modernized the build system to support both ESM (`.js`) and CJS (`.cjs`) output formats using `tsup`. Proper package exports have been added to `package.json` (#30).
-   Added GitHub Actions CI pipeline to run test suites across multiple Node.js versions.

## v0.5.4

-   Fixed #27 [`1781fb1`](https://github.com/ts-oas/ts-oas/commit/1781fb19a58ef563fb2f6269529980de19c84c3f)

## v0.5.3

-   **DEPRECATION WARNING**
    Added TsOAS as named export and OAS as namespace [033b13d](https://github.com/ts-oas/ts-oas/commit/033b13da2177c70bdcae23107277a0b39c3f96ac)
    Default import will be removed in the next versions. Use named import instead:
    `import TypescriptOAS from "ts-oas"` -> `import { TsOAS } from "ts-oas"`
    Individual OAS's types will be removed in the next versions, too. Use namespace instead:
    `import { Version } from "ts-oas"` -> `import { OAS } from "ts-oas" // in the code: OAS.Version`

-   Added support for `@deprecated` keyword to operation properties [04d09e7](https://github.com/ts-oas/ts-oas/commit/04d09e77b1becd43ba332be9093a577b8956bea4)

## v0.5.2

-   #24
-   #26
-   Updated Typescript version

## v0.5.1

-   Added `customOperationProperties` option to consider custom properties in the root of API types.

## v0.5.0

-   Now supports OpenAPI **v3.1**
-   **BREAKING CHANGE:** Default output comes with `{ "openapi": "3.1.0", ... }` and `"type": "null"` instead of `"nullable": true` for standard JSON schema compatibility
-   Updated Typescript dependency to `v5.6`

**Note:** To have v3.0 back again, you need to simply specify it in getOpenApiSpec method: `tsoas.getOpenApiSpec([/API$/], { openapi: "3.0.3" })`

## v0.4.5

-   Fixed empty security issue #12
-   Fixed unexpected types being considered for schema gen #17
-   Generate proper json schema for Record<> types #18
-   Fixed invalid ref names for the types that have args #20

## v0.4.4

-   Added support for "security" #8
-   Added support for No content responses #9

## v0.4.2

-   Fixed recursivity issue #4 .

## v0.4.1

-   Added [CLI](https://github.com/ts-oas/ts-oas#cli) support.

## v0.3.0

-   Upgraded to Typescript 5 (Now is fully compliant with Typescript 4 and 5)
