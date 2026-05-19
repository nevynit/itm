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
	createLocalFileIncludeProvider,
	parseDocument
} from "@textforge/itm";

const parsed = parseDocument(sourceText, {
	uri: "C:/models/order-to-cash.itm"
});

const composed = await composeDocument(parsed, {
	includeProviders: [createLocalFileIncludeProvider()]
});
```

Current parser coverage includes:

- entities, ids, tags, types, indentation, and generated containment or ordering links;
- inline and block relationships;
- Markdown descriptions;
- inline and block attributes;
- metadata, namespaces, includes, plugin requirements, styles, rules, views, and viewpoints.

Advanced directives are preserved in the directive list even when downstream semantic execution is not implemented yet.
