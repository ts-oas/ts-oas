import { Definition, HTTPMethod } from ".";
import { OpenAPIV3, OpenAPIV3_1 } from "openapi-types";

export type ResponsesObject = {
    [key: string]: {
        description?: string;
        content: { [key: string]: { schema: Definition } };
    };
};

export type RequestBodyObject = {
    required?: boolean;
    description?: string;
    content: { [key: string]: { schema: Definition } };
};

export type ParameterObject = {
    name: string;
    in: "path" | "query" | "header" | "cookie";
    required: boolean;
    description?: string;
    schema: Definition;
};

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

export type PathsObject = {
    [path: string]: Partial<Record<Lowercase<HTTPMethod>, OperationObject>>;
};

export type Version = "3.1.0" | "3.0.3";

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
                  [schemaName: string]: OpenAPIV3_1.ReferenceObject | Definition;
              };
          }
        : Omit<OpenAPIV3.ComponentsObject, "schemas"> & {
              schemas?: {
                  [schemaName: string]: OpenAPIV3.ReferenceObject | Definition;
              };
          };
};

export type OpenApiSpec<T extends Version = "3.1.0"> = OpenApiSpecData<T> & {
    paths: PathsObject;
};
