import type {
  ItmDiagnostic,
  ItmDocument,
  ItmEntity,
  ItmRelationship,
  ItmValue,
  ItmView,
  ItmViewpoint
} from "./model";
import { isResolvedDocument, resolveDocument } from "./resolve";
import type { ResolvedItmDocument, ResolvedItmEntity, ResolvedItmRelationship } from "./resolved";

export interface ItmTypeHierarchy {
  entityAncestorsByName: ReadonlyMap<string, readonly string[]>;
  entityDescendantsByName: ReadonlyMap<string, readonly string[]>;
  relationshipAncestorsByName: ReadonlyMap<string, readonly string[]>;
  relationshipDescendantsByName: ReadonlyMap<string, readonly string[]>;
}

export interface CanonicalGraphNode {
  id: string;
  uid: string;
  qualifiedId?: string;
  label: string;
  typeRef?: string;
  description?: string;
  parentId?: string;
  properties: Record<string, ItmValue>;
}

export interface CanonicalGraphEdge {
  id: string;
  uid: string;
  relationshipId?: string;
  sourceId: string;
  targetId?: string;
  targetRelationshipId?: string;
  targetRef?: string;
  typeRef: string;
  relationshipKind: ItmRelationship["relationshipKind"];
  implicit: boolean;
  properties: Record<string, ItmValue>;
}

export interface CanonicalGraphOrganization {
  id: string;
  label: string;
  children: CanonicalGraphOrganization[];
}

export interface CanonicalGraphView {
  id: string;
  name: string;
  title?: string;
  viewpointRef: string;
  viewpoint?: ItmViewpoint;
  parameters?: Record<string, ItmValue>;
  notes?: string[];
}

export interface CanonicalGraphModel {
  metadata?: ItmDocument["metadata"];
  nodes: CanonicalGraphNode[];
  edges: CanonicalGraphEdge[];
  organizations: CanonicalGraphOrganization[];
  views: CanonicalGraphView[];
  diagnostics: ItmDiagnostic[];
}

export interface CreateCanonicalGraphOptions {
  includeImplicitRelationships?: boolean;
}

function asResolvedDocument(document: ItmDocument | ResolvedItmDocument): ResolvedItmDocument {
  return isResolvedDocument(document) ? document : resolveDocument(document);
}

function localName(name: string): string {
  const parts = name.split("::");
  return parts[parts.length - 1] ?? name;
}

function relationshipIdentitySegment(value: string | undefined): string {
  const normalized = (value ?? "unknown")
    .trim()
    .replace(/[^A-Za-z0-9]+/gu, "_")
    .replace(/^_+|_+$/gu, "")
    .toLowerCase();

  return normalized.length > 0 ? normalized : "unknown";
}

function collectAncestors(name: string, parentsByName: ReadonlyMap<string, readonly string[]>, trail = new Set<string>()): string[] {
  const directParents = parentsByName.get(name) ?? [];
  const collected = new Set<string>();

  for (const parent of directParents) {
    if (trail.has(parent)) {
      continue;
    }

    collected.add(parent);
    const nextTrail = new Set(trail);
    nextTrail.add(name);

    for (const ancestor of collectAncestors(parent, parentsByName, nextTrail)) {
      collected.add(ancestor);
    }
  }

  return [...collected];
}

function invertGraph(parentsByName: ReadonlyMap<string, readonly string[]>): Map<string, string[]> {
  const descendantsByName = new Map<string, string[]>();

  for (const [name, parents] of parentsByName.entries()) {
    if (!descendantsByName.has(name)) {
      descendantsByName.set(name, []);
    }

    for (const parent of parents) {
      const descendants = descendantsByName.get(parent) ?? [];
      descendants.push(name);
      descendantsByName.set(parent, descendants);
    }
  }

  return descendantsByName;
}

function collectDescendants(name: string, childrenByName: ReadonlyMap<string, readonly string[]>, trail = new Set<string>()): string[] {
  const directChildren = childrenByName.get(name) ?? [];
  const collected = new Set<string>();

  for (const child of directChildren) {
    if (trail.has(child)) {
      continue;
    }

    collected.add(child);
    const nextTrail = new Set(trail);
    nextTrail.add(name);

    for (const descendant of collectDescendants(child, childrenByName, nextTrail)) {
      collected.add(descendant);
    }
  }

  return [...collected];
}

