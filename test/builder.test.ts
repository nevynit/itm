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

test("ItmDocumentBuilder creates viewpoints, views, and overlays that round-trip", () => {
	const builder = new ItmDocumentBuilder({
		metadata: {
			defaultNamespace: "local"
		}
	});

	const service = builder.addEntity({
		id: "service",
		label: "Service",
		typeRef: "Application"
	});

	const dependency = builder.addEntity({
		id: "dependency",
		label: "Dependency"
	});

	builder.addViewpoint({
		name: "dependency_graph",
		title: "Dependency graph",
		description: "Focus on dependencies.",
		pipeline: [
			{ operation: "select", arguments: { value: "[Application]" } },
			{ operation: "includeEdges", arguments: { value: "@depends_on:*" } }
		],
		parameters: [
			{
				name: "includeDraft",
				type: "boolean",
				defaultValue: false
			}
		],
		supportsVisualEditing: true
	});

	builder.addView({
		name: "current_dependency_graph",
		viewpoint: "dependency_graph",
		parameters: {
			includeDraft: true
		},
		deltas: [
			{
				kind: "hidden",
				targetKind: "entity",
				targetRef: "local::dependency",
				hidden: true
			},
			{
				kind: "moved",
				targetKind: "entity",
				targetRef: "local::service",
				dx: 10,
				dy: -5
			}
		],
		notes: ["Layout reviewed."],
		generatedAssets: [
			{
				kind: "svg",
				path: "generated/dependency-graph.svg"
			}
		]
	});

	builder.addOverlay({
		target: service.uid,
		replacementLabel: "Service hardened",
		replacementTypeRef: "Application",
		attributes: {
			status: "active"
		},
		description: "Visual hardening overlay.",
		relationshipAdditions: [
			{
				source: service.uid,
				target: dependency.uid,
				typeRef: "depends_on",
				attributes: {
					id: "rel_service_dependency"
				}
			}
		]
	});

	const document = builder.toDocument();
	const builtService = document.entities.find((entity) => entity.uid === service.uid);
	const serialized = serializeDocument(document);
	const reparsed = parseDocument(serialized, { strict: true });

	assert.equal(document.viewpoints?.[0]?.name, "dependency_graph");
	assert.equal(document.viewpoints?.[0]?.parameters?.[0]?.name, "includeDraft");
	assert.equal(document.views?.[0]?.viewpointRef, "dependency_graph");
	assert.equal(document.views?.[0]?.generatedAssets?.[0]?.path, "generated/dependency-graph.svg");
	assert.equal(document.overlays?.[0]?.targetRef, "local::service");
	assert.equal(document.overlays?.[0]?.relationshipAdditions?.[0]?.targetRef, "local::dependency");
	assert.ok(builtService?.overlayIds?.includes(document.overlays?.[0]!.uid));

	assert.equal(reparsed.viewpoints?.[0]?.supportsVisualEditing, true);
	assert.equal(reparsed.views?.[0]?.parameters?.includeDraft, true);
	assert.equal(reparsed.views?.[0]?.deltas?.length, 2);
	assert.equal(reparsed.overlays?.[0]?.descriptionPatch?.text, "Visual hardening overlay.");
	assert.equal(reparsed.overlays?.[0]?.attributePatches?.[0]?.key, "status");
	assert.equal(reparsed.overlays?.[0]?.relationshipAdditions?.[0]?.id, "rel_service_dependency");
});

