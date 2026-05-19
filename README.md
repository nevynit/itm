# ITM

Indented Text Model is a Markdown-inspired format for semantic models and views.

This repository now contains the source for the npm package `@textforge/itm`, designed for TypeScript and JavaScript environments on Node.js and in the browser.

## Package goals

- publish a dual ESM/CJS package for reuse in other repositories;
- define the canonical serializable ITM document types;
- expose an opt-in resolved/runtime layer with indexes and object references;
- provide small utilities that help consumers traverse ITM documents.

## Install

```bash
npm install @textforge/itm
```

## Build

```bash
npm install
npm run build
```

## Public API

The package exposes two complementary layers:

- `Itm*` interfaces describe the serializable document model.
- `ResolvedItm*` interfaces and `resolveDocument()` provide runtime indexes and object references.
- `ItmDocumentBuilder` provides a stateful programmatic authoring surface for creating and mutating ITM documents without touching the serialized text.
- `composeDocument()` and `composeText()` provide an opt-in second stage for resolving `%include` directives and applying overlays through caller-provided include providers.
- factory helpers such as `createDocument()`, `createEntity()`, and `createRelationship()` help consumers build valid objects with consistent defaults.
- `parseDocument()` and `parseItm()` parse ITM text into the serializable model.
- `serializeDocument()` and `serializeItm()` serialize the supported ITM model back to text.
- `parseDocumentResult()` and `serializeDocumentResult()` collect diagnostics without throwing; the default parse and serialize entry points throw `ItmDiagnosticError` when any diagnostic has severity `error`.

Example:

```ts
import { resolveDocument, type ItmDocument } from "@textforge/itm";

const document: ItmDocument = {
	format: "itm",
	modelVersion: "1.0.0",
	entities: [
		{
			uid: "entity:system",
			kind: "entity",
			label: "System"
		}
	],
	relationships: []
};

const resolved = resolveDocument(document);
```

Helper example:

```ts
import { createDocument, createEntity, createRelationship } from "@textforge/itm";

const system = createEntity({
	uid: "entity:system",
	label: "System"
});

const component = createEntity({
	uid: "entity:component",
	label: "Component",
	parentId: system.uid
});

const document = createDocument({
	entities: [system, component],
	relationships: [
		createRelationship({
			uid: "rel:contains",
			sourceId: system.uid,
			targetId: component.uid,
			typeRef: "contains",
			relationshipKind: "containment",
			implicit: true
		})
	]
});
```

Programmatic authoring example:

```ts
import { ItmDocumentBuilder, serializeDocument } from "@textforge/itm";

const builder = new ItmDocumentBuilder({
	metadata: {
		defaultNamespace: "local",
		title: "Order to cash"
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

builder.addEntity({
	id: "invoice",
	label: "Invoice",
	parent: order.uid
});

builder.addRelationship({
	source: order.uid,
	target: "local::invoice",
	typeRef: "creates"
});

const document = builder.toDocument();
const text = serializeDocument(document);
```

Builder workflow from another repository:

```ts
import {
	ItmDocumentBuilder,
	serializeDocument,
	type ItmDocument,
	type ItmEntityDraft,
	type ItmViewpointDraft
} from "@textforge/itm";

const entityDraft: ItmEntityDraft = {
	id: "payment_service",
	label: "Payment service",
	typeRef: "Application"
};

const viewpointDraft: ItmViewpointDraft = {
	name: "dependency_graph",
	pipeline: [{ operation: "select", arguments: { value: "[Application]" } }]
};

const builder = new ItmDocumentBuilder({
	metadata: {
		defaultNamespace: "local"
	}
});

builder.addEntity(entityDraft);
builder.addViewpoint(viewpointDraft);

const document: ItmDocument = builder.toDocument();
const text = serializeDocument(document);
```

Builder interface map:

- Graph authoring: `addEntity()`, `renameEntity()`, `moveEntity()`, `removeEntity()`, `addRelationship()`, `updateRelationship()`, `removeRelationship()`.
- View authoring: `addViewpoint()`, `updateViewpoint()`, `removeViewpoint()`, `addView()`, `updateView()`, `removeView()`, `addOverlay()`, `updateOverlay()`, `removeOverlay()`.
- Top-level directives and definitions: `upsertNamespace()`, `addRepository()`, `addInclude()`, `addPluginRequirement()`, `addEntityType()`, `addRelationshipType()`, `addStyleRule()`, `addValidationRule()`, `addPackage()`, `addPackageUsage()` and matching `update*` or `remove*` methods where applicable.

Reference rules:

- Builder methods that take object references generally accept a uid, a local id, or a qualified id.
- If `metadata.defaultNamespace` is set, drafts with `id` automatically get a derived `qualifiedId` such as `local::payment_service`.
- `toDocument()` returns the serializable `ItmDocument`; `serializeDocument()` converts that normalized document back to ITM text.

`ItmDocumentBuilder` normalizes the same derived structure that parsed documents already expose, including `qualifiedId`, `roots`, parent and child links, incoming and outgoing relationship references, and implicit containment and ordering relationships. Existing documents can be loaded with `ItmDocumentBuilder.fromDocument(document)` and then updated with methods such as `renameEntity()`, `moveEntity()`, `addRelationship()`, and `removeEntity()`.

The builder also exposes first-class authoring methods for document sections beyond the entity graph, including `addViewpoint()`, `updateViewpoint()`, `addView()`, `updateView()`, `addOverlay()`, and `updateOverlay()`. Those methods preserve the parser and serializer contract for viewpoint pipelines and parameters, view deltas and generated assets, and overlay attribute or relationship additions.

The same builder surface now covers the remaining top-level serializable sections as well: entity and relationship types, style rules, validation rules, repositories, includes, plugin requirements, packages, and package usage directives. That makes it possible to assemble an ITM document programmatically from scratch without dropping down to hand-built raw object literals for those sections.

For a larger set of checked programmatic authoring examples, see `examples/complete/programmatic/README.md` and the companion `.itm` outputs in that directory.

Parser example:

```ts
import { parseDocument } from "@textforge/itm";

const document = parseDocument(`
%metadata
{
	title: Example
	defaultNamespace: local
}

&order Order @creates:invoice
	&invoice Invoice
`);
```

Composition example:

```ts
import {
	composeDocument,
	parseDocument
} from "@textforge/itm";
import { createLocalFileIncludeProvider } from "@textforge/itm/node";

const parsed = parseDocument(sourceText, {
	uri: "C:/models/order-to-cash.itm"
});

const composed = await composeDocument(parsed, {
	includeProviders: [createLocalFileIncludeProvider()]
});
```

Browser note:

- `@textforge/itm` is the browser-safe main entry for parsing, resolving, serializing, composing with URL-based include providers, and programmatic document building.
- `@textforge/itm/node` exposes the Node-only local file include provider. Import that subpath only in Node-based tools, CLIs, or servers.

Current parser coverage includes:

- entities, ids, tags, types, indentation, and generated containment or ordering links;
- inline and block relationships;
- Markdown descriptions;
- inline and block attributes;
- metadata, namespaces, includes, plugin requirements, styles, rules, views, and viewpoints.

Advanced directives are preserved in the directive list even when downstream semantic execution is not implemented yet.