function buildHierarchyMaps(typeNames: readonly string[], parentsByName: ReadonlyMap<string, readonly string[]>): {
  ancestorsByName: Map<string, readonly string[]>;
  descendantsByName: Map<string, readonly string[]>;
} {
  const childrenByName = invertGraph(parentsByName);
  const ancestorsByName = new Map<string, readonly string[]>();
  const descendantsByName = new Map<string, readonly string[]>();

  for (const name of typeNames) {
    ancestorsByName.set(name, collectAncestors(name, parentsByName));
    descendantsByName.set(name, collectDescendants(name, childrenByName));
  }

  return { ancestorsByName, descendantsByName };
}

function entityReferenceId(entity: Pick<ResolvedItmEntity, "id" | "qualifiedId" | "uid">): string {
  return entity.id ?? entity.qualifiedId ?? entity.uid;
}

function entityDescription(entity: Pick<ResolvedItmEntity, "description">): string | undefined {
  return entity.description?.text;
}

function targetRelationshipByReference(document: ResolvedItmDocument, reference: string | undefined): ResolvedItmRelationship | undefined {
  if (!reference) {
    return undefined;
  }

  return document.relationships.find(
    (relationship) =>
      relationship.uid === reference
      || relationship.id === reference
      || getStableRelationshipId(relationship) === reference
  );
}

export function createTypeHierarchy(document: ItmDocument | ResolvedItmDocument): ItmTypeHierarchy {
  const resolved = asResolvedDocument(document);
  const entityTypes = resolved.entityTypes ?? [];
  const relationshipTypes = resolved.relationshipTypes ?? [];
  const entityParentsByName = new Map(entityTypes.map((type) => [type.name, type.superTypes.map((superType) => superType.name)]));
  const relationshipParentsByName = new Map(
    relationshipTypes.map((type) => [type.name, type.superTypes.map((superType) => superType.name)])
  );

  const entityMaps = buildHierarchyMaps(entityTypes.map((type) => type.name), entityParentsByName);
  const relationshipMaps = buildHierarchyMaps(relationshipTypes.map((type) => type.name), relationshipParentsByName);

  return {
    entityAncestorsByName: entityMaps.ancestorsByName,
    entityDescendantsByName: entityMaps.descendantsByName,
    relationshipAncestorsByName: relationshipMaps.ancestorsByName,
    relationshipDescendantsByName: relationshipMaps.descendantsByName
  };
}

export function expandEntityTypeSelection(
  document: ItmDocument | ResolvedItmDocument,
  typeRefs: readonly string[],
  includeSubtypes = true
): string[] {
  const hierarchy = createTypeHierarchy(document);
  const expanded = new Set<string>();

  for (const typeRef of typeRefs) {
    expanded.add(typeRef);

    if (!includeSubtypes) {
      continue;
    }

    for (const descendant of hierarchy.entityDescendantsByName.get(typeRef) ?? []) {
      expanded.add(descendant);
    }
  }

  return [...expanded];
}

export function expandRelationshipTypeSelection(
  document: ItmDocument | ResolvedItmDocument,
  typeRefs: readonly string[],
  includeSubtypes = true
): string[] {
  const hierarchy = createTypeHierarchy(document);
  const expanded = new Set<string>();

  for (const typeRef of typeRefs) {
    expanded.add(typeRef);

    if (!includeSubtypes) {
      continue;
    }

    for (const descendant of hierarchy.relationshipDescendantsByName.get(typeRef) ?? []) {
      expanded.add(descendant);
    }
  }

  return [...expanded];
}

export function isEntityOfType(
  document: ItmDocument | ResolvedItmDocument,
  entity: Pick<ItmEntity, "typeRef">,
  typeRef: string,
  includeSubtypes = true
): boolean {
  if (!entity.typeRef) {
    return false;
  }

  if (entity.typeRef === typeRef) {
    return true;
  }

  if (!includeSubtypes) {
    return false;
  }

  const hierarchy = createTypeHierarchy(document);
  return (hierarchy.entityAncestorsByName.get(entity.typeRef) ?? []).includes(typeRef);
}