test("ItmDocumentBuilder updates and removes viewpoints, views, and overlays", () => {
	const initial = parseDocument(
		[
			"%metadata",
			"{",
			"  defaultNamespace: local",
			"}",
			"%viewpoint dependency_graph",
			"{",
			"  pipeline:",
			"    - select: \"[Application]\"",
			"}",
			"%view current_dependency_graph",
			"{",
			"  viewpoint: dependency_graph",
			"}",
			"&service Service",
			"&dependency Dependency",
			"&local::service !overlay Service",
			"{",
			"  status: draft",
			"}"
		].join("\n"),
		{ strict: true }
	);

	const builder = ItmDocumentBuilder.fromDocument(initial);

	builder.updateViewpoint("dependency_graph", {
		title: "Dependency graph",
		parameters: [
			{
				name: "includeDraft",
				type: "boolean",
				defaultValue: true
			}
		],
		pipeline: [
			{ operation: "select", arguments: { value: "[Service]" } },
			{ operation: "render", arguments: { value: "svg" } }
		],
		supportsVisualEditing: true
	});

	builder.updateView("current_dependency_graph", {
		title: "Current dependency graph",
		parameters: {
			includeDraft: false
		},
		deltas: [
			{
				kind: "label-override",
				targetKind: "entity",
				targetRef: "local::service",
				label: "Service (current)"
			}
		]
	});

	builder.updateOverlay("local::service", {
		replacementLabel: "Service current",
		attributes: {
			status: "active"
		},
		relationshipAdditions: [
			{
				source: "local::service",
				target: "local::dependency",
				typeRef: "depends_on"
			}
		]
	});

	builder.removeView("current_dependency_graph");
	builder.addView({
		name: "current_dependency_graph",
		viewpoint: "dependency_graph",
		deltas: [
			{
				kind: "hidden",
				targetKind: "entity",
				targetRef: "local::dependency",
				hidden: true
			}
		]
	});
	builder.removeOverlay("local::service");
	builder.addOverlay({
		target: "local::service",
		replacementLabel: "Service final",
		attributes: {
			status: "active"
		}
	});

	const document = builder.toDocument();

	assert.equal(document.viewpoints?.[0]?.title, "Dependency graph");
	assert.equal(document.viewpoints?.[0]?.pipeline.steps[1]?.operation, "render");
	assert.equal(document.views?.[0]?.deltas?.[0]?.kind, "hidden");
	assert.equal(document.overlays?.[0]?.replacementLabel, "Service final");
	assert.equal(document.overlays?.[0]?.attributePatches?.[0]?.value, "active");

	const reparsed = parseDocument(serializeDocument(document), { strict: true });

	assert.equal(reparsed.viewpoints?.[0]?.parameters?.[0]?.defaultValue, true);
	assert.equal(reparsed.views?.[0]?.deltas?.[0]?.kind, "hidden");
	assert.equal(reparsed.overlays?.[0]?.replacementLabel, "Service final");
	assert.equal(reparsed.overlays?.[0]?.attributePatches?.[0]?.value, "active");
});

test("ItmDocumentBuilder creates top-level types, styles, rules, and dependency directives", () => {
	const builder = new ItmDocumentBuilder();

	builder.upsertNamespace({
		prefix: "local",
		uri: "https://example.org/local"
	});

	builder.addRepository({
		name: "shared",
		location: "https://example.test/repository"
	});
	builder.addInclude({
		target: "shared:base.itm"
	});
	builder.addPluginRequirement({
		name: "renderer",
		versionRange: "^1.0.0"
	});
	builder.addEntityType({
		name: "Task",
		description: "A unit of work.",
		requiredAttributes: ["owner"],
		optionalAttributes: ["status"]
	});
	builder.addRelationshipType({
		name: "depends_on",
		description: "Depends on relationship.",
		sourceTypeRefs: ["Task"],
		targetTypeRefs: ["Task"],
		inverseTypeRef: "required_by"
	});
	builder.addStyleRule({
		selector: "[Task]",
		style: {
			fill: "#e8f1ff"
		}
	});
	builder.addValidationRule({
		name: "tasks_need_owner",
		selector: "[Task]",
		pipeline: [
			{ operation: "validate", arguments: { value: "requireAttribute:owner" } }
		],
		severity: "error",
		message: "Tasks must have an owner."
	});
	builder.addPackage({
		name: "core-governance",
		description: "Shared governance package."
	});
	builder.addPackageUsage({
		packageRef: "core-governance"
	});

	const document = builder.toDocument();
	const reparsed = parseDocument(serializeDocument(document), { strict: true });

	assert.equal(document.repositories?.[0]?.name, "shared");
	assert.equal(document.includes?.[0]?.target, "shared:base.itm");
	assert.equal(document.pluginRequirements?.[0]?.versionRange, "^1.0.0");
	assert.equal(document.entityTypes?.[0]?.requiredAttributes?.[0], "owner");
	assert.equal(document.relationshipTypes?.[0]?.inverseTypeRef, "required_by");
	assert.equal(document.styles?.[0]?.selector.raw, "[Task]");
	assert.equal(document.validationRules?.[0]?.message, "Tasks must have an owner.");
	assert.equal(document.packages?.[0]?.description, "Shared governance package.");
	assert.equal(document.packageUsages?.[0]?.packageRef, "core-governance");

	assert.equal(reparsed.namespaces?.[0]?.prefix, "local");
	assert.equal(reparsed.repositories?.[0]?.location, "https://example.test/repository");
	assert.equal(reparsed.includes?.[0]?.target, "shared:base.itm");
	assert.equal(reparsed.pluginRequirements?.[0]?.name, "renderer");
	assert.equal(reparsed.entityTypes?.[0]?.name, "Task");
	assert.equal(reparsed.relationshipTypes?.[0]?.inverseTypeRef, "required_by");
	assert.equal(reparsed.styles?.[0]?.style.values.fill, "#e8f1ff");
	assert.equal(reparsed.validationRules?.[0]?.severity, "error");
	assert.equal(reparsed.packages?.[0]?.description, "Shared governance package.");
	assert.equal(reparsed.packageUsages?.[0]?.scope, "all");
});

