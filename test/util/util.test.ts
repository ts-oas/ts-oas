import { resolve, dirname } from "path";
import { expect } from "chai";
import { createProgram } from "../../src";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const fixturesDir = resolve(__dirname, "fixtures");
const tsconfigPath = resolve(fixturesDir, "tsconfig.json");

describe("createProgram", () => {
    describe("backward compatibility", () => {
        it("should work with explicit file paths and compiler options object", () => {
            const program = createProgram(["sample.ts"], { strictNullChecks: true }, fixturesDir);
            const sourceFiles = program.getSourceFiles().map((sf) => sf.fileName);
            expect(sourceFiles.some((f) => f.endsWith("sample.ts"))).to.be.true;
        });

        it("should work with explicit file paths and tsconfig path", () => {
            const program = createProgram(["sample.ts"], tsconfigPath, fixturesDir);
            const sourceFiles = program.getSourceFiles().map((sf) => sf.fileName);
            expect(sourceFiles.some((f) => f.endsWith("sample.ts"))).to.be.true;
        });
    });

    describe("glob pattern support", () => {
        it("should expand glob patterns to matching files", () => {
            const program = createProgram(["*.ts"], { strictNullChecks: true }, fixturesDir);
            const sourceFiles = program.getSourceFiles().map((sf) => sf.fileName);
            expect(sourceFiles.some((f) => f.endsWith("sample.ts"))).to.be.true;
            expect(sourceFiles.some((f) => f.endsWith("other.ts"))).to.be.true;
        });

        it("should handle mixed glob and explicit paths", () => {
            const program = createProgram(
                ["sample.ts", "o*.ts"],
                { strictNullChecks: true },
                fixturesDir
            );
            const sourceFiles = program.getSourceFiles().map((sf) => sf.fileName);
            expect(sourceFiles.some((f) => f.endsWith("sample.ts"))).to.be.true;
            expect(sourceFiles.some((f) => f.endsWith("other.ts"))).to.be.true;
        });

        it("should use ? wildcard for single-character matching", () => {
            const program = createProgram(
                ["sampl?.ts"],
                { strictNullChecks: true },
                fixturesDir
            );
            const sourceFiles = program.getSourceFiles().map((sf) => sf.fileName);
            expect(sourceFiles.some((f) => f.endsWith("sample.ts"))).to.be.true;
        });
    });

    describe("tsconfig-based file discovery", () => {
        it("should discover files from tsconfig path when files is empty", () => {
            const program = createProgram([], tsconfigPath);
            const sourceFiles = program.getSourceFiles().map((sf) => sf.fileName);
            expect(sourceFiles.some((f) => f.endsWith("sample.ts"))).to.be.true;
            expect(sourceFiles.some((f) => f.endsWith("other.ts"))).to.be.true;
        });

        it("should discover files from tsconfig object when files is empty", () => {
            const program = createProgram(
                [],
                {
                    compilerOptions: { strictNullChecks: true },
                    include: ["*.ts"],
                },
                fixturesDir
            );
            const sourceFiles = program.getSourceFiles().map((sf) => sf.fileName);
            expect(sourceFiles.some((f) => f.endsWith("sample.ts"))).to.be.true;
            expect(sourceFiles.some((f) => f.endsWith("other.ts"))).to.be.true;
        });

        it("should respect exclude in tsconfig object", () => {
            const program = createProgram(
                [],
                {
                    compilerOptions: { strictNullChecks: true },
                    include: ["*.ts"],
                    exclude: ["other.ts"],
                },
                fixturesDir
            );
            const sourceFiles = program.getSourceFiles().map((sf) => sf.fileName);
            expect(sourceFiles.some((f) => f.endsWith("sample.ts"))).to.be.true;
            expect(sourceFiles.some((f) => f.endsWith("other.ts"))).to.be.false;
        });
    });

    describe("explicit files take precedence", () => {
        it("should use explicit files instead of tsconfig file discovery", () => {
            const program = createProgram(["sample.ts"], tsconfigPath, fixturesDir);
            const sourceFiles = program
                .getSourceFiles()
                .map((sf) => sf.fileName)
                .filter((f) => f.includes("fixtures"));
            expect(sourceFiles.length).to.equal(1);
            expect(sourceFiles[0]).to.include("sample.ts");
        });
    });
});
