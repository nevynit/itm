import { createAttributeBag, createDocument } from "./factories";
import type {
	ItmAttributeBag,
	ItmAttributePatch,
	ItmDescription,
	ItmEntityType,
	ItmGeneratedAsset,
	ItmInclude,
	ItmDocument,
	ItmEntity,
	ItmMetadata,
	ItmNamespace,
	ItmOverlay,
	ItmOverlayPolicy,
	ItmPackage,
	ItmPackageUsage,
	ItmPipeline,
	ItmPipelineOperation,
	ItmPluginRequirement,
	ItmRelationshipType,
	ItmRepository,
	ItmRelationship,
	ItmSeverity,
	ItmSourceSyntax,
	ItmStyleOrigin,
	ItmStyleRule,
	ItmValue,
	ItmView,
	ItmViewDelta,
	ItmViewpoint,
	ItmViewpointParameter,
	ItmValidationRule
} from "./model";

/**
 * Draft input for creating an entity through {@link ItmDocumentBuilder.addEntity}.
 *
 * The builder accepts either a generated `uid`, a local `id`, or a fully qualified
 * `qualifiedId`. When `id` is provided and the document metadata contains a
 * `defaultNamespace`, the builder derives `qualifiedId` automatically.
 */
export interface ItmEntityDraft {
	uid?: string;
	id?: string;
	qualifiedId?: string;
	namespacePrefix?: string;
	localId?: string;
	label: string;
	typeRef?: string;
	tags?: string[];
	attributes?: ItmAttributeBag | Record<string, ItmValue>;
	description?: ItmDescription | string;
	parent?: string;
	rank?: number;
}

/**
 * Update payload for {@link ItmDocumentBuilder.renameEntity}.
 */
export interface ItmEntityRenameInput {
	id?: string;
	qualifiedId?: string;
	namespacePrefix?: string;
	label?: string;
	typeRef?: string;
}

/**
 * Move payload for {@link ItmDocumentBuilder.moveEntity}.
 */
export interface ItmEntityMoveInput {
	parent?: string | null;
	index?: number;
}

/**
 * Draft input for creating an explicit relationship.
 *
 * `source`, `target`, and similar reference fields accept either a uid, a local id,
 * or a qualified id when that object already exists in the builder document.
 */
export interface ItmRelationshipDraft {
	uid?: string;
	id?: string;
	source: string;
	target?: string;
	targetRef?: string;
	typeRef?: string;
	attributes?: ItmAttributeBag | Record<string, ItmValue>;
	sourceSyntax?: ItmSourceSyntax;
}

/**
 * Update payload for {@link ItmDocumentBuilder.updateRelationship}.
 */
export interface ItmRelationshipUpdateInput {
	id?: string;
	typeRef?: string;
	target?: string;
	targetRef?: string;
	attributes?: ItmAttributeBag | Record<string, ItmValue> | null;
	sourceSyntax?: ItmSourceSyntax;
}

/**
 * Lightweight pipeline step input used by the builder authoring API.
 */
export interface ItmPipelineStepDraft {
	uid?: string;
	operation?: ItmPipelineOperation;
	provider?: string;
	arguments?: Record<string, ItmValue>;
}

/**
 * Flexible pipeline input accepted by builder methods.
 *
 * Consumers can pass a fully materialized `ItmPipeline` or a concise array of step
 * drafts and plugin names. The builder normalizes both forms into canonical pipeline
 * steps with stable uids.
 */
export type ItmPipelineInput = ItmPipeline | Array<string | ItmPipelineStepDraft>;

/**
 * Draft input for creating a viewpoint.
 */
export interface ItmViewpointDraft {
	uid?: string;
	name: string;
	title?: string;
	description?: string;
	pipeline?: ItmPipelineInput;
	parameters?: ItmViewpointParameter[];
	supportsVisualEditing?: boolean;
}

/**
 * Update payload for {@link ItmDocumentBuilder.updateViewpoint}.
 */
export interface ItmViewpointUpdateInput {
	title?: string;
	description?: string;
	pipeline?: ItmPipelineInput;
	parameters?: ItmViewpointParameter[];
	supportsVisualEditing?: boolean;
}

/**
 * Draft input for creating a view.
 */
export interface ItmViewDraft {
	uid?: string;
	name: string;
	title?: string;
	viewpoint: string;
	parameters?: Record<string, ItmValue>;
	deltas?: ItmViewDelta[];
	generatedAssets?: ItmGeneratedAsset[];
	notes?: string[];
}

/**
 * Update payload for {@link ItmDocumentBuilder.updateView}.
 */
export interface ItmViewUpdateInput {
	title?: string;
	viewpoint?: string;
	parameters?: Record<string, ItmValue>;
	deltas?: ItmViewDelta[];
	generatedAssets?: ItmGeneratedAsset[];
	notes?: string[];
}

/**
 * Draft input for creating an overlay.
 */
export interface ItmOverlayDraft {
	uid?: string;
	target: string;
	targetKind?: "entity" | "relationship";
	replacementLabel?: string;
	replacementTypeRef?: string;
	attributes?: ItmAttributeBag | Record<string, ItmValue>;
	description?: string;
	relationshipAdditions?: ItmRelationshipDraft[];
	policy?: ItmOverlayPolicy;
}

/**
 * Update payload for {@link ItmDocumentBuilder.updateOverlay}.
 */
export interface ItmOverlayUpdateInput {
	replacementLabel?: string;
	replacementTypeRef?: string;
	attributes?: ItmAttributeBag | Record<string, ItmValue> | null;
	description?: string | null;
	relationshipAdditions?: ItmRelationshipDraft[];
	policy?: ItmOverlayPolicy;
}

/**
 * Draft input for creating an entity type definition.
 */
export interface ItmEntityTypeDraft {
	uid?: string;
	name: string;
	description?: string;
	requiredAttributes?: string[];
	optionalAttributes?: string[];
	superTypeRefs?: string[];
}

/**
 * Update payload for {@link ItmDocumentBuilder.updateEntityType}.
 */
export interface ItmEntityTypeUpdateInput {
	description?: string;
	requiredAttributes?: string[];
	optionalAttributes?: string[];
	superTypeRefs?: string[];
}

/**
 * Draft input for creating a relationship type definition.
 */
export interface ItmRelationshipTypeDraft {
	uid?: string;
	name: string;
	description?: string;
	superTypeRefs?: string[];
	sourceTypeRefs?: string[];
	targetTypeRefs?: string[];
	inverseTypeRef?: string;
	requiredAttributes?: string[];
	optionalAttributes?: string[];
}

/**
 * Update payload for {@link ItmDocumentBuilder.updateRelationshipType}.
 */
export interface ItmRelationshipTypeUpdateInput {
	description?: string;
	superTypeRefs?: string[];
	sourceTypeRefs?: string[];
	targetTypeRefs?: string[];
	inverseTypeRef?: string;
	requiredAttributes?: string[];
	optionalAttributes?: string[];
}

/**
 * Draft input for creating a document-level style rule.
 */
export interface ItmStyleRuleDraft {
	uid?: string;
	selector: string;
	style: ItmAttributeBag | Record<string, ItmValue>;
	origin?: ItmStyleOrigin;
	priority?: number;
}

/**
 * Update payload for {@link ItmDocumentBuilder.updateStyleRule}.
 */
export interface ItmStyleRuleUpdateInput {
	selector?: string;
	style?: ItmAttributeBag | Record<string, ItmValue>;
	origin?: ItmStyleOrigin;
	priority?: number;
}

/**
 * Draft input for creating a validation rule.
 */
export interface ItmValidationRuleDraft {
	uid?: string;
	name: string;
	selector: string;
	pipeline?: ItmPipelineInput;
	severity?: ItmSeverity;
	message?: string;
	enabled?: boolean;
}

/**
 * Update payload for {@link ItmDocumentBuilder.updateValidationRule}.
 */
