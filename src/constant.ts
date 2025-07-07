export const REGEX_FILE_NAME_OR_SPACE = /(\bimport\(".*?"\)|".*?")\.| /g;
/**
 * Resolve required file, his path and a property name,
 *      pattern: require([file_path]).[property_name]
 *
 * the part ".[property_name]" is optional in the regex
 *
 * will match:
 *
 *      require('./path.ts')
 *      require('./path.ts').objectName
 *      require("./path.ts")
 *      require("./path.ts").objectName
 *      require('@module-name')
 *
 *      match[2] = file_path (a path to the file with quotes)
 *      match[3] = (optional) property_name (a property name, exported in the file)
 *
 * for more details, see tests/require.test.ts
 */
export const REGEX_REQUIRE =
    /^(\s+)?require\((\'@?[a-zA-Z0-9.\/_-]+\'|\"@?[a-zA-Z0-9.\/_-]+\")\)(\.([a-zA-Z0-9_$]+))?(\s+|$)/;

/**
 * JSDoc keywords that should be used to annotate the JSON schema.
 *
 * Many of these validation keywords are defined here: http://json-schema.org/latest/json-schema-validation.html
 */
// prettier-ignore
export const validationKeywords = {
    format: true,
    enum: true,                     // 6.23.
    type: true,                     // 6.25.
    items: true,                    // 6.9.
    maximum: true,                  // 6.2.
    exclusiveMaximum: true,         // 6.3.
    minimum: true,                  // 6.4.
    exclusiveMinimum: true,         // 6.5.
    maxLength: true,                // 6.6.
    minLength: true,                // 6.7.
    pattern: true,                  // 6.8.
    examples: true,                    // Draft 6 (draft-handrews-json-schema-validation-01)
    // additionalItems: true,          // 6.10.
    maxItems: true,                 // 6.11.
    minItems: true,                 // 6.12.
    uniqueItems: true,              // 6.13.
    multipleOf: true,               // 6.1.
    // contains: true,                 // 6.14.
    maxProperties: true,            // 6.15.
    minProperties: true,            // 6.16.
    // required: true,                 // 6.17.  This is not required. It is auto-generated.
    // properties: true,               // 6.18.  This is not required. It is auto-generated.
    // patternProperties: true,        // 6.19.
    additionalProperties: true,     // 6.20.
    // dependencies: true,             // 6.21.
    // propertyNames: true,            // 6.22.
    // const: true,                    // 6.24.
    // allOf: true,                    // 6.26.
    // anyOf: true,                    // 6.27.
    // oneOf: true,                    // 6.28.
    // not: true,                      // 6.29.

    example: true, 
    ignore: true,
    description: true,
    default: true,
    ref: true,
    $ref: true,
    title: true
};

/**
 * Keywords that should be used in open api specs.
 */
export const openApiKeywords = {
    summary: true,
    operationId: true,
    tags: true,
    contentType: true,
    deprecated: true,
};

/**
 * Subset of descriptive, non-type keywords that are permitted alongside a $ref.
 * Prior to JSON Schema draft 2019-09, $ref is a special keyword that doesn't
 * permit keywords alongside it, and so AJV may raise warnings if it encounters
 * any type-related keywords; see https://github.com/ajv-validator/ajv/issues/1121
 */
export const refKeywords: { [k in keyof typeof validationKeywords]?: true } = {
    description: true,
    default: true,
    examples: true,
    $ref: true,
};
