import * as path from "path";
import * as ts from "typescript";
/**
 * Creates a Typescript program.
 * @param files Paths of interface files
 * @param tsCompilerOptions Path of tsconfig file as string / Configs as object
 * @param basePath Base directory of files
 * @returns 
 */
export function createProgram(
    files: string[],
    tsCompilerOptions: string | Record<any, any> = {},
    basePath: string = "./"
): ts.Program {
    let compilerOptions: ts.CompilerOptions;
    
    if (typeof tsCompilerOptions === "string") compilerOptions = getConfigFromFile(tsCompilerOptions);
    else compilerOptions = ts.convertCompilerOptionsFromJson(tsCompilerOptions, basePath).options;

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
    return ts.createProgram(files, options);
}

export function getConfigFromFile(configFileName: string): ts.CompilerOptions {
    // basically a copy of https://github.com/Microsoft/TypeScript/blob/3663d400270ccae8b69cbeeded8ffdc8fa12d7ad/src/compiler/tsc.ts -> parseConfigFile
    const result = ts.parseConfigFileTextToJson(configFileName, ts.sys.readFile(configFileName)!);

    const configParseResult = ts.parseJsonConfigFileContent(
        result.config,
        ts.sys,
        path.dirname(configFileName),
        {},
        path.basename(configFileName)
    );
    const options = configParseResult.options;
    options.noEmit = true;
    delete options.out;
    delete options.outDir;
    delete options.outFile;
    delete options.declaration;
    delete options.declarationDir;
    delete options.declarationMap;

    return options;
}