export interface ItmValidationRuleUpdateInput {
	selector?: string;
	pipeline?: ItmPipelineInput;
	severity?: ItmSeverity;
	message?: string;
	enabled?: boolean;
}

/**
 * Draft input for creating a repository directive.
 */
export interface ItmRepositoryDraft {
	name: string;
	location: string;
}

/**
 * Update payload for {@link ItmDocumentBuilder.updateRepository}.
 */
export interface ItmRepositoryUpdateInput {
	location?: string;
}

/**
 * Draft input for creating an include directive.
 */
export interface ItmIncludeDraft {
	target: string;
}

/**
 * Draft input for creating a plugin requirement directive.
 */
export interface ItmPluginRequirementDraft {
	name: string;
	versionRange?: string;
}

/**
 * Update payload for {@link ItmDocumentBuilder.updatePluginRequirement}.
 */
export interface ItmPluginRequirementUpdateInput {
	versionRange?: string;
}

/**
 * Draft input for creating a package directive.
 */
export interface ItmPackageDraft {
	uid?: string;
	name: string;
	description?: string;
}

/**
 * Update payload for {@link ItmDocumentBuilder.updatePackage}.
 */
export interface ItmPackageUpdateInput {
	description?: string;
}

/**
 * Draft input for creating a `%using` package usage directive.
 */
export interface ItmPackageUsageDraft {
	packageRef: string;
}

function cloneValue<TValue>(value: TValue): TValue {
	if (typeof structuredClone === "function") {
		return structuredClone(value);
	}

	return JSON.parse(JSON.stringify(value)) as TValue;
}

function sanitizeUidSegment(value: string): string {
	return value.trim().replace(/[^a-zA-Z0-9:_-]+/g, "_").replace(/^_+|_+$/g, "") || "anonymous";
}

function splitQualifiedName(name: string): { namespacePrefix?: string; localId: string } {
	const parts = name.split("::");

	if (parts.length > 1) {
		const localId = parts.pop() ?? name;
		const namespacePrefix = parts.join("::");

		return {
			...(namespacePrefix ? { namespacePrefix } : {}),
			localId
		};
	}

	return { localId: name };
}

function toAttributeBag(attributes: ItmAttributeBag | Record<string, ItmValue> | null | undefined): ItmAttributeBag | undefined {
	if (!attributes) {
		return undefined;
	}

	if ("values" in attributes) {
		return cloneValue(attributes as ItmAttributeBag);
	}

	return createAttributeBag(cloneValue(attributes));
}

function toDescription(description: ItmDescription | string | undefined): ItmDescription | undefined {
	if (!description) {
		return undefined;
	}

	if (typeof description === "string") {
		return {
			format: "markdown",
			text: description
		};
	}

	return cloneValue(description);
}

function qualifyId(localId: string | undefined, namespacePrefix: string | undefined): string | undefined {
	if (!localId) {
		return undefined;
	}

	return namespacePrefix ? `${namespacePrefix}::${localId}` : localId;
}

function moveItem<TValue>(items: TValue[], fromIndex: number, toIndex: number): void {
	if (fromIndex === toIndex || fromIndex < 0 || fromIndex >= items.length) {
		return;
	}

	const [item] = items.splice(fromIndex, 1);

	if (item === undefined) {
		return;
	}

	items.splice(Math.max(0, Math.min(items.length, toIndex)), 0, item);
}

function setOptional<TObject extends object, TKey extends keyof TObject>(target: TObject, key: TKey, value: TObject[TKey] | undefined): void {
	if (value === undefined) {
		delete target[key];
		return;
	}

	target[key] = value;
}

function attributePatchesToBag(attributePatches: ItmAttributePatch[] | undefined): ItmAttributeBag | undefined {
	if (!attributePatches || attributePatches.length === 0) {
		return undefined;
	}

	const values: Record<string, ItmValue> = {};

	for (const patch of attributePatches) {
		if (patch.operation === "set" && patch.value !== undefined) {
			values[patch.key] = patch.value;
		}
	}

	return Object.keys(values).length > 0 ? { values } : undefined;
}

/**
 * Creates a mutable authoring surface over an ITM document.
 *
 * The builder keeps parser-style derived state in sync as you mutate the model,
 * including qualified ids, root entity lists, containment and ordering links,
 * relationship back-references, and overlay attachment ids.
 */
export class ItmDocumentBuilder {
	private document: ItmDocument;

	constructor(document: Partial<ItmDocument> = {}) {
		this.document = createDocument(cloneValue(document));
		this.normalize();
	}

	static fromDocument(document: ItmDocument): ItmDocumentBuilder {
		return new ItmDocumentBuilder(document);
	}

	setMetadata(metadata: ItmMetadata | undefined): this {
		if (metadata) {
			this.document.metadata = cloneValue(metadata);
		} else {
			delete this.document.metadata;
		}

		this.normalize();
		return this;
	}

	upsertNamespace(namespace: ItmNamespace): this {
		const namespaces = [...(this.document.namespaces ?? [])];
		const index = namespaces.findIndex((entry) => entry.prefix === namespace.prefix);

		if (index >= 0) {
			namespaces[index] = cloneValue(namespace);
		} else {
			namespaces.push(cloneValue(namespace));
		}

		this.document.namespaces = namespaces;
		return this;
	}

	findEntity(reference: string): ItmEntity | undefined {
		return this.findEntityInternal(reference);
	}

	findRelationship(reference: string): ItmRelationship | undefined {
		return this.document.relationships.find(
			(relationship) =>
				relationship.uid === reference ||
				relationship.id === reference ||
				relationship.targetRef === reference
		);
	}

	findViewpoint(reference: string): ItmViewpoint | undefined {
		return (this.document.viewpoints ?? []).find(
			(viewpoint) => viewpoint.uid === reference || viewpoint.name === reference
		);
	}

	findView(reference: string): ItmView | undefined {
		return (this.document.views ?? []).find(
			(view) => view.uid === reference || view.name === reference
		);
	}

	findOverlay(reference: string): ItmOverlay | undefined {
		return (this.document.overlays ?? []).find(
			(overlay) => overlay.uid === reference || overlay.targetRef === reference
		);
	}

	findEntityType(reference: string): ItmEntityType | undefined {
		return (this.document.entityTypes ?? []).find(
			(entityType) => entityType.uid === reference || entityType.name === reference
		);
	}

	findRelationshipType(reference: string): ItmRelationshipType | undefined {
		return (this.document.relationshipTypes ?? []).find(
			(relationshipType) => relationshipType.uid === reference || relationshipType.name === reference
		);
	}

	findStyleRule(reference: string): ItmStyleRule | undefined {
		return (this.document.styles ?? []).find(
			(style) => style.uid === reference || style.selector.raw === reference
		);
	}

	findValidationRule(reference: string): ItmValidationRule | undefined {
		return (this.document.validationRules ?? []).find(
			(rule) => rule.uid === reference || rule.name === reference
		);
	}

	findRepository(reference: string): ItmRepository | undefined {
		return (this.document.repositories ?? []).find(
			(repository) => repository.name === reference
		);
	}

	findInclude(reference: string): ItmInclude | undefined {
		return (this.document.includes ?? []).find((include) => include.target === reference);
	}

	findPluginRequirement(reference: string): ItmPluginRequirement | undefined {
		return (this.document.pluginRequirements ?? []).find((requirement) => requirement.name === reference);
	}

	findPackage(reference: string): ItmPackage | undefined {
		return (this.document.packages ?? []).find(
			(pkg) => pkg.uid === reference || pkg.name === reference
		);
	}

	findPackageUsage(reference: string): ItmPackageUsage | undefined {
		return (this.document.packageUsages ?? []).find((usage) => usage.packageRef === reference);
	}

