import { stringify as stringifyYaml } from "yaml";

import { throwOnErrorDiagnostics, type ItmProcessingResult } from "./diagnostics";
import type {
	ItmAttributeBag,
	ItmAttributePatch,
	ItmDiagnostic,
	ItmDocument,
	ItmEntity,
	ItmGeneratedAsset,
	ItmMetadata,
	ItmPipeline,
	ItmRelationship,
	ItmSourceRange,
	ItmValue,
	ItmView,
	ItmViewDelta,
	ItmViewpointParameter
} from "./model";

export interface SerializeItmOptions {
	lineEnding?: "lf" | "crlf";
}

function pushDiagnostic(
	diagnostics: ItmDiagnostic[],
	severity: ItmDiagnostic["severity"],
	message: string,
	range?: ItmSourceRange,
	entityUid?: string,
	relationshipUid?: string
): void {
	diagnostics.push({
		uid: `diagnostic:serializer:${diagnostics.length + 1}`,
		source: "itm.serializer",
		severity,
		message,
		...(range ? { range } : {}),
		...(entityUid ? { entityUid } : {}),
		...(relationshipUid ? { relationshipUid } : {})
	});
}

function sortBySource<T extends { sourceRange?: ItmSourceRange; source?: ItmSourceRange; rank?: number; priority?: number }>(items: readonly T[]): T[] {
	return [...items].sort((left, right) => {
		const leftOrder = left.sourceRange?.startLine ?? left.source?.startLine ?? left.rank ?? left.priority ?? Number.MAX_SAFE_INTEGER;
		const rightOrder = right.sourceRange?.startLine ?? right.source?.startLine ?? right.rank ?? right.priority ?? Number.MAX_SAFE_INTEGER;

		return leftOrder - rightOrder;
	});
}

function toYamlValue(value: ItmValue): unknown {
	if (Array.isArray(value)) {
		return value.map((entry) => toYamlValue(entry));
	}

	if (value && typeof value === "object") {
		const result: Record<string, unknown> = {};

		for (const [key, entry] of Object.entries(value)) {
			result[key] = toYamlValue(entry);
		}

		return result;
	}

	return value;
}

function indentLines(text: string, indentLevel: number): string {
	const prefix = " ".repeat(indentLevel);

	return text
		.split("\n")
		.map((line) => (line.length > 0 ? `${prefix}${line}` : line))
		.join("\n");
}

function formatBlock(value: unknown, indentLevel = 0): string {
	const yaml = stringifyYaml(value, {
		indent: 2,
		lineWidth: 0,
		minContentWidth: 0
	}).trimEnd();

	if (!yaml) {
		return indentLines("{\n}", indentLevel);
	}

	return indentLines(`{\n${indentLines(yaml, 2)}\n}`, indentLevel);
}

function metadataToRecord(metadata: ItmMetadata): Record<string, unknown> {
	const base: Record<string, unknown> = metadata.values
		? Object.fromEntries(Object.entries(metadata.values).map(([key, value]) => [key, toYamlValue(value)]))
		: {};

	for (const [key, value] of Object.entries({
		title: metadata.title,
		version: metadata.version,
		description: metadata.description,
		author: metadata.author,
		owner: metadata.owner,
		defaultNamespace: metadata.defaultNamespace,
		defaultRelationshipType: metadata.defaultRelationshipType,
		defaultLanguageOrProfile: metadata.defaultLanguageOrProfile,
		created: metadata.created,
		updated: metadata.updated,
		intendedRenderingMode: metadata.intendedRenderingMode,
		intendedRenderingModes: metadata.intendedRenderingModes,
		validationMode: metadata.validationMode
	})) {
		if (value !== undefined) {
			base[key] = value;
		}
	}

	return base;
}

function buildEntityIndexes(document: ItmDocument): {
	entitiesByUid: Map<string, ItmEntity>;
	entitiesByRef: Map<string, ItmEntity>;
} {
	const entitiesByUid = new Map<string, ItmEntity>();
	const entitiesByRef = new Map<string, ItmEntity>();

	for (const entity of document.entities) {
		entitiesByUid.set(entity.uid, entity);

		if (entity.qualifiedId) {
			entitiesByRef.set(entity.qualifiedId, entity);
		}

		if (entity.id) {
			entitiesByRef.set(entity.id, entity);
		}
	}

	return { entitiesByUid, entitiesByRef };
}

