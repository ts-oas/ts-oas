import * as path from "path";
import { createHash } from "crypto";
import * as ts from "typescript";
import { Definition, Options } from "..";
import { AnnotationKeywords, MetaDefinitionFields, PrimitiveType, UnionModifier } from "../types/common";
import { openApiKeywords, refKeywords, REGEX_FILE_NAME_OR_SPACE, REGEX_REQUIRE, validationKeywords } from "../constant";

const vm = require("vm");

type RequiredOptions = Required<Omit<Options, "schemaProcessor">> & Pick<Options, "schemaProcessor">;

export class SchemaGenerator {
    constructor(program: ts.Program, options: Options = {}) {
        const { symbols, inheritingTypes, typeChecker, settings } = this.buildSchemaGenerator(program, options);

        this.symbols = symbols;
        this.inheritingTypes = inheritingTypes;
        this.tc = typeChecker;
        this.options = options;
        this.args = settings;
        this.annotationKeywords = {
            ...validationKeywords,
            ...openApiKeywords,
            ...this.args.customKeywords?.reduce((acc, word) => ({ ...acc, [word]: "custom" }), {}),
        };
    }
    protected options: Options;
    protected args: RequiredOptions;
    protected tc: ts.TypeChecker;
    /**
     * All types for declarations of classes, interfaces, enums, and type aliases
     * defined in all TS files.
     */
    protected symbols: { [name: string]: ts.Type };
    /**
     * Maps from the names of base types to the names of the types that inherit from
     * them.
     */
    protected inheritingTypes: { [baseName: string]: string[] };

    /**
     * This map holds references to all reffed definitions, including schema
     * overrides and generated definitions.
     */
    protected reffedDefinitions: { [key: string]: Definition } = {};
    protected refPath: string;

    /**
     * This map only holds explicit schema overrides. This helps differentiate between
     * user defined schema overrides and generated definitions.
     */
    protected schemaOverrides = new Map<string, Definition>();

    protected recursiveTypeRef = new Map();

    /**
     * This is a set of all the annotation keywords.
     */
    protected annotationKeywords: AnnotationKeywords;

    /**
     * Types are assigned names which are looked up by their IDs.  This is the
     * map from type IDs to type names.
     */
    protected typeNamesById: { [id: number]: string } = {};
    /**
     * Whenever a type is assigned its name, its entry in this dictionary is set,
     * so that we don't give the same name to two separate types.
     */
    protected typeIdsByName: { [name: string]: number } = {};

    protected get ReffedDefinitions(): { [key: string]: Definition } {
        return this.reffedDefinitions;
    }

    protected buildSchemaGenerator(program: ts.Program, options: Options = {}) {
        // Use defaults unless otherwise specified
        const settings = this.getDefaultOptions();

        for (const pref in options) {
            if (options.hasOwnProperty(pref)) {
                settings[pref] = options[pref];
            }
        }

        if (settings.tsNodeRegister) {
            require("ts-node/register");
        }

        if (!settings.ignoreErrors) {
            const diagnostics = ts.getPreEmitDiagnostics(program);
            if (diagnostics.length !== 0) {
                const messages: string[] = [];
                diagnostics.forEach((diagnostic) => {
                    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
                    messages.push(message);
                    if (diagnostic.file) {
                        const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!);
                        console.error(`${diagnostic.file.fileName}:${line + 1}:${character + 1} - ${message}`);
                    } else {
                        console.error(message);
                    }
                });
                throw new Error(
                    'There are errors in typescript files which linked above. Fix all errors or run with "--ignoreErrors".'
                );
            }
        }

        const rootSymbolNames = new Set<string>();
        const symbols: { [name: string]: ts.Type } = {};
        const inheritingTypes: { [baseName: string]: string[] } = {};

        const typeChecker = program.getTypeChecker();
        const workingDir = program.getCurrentDirectory();