	addEntity(draft: ItmEntityDraft): ItmEntity {
		const { namespacePrefix, localId, id, qualifiedId } = this.resolveEntityNames(draft);
		const attributes = toAttributeBag(draft.attributes);
		const description = toDescription(draft.description);
		const entity: ItmEntity = {
			uid: draft.uid ?? this.createEntityUid(qualifiedId),
			kind: "entity",
			...(id ? { id } : {}),
			...(qualifiedId ? { qualifiedId } : {}),
			...(namespacePrefix ? { namespacePrefix } : {}),
			...(localId ? { localId } : {}),
			label: draft.label,
			...(draft.typeRef ? { typeRef: draft.typeRef } : {}),
			...(draft.tags ? { tags: [...draft.tags] } : {}),
			...(attributes ? { attributes } : {}),
			...(description ? { description } : {}),
			...(draft.parent ? { parentId: this.requireEntity(draft.parent).uid } : {}),
			...(draft.rank !== undefined ? { rank: draft.rank } : {})
		};

		this.document.entities.push(entity);
		this.normalize();
		return this.requireEntity(entity.uid);
	}

	renameEntity(reference: string, changes: ItmEntityRenameInput): ItmEntity {
		const entity = this.requireEntity(reference);
		const renameInput: Pick<ItmEntityDraft, "id" | "qualifiedId" | "namespacePrefix" | "localId"> = {
			...(changes.id ?? entity.id ? { id: changes.id ?? entity.id } : {}),
			...(changes.id ?? entity.localId ? { localId: changes.id ?? entity.localId } : {}),
			...(changes.namespacePrefix ?? entity.namespacePrefix ? { namespacePrefix: changes.namespacePrefix ?? entity.namespacePrefix } : {}),
			...(changes.qualifiedId
				? { qualifiedId: changes.qualifiedId }
				: changes.id === undefined && changes.namespacePrefix === undefined && entity.qualifiedId
					? { qualifiedId: entity.qualifiedId }
					: {})
		};
		const { namespacePrefix, localId, id, qualifiedId } = this.resolveEntityNames(renameInput);

		if (id) {
			entity.id = id;
		} else {
			delete entity.id;
		}

		if (localId) {
			entity.localId = localId;
		} else {
			delete entity.localId;
		}

		if (namespacePrefix) {
			entity.namespacePrefix = namespacePrefix;
		} else {
			delete entity.namespacePrefix;
		}

		if (qualifiedId) {
			entity.qualifiedId = qualifiedId;
		} else {
			delete entity.qualifiedId;
		}

		entity.label = changes.label ?? entity.label;

		if (changes.typeRef !== undefined) {
			entity.typeRef = changes.typeRef;
		}

		this.normalize();
		return this.requireEntity(entity.uid);
	}

	moveEntity(reference: string, move: ItmEntityMoveInput): ItmEntity {
		const entity = this.requireEntity(reference);
		const parentUid = move.parent ? this.requireEntity(move.parent).uid : undefined;

		if (parentUid && this.isDescendant(parentUid, entity.uid)) {
			throw new Error(`Cannot move entity '${entity.uid}' beneath one of its descendants.`);
		}

		if (parentUid) {
			entity.parentId = parentUid;
		} else {
			delete entity.parentId;
		}

		if (move.index !== undefined) {
			const currentIndex = this.document.entities.findIndex((candidate) => candidate.uid === entity.uid);
			const siblingIndexes = this.document.entities
				.map((candidate, index) => ({ candidate, index }))
				.filter(({ candidate }) => candidate.uid !== entity.uid && candidate.parentId === parentUid)
				.map(({ index }) => index);
			const targetIndex = siblingIndexes[move.index] ?? this.document.entities.length - 1;

			moveItem(this.document.entities, currentIndex, targetIndex);
		}

		this.normalize();
		return this.requireEntity(entity.uid);
	}

	removeEntity(reference: string): ItmEntity | undefined {
		const entity = this.findEntityInternal(reference);

		if (!entity) {
			return undefined;
		}

		const removedIds = new Set<string>([entity.uid]);
		let changed = true;

		while (changed) {
			changed = false;

			for (const candidate of this.document.entities) {
				if (candidate.parentId && removedIds.has(candidate.parentId) && !removedIds.has(candidate.uid)) {
					removedIds.add(candidate.uid);
					changed = true;
				}
			}
		}

		this.document.entities = this.document.entities.filter((candidate) => !removedIds.has(candidate.uid));
		this.document.relationships = this.document.relationships.filter(
			(relationship) => !removedIds.has(relationship.sourceId) && (!relationship.targetId || !removedIds.has(relationship.targetId))
		);
		this.normalize();
		return entity;
	}

	addRelationship(draft: ItmRelationshipDraft): ItmRelationship {
		const source = this.requireEntity(draft.source);
		const targetEntity = draft.target ? this.findEntityInternal(draft.target) : undefined;
		const targetRef = draft.targetRef ?? targetEntity?.qualifiedId ?? targetEntity?.id;
		const attributes = toAttributeBag(draft.attributes);
		const relationship: ItmRelationship = {
			uid: draft.uid ?? this.createRelationshipUid(source.uid, draft.typeRef ?? this.defaultRelationshipType(), targetRef ?? targetEntity?.uid),
			kind: "relationship",
			...(draft.id ? { id: draft.id } : {}),
			sourceId: source.uid,
			...(source.qualifiedId ? { sourceRef: source.qualifiedId } : {}),
			...(targetEntity ? { targetId: targetEntity.uid } : {}),
			...(targetRef ? { targetRef } : {}),
			typeRef: draft.typeRef ?? this.defaultRelationshipType(),
			relationshipKind: "explicit",
			...(attributes ? { attributes } : {}),
			...(draft.sourceSyntax ? { sourceSyntax: draft.sourceSyntax } : {})
		};

		this.document.relationships.push(relationship);
		this.normalize();
		return this.requireRelationship(relationship.uid);
	}

	updateRelationship(reference: string, changes: ItmRelationshipUpdateInput): ItmRelationship {
		const relationship = this.requireRelationship(reference);

		if (changes.id !== undefined) {
			relationship.id = changes.id;
		}

		if (changes.typeRef !== undefined) {
			relationship.typeRef = changes.typeRef;
		}

		if (changes.target !== undefined) {
			const targetEntity = this.requireEntity(changes.target);
			relationship.targetId = targetEntity.uid;
			const targetRef = targetEntity.qualifiedId ?? targetEntity.id;

			if (targetRef) {
				relationship.targetRef = targetRef;
			} else {
				delete relationship.targetRef;
			}
		} else if (changes.targetRef !== undefined) {
			relationship.targetRef = changes.targetRef;
			const targetEntity = this.findEntityInternal(changes.targetRef);

			if (targetEntity) {
				relationship.targetId = targetEntity.uid;
			} else {
				delete relationship.targetId;
			}
		}

		if (changes.attributes !== undefined) {
			const attributes = toAttributeBag(changes.attributes);

			if (attributes) {
				relationship.attributes = attributes;
			} else {
				delete relationship.attributes;
			}
		}

		if (changes.sourceSyntax !== undefined) {
			relationship.sourceSyntax = changes.sourceSyntax;
		}

		this.normalize();
		return this.requireRelationship(relationship.uid);
	}

	removeRelationship(reference: string | ((relationship: ItmRelationship) => boolean)): number {
		const predicate = typeof reference === "function"
			? reference
			: (relationship: ItmRelationship) => relationship.uid === reference || relationship.id === reference;
		const before = this.document.relationships.length;

		this.document.relationships = this.document.relationships.filter(
			(relationship) => relationship.relationshipKind !== "explicit" || !predicate(relationship)
		);
		this.normalize();
		return before - this.document.relationships.length;
	}

