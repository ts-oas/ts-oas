# Typescript OpenAPI Spec Generator

[![npm version](https://img.shields.io/npm/v/ts-oas.svg)](https://www.npmjs.com/package/ts-oas)

Generate OpenAPI (formerly Swagger) specifications from Typescript types, automatically. Needs interfaces/types in a specific format.

## Benefits

-   Write once, use many. Typescript is one of the most fluent ways to declare API specifications. Using `ts-oas`, we are able to utilize the generated specs for not only the documentations, also input validations (eg. ajv), serializing, maintaining business logic codes or their tests (with generics) and more.
-   Automation first. Simply write a script and regenerate specs accordingly after making any change in types.
-   Headless. Works with any server-side framework, unlike some tools.

## Features

-   Both [Programmatic](#a-quick-example) and [Command line](#cli) support.
-   Supports JSDoc annotations. Using pre-defined and user-defined keywords, metadata can be included in every schema objects.
-   Reference schemas and components. Schema references can be generated and addressed in accord with their correspond type references.
-   Schema processor function for any desired post-process (if JSDoc isn't enough).
-   Generate schemas separately.
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
import { ApiMapper } from "ts-oas";
// Recommended to use ApiMapper to help to keep the format valid.
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
        "201": {};
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
import TypescriptOAS, { createProgram } from "ts-oas";
import { resolve } from "path";
import { writeFileSync } from "fs";
import { inspect } from "util";

// create a Typescript program. or any generic ts program can be used.
const tsProgram = createProgram(
    ["interfaces.ts"],
    {
        strictNullChecks: true,
    },
    resolve()
);

// initiate the OAS generator.
const tsoas = new TypescriptOAS(tsProgram, {
    ref: true,
});

// get the complete OAS. determine which types must be used for API specs by passing type names(Regex/exact name)
const specObject = tsoas.getOpenApiSpec([/API$/]); // /API$/ -> all types that ends with "API"

// log results:
console.log(JSON.stringify(specObject, null, 4));

// or write into a ts file:
// writeFileSync("./schema.ts", `const spec = ${inspect(specObject, { depth: null })};\n`);
```

Run the above script.

<details><summary>Expected output</summary>

```json
{
    "openapi": "3.0.3",
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
                        "description": "",
                        "content": {
                            "*/*": {
                                "schema": {
                                    "type": "object",
                                    "properties": {}
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
```

</details>

### Get schemas separately

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

Command line tool is designed to behave just like the programmatic way. Once it has been installed, CLI can be executable using `npx ts-oas`, or just `ts-oas` if installed globally.

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

@summary @operationId @tags @ignore @body.description @body.contentType

<details><summary>Example</summary>

```ts
/**
 * Sample description.
 * @summary Summary of Endpoint
 * @operationId addBar
 * @tags foos,bars
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

@contentType

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

Uses schemas as references, corresponding to their type references.

#### `titles`

> _default: false_

Provides `title` field in each schema which is filled by it's corresponding field name or type name.

#### `ignoreRequired`

> _default: false_

Ignores `required` field in all schemas.

#### `ignoreErrors`

> _default: false_

Ignores errors in typescript files. May introduces wrong schemas.

#### `uniqueNames`

> _default: false_

Replaces a hash for every type name to avoid duplication issues.

#### `tsNodeRegister`

> _default: false_

Uses `ts-node/register` as a runtime argument. It enables you to directly execute TypeScript on Node.js without precompiling.

#### `nullableKeyword`

> _default: true_

Provides `nullable: true` for nullable fields, otherwise set `type: "null"`.

#### `defaultContentType`

> _default: "\*/\*"_

Default content type for all the operations. Can be overwritten case by case (See the annotations section.).

#### `defaultNumberType`

> _default: "number"_

Default schema type for number types. Can be overwritten case by case (See the annotations section.).

#### `customKeywords`

Custom keywords to consider in annotations.

#### `customKeywordPrefix`

> _default: "x-"_

Prefix that should be added to all `customKeywords`.

#### `schemaProcessor`

A function that will run over each generated schema.

## Inspirations

`ts-oas` is highly inspired by [typescript-json-schema](https://github.com/YousefED/typescript-json-schema). While using the so-called library, it took lots of workarounds to create compatible OpenAPI v3.0 specs. For example, modifying output schemas enforced us to use schema-walker tools which added lots of overhead in our scripts (Despite of compatible OpenAPI schemas in `ts-oas`, there is a schema-processor custom function as an option as well).

Connecting Typescript types to serializer and validators to cut down the developing times, was the main purpose of developing this tool.

## Contributing

Any contributions are welcome.

<details><summary>TODOs</summary>

-   [x] CLI
-   [ ] Support for request and response header specs
-   [ ] More docs and examples
-   [ ] Complete tests
