import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createCanonicalGraph,
  createTypeHierarchy,
  exportArchiMateExchange,
  importArchiMateExchange,
  parseDocument,
  validateArchiMateRules
} from "../src/index";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const profilePath = path.join(repoRoot, "examples", "archimate", "archimate-basic-profile.itm");

async function loadProfile(): Promise<string> {
  return readFile(profilePath, "utf8");
}

test("createTypeHierarchy expands ArchiMate abstract types to their concrete descendants", async () => {
  const profile = parseDocument(await loadProfile(), { strict: true });
  const hierarchy = createTypeHierarchy(profile);

  assert.ok((hierarchy.entityDescendantsByName.get("archimate::Element") ?? []).includes("archimate::BusinessActor"));
  assert.ok((hierarchy.entityAncestorsByName.get("archimate::ApplicationService") ?? []).includes("archimate::BehaviorElement"));
  assert.ok((hierarchy.relationshipDescendantsByName.get("archimate::Relationship") ?? []).includes("archimate::serving"));
});

test("ArchiMate runtime validates relationships and round-trips exchange XML", async () => {
  const source = `${await loadProfile()}\n
%metadata
{
  title: Example ArchiMate ITM model
  defaultNamespace: local
}

%namespace local https://example.org/local-model

&customer [archimate::BusinessActor] Customer
&order_process [archimate::BusinessProcess] Order handling
&billing_app [archimate::ApplicationComponent] Billing Application
  @archimate::realization:local::invoice_service
  {
    id: rel_billing_app_realizes_invoice_service
  }
&invoice_service [archimate::ApplicationService] Invoice Service
  @archimate::serving:local::order_process
  {
    id: rel_invoice_service_serves_order_process
  }`;

  const document = parseDocument(source, { strict: true });
  const diagnostics = validateArchiMateRules(document);
  const errors = diagnostics.filter((diagnostic) => diagnostic.severity === "error");
  const graph = createCanonicalGraph(document);
  const xml = exportArchiMateExchange(document);
  const imported = importArchiMateExchange(xml, { defaultNamespace: "imported" });

  assert.equal(errors.length, 0);
  assert.equal(graph.nodes.length, 4);
  assert.equal(graph.edges.length, 2);
  assert.match(xml, /<element identifier="customer" xsi:type="BusinessActor">/u);
  assert.match(xml, /<relationship identifier="rel_invoice_service_serves_order_process" xsi:type="Serving"/u);
  assert.equal(imported.entities.length, 4);
  assert.equal(imported.relationships.length, 2);
  assert.equal(imported.entities[0]?.typeRef, "archimate::BusinessActor");
  assert.equal(imported.relationships[1]?.typeRef, "archimate::serving");
});

test("validateArchiMateRules flags invalid assignment direction and access attributes", async () => {
  const source = `${await loadProfile()}\n
%metadata
{
  defaultNamespace: local
}

%namespace local https://example.org/local-model

&process [archimate::BusinessProcess] Process
  @archimate::assignment:local::actor
  {
    id: rel_invalid_assignment
  }
  @archimate::access:local::object
  {
    id: rel_invalid_access
    accessType: delete
  }
&actor [archimate::BusinessActor] Actor
&object [archimate::BusinessObject] Object`;

  const diagnostics = validateArchiMateRules(parseDocument(source, { strict: true }));
  const messages = diagnostics.map((diagnostic) => diagnostic.message);

  assert.ok(messages.some((message) => message.includes("Assignment direction")));
  assert.ok(messages.some((message) => message.includes("Access relationships may only use accessType values")));
});

test("validateArchiMateRules rejects invalid realization pairs via the runtime matrix", async () => {
  const source = `${await loadProfile()}\n
%metadata
{
  defaultNamespace: local
}

%namespace local https://example.org/local-model

&actor [archimate::BusinessActor] Actor
  @archimate::realization:local::object
  {
    id: rel_invalid_realization
  }
&object [archimate::BusinessObject] Object`;

  const diagnostics = validateArchiMateRules(parseDocument(source, { strict: true }));

  assert.ok(
    diagnostics.some(
      (diagnostic) =>
        diagnostic.code === "archimate.rules.validateRelationshipAllowed"
        && diagnostic.message.includes("archimate::realization")
    )
  );
});