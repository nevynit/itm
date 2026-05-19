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
