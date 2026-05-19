import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  composeDocument,
  composeText,
  createBaseUrlIncludeProvider,
  createLocalFileIncludeProvider,
  parseDocument
} from "../src/index";

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
    ["Included file cannot be resolved: 'shared:profiles/security-baseline.itm'."]
  );
  assert.ok(composedMain.views?.some((view) => view.name === "current_order_to_cash_end_to_end" && (view.deltas?.length ?? 0) > 0));

  const overlayModel = parseDocument(await readWorkspaceFile("examples/complete/overlays/production-hardening-overlay.itm"), {
    strict: true,
    uri: path.join(repoRoot, "examples/complete/overlays/production-hardening-overlay.itm")
  });
  const composedOverlay = await composeDocument(overlayModel, { includeProviders: [provider] });

  assert.deepEqual(
    composedOverlay.diagnostics?.map((diagnostic) => diagnostic.message) ?? [],
    ["Included file cannot be resolved: 'shared:profiles/security-baseline.itm'."]
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
    ["Included file cannot be resolved: 'shared:profiles/security-baseline.itm'."]
  );
  assert.equal(composedVisual.entities.find((entity) => entity.qualifiedId === "local::order_bpmn_after_visual_edit_record")?.attributes?.values.viewName, "order_bpmn_after_visual_edit");
  assert.ok(composedVisual.relationships.some((relationship) => relationship.id === "rel_patch_payment_position_view" && relationship.targetRef === "local::order_bpmn_after_visual_edit_record"));
});