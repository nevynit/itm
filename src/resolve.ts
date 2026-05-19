import type {
  ItmDiagnostic,
  ItmDocument,
  ItmEntity,
  ItmEntityType,
  ItmInclude,
  ItmOverlay,
  ItmPackage,
  ItmPackageUsage,
  ItmRelationship,
  ItmRelationshipType,
  ItmStyleRule,
  ItmUid,
  ItmValidationRule,
  ItmView,
  ItmViewpoint
} from "./model";
import type {
  ResolvedItmDiagnostic,
  ResolvedItmDocument,
  ResolvedItmDocumentIndexes,
  ResolvedItmEntity,
  ResolvedItmEntityType,
  ResolvedItmInclude,
  ResolvedItmOverlay,
  ResolvedItmPackage,
  ResolvedItmPackageUsage,
  ResolvedItmRelationship,
  ResolvedItmRelationshipType,
  ResolvedItmStyleRule,
  ResolvedItmValidationRule,
  ResolvedItmView,
  ResolvedItmViewpoint
} from "./resolved";

function mapByUid<T extends { uid: ItmUid }>(items: readonly T[]): Map<ItmUid, T> {
  return new Map(items.map((item) => [item.uid, item]));
}

function mapByName<T extends { name: string }>(items: readonly T[]): Map<string, T> {
  return new Map(items.map((item) => [item.name, item]));
}

function mapByQualifiedId<T extends { qualifiedId?: string }>(items: readonly T[]): Map<string, T> {
  const entries: Array<[string, T]> = [];

  for (const item of items) {
    if (item.qualifiedId) {
      entries.push([item.qualifiedId, item]);
    }
  }

  return new Map(entries);
}

function resolveStyleRefs(styleUids: readonly ItmUid[] | undefined, stylesByUid: Map<ItmUid, ResolvedItmStyleRule>): ResolvedItmStyleRule[] {
  if (!styleUids) {
    return [];
  }

  return styleUids
    .map((uid) => stylesByUid.get(uid))
    .filter((style): style is ResolvedItmStyleRule => Boolean(style));
}

function resolveEntityTypes(
  entityTypes: readonly ItmEntityType[] | undefined,
  stylesByUid: Map<ItmUid, ResolvedItmStyleRule>
): ResolvedItmEntityType[] {
  if (!entityTypes) {
    return [];
  }

  const resolved = entityTypes.map<ResolvedItmEntityType>((entityType) => ({
    ...entityType,
    superTypes: [],
    defaultStyles: resolveStyleRefs(entityType.defaultStyleUids, stylesByUid)
  }));
  const byName = mapByName(resolved);

  for (const entityType of resolved) {
    entityType.superTypes = (entityTypes.find((candidate) => candidate.uid === entityType.uid)?.superTypeRefs ?? [])
      .map((name) => byName.get(name))
      .filter((value): value is ResolvedItmEntityType => Boolean(value));
  }

  return resolved;
}

function resolveRelationshipTypes(
  relationshipTypes: readonly ItmRelationshipType[] | undefined,
  entityTypesByName: Map<string, ResolvedItmEntityType>,
  stylesByUid: Map<ItmUid, ResolvedItmStyleRule>
): ResolvedItmRelationshipType[] {
  if (!relationshipTypes) {
    return [];
  }

  const resolved = relationshipTypes.map<ResolvedItmRelationshipType>((relationshipType) => ({
    ...relationshipType,
    superTypes: [],
    sourceTypes: (relationshipType.sourceTypeRefs ?? [])
      .map((name) => entityTypesByName.get(name))
      .filter((value): value is ResolvedItmEntityType => Boolean(value)),
    targetTypes: (relationshipType.targetTypeRefs ?? [])
      .map((name) => entityTypesByName.get(name))
      .filter((value): value is ResolvedItmEntityType => Boolean(value)),
    inverseType: undefined,
    defaultStyles: resolveStyleRefs(relationshipType.defaultStyleUids, stylesByUid)
  }));
  const byName = mapByName(resolved);

  for (const relationshipType of resolved) {
    const source = relationshipTypes.find((candidate) => candidate.uid === relationshipType.uid);
    relationshipType.superTypes = (source?.superTypeRefs ?? [])
      .map((name) => byName.get(name))
      .filter((value): value is ResolvedItmRelationshipType => Boolean(value));
    relationshipType.inverseType = source?.inverseTypeRef ? byName.get(source.inverseTypeRef) : undefined;
  }

  return resolved;
}

