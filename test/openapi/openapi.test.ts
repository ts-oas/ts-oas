import { resolve } from "path";
import { readFileSync, writeFileSync } from "fs";
import { expect } from "chai";
import SwaggerParser from "@apidevtools/swagger-parser";
import { createProgram, TsOAS } from "../../src";
import Ajv from "ajv";

const openapiFile = JSON.parse(readFileSync(resolve(__dirname, `openapi.schema.json`), "utf8"));
const openapiWithRefFile = JSON.parse(readFileSync(resolve(__dirname, `openapi-with-ref.schema.json`), "utf8"));
const openApi3_0_3 = JSON.parse(readFileSync(resolve(__dirname, `openapi-3.0.3.schema.json`), "utf-8"));
const openApiWithSecurity = JSON.parse(readFileSync(resolve(__dirname, `openapi-with-security.schema.json`), "utf-8"));
const openApiWithDefaultSecurity = JSON.parse(
    readFileSync(resolve(__dirname, `openapi-with-default-security.schema.json`), "utf-8")
);
const openApiWithCustomOperationProperties = JSON.parse(
    readFileSync(resolve(__dirname, `openapi-with-custom-operation-properties.schema.json`), "utf-8")
);

const typeNames = ["GetAllBooksApi", "EditBookApi"];
const typeNamesForCustomOperationProperties = ["GetAllBooksApi", "EditBookApi", "EditBookApiWithCustomProperties"];
const typeNamesForMapperTest = ["GetAllBooksApi", "EditBookApiWithMapper", "EditBookApiWithCustomProperties"];
const typeNamesForSecureTests = ["GetAllBooksApi", "EditBookSecureApi"];
const typeNamesForDefaultSecureTests = ["GetAllUnsecureBooksApi", "EditBookApiWithMapper"];

const program = createProgram(["openapi.ts"], { strictNullChecks: true }, resolve(__dirname));

describe("openapi", () => {
    it("should validate against SwaggerParser and json file", async () => {
        const ajv = new Ajv();
        const schemaValidator = ajv.getSchema("http://json-schema.org/draft-07/schema")!;

        const tsoas = new TsOAS(program, {
            customKeywords: ["thisIsCustom"],
            schemaProcessor: (schema) => {
                if (schema.type !== "undefined") {
                    const isValidSchema = schemaValidator(schema);
                    expect(isValidSchema).to.equal(
                        true,
                        `NOT a valid JSON Schema -> ${schema} -> ${schemaValidator.errors}`
                    );
                }
                return schema;
            },
        });
        const spec = tsoas.getOpenApiSpec(typeNamesForCustomOperationProperties);

        // writeFileSync(resolve(__dirname, `openapi.schema.json`), JSON.stringify(spec), "utf8");

        expect(spec).to.deep.equal(openapiFile);
        await SwaggerParser.validate(spec as any, {});
    });

    it("should validate against SwaggerParser and json file with refs", async () => {
        const tsoas = new TsOAS(program, { customKeywords: ["thisIsCustom"], ref: true });
        const spec = tsoas.getOpenApiSpec(typeNames);

        // writeFileSync(resolve(__dirname, `openapi-with-ref.schema.json`), JSON.stringify(spec), "utf8");

        expect(spec).to.deep.equal(openapiWithRefFile);
        await SwaggerParser.validate(spec as any, {});
    });

    it("should validate version 3.0.3 against SwaggerParser and json file", async () => {
        const tsoas = new TsOAS(program, { customKeywords: ["thisIsCustom"] });
        const spec = tsoas.getOpenApiSpec(typeNames, { openapi: "3.0.3" });

        // writeFileSync(resolve(__dirname, `openapi-3.0.3.schema.json`), JSON.stringify(spec), "utf8");

        expect(spec).to.deep.equal(openApi3_0_3);
        await SwaggerParser.validate(spec as any, {});
    });

    it("should validate against SwaggerParser and json file with security", async () => {
        const tsoas = new TsOAS(program, { customKeywords: ["thisIsCustom"] });
        const spec = tsoas.getOpenApiSpec(typeNamesForSecureTests, {
            components: {
                securitySchemes: {
                    bearerToken: {
                        type: "http",
                        scheme: "bearer",
                        bearerFormat: "JWT",
                        description: "Bearer Token with JWT",
                    },
                    basicAuth: {
                        type: "http",
                        scheme: "basic",
                    },
                },
            },
        });

        // writeFileSync(resolve(__dirname, `openapi-with-security.schema.json`), JSON.stringify(spec), "utf8");

        expect(spec).to.deep.equal(openApiWithSecurity);
        await SwaggerParser.validate(spec as any, {});
    });

    it("should validate against SwaggerParser and json file with default security for all apis", async () => {
        const tsoas = new TsOAS(program, { customKeywords: ["thisIsCustom"] });
        const spec = tsoas.getOpenApiSpec(typeNamesForDefaultSecureTests, {
            security: [{ basicAuth: [] }, { bearerToken: ["book:write", "book:read"] }],
            components: {
                securitySchemes: {
                    bearerToken: {
                        type: "http",
                        scheme: "bearer",
                        bearerFormat: "JWT",
                        description: "Bearer Token with JWT",
                    },
                    basicAuth: {
                        type: "http",
                        scheme: "basic",
                    },
                },
            },
        });

        // writeFileSync(resolve(__dirname, `openapi-with-default-security.schema.json`), JSON.stringify(spec), "utf8");

        expect(spec).to.deep.equal(openApiWithDefaultSecurity);
        await SwaggerParser.validate(spec as any, {});
    });

    it("should have custom defaultContentType", async () => {
        const tsoas = new TsOAS(program, {
            customKeywords: ["thisIsCustom"],
            defaultContentType: "application/json",
        });
        const spec = tsoas.getOpenApiSpec(typeNames);

        const pathKeys = Object.keys(spec.paths);
        const pathMethodKeys = Object.keys(spec.paths[pathKeys[0]]);
        expect(spec.paths[pathKeys[0]][pathMethodKeys[0]]["responses"]["200"]["content"]).to.have.property(
            "application/json"
        );
    });

    it("should validate against SwaggerParser and json file using ApiMapper", async () => {
        const tsoas = new TsOAS(program, { customKeywords: ["thisIsCustom"] });
        const spec = tsoas.getOpenApiSpec(typeNamesForMapperTest);

        expect(spec).to.deep.equal(openapiFile);
        await SwaggerParser.validate(spec as any, {});
    });

    it("should validate other docs", async () => {
        const tags = [{ name: "abcd" }, { name: "efg" }];
        const info = { title: "custom title", version: "12.3.4", description: "this is description" };
        const components = { schemas: { AAA: { type: "boolean" } } };

        const tsoas = new TsOAS(program, { customKeywords: ["thisIsCustom"] });
        const spec = tsoas.getOpenApiSpec(typeNames, { tags, info, components });

        expect(spec.tags).to.equal(tags);
        expect(spec.info).to.equal(info);
        expect(spec.components).to.equal(components);
    });

    it("should validate against json file with custom operation properties", async () => {
        const tsoas = new TsOAS(program, {
            customKeywords: ["thisIsCustom"],
            customOperationProperties: true,
        });
        const spec = tsoas.getOpenApiSpec(typeNamesForCustomOperationProperties);

        // writeFileSync(resolve(__dirname, `openapi-with-custom-operation-properties.schema.json`), JSON.stringify(spec), "utf8");

        expect(spec).to.deep.equal(openApiWithCustomOperationProperties);
        await SwaggerParser.validate(spec as any, {});
    });
});