function formatReference(entity: ItmEntity | undefined): string | undefined {
	return entity?.qualifiedId ?? entity?.id;
}

function formatRelationshipReference(
	relationship: ItmRelationship,
	entitiesByUid: Map<string, ItmEntity>,
	diagnostics: ItmDiagnostic[]
): string | undefined {
	const targetRef = relationship.targetRef ?? (relationship.targetId ? formatReference(entitiesByUid.get(relationship.targetId)) : undefined);

	if (!targetRef) {
		pushDiagnostic(
			diagnostics,
			"error",
			`Relationship '${relationship.uid}' does not have a serializable target reference.`,
			relationship.sourceRange,
			undefined,
			relationship.uid
		);
		return undefined;
	}

	if (relationship.typeRef === "related_to") {
		return `@${targetRef}`;
	}

	return `@${relationship.typeRef}:${targetRef}`;
}

function formatDescriptionLines(text: string, indentLevel: number): string[] {
	return text.split("\n").map((line) => `${" ".repeat(indentLevel)}|${line.length > 0 ? ` ${line}` : ""}`);
}

function formatAttributeBag(attributes: ItmAttributeBag | undefined, indentLevel: number): string[] {
	if (!attributes) {
		return [];
	}

	return [formatBlock(toYamlValue(attributes.values), indentLevel)];
}

function attributesFromPatches(attributePatches: ItmAttributePatch[] | undefined, diagnostics: ItmDiagnostic[], range?: ItmSourceRange): ItmAttributeBag | undefined {
	if (!attributePatches || attributePatches.length === 0) {
		return undefined;
	}

	const values: Record<string, ItmValue> = {};

	for (const patch of attributePatches) {
		if (patch.operation !== "set") {
			pushDiagnostic(diagnostics, "error", `Overlay patch operation '${patch.operation}' is not serializable to ITM text.`, range);
			continue;
		}

		if (patch.value === undefined) {
			pushDiagnostic(diagnostics, "error", `Overlay patch '${patch.key}' is missing a value.`, range);
			continue;
		}

		values[patch.key] = patch.value;
	}

	return Object.keys(values).length > 0 ? { values } : undefined;
}

function pipelineToYaml(pipeline: ItmPipeline): unknown[] {
	return pipeline.steps.map((step) => {
		if (step.operation === "plugin") {
			if (step.provider && Object.keys(step.arguments).length === 0) {
				return step.provider;
			}

			return {
				[step.provider ?? "plugin"]: toYamlValue(step.arguments as ItmValue)
			};
		}

		const keys = Object.keys(step.arguments);

		if (keys.length === 0) {
			return {
				[step.operation]: true
			};
		}

		if (keys.length === 1 && keys[0] === "value") {
			const stepValue = step.arguments.value;

			return {
				[step.operation]: stepValue === undefined ? true : toYamlValue(stepValue)
			};
		}

		return {
			[step.operation]: toYamlValue(step.arguments as ItmValue)
		};
	});
}

function parametersToYaml(parameters: ItmViewpointParameter[] | undefined): Record<string, unknown> | undefined {
	if (!parameters || parameters.length === 0) {
		return undefined;
	}

	const result: Record<string, unknown> = {};

	for (const parameter of parameters) {
		result[parameter.name] = {
			type: parameter.type,
			...(parameter.defaultValue !== undefined ? { default: toYamlValue(parameter.defaultValue) } : {}),
			...(parameter.required !== undefined ? { required: parameter.required } : {}),
			...(parameter.description ? { description: parameter.description } : {}),
			...(parameter.values ? { values: parameter.values.map((value) => toYamlValue(value)) } : {})
		};
	}

	return result;
}

function generatedAssetsToYaml(generatedAssets: ItmGeneratedAsset[] | undefined): unknown[] | undefined {
	if (!generatedAssets || generatedAssets.length === 0) {
		return undefined;
	}

	return generatedAssets.map((asset) => ({
		kind: asset.kind,
		...(asset.path ? { path: asset.path } : {}),
		...(asset.uri ? { uri: asset.uri } : {}),
		...(asset.hash ? { hash: asset.hash } : {}),
		...(asset.contentHash ? { contentHash: asset.contentHash } : {})
	}));
}

