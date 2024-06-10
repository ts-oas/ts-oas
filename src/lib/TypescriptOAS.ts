import * as ts from "typescript";
import { OpenAPIV3 } from "openapi-types";
import {
    Definition,
    HTTPMethod,
    HttpStatusCode,
    OpenApiSpecData,
    OpenApiSpec,
    OperationObject,
    ParameterObject,
    RequestBodyObject,
    ResponsesObject,
} from "..";
import { SymbolRef } from "../types/common";
import { SchemaGenerator } from "./SchemaGenerator";

export class TypescriptOAS extends SchemaGenerator {
    private isValidObject(type: ts.Type): boolean {
        if (
            !(type.flags === ts.TypeFlags.Object) &&
            type.isIntersection() &&
            !type.types.every((type) => type.flags === ts.TypeFlags.Object)
        )
            return false;
        return true;
    }

    private isEmptyObj(type: ts.Type): boolean {
        if (
            type.flags === ts.TypeFlags.Undefined ||
            type.flags === ts.TypeFlags.Unknown ||
            type.flags === ts.TypeFlags.Null ||
            (type.flags === ts.TypeFlags.Object && !type.getProperties().length)
        )
            return true;
        return false;
    }

    private getTypeFromSymbol(symbol: ts.Symbol): ts.Type {
        return this.tc.getTypeOfSymbolAtLocation(symbol, symbol.getDeclarations()![0]);
    }

    private getPath(type: ts.Type): string {
        if (!type.isStringLiteral()) throw new TypeError("Wrong type for method");

        return type.value;
    }

    private getMethod(type: ts.Type): string {
        if (!type.isStringLiteral() || !Object.values(HTTPMethod).includes(<HTTPMethod>type.value)) {
            throw new TypeError("Wrong type for method");
        }

        return type.value;
    }

    private getPathParams(type: ts.Type): ParameterObject[] {
        if (this.isEmptyObj(type)) return [];
        if (!this.isValidObject(type)) throw new Error("Expected a valid Object.");

        const parameters: ParameterObject[] = [];

        let schema = this.getTypeDefinition(type, this.args.ref, undefined, undefined, type.symbol);

        if (schema.$ref) {
            const schemaName = schema.$ref.split("/").pop();
            schema = this.ReffedDefinitions[schemaName!];
        }

        for (const property in schema.properties) {
            const param = {
                name: property,
                in: "path" as const,
                required: schema.required?.includes(property) || false,
            };

            if ((schema.properties[property] as Definition).description) {
                param["description"] = (schema.properties[property] as Definition).description;
            }
            parameters.push({ ...param, schema: schema.properties[property] as Definition });
        }

        return parameters;
    }

    private getQueryParams(type: ts.Type): ParameterObject[] {
        if (this.isEmptyObj(type)) return [];
        if (!this.isValidObject(type)) throw new Error("Expected a valid Object.");

        const parameters: ParameterObject[] = [];

        let schema = this.getTypeDefinition(type, this.args.ref, undefined, undefined, type.symbol);

        if (schema.$ref) {
            const schemaName = schema.$ref.split("/").pop();
            schema = this.ReffedDefinitions[schemaName!];
        }

        for (const property in schema.properties) {
            const param = {
                name: property,
                in: "query" as const,
                required: schema.required?.includes(property) || false,
            };

            if ((schema.properties[property] as Definition).description) {
                param["description"] = (schema.properties[property] as Definition).description;
            }
            parameters.push({ ...param, schema: schema.properties[property] as Definition });
        }

        return parameters;
    }

    private getBody(type: ts.Type, comments: Record<any, any> = {}): RequestBodyObject | null {
        if (this.isEmptyObj(type)) return null;
        if (!this.isValidObject(type)) throw new Error("Expected a valid Object.");

        const schema = this.getTypeDefinition(type, this.args.ref, undefined, undefined, type.symbol);

        const body: RequestBodyObject = {} as any;

        const contentType = comments["contentType"] || this.args.defaultContentType;
        delete comments["contentType"];

        for (const comment in comments) {
            body[comment] = comments[comment];
        }

        body.content = {
            [contentType]: { schema },
        };

        return body;
    }

