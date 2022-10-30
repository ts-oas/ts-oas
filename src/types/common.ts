import * as ts from "typescript";
import { JSONSchema7 } from "json-schema";
import { HttpStatusCode } from "./enums/HttpStatusCode.enum";
import { HTTPMethod } from "./enums/HTTPMethod.enum";

export type AnnotationKeywords = {
    [prop: string]: boolean;
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
    defaultProps?: boolean;
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
    customKeywords?: string[];
    schemaProcessor?: (schema: Definition) => Definition;
};

export type PrimitiveType = number | boolean | string | null;

export type MetaDefinitionFields = "ignore";
type RedefinedFields =
    | "type"
    | "items"
    | "properties"
    | "additionalProperties"
    | "if"
    | "then"
    | "else"
    | "allOf"
    | "anyOf"
    | "oneOf"
    | "not"
    | "definitions";
export type DefinitionOrBoolean = Definition | boolean;
export interface Definition extends Omit<JSONSchema7, RedefinedFields> {
    // The type field here is incompatible with the standard definition
    type?: string | string[];
    nullable?: boolean;

    // Non-standard fields
    propertyOrder?: string[];
    defaultProperties?: string[];
    typeof?: "function";

    // Fields that must be redefined because they make use of this definition itself
    items?: DefinitionOrBoolean | DefinitionOrBoolean[];
    properties?: {
        [key: string]: DefinitionOrBoolean;
    };
    additionalProperties?: DefinitionOrBoolean;
    if?: DefinitionOrBoolean;
    then?: DefinitionOrBoolean;
    else?: DefinitionOrBoolean;
    allOf?: DefinitionOrBoolean[];
    anyOf?: DefinitionOrBoolean[];
    oneOf?: DefinitionOrBoolean[];
    not?: DefinitionOrBoolean;
    definitions?: {
        [key: string]: DefinitionOrBoolean;
    };
}

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