function viewDeltasToYaml(deltas: ItmViewDelta[] | undefined, diagnostics: ItmDiagnostic[], view: ItmView): Record<string, unknown> | undefined {
	if (!deltas || deltas.length === 0) {
		return undefined;
	}

	const hidden: unknown[] = [];
	const collapsed: unknown[] = [];
	const expanded: unknown[] = [];
	const moved: unknown[] = [];
	const pinned: unknown[] = [];
	const styleOverrides: unknown[] = [];
	const labelOverrides: unknown[] = [];

	for (const delta of deltas) {
		if (delta.kind === "hidden") {
			hidden.push({
				...(delta.targetKind === "entity" ? { node: delta.targetRef ?? delta.targetUid } : { relationship: delta.targetRef ?? delta.targetUid })
			});
		} else if (delta.kind === "expanded-collapsed") {
			(delta.expanded ? expanded : collapsed).push({
				node: delta.targetRef ?? delta.targetUid
			});
		} else if (delta.kind === "moved") {
			moved.push({
				...(delta.targetKind === "entity" ? { node: delta.targetRef ?? delta.targetUid } : { relationship: delta.targetRef ?? delta.targetUid }),
				...(delta.dx !== undefined ? { dx: delta.dx } : {}),
				...(delta.dy !== undefined ? { dy: delta.dy } : {}),
				...(delta.x !== undefined ? { x: delta.x } : {}),
				...(delta.y !== undefined ? { y: delta.y } : {})
			});
		} else if (delta.kind === "pinned") {
			pinned.push({
				...(delta.targetKind === "entity" ? { node: delta.targetRef ?? delta.targetUid } : { relationship: delta.targetRef ?? delta.targetUid }),
				x: delta.x,
				y: delta.y
			});
		} else if (delta.kind === "style-override") {
			styleOverrides.push({
				selector: delta.selector.raw,
				style: toYamlValue(delta.style.values)
			});
		} else if (delta.kind === "label-override") {
			labelOverrides.push({
				...(delta.targetKind === "entity" ? { node: delta.targetRef ?? delta.targetUid } : { relationship: delta.targetRef ?? delta.targetUid }),
				label: delta.label
			});
		} else {
			pushDiagnostic(diagnostics, "error", `Unsupported view delta in view '${view.name}'.`, view.sourceRange);
		}
	}

	const pruned = Object.fromEntries(
		Object.entries({ hidden, collapsed, expanded, moved, pinned, styleOverrides, labelOverrides }).filter(([, entries]) => entries.length > 0)
	);

	return Object.keys(pruned).length > 0 ? pruned : undefined;
}

function validateDocumentForSerialization(document: ItmDocument, diagnostics: ItmDiagnostic[]): void {
	const seenQualifiedIds = new Set<string>();
	const { entitiesByUid } = buildEntityIndexes(document);

	for (const entity of document.entities) {
		if (entity.qualifiedId) {
			if (seenQualifiedIds.has(entity.qualifiedId)) {
				pushDiagnostic(diagnostics, "error", `Duplicate entity id '${entity.qualifiedId}'.`, entity.sourceRange, entity.uid);
			}

			seenQualifiedIds.add(entity.qualifiedId);
		}

		if (entity.parentId && !entitiesByUid.has(entity.parentId)) {
			pushDiagnostic(diagnostics, "error", `Entity '${entity.uid}' references missing parent '${entity.parentId}'.`, entity.sourceRange, entity.uid);
		}
	}

	for (const relationship of document.relationships) {
		if (relationship.relationshipKind !== "explicit") {
			continue;
		}

		if (!entitiesByUid.has(relationship.sourceId)) {
			pushDiagnostic(diagnostics, "error", `Relationship '${relationship.uid}' references missing source '${relationship.sourceId}'.`, relationship.sourceRange, undefined, relationship.uid);
		}

		if (!relationship.targetRef && !relationship.targetId) {
			pushDiagnostic(diagnostics, "error", `Relationship '${relationship.uid}' is missing a target.`, relationship.sourceRange, undefined, relationship.uid);
		}

		if (relationship.targetId && !entitiesByUid.has(relationship.targetId)) {
			pushDiagnostic(diagnostics, "error", `Relationship '${relationship.uid}' references missing target '${relationship.targetId}'.`, relationship.sourceRange, undefined, relationship.uid);
		}
	}

	for (const overlay of document.overlays ?? []) {
		if (overlay.policy !== "merge") {
			pushDiagnostic(diagnostics, "error", `Overlay '${overlay.uid}' uses unsupported serialization policy '${overlay.policy}'.`, overlay.sourceRange);
		}

		if (overlay.descriptionPatch && overlay.descriptionPatch.operation !== "replace") {
			pushDiagnostic(diagnostics, "error", `Overlay '${overlay.uid}' uses unsupported description patch operation '${overlay.descriptionPatch.operation}'.`, overlay.sourceRange);
		}
	}

	for (const view of document.views ?? []) {
		if (!view.viewpointRef) {
			pushDiagnostic(diagnostics, "error", `View '${view.name}' is missing a viewpoint reference.`, view.sourceRange);
		}
	}
}

