# Programmatic Creation Library Examples

This directory collects larger end-to-end examples for the programmatic creation APIs exposed by `@textforge/itm`.

Each scenario includes:

- a TypeScript snippet that creates or mutates an ITM document;
- the exact serialized ITM text that `serializeDocument()` is expected to emit;
- a checked-in `.itm` file beside this README so the example output can be reused in tests or other tooling.

## Files

| File | Purpose |
|---|---|
| `helpers-basic-model.itm` | Low-level object creation with `createDocument()`, `createEntity()`, `createRelationship()`, and `createAttributeBag()`. |
| `builder-order-flow.itm` | Builder-driven graph authoring from scratch, including derived qualified ids, containment, attributes, descriptions, and explicit relationships. |
| `builder-mutated-order-flow.itm` | Loading an existing ITM document with `ItmDocumentBuilder.fromDocument()` and then renaming, moving, and rewiring entities. |
| `builder-views-and-overlay.itm` | Programmatic viewpoint, view, generated asset, delta, and overlay creation. |
| `builder-governance-starter.itm` | Programmatic creation of namespaces, repositories, includes, plugin requirements, types, styles, validation rules, packages, and usage directives. |

## 1. Low-level factories

Use the factory helpers when you already know the exact serializable shape you want to produce and do not need builder-side derived mutations.

```ts
import {
	createAttributeBag,
	createDocument,
	createEntity,
	createRelationship,
	serializeDocument
} from "@textforge/itm";

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

const text = serializeDocument(document);
```

Expected output in `helpers-basic-model.itm`:

```itm
%metadata
{
  title: Helper-built integration model
  defaultNamespace: local
}

&local::system [Application] System @depends_on:local::queue
{
  owner: platform
}
  &local::billing_component [Component] Billing component
&local::queue [MessageQueue] Queue
```

## 2. Builder graph authoring from scratch

Use `ItmDocumentBuilder` when you want the library to derive normalized state such as `qualifiedId`, roots, parent-child links, and relationship back-references.

```ts
import { ItmDocumentBuilder, serializeDocument } from "@textforge/itm";

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

const text = serializeDocument(builder.toDocument());
```

Expected output in `builder-order-flow.itm`:

```itm
%metadata
{
  title: Programmatic order model
  defaultNamespace: local
}

&local::order [Task] Order @creates:local::invoice
{
  owner: operations
  priority: high
}
  &local::invoice [Task] Invoice
  | Collects billing data.
  {
    status: draft
  }
```

## 3. Mutating an existing parsed document

The builder can also normalize and mutate documents that started as ITM text.

```ts
import {
	ItmDocumentBuilder,
	parseDocument,
	serializeDocument
} from "@textforge/itm";

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

const text = serializeDocument(builder.toDocument());
```

Expected output in `builder-mutated-order-flow.itm`:

```itm
%metadata
{
  defaultNamespace: local
}

&local::order Order @settles:local::bill
  &local::bill Bill
  &local::payment Payment
```

## 4. Views, deltas, generated assets, and overlays

The builder covers the authoring surfaces that go beyond the entity graph, including viewpoints, views, and overlays.

```ts
import { ItmDocumentBuilder, serializeDocument } from "@textforge/itm";

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

const text = serializeDocument(builder.toDocument());
```

Expected output in `builder-views-and-overlay.itm`:

```itm
%metadata
{
  defaultNamespace: local
}

%viewpoint dependency_graph
{
  title: Dependency graph
  description: Focus on dependencies.
  parameters:
    includeDraft:
      type: boolean
      default: false
  pipeline:
    - select: "[Application]"
    - includeEdges: "@depends_on:*"
  supportsVisualEditing: true
}
%view current_dependency_graph
{
  viewpoint: dependency_graph
  parameters:
    includeDraft: true
  deltas:
    hidden:
      - node: local::dependency
    moved:
      - node: local::service
        dx: 10
        dy: -5
  notes:
    - Layout reviewed.
	generatedAssets:
		- kind: svg
			path: generated/dependency-graph.svg
}

&local::service [Application] Service
&local::dependency Dependency

&local::service !overlay [Application] Service hardened
| Visual hardening overlay.
{
  status: active
}
@depends_on:local::dependency
{
  id: rel_service_dependency
  rationale: runtime-coupling
}
```

## 5. Top-level directives, definitions, and package usage

The same builder can assemble the top-level document sections that appear in the larger complete examples.

```ts
import { ItmDocumentBuilder, serializeDocument } from "@textforge/itm";

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

const text = serializeDocument(builder.toDocument());
```

Expected output in `builder-governance-starter.itm`:

```itm
%metadata
{
  title: Governance starter
  defaultNamespace: local
}

%namespace local https://example.org/local

%repository shared https://example.test/repository

%include shared:base.itm

%require renderer ^1.0.0

%entitytype Task
{
  description: A unit of work.
  requiredAttributes:
    - owner
  optionalAttributes:
    - status
}

%relationshiptype depends_on
{
  description: Depends on relationship.
  sourceTypes:
    - Task
  targetTypes:
    - Task
  inverseType: required_by
}

%style [Task]
{
  fill: "#e8f1ff"
  stroke: "#1d4ed8"
}

%rule tasks_need_owner
{
  select: "[Task]"
  pipeline:
    - validate: requireAttribute:owner
  severity: error
  message: Tasks must have an owner.
}

%package core-governance
{
  description: Shared governance package.
}

%using core-governance

&local::roadmap [Task] Roadmap item
{
  owner: architecture
  status: draft
}
```

## Notes

- The exact expected outputs are validated in the test suite so that serializer changes surface quickly.
- Builder references can be passed as uids, local ids, or qualified ids, which is why the snippets intentionally mix forms such as `order.uid` and `local::invoice`.
- If you need to author full ITM corpora in code, the builder examples in this directory are the nearest programmatic equivalent to the longer hand-written `.itm` examples under `examples/complete`.