test("ItmDocumentBuilder updates and removes top-level definitions", () => {
	const initial = parseDocument(
		[
			"%namespace local https://example.org/local",
			"%repository shared https://example.test/repository",
			"%include shared:base.itm",
			"%require renderer ^1.0.0",
			"%entitytype Task",
			"{",
			"  requiredAttributes:",
			"    - owner",
			"}",
			"%relationshiptype depends_on",
			"{",
			"  sourceTypes:",
			"    - Task",
			"}",
			"%style [Task]",
			"{",
			"  fill: \"#e8f1ff\"",
			"}",
			"%rule tasks_need_owner",
			"{",
			"  select: \"[Task]\"",
			"  pipeline:",
			"    - validate: requireAttribute:owner",
			"  severity: error",
			"}",
			"%package core-governance",
			"{",
			"  description: Shared governance package.",
			"}",
			"%using core-governance"
		].join("\n"),
		{ strict: true }
	);

	const builder = ItmDocumentBuilder.fromDocument(initial);

	builder.upsertNamespace({
		prefix: "shared",
		uri: "https://example.org/shared"
	});
	builder.updateRepository("shared", {
		location: "https://example.test/updated-repository"
	});
	builder.removeInclude("shared:base.itm");
	builder.addInclude({
		target: "shared:updated-base.itm"
	});
	builder.updatePluginRequirement("renderer", {
		versionRange: "^2.0.0"
	});
	builder.updateEntityType("Task", {
		description: "Tracked task.",
		optionalAttributes: ["status"]
	});
	builder.updateRelationshipType("depends_on", {
		targetTypeRefs: ["Task"],
		inverseTypeRef: "required_by"
	});
	builder.updateStyleRule("[Task]", {
		style: {
			fill: "#ffffff",
			stroke: "#0f172a"
		}
	});
	builder.updateValidationRule("tasks_need_owner", {
		message: "Owner is required.",
		enabled: false
	});
	builder.updatePackage("core-governance", {
		description: "Updated governance package."
	});
	builder.removePackageUsage("core-governance");
	builder.addPackageUsage({
		packageRef: "core-governance"
	});

	const document = builder.toDocument();
	const reparsed = parseDocument(serializeDocument(document), { strict: true });

	assert.equal(document.namespaces?.length, 2);
	assert.equal(document.repositories?.[0]?.location, "https://example.test/updated-repository");
	assert.equal(document.includes?.[0]?.target, "shared:updated-base.itm");
	assert.equal(document.pluginRequirements?.[0]?.versionRange, "^2.0.0");
	assert.equal(document.entityTypes?.[0]?.description, "Tracked task.");
	assert.equal(document.relationshipTypes?.[0]?.inverseTypeRef, "required_by");
	assert.equal(document.styles?.[0]?.style.values.stroke, "#0f172a");
	assert.equal(document.validationRules?.[0]?.enabled, false);
	assert.equal(document.packages?.[0]?.description, "Updated governance package.");
	assert.equal(document.packageUsages?.length, 1);

	assert.equal(reparsed.namespaces?.[1]?.prefix, "shared");
	assert.equal(reparsed.includes?.[0]?.target, "shared:updated-base.itm");
	assert.equal(reparsed.pluginRequirements?.[0]?.versionRange, "^2.0.0");
	assert.equal(reparsed.entityTypes?.[0]?.optionalAttributes?.[0], "status");
	assert.equal(reparsed.relationshipTypes?.[0]?.targetTypeRefs?.[0], "Task");
	assert.equal(reparsed.styles?.[0]?.style.values.stroke, "#0f172a");
	assert.equal(reparsed.validationRules?.[0]?.enabled, false);
	assert.equal(reparsed.packages?.[0]?.description, "Updated governance package.");
	assert.equal(reparsed.packageUsages?.[0]?.packageRef, "core-governance");
});