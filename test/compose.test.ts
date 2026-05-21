import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  composeDocument,
  composeText,
  createBaseUrlIncludeProvider,
  parseDocument,
  parseDocumentResultAsync,
  parseEffectiveDocument
} from "../src/index";
import { createFileSystemSourceProvider, createLocalFileIncludeProvider } from "../src/node";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function readWorkspaceFile(relativePath: string): Promise<string> {
  return readFile(path.join(repoRoot, relativePath), "utf8");
}

test("composeText resolves includes through providers and applies overlays", async () => {
  const document = await composeText(
    `%metadata
{
  defaultNamespace: local
}
%repository shared https://example.test/repository
%include shared:base.itm
&local::service !overlay
{
  status: active
}
@depends_on:local::dependency
{
  id: rel_service_dependency
}
`,
    {
      includeProviders: [
        createBaseUrlIncludeProvider("https://unused.example/base/", {
          fetchText: async (url) => {
            assert.equal(url, "https://example.test/repository/base.itm");

            return `%metadata
{
  defaultNamespace: local
}
&local::service Service
&local::dependency Dependency
`;
          }
        })
      ]
    }
  );

  assert.equal(document.includes?.[0]?.status, "resolved");
  assert.equal(document.diagnostics?.length ?? 0, 0);
  assert.equal(document.entities.find((entity) => entity.qualifiedId === "local::service")?.attributes?.values.status, "active");
  assert.ok(document.relationships.some((relationship) => relationship.id === "rel_service_dependency" && relationship.targetRef === "local::dependency"));
});

test("complete examples compose cleanly with the local file provider", async () => {
  const provider = createLocalFileIncludeProvider();

  const mainModel = parseDocument(await readWorkspaceFile("examples/complete/models/order-to-cash-digital-thread.itm"), {
    strict: true,
    uri: path.join(repoRoot, "examples/complete/models/order-to-cash-digital-thread.itm")
  });
  const composedMain = await composeDocument(mainModel, { includeProviders: [provider] });

  assert.deepEqual(
    composedMain.diagnostics?.map((diagnostic) => diagnostic.message) ?? [],
    ["Include 'shared:profiles/security-baseline.itm' could not be resolved."]
  );
  assert.ok(composedMain.views?.some((view) => view.name === "current_order_to_cash_end_to_end" && (view.deltas?.length ?? 0) > 0));

  const overlayModel = parseDocument(await readWorkspaceFile("examples/complete/overlays/production-hardening-overlay.itm"), {
    strict: true,
    uri: path.join(repoRoot, "examples/complete/overlays/production-hardening-overlay.itm")
  });
  const composedOverlay = await composeDocument(overlayModel, { includeProviders: [provider] });

  assert.deepEqual(
    composedOverlay.diagnostics?.map((diagnostic) => diagnostic.message) ?? [],
    ["Include 'shared:profiles/security-baseline.itm' could not be resolved."]
  );
  assert.equal(composedOverlay.entities.find((entity) => entity.qualifiedId === "local::payment_service")?.attributes?.values.resilienceTier, "tier-1");
  assert.ok(composedOverlay.relationships.some((relationship) => relationship.id === "rel_payment_service_depends_secondary_provider"));

  const visualModel = parseDocument(await readWorkspaceFile("examples/complete/visual-edits/visual-editing-writeback-example.itm"), {
    strict: true,
    uri: path.join(repoRoot, "examples/complete/visual-edits/visual-editing-writeback-example.itm")
  });
  const composedVisual = await composeDocument(visualModel, { includeProviders: [provider] });

  assert.deepEqual(
    composedVisual.diagnostics?.map((diagnostic) => diagnostic.message) ?? [],
    ["Include 'shared:profiles/security-baseline.itm' could not be resolved."]
  );
  assert.equal(composedVisual.entities.find((entity) => entity.qualifiedId === "local::order_bpmn_after_visual_edit_record")?.attributes?.values.viewName, "order_bpmn_after_visual_edit");
  assert.ok(composedVisual.relationships.some((relationship) => relationship.id === "rel_patch_payment_position_view" && relationship.targetRef === "local::order_bpmn_after_visual_edit_record"));
});