function resolveViewpoints(
  viewpoints: readonly ItmViewpoint[] | undefined,
  stylesByUid: Map<ItmUid, ResolvedItmStyleRule>
): ResolvedItmViewpoint[] {
  if (!viewpoints) {
    return [];
  }

  return viewpoints.map((viewpoint) => ({
    ...viewpoint,
    styles: resolveStyleRefs(viewpoint.styleUids, stylesByUid)
  }));
}

function resolveViews(views: readonly ItmView[] | undefined, viewpointsByName: Map<string, ResolvedItmViewpoint>): ResolvedItmView[] {
  if (!views) {
    return [];
  }

  return views.map((view) => ({
    ...view,
    viewpoint: viewpointsByName.get(view.viewpointRef)
  }));
}

function resolvePackages(
  packages: readonly ItmPackage[] | undefined,
  stylesByUid: Map<ItmUid, ResolvedItmStyleRule>,
  validationRules: readonly ResolvedItmValidationRule[]
): ResolvedItmPackage[] {
  if (!packages) {
    return [];
  }

  return packages.map((pkg) => {
    const entityTypes = resolveEntityTypes(pkg.entityTypes, stylesByUid);
    const entityTypesByName = mapByName(entityTypes);
    const relationshipTypes = resolveRelationshipTypes(pkg.relationshipTypes, entityTypesByName, stylesByUid);
    const viewpoints = resolveViewpoints(pkg.viewpoints, stylesByUid);

    return {
      ...pkg,
      entityTypes,
      relationshipTypes,
      validationRules: pkg.validationRules
        ? validationRules.filter((rule) => pkg.validationRules?.some((candidate) => candidate.uid === rule.uid))
        : [],
      styles: pkg.styles ?? [],
      viewpoints
    };
  });
}

function resolveEntityRelations(
  entities: readonly ResolvedItmEntity[],
  relationships: readonly ResolvedItmRelationship[],
  overlays: readonly ResolvedItmOverlay[]
): void {
  const entitiesByUid = mapByUid(entities);
  const relationshipsByUid = mapByUid(relationships);
  const overlaysByUid = mapByUid(overlays);

  for (const entity of entities) {
    const source = entity as ItmEntity;
    entity.parent = source.parentId ? entitiesByUid.get(source.parentId) : undefined;
    entity.children = (source.childIds ?? [])
      .map((uid) => entitiesByUid.get(uid))
      .filter((value): value is ResolvedItmEntity => Boolean(value));
    entity.incoming = (source.incomingRelationshipIds ?? [])
      .map((uid) => relationshipsByUid.get(uid))
      .filter((value): value is ResolvedItmRelationship => Boolean(value));
    entity.outgoing = (source.outgoingRelationshipIds ?? [])
      .map((uid) => relationshipsByUid.get(uid))
      .filter((value): value is ResolvedItmRelationship => Boolean(value));
    entity.overlays = (source.overlayIds ?? [])
      .map((uid) => overlaysByUid.get(uid))
      .filter((value): value is ResolvedItmOverlay => Boolean(value));
  }
}

function resolveRelationships(
  relationships: readonly ItmRelationship[],
  entitiesByUid: Map<ItmUid, ResolvedItmEntity>,
  overlaysByUid: Map<ItmUid, ResolvedItmOverlay>
): ResolvedItmRelationship[] {
  return relationships
    .map<ResolvedItmRelationship | undefined>((relationship) => {
      const source = entitiesByUid.get(relationship.sourceId);

      if (!source) {
        return undefined;
      }

      return {
        ...relationship,
        source,
        target: relationship.targetId ? entitiesByUid.get(relationship.targetId) : undefined,
        overlays: (relationship.overlayIds ?? [])
          .map((uid) => overlaysByUid.get(uid))
          .filter((value): value is ResolvedItmOverlay => Boolean(value))
      };
    })
    .filter((relationship): relationship is ResolvedItmRelationship => Boolean(relationship));
}