	addViewpoint(draft: ItmViewpointDraft): ItmViewpoint {
		const viewpoint: ItmViewpoint = {
			uid: draft.uid ?? `viewpoint:${sanitizeUidSegment(draft.name)}`,
			kind: "viewpoint",
			name: draft.name,
			...(draft.title ? { title: draft.title } : {}),
			...(draft.description ? { description: draft.description } : {}),
			pipeline: this.normalizePipeline(draft.pipeline, `viewpoint:${sanitizeUidSegment(draft.name)}`),
			...(draft.parameters ? { parameters: cloneValue(draft.parameters) } : {}),
			supportsVisualEditing: draft.supportsVisualEditing ?? false
		};

		this.document.viewpoints = [...(this.document.viewpoints ?? []), viewpoint];
		this.normalize();
		return this.requireViewpoint(viewpoint.uid);
	}

	updateViewpoint(reference: string, changes: ItmViewpointUpdateInput): ItmViewpoint {
		const viewpoint = this.requireViewpoint(reference);

		setOptional(viewpoint, "title", changes.title ?? viewpoint.title);
		setOptional(viewpoint, "description", changes.description ?? viewpoint.description);

		if (changes.pipeline !== undefined) {
			viewpoint.pipeline = this.normalizePipeline(changes.pipeline, viewpoint.uid);
		}

		if (changes.parameters !== undefined) {
			setOptional(viewpoint, "parameters", cloneValue(changes.parameters));
		}

		if (changes.supportsVisualEditing !== undefined) {
			viewpoint.supportsVisualEditing = changes.supportsVisualEditing;
		}

		this.normalize();
		return this.requireViewpoint(viewpoint.uid);
	}

	removeViewpoint(reference: string): ItmViewpoint | undefined {
		const viewpoint = this.findViewpoint(reference);

		if (!viewpoint) {
			return undefined;
		}

		this.document.viewpoints = (this.document.viewpoints ?? []).filter((candidate) => candidate.uid !== viewpoint.uid);
		if ((this.document.viewpoints?.length ?? 0) === 0) {
			delete this.document.viewpoints;
		}
		return viewpoint;
	}

	addView(draft: ItmViewDraft): ItmView {
		this.requireViewpoint(draft.viewpoint);
		const view: ItmView = {
			uid: draft.uid ?? `view:${sanitizeUidSegment(draft.name)}`,
			kind: "view",
			name: draft.name,
			...(draft.title ? { title: draft.title } : {}),
			viewpointRef: draft.viewpoint,
			...(draft.parameters ? { parameters: cloneValue(draft.parameters) } : {}),
			...(draft.deltas ? { deltas: cloneValue(draft.deltas) } : {}),
			...(draft.generatedAssets ? { generatedAssets: cloneValue(draft.generatedAssets) } : {}),
			...(draft.notes ? { notes: [...draft.notes] } : {})
		};

		this.document.views = [...(this.document.views ?? []), view];
		this.normalize();
		return this.requireView(view.uid);
	}

	updateView(reference: string, changes: ItmViewUpdateInput): ItmView {
		const view = this.requireView(reference);

		setOptional(view, "title", changes.title ?? view.title);

		if (changes.viewpoint !== undefined) {
			view.viewpointRef = this.requireViewpoint(changes.viewpoint).name;
		}

		if (changes.parameters !== undefined) {
			setOptional(view, "parameters", cloneValue(changes.parameters));
		}

		if (changes.deltas !== undefined) {
			setOptional(view, "deltas", cloneValue(changes.deltas));
		}

		if (changes.generatedAssets !== undefined) {
			setOptional(view, "generatedAssets", cloneValue(changes.generatedAssets));
		}

		if (changes.notes !== undefined) {
			setOptional(view, "notes", [...changes.notes]);
		}

		this.normalize();
		return this.requireView(view.uid);
	}

	removeView(reference: string): ItmView | undefined {
		const view = this.findView(reference);

		if (!view) {
			return undefined;
		}

		this.document.views = (this.document.views ?? []).filter((candidate) => candidate.uid !== view.uid);
		if ((this.document.views?.length ?? 0) === 0) {
			delete this.document.views;
		}
		return view;
	}

	addOverlay(draft: ItmOverlayDraft): ItmOverlay {
		const overlay = this.createOverlay(draft);

		this.document.overlays = [...(this.document.overlays ?? []), overlay];
		this.normalize();
		return this.requireOverlay(overlay.uid);
	}

	updateOverlay(reference: string, changes: ItmOverlayUpdateInput): ItmOverlay {
		const overlay = this.requireOverlay(reference);

		setOptional(overlay, "replacementLabel", changes.replacementLabel ?? overlay.replacementLabel);
		setOptional(overlay, "replacementTypeRef", changes.replacementTypeRef ?? overlay.replacementTypeRef);

		if (changes.attributes !== undefined) {
			setOptional(overlay, "attributePatches", this.toAttributePatches(changes.attributes));
		}

		if (changes.description !== undefined) {
			setOptional(
				overlay,
				"descriptionPatch",
				changes.description === null ? undefined : { operation: "replace", text: changes.description }
			);
		}

		if (changes.relationshipAdditions !== undefined) {
			setOptional(overlay, "relationshipAdditions", this.normalizeOverlayRelationshipAdditions(overlay, changes.relationshipAdditions));
		}

		if (changes.policy !== undefined) {
			overlay.policy = changes.policy;
		}

		this.normalize();
		return this.requireOverlay(overlay.uid);
	}

	removeOverlay(reference: string): ItmOverlay | undefined {
		const overlay = this.findOverlay(reference);

		if (!overlay) {
			return undefined;
		}

		this.document.overlays = (this.document.overlays ?? []).filter((candidate) => candidate.uid !== overlay.uid);
		if ((this.document.overlays?.length ?? 0) === 0) {
			delete this.document.overlays;
		}
		this.normalize();
		return overlay;
	}

	addEntityType(draft: ItmEntityTypeDraft): ItmEntityType {
		const entityType: ItmEntityType = {
			uid: draft.uid ?? `entity-type:${sanitizeUidSegment(draft.name)}`,
			kind: "entity-type",
			name: draft.name,
			...(draft.description ? { description: draft.description } : {}),
			...(draft.requiredAttributes ? { requiredAttributes: [...draft.requiredAttributes] } : {}),
			...(draft.optionalAttributes ? { optionalAttributes: [...draft.optionalAttributes] } : {}),
			...(draft.superTypeRefs ? { superTypeRefs: [...draft.superTypeRefs] } : {})
		};

		this.document.entityTypes = [...(this.document.entityTypes ?? []), entityType];
		this.normalize();
		return this.requireEntityType(entityType.uid);
	}

	updateEntityType(reference: string, changes: ItmEntityTypeUpdateInput): ItmEntityType {
		const entityType = this.requireEntityType(reference);

		setOptional(entityType, "description", changes.description ?? entityType.description);
		if (changes.requiredAttributes !== undefined) {
			setOptional(entityType, "requiredAttributes", [...changes.requiredAttributes]);
		}
		if (changes.optionalAttributes !== undefined) {
			setOptional(entityType, "optionalAttributes", [...changes.optionalAttributes]);
		}
		if (changes.superTypeRefs !== undefined) {
			setOptional(entityType, "superTypeRefs", [...changes.superTypeRefs]);
		}

		this.normalize();
		return this.requireEntityType(entityType.uid);
	}

	removeEntityType(reference: string): ItmEntityType | undefined {
		const entityType = this.findEntityType(reference);

		if (!entityType) {
			return undefined;
		}

		this.document.entityTypes = (this.document.entityTypes ?? []).filter((candidate) => candidate.uid !== entityType.uid);
		if ((this.document.entityTypes?.length ?? 0) === 0) {
			delete this.document.entityTypes;
		}
		return entityType;
	}