        program.getRootFileNames().forEach(function (sourceFileName, _sourceFileIdx) {
            const sourceFile = program.getSourceFile(sourceFileName);

            function inspect(node: ts.Node) {
                // Collect defined symbols (whether exported or not)
                if (
                    ts.isVariableDeclaration(node) ||
                    ts.isFunctionDeclaration(node) ||
                    ts.isClassDeclaration(node) ||
                    ts.isInterfaceDeclaration(node) ||
                    ts.isTypeAliasDeclaration(node)
                ) {
                    const symbol = typeChecker.getSymbolAtLocation(node.name!);
                    if (symbol) {
                        rootSymbolNames.add(symbol.getName());
                    }
                }

                // Collect imported symbols
                if (ts.isImportDeclaration(node) && node.importClause) {
                    const importClause = node.importClause;

                    if (importClause.name) {
                        // Default import
                        const symbol = typeChecker.getSymbolAtLocation(importClause.name);
                        if (symbol) {
                            rootSymbolNames.add(symbol.getName());
                        }
                    }

                    if (importClause.namedBindings) {
                        if (ts.isNamedImports(importClause.namedBindings)) {
                            importClause.namedBindings.elements.forEach((element) => {
                                const symbol = typeChecker.getSymbolAtLocation(element.name);
                                if (symbol) {
                                    rootSymbolNames.add(symbol.getName());
                                }
                            });
                        } else if (ts.isNamespaceImport(importClause.namedBindings)) {
                            const symbol = typeChecker.getSymbolAtLocation(importClause.namedBindings.name);
                            if (symbol) {
                                rootSymbolNames.add(symbol.getName());
                            }
                        }
                    }
                }

                // Collect exported symbols
                if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
                    const moduleSpecifier = (node.moduleSpecifier as ts.StringLiteral).text;

                    // Resolve the module path
                    const resolvedModule = ts.resolveModuleName(
                        moduleSpecifier,
                        sourceFile!.fileName,
                        program.getCompilerOptions(),
                        ts.sys
                    );

                    const resolvedFileName = resolvedModule.resolvedModule?.resolvedFileName;

                    if (resolvedFileName) {
                        const moduleSourceFile = program.getSourceFile(resolvedFileName);

                        if (moduleSourceFile) {
                            const moduleSymbol = typeChecker.getSymbolAtLocation(moduleSourceFile);

                            if (moduleSymbol) {
                                // Check if it's a wildcard export or named exports
                                if (!node.exportClause) {
                                    // Wildcard export: export * from "..."
                                    const exports = typeChecker.getExportsOfModule(moduleSymbol);
                                    exports.forEach((exportItem) => {
                                        rootSymbolNames.add(exportItem.getName());
                                    });
                                } else if (ts.isNamedExports(node.exportClause)) {
                                    // Named exports: export { ... } from "..."
                                    node.exportClause.elements.forEach((element) => {
                                        const symbol = program
                                            .getTypeChecker()
                                            .getExportSpecifierLocalTargetSymbol(element);
                                        if (symbol) {
                                            rootSymbolNames.add(symbol.getName());
                                        }
                                    });
                                }
                            }
                        }
                    }
                }
                ts.forEachChild(node, inspect);
            }
            inspect(sourceFile!);
        });

        program.getSourceFiles().forEach((sourceFile, _sourceFileIdx) => {
            const relativePath = path.relative(workingDir, sourceFile.fileName);

            function inspect(node: ts.Node) {
                if (
                    node.kind === ts.SyntaxKind.ClassDeclaration ||
                    node.kind === ts.SyntaxKind.InterfaceDeclaration ||
                    node.kind === ts.SyntaxKind.EnumDeclaration ||
                    node.kind === ts.SyntaxKind.TypeAliasDeclaration
                ) {
                    const symbol: ts.Symbol = (<any>node).symbol;

                    if (!rootSymbolNames.has(symbol.getName())) {
                        return;
                    }

                    const nodeType = typeChecker.getTypeAtLocation(node);
                    const fullyQualifiedName = typeChecker.getFullyQualifiedName(symbol);
                    const typeName = fullyQualifiedName.replace(/".*"\./, "");
                    const name = !settings.uniqueNames
                        ? typeName
                        : `${typeName}.${this.generateHashOfNode(node, relativePath)}`;

                    symbols[name] = nodeType;

                    const baseTypes = nodeType.getBaseTypes() || [];

                    baseTypes.forEach((baseType) => {
                        var baseName = typeChecker.typeToString(
                            baseType,
                            undefined,
                            ts.TypeFormatFlags.UseFullyQualifiedType
                        );
                        if (!inheritingTypes[baseName]) {
                            inheritingTypes[baseName] = [];
                        }
                        inheritingTypes[baseName].push(name);
                    });
                } else {
                    ts.forEachChild(node, inspect);
                }
            }
            inspect(sourceFile);
        });

        return { symbols, inheritingTypes, typeChecker, settings };
    }

    protected getDefaultOptions(): RequiredOptions {
        return {
            ref: false,
            titles: false,
            ignoreRequired: false,
            ignoreErrors: false,
            customKeywordPrefix: "x-",
            customKeywords: [],
            uniqueNames: false,
            defaultUnionModifier: "anyOf",
            defaultNumberType: "number",
            tsNodeRegister: false,
            nullableKeyword: true,
            defaultContentType: "*/*",
            customOperationProperties: false,
        };
    }

    /**
     * Resolve required file
     */
    protected resolveRequiredFile(symbol: ts.Symbol, key: string, fileName: string, objectName: string): any {
        const sourceFile = this.getSourceFile(symbol);
        const requiredFilePath = /^[.\/]+/.test(fileName)
            ? fileName === "."
                ? path.resolve(sourceFile.fileName)
                : path.resolve(path.dirname(sourceFile.fileName), fileName)
            : fileName;
        const requiredFile = require(requiredFilePath);
        if (!requiredFile) {
            throw Error("Required: File couldn't be loaded");
        }
        const requiredObject = objectName ? requiredFile[objectName] : requiredFile.default;
        if (requiredObject === undefined) {
            throw Error("Required: Variable is undefined");
        }
        if (typeof requiredObject === "function") {
            throw Error("Required: Can't use function as a variable");
        }
        if (key === "examples" && !Array.isArray(requiredObject)) {
            throw Error("Required: Variable isn't an array");
        }
        return requiredObject;
    }

    /**
     * Try to parse a value and returns the string if it fails.
     */
    protected parseValue(symbol: ts.Symbol, key: string, value: string): any {
        const match = REGEX_REQUIRE.exec(value);
        if (match) {
            const fileName = match[2].substr(1, match[2].length - 2).trim();
            const objectName = match[4];
            return this.resolveRequiredFile(symbol, key, fileName, objectName);
        }
        try {
            return JSON.parse(value);
        } catch (error) {
            return value;
        }
    }

    protected extractLiteralValue(typ: ts.Type): PrimitiveType | undefined {
        let str = (<ts.LiteralType>typ).value;
        if (str === undefined) {
            str = (typ as any).text;
        }
        if (typ.flags & ts.TypeFlags.StringLiteral) {
            return str as string;
        } else if (typ.flags & ts.TypeFlags.BooleanLiteral) {
            return (typ as any).intrinsicName === "true";
        } else if (typ.flags & ts.TypeFlags.EnumLiteral) {
            // or .text for old TS
            const num = parseFloat(str as string);
            return isNaN(num) ? (str as string) : num;
        } else if (typ.flags & ts.TypeFlags.NumberLiteral) {
            return parseFloat(str as string);
        }
        return undefined;
    }

    protected generateHashOfNode(node: ts.Node, relativePath: string): string {
        return createHash("md5").update(relativePath).update(node.pos.toString()).digest("hex").substring(0, 8);
    }

    /**
     * Checks whether a type is a tuple type.
     */
    protected resolveTupleType(propertyType: ts.Type): ts.TupleTypeNode | null {
        if (
            !propertyType.getSymbol() &&
            propertyType.getFlags() & ts.TypeFlags.Object &&
            (<ts.ObjectType>propertyType).objectFlags & ts.ObjectFlags.Reference
        ) {
            return (propertyType as ts.TypeReference).target as any;
        }
        if (
            !(
                propertyType.getFlags() & ts.TypeFlags.Object &&
                (<ts.ObjectType>propertyType).objectFlags & ts.ObjectFlags.Tuple
            )
        ) {
            return null;
        }
        return propertyType as any;
    }

    /**
     * Given a Symbol, returns a canonical Definition. That can be either:
     * 1) The Symbol's valueDeclaration parameter if defined, or
     * 2) The sole entry in the Symbol's declarations array, provided that array has a length of 1.
     *
     * valueDeclaration is listed as a required parameter in the definition of a Symbol, but I've
     * experienced crashes when it's undefined at runtime, which is the reason for this function's
     * existence. Not sure if that's a compiler API bug or what.
     */
    protected getCanonicalDeclaration(sym: ts.Symbol): ts.Declaration {
        if (sym.valueDeclaration !== undefined) {
            return sym.valueDeclaration;
        } else if (sym.declarations?.length === 1) {
            return sym.declarations[0];
        }

        const declarationCount = sym.declarations?.length ?? 0;
        throw new Error(`Symbol "${sym.name}" has no valueDeclaration and ${declarationCount} declarations.`);
    }

    /**
     * Given a Symbol, finds the place it was declared and chases parent pointers until we find a
     * node where SyntaxKind === SourceFile.
     */
    protected getSourceFile(sym: ts.Symbol): ts.SourceFile {
        let currentDecl: ts.Node = this.getCanonicalDeclaration(sym);

        while (currentDecl.kind !== ts.SyntaxKind.SourceFile) {
            if (currentDecl.parent === undefined) {
                throw new Error(`Unable to locate source file for declaration "${sym.name}".`);
            }
            currentDecl = currentDecl.parent;
        }

        return currentDecl as ts.SourceFile;
    }

    protected isFromDefaultLib(symbol: ts.Symbol) {
        const declarations = symbol.getDeclarations();
        if (declarations && declarations.length > 0) {
            return declarations[0].parent.getSourceFile().hasNoDefaultLib;
        }
        return false;
    }

    protected resetSchemaSpecificProperties() {
        this.reffedDefinitions = {};
        this.typeIdsByName = {};
        this.typeNamesById = {};

        // restore schema overrides
        this.schemaOverrides.forEach((value, key) => {
            this.reffedDefinitions[key] = value;
        });
    }

    /**
     * Parse the comments of a symbol into the definition and other annotations.
     */
    protected parseCommentsIntoDefinition(symbol: ts.Symbol, definition: Definition, otherAnnotations: {}): void {
        if (!symbol) {
            return;
        }

        if (!this.isFromDefaultLib(symbol)) {
            // the comments for a symbol
            const comments = symbol.getDocumentationComment(this.tc);

            if (comments.length) {
                definition.description = comments
                    .map((comment) => {
                        const newlineNormalizedComment = comment.text.replace(/\r\n/g, "\n");

                        // If a comment contains a "{@link XYZ}" inline tag that could not be
                        // resolved by the TS checker, then this comment will contain a trailing
                        // whitespace that we need to remove.
                        if (comment.kind === "linkText") {
                            return newlineNormalizedComment.trim();
                        }

                        return newlineNormalizedComment;
                    })
                    .join("")
                    .trim();
            }
        }

        // jsdocs are separate from comments
        const jsdocs = symbol.getJsDocTags();
        jsdocs.forEach((doc) => {
            // if we have @TJS-... annotations, we have to parse them
            let name = doc.name;
            const originalText = doc.text ? doc.text.map((t) => t.text).join("") : "";
            let text = originalText;

            // In TypeScript ~3.5, the annotation name splits at the dot character so we have
            // to process the "." and beyond from the value
            if (text.startsWith(".")) {
                const valueParts = text.slice(1).split(" ");
                const keywordExisted = this.annotationKeywords[valueParts[0]];
                if (keywordExisted) {
                    definition[name] = {
                        ...definition[name],
                        [(keywordExisted === "custom" ? this.args.customKeywordPrefix : "") + valueParts[0]]:
                            valueParts[1]
                                ? this.parseValue(symbol, valueParts[0], valueParts.slice(1).join(" "))
                                : true,
                    };
                    return;
                }
            }

            // In TypeScript 3.7+, the "." is kept as part of the annotation name
            if (name.includes(".")) {
                const nameParts = name.split(".");
                const keywordExisted = this.annotationKeywords[nameParts[1]];
                if (nameParts.length === 2 && keywordExisted) {
                    definition[nameParts[0]] = {
                        ...definition[nameParts[0]],
                        [(keywordExisted === "custom" ? this.args.customKeywordPrefix : "") + nameParts[1]]: text
                            ? this.parseValue(symbol, name, text)
                            : true,
                    };
                    return;
                }
            }

            const keywordExisted = this.annotationKeywords[name];
            if (keywordExisted) {
                definition[(keywordExisted === "custom" ? this.args.customKeywordPrefix : "") + name] = text
                    ? this.parseValue(symbol, name, text)
                    : true;
            } else {
                // special annotations
                otherAnnotations[name] = true;
            }
        });
    }

    protected getDefinitionForRootType(
        propertyType: ts.Type,
        reffedType: ts.Symbol,
        definition: Definition,
        defaultNumberType = this.args.defaultNumberType
    ): Definition {
        const tupleType = this.resolveTupleType(propertyType);

        if (tupleType) {
            // tuple
            const elemTypes: ts.NodeArray<ts.TypeNode> = (propertyType as any).typeArguments;
            const fixedTypes = elemTypes.map((elType) => this.getTypeDefinition(elType as any));
            definition.type = "array";
            if (fixedTypes.length > 0) {
                definition.items = fixedTypes;
            }
            const targetTupleType = (propertyType as ts.TupleTypeReference).target;
            definition.minItems = targetTupleType.minLength;
            if (!targetTupleType.hasRestElement) {
                definition.maxItems = targetTupleType.fixedLength;
            }
        } else {
            const propertyTypeString = this.tc.typeToString(
                propertyType,
                undefined,
                ts.TypeFormatFlags.UseFullyQualifiedType
            );
            const flags = propertyType.flags;
            const arrayType = this.tc.getIndexTypeOfType(propertyType, ts.IndexKind.Number);

            if (flags & ts.TypeFlags.String) {
                definition.type = "string";
            } else if (flags & ts.TypeFlags.Number) {
                const isInteger =
                    definition.type === "integer" ||
                    reffedType?.getName() === "integer" ||
                    defaultNumberType === "integer";
                definition.type = isInteger ? "integer" : "number";
            } else if (flags & ts.TypeFlags.Boolean) {
                definition.type = "boolean";
            } else if (flags & ts.TypeFlags.Null) {
                if (this.args.nullableKeyword) {
                    definition.type = "object";
                    definition.nullable = true;
                } else {
                    definition.type = "null";
                }
            } else if (flags & ts.TypeFlags.Undefined || propertyTypeString === "void") {
                definition.type = "undefined";
            } else if (flags & ts.TypeFlags.Any || flags & ts.TypeFlags.Unknown) {
                // no type restriction, so that anything will match
            } else if (propertyTypeString === "Date") {
                definition.type = "string";
                definition.format = definition.format || "date-time";
            } else if (propertyTypeString === "object") {
                definition.type = "object";
                definition.properties = {};
                definition.additionalProperties = true;
            } else {
                const value = this.extractLiteralValue(propertyType);
                if (value !== undefined) {
                    definition.type = typeof value;
                    definition.enum = [value];
                } else if (arrayType !== undefined) {
                    definition.type = "array";
                    if (!definition.items) {
                        definition.items = this.getTypeDefinition(arrayType);
                    }
                } else {
                    // Report that type could not be processed
                    const error = new TypeError("Unsupported type: " + propertyTypeString);
                    (error as any).type = propertyType;
                    throw error;
                    // definition = this.getTypeDefinition(propertyType, tc);
                }
            }
        }

        return definition;
    }

    protected getReferencedTypeSymbol(prop: ts.Symbol): ts.Symbol | undefined {
        const decl = prop.getDeclarations();
        if (decl?.length) {
            const type = <ts.TypeReferenceNode>(<any>decl[0]).type;
            if (type && type.kind & ts.SyntaxKind.TypeReference && type.typeName) {
                const symbol = this.tc.getSymbolAtLocation(type.typeName);
                if (symbol && symbol.flags & ts.SymbolFlags.Alias) {
                    return this.tc.getAliasedSymbol(symbol);
                }
                return symbol;
            }
        }
        return undefined;
    }

    protected getDefinitionForProperty(prop: ts.Symbol, node: ts.Node): Definition | null {
        if (prop.flags & ts.SymbolFlags.Method) {
            return null;
        }
        const propertyName = prop.getName();
        const propertyType = this.tc.getTypeOfSymbolAtLocation(prop, node);

        const reffedType = this.getReferencedTypeSymbol(prop);

        const definition = this.getTypeDefinition(propertyType, undefined, undefined, prop, reffedType);

        if (definition.type === "undefined") {
            return null;
        }

        if (this.args.titles) {
            definition.title = propertyName;
        }

        if (definition.hasOwnProperty("ignore")) {
            return null;
        }

        // try to get default value
        const valDecl = prop.valueDeclaration as ts.VariableDeclaration;
        if (valDecl?.initializer) {
            let initial = valDecl.initializer;

            while (ts.isTypeAssertionExpression(initial)) {
                initial = initial.expression;
            }

            if ((<any>initial).expression) {
                // node
                console.warn("initializer is expression for property " + propertyName);
            } else if ((<any>initial).kind && (<any>initial).kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral) {
                definition.default = initial.getText();
            } else {
                try {
                    const sandbox = { sandboxvar: null as any };
                    vm.runInNewContext("sandboxvar=" + initial.getText(), sandbox);

                    const val = sandbox.sandboxvar;
                    if (
                        val === null ||
                        typeof val === "string" ||
                        typeof val === "number" ||
                        typeof val === "boolean" ||
                        Object.prototype.toString.call(val) === "[object Array]"
                    ) {
                        definition.default = val;
                    } else if (val) {
                        console.warn("unknown initializer for property " + propertyName + ": " + val);
                    }
                } catch (e) {
                    console.warn("exception evaluating initializer for property " + propertyName);
                }
            }
        }

        return definition;
    }

    protected getEnumDefinition(clazzType: ts.Type, definition: Definition): Definition {
        const node = clazzType.getSymbol()!.getDeclarations()![0];
        const fullName = this.tc.typeToString(clazzType, undefined, ts.TypeFormatFlags.UseFullyQualifiedType);
        const members: ts.NodeArray<ts.EnumMember> =
            node.kind === ts.SyntaxKind.EnumDeclaration
                ? (node as ts.EnumDeclaration).members
                : ts.factory.createNodeArray([node as ts.EnumMember]);
        var enumValues: (number | boolean | string | null)[] = [];
        const enumTypes: string[] = [];

        const addType = (type: string) => {
            if (enumTypes.indexOf(type) === -1) {
                enumTypes.push(type);
            }
        };

        members.forEach((member) => {
            const caseLabel = (<ts.Identifier>member.name).text;
            const constantValue = this.tc.getConstantValue(member);
            if (constantValue !== undefined) {
                enumValues.push(constantValue);
                addType(typeof constantValue);
            } else {
                // try to extract the enums value; it will probably by a cast expression
                const initial: ts.Expression | undefined = member.initializer;
                if (initial) {
                    if ((<any>initial).expression) {
                        // node
                        const exp = (<any>initial).expression as ts.Expression;
                        const text = (<any>exp).text;
                        // if it is an expression with a text literal, chances are it is the enum convention:
                        // CASELABEL = 'literal' as any
                        if (text) {
                            enumValues.push(text);
                            addType("string");
                        } else if (exp.kind === ts.SyntaxKind.TrueKeyword || exp.kind === ts.SyntaxKind.FalseKeyword) {
                            enumValues.push(exp.kind === ts.SyntaxKind.TrueKeyword);
                            addType("boolean");
                        } else {
                            console.warn("initializer is expression for enum: " + fullName + "." + caseLabel);
                        }
                    } else if (initial.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral) {
                        enumValues.push(initial.getText());
                        addType("string");
                    } else if (initial.kind === ts.SyntaxKind.NullKeyword) {
                        console.log("-> getEnumDefinition enumValues");
                        console.log(enumValues);
                        enumValues.push(null);
                        addType("null");
                    }
                }
            }
        });

        if (enumTypes.length) {
            definition.type = enumTypes.length === 1 ? enumTypes[0] : enumTypes;
        }

        if (enumValues.length > 0) {
            definition.enum = enumValues.sort();
        }

        return definition;
    }

    protected getUnionDefinition(
        unionType: ts.UnionType,
        prop: ts.Symbol,
        unionModifier: UnionModifier,
        definition: Definition
    ): Definition {
        const enumValues: PrimitiveType[] = [];
        const schemas: Definition[] = [];

        const pushEnumValue = (val: PrimitiveType) => {
            if (enumValues.indexOf(val) === -1) {
                enumValues.push(val);
            }
        };

        for (const valueType of unionType.types) {
            const value = this.extractLiteralValue(valueType);
            if (value !== undefined) {
                pushEnumValue(value);
            } else {
                const symbol = valueType.aliasSymbol;
                const def = this.getTypeDefinition(valueType, undefined, undefined, symbol, symbol);
                if (def.type === "undefined") {
                    if (prop) {
                        (<any>prop).mayBeUndefined = true;
                    }
                } else {
                    if (def.type === "null") {
                        if (this.args.nullableKeyword) {
                            def.type = "object";
                            def.nullable = true;
                        } else {
                            def.type = "null";
                        }
                    }
                    schemas.push(def);
                }
            }
        }

        if (enumValues.length > 0) {
            const enumSchema: Definition = { enum: enumValues.sort() };

            // If the enum values are just true and false, remove them as enum
            const isOnlyBooleans =
                enumValues.length === 2 &&
                typeof enumValues[0] === "boolean" &&
                typeof enumValues[1] === "boolean" &&
                enumValues[0] !== enumValues[1];

            if (isOnlyBooleans) {
                delete enumSchema.enum;
            }

            // If all values are of the same primitive type, add a "type" field to the schema
            if (
                enumValues.every((x) => {
                    return typeof x === "string";
                })
            ) {
                enumSchema.type = "string";
            } else if (
                enumValues.every((x) => {
                    return typeof x === "number";
                })
            ) {
                enumSchema.type = "number";
            } else if (
                enumValues.every((x) => {
                    return typeof x === "boolean";
                })
            ) {
                enumSchema.type = "boolean";
            }

            schemas.push(enumSchema);
        }

        if (schemas.length === 1) {
            for (const k in schemas[0]) {
                if (schemas[0].hasOwnProperty(k)) {
                    definition[k] = schemas[0][k];
                }
            }
        } else {
            definition[unionModifier] = schemas;
        }
        return definition;
    }

    protected getIntersectionDefinition(intersectionType: ts.IntersectionType, definition: Definition): Definition {
        const simpleTypes: string[] = [];
        const schemas: Definition[] = [];

        const pushSimpleType = (type: string) => {
            if (simpleTypes.indexOf(type) === -1) {
                simpleTypes.push(type);
            }
        };

        for (const intersectionMember of intersectionType.types) {
            const def = this.getTypeDefinition(intersectionMember);
            if (def.type === "undefined") {
                console.error("Undefined in intersection makes no sense.");
            } else {
                const keys = Object.keys(def);
                if (keys.length === 1 && keys[0] === "type") {
                    if (typeof def.type !== "string") {
                        console.error("Expected only a simple type.");
                    } else {
                        pushSimpleType(def.type);
                    }
                } else {
                    schemas.push(def);
                }
            }
        }

        if (simpleTypes.length > 0) {
            schemas.push({ type: simpleTypes.length === 1 ? simpleTypes[0] : simpleTypes });
        }

        if (schemas.length === 1) {
            for (const k in schemas[0]) {
                if (schemas[0].hasOwnProperty(k)) {
                    definition[k] = schemas[0][k];
                }
            }
        } else {
            definition.allOf = schemas;
        }
        return definition;
    }

    protected getClassDefinition(clazzType: ts.Type, definition: Definition): any {
        const node = clazzType.getSymbol()!.getDeclarations()![0];

        // Example: typeof globalThis may not have any declaration
        if (!node) {
            definition.type = "object";
            return definition;
        }

        let props = this.tc.getPropertiesOfType(clazzType).filter((prop) => {
            // filter never
            const propertyType = this.tc.getTypeOfSymbolAtLocation(prop, node);
            if (ts.TypeFlags.Never === propertyType.getFlags()) {
                return false;
            }

            const decls = prop.declarations;
            return !(
                decls &&
                decls.filter((decl) => {
                    const mods = ts.canHaveModifiers(decl) ? ts.getModifiers(decl) : [];
                    return mods && mods.filter((mod) => mod.kind === ts.SyntaxKind.PrivateKeyword).length > 0;
                }).length > 0
            );
        });
        const fullName = this.tc.typeToString(clazzType, undefined, ts.TypeFormatFlags.UseFullyQualifiedType);

        const modifierFlags = ts.getCombinedModifierFlags(node);

        if (modifierFlags & ts.ModifierFlags.Abstract && this.inheritingTypes[fullName]) {
            const oneOf = this.inheritingTypes[fullName].map((typename) => {
                return this.getTypeDefinition(this.symbols[typename]);
            });

            definition.oneOf = oneOf;
        } else {
            const propertyDefinitions = props.reduce((all, prop) => {
                const propertyName = prop.getName();
                const propDef = this.getDefinitionForProperty(prop, node);
                if (propDef != null) {
                    all[propertyName] = propDef;
                } else {
                    props = props.filter((itm) => itm.getName() !== propertyName);
                }
                return all;
            }, {});

            if (definition.type === undefined) {
                definition.type = "object";
            }

            if (definition.type === "object" && Object.keys(propertyDefinitions).length > 0) {
                definition.properties = propertyDefinitions;
            }

            if (!this.args.ignoreRequired) {
                const requiredProps = props.reduce((required: string[], prop: ts.Symbol) => {
                    const def = {};
                    this.parseCommentsIntoDefinition(prop, def, {});
                    if (
                        !(prop.flags & ts.SymbolFlags.Optional) &&
                        !(prop.flags & ts.SymbolFlags.Method) &&
                        !(<any>prop).mayBeUndefined &&
                        !def.hasOwnProperty("ignore")
                    ) {
                        required.push(prop.getName());
                    }
                    return required;
                }, []);

                if (requiredProps.length > 0) {
                    definition.required = this.unique(requiredProps).sort();
                }
            }
        }
        return definition;
    }

    /**
     * Gets/generates a globally unique type name for the given type
     */
    protected getTypeName(typ: ts.Type): string {
        const id = (typ as any).id as number;
        if (this.typeNamesById[id]) {
            // Name already assigned?
            return this.typeNamesById[id];
        }
        return this.makeTypeNameUnique(
            typ,
            this.tc
                .typeToString(
                    typ,
                    undefined,
                    ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.UseFullyQualifiedType
                )
                .replace(REGEX_FILE_NAME_OR_SPACE, "")
        );
    }

    protected makeTypeNameUnique(typ: ts.Type, baseName: string): string {
        const id = (typ as any).id as number;

        let name = baseName;
        // If a type with same name exists
        // Try appending "_1", "_2", etc.
        for (let i = 1; this.typeIdsByName[name] !== undefined && this.typeIdsByName[name] !== id; ++i) {
            name = baseName + "_" + i;
        }

        this.typeNamesById[id] = name;
        this.typeIdsByName[name] = id;
        return name;
    }

    protected unique(arr: string[]): string[] {
        const temp = {};
        for (const e of arr) {
            temp[e] = true;
        }
        const r: string[] = [];
        for (const k in temp) {
            // Avoid bugs when hasOwnProperty is shadowed
            if (Object.prototype.hasOwnProperty.call(temp, k)) {
                r.push(k);
            }
        }
        return r;
    }

    protected getTypeDefinition(
        typ: ts.Type,
        asRef = this.args.ref,
        unionModifier = this.args.defaultUnionModifier,
        prop?: ts.Symbol,
        reffedType?: ts.Symbol
    ): Definition {
        const definition: Definition = {}; // real definition

        // Ignore any number of Readonly and Mutable type wrappings, since they only add and remove readonly modifiers on fields and JSON Schema is not concerned with mutability
        while (
            typ.aliasSymbol &&
            (typ.aliasSymbol.escapedName === "Readonly" || typ.aliasSymbol.escapedName === "Mutable") &&
            typ.aliasTypeArguments &&
            typ.aliasTypeArguments[0]
        ) {
            typ = typ.aliasTypeArguments[0];
            reffedType = undefined;
        }

        const isTypeArgument = reffedType && <number>typ.flags === 1049600;
        if (isTypeArgument) {
            asRef = false;
        }

        let returnedDefinition = definition; // returned definition, may be a $ref

        // Parse property comments now to skip recursive if ignore.
        if (prop) {
            const defs: Definition & { [k in MetaDefinitionFields]?: "" } = {};
            const others = {};
            this.parseCommentsIntoDefinition(prop, defs, others);
            if (defs.hasOwnProperty("ignore") || defs.hasOwnProperty("type")) {
                return defs;
            }
        }

        const symbol = typ.getSymbol();
        // FIXME: We can't just compare the name of the symbol - it ignores the namespace
        const isRawType =
            !symbol ||
            // Window is incorrectly marked as rawType here for some reason
            (this.tc.getFullyQualifiedName(symbol) !== "Window" &&
                (this.tc.getFullyQualifiedName(symbol) === "Date" ||
                    symbol.name === "integer" ||
                    this.tc.getIndexInfoOfType(typ, ts.IndexKind.Number) !== undefined));

        // special case: an union where all child are string literals -> make an enum instead
        let isStringEnum = false;
        if (typ.flags & ts.TypeFlags.Union) {
            const unionType = <ts.UnionType>typ;
            isStringEnum = unionType.types.every((propType) => {
                return (propType.getFlags() & ts.TypeFlags.StringLiteral) !== 0;
            });
        }

        // aliased types must be handled slightly different
        const asTypeAliasRef = asRef && reffedType && isStringEnum;
        if (!asTypeAliasRef) {
            if (
                isRawType ||
                (typ.getFlags() & ts.TypeFlags.Object && (<ts.ObjectType>typ).objectFlags & ts.ObjectFlags.Anonymous)
            ) {
                asRef = false; // raw types and inline types cannot be reffed,
                // unless we are handling a type alias
                // or it is recursive type - see below
            }
        }

        if (typ.aliasTypeArguments?.length) {
            asRef = false;
        }

        let fullTypeName = "";
        if (asTypeAliasRef) {
            const typeName = this.tc
                .getFullyQualifiedName(
                    reffedType!.getFlags() & ts.SymbolFlags.Alias ? this.tc.getAliasedSymbol(reffedType!) : reffedType!
                )
                .replace(REGEX_FILE_NAME_OR_SPACE, "");
            if (this.args.uniqueNames && reffedType) {
                const sourceFile = this.getSourceFile(reffedType);
                const relativePath = path.relative(process.cwd(), sourceFile.fileName);
                fullTypeName = `${typeName}.${this.generateHashOfNode(
                    this.getCanonicalDeclaration(reffedType!),
                    relativePath
                )}`;
            } else {
                fullTypeName = this.makeTypeNameUnique(typ, typeName);
            }
        } else {
            // typ.symbol can be undefined
            if (this.args.uniqueNames && typ.symbol) {
                const sym = typ.symbol;
                const sourceFile = this.getSourceFile(sym);
                const relativePath = path.relative(process.cwd(), sourceFile.fileName);
                fullTypeName = `${this.getTypeName(typ)}.${this.generateHashOfNode(
                    this.getCanonicalDeclaration(sym),
                    relativePath
                )}`;
            } else if (reffedType && this.schemaOverrides.has(reffedType.escapedName as string)) {
                fullTypeName = reffedType.escapedName as string;
            } else {
                fullTypeName = this.getTypeName(typ);
            }
        }

        // Handle recursive types
        if (!isRawType || !!typ.aliasSymbol) {
            if (this.recursiveTypeRef.has(fullTypeName)) {
                asRef = true;
            } else {
                this.recursiveTypeRef.set(fullTypeName, definition);
                if (
                    this.args.ref &&
                    (!reffedType?.escapedName || reffedType.escapedName !== "__type") &&
                    !typ.aliasTypeArguments &&
                    !isTypeArgument &&
                    // some fullTypeNames are type-arguments and aren't actually names!
                    /^[0-9A-Za-z._]+$/.exec(fullTypeName)
                ) {
                    asRef = true;
                }
            }
        }

        if (asRef) {
            // We don't return the full definition, but we put it into
            // reffedDefinitions below.
            returnedDefinition = {
                $ref: this.refPath + fullTypeName,
            };
        }

        // Parse comments
        const otherAnnotations = {};
        this.parseCommentsIntoDefinition(reffedType!, definition, otherAnnotations); // handle comments in the type alias declaration
        this.parseCommentsIntoDefinition(symbol!, definition, otherAnnotations);
        this.parseCommentsIntoDefinition(typ.aliasSymbol!, definition, otherAnnotations);
        if (prop) {
            this.parseCommentsIntoDefinition(prop, returnedDefinition, otherAnnotations);
        }

        // Create the actual definition only if is an inline definition, or
        // if it will be a $ref and it is not yet created
        if (!asRef || !this.reffedDefinitions[fullTypeName]) {
            if (asRef) {
                // must be here to prevent recursivity problems
                let reffedDefinition: Definition;
                if (asTypeAliasRef && reffedType && typ.symbol !== reffedType && symbol) {
                    reffedDefinition = this.getTypeDefinition(typ, true, undefined, symbol, symbol);
                } else {
                    reffedDefinition = definition;
                }
                this.reffedDefinitions[fullTypeName] = reffedDefinition;
                if (this.args.titles && fullTypeName) {
                    definition.title = fullTypeName;
                }
            }
            const node = symbol?.getDeclarations() !== undefined ? symbol.getDeclarations()![0] : null;
            // Supports checking for members in remapped types like { [K in keyof X]: X[K] }
            const members = "members" in typ ? <ts.SymbolTable>typ.members : symbol?.members;
            // console.log("getTypeDefinition");
            // console.log(definition);
            if (definition.type === undefined) {
                // if users override the type, do not try to infer it
                if (typ.flags & ts.TypeFlags.Union) {
                    this.getUnionDefinition(typ as ts.UnionType, prop!, unionModifier, definition);
                } else if (typ.flags & ts.TypeFlags.Intersection) {
                    this.getIntersectionDefinition(typ as ts.IntersectionType, definition);
                } else if (isRawType) {
                    this.getDefinitionForRootType(typ, reffedType!, definition);
                } else if (
                    node &&
                    (node.kind === ts.SyntaxKind.EnumDeclaration || node.kind === ts.SyntaxKind.EnumMember)
                ) {
                    this.getEnumDefinition(typ, definition);
                } else if (symbol && symbol.flags & ts.SymbolFlags.TypeLiteral && members && members.size === 0) {
                    // {} is TypeLiteral with no members. Need special case because it doesn't have declarations.
                    definition.type = "object";
                    definition.properties = {};

                    // Check if it is a mapped type (eg Record<keyType, valueType>)
                    // type.indexInfos contains schemas for keys and values of mapped types
                    const indexInfo = ("indexInfos" in typ ? (typ.indexInfos as ts.IndexInfo[]) : []).at(0);
                    if (node && node.kind === ts.SyntaxKind.MappedType && indexInfo) {
                        definition.additionalProperties = this.getTypeDefinition(
                            indexInfo.type,
                            asRef,
                            unionModifier,
                            prop,
                            reffedType
                        );
                    }
                } else {
                    this.getClassDefinition(typ, definition);
                }
            }
        }

        if (this.recursiveTypeRef.get(fullTypeName) === definition) {
            this.recursiveTypeRef.delete(fullTypeName);
            // If the type was recursive (there is reffedDefinitions) - lets replace it to reference
            if (this.reffedDefinitions[fullTypeName]) {
                const annotations = Object.entries(returnedDefinition).reduce((acc, [key, value]) => {
                    if (refKeywords[key] && typeof value !== undefined) {
                        acc[key] = value;
                    }
                    return acc;
                }, {});

                returnedDefinition = {
                    $ref: this.refPath + fullTypeName,
                    ...annotations,
                };
            }
        }

        if (this.args.schemaProcessor) {
            returnedDefinition = this.args.schemaProcessor(returnedDefinition);
        }
        return returnedDefinition;
    }
}