test("parseEffectiveDocument resolves relative and transitive includes through a source provider", async () => {
  const documents = new Map<string, string>([
    ["memory:/models/root.itm", `%metadata
{
  defaultNamespace: local
}
%include ./shared/common.itm
&root Root`],
    ["memory:/models/shared/common.itm", `%metadata
{
  defaultNamespace: local
}
%include ./leaf.itm
&common Common`],
    ["memory:/models/shared/leaf.itm", `%metadata
{
  defaultNamespace: local
}
&leaf Leaf`]
  ]);

  const result = await parseEffectiveDocument(documents.get("memory:/models/root.itm")!, {
    uri: "memory:/models/root.itm",
    sourceProvider: {
      read(request) {
        const uri = new URL(request.target, request.fromUri).toString();
        const text = documents.get(uri);
        return text ? { uri, text } : undefined;
      }
    }
  });

  assert.deepEqual(result.diagnostics, []);
  assert.ok(result.value.entities.some((entity) => entity.qualifiedId === "local::common"));
  assert.ok(result.value.entities.some((entity) => entity.qualifiedId === "local::leaf"));
  assert.equal(
    result.value.entities.find((entity) => entity.qualifiedId === "local::leaf")?.sourceRange?.file,
    "memory:/models/shared/leaf.itm"
  );
});

test("parseDocumentResultAsync reports missing, circular, duplicate-id, depth, and provider runtime diagnostics", async () => {
  const missing = await parseDocumentResultAsync("%include ./missing.itm\n&root Root", {
    uri: "memory:/root.itm",
    sourceProvider: {
      read() {
        return undefined;
      }
    }
  });
  assert.ok(missing.diagnostics.some((diagnostic) => diagnostic.message.includes("could not be resolved")));

  const circularDocs = new Map<string, string>([
    ["memory:/root.itm", "%include ./common.itm\n&root Root"],
    ["memory:/common.itm", "%include ./root.itm\n&common Common"]
  ]);
  const circular = await parseDocumentResultAsync(circularDocs.get("memory:/root.itm")!, {
    uri: "memory:/root.itm",
    sourceProvider: {
      read(request) {
        const uri = new URL(request.target, request.fromUri).toString();
        const text = circularDocs.get(uri);
        return text ? { uri, text } : undefined;
      }
    }
  });
  assert.ok(circular.diagnostics.some((diagnostic) => diagnostic.message.includes("Circular include")));
  assert.ok(circular.diagnostics.some((diagnostic) => diagnostic.includeStack?.length));

  const duplicate = await parseDocumentResultAsync("%include ./dup.itm\n&root Root", {
    uri: "memory:/root.itm",
    sourceProvider: {
      read() {
        return {
          uri: "memory:/dup.itm",
          text: "&root Duplicate"
        };
      }
    }
  });
  assert.ok(duplicate.diagnostics.some((diagnostic) => diagnostic.message.includes("Duplicate entity id 'root'")));

  const depthDocs = new Map<string, string>([
    ["memory:/root.itm", "%include ./a.itm\n&root Root"],
    ["memory:/a.itm", "%include ./b.itm\n&a A"],
    ["memory:/b.itm", "&b B"]
  ]);
  const depth = await parseDocumentResultAsync(depthDocs.get("memory:/root.itm")!, {
    uri: "memory:/root.itm",
    maxIncludeDepth: 1,
    sourceProvider: {
      read(request) {
        const uri = new URL(request.target, request.fromUri).toString();
        const text = depthDocs.get(uri);
        return text ? { uri, text } : undefined;
      }
    }
  });
  assert.ok(depth.diagnostics.some((diagnostic) => diagnostic.message.includes("Include depth exceeded")));

  const providerError = await parseDocumentResultAsync("%include ./boom.itm\n&root Root", {
    uri: "memory:/root.itm",
    sourceProvider: {
      read() {
        throw new Error("provider exploded");
      }
    }
  });
  assert.ok(providerError.diagnostics.some((diagnostic) => diagnostic.message.includes("source provider raised an error")));
  assert.ok(providerError.diagnostics.some((diagnostic) => diagnostic.code === "provider exploded"));
});

test("file system source provider blocks traversal outside rootDir", async () => {
  const provider = createFileSystemSourceProvider({
    rootDir: path.join(repoRoot, "examples", "complete")
  });

  const blocked = await provider.read({
    include: { target: "../failures/itm_failure_modes_corpus_combined.md", status: "unresolved" },
    sourceDocument: {
      format: "itm",
      modelVersion: "1.0.0",
      uri: path.join(repoRoot, "examples", "complete", "models", "order-to-cash-digital-thread.itm"),
      entities: [],
      relationships: []
    },
    fromUri: path.join(repoRoot, "examples", "complete", "models", "order-to-cash-digital-thread.itm"),
    rawTarget: "../failures/itm_failure_modes_corpus_combined.md",
    target: "../failures/itm_failure_modes_corpus_combined.md",
    includeStack: []
  });

  assert.equal(blocked, undefined);
});