	addRelationshipType(draft: ItmRelationshipTypeDraft): ItmRelationshipType {
		const relationshipType: ItmRelationshipType = {
			uid: draft.uid ?? `relationship-type:${sanitizeUidSegment(draft.name)}`,
			kind: "relationship-type",
			name: draft.name,
			...(draft.description ? { description: draft.description } : {}),
			...(draft.superTypeRefs ? { superTypeRefs: [...draft.superTypeRefs] } : {}),
			...(draft.sourceTypeRefs ? { sourceTypeRefs: [...draft.sourceTypeRefs] } : {}),
			...(draft.targetTypeRefs ? { targetTypeRefs: [...draft.targetTypeRefs] } : {}),
			...(draft.inverseTypeRef ? { inverseTypeRef: draft.inverseTypeRef } : {}),
			...(draft.requiredAttributes ? { requiredAttributes: [...draft.requiredAttributes] } : {}),
			...(draft.optionalAttributes ? { optionalAttributes: [...draft.optionalAttributes] } : {})
		};

		this.document.relationshipTypes = [...(this.document.relationshipTypes ?? []), relationshipType];
		this.normalize();
		return this.requireRelationshipType(relationshipType.uid);
	}

	updateRelationshipType(reference: string, changes: ItmRelationshipTypeUpdateInput): ItmRelationshipType {
		const relationshipType = this.requireRelationshipType(reference);

		setOptional(relationshipType, "description", changes.description ?? relationshipType.description);
		if (changes.superTypeRefs !== undefined) {
			setOptional(relationshipType, "superTypeRefs", [...changes.superTypeRefs]);
		}
		if (changes.sourceTypeRefs !== undefined) {
			setOptional(relationshipType, "sourceTypeRefs", [...changes.sourceTypeRefs]);
		}
		if (changes.targetTypeRefs !== undefined) {
			setOptional(relationshipType, "targetTypeRefs", [...changes.targetTypeRefs]);
		}
		setOptional(relationshipType, "inverseTypeRef", changes.inverseTypeRef ?? relationshipType.inverseTypeRef);
		if (changes.requiredAttributes !== undefined) {
			setOptional(relationshipType, "requiredAttributes", [...changes.requiredAttributes]);
		}
		if (changes.optionalAttributes !== undefined) {
			setOptional(relationshipType, "optionalAttributes", [...changes.optionalAttributes]);
		}

		this.normalize();
		return this.requireRelationshipType(relationshipType.uid);
	}

	removeRelationshipType(reference: string): ItmRelationshipType | undefined {
		const relationshipType = this.findRelationshipType(reference);

		if (!relationshipType) {
			return undefined;
		}

		this.document.relationshipTypes = (this.document.relationshipTypes ?? []).filter((candidate) => candidate.uid !== relationshipType.uid);
		if ((this.document.relationshipTypes?.length ?? 0) === 0) {
			delete this.document.relationshipTypes;
		}
		return relationshipType;
	}

	addStyleRule(draft: ItmStyleRuleDraft): ItmStyleRule {
		const style = toAttributeBag(draft.style) ?? { values: {} };
		const styleRule: ItmStyleRule = {
			uid: draft.uid ?? `style:${this.document.styles?.length ?? 0}:${sanitizeUidSegment(draft.selector)}`,
			kind: "style-rule",
			selector: { raw: draft.selector },
			style,
			origin: draft.origin ?? "document",
			priority: draft.priority ?? (this.document.styles?.length ?? 0) + 1
		};

		this.document.styles = [...(this.document.styles ?? []), styleRule];
		this.normalize();
		return this.requireStyleRule(styleRule.uid);
	}

	updateStyleRule(reference: string, changes: ItmStyleRuleUpdateInput): ItmStyleRule {
		const styleRule = this.requireStyleRule(reference);

		if (changes.selector !== undefined) {
			styleRule.selector = { raw: changes.selector };
		}
		if (changes.style !== undefined) {
			styleRule.style = toAttributeBag(changes.style) ?? { values: {} };
		}
		if (changes.origin !== undefined) {
			styleRule.origin = changes.origin;
		}
		if (changes.priority !== undefined) {
			styleRule.priority = changes.priority;
		}

		this.normalize();
		return this.requireStyleRule(styleRule.uid);
	}

	removeStyleRule(reference: string): ItmStyleRule | undefined {
		const styleRule = this.findStyleRule(reference);

		if (!styleRule) {
			return undefined;
		}

		this.document.styles = (this.document.styles ?? []).filter((candidate) => candidate.uid !== styleRule.uid);
		if ((this.document.styles?.length ?? 0) === 0) {
			delete this.document.styles;
		}
		return styleRule;
	}

	addValidationRule(draft: ItmValidationRuleDraft): ItmValidationRule {
		const rule: ItmValidationRule = {
			uid: draft.uid ?? `rule:${sanitizeUidSegment(draft.name)}`,
			kind: "validation-rule",
			name: draft.name,
			selector: { raw: draft.selector },
			pipeline: this.normalizePipeline(draft.pipeline, `rule:${sanitizeUidSegment(draft.name)}`),
			severity: draft.severity ?? "warning",
			...(draft.message ? { message: draft.message } : {}),
			enabled: draft.enabled ?? true
		};

		this.document.validationRules = [...(this.document.validationRules ?? []), rule];
		this.normalize();
		return this.requireValidationRule(rule.uid);
	}

	updateValidationRule(reference: string, changes: ItmValidationRuleUpdateInput): ItmValidationRule {
		const rule = this.requireValidationRule(reference);

		if (changes.selector !== undefined) {
			rule.selector = { raw: changes.selector };
		}
		if (changes.pipeline !== undefined) {
			rule.pipeline = this.normalizePipeline(changes.pipeline, rule.uid);
		}
		if (changes.severity !== undefined) {
			rule.severity = changes.severity;
		}
		setOptional(rule, "message", changes.message ?? rule.message);
		if (changes.enabled !== undefined) {
			rule.enabled = changes.enabled;
		}

		this.normalize();
		return this.requireValidationRule(rule.uid);
	}

	removeValidationRule(reference: string): ItmValidationRule | undefined {
		const rule = this.findValidationRule(reference);

		if (!rule) {
			return undefined;
		}

		this.document.validationRules = (this.document.validationRules ?? []).filter((candidate) => candidate.uid !== rule.uid);
		if ((this.document.validationRules?.length ?? 0) === 0) {
			delete this.document.validationRules;
		}
		return rule;
	}

	addRepository(draft: ItmRepositoryDraft): ItmRepository {
		const repository: ItmRepository = {
			name: draft.name,
			location: draft.location,
			allowed: true
		};

		this.document.repositories = [...(this.document.repositories ?? []), repository];
		return this.findRepository(draft.name)!;
	}

	updateRepository(reference: string, changes: ItmRepositoryUpdateInput): ItmRepository {
		const repository = this.requireRepository(reference);

		if (changes.location !== undefined) {
			repository.location = changes.location;
		}

		return repository;
	}

	removeRepository(reference: string): ItmRepository | undefined {
		const repository = this.findRepository(reference);

		if (!repository) {
			return undefined;
		}

		this.document.repositories = (this.document.repositories ?? []).filter((candidate) => candidate.name !== repository.name);
		if ((this.document.repositories?.length ?? 0) === 0) {
			delete this.document.repositories;
		}
		return repository;
	}

	addInclude(draft: ItmIncludeDraft): ItmInclude {
		const include: ItmInclude = {
			target: draft.target,
			status: "unresolved"
		};

		this.document.includes = [...(this.document.includes ?? []), include];
		return this.findInclude(draft.target)!;
	}

	removeInclude(reference: string): ItmInclude | undefined {
		const include = this.findInclude(reference);

		if (!include) {
			return undefined;
		}

		this.document.includes = (this.document.includes ?? []).filter((candidate) => candidate.target !== include.target);
		if ((this.document.includes?.length ?? 0) === 0) {
			delete this.document.includes;
		}
		return include;
	}

