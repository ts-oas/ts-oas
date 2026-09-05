#!/usr/bin/env node

import { execSync } from "child_process";
import process from "process";

import fs from "fs";

const ALL_VERSIONS = [
    "4.7.4",
    "4.8.4",
    "4.9.5",
    "5.0.4",
    "5.1.6",
    "5.2.2",
    "5.3.3",
    "5.4.5",
    "5.5.4",
    "5.6.3",
    "5.7.3",
    "5.8.3",
    "5.9.3",
    "6.0.3"
];

const pkg = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf-8"));
const DEFAULT_DEV_VERSION = pkg.devDependencies?.typescript || "~6.0.3";

function restoreTypeScript() {
    console.log(`\n[matrix] Restoring dev typescript version (${DEFAULT_DEV_VERSION})...`);
    try {
        execSync(`npm install --no-save --no-audit typescript@${DEFAULT_DEV_VERSION}`, {
            stdio: "ignore",
            shell: true
        });
        console.log(`[matrix] Successfully restored typescript@${DEFAULT_DEV_VERSION}`);
    } catch (err) {
        console.error(`[matrix] Warning: Failed to restore typescript@${DEFAULT_DEV_VERSION}:`, err.message);
    }
}

// Ensure restore runs on exit or interruption
let restored = false;
function cleanup() {
    if (!restored) {
        restored = true;
        restoreTypeScript();
    }
}

process.on("SIGINT", () => {
    cleanup();
    process.exit(130);
});

process.on("SIGTERM", () => {
    cleanup();
    process.exit(143);
});

async function run() {
    const args = process.argv.slice(2);
    const targetVersions = args.length > 0 ? args : ALL_VERSIONS;

    console.log(`=======================================================`);
    console.log(` ts-oas TypeScript Version Matrix Test Runner`);
    console.log(` Target versions (${targetVersions.length}): ${targetVersions.join(", ")}`);
    console.log(`=======================================================\n`);

    const results = [];

    for (const version of targetVersions) {
        console.log(`-------------------------------------------------------`);
        console.log(`[matrix] Testing with TypeScript v${version}...`);
        console.log(`-------------------------------------------------------`);

        try {
            console.log(`[matrix] Installing typescript@${version}...`);
            execSync(`npm install --no-save --no-audit typescript@${version}`, {
                stdio: "ignore",
                shell: true
            });

            console.log(`[matrix] Running test suite with typescript@${version}...`);
            execSync(`npm test`, {
                stdio: "inherit",
                shell: true
            });

            console.log(`\x1b[32m[matrix] PASS: TypeScript v${version}\x1b[0m\n`);
            results.push({ version, status: "PASS" });
        } catch (err) {
            console.error(`\x1b[31m[matrix] FAIL: TypeScript v${version}\x1b[0m\n`);
            results.push({ version, status: "FAIL", error: err.message });
            // If running a single version, fail early
            if (args.length > 0) {
                break;
            }
        }
    }

    cleanup();

    console.log(`\n=======================================================`);
    console.log(` Matrix Test Summary:`);
    console.log(`=======================================================`);
    let hasFailure = false;
    for (const r of results) {
        const badge = r.status === "PASS" ? "\x1b[32mPASS\x1b[0m" : "\x1b[31mFAIL\x1b[0m";
        console.log(`  - TypeScript v${r.version.padEnd(8)}: ${badge}`);
        if (r.status === "FAIL") hasFailure = true;
    }
    console.log(`=======================================================\n`);

    if (hasFailure) {
        process.exit(1);
    }
}

run().catch((err) => {
    cleanup();
    console.error("[matrix] Unexpected error:", err);
    process.exit(1);
});