function resolveOverlays(
  overlays: readonly ItmOverlay[] | undefined,
  entitiesByUid: Map<ItmUid, ResolvedItmEntity>
): ResolvedItmOverlay[] {
  if (!overlays) {
    return [];
  }

  return overlays.map((overlay) => ({
    ...overlay,
    target: overlay.targetUid ? entitiesByUid.get(overlay.targetUid) : undefined,
    relationshipAdditions: []
  }));
}

function resolveIncludes(includes: readonly ItmInclude[] | undefined): ResolvedItmInclude[] {
  return (includes ?? []).map((include) => ({
    ...include,
    resolvedDocument: undefined
  }));
}

function resolvePackageUsages(
  packageUsages: readonly ItmPackageUsage[] | undefined,
  packagesByUid: Map<ItmUid, ResolvedItmPackage>
): ResolvedItmPackageUsage[] {
  return (packageUsages ?? []).map((packageUsage) => ({
    ...packageUsage,
    package: packageUsage.packageUid ? packagesByUid.get(packageUsage.packageUid) : undefined
  }));
}

function resolveDiagnostics(
  diagnostics: readonly ItmDiagnostic[] | undefined,
  entitiesByUid: Map<ItmUid, ResolvedItmEntity>,
  relationshipsByUid: Map<ItmUid, ResolvedItmRelationship>,
  validationRulesByUid: Map<ItmUid, ResolvedItmValidationRule>,
  viewsByUid: Map<ItmUid, ResolvedItmView>,
  viewpointsByUid: Map<ItmUid, ResolvedItmViewpoint>,
  packagesByUid: Map<ItmUid, ResolvedItmPackage>,
  document: ItmDocument
): ResolvedItmDiagnostic[] {
  return (diagnostics ?? []).map((diagnostic) => ({
    ...diagnostic,
    entity: diagnostic.entityUid ? entitiesByUid.get(diagnostic.entityUid) : undefined,
    relationship: diagnostic.relationshipUid ? relationshipsByUid.get(diagnostic.relationshipUid) : undefined,
    directive: diagnostic.directiveName
      ? document.directives?.find((directive) => directive.name === diagnostic.directiveName)
      : undefined,
    rule: diagnostic.ruleUid ? validationRulesByUid.get(diagnostic.ruleUid) : undefined,
    view: diagnostic.viewUid ? viewsByUid.get(diagnostic.viewUid) : undefined,
    viewpoint: diagnostic.viewpointUid ? viewpointsByUid.get(diagnostic.viewpointUid) : undefined,
    namespace: diagnostic.namespacePrefix
      ? document.namespaces?.find((namespace) => namespace.prefix === diagnostic.namespacePrefix)
      : undefined,
    package: diagnostic.packageUid ? packagesByUid.get(diagnostic.packageUid) : undefined
  }));
}

export function createDocumentIndexes(document: ItmDocument): ResolvedItmDocumentIndexes {
  const stylesByUid = mapByUid(document.styles ?? []);
  const entityTypes = resolveEntityTypes(document.entityTypes, stylesByUid);
  const entityTypesByName = mapByName(entityTypes);
  const relationshipTypes = resolveRelationshipTypes(document.relationshipTypes, entityTypesByName, stylesByUid);
  const viewpoints = resolveViewpoints(document.viewpoints, stylesByUid);
  const views = resolveViews(document.views, mapByName(viewpoints));
  const packages = resolvePackages(document.packages, stylesByUid, document.validationRules ?? []);

  return {
    entitiesByUid: new Map(),
    entitiesByQualifiedId: new Map(),
    relationshipsByUid: new Map(),
    relationshipsByQualifiedId: new Map(),
    namespacesByPrefix: new Map((document.namespaces ?? []).map((namespace) => [namespace.prefix, namespace])),
    viewpointsByName: mapByName(viewpoints),
    viewsByName: mapByName(views),
    entityTypesByName: entityTypesByName,
    relationshipTypesByName: mapByName(relationshipTypes),
    packagesByUid: mapByUid(packages)
  };
}