	addPluginRequirement(draft: ItmPluginRequirementDraft): ItmPluginRequirement {
		const requirement: ItmPluginRequirement = {
			name: draft.name,
			...(draft.versionRange ? { versionRange: draft.versionRange } : {}),
			resolved: false
		};

		this.document.pluginRequirements = [...(this.document.pluginRequirements ?? []), requirement];
		return this.findPluginRequirement(draft.name)!;
	}

	updatePluginRequirement(reference: string, changes: ItmPluginRequirementUpdateInput): ItmPluginRequirement {
		const requirement = this.requirePluginRequirement(reference);

		setOptional(requirement, "versionRange", changes.versionRange ?? requirement.versionRange);
		return requirement;
	}

	removePluginRequirement(reference: string): ItmPluginRequirement | undefined {
		const requirement = this.findPluginRequirement(reference);

		if (!requirement) {
			return undefined;
		}

		this.document.pluginRequirements = (this.document.pluginRequirements ?? []).filter((candidate) => candidate.name !== requirement.name);
		if ((this.document.pluginRequirements?.length ?? 0) === 0) {
			delete this.document.pluginRequirements;
		}
		return requirement;
	}

	addPackage(draft: ItmPackageDraft): ItmPackage {
		const pkg: ItmPackage = {
			uid: draft.uid ?? `package:${sanitizeUidSegment(draft.name)}`,
			kind: "package",
			name: draft.name,
			...(draft.description ? { description: draft.description } : {})
		};

		this.document.packages = [...(this.document.packages ?? []), pkg];
		return this.requirePackage(pkg.uid);
	}

	updatePackage(reference: string, changes: ItmPackageUpdateInput): ItmPackage {
		const pkg = this.requirePackage(reference);

		setOptional(pkg, "description", changes.description ?? pkg.description);
		return pkg;
	}

	removePackage(reference: string): ItmPackage | undefined {
		const pkg = this.findPackage(reference);

		if (!pkg) {
			return undefined;
		}

		this.document.packages = (this.document.packages ?? []).filter((candidate) => candidate.uid !== pkg.uid);
		if ((this.document.packages?.length ?? 0) === 0) {
			delete this.document.packages;
		}
		return pkg;
	}

	addPackageUsage(draft: ItmPackageUsageDraft): ItmPackageUsage {
		const usage: ItmPackageUsage = {
			packageRef: draft.packageRef,
			scope: "all"
		};

		this.document.packageUsages = [...(this.document.packageUsages ?? []), usage];
		return this.findPackageUsage(draft.packageRef)!;
	}

	removePackageUsage(reference: string): ItmPackageUsage | undefined {
		const usage = this.findPackageUsage(reference);

		if (!usage) {
			return undefined;
		}

		this.document.packageUsages = (this.document.packageUsages ?? []).filter((candidate) => candidate.packageRef !== usage.packageRef);
		if ((this.document.packageUsages?.length ?? 0) === 0) {
			delete this.document.packageUsages;
		}
		return usage;
	}

	toDocument(): ItmDocument {
		this.normalize();
		return cloneValue(this.document);
	}

	private defaultNamespace(): string | undefined {
		return this.document.metadata?.defaultNamespace;
	}

	private defaultRelationshipType(): string {
		return this.document.metadata?.defaultRelationshipType ?? "related_to";
	}

	private normalize(): void {
		this.document = createDocument(this.document);
		if (this.document.entityTypes) {
			this.document.entityTypes = this.document.entityTypes.map((entityType) => ({
				...entityType,
				uid: entityType.uid || `entity-type:${sanitizeUidSegment(entityType.name)}`,
				kind: "entity-type"
			}));
		}

		if (this.document.relationshipTypes) {
			this.document.relationshipTypes = this.document.relationshipTypes.map((relationshipType) => ({
				...relationshipType,
				uid: relationshipType.uid || `relationship-type:${sanitizeUidSegment(relationshipType.name)}`,
				kind: "relationship-type"
			}));
		}

		if (this.document.styles) {
			this.document.styles = this.document.styles.map((style, index) => ({
				...style,
				uid: style.uid || `style:${index}:${sanitizeUidSegment(style.selector.raw)}`,
				kind: "style-rule",
				selector: { raw: style.selector.raw },
				style: style.style ?? { values: {} },
				origin: style.origin ?? "document",
				priority: style.priority ?? index + 1
			}));
		}

		if (this.document.validationRules) {
			this.document.validationRules = this.document.validationRules.map((rule) => ({
				...rule,
				uid: rule.uid || `rule:${sanitizeUidSegment(rule.name)}`,
				kind: "validation-rule",
				selector: { raw: rule.selector.raw },
				pipeline: this.normalizePipeline(rule.pipeline, rule.uid || `rule:${sanitizeUidSegment(rule.name)}`),
				severity: rule.severity ?? "warning",
				enabled: rule.enabled !== false
			}));
		}

		if (this.document.repositories) {
			this.document.repositories = this.document.repositories.map((repository) => ({
				...repository,
				allowed: repository.allowed !== false
			}));
		}

		if (this.document.includes) {
			this.document.includes = this.document.includes.map((include) => ({
				...include,
				status: include.status ?? "unresolved"
			}));
		}

		if (this.document.pluginRequirements) {
			this.document.pluginRequirements = this.document.pluginRequirements.map((requirement) => ({
				...requirement,
				resolved: requirement.resolved ?? false
			}));
		}

		if (this.document.packages) {
			this.document.packages = this.document.packages.map((pkg) => ({
				...pkg,
				uid: pkg.uid || `package:${sanitizeUidSegment(pkg.name)}`,
				kind: "package"
			}));
		}

		if (this.document.packageUsages) {
			this.document.packageUsages = this.document.packageUsages.map((usage) => ({
				...usage,
				scope: usage.scope ?? "all"
			}));
		}

		if (this.document.viewpoints) {
			this.document.viewpoints = this.document.viewpoints.map((viewpoint) => ({
				...viewpoint,
				uid: viewpoint.uid || `viewpoint:${sanitizeUidSegment(viewpoint.name)}`,
				kind: "viewpoint",
				pipeline: this.normalizePipeline(viewpoint.pipeline, viewpoint.uid || `viewpoint:${sanitizeUidSegment(viewpoint.name)}`),
				supportsVisualEditing: viewpoint.supportsVisualEditing
			}));
		}

		if (this.document.views) {
			this.document.views = this.document.views.map((view) => ({
				...view,
				uid: view.uid || `view:${sanitizeUidSegment(view.name)}`,
				kind: "view"
			}));
		}

		if (this.document.overlays) {
			this.document.overlays = this.document.overlays.map((overlay, index) => {
				const target = overlay.targetUid
					? this.findEntityInternal(overlay.targetUid)?.qualifiedId ?? overlay.targetRef
					: overlay.targetRef;
				const relationshipAdditions = overlay.relationshipAdditions
					? this.normalizeExistingOverlayRelationshipAdditions({ uid: overlay.uid || `overlay:${sanitizeUidSegment(target)}:${index}`, targetRef: target }, overlay.relationshipAdditions)
					: undefined;

				return {
					...overlay,
					uid: overlay.uid || `overlay:${sanitizeUidSegment(target)}:${index}`,
					kind: "overlay",
					targetKind: overlay.targetKind,
					targetRef: target,
					policy: overlay.policy ?? "merge",
					...(relationshipAdditions ? { relationshipAdditions } : {})
				};
			});
		}

		this.document.entities = this.document.entities.map((entity, index) => {
			const names = this.resolveEntityNames(entity);

			return {
				...entity,
				kind: "entity",
				uid: entity.uid || this.createEntityUid(names.qualifiedId, index + 1),
				...(names.id ? { id: names.id } : {}),
				...(names.localId ? { localId: names.localId } : {}),
				...(names.namespacePrefix ? { namespacePrefix: names.namespacePrefix } : {}),
				...(names.qualifiedId ? { qualifiedId: names.qualifiedId } : {}),
				childIds: [],
				incomingRelationshipIds: [],
				outgoingRelationshipIds: [],
				overlayIds: [],
				rank: index,
				depth: 0
			};
		});

		const entityByUid = new Map(this.document.entities.map((entity) => [entity.uid, entity]));
		const groups = new Map<string | undefined, ItmEntity[]>();

		for (const entity of this.document.entities) {
			if (entity.parentId && !entityByUid.has(entity.parentId)) {
				delete entity.parentId;
			}

			const siblings = groups.get(entity.parentId);

			if (siblings) {
				siblings.push(entity);
			} else {
				groups.set(entity.parentId, [entity]);
			}
		}

		for (const root of groups.get(undefined) ?? []) {
			this.assignDepths(root, entityByUid, new Set<string>());
		}

		this.document.roots = (groups.get(undefined) ?? []).map((entity) => entity.uid);

		const explicitRelationships = this.document.relationships
			.filter((relationship) => relationship.relationshipKind === "explicit" || relationship.relationshipKind === undefined)
			.map((relationship, index) => this.normalizeExplicitRelationship(relationship, entityByUid, index + 1));

		for (const relationship of explicitRelationships) {
			const source = entityByUid.get(relationship.sourceId);

			if (source) {
				source.outgoingRelationshipIds?.push(relationship.uid);
			}

			const target = relationship.targetId ? entityByUid.get(relationship.targetId) : undefined;

			if (target) {
				target.incomingRelationshipIds?.push(relationship.uid);
			}
		}

		const implicitRelationships: ItmRelationship[] = [];

		for (const entity of this.document.entities) {
			if (!entity.parentId) {
				continue;
			}

			const parent = entityByUid.get(entity.parentId);

			if (!parent) {
				continue;
			}

			parent.childIds?.push(entity.uid);
			const containment = this.createImplicitRelationship(parent.uid, entity.uid, "contains", "containment", false);
			parent.outgoingRelationshipIds?.push(containment.uid);
			entity.incomingRelationshipIds?.push(containment.uid);
			implicitRelationships.push(containment);
		}

		for (const siblings of groups.values()) {
			for (let index = 0; index < siblings.length - 1; index += 1) {
				const source = siblings[index];
				const target = siblings[index + 1];

				if (!source || !target) {
					continue;
				}

				const ordering = this.createImplicitRelationship(source.uid, target.uid, "followed_by", "ordering", true);
				source.outgoingRelationshipIds?.push(ordering.uid);
				target.incomingRelationshipIds?.push(ordering.uid);
				implicitRelationships.push(ordering);
			}
		}

		for (const overlay of this.document.overlays ?? []) {
			this.attachOverlay(overlay, entityByUid, explicitRelationships);
		}

		this.document.relationships = [...explicitRelationships, ...implicitRelationships];
		delete this.document.diagnostics;
	}