function serializeRelationshipBlocks(
	relationships: ItmRelationship[],
	indentLevel: number,
	entitiesByUid: Map<string, ItmEntity>,
	diagnostics: ItmDiagnostic[]
): string[] {
	const lines: string[] = [];

	for (const relationship of relationships) {
		const token = formatRelationshipReference(relationship, entitiesByUid, diagnostics);

		if (!token) {
			continue;
		}

		lines.push(`${" ".repeat(indentLevel)}${token}`);
		lines.push(...formatAttributeBag(relationship.attributes, indentLevel));
	}

	return lines;
}

function serializeEntities(document: ItmDocument, diagnostics: ItmDiagnostic[]): string[] {
	const { entitiesByUid } = buildEntityIndexes(document);
	const childrenByParent = new Map<string | undefined, ItmEntity[]>();
	const explicitRelationshipsBySource = new Map<string, ItmRelationship[]>();

	for (const entity of document.entities) {
		const bucket = childrenByParent.get(entity.parentId);

		if (bucket) {
			bucket.push(entity);
		} else {
			childrenByParent.set(entity.parentId, [entity]);
		}
	}

	for (const relationship of document.relationships.filter((entry) => entry.relationshipKind === "explicit")) {
		const bucket = explicitRelationshipsBySource.get(relationship.sourceId);

		if (bucket) {
			bucket.push(relationship);
		} else {
			explicitRelationshipsBySource.set(relationship.sourceId, [relationship]);
		}
	}

	for (const bucket of childrenByParent.values()) {
		bucket.sort((left, right) => (left.rank ?? 0) - (right.rank ?? 0));
	}

	for (const bucket of explicitRelationshipsBySource.values()) {
		bucket.sort((left, right) => (left.sourceRange?.startLine ?? 0) - (right.sourceRange?.startLine ?? 0));
	}

	const emitted = new Set<string>();
	const lines: string[] = [];

	const visit = (entity: ItmEntity, indentLevel: number, stack: Set<string>): void => {
		if (stack.has(entity.uid)) {
			pushDiagnostic(diagnostics, "error", `Cycle detected while serializing hierarchy at entity '${entity.uid}'.`, entity.sourceRange, entity.uid);
			return;
		}

		emitted.add(entity.uid);
		stack.add(entity.uid);

		const relationships = explicitRelationshipsBySource.get(entity.uid) ?? [];
		const inlineRelationships = relationships.filter(
			(relationship) => !relationship.attributes && relationship.sourceSyntax !== "relationship-block"
		);
		const blockRelationships = relationships.filter(
			(relationship) => relationship.attributes || relationship.sourceSyntax === "relationship-block"
		);
		const inlineRelationshipTokens = inlineRelationships
			.map((relationship) => formatRelationshipReference(relationship, entitiesByUid, diagnostics))
			.filter((value): value is string => Boolean(value));

		const lineParts: string[] = [];
		const entityRef = formatReference(entity);

		if (entityRef) {
			lineParts.push(`&${entityRef}`);
		}

		if (entity.typeRef) {
			lineParts.push(`[${entity.typeRef}]`);
		}

		lineParts.push(entity.label);

		for (const tag of entity.tags ?? []) {
			lineParts.push(`#${tag}`);
		}

		lineParts.push(...inlineRelationshipTokens);
		lines.push(`${" ".repeat(indentLevel)}${lineParts.join(" ")}`);

		if (entity.description) {
			lines.push(...formatDescriptionLines(entity.description.text, indentLevel));
		}

		lines.push(...formatAttributeBag(entity.attributes, indentLevel));
		lines.push(...serializeRelationshipBlocks(blockRelationships, indentLevel, entitiesByUid, diagnostics));

		for (const child of childrenByParent.get(entity.uid) ?? []) {
			visit(child, indentLevel + 2, stack);
		}

		stack.delete(entity.uid);
	};

	for (const root of childrenByParent.get(undefined) ?? []) {
		visit(root, 0, new Set<string>());
	}

	for (const entity of document.entities) {
		if (!emitted.has(entity.uid)) {
			visit(entity, 0, new Set<string>());
		}
	}

	return lines;
}

