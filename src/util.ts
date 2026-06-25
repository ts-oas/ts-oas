import * as path from "path";
import * as ts from "typescript";
import * as fastGlob from "fast-glob";
const fg = (fastGlob as any).default || fastGlob;

function hasGlobPattern(entry: string): boolean {
    return /[*?]/.test(entry);
}

function parseConfigFile(configFileName: string): ts.ParsedCommandLine {
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

    const options: ts.CompilerOptions = {
        noEmit: true,
        emitDecoratorMetadata: true,
        experimentalDecorators: true,
        target: ts.ScriptTarget.ES5,
        module: ts.ModuleKind.CommonJS,
        allowUnusedLabels: true,
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
