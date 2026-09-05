import * as path from "path";
import ts from "typescript";
import * as fastGlob from "fast-glob";
const fg = (fastGlob as any).default || fastGlob;

function hasGlobPattern(entry: string): boolean {
    return /[*?]/.test(entry);
}

function ensureCompilerApi(): void {
    if (typeof (ts as any).createProgram !== "function") {
        throw new Error(
            `[ts-oas] TypeScript v${ts.version || "unknown"} does not expose a JavaScript compiler API. ` +
            `TypeScript 7.0 does not ship with programmatic APIs (planned for TS 7.1). ` +
            `Ensure ts-oas resolves its internal TypeScript engine (<7.0.0), or install @typescript/typescript6.`
        );
    }
}

function parseConfigFile(configFileName: string): ts.ParsedCommandLine {
    ensureCompilerApi();
    const result = ts.parseConfigFileTextToJson(configFileName, ts.sys.readFile(configFileName)!);
    return ts.parseJsonConfigFileContent(
        result.config,
        ts.sys,
        path.dirname(configFileName),
        {},
        path.basename(configFileName)
    );
}

function sanitizeCompilerOptions(options: ts.CompilerOptions): ts.CompilerOptions {
    options.noEmit = true;
    delete options.out;
    delete options.outDir;
    delete options.outFile;
    delete options.declaration;
    delete options.declarationDir;
    delete options.declarationMap;
    return options;
}

/**
 * Creates a Typescript program.
 * @param files Paths of interface files (supports glob patterns). If empty, files are resolved from tsconfig.
 * @param tsCompilerOptions Path of tsconfig file as string / Full tsconfig JSON object.
 *        When `files` is non-empty, only `compilerOptions` are extracted.
 *        When `files` is empty, `include`/`exclude`/`files` are used for file discovery.
 * @param basePath Base directory of files
 * @returns
 */
export function createProgram(
    files: string[],
    tsCompilerOptions: string | Record<any, any> = {},
    basePath: string = "./"
): ts.Program {
    ensureCompilerApi();
    let compilerOptions: ts.CompilerOptions;
    let resolvedFiles: string[];

    if (!basePath.endsWith("/")) basePath += "/";

    if (files && files.length > 0) {
        resolvedFiles = [];
        for (const file of files) {
            if (hasGlobPattern(file)) {
                resolvedFiles.push(...fg.sync(file, { cwd: path.resolve(basePath), absolute: true }));
            } else {
                resolvedFiles.push(basePath + file);
            }
        }

        if (typeof tsCompilerOptions === "string") {
            compilerOptions = getConfigFromFile(tsCompilerOptions);
        } else {
            compilerOptions = ts.convertCompilerOptionsFromJson(tsCompilerOptions, basePath).options;
        }
    } else {
        let configParseResult: ts.ParsedCommandLine;

        if (typeof tsCompilerOptions === "string") {
            configParseResult = parseConfigFile(tsCompilerOptions);
        } else {
            configParseResult = ts.parseJsonConfigFileContent(
                tsCompilerOptions,
                ts.sys,
                path.resolve(basePath)
            );
        }

        compilerOptions = sanitizeCompilerOptions(configParseResult.options);
        resolvedFiles = configParseResult.fileNames;
    }

    // Default compiler options for AST parsing and type analysis across TS 4.7 - 6.0
    const options: ts.CompilerOptions = {
        noEmit: true,
        emitDecoratorMetadata: true,
        experimentalDecorators: true,
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.CommonJS,
        allowUnusedLabels: true,
        skipLibCheck: true, // Prevents external ambient d.ts mismatch under different compiler versions
        esModuleInterop: true, // Ensures consistent CJS/ESM interop across TypeScript versions
        noImplicitAny: false, // Preserves permissive indexing for dynamic AST generation under TS 6+
    };
    for (const k in compilerOptions) {
        if (compilerOptions.hasOwnProperty(k)) {
            options[k] = compilerOptions[k];
        }
    }

    return ts.createProgram(resolvedFiles, options);
}

export function getConfigFromFile(configFileName: string): ts.CompilerOptions {
    return sanitizeCompilerOptions(parseConfigFile(configFileName).options);
}