	private normalizePipeline(pipeline: ItmPipelineInput | undefined, uidPrefix: string): ItmPipeline {
		if (!pipeline) {
			return { steps: [] };
		}

		if ("steps" in pipeline) {
			return {
				steps: pipeline.steps.map((step, index) => ({
					...cloneValue(step),
					uid: step.uid || `${uidPrefix}:step:${index + 1}`
				}))
			};
		}

		return {
			steps: pipeline.map((step, index) => {
				if (typeof step === "string") {
					return {
						uid: `${uidPrefix}:step:${index + 1}`,
						operation: "plugin",
						provider: step,
						arguments: {}
					};
				}

				return {
					uid: step.uid || `${uidPrefix}:step:${index + 1}`,
					operation: step.operation ?? "plugin",
					...(step.provider ? { provider: step.provider } : {}),
					arguments: cloneValue(step.arguments ?? {})
				};
			})
		};
	}

	private toAttributePatches(attributes: ItmAttributeBag | Record<string, ItmValue> | null | undefined): ItmAttributePatch[] | undefined {
		const bag = toAttributeBag(attributes);

		if (!bag) {
			return undefined;
		}

		return Object.entries(bag.values).map(([key, value]) => ({
			key,
			value,
			operation: "set"
		}));
	}

	private createOverlay(draft: ItmOverlayDraft): ItmOverlay {
		const target = this.resolveOverlayTarget(draft.target, draft.targetKind ?? "entity");
		const uid = draft.uid ?? `overlay:${sanitizeUidSegment(target.targetRef)}:${this.document.overlays?.length ?? 0}`;
		const attributePatches = this.toAttributePatches(draft.attributes);
		const relationshipAdditions = draft.relationshipAdditions
			? this.normalizeOverlayRelationshipAdditions({ targetRef: target.targetRef, uid }, draft.relationshipAdditions)
			: undefined;

		return {
			uid,
			kind: "overlay",
			targetKind: target.targetKind,
			...(target.targetUid ? { targetUid: target.targetUid } : {}),
			targetRef: target.targetRef,
			...(draft.replacementLabel ? { replacementLabel: draft.replacementLabel } : {}),
			...(draft.replacementTypeRef ? { replacementTypeRef: draft.replacementTypeRef } : {}),
			...(attributePatches ? { attributePatches } : {}),
			...(draft.description ? { descriptionPatch: { operation: "replace", text: draft.description } } : {}),
			...(relationshipAdditions ? { relationshipAdditions } : {}),
			policy: draft.policy ?? "merge"
		};
	}

	private resolveOverlayTarget(reference: string, targetKind: "entity" | "relationship"): {
		targetKind: "entity" | "relationship";
		targetUid?: string;
		targetRef: string;
	} {
		if (targetKind === "relationship") {
			const relationship = this.requireRelationship(reference);

			return {
				targetKind,
				targetUid: relationship.uid,
				targetRef: relationship.id ?? relationship.uid
			};
		}

		const entity = this.requireEntity(reference);

		return {
			targetKind,
			targetUid: entity.uid,
			targetRef: entity.qualifiedId ?? entity.id ?? entity.uid
		};
	}

	private normalizeOverlayRelationshipAdditions(overlay: Pick<ItmOverlay, "uid" | "targetRef">, additions: ItmRelationshipDraft[]): ItmRelationship[] | undefined {
		if (additions.length === 0) {
			return undefined;
		}

		return additions.map((addition, index) => {
			const targetEntity = addition.target ? this.findEntityInternal(addition.target) : undefined;
			const targetRef = addition.targetRef ?? targetEntity?.qualifiedId ?? targetEntity?.id;
			const attributes = toAttributeBag(addition.attributes);

			return {
				uid: addition.uid ?? this.createRelationshipUid(overlay.uid, addition.typeRef ?? this.defaultRelationshipType(), targetRef ?? targetEntity?.uid, index + 1),
				kind: "relationship",
				...(addition.id ? { id: addition.id } : {}),
				sourceId: overlay.uid,
				sourceRef: overlay.targetRef,
				...(targetEntity ? { targetId: targetEntity.uid } : {}),
				...(targetRef ? { targetRef } : {}),
				typeRef: addition.typeRef ?? this.defaultRelationshipType(),
				relationshipKind: "explicit",
				implicit: false,
				virtual: false,
				sourceSyntax: addition.sourceSyntax ?? "relationship-block",
				...(attributes ? { attributes } : {})
			};
		});
	}

	private normalizeExistingOverlayRelationshipAdditions(overlay: Pick<ItmOverlay, "uid" | "targetRef">, additions: ItmRelationship[]): ItmRelationship[] | undefined {
		if (additions.length === 0) {
			return undefined;
		}

		return additions.map((addition, index) => ({
			...cloneValue(addition),
			uid: addition.uid || this.createRelationshipUid(overlay.uid, addition.typeRef, addition.targetRef ?? addition.targetId, index + 1),
			kind: "relationship",
			sourceId: overlay.uid,
			sourceRef: overlay.targetRef,
			relationshipKind: "explicit",
			implicit: false,
			virtual: false,
			sourceSyntax: addition.sourceSyntax ?? "relationship-block"
		}));
	}

