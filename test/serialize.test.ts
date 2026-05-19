import test from "node:test";
import assert from "node:assert/strict";

import {
	ItmDiagnosticError,
	createDocument,
	createEntity,
	createRelationship,
	parseDocument,
	serializeDocument,
	serializeDocumentResult
} from "../src/index";

test("serializeDocument round-trips supported ITM structures", () => {
	const source = `%metadata
{
  defaultNamespace: local
  title: Order model
}
%namespace local https://example.org/local
%viewpoint dependency_graph
{
  parameters:
    includeDraft:
      type: boolean
      default: false
  pipeline:
    - select: "[Task]"
}
%view current_dependency_graph
{
  viewpoint: dependency_graph
  deltas:
    hidden:
      - node: local::invoice
}
&order [Task] Order #core @creates:invoice
| Represents the customer order.
{
  owner: operations
}
  &invoice [Task] Invoice
&local::order !overlay [Task] Order hardened
{
  status: active
}
`;

	const original = parseDocument(source, { strict: true });
	const serialized = serializeDocument(original);
	const reparsed = parseDocument(serialized, { strict: true });

	assert.equal(reparsed.metadata?.title, "Order model");
	assert.equal(reparsed.entities.length, 2);
	assert.equal(reparsed.entities[0].attributes?.values.owner, "operations");
	assert.equal(reparsed.viewpoints?.[0]?.parameters?.[0]?.name, "includeDraft");
	assert.equal(reparsed.views?.[0]?.deltas?.[0]?.kind, "hidden");
	assert.equal(reparsed.overlays?.[0]?.targetRef, "local::order");
	assert.equal(reparsed.overlays?.[0]?.attributePatches?.[0]?.key, "status");
});

test("serializeDocumentResult collects diagnostics without throwing", () => {
	const document = createDocument({
		entities: [
			createEntity({
				uid: "entity:source",
				label: "Source"
			})
		],
		relationships: [
			createRelationship({
				uid: "relationship:broken",
				sourceId: "entity:source",
				typeRef: "depends_on",
				relationshipKind: "explicit"
			})
		]
	});

	const result = serializeDocumentResult(document);

	assert.ok(result.diagnostics.some((diagnostic) => diagnostic.severity === "error"));
	assert.ok(result.diagnostics.some((diagnostic) => diagnostic.message.includes("missing a target")));
});

test("serializeDocument throws when error diagnostics are emitted", () => {
	const document = createDocument({
		entities: [
			createEntity({
				uid: "entity:source",
				label: "Source"
			})
		],
		relationships: [
			createRelationship({
				uid: "relationship:broken",
				sourceId: "entity:source",
				typeRef: "depends_on",
				relationshipKind: "explicit"
			})
		]
	});

	assert.throws(
		() => serializeDocument(document),
		(error: unknown) => {
			assert.ok(error instanceof ItmDiagnosticError);
			assert.ok(error.diagnostics.some((diagnostic) => diagnostic.message.includes("missing a target")));
			return true;
		}
	);
});