export function resolveDocument(document: ItmDocument): ResolvedItmDocument {
  const resolvedEntities = document.entities.map<ResolvedItmEntity>((entity) => ({
    ...entity,
    children: [],
    incoming: [],
    outgoing: [],
    overlays: []
  }));
  const entitiesByUid = mapByUid(resolvedEntities);
  const overlays = resolveOverlays(document.overlays, entitiesByUid);
  const overlaysByUid = mapByUid(overlays);
  const relationships = resolveRelationships(document.relationships, entitiesByUid, overlaysByUid);

  resolveEntityRelations(resolvedEntities, relationships, overlays);

  const styles = document.styles ?? [];
  const stylesByUid = mapByUid(styles);
  const entityTypes = resolveEntityTypes(document.entityTypes, stylesByUid);
  const entityTypesByName = mapByName(entityTypes);
  const relationshipTypes = resolveRelationshipTypes(document.relationshipTypes, entityTypesByName, stylesByUid);
  const viewpoints = resolveViewpoints(document.viewpoints, stylesByUid);
  const viewpointsByName = mapByName(viewpoints);
  const views = resolveViews(document.views, viewpointsByName);
  const viewByUid = mapByUid(views);
  const validationRules = (document.validationRules ?? []) as ResolvedItmValidationRule[];
  const validationRulesByUid = mapByUid(validationRules);
  const packages = resolvePackages(document.packages, stylesByUid, validationRules);
  const packagesByUid = mapByUid(packages);
  const packageUsages = resolvePackageUsages(document.packageUsages, packagesByUid);
  const includes = resolveIncludes(document.includes);
  const relationshipsByUid = mapByUid(relationships);
  const diagnostics = resolveDiagnostics(
    document.diagnostics,
    entitiesByUid,
    relationshipsByUid,
    validationRulesByUid,
    viewByUid,
    mapByUid(viewpoints),
    packagesByUid,
    document
  );

  const indexes: ResolvedItmDocumentIndexes = {
    entitiesByUid,
    entitiesByQualifiedId: mapByQualifiedId(resolvedEntities),
    relationshipsByUid,
    relationshipsByQualifiedId: mapByQualifiedId(relationships),
    namespacesByPrefix: new Map((document.namespaces ?? []).map((namespace) => [namespace.prefix, namespace])),
    viewpointsByName,
    viewsByName: mapByName(views),
    entityTypesByName,
    relationshipTypesByName: mapByName(relationshipTypes),
    packagesByUid
  };

  return {
    ...document,
    entities: resolvedEntities,
    relationships,
    entityTypes: entityTypes.length > 0 ? entityTypes : undefined,
    relationshipTypes: relationshipTypes.length > 0 ? relationshipTypes : undefined,
    viewpoints: viewpoints.length > 0 ? viewpoints : undefined,
    views: views.length > 0 ? views : undefined,
    includes: includes.length > 0 ? includes : undefined,
    packages: packages.length > 0 ? packages : undefined,
    packageUsages: packageUsages.length > 0 ? packageUsages : undefined,
    overlays: overlays.length > 0 ? overlays : undefined,
    diagnostics: diagnostics.length > 0 ? diagnostics : undefined,
    indexes
  };
}

export function getEntityByUid(document: ResolvedItmDocument, uid: ItmUid): ResolvedItmEntity | undefined {
  return document.indexes.entitiesByUid.get(uid);
}

export function getRelationshipByUid(document: ResolvedItmDocument, uid: ItmUid): ResolvedItmRelationship | undefined {
  return document.indexes.relationshipsByUid.get(uid);
}

export function isResolvedDocument(value: ItmDocument | ResolvedItmDocument): value is ResolvedItmDocument {
  return "indexes" in value;
}