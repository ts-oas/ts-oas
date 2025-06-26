import { HttpStatusCode } from "./enums/HttpStatusCode.enum";
import { HTTPMethod } from "./enums/HTTPMethod.enum";
import { OAS } from "./spec";

export type AnnotationKeywords = {
    [prop: string]: boolean | "custom";
};

export type UnionModifier = "anyOf" | "oneOf";

export type Options = {
    /**
     * Uses schemas as references, corresponding to their type references.
     * @default false
     */
    ref?: boolean;
    /**
     * Provides `title` field in each schema which is filled by it's corresponding field name or type name.
     * @default false
     */
    titles?: boolean;
    /**
     * Ignores `required` field in all schemas.
     * @default false
     */
    ignoreRequired?: boolean;
    /**
     * Ignores errors in typescript files. May introduces wrong schemas.
     * @default false
     */
    ignoreErrors?: boolean;
    /**
     * Replaces a hash for every type name to avoid duplication issues.
     * @default false
     */
    uniqueNames?: boolean;
    /**
     * Uses `ts-node/register` as a runtime argument. It enables you to directly execute TypeScript on Node.js without precompiling.
     * @default false
     */
    tsNodeRegister?: boolean;
    /**
     * Provides `nullable: true` for nullable fields, otherwise set `type: "null"`.
     * @default true
     */
    nullableKeyword?: boolean;
    /**
     * Default schema type for union types..
     * @default "anyOf"
     */
    defaultUnionModifier?: UnionModifier;
    /**
     * Default content type for all the operations. Can be overwritten case by case (See the annotations section.).
     * @default "* /*"
     */
    defaultContentType?: string;
    /**
     * Default schema type for number types. Can be overwritten case by case (See the annotations section.).
     * @default "number"
     */
    defaultNumberType?: "number" | "integer";
    /**
     * Custom keywords to consider in annotations.
     */
    customKeywords?: string[];
    /**
     * Prefix that should be added to all `customKeywords`.
     * @default "x-"
     */
    customKeywordPrefix?: string | null;
    /**
     * Whether to consider custom operation properties in the root of API types.
     *
     * If true, avoid using {@link ApiMapper}, as it will override these properties.
     * @default false
     */
    customOperationProperties?: boolean;
    /**
     * A function that will run over each generated schema.
     */
    schemaProcessor?: (schema: OAS.Definition) => OAS.Definition;
};

export type PrimitiveType = number | boolean | string | null;

export type MetaDefinitionFields = "ignore";

export type Api = {
    path: string;
    method: keyof typeof HTTPMethod;
    body?: Record<string, any>;
    params?: Record<string, any>;
    query?: Record<string, any>;
    responses: Partial<Record<HttpStatusCode, any>>;
    security?: Record<string, string[]>[];
};

export type ApiMapper<T extends Api> = {
    path: T["path"];
    method: T["method"];
    body: T["body"];
    params: T["params"];
    query: T["query"];
    responses: T["responses"];
    security: T["security"];
};
