import * as ts from "typescript";
import { OpenAPIV3 } from "openapi-types";
import { HttpStatusCode } from "./enums/HttpStatusCode.enum";
import { HTTPMethod } from "./enums/HTTPMethod.enum";

export type AnnotationKeywords = {
    [prop: string]: boolean | 'custom';
};

export type Options = {
    /**
     * @default false
     */
    ref?: boolean;
    /**
     * @default false
     */
    titles?: boolean;
    /**
     * @default false
     */
    ignoreRequired?: boolean;
    /**
     * @default false
     */
    ignoreErrors?: boolean;
    /**
     * @default false
     */
    uniqueNames?: boolean;
    /**
     * @default false
     */
    tsNodeRegister?: boolean;
    /**
     * @default true
     */
    nullableKeyword?: boolean;
    /**
     * @default "* /*"
     */
    defaultContentType?: string;
    /**
     * @default "number"
     */
    defaultNumberType?: "number" | "integer";
    /**
     * @default "x-"
     */
    customKeywordPrefix?: string | null;
    customKeywords?: string[];
    schemaProcessor?: (schema: Definition) => Definition;
};

export type PrimitiveType = number | boolean | string | null;

export type MetaDefinitionFields = "ignore";
type RedefinedFields = "type" | "items" | "allOf" | "oneOf" | "anyOf" | "not" | "additionalProperties" | "properties";
export interface Definition extends Omit<OpenAPIV3.BaseSchemaObject, RedefinedFields> {
    type?: string | string[];
    items?: Definition | Definition[];
    allOf?: Definition[];
    oneOf?: Definition[];
    anyOf?: Definition[];
    not?: Definition;
    additionalProperties?: Definition | boolean;
    properties?: {
        [name: string]: Definition;
    };
    $ref?: string;
}
const abc: Definition = {};

export type SymbolRef = {
    name: string;
    typeName: string;
    fullyQualifiedName: string;
    symbol: ts.Symbol;
};

export type Api = {
    path: string;
    method: keyof typeof HTTPMethod;
    body?: Record<string, any>;
    params?: Record<string, any>;
    query?: Record<string, any>;
    responses: Partial<Record<HttpStatusCode, any>>;
};

export type ApiMapper<T extends Api> = {
    path: T["path"];
    method: T["method"];
    body: T["body"];
    params: T["params"];
    query: T["query"];
    responses: T["responses"];
};
