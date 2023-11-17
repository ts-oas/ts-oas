// ---> @default
type TypeWithDefault = {
    /**
     * @default bar string
     */
    foo: string;
};
export const schemaWithDefault = {
    type: "object",
    properties: { foo: { default: "bar string", type: "string" } },
    required: ["foo"],
};

// ---> @format
type TypeWithFormat = {
    /**
     * @format time
     */
    time: Date;
    /**
     * @format integer
     */
    integer: number;
};
export const schemaWithFormat = {
    type: "object",
    properties: {
        time: { format: "time", type: "string" },
        integer: { format: "integer", type: "number" },
    },
    required: ["integer", "time"],
};

// ---> @$ref
type TypeWithRef = {
    /**
     * @$ref http://my-schema.org
     */
    foo: string;
};
export const schemaWithRef = {
    type: "object",
    properties: { foo: { $ref: "http://my-schema.org", type: "string" } },
    required: ["foo"],
};

// ---> @title
type TypeWithTitle = {
    /**
     * @title a good title
     */
    foo: string;
};
export const schemaWithTitle = {
    type: "object",
    properties: { foo: { title: "a good title", type: "string" } },
    required: ["foo"],
};

// ---> @minimum @maximum @exclusiveMinimum @exclusiveMaximum
type TypeWithMinimumMaximum = {
    /**
     * @minimum 1
     * @maximum 100
     * @exclusiveMinimum 2
     * @exclusiveMaximum 20
     */
    foo: number;
};
export const schemaWithMinimumMaximum = {
    type: "object",
    properties: {
        foo: {
            type: "number",
            minimum: 1,
            maximum: 100,
            exclusiveMinimum: 2,
            exclusiveMaximum: 20,
        },
    },
    required: ["foo"],
};

// ---> @minLength @maxLength
type TypeWithMinLengthMaxLength = {
    /**
     * @minLength 1
     * @maxLength 100
     */
    foo: string;
};
export const schemaWithMinLengthMaxLength = {
    type: "object",
    properties: {
        foo: {
            type: "string",
            minLength: 1,
            maxLength: 100,
        },
    },
    required: ["foo"],
};

// ---> @minItems @maxItems
type TypeWithMinItemsMaxItems = {
    /**
     * @minItems 1
     * @maxItems 100
     */
    foo: string[];
};
export const schemaWithMinItemsMaxItems = {
    type: "object",
    properties: {
        foo: {
            type: "array",
            minItems: 1,
            maxItems: 100,
            items: { type: "string" }
        },
    },
    required: ["foo"],
};

// ---> @minProperties @maxProperties
type TypeWithMinPropertiesMaxProperties = {
    /**
     * @minProperties 1
     * @maxProperties 100
     */
    foo: {
        [key: string]: string;
    };
};
export const schemaWithMinPropertiesMaxProperties = {
    type: "object",
    properties: {
        foo: {
            type: "object",
            minProperties: 1,
            maxProperties: 100,
        },
    },
    required: ["foo"],
};

// ---> @additionalProperties
type TypeWithAdditionalProperties = {
    /**
     * @additionalProperties
     */
    foo: {
        bar: string;
    };
    /**
     * @additionalProperties false
     */
    foo2: {
        bar: string;
    };
};
export const schemaWithAdditionalProperties = {
    type: "object",
    properties: {
        foo: {
            type: "object",
            additionalProperties: true,
            properties: {
                bar: {
                    type: "string",
                },
            },
            required: ["bar"],
        },
        foo2: {
            type: "object",
            additionalProperties: false,
            properties: {
                bar: {
                    type: "string",
                },
            },
            required: ["bar"],
        },
    },
    required: ["foo","foo2"],
};

// ---> @ignore
type TypeWithIgnore = {
    /**
     * @ignore
     */
    foo: string;
    bar: string;
};
export const schemaWithIgnore = {
    type: "object",
    properties: {
        bar: {
            type: "string",
        },
    },
    required: ["bar"],
};

// ---> @pattern
type TypeWithPattern = {
    /**
     * @pattern ^[0-9a-z]+$
     */
    foo: string;
    /**
     * @pattern ^abc123$
     */
    bar: string;
};
export const schemaWithPattern = {
    type: "object",
    properties: {
        foo: {
            type: "string",
            pattern: "^[0-9a-z]+$",
        },
        bar: {
            type: "string",
            pattern: "^abc123$",
        },
    },
    required: ["bar", "foo"],
};

// ---> @example
type TypeWithExample = {
    /**
     * @example An example for foo
     */
    foo: string;
    /**
     * @example [1,2,3,4]
     */
    bar: number[];
    /**
     * @example {"abc":true, "def":false}
     */
    baz: {
        [key: string]: boolean;
    };
};
export const schemaWithExample = {
    type: "object",
    properties: {
        foo: {
            type: "string",
            example: "An example for foo",
        },
        bar: {
            type: "array",
            items: { type: "number" },
            example: [1,2,3,4],
        },
        baz: {
            type: "object",
            example: { "abc":true, "def":false },
        },
    },
    required: ["bar", "baz", "foo"],
};

// TODO: add example annotations from external files
