# Typescript OpenAPI Spec Generator

[![NPM version](https://img.shields.io/npm/v/ts-oas.svg)](https://www.npmjs.com/package/ts-oas)
![GitHub License](https://img.shields.io/github/license/ts-oas/ts-oas)
![NPM Unpacked Size](https://img.shields.io/npm/unpacked-size/ts-oas)

Automatically generate OpenAPI (formerly Swagger) specifications from opinionated Typescript types. Supports OpenAPI **v3.1** and **v3.0**. Requires interfaces/types in a specific format.

## Benefits

-   **Write once, use many.** Typescript provides a fluent way to declare API specifications. With `ts-oas`, you can use the generated specs for documentation, input validation (e.g. with AJV), and serialization — while still reusing the original types in your business logic, unit tests, and more.
-   **Automation first.** Simply write a script or use the CLI to regenerate specs accordingly after any type changes.
-   **Framework-agnostic.** Works seamlessly with any server-side framework, unlike some other tools.

## Features

-   Both [Programmatic](#a-quick-example) and [Command line](#cli) support.
-   Reference schemas and components. Generate schema references that correspond to their Typescript type references.
-   Supports JSDoc annotations. With both pre-defined and custom keywords, metadata can be included in every schema object.
-   Schema processor function for any custom post-processing (if JSDoc annotations aren't enough).
-   Generate json-schemas separately.
-   Typescript 4 and 5 compliant.

## Install

```
npm i ts-oas
```

## Getting Started

Firstly, We need types for each API, compatible with the following format:

```ts
type Api = {
    path: string;
    method: HTTPMethod;
    body?: Record<string, any>;
    params?: Record<string, any>;
    query?: Record<string, any>;
    responses: Partial<Record<HttpStatusCode, any>>;
    security?: Record<string, string[]>[];
};
```

### A quick example

We have `interfaces.ts` where our API types are present:

```ts
import { ApiMapper } from "ts-oas"; // Recommended to use ApiMapper to help to keep the format valid.

export type GetBarAPI = ApiMapper<{
    path: "/foo/bar/:id";
    method: "GET";
    params: {
        id: number;
    };
    query: {
        from_date: Date;
    };
    responses: {
        /**
         * @contentType application/json
         */
        "200": Bar;
        "404": { success: false };
    };
}>;

/**
 * Sample description.
 * @summary Add a Bar
 */
export type AddBarAPI = ApiMapper<{
    path: "/foo/bar";
    method: "POST";
    body: Bar;
    responses: {
        /**
         * No content
         */
        "201": never;
    };
}>;

export type Bar = {
    /**
     * Description for barName.
     * @minLength 10
     */
    barName: string;
    barType: "one" | "two";
};
```

In `script.ts` file:

```ts
import { createProgram, TsOAS } from "ts-oas";
import { resolve } from "path";

// create a Typescript program. or any generic ts program can be used.
const tsProgram = createProgram(["interfaces.ts"], { strictNullChecks: true }, resolve());

// initiate the OAS generator.
const tsoas = new TsOAS(tsProgram, { ref: true });

// get the complete OAS. determine type names (Regex/exact name) to be considered for specs.
const specObject = tsoas.getOpenApiSpec([/API$/]); // all types that ends with "API"

// log results:
console.log(JSON.stringify(specObject, null, 4));

// or write into a ts file:
// writeFileSync("./schema.ts", `const spec = ${inspect(specObject, { depth: null })};\n`);
```

Run the above script.

<details><summary>Expected output</summary>

```json
{
    "openapi": "3.1.0",
    "info": {
        "title": "OpenAPI specification",
        "version": "1.0.0"
    },
    "components": {
        "schemas": {
            "Bar": {
                "type": "object",
                "properties": {
                    "barName": {
                        "description": "Description for barName.",
                        "minLength": 10,
                        "type": "string"
                    },
                    "barType": {
                        "enum": ["one", "two"],
                        "type": "string"
                    }
                },
                "required": ["barName", "barType"]
            }
        }
    },
    "paths": {
        "/foo/bar/:id": {
            "get": {
                "operationId": "GetBarAPI",
                "parameters": [
                    {
                        "name": "id",
                        "in": "path",
                        "required": true,
                        "schema": {
                            "type": "number"
                        }
                    },
                    {
                        "name": "from_date",
                        "in": "query",
                        "required": true,
                        "schema": {
                            "type": "string",
                            "format": "date-time"
                        }
                    }
                ],
                "responses": {
                    "200": {
                        "description": "",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "$ref": "#/components/schemas/Bar"
                                }
                            }
                        }
                    },
                    "404": {
                        "description": "",
                        "content": {
                            "*/*": {
                                "schema": {
                                    "type": "object",
                                    "properties": {
                                        "success": {
                                            "type": "boolean",
                                            "enum": [false]
                                        }
                                    },
                                    "required": ["success"]
                                }
                            }
                        }
                    }
                }
            }
        },
        "/foo/bar": {
            "post": {
                "operationId": "AddBarAPI",
                "description": "Sample description.",
                "summary": "Add a Bar",
                "requestBody": {
                    "content": {
                        "*/*": {
                            "schema": {
                                "$ref": "#/components/schemas/Bar"
                            }
                        }
                    }
                },
                "responses": {
                    "201": {
                        "description": "No content"
                    }
                }
            }
        }
    }
}
```

</details>

### Get json-schemas separately

Schemas with any format can be generated by:

```ts
const schema = tsoas.getSchemas(["Bar"]);
console.log(schema);
```

<details><summary>Expected output</summary>

```
{
  Bar: {
    type: 'object',
    properties: {
      barName: {
        description: 'Description for barName.',
        minLength: 10,
        type: 'string'
      },
      barType: { enum: [ 'one', 'two' ], type: 'string' }
    },
    required: [ 'barName', 'barType' ]
  }
}
```

</details>

## CLI

Command line tool is designed to behave just like the programmatic way. Once it has been installed, CLI can be executed using `npx ts-oas`, or just `ts-oas` if installed globally.

```
Usage: ts-oas <file-paths> <type-names> [options]

<file-paths> : Comma-separated list of relative .ts file paths which contain
types.
<type-names> : Comma-separated list of type names (Regex/exact name) to be
considered in files.

Options:
  -c, --tsconfig-file  Path to a JSON tsconfig file.                    [string]
  -p, --options-file   Path to a JSON file containing 'ts-oas' Options. Refer to
                       the documentation.                               [string]
  -s, --spec-file      Path to a JSON file containing additional OpenAPI
                       specifications.                                  [string]
  -e, --schema-only    Only generates pure schemas from given types.
                       ('spec-file' will be ignored.)                  [boolean]
  -o, --output         Path to a JSON file that will be used to write the
                       output. Will create the file if not existed.     [string]
  -h, --help           Show help                                       [boolean]
  -v, --version        Show version number                             [boolean]

Examples:
  ts-oas ./interfaces/sample.ts myApi,mySecondApi

```

## Documentations

### JSDoc annotations

| Keyword                                                        | Fields  | Examples                                                                                                     |
| -------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------ |
| @default                                                       | any     | `@default foo` `@default 3` `@default ["a", "b", "c"]`                                                       |
| @format                                                        | strings | `@format email`                                                                                              |
| @items                                                         | arrays  | `@items.minimum 1` `@items.format email` `@items {"type":"integer", "minimum":0}` `@default ["a", "b", "c"]` |
| @$ref                                                          | any     | `@ref http://my-schema.org`                                                                                  |
| @title                                                         | any     | `@title foo`                                                                                                 |
| @minimum<br>@maximum<br>@exclusiveMinimum<br>@exclusiveMaximum | numbers | `@minimum 10` `@maximum 100`                                                                                 |
| @minLength<br>@maxLength                                       | strings | `@minLength 10` `@maxLength 100`                                                                             |
| @minItems<br>@maxItems                                         | arrays  | `@minItems 10` `@maxItems 100`                                                                               |
| @minProperties<br>@maxProperties                               | objects | `@minProperties 10` `@maxProperties 100`                                                                     |
| @additionalProperties                                          | objects | `@additionalProperties`                                                                                      |
| @ignore                                                        | any     | `@ignore`                                                                                                    |
| @pattern                                                       | strings | `@pattern /^[0-9a-z]+$/g`                                                                                    |
| @example                                                       | any     | `@example foo` `@example {"abc":true}` `@example require('./examples.ts').myExampleConst`                    |
| @examples                                                      | any     | `@example ["foo", "bar"]` `@example require('./examples.ts').myExampleArrayConst`                            |

#### Special keywords for root of API types

| Keyword           | Description                                                |
| ----------------- | ---------------------------------------------------------- |
| @summary          | Provides a brief summary of the API endpoint               |
| @operationId      | Sets a unique identifier for the operation                 |
| @tags             | Assigns tags to group related operations (comma-separated) |
| @deprecated       | Marks the operation as deprecated                          |
| @ignore           | Excludes the API type from the generated specification     |
| @body.description | Adds a description for the request body                    |
| @body.contentType | Sets the content-type for the request body                 |

<details><summary>Example</summary>

```ts
/**
 * Sample description.
 * @summary Summary of Endpoint
 * @operationId addBar
 * @tags foos,bars
 * @deprecated
 * @ignore
 * @body.description Description for body of request.
 * @body.contentType application/json
 */
export type AddBarAPI = ApiMapper<{
    path: "/foo/bar";
    method: "POST";
    body: Bar;
    responses: {
        "201": {};
    };
}>;
```

</details>

#### Special keywords for response items

| Keyword      | Description                            |
| ------------ | -------------------------------------- |
| @contentType | Sets the content-type for the response |

<details><summary>Example</summary>

```ts
    ...
    responses: {
        /**
        * Description for response 200.
        * @contentType application/json
        */
        "200": { success: true };
    };
```

</details>

### Options

#### `ref`

> _default: false_

Defines references for schemas based on their type references.

#### `titles`

> _default: false_

Provides a `title` field in each schema, filled with its corresponding field name or type name.

#### `ignoreRequired`

> _default: false_

Ignores the `required` field in all schemas.

#### `ignoreErrors`

> _default: false_

Ignores errors in Typescript files. May introduce wrong schemas.

#### `uniqueNames`

> _default: false_

Replaces every type name with a unique hash to avoid duplication issues.

#### `tsNodeRegister`

> _default: false_

Uses `ts-node/register` as a runtime argument, enabling direct execution of TypeScript on Node.js without precompiling.

#### `nullableKeyword`

> _default: true_

Provides `nullable: true` for nullable fields; otherwise, set `type: "null"`.

#### `defaultContentType`

> _default: "\*/\*"_

Sets the default content type for all operations. This can be overridden case-by-case (see the annotations section).

#### `defaultNumberType`

> _default: "number"_

Sets the default schema type for number values, which can be overridden case-by-case (see the annotations section).

#### `customKeywords`

A list of custom keywords to consider in annotations.

#### `customKeywordPrefix`

> _default: "x-"_

The prefix added to all `customKeywords`.

#### `customOperationProperties`

> _default: false_

Whether to consider custom operation properties in the root of API types.
If true, avoid using `ApiMapper`, as it will override these properties.

#### `schemaProcessor`

A function that runs over each generated schema.

## Inspirations

`ts-oas` is highly inspired by [typescript-json-schema](https://github.com/YousefED/typescript-json-schema). While using the so-called library, it took lots of workarounds to create compatible OpenAPI v3.0 specs. For example, modifying output schemas enforced us to use schema-walker tools which added lots of overhead in our scripts (Despite of compatible OpenAPI schemas in `ts-oas`, we added a schema-processor custom function as an option as well).

## Contributing

Contributions of any kind are welcome!

<details><summary>TODOs</summary>

-   [x] CLI
-   [ ] Support for request and response header specs
-   [ ] More docs and examples
-   [ ] Complete tests
