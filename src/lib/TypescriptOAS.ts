import * as ts from "typescript";
import { OpenAPIV3, OpenAPIV3_1 } from "openapi-types";
import {
    HTTPMethod,
    HttpStatusCode,
    OAS,
} from "../types";
import { SchemaGenerator } from "./SchemaGenerator";

export class TsOAS extends SchemaGenerator {
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

    private getPathParams(type: ts.Type): OAS.Parameter[] {
        if (this.isEmptyObj(type)) return [];
        if (!this.isValidObject(type)) throw new Error("Expected a valid Object.");

        const parameters: OAS.Parameter[] = [];

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

            if ((schema.properties[property] as OAS.Definition).description) {
                param["description"] = (schema.properties[property] as OAS.Definition).description;
            }
            parameters.push({ ...param, schema: schema.properties[property] as OAS.Definition });
        }

        return parameters;
    }

    private getQueryParams(type: ts.Type): OAS.Parameter[] {
        if (this.isEmptyObj(type)) return [];
        if (!this.isValidObject(type)) throw new Error("Expected a valid Object.");

        const parameters: OAS.Parameter[] = [];

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

            if ((schema.properties[property] as OAS.Definition).description) {
                param["description"] = (schema.properties[property] as OAS.Definition).description;
            }
            parameters.push({ ...param, schema: schema.properties[property] as OAS.Definition });
        }

        return parameters;
    }

    private getBody(type: ts.Type, comments: Record<any, any> = {}): OAS.RequestBody | null {
        if (this.isEmptyObj(type)) return null;
        if (!this.isValidObject(type)) throw new Error("Expected a valid Object.");

        const schema = this.getTypeDefinition(type, this.args.ref, undefined, undefined, type.symbol);

        const body: OAS.RequestBody = {} as any;

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

    private getResponses(type: ts.Type): OAS.Responses {
        if (!this.isValidObject(type)) throw new Error("Expected a valid Object.");
        if (!type.getProperties().length) throw new Error('"responses" must have at least one property.');

        const responses: OAS.Responses = {};

        for (const respSymbol of type.getProperties()) {
            let respType = this.getTypeFromSymbol(respSymbol);

            if (!Object.values(HttpStatusCode).includes(+(respSymbol.escapedName as string))) {
                throw new Error(`"${respSymbol.escapedName}" is not a valid status code.`);
            }

            if (!this.isValidObject(respType)) throw new Error("Expected a valid Object.");

            const comments = {};
            this.parseCommentsIntoDefinition(respSymbol, comments, {}, true);

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

            if (respType.flags !== ts.TypeFlags.Never) {
                responses[respSymbol.escapedName as string].content = {
                    [contentType]: {
                        schema: this.getTypeDefinition(
                            respType,
                            this.args.ref,
                            undefined,
                            undefined,
                            respType.aliasSymbol
                        ),
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

        if (typeDef?.items === undefined) return [];

        for (const itemIndex in typeDef.items) {
            const obj = typeDef.items[itemIndex] as OAS.Definition;
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

    private findCustomProperties(type: ts.Type): Record<string, any> {
        const operation: Record<string, any> = {};
        const processedProps = ["path", "param", "method", "body", "params", "query", "responses", "security"];

        for (const prop of type.getProperties()) {
            const propName = prop.getName();
            if (!processedProps.includes(propName)) {
                const propType = this.getTypeFromSymbol(prop);

                // Get a schema definition for this property
                const schema = this.getTypeDefinition(propType, false);

                // If we have a valid schema, use it as the property value
                if (schema && Object.keys(schema).length > 0) {
                    // For simple types with enum values, extract the value
                    if (schema.enum && schema.enum.length === 1) {
                        operation[propName] = schema.enum[0];
                    }
                    // For object types with properties, create an object with those properties
                    else if (schema.type === "object" && schema.properties) {
                        operation[propName] = this.processCustomPropertiesObject(schema.properties);
                    }
                    // For arrays, create an array with the actual values
                    else if (schema.type === "array") {
                        // Special case for empty arrays
                        if (schema.minItems === 0 && schema.maxItems === 0) {
                            operation[propName] = [];
                        }
                        // For arrays with items schema
                        else if (schema.items) {
                            // Handle array of objects case
                            if (Array.isArray(schema.items)) {
                                const processedItems = schema.items.map((item) => {
                                    if (item.type === "object" && item.properties) {
                                        return this.processCustomPropertiesObject(item.properties);
                                    }
                                    return item;
                                });
                                operation[propName] = processedItems;
                            }
                            // If items is an object with properties, process it recursively
                            else if (
                                "type" in schema.items &&
                                schema.items.type === "object" &&
                                schema.items.properties
                            ) {
                                const processedItem = this.processCustomPropertiesObject(schema.items.properties);
                                operation[propName] = [processedItem];
                            }
                            // For simple items, use the schema
                            else {
                                operation[propName] = [schema.items];
                            }
                        }
                        // Fallback for other array types
                        else {
                            operation[propName] = [];
                        }
                    }
                    // For union types (enums), use the enum values
                    else if (schema.enum && schema.enum.length > 0) {
                        operation[propName] = schema.enum;
                    }
                    // For other cases, use the schema directly
                    else {
                        operation[propName] = schema;
                    }
                }
            }
        }

        return operation;
    }

    private processCustomPropertiesObject(properties: Record<string, any>): Record<string, any> {
        const result = {};

        for (const [key, value] of Object.entries(properties)) {
            // For properties with enum values, use the first enum value
            if (value.enum && value.enum.length === 1) {
                result[key] = value.enum[0];
            }
            // For nested objects, recursively process
            else if (value.type === "object" && value.properties) {
                result[key] = this.processCustomPropertiesObject(value.properties);
            }
            // For arrays, process them appropriately
            else if (value.type === "array") {
                // Empty array case
                if (value.minItems === 0 && value.maxItems === 0) {
                    result[key] = [];
                }
                // Array with items
                else if (value.items) {
                    // Handle array of objects case
                    if (Array.isArray(value.items)) {
                        const processedItems = value.items.map((item) => {
                            if (item.type === "object" && item.properties) {
                                return this.processCustomPropertiesObject(item.properties);
                            }
                            return item;
                        });
                        result[key] = processedItems;
                    }
                    // If items is an object with properties, process it recursively
                    else if (value.items.type === "object" && value.items.properties) {
                        const processedItem = this.processCustomPropertiesObject(value.items.properties);
                        result[key] = [processedItem];
                    }
                    // For simple items
                    else {
                        result[key] = [value.items];
                    }
                }
                // Fallback
                else {
                    result[key] = [];
                }
            }
            // For other types, use the property schema as is
            else {
                result[key] = value;
            }
        }

        return result;
    }

    public getOpenApiSpec<T extends OAS.Version>(
        typeNames: (string | RegExp)[],
        specData: OAS.SpecData<T> = {}
    ): OAS.Spec<T> {
        const filteredTypes: string[] = [];

        typeNames.forEach((typeName) => {
            if (typeName instanceof RegExp) {
                filteredTypes.push(...Object.keys(this.symbols).filter((value) => (typeName as RegExp).test(value)));
            } else {
                filteredTypes.push(...Object.keys(this.symbols).filter((value) => typeName === value));
            }
        });

        this.resetSchemaSpecificProperties();
        this.refPath = "#/components/schemas/";

        const spec: OAS.Spec<T> = {
            openapi: specData.openapi || ("3.1.0" as T),
            info: specData.info || { title: "OpenAPI specification", version: "1.0.0" },
            paths: {},
        } satisfies OAS.Spec<T>;

        if (specData.tags) spec.tags = specData.tags;
        if (specData.servers) spec.servers = specData.servers;
        if (specData.security) spec.security = specData.security;
        if (specData.externalDocs) spec.externalDocs = specData.externalDocs;
        if (specData.components) spec.components = specData.components;

        if (spec.openapi === "3.1.0" && !this.options.hasOwnProperty("nullableKeyword")) {
            this.args.nullableKeyword = false;
        }

        for (const typeName of filteredTypes) {
            const type = this.symbols[typeName];

            const comments = {};
            this.parseCommentsIntoDefinition(type.aliasSymbol!, comments, {}, true);

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

            const operation: OAS.Operation = {
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
                if (operation.security === undefined) delete operation.security;
            }

            // custom operation properties
            if (this.args.customOperationProperties) {
                const customOperationProps = this.findCustomProperties(type);
                for (const [propName, propValue] of Object.entries(customOperationProps)) {
                    operation[propName] = propValue;
                }
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
        } else if (spec.components === undefined) {
            delete spec.components;
        }

        return spec;
    }

    public getSchemas(typeNames: (string | RegExp)[]): { [key: string]: OAS.Definition } {
        if (!typeNames || !typeNames.length) {
            return {};
        }
        const filteredTypes: string[] = [];

        typeNames.forEach((typeName) => {
            if (typeName instanceof RegExp) {
                filteredTypes.push(...Object.keys(this.symbols).filter((value) => (typeName as RegExp).test(value)));
            } else {
                filteredTypes.push(...Object.keys(this.symbols).filter((value) => typeName === value));
            }
        });

        const root: { definitions: { [key: string]: OAS.Definition } } = {
            definitions: {},
        };

        this.resetSchemaSpecificProperties();
        this.refPath = "#/definitions/";

        for (const symbolName of filteredTypes) {
            root.definitions[symbolName] = this.getTypeDefinition(this.symbols[symbolName], this.args.ref);
        }
        if (this.args.ref && Object.keys(this.reffedDefinitions).length > 0) {
            root.definitions = { ...root.definitions, ...this.reffedDefinitions };
        }
        return root.definitions;
    }
}