    private getResponses(type: ts.Type): ResponsesObject {
        if (!this.isValidObject(type)) throw new Error("Expected a valid Object.");
        if (!type.getProperties().length) throw new Error('"responses" must have at least one property.');

        const responses: ResponsesObject = {};

        for (const respSymbol of type.getProperties()) {
            let respType = this.getTypeFromSymbol(respSymbol);

            if (!Object.values(HttpStatusCode).includes(+(respSymbol.escapedName as string))) {
                throw new Error(`"${respSymbol.escapedName}" is not a valid status code.`);
            }

            if (!this.isValidObject(respType)) throw new Error("Expected a valid Object.");

            const comments = {};
            this.parseCommentsIntoDefinition(respSymbol, comments, {});

            responses[respSymbol.escapedName as string] = {} as any;

            const contentType = comments["contentType"] || this.args.defaultContentType;
            delete comments["contentType"];

            for (const comment in comments) {
                responses[respSymbol.escapedName as string][comment] = comments[comment];
            }

            // TODO: we should have a default option in api
            if (!responses[respSymbol.escapedName as string]["description"]) {
                responses[respSymbol.escapedName as string]["description"] = "";
            }

            if (this.getTypeFromSymbol(respSymbol).flags !== ts.TypeFlags.Never) {
                responses[respSymbol.escapedName as string].content = {
                    [contentType]: {
                        schema: this.getTypeDefinition(respType, this.args.ref, undefined, undefined, respType.aliasSymbol),
                    },
                };
            }
        }

        return responses;
    }

    private getSecurity(type: ts.Type): OpenAPIV3.SecurityRequirementObject[] | undefined {
        if (this.isEmptyObj(type)) return undefined;
        if (!this.isValidObject(type)) throw new Error("Expected a valid Object.");
        if (this.getTypeDefinition(type).type !== "array") throw new Error("Expected to be an array");

        const security: OpenAPIV3.SecurityRequirementObject[] = [];
        const typeDef = this.getTypeDefinition(type);

        if (!typeDef?.items) {
            return undefined;
        }

        for (const itemIndex in typeDef.items) {
            const obj = typeDef.items[itemIndex] as Definition;
            for (const property in obj.properties) {
                const propertyItems = obj.properties[property].items;
                security.push({
                    [property]:
                        propertyItems instanceof Array && propertyItems?.length
                            ? propertyItems
                                  .filter((item) => item.type === "string" && item.enum)
                                  .map((item) => item.enum![0])
                            : [],
                });
            }
        }

        return security;
    }