export function isRelationshipOfType(
  document: ItmDocument | ResolvedItmDocument,
  relationship: Pick<ItmRelationship, "typeRef">,
  typeRef: string,
  includeSubtypes = true
): boolean {
  if (relationship.typeRef === typeRef) {
    return true;
  }

  if (!includeSubtypes) {
    return false;
  }

  const hierarchy = createTypeHierarchy(document);
  return (hierarchy.relationshipAncestorsByName.get(relationship.typeRef) ?? []).includes(typeRef);
}

export function getStableRelationshipId(
  relationship: Pick<ItmRelationship, "id" | "sourceRef" | "sourceId" | "targetRef" | "targetId" | "typeRef">,
  sequence?: number
): string {
  if (relationship.id) {
    return relationship.id;
  }

  const source = relationship.sourceRef ?? relationship.sourceId;
  const target = relationship.targetRef ?? relationship.targetId ?? (sequence !== undefined ? `sequence_${sequence}` : "unresolved");
  return [
    "rel",
    relationshipIdentitySegment(source),
    relationshipIdentitySegment(localName(relationship.typeRef)),
    relationshipIdentitySegment(target)
  ].join("_");
}

export function createCanonicalGraph(
  document: ItmDocument | ResolvedItmDocument,
  options: CreateCanonicalGraphOptions = {}
): CanonicalGraphModel {
  const resolved = asResolvedDocument(document);
  const includeImplicitRelationships = options.includeImplicitRelationships ?? false;
  const nodes = resolved.entities.map<CanonicalGraphNode>((entity) => ({
    id: entityReferenceId(entity),
    uid: entity.uid,
    ...(entity.qualifiedId ? { qualifiedId: entity.qualifiedId } : {}),
    label: entity.label,
    ...(entity.typeRef ? { typeRef: entity.typeRef } : {}),
    ...(entity.description?.text ? { description: entity.description.text } : {}),
    ...(entity.parent ? { parentId: entityReferenceId(entity.parent) } : {}),
    properties: { ...(entity.attributes?.values ?? {}) }
  }));

  const edges = resolved.relationships
    .filter((relationship) => includeImplicitRelationships || !relationship.implicit)
    .map<CanonicalGraphEdge>((relationship, index) => {
      const targetRelationship = targetRelationshipByReference(resolved, relationship.targetRef);

      return {
        id: getStableRelationshipId(relationship, index + 1),
        uid: relationship.uid,
        ...(relationship.id ? { relationshipId: relationship.id } : {}),
        sourceId: entityReferenceId(relationship.source),
        ...(relationship.target ? { targetId: entityReferenceId(relationship.target) } : {}),
        ...(targetRelationship ? { targetRelationshipId: getStableRelationshipId(targetRelationship) } : {}),
        ...(relationship.targetRef ? { targetRef: relationship.targetRef } : {}),
        typeRef: relationship.typeRef,
        relationshipKind: relationship.relationshipKind,
        implicit: relationship.implicit === true,
        properties: { ...(relationship.attributes?.values ?? {}) }
      };
    });

  const buildOrganization = (entity: ResolvedItmEntity): CanonicalGraphOrganization => ({
    id: entityReferenceId(entity),
    label: entity.label,
    children: entity.children.map((child) => buildOrganization(child))
  });

  const organizations = resolved.entities.filter((entity) => !entity.parent).map((entity) => buildOrganization(entity));
  const viewpointsByName = new Map((resolved.viewpoints ?? []).map((viewpoint) => [viewpoint.name, viewpoint]));
  const views = (resolved.views ?? []).map<CanonicalGraphView>((view: ItmView) => ({
    id: view.uid,
    name: view.name,
    ...(view.title ? { title: view.title } : {}),
    viewpointRef: view.viewpointRef,
    ...(viewpointsByName.get(view.viewpointRef) ? { viewpoint: viewpointsByName.get(view.viewpointRef)! } : {}),
    ...(view.parameters ? { parameters: view.parameters } : {}),
    ...(view.notes ? { notes: [...view.notes] } : {})
  }));

  return {
    ...(resolved.metadata ? { metadata: resolved.metadata } : {}),
    nodes,
    edges,
    organizations,
    views,
    diagnostics: [...(resolved.diagnostics ?? [])]
  };
}