function serializeOverlays(document: ItmDocument, diagnostics: ItmDiagnostic[]): string[] {
	const { entitiesByUid } = buildEntityIndexes(document);
	const lines: string[] = [];

	for (const overlay of sortBySource(document.overlays ?? [])) {
		const lineParts = [`&${overlay.targetRef}`, "!overlay"];

		if (overlay.replacementTypeRef) {
			lineParts.push(`[${overlay.replacementTypeRef}]`);
		}

		if (overlay.replacementLabel) {
			lineParts.push(overlay.replacementLabel);
		}

		lines.push(lineParts.join(" "));

		if (overlay.descriptionPatch?.text) {
			lines.push(...formatDescriptionLines(overlay.descriptionPatch.text, 0));
		}

		lines.push(...formatAttributeBag(attributesFromPatches(overlay.attributePatches, diagnostics, overlay.sourceRange), 0));

		if (overlay.relationshipAdditions && overlay.relationshipAdditions.length > 0) {
			lines.push(...serializeRelationshipBlocks(overlay.relationshipAdditions, 0, entitiesByUid, diagnostics));
		}
	}

	return lines;
}

export function serializeDocumentResult(document: ItmDocument, options: SerializeItmOptions = {}): ItmProcessingResult<string> {
	const diagnostics: ItmDiagnostic[] = [];

	validateDocumentForSerialization(document, diagnostics);

	const sections: string[] = [];

	if (document.metadata) {
		sections.push(`%metadata\n${formatBlock(metadataToRecord(document.metadata))}`);
	}

	for (const namespace of sortBySource(document.namespaces ?? [])) {
		sections.push(`%namespace ${namespace.prefix} ${namespace.uri}`);
	}

	for (const repository of sortBySource(document.repositories ?? [])) {
		sections.push(`%repository ${repository.name} ${repository.location}`);
	}

	for (const include of sortBySource(document.includes ?? [])) {
		sections.push(`%include ${include.target}`);
	}

	for (const requirement of sortBySource(document.pluginRequirements ?? [])) {
		sections.push(`%require ${requirement.name}${requirement.versionRange ? ` ${requirement.versionRange}` : ""}`);
	}

	for (const entityType of sortBySource(document.entityTypes ?? [])) {
		const body = {
			...(entityType.description ? { description: entityType.description } : {}),
			...(entityType.requiredAttributes ? { requiredAttributes: entityType.requiredAttributes } : {}),
			...(entityType.optionalAttributes ? { optionalAttributes: entityType.optionalAttributes } : {}),
			...(entityType.superTypeRefs ? { superTypeRefs: entityType.superTypeRefs } : {})
		};
		sections.push(`%entitytype ${entityType.name}${Object.keys(body).length > 0 ? `\n${formatBlock(body)}` : ""}`);
	}

	for (const relationshipType of sortBySource(document.relationshipTypes ?? [])) {
		const body = {
			...(relationshipType.description ? { description: relationshipType.description } : {}),
			...(relationshipType.sourceTypeRefs ? { sourceTypes: relationshipType.sourceTypeRefs } : {}),
			...(relationshipType.targetTypeRefs ? { targetTypes: relationshipType.targetTypeRefs } : {}),
			...(relationshipType.inverseTypeRef ? { inverseType: relationshipType.inverseTypeRef } : {}),
			...(relationshipType.requiredAttributes ? { requiredAttributes: relationshipType.requiredAttributes } : {}),
			...(relationshipType.optionalAttributes ? { optionalAttributes: relationshipType.optionalAttributes } : {})
		};
		sections.push(`%relationshiptype ${relationshipType.name}${Object.keys(body).length > 0 ? `\n${formatBlock(body)}` : ""}`);
	}

	for (const style of sortBySource(document.styles ?? [])) {
		sections.push(`%style ${style.selector.raw}\n${formatBlock(toYamlValue(style.style.values))}`);
	}

	for (const rule of sortBySource(document.validationRules ?? [])) {
		sections.push(
			`%rule ${rule.name}\n${formatBlock({
				select: rule.selector.raw,
				pipeline: pipelineToYaml(rule.pipeline),
				severity: rule.severity,
				...(rule.message ? { message: rule.message } : {}),
				...(rule.enabled === false ? { enabled: false } : {})
			})}`
		);
	}

	for (const viewpoint of sortBySource(document.viewpoints ?? [])) {
		const parameters = parametersToYaml(viewpoint.parameters);
		sections.push(
			`%viewpoint ${viewpoint.name}\n${formatBlock({
				...(viewpoint.title ? { title: viewpoint.title } : {}),
				...(viewpoint.description ? { description: viewpoint.description } : {}),
				...(parameters ? { parameters } : {}),
				pipeline: pipelineToYaml(viewpoint.pipeline),
				...(viewpoint.supportsVisualEditing ? { supportsVisualEditing: true } : {})
			})}`
		);
	}

	for (const view of sortBySource(document.views ?? [])) {
		const deltas = viewDeltasToYaml(view.deltas, diagnostics, view);
		const generatedAssets = generatedAssetsToYaml(view.generatedAssets);
		sections.push(
			`%view ${view.name}\n${formatBlock({
				...(view.title ? { title: view.title } : {}),
				viewpoint: view.viewpointRef,
				...(view.parameters ? { parameters: toYamlValue(view.parameters as ItmValue) } : {}),
				...(deltas ? { deltas } : {}),
				...(view.notes ? { notes: view.notes } : {}),
				...(generatedAssets ? { generatedAssets } : {})
			})}`
		);
	}

	for (const pkg of sortBySource(document.packages ?? [])) {
		const body = {
			...(pkg.description ? { description: pkg.description } : {}),
			...(pkg.version ? { version: pkg.version } : {})
		};
		sections.push(`%package ${pkg.name}${Object.keys(body).length > 0 ? `\n${formatBlock(body)}` : ""}`);
	}

	for (const usage of sortBySource(document.packageUsages ?? [])) {
		sections.push(`%using ${usage.packageRef}`);
	}

	for (const directive of sortBySource((document.directives ?? []).filter((entry) => !entry.known || !entry.handled))) {
		sections.push(directive.rawText);
	}

	const entityLines = serializeEntities(document, diagnostics);

	if (entityLines.length > 0) {
		sections.push(entityLines.join("\n"));
	}

	const overlayLines = serializeOverlays(document, diagnostics);

	if (overlayLines.length > 0) {
		sections.push(overlayLines.join("\n"));
	}

	const lineEnding = options.lineEnding === "crlf" ? "\r\n" : "\n";
	const text = sections.filter((section) => section.trim().length > 0).join(`${lineEnding}${lineEnding}`);

	return {
		value: text,
		diagnostics
	};
}

export function serializeDocument(document: ItmDocument, options: SerializeItmOptions = {}): string {
	const result = serializeDocumentResult(document, options);
	throwOnErrorDiagnostics(result.diagnostics, "ITM serialization failed due to error diagnostics.", result.value);
	return result.value;
}

export function serializeItm(document: ItmDocument, options: SerializeItmOptions = {}): string {
	return serializeDocument(document, options);
}