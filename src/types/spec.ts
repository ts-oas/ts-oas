import { Definition, HTTPMethod } from ".";
import { OpenAPIV3 } from "openapi-types";

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
};

export type PathsObject = {
    [path: string]: Partial<Record<Lowercase<HTTPMethod>, OperationObject>>;
};

export type OpenApiSpecData = {
  info?: OpenAPIV3.InfoObject;
  tags?: OpenAPIV3.TagObject[];
  security?: OpenAPIV3.SecurityRequirementObject[];
  servers?: OpenAPIV3.ServerObject[];
  externalDocs?: OpenAPIV3.ExternalDocumentationObject;
}

export type OpenApiSpec = OpenApiSpecData & {
    openapi: "3.0.3";
    components: {
        schemas: {
            [schemaName: string]: Definition;
        };
    };
    paths: PathsObject;
};
