import { OpenAPIV3, OpenAPIV3_1 } from "openapi-types";
import { HTTPMethod } from "./enums/HTTPMethod.enum";

/**
 * @deprecated Use `OAS.Responses` instead. Will be removed in the next major version.
 */
export type ResponsesObject = {
    [key: string]: {
        description?: string;
        content: { [key: string]: { schema: OAS.Definition } };
    };
};

/**
 * @deprecated Use `OAS.RequestBody` instead. Will be removed in the next major version.
 */
export type RequestBodyObject = {
    required?: boolean;
    description?: string;
    content: { [key: string]: { schema: OAS.Definition } };
};

/**
 * @deprecated Use `OAS.Parameter` instead. Will be removed in the next major version.
 */
export type ParameterObject = {
    name: string;
    in: "path" | "query" | "header" | "cookie";
    required: boolean;
    description?: string;
    schema: OAS.Definition;
};

/**
 * @deprecated Use `OAS.Operation` instead. Will be removed in the next major version.
 */
export type OperationObject = {
    summary?: string;
    description?: string;
    operationId?: string;
    tags?: string[];
    requestBody?: RequestBodyObject;
    parameters?: ParameterObject[];
    responses?: ResponsesObject;
    security?: Record<string, string[]>[];
};

/**
 * @deprecated Use `OAS.Paths` instead. Will be removed in the next major version.
 */
export type PathsObject = {
    [path: string]: Partial<Record<Lowercase<HTTPMethod>, OperationObject>>;
};

/**
 * @deprecated Use `OAS.SpecVersion` instead. Will be removed in the next major version.
 */
export type Version = "3.1.0" | "3.0.3";

/**
 * @deprecated Use `OAS.SpecData` instead. Will be removed in the next major version.
 */
export type OpenApiSpecData<T extends Version = "3.1.0"> = {
    openapi?: T;
    info?: T extends "3.1.0" ? OpenAPIV3_1.InfoObject : OpenAPIV3.InfoObject;
    tags?: T extends "3.1.0" ? OpenAPIV3_1.TagObject[] : OpenAPIV3.TagObject[];
    security?: T extends "3.1.0" ? OpenAPIV3_1.SecurityRequirementObject[] : OpenAPIV3.SecurityRequirementObject[];
    servers?: T extends "3.1.0" ? OpenAPIV3_1.ServerObject[] : OpenAPIV3.ServerObject[];
    externalDocs?: T extends "3.1.0" ? OpenAPIV3_1.ExternalDocumentationObject : OpenAPIV3.ExternalDocumentationObject;
    components?: T extends "3.1.0"
        ? Omit<OpenAPIV3_1.ComponentsObject, "schemas"> & {
              schemas?: {
                  [schemaName: string]: OpenAPIV3_1.ReferenceObject | OAS.Definition;
              };
          }
        : Omit<OpenAPIV3.ComponentsObject, "schemas"> & {
              schemas?: {
                  [schemaName: string]: OpenAPIV3.ReferenceObject | OAS.Definition;
              };
          };
};

/**
 * @deprecated Use `OAS.Spec` instead. Will be removed in the next major version.
 */
export type OpenApiSpec<T extends Version = "3.1.0"> = OpenApiSpecData<T> & {
    paths: PathsObject;
};

type RedefinedFields = "type" | "items" | "allOf" | "oneOf" | "anyOf" | "not" | "additionalProperties" | "properties";

export namespace OAS {
    export type Version = "3.1.0" | "3.0.3";

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
        patternProperties?: {
            [name: string]: Definition;
        };
        $ref?: string;
    }

    export type Responses = {
        [key: string]: {
            description?: string;
            content: { [key: string]: { schema: Definition } };
        };
    };

    export type RequestBody =  {
        required?: boolean;
        description?: string;
        content: { [key: string]: { schema: Definition } };
    };

    export type Parameter = {
        name: string;
        in: "path" | "query" | "header" | "cookie";
        required: boolean;
        description?: string;
        schema: Definition;
    };

    export type Operation = {
        summary?: string;
        description?: string;
        operationId?: string;
        tags?: string[];
        requestBody?: RequestBody;
        parameters?: Parameter[];
        responses?: Responses;
        security?: Record<string, string[]>[];
    };

    export type Paths = {
        [path: string]: Partial<Record<Lowercase<HTTPMethod>, Operation>>;
    };

    export type SpecData<T extends Version = "3.1.0"> = {
        openapi?: T;
        info?: T extends "3.1.0" ? OpenAPIV3_1.InfoObject : OpenAPIV3.InfoObject;
        tags?: T extends "3.1.0" ? OpenAPIV3_1.TagObject[] : OpenAPIV3.TagObject[];
        security?: T extends "3.1.0" ? OpenAPIV3_1.SecurityRequirementObject[] : OpenAPIV3.SecurityRequirementObject[];
        servers?: T extends "3.1.0" ? OpenAPIV3_1.ServerObject[] : OpenAPIV3.ServerObject[];
        externalDocs?: T extends "3.1.0" ? OpenAPIV3_1.ExternalDocumentationObject : OpenAPIV3.ExternalDocumentationObject;
        components?: T extends "3.1.0"
            ? Omit<OpenAPIV3_1.ComponentsObject, "schemas"> & {
                  schemas?: {
                      [schemaName: string]: OpenAPIV3_1.ReferenceObject | Definition;
                  };
              }
            : Omit<OpenAPIV3.ComponentsObject, "schemas"> & {
                  schemas?: {
                      [schemaName: string]: OpenAPIV3.ReferenceObject | Definition;
                  };
              };
    };

    export type Spec<T extends Version = "3.1.0"> = OpenApiSpecData<T> & {
        paths: PathsObject;
    };
}
