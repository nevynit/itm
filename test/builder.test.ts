import test from "node:test";
import assert from "node:assert/strict";

import {
	ItmDocumentBuilder,
	parseDocument,
	serializeDocument
} from "../src/index";

test("ItmDocumentBuilder creates documents with derived containment and references", () => {
	const builder = new ItmDocumentBuilder({
		metadata: {
			defaultNamespace: "local",
			title: "Programmatic model"
		}
	});

	const order = builder.addEntity({
		id: "order",
		label: "Order",
		typeRef: "Task",
		attributes: {
			owner: "operations"
		}
	});

	const invoice = builder.addEntity({
		id: "invoice",
		label: "Invoice",
		parent: order.uid
	});

	builder.addRelationship({
		source: order.uid,
		target: invoice.uid,
		typeRef: "creates"
	});

	const document = builder.toDocument();
	const builtOrder = document.entities.find((entity) => entity.uid === order.uid);
	const builtInvoice = document.entities.find((entity) => entity.uid === invoice.uid);
	const serialized = serializeDocument(document);
	const reparsed = parseDocument(serialized, { strict: true });

	assert.equal(document.metadata?.title, "Programmatic model");
	assert.deepEqual(document.roots, [order.uid]);
	assert.equal(builtInvoice?.parentId, order.uid);
	assert.ok(builtOrder?.childIds?.includes(invoice.uid));
	assert.ok(
		document.relationships.some(
			(relationship) =>
				relationship.relationshipKind === "explicit" &&
				relationship.sourceId === order.uid &&
				relationship.targetId === invoice.uid &&
				relationship.typeRef === "creates"
		)
	);
	assert.ok(
		document.relationships.some(
			(relationship) =>
				relationship.relationshipKind === "containment" &&
				relationship.sourceId === order.uid &&
				relationship.targetId === invoice.uid
		)
	);
	assert.equal(reparsed.entities[0]?.qualifiedId, "local::order");
	assert.equal(reparsed.entities[1]?.qualifiedId, "local::invoice");
	assert.equal(reparsed.entities[0]?.attributes?.values.owner, "operations");
});

test("ItmDocumentBuilder mutates existing documents without leaking stale links", () => {
	const initial = parseDocument(
		[
			"%metadata",
			"{",
			"  defaultNamespace: local",
			"}",
			"&order Order",
			"  &invoice Invoice",
			"&payment Payment"
		].join("\n"),
		{ strict: true }
	);

	const builder = ItmDocumentBuilder.fromDocument(initial);
	const payment = builder.findEntity("local::payment");

	assert.ok(payment);

	builder.moveEntity(payment!.uid, { parent: "local::order" });
	builder.renameEntity("local::invoice", { id: "bill", label: "Bill" });
	builder.removeRelationship((relationship) => relationship.relationshipKind === "ordering");
	builder.addRelationship({
		source: "local::order",
		target: "local::bill",
		typeRef: "settles"
	});

	const document = builder.toDocument();
	const order = builder.findEntity("local::order");
	const bill = builder.findEntity("local::bill");
	const movedPayment = builder.findEntity("local::payment");

	assert.deepEqual(document.roots, [order?.uid]);
	assert.equal(bill?.parentId, order?.uid);
	assert.equal(movedPayment?.parentId, order?.uid);
	assert.ok(order?.childIds?.includes(bill!.uid));
	assert.ok(order?.childIds?.includes(movedPayment!.uid));
	assert.ok(
		document.relationships.some(
			(relationship) =>
				relationship.relationshipKind === "explicit" &&
				relationship.typeRef === "settles" &&
				relationship.targetId === bill?.uid
		)
	);
	assert.equal(document.entities.find((entity) => entity.qualifiedId === "local::invoice"), undefined);

	const reparsed = parseDocument(serializeDocument(document), { strict: true });

	assert.equal(reparsed.entities.find((entity) => entity.qualifiedId === "local::bill")?.label, "Bill");
	assert.equal(reparsed.entities.find((entity) => entity.qualifiedId === "local::payment")?.parentId, reparsed.entities[0]?.uid);
	assert.ok(reparsed.relationships.some((relationship) => relationship.typeRef === "settles" && relationship.targetRef === "local::bill"));
});