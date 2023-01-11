import { resolve } from "path";
import { inspect } from "util";
import { expect } from "chai";
import TypescriptOAS, { createProgram } from "../../src";
import { schemaWithDefault, schemaWithFormat, schemaWithRef, schemaWithTitle } from "./types";

const typeNames = ["TypeWithDefault", "TypeWithFormat", "TypeWithRef", "TypeWithTitle"];

const program = createProgram(["types.ts"], { strictNullChecks: true }, resolve(__dirname));
const tsoas = new TypescriptOAS(program, {});

const spec = tsoas.getSchemas(typeNames);

console.log(inspect(spec, { depth: null }));

describe("schema-generator", () => {
    it("annotation :: TypeWithDefault", async () => {
        expect(spec.TypeWithDefault).to.deep.equal(schemaWithDefault);
    });

    it("annotation :: TypeWithFormat", async () => {
        expect(spec.TypeWithFormat).to.deep.equal(schemaWithFormat);
    });

    it("annotation :: TypeWithRef", async () => {
        expect(spec.TypeWithRef).to.deep.equal(schemaWithRef);
    });

    it("annotation :: TypeWithTitle", async () => {
        expect(spec.TypeWithTitle).to.deep.equal(schemaWithTitle);
    });
});
