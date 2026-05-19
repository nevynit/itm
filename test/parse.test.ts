import test from "node:test";
import assert from "node:assert/strict";

import { ItmDiagnosticError, parseDocument, parseDocumentResult } from "../src/index";

test("parseDocument handles entities, directives, explicit links, and implicit relationships", () => {
  const source = `%metadata
{
  title: Order model
  defaultNamespace: local
  defaultRelationshipType: related_to
}
%namespace local https://example.org/local
%entitytype Task
{
  requiredAttributes:
    - owner
}
%rule tasks_need_owner
{
  select: "[Task]"
  pipeline:
    - requireAttribute: owner
  severity: error
}
&order [Task] Order #core @creates:invoice
| Represents the customer order.
{
  owner: operations
  status: draft
}
  &invoice [Task] Invoice
  @paid_by:payment
&payment Payment
%style [Task]
{
  fill: "#e8f1ff"
}
%viewpoint dependency_graph
{
  pipeline:
    - select: "[Task]"
    - includeEdges: "@creates:*"
    - render: svg
}
`;

  const document = parseDocument(source, { strict: true });

  assert.equal(document.metadata?.title, "Order model");
  assert.equal(document.entities.length, 3);
  assert.equal(document.entityTypes?.length, 1);
  assert.equal(document.validationRules?.length, 1);
  assert.equal(document.styles?.length, 1);
  assert.equal(document.viewpoints?.length, 1);

  const order = document.entities[0];
  const invoice = document.entities[1];
  const payment = document.entities[2];

  assert.equal(order.qualifiedId, "local::order");
  assert.equal(order.typeRef, "Task");
  assert.deepEqual(order.tags, ["core"]);
  assert.equal(order.description?.text, "Represents the customer order.");
  assert.equal(order.attributes?.values.owner, "operations");
  assert.equal(invoice.parentId, order.uid);

  const explicitRelationships = document.relationships.filter((relationship) => relationship.relationshipKind === "explicit");
  assert.equal(explicitRelationships.length, 2);
  assert.equal(explicitRelationships[0].targetRef, "local::invoice");
  assert.equal(explicitRelationships[1].targetRef, "local::payment");

  const containmentRelationships = document.relationships.filter((relationship) => relationship.relationshipKind === "containment");
  assert.equal(containmentRelationships.length, 1);
  assert.equal(containmentRelationships[0].sourceId, order.uid);
  assert.equal(containmentRelationships[0].targetId, invoice.uid);

  const orderingRelationships = document.relationships.filter((relationship) => relationship.relationshipKind === "ordering");
  assert.equal(orderingRelationships.length, 1);
  assert.equal(orderingRelationships[0].sourceId, order.uid);
  assert.equal(orderingRelationships[0].targetId, payment.uid);

  assert.equal(document.diagnostics?.length ?? 0, 0);
});

test("parseDocument reports unresolved targets", () => {
  const result = parseDocumentResult("&source Source @missing", { strict: false });
  const messages = result.diagnostics.map((diagnostic) => diagnostic.message);

  assert.equal(result.value.entities.length, 1);
  assert.equal(result.value.relationships.length, 1);
  assert.ok(messages.some((message) => message.includes("Unresolved relationship target")));
});

test("parseDocument throws when error diagnostics are emitted", () => {
  assert.throws(
    () => parseDocument("&source Source @missing", { strict: true }),
    (error: unknown) => {
      assert.ok(error instanceof ItmDiagnosticError);
      assert.ok(error.diagnostics.some((diagnostic) => diagnostic.severity === "error"));
      assert.ok(error.diagnostics.some((diagnostic) => diagnostic.message.includes("Unresolved relationship target")));
      return true;
    }
  );
});

test("parseDocument reports malformed entity ids", () => {
  const emptyId = parseDocumentResult("& Root", { strict: true });
  const startDigit = parseDocumentResult("&123bad Root", { strict: true });
  const invalidCharacter = parseDocumentResult("&bad.id Root", { strict: true });

  assert.ok(emptyId.diagnostics.some((diagnostic) => diagnostic.message.includes("Ampersand id marker has no identifier.")));
  assert.ok(startDigit.diagnostics.some((diagnostic) => diagnostic.message.includes("Entity id starts with a digit.")));
  assert.ok(invalidCharacter.diagnostics.some((diagnostic) => diagnostic.message.includes("Entity id contains invalid characters.")));
});

test("parseDocument materializes overlays, view deltas, and viewpoint parameters", () => {
  const source = `%metadata
{
  defaultNamespace: local
  intendedRenderingModes:
    - svg
    - html
}
%viewpoint dependency_graph
{
  parameters:
    includeDraft:
      type: boolean
      default: false
}
%view current_dependency_graph
{
  viewpoint: dependency_graph
  deltas:
    hidden:
      - node: local::service
    moved:
      - node: local::service
        dx: 10
        dy: -5
    notes:
      - Layout reviewed.
    generatedAssets:
      - path: generated/dependency-graph.svg
}
&local::service !overlay [Task] Service
{
  status: active
}
`;

  const document = parseDocument(source, { strict: true });

  assert.deepEqual(document.metadata?.intendedRenderingModes, ["svg", "html"]);
  assert.equal(document.viewpoints?.[0]?.parameters?.[0]?.name, "includeDraft");
  assert.equal(document.viewpoints?.[0]?.parameters?.[0]?.defaultValue, false);
  assert.equal(document.views?.[0]?.deltas?.length, 2);
  assert.equal(document.views?.[0]?.notes?.[0], "Layout reviewed.");
  assert.equal(document.views?.[0]?.generatedAssets?.[0]?.kind, "svg");
  assert.equal(document.overlays?.[0]?.targetRef, "local::service");
  assert.equal(document.overlays?.[0]?.replacementTypeRef, "Task");
  assert.equal(document.overlays?.[0]?.attributePatches?.[0]?.key, "status");
  assert.equal(document.diagnostics?.length ?? 0, 0);
});

test("parseDocument preserves advanced type metadata needed by profiles", () => {
  const source = `%entitytype archimate::Element
{
  abstract: true
  extends:
    - "archimate::Concept"
  exportType: Element
  layer: generic
}
%relationshiptype archimate::serving
{
  extends:
    - "archimate::DependencyRelationship"
  sourceTypes:
    - "archimate::BehaviorElement"
  targetTypes:
    - "archimate::ActiveStructureElement"
  exchangeSerializable: true
}`;

  const document = parseDocument(source, { strict: true });

  assert.deepEqual(document.entityTypes?.[0]?.superTypeRefs, ["archimate::Concept"]);
  assert.equal(document.entityTypes?.[0]?.attributes?.values.abstract, true);
  assert.equal(document.entityTypes?.[0]?.attributes?.values.exportType, "Element");
  assert.equal(document.relationshipTypes?.[0]?.superTypeRefs?.[0], "archimate::DependencyRelationship");
  assert.equal(document.relationshipTypes?.[0]?.attributes?.values.exchangeSerializable, true);
});