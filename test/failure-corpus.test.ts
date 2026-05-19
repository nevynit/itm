import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { composeDocument, createLocalFileIncludeProvider, parseDocumentResult } from "../src/index";

interface ExpectedDiagnostic {
  severity: string;
  messageContains: string;
}

interface ExpectedCase {
  file: string;
  expectedDiagnosticCount: number;
  diagnostics?: ExpectedDiagnostic[];
}

interface ExpectedCorpus {
  cases: ExpectedCase[];
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failuresRoot = path.join(repoRoot, "examples", "failures");

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...await walk(full));
    } else if (entry.isFile() && full.endsWith(".itm")) {
      files.push(full);
    }
  }

  return files;
}

test("failure corpus matches the current implementation baseline", async () => {
  const manifest = JSON.parse(
    await readFile(path.join(failuresRoot, "expected", "expected-current-implementation.json"), "utf8")
  ) as ExpectedCorpus;
  const expectedByFile = new Map(manifest.cases.map((entry) => [entry.file, entry]));
  const files = await walk(path.join(failuresRoot, "cases"));
  const provider = createLocalFileIncludeProvider();

  for (const file of files) {
    const relativePath = path.relative(failuresRoot, file).replace(/\\/g, "/");
    const source = await readFile(file, "utf8");
    const parsed = parseDocumentResult(source, { strict: true, uri: file }).value;
    const composed = await composeDocument(parsed, { includeProviders: [provider] });
    const actualDiagnostics = composed.diagnostics ?? [];
    const expected = expectedByFile.get(relativePath) ?? {
      file: relativePath,
      expectedDiagnosticCount: 0,
      diagnostics: []
    };

    assert.equal(
      actualDiagnostics.length,
      expected.expectedDiagnosticCount,
      `Unexpected diagnostic count for ${relativePath}`
    );

    for (const expectedDiagnostic of expected.diagnostics ?? []) {
      assert.ok(
        actualDiagnostics.some(
          (diagnostic) => diagnostic.severity === expectedDiagnostic.severity && diagnostic.message.includes(expectedDiagnostic.messageContains)
        ),
        `Missing diagnostic for ${relativePath}: ${expectedDiagnostic.severity} ${expectedDiagnostic.messageContains}`
      );
    }
  }
});