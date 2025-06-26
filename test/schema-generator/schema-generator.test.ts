import { resolve } from "path";
import { inspect } from "util";
import { expect } from "chai";
import { createProgram, TsOAS } from "../../src";
import {
    schemaWithAdditionalProperties,
    schemaWithDefault,
    schemaWithExample,
    schemaWithFormat,
    schemaWithIgnore,
    schemaWithMinItemsMaxItems,
    schemaWithMinLengthMaxLength,
    schemaWithMinPropertiesMaxProperties,
    schemaWithMinimumMaximum,
    schemaWithPattern,
    schemaWithRef,
    schemaWithTitle,
} from "./types";

const typeNames = [
    "TypeWithDefault",
    "TypeWithFormat",
    "TypeWithRef",
    "TypeWithTitle",
    "TypeWithMinimumMaximum",
    "TypeWithMinLengthMaxLength",
    "TypeWithMinItemsMaxItems",
    "TypeWithMinPropertiesMaxProperties",
    "TypeWithAdditionalProperties",
    "TypeWithIgnore",
    "TypeWithPattern",
    "TypeWithExample",
];

const program = createProgram(["types.ts"], { strictNullChecks: true }, resolve(__dirname));
const tsoas = new TsOAS(program, {});

const spec = tsoas.getSchemas(typeNames);

// console.log(inspect(spec, { depth: null }));

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

    it("annotation :: TypeWithMinimumMaximum", async () => {
        expect(spec.TypeWithMinimumMaximum).to.deep.equal(schemaWithMinimumMaximum);
    });

    it("annotation :: TypeWithMinLengthMaxLength", async () => {
        expect(spec.TypeWithMinLengthMaxLength).to.deep.equal(schemaWithMinLengthMaxLength);
    });

    it("annotation :: TypeWithMinItemsMaxItems", async () => {
        expect(spec.TypeWithMinItemsMaxItems).to.deep.equal(schemaWithMinItemsMaxItems);
    });

    it("annotation :: TypeWithMinPropertiesMaxProperties", async () => {
        expect(spec.TypeWithMinPropertiesMaxProperties).to.deep.equal(schemaWithMinPropertiesMaxProperties);
    });

    it("annotation :: TypeWithAdditionalProperties", async () => {
        expect(spec.TypeWithAdditionalProperties).to.deep.equal(schemaWithAdditionalProperties);
    });

    it("annotation :: TypeWithIgnore", async () => {
        expect(spec.TypeWithIgnore).to.deep.equal(schemaWithIgnore);
    });

    it("annotation :: TypeWithPattern", async () => {
        expect(spec.TypeWithPattern).to.deep.equal(schemaWithPattern);
    });

    it("annotation :: TypeWithExample", async () => {
        expect(spec.TypeWithExample).to.deep.equal(schemaWithExample);
    });
});