	private assignDepths(entity: ItmEntity, entityByUid: Map<string, ItmEntity>, visiting: Set<string>): void {
		if (visiting.has(entity.uid)) {
			throw new Error(`Cycle detected in entity hierarchy at '${entity.uid}'.`);
		}

		visiting.add(entity.uid);
		entity.depth = entity.parentId ? (entityByUid.get(entity.parentId)?.depth ?? 0) + 1 : 0;

		for (const child of this.document.entities.filter((candidate) => candidate.parentId === entity.uid)) {
			this.assignDepths(child, entityByUid, visiting);
		}

		visiting.delete(entity.uid);
	}

	private attachOverlay(overlay: ItmOverlay, entityByUid: Map<string, ItmEntity>, explicitRelationships: ItmRelationship[]): void {
		if (overlay.targetKind === "entity") {
			const target = overlay.targetUid
				? entityByUid.get(overlay.targetUid)
				: this.findEntityInternal(overlay.targetRef);

			target?.overlayIds?.push(overlay.uid);
			return;
		}

		const target = overlay.targetUid
			? explicitRelationships.find((relationship) => relationship.uid === overlay.targetUid)
			: explicitRelationships.find((relationship) => relationship.id === overlay.targetRef || relationship.uid === overlay.targetRef);

		target?.overlayIds?.push(overlay.uid);
	}

	private normalizeExplicitRelationship(
		relationship: ItmRelationship,
		entityByUid: Map<string, ItmEntity>,
		sequence: number
	): ItmRelationship {
		const source = entityByUid.get(relationship.sourceId) ?? (relationship.sourceRef ? this.findEntityInternal(relationship.sourceRef) : undefined);
		const target = relationship.targetId
			? entityByUid.get(relationship.targetId)
			: relationship.targetRef
				? this.findEntityInternal(relationship.targetRef)
				: undefined;
		const typeRef = relationship.typeRef || this.defaultRelationshipType();
		const targetRef = target?.qualifiedId ?? target?.id ?? relationship.targetRef;

		if (!source) {
			throw new Error(`Relationship '${relationship.uid}' references unknown source '${relationship.sourceId}'.`);
		}

		return {
			...relationship,
			uid: relationship.uid || this.createRelationshipUid(source.uid, typeRef, targetRef ?? relationship.targetId, sequence),
			kind: "relationship",
			sourceId: source.uid,
			...(source.qualifiedId ? { sourceRef: source.qualifiedId } : {}),
			...(target ? { targetId: target.uid } : {}),
			...(targetRef ? { targetRef } : {}),
			typeRef,
			relationshipKind: "explicit"
		};
	}

	private createImplicitRelationship(
		sourceId: string,
		targetId: string,
		typeRef: string,
		relationshipKind: "containment" | "ordering",
		virtual: boolean
	): ItmRelationship {
		return {
			uid: `relationship:${relationshipKind}:${sanitizeUidSegment(sourceId)}:${sanitizeUidSegment(targetId)}`,
			kind: "relationship",
			sourceId,
			targetId,
			typeRef,
			relationshipKind,
			implicit: true,
			virtual,
			sourceSyntax: "generated"
		};
	}

	private createEntityUid(qualifiedId: string | undefined, sequence = this.document.entities.length + 1): string {
		return qualifiedId ? `entity:${sanitizeUidSegment(qualifiedId)}` : `entity:anonymous:${sequence}`;
	}

	private createRelationshipUid(sourceId: string, typeRef: string, target: string | undefined, sequence = this.document.relationships.length + 1): string {
		return `relationship:${sanitizeUidSegment(sourceId)}:${sanitizeUidSegment(typeRef)}:${sanitizeUidSegment(target ?? String(sequence))}:${sequence}`;
	}

	private resolveEntityNames(input: Pick<ItmEntityDraft, "id" | "qualifiedId" | "namespacePrefix" | "localId">): {
		id?: string;
		localId?: string;
		namespacePrefix?: string;
		qualifiedId?: string;
	} {
		if (input.qualifiedId) {
			const parts = splitQualifiedName(input.qualifiedId);

			return {
				id: parts.localId,
				localId: parts.localId,
				...(parts.namespacePrefix ? { namespacePrefix: parts.namespacePrefix } : {}),
				qualifiedId: input.qualifiedId
			};
		}

		const localId = input.localId ?? input.id;
		const namespacePrefix = input.namespacePrefix ?? this.defaultNamespace();
		const qualifiedId = qualifyId(localId, namespacePrefix);

		return {
			...(localId ? { id: localId, localId } : {}),
			...(namespacePrefix ? { namespacePrefix } : {}),
			...(qualifiedId ? { qualifiedId } : {})
		};
	}

	private requireEntity(reference: string): ItmEntity {
		const entity = this.findEntityInternal(reference);

		if (!entity) {
			throw new Error(`Entity '${reference}' was not found.`);
		}

		return entity;
	}

	private requireViewpoint(reference: string): ItmViewpoint {
		const viewpoint = this.findViewpoint(reference);

		if (!viewpoint) {
			throw new Error(`Viewpoint '${reference}' was not found.`);
		}

		return viewpoint;
	}

	private requireView(reference: string): ItmView {
		const view = this.findView(reference);

		if (!view) {
			throw new Error(`View '${reference}' was not found.`);
		}

		return view;
	}

	private requireOverlay(reference: string): ItmOverlay {
		const overlay = this.findOverlay(reference);

		if (!overlay) {
			throw new Error(`Overlay '${reference}' was not found.`);
		}

		return overlay;
	}

	private requireEntityType(reference: string): ItmEntityType {
		const entityType = this.findEntityType(reference);

		if (!entityType) {
			throw new Error(`Entity type '${reference}' was not found.`);
		}

		return entityType;
	}

	private requireRelationshipType(reference: string): ItmRelationshipType {
		const relationshipType = this.findRelationshipType(reference);

		if (!relationshipType) {
			throw new Error(`Relationship type '${reference}' was not found.`);
		}

		return relationshipType;
	}

	private requireStyleRule(reference: string): ItmStyleRule {
		const styleRule = this.findStyleRule(reference);

		if (!styleRule) {
			throw new Error(`Style rule '${reference}' was not found.`);
		}

		return styleRule;
	}

	private requireValidationRule(reference: string): ItmValidationRule {
		const rule = this.findValidationRule(reference);

		if (!rule) {
			throw new Error(`Validation rule '${reference}' was not found.`);
		}

		return rule;
	}

	private requireRepository(reference: string): ItmRepository {
		const repository = this.findRepository(reference);

		if (!repository) {
			throw new Error(`Repository '${reference}' was not found.`);
		}

		return repository;
	}

	private requirePluginRequirement(reference: string): ItmPluginRequirement {
		const requirement = this.findPluginRequirement(reference);

		if (!requirement) {
			throw new Error(`Plugin requirement '${reference}' was not found.`);
		}

		return requirement;
	}

	private requirePackage(reference: string): ItmPackage {
		const pkg = this.findPackage(reference);

		if (!pkg) {
			throw new Error(`Package '${reference}' was not found.`);
		}

		return pkg;
	}

	private findEntityInternal(reference: string): ItmEntity | undefined {
		return this.document.entities.find(
			(entity) =>
				entity.uid === reference ||
				entity.qualifiedId === reference ||
				entity.id === reference
		);
	}

	private requireRelationship(reference: string): ItmRelationship {
		const relationship = this.document.relationships.find(
			(candidate) => candidate.uid === reference || candidate.id === reference
		);

		if (!relationship) {
			throw new Error(`Relationship '${reference}' was not found.`);
		}

		return relationship;
	}

	private isDescendant(reference: string, ancestorUid: string): boolean {
		let current = this.findEntityInternal(reference);

		while (current?.parentId) {
			if (current.parentId === ancestorUid) {
				return true;
			}

			current = this.findEntityInternal(current.parentId);
		}

		return false;
	}
}