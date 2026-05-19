import test from "node:test";
import assert from "node:assert/strict";

import { parseDocument } from "../src/index";

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
  const document = parseDocument("&source Source @missing", { strict: false });
  const messages = (document.diagnostics ?? []).map((diagnostic) => diagnostic.message);

  assert.equal(document.entities.length, 1);
  assert.equal(document.relationships.length, 1);
  assert.ok(messages.some((message) => message.includes("Unresolved relationship target")));
});