    public getOpenApiSpec(typeNames: (string | RegExp)[], specData: OpenApiSpecData = {}): OpenApiSpec {
        const filteredTypes: string[] = [];

        typeNames.forEach((typeName) => {
            if (typeName instanceof RegExp) {
                filteredTypes.push(...Object.keys(this.allSymbols).filter((value) => (typeName as RegExp).test(value)));
            } else {
                filteredTypes.push(...Object.keys(this.allSymbols).filter((value) => typeName === value));
            }
        });

        this.resetSchemaSpecificProperties();
        this.refPath = "#/components/schemas/";

        if (!specData.info) specData.info = { title: "OpenAPI specification", version: "1.0.0" };

        const spec: OpenApiSpec = {
            openapi: "3.0.3",
            ...specData,
            paths: {},
        };

        for (const typeName of filteredTypes) {
            const type = this.allSymbols[typeName];

            const comments = {};
            this.parseCommentsIntoDefinition(type.aliasSymbol!, comments, {});

            const pathSymbol = type.getProperty("path");
            const methodSymbol = type.getProperty("method");
            const bodySymbol = type.getProperty("body");
            const paramsSymbol = type.getProperty("params");
            const querySymbol = type.getProperty("query");
            const responsesSymbol = type.getProperty("responses");
            const securitySymbol = type.getProperty("security");

            if (!pathSymbol) throw new Error(`[${typeName}] "path" is required.`);
            if (!methodSymbol) throw new Error(`[${typeName}] "method" is required.`);
            if (!responsesSymbol) throw new Error(`[${typeName}] "responses" is required.`);

            const operation: OperationObject = {
                operationId: type.aliasSymbol?.escapedName as string,
            };

            // comments
            if (comments["ignore"]) continue;
            if (comments["tags"]) {
                operation.tags = comments["tags"].split(",").map((tag: string) => tag.trim());
                delete comments["tags"];
            }
            for (const comment in comments) {
                if (["body"].includes(comment)) continue;
                operation[comment] = comments[comment];
            }

            // parameters
            operation.parameters = [];
            if (paramsSymbol) operation.parameters.push(...this.getPathParams(this.getTypeFromSymbol(paramsSymbol)));
            if (querySymbol) operation.parameters.push(...this.getQueryParams(this.getTypeFromSymbol(querySymbol)));
            if (!operation.parameters.length) delete operation.parameters;

            // requestBody
            if (bodySymbol) {
                const requestBody = this.getBody(this.getTypeFromSymbol(bodySymbol), comments["body"]);
                if (requestBody) operation.requestBody = requestBody;
            }

            // responses
            operation.responses = this.getResponses(this.getTypeFromSymbol(responsesSymbol));

            // security
            if (securitySymbol) {
                operation.security = this.getSecurity(this.getTypeFromSymbol(securitySymbol));
                if (!operation.security) delete operation.security;
            }

            const currPath = this.getPath(this.getTypeFromSymbol(pathSymbol));
            if (!spec.paths[currPath]) spec.paths[currPath] = {};
            spec.paths[currPath][this.getMethod(this.getTypeFromSymbol(methodSymbol)).toLowerCase()] = operation;
        }

        if (this.args.ref && Object.keys(this.reffedDefinitions).length > 0) {
            if (!spec.components) spec.components = {};

            spec.components.schemas = {
                ...this.reffedDefinitions,
                ...spec.components.schemas,
            };
        }

        return spec;
    }

    public getSchemas(typeNames: (string | RegExp)[]): { [key: string]: Definition } {
        if (!typeNames || !typeNames.length) {
            return {};
        }
        const filteredTypes: string[] = [];

        typeNames.forEach((typeName) => {
            if (typeName instanceof RegExp) {
                filteredTypes.push(...Object.keys(this.allSymbols).filter((value) => (typeName as RegExp).test(value)));
            } else {
                filteredTypes.push(...Object.keys(this.allSymbols).filter((value) => typeName === value));
            }
        });

        const root: { definitions: { [key: string]: Definition } } = {
            definitions: {},
        };

        this.resetSchemaSpecificProperties();
        this.refPath = "#/definitions/";

        for (const symbolName of filteredTypes) {
            root.definitions[symbolName] = this.getTypeDefinition(this.allSymbols[symbolName], this.args.ref);
        }
        if (this.args.ref && Object.keys(this.reffedDefinitions).length > 0) {
            root.definitions = { ...root.definitions, ...this.reffedDefinitions };
        }
        return root.definitions;
    }

    public getSymbols(typeNames?: (string | RegExp)[]): SymbolRef[] {
        if (!typeNames || !typeNames.length) {
            return this.symbols;
        }
        const filteredTypes: SymbolRef[] = [];

        typeNames.forEach((typeName) => {
            if (typeName instanceof RegExp) {
                filteredTypes.push(...this.symbols.filter((symbol) => (typeName as RegExp).test(symbol.typeName)));
            } else {
                filteredTypes.push(...this.symbols.filter((symbol) => typeName === symbol.typeName));
            }
        });
        return this.symbols.filter((symbol) => symbol.typeName);
    }
}
