import { readFileSync } from "fs";
import { resolve } from "path";
import * as yargs from "yargs";
import TypescriptOAS, { createProgram } from ".";

const argv = yargs
    .scriptName("ts-oas")
    .usage(
        "Usage: \u001b[0;33m$0 <file-paths> <type-names> [options]\u001b[0m\n\n<file-paths> : Comma-separated list of relative .ts file paths which contain types.\n<type-names> : Comma-separated list of type names (Regex/exact name) to be considered in files."
    )
    .help()
    .alias("h", "help")
    .alias("v", "version")
    .epilogue("Generate OpenAPI specifications from the input Typescript files.\nFor a full documentation, visit the homepage.\n\nHomepage: https://github.com/ts-oas/ts-oas 'Copyright 2023'")
    .example("$0 ./interfaces/sample.ts myApi,mySecondApi", "")
    .demandCommand(2, "\u001b[0;31mBoth <file-paths> and <type-names> are required arguments.\u001b[0m")
    .option("tsconfig-file", {
        alias: "c",
        type: "string",
        description: "Path to a JSON tsconfig file.",
    })
    .option("options-file", {
        alias: "p",
        type: "string",
        description: "Path to a JSON file containing 'ts-oas' Options. Reffered to documentations.",
    })
    .option("spec-file", {
        alias: "s",
        type: "string",
        description: "Path to a JSON file containing additional OpenAPI specifications.",
    })
    .option("schema-only", {
        alias: "e",
        type: "boolean",
        description: "Only generates pure schemas from given types. ('spec-file' will be ignored.)",
    }).argv as any;

const programArgs = {
    files: (argv._[0] as string).split(","),
    tsCompilerOptions: argv["tsconfig-file"]
        ? JSON.parse(readFileSync(argv["tsconfig-file"], { encoding: "utf8" }))
        : {},
};
const OpenApiArgs = {
    options: argv["options-file"] ? JSON.parse(readFileSync(argv["options-file"], { encoding: "utf8" })) : {},
    typeNames: (argv._[1] as string).split(","),
    specData: argv["spec-file"] ? JSON.parse(readFileSync(argv["spec-file"], { encoding: "utf8" })) : {},
};

const program = createProgram(programArgs.files, programArgs.tsCompilerOptions, resolve(__dirname));
const tsoas = new TypescriptOAS(program, OpenApiArgs.options);

let result: Record<any, any>;

if (argv["schema-only"]) {
    result = tsoas.getSchemas(OpenApiArgs.typeNames);
} else {
    result = tsoas.getOpenApiSpec(OpenApiArgs.typeNames, OpenApiArgs.specData);
}

// TODO: add option to write to file.
console.log(JSON.stringify(result, null, 2));
