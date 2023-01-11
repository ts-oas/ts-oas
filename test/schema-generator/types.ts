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
