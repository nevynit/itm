import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
	ItmDocumentBuilder,
	createAttributeBag,
	createDocument,
	createEntity,
	createRelationship,
	parseDocument,
	serializeDocument
} from "../src/index";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function readWorkspaceFile(relativePath: string): Promise<string> {
	return readFile(path.join(repoRoot, relativePath), "utf8");
}

function normalizeLineEndings(text: string): string {
	return text.replace(/\r\n/g, "\n");
}

test("factory example matches checked-in output", async () => {
	const system = createEntity({
		uid: "entity:system",
		id: "system",
		qualifiedId: "local::system",
		namespacePrefix: "local",
		localId: "system",
		label: "System",
		typeRef: "Application",
		attributes: createAttributeBag({
			owner: "platform"
		})
	});

	const component = createEntity({
		uid: "entity:billing_component",
		id: "billing_component",
		qualifiedId: "local::billing_component",
		namespacePrefix: "local",
		localId: "billing_component",
		label: "Billing component",
		typeRef: "Component",
		parentId: system.uid
	});

	const queue = createEntity({
		uid: "entity:queue",
		id: "queue",
		qualifiedId: "local::queue",
		namespacePrefix: "local",
		localId: "queue",
		label: "Queue",
		typeRef: "MessageQueue"
	});

	const document = createDocument({
		metadata: {
			title: "Helper-built integration model",
			defaultNamespace: "local"
		},
		entities: [system, component, queue],
		relationships: [
			createRelationship({
				uid: "relationship:depends_on_queue",
				sourceId: system.uid,
				targetId: queue.uid,
				typeRef: "depends_on",
				relationshipKind: "explicit"
			})
		]
	});

	const expected = normalizeLineEndings(await readWorkspaceFile("examples/complete/programmatic/helpers-basic-model.itm"));
	const serialized = serializeDocument(document);

	assert.equal(serialized, expected);
	assert.equal(parseDocument(serialized, { strict: true }).entities.length, 3);
});

test("builder graph example matches checked-in output", async () => {
	const builder = new ItmDocumentBuilder({
		metadata: {
			title: "Programmatic order model",
			defaultNamespace: "local"
		}
	});

	const order = builder.addEntity({
		id: "order",
		label: "Order",
		typeRef: "Task",
		attributes: {
			owner: "operations",
			priority: "high"
		}
	});

	builder.addEntity({
		id: "invoice",
		label: "Invoice",
		typeRef: "Task",
		parent: order.uid,
		description: "Collects billing data.",
		attributes: {
			status: "draft"
		}
	});

	builder.addRelationship({
		source: order.uid,
		target: "local::invoice",
		typeRef: "creates"
	});

	const expected = normalizeLineEndings(await readWorkspaceFile("examples/complete/programmatic/builder-order-flow.itm"));
	const serialized = serializeDocument(builder.toDocument());

	assert.equal(serialized, expected);
	assert.equal(parseDocument(serialized, { strict: true }).entities[0]?.qualifiedId, "local::order");
});

test("builder mutation example matches checked-in output", async () => {
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

	builder.moveEntity("local::payment", { parent: "local::order" });
	builder.renameEntity("local::invoice", { id: "bill", label: "Bill" });
	builder.removeRelationship((relationship) => relationship.relationshipKind === "ordering");
	builder.addRelationship({
		source: "local::order",
		target: "local::bill",
		typeRef: "settles"
	});

	const expected = normalizeLineEndings(await readWorkspaceFile("examples/complete/programmatic/builder-mutated-order-flow.itm"));
	const serialized = serializeDocument(builder.toDocument());

	assert.equal(serialized, expected);
	assert.equal(parseDocument(serialized, { strict: true }).entities[1]?.qualifiedId, "local::bill");
});

test("builder view and overlay example matches checked-in output", async () => {
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
		generatedAssets: [
			{
				kind: "svg",
				path: "generated/dependency-graph.svg"
			}
		],
		notes: ["Layout reviewed."]
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
					id: "rel_service_dependency",
					rationale: "runtime-coupling"
				}
			}
		]
	});

	const expected = normalizeLineEndings(await readWorkspaceFile("examples/complete/programmatic/builder-views-and-overlay.itm"));
	const serialized = serializeDocument(builder.toDocument());

	assert.equal(serialized, expected);
	assert.equal(parseDocument(serialized, { strict: true }).overlays?.[0]?.targetRef, "local::service");
});

test("builder top-level directives example matches checked-in output", async () => {
	const builder = new ItmDocumentBuilder({
		metadata: {
			title: "Governance starter",
			defaultNamespace: "local"
		}
	});

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
			fill: "#e8f1ff",
			stroke: "#1d4ed8"
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
	builder.addEntity({
		id: "roadmap",
		label: "Roadmap item",
		typeRef: "Task",
		attributes: {
			owner: "architecture",
			status: "draft"
		}
	});

	const expected = normalizeLineEndings(await readWorkspaceFile("examples/complete/programmatic/builder-governance-starter.itm"));
	const serialized = serializeDocument(builder.toDocument());

	assert.equal(serialized, expected);
	assert.equal(parseDocument(serialized, { strict: true }).validationRules?.[0]?.name, "tasks_need_owner");
});