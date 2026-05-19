import { parseDocument, type ParseItmOptions } from "./parse";

import type {
  ItmAttributeBag,
  ItmDescription,
  ItmDiagnostic,
  ItmDocument,
  ItmEntity,
  ItmInclude,
  ItmOverlay,
  ItmRelationship,
  ItmRepository,
  ItmUid,
  ItmValue,
  ItmViewDelta
} from "./model";

export interface ItmLoadedIncludeSource {
  text: string;
  uri?: string;
}

export interface ItmIncludeProviderContext {
  include: ItmInclude;
  sourceDocument: ItmDocument;
  resolvedTarget: string;
}

export interface ItmIncludeProvider {
  name?: string;
  load(target: string, context: ItmIncludeProviderContext): Promise<ItmLoadedIncludeSource | undefined> | ItmLoadedIncludeSource | undefined;
}

export interface ComposeDocumentOptions {
  uri?: string;
  parseOptions?: ParseItmOptions;
  includeProviders?: readonly ItmIncludeProvider[];
  maxIncludeDepth?: number;
}

const DUPLICATE_ENTITY_MESSAGE_PREFIX = "Duplicate entity id '";
const UNRESOLVED_TARGET_MESSAGE_PREFIX = "Unresolved relationship target '";
const OVERLAY_TARGET_MESSAGE_PREFIX = "Overlay target '";

function cloneValue<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

function createDiagnostic(document: ItmDocument, message: string, severity: ItmDiagnostic["severity"] = "error"): ItmDiagnostic {
  return {
    uid: `diagnostic:${document.diagnostics?.length ?? 0}:compose`,
    source: "itm.compose",
    severity,
    message
  };
}

function addDiagnostic(document: ItmDocument, message: string, severity: ItmDiagnostic["severity"] = "error"): void {
  const diagnostics = sanitizeExistingDiagnostics(document);
  diagnostics.push(createDiagnostic(document, message, severity));
  document.diagnostics = diagnostics;
}

function sanitizeExistingDiagnostics(document: ItmDocument): ItmDiagnostic[] {
  return (document.diagnostics ?? []).filter(
    (diagnostic) =>
      !diagnostic.message.startsWith(DUPLICATE_ENTITY_MESSAGE_PREFIX)
      && !diagnostic.message.startsWith(UNRESOLVED_TARGET_MESSAGE_PREFIX)
      && !diagnostic.message.startsWith(OVERLAY_TARGET_MESSAGE_PREFIX)
  );
}

function looksLikeUrl(value: string): boolean {
  return /^[A-Za-z][A-Za-z0-9+.-]*:\/\//u.test(value);
}

function looksLikeWindowsPath(value: string): boolean {
  return /^[A-Za-z]:[\\/]/u.test(value);
}

function ensureTrailingSlash(value: string): string {
  return /[\\/]$/u.test(value) ? value : `${value}/`;
}

function joinLocator(base: string, suffix: string): string {
  const normalizedSuffix = suffix.replace(/^[/\\]+/u, "");

  if (looksLikeUrl(base)) {
    return new URL(normalizedSuffix, ensureTrailingSlash(base)).toString();
  }

  return `${base.replace(/[\\/]+$/u, "")}/${normalizedSuffix}`;
}

function resolveRepositoryTarget(target: string, repositories: readonly ItmRepository[] | undefined): string {
  const match = target.match(/^([A-Za-z][A-Za-z0-9_-]*):(.*)$/u);

  if (!match || looksLikeUrl(target) || looksLikeWindowsPath(target)) {
    return target;
  }

  const repositoryName = match[1] ?? "";
  const repositoryPath = match[2] ?? "";
  const repository = repositories?.find((candidate) => candidate.name === repositoryName);

  if (!repository) {
    return target;
  }

  return joinLocator(repository.location, repositoryPath);
}

function mergeCollections<T>(...values: Array<readonly T[] | undefined>): T[] | undefined {
  const merged = values.flatMap((value) => value ?? []);
  return merged.length > 0 ? merged : undefined;
}

function mergeDocuments(root: ItmDocument, included: readonly ItmDocument[]): ItmDocument {
  const clones = [cloneValue(root), ...included.map((document) => cloneValue(document))];
  const [base, ...rest] = clones;

  if (!base) {
    return cloneValue(root);
  }

  const namespaces = mergeCollections(base.namespaces, ...rest.map((document) => document.namespaces));
  const entityTypes = mergeCollections(base.entityTypes, ...rest.map((document) => document.entityTypes));
  const relationshipTypes = mergeCollections(base.relationshipTypes, ...rest.map((document) => document.relationshipTypes));
  const selectors = mergeCollections(base.selectors, ...rest.map((document) => document.selectors));
  const validationRules = mergeCollections(base.validationRules, ...rest.map((document) => document.validationRules));
  const pluginRequirements = mergeCollections(base.pluginRequirements, ...rest.map((document) => document.pluginRequirements));
  const styles = mergeCollections(base.styles, ...rest.map((document) => document.styles));
  const viewpoints = mergeCollections(base.viewpoints, ...rest.map((document) => document.viewpoints));
  const views = mergeCollections(base.views, ...rest.map((document) => document.views));
  const includes = mergeCollections(base.includes, ...rest.map((document) => document.includes));
  const packages = mergeCollections(base.packages, ...rest.map((document) => document.packages));
  const packageUsages = mergeCollections(base.packageUsages, ...rest.map((document) => document.packageUsages));
  const repositories = mergeCollections(base.repositories, ...rest.map((document) => document.repositories));
  const overlays = mergeCollections(base.overlays, ...rest.map((document) => document.overlays));
  const directives = mergeCollections(base.directives, ...rest.map((document) => document.directives));
  const diagnostics = mergeCollections(base.diagnostics, ...rest.map((document) => document.diagnostics));

  return {
    ...base,
    entities: clones.flatMap((document) => document.entities),
    relationships: clones.flatMap((document) => document.relationships),
    ...(namespaces ? { namespaces } : {}),
    ...(entityTypes ? { entityTypes } : {}),
    ...(relationshipTypes ? { relationshipTypes } : {}),
    ...(selectors ? { selectors } : {}),
    ...(validationRules ? { validationRules } : {}),
    ...(pluginRequirements ? { pluginRequirements } : {}),
    ...(styles ? { styles } : {}),
    ...(viewpoints ? { viewpoints } : {}),
    ...(views ? { views } : {}),
    ...(includes ? { includes } : {}),
    ...(packages ? { packages } : {}),
    ...(packageUsages ? { packageUsages } : {}),
    ...(repositories ? { repositories } : {}),
    ...(overlays ? { overlays } : {}),
    ...(directives ? { directives } : {}),
    ...(diagnostics ? { diagnostics } : {})
  };
}

function asRecord(value: ItmValue | undefined): Record<string, ItmValue> | undefined {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    return undefined;
  }

  return value as Record<string, ItmValue>;
}

function splitQualifiedName(name: string): { localName: string } {
  const parts = name.split("::");
  return { localName: parts[parts.length - 1] ?? name };
}

function resolveEntityReference(reference: string | undefined, entitiesByQualifiedId: Map<string, ItmEntity>, entitiesByLocalId: Map<string, ItmEntity>): ItmEntity | undefined {
  if (!reference) {
    return undefined;
  }

  return entitiesByQualifiedId.get(reference) ?? entitiesByLocalId.get(splitQualifiedName(reference).localName);
}

function resolveRelationshipReference(reference: string | undefined, relationshipsByUid: Map<string, ItmRelationship>, relationshipsById: Map<string, ItmRelationship>): ItmRelationship | undefined {
  if (!reference) {
    return undefined;
  }

  return relationshipsByUid.get(reference) ?? relationshipsById.get(reference);
}

function appendValue(existing: ItmValue | undefined, incoming: ItmValue | undefined): ItmValue | undefined {
  if (incoming === undefined) {
    return existing;
  }

  if (existing === undefined) {
    return Array.isArray(incoming) ? [...incoming] : [incoming];
  }

  const existingArray = Array.isArray(existing) ? [...existing] : [existing];
  const incomingArray = Array.isArray(incoming) ? incoming : [incoming];
  return [...existingArray, ...incomingArray];
}

function mergeRecordValues(existing: ItmValue | undefined, incoming: ItmValue | undefined): ItmValue | undefined {
  const existingRecord = asRecord(existing);
  const incomingRecord = asRecord(incoming);

  if (!existingRecord || !incomingRecord) {
    return incoming ?? existing;
  }

  return {
    ...existingRecord,
    ...incomingRecord
  };
}

function applyAttributePatches(bag: ItmAttributeBag | undefined, overlay: ItmOverlay): ItmAttributeBag | undefined {
  if (!overlay.attributePatches || overlay.attributePatches.length === 0) {
    return bag;
  }

  const result: ItmAttributeBag = bag ? cloneValue(bag) : { values: {} };

  for (const patch of overlay.attributePatches) {
    if (patch.operation === "delete") {
      delete result.values[patch.key];
      continue;
    }

    if (patch.operation === "append") {
      const appendedValue = appendValue(result.values[patch.key], patch.value);

      if (appendedValue !== undefined) {
        result.values[patch.key] = appendedValue;
      }

      continue;
    }

    if (patch.operation === "merge") {
      const mergedValue = mergeRecordValues(result.values[patch.key], patch.value);

      if (mergedValue !== undefined) {
        result.values[patch.key] = mergedValue;
      }

      continue;
    }

    if (patch.value !== undefined) {
      result.values[patch.key] = patch.value;
    }
  }

  return result;
}

function applyDescriptionPatch(description: ItmDescription | undefined, overlay: ItmOverlay): ItmDescription | undefined {
  if (!overlay.descriptionPatch) {
    return description;
  }

  if (overlay.descriptionPatch.operation === "append" && description) {
    return {
      ...description,
      text: `${description.text}\n${overlay.descriptionPatch.text}`
    };
  }

  return {
    format: "markdown",
    text: overlay.descriptionPatch.text
  };
}

function applyOverlays(document: ItmDocument): ItmDocument {
  const composed = cloneValue(document);
  const diagnostics = sanitizeExistingDiagnostics(composed);
  const entitiesByQualifiedId = new Map<string, ItmEntity>();
  const entitiesByLocalId = new Map<string, ItmEntity>();

  for (const entity of composed.entities) {
    if (entity.qualifiedId) {
      entitiesByQualifiedId.set(entity.qualifiedId, entity);
    }

    if (entity.id) {
      entitiesByLocalId.set(entity.id, entity);
    }
  }

  const addedRelationships: ItmRelationship[] = [];

  for (const overlay of composed.overlays ?? []) {
    const targetEntity = overlay.targetKind === "entity"
      ? resolveEntityReference(overlay.targetRef, entitiesByQualifiedId, entitiesByLocalId)
      : undefined;

    if (!targetEntity) {
      diagnostics.push(createDiagnostic(composed, `Overlay target '${overlay.targetRef}' was not found.`));
      continue;
    }

    overlay.targetUid = targetEntity.uid;
    targetEntity.overlayIds = [...(targetEntity.overlayIds ?? []), overlay.uid];

    if (overlay.replacementLabel !== undefined) {
      targetEntity.label = overlay.replacementLabel;
    }

    if (overlay.replacementTypeRef !== undefined) {
      targetEntity.typeRef = overlay.replacementTypeRef;
    }

    const patchedAttributes = applyAttributePatches(targetEntity.attributes, overlay);

    if (patchedAttributes) {
      targetEntity.attributes = patchedAttributes;
    } else {
      delete targetEntity.attributes;
    }

    const patchedDescription = applyDescriptionPatch(targetEntity.description, overlay);

    if (patchedDescription) {
      targetEntity.description = patchedDescription;
    } else {
      delete targetEntity.description;
    }

    for (const addition of overlay.relationshipAdditions ?? []) {
      addedRelationships.push({
        ...addition,
        sourceId: targetEntity.uid,
        ...(targetEntity.qualifiedId ? { sourceRef: targetEntity.qualifiedId } : {}),
        overlayIds: [...(addition.overlayIds ?? []), overlay.uid]
      });
    }
  }

  composed.relationships = [...composed.relationships, ...addedRelationships];

  if (diagnostics.length > 0) {
    composed.diagnostics = diagnostics;
  } else {
    delete composed.diagnostics;
  }

  return composed;
}

function resolveViewDeltaTargets(document: ItmDocument): void {
  const entitiesByQualifiedId = new Map<string, ItmEntity>();
  const entitiesByLocalId = new Map<string, ItmEntity>();
  const relationshipsByUid = new Map<string, ItmRelationship>();
  const relationshipsById = new Map<string, ItmRelationship>();

  for (const entity of document.entities) {
    if (entity.qualifiedId) {
      entitiesByQualifiedId.set(entity.qualifiedId, entity);
    }

    if (entity.id) {
      entitiesByLocalId.set(entity.id, entity);
    }
  }

  for (const relationship of document.relationships) {
    relationshipsByUid.set(relationship.uid, relationship);

    if (relationship.id) {
      relationshipsById.set(relationship.id, relationship);
    }
  }

  for (const view of document.views ?? []) {
    for (const delta of view.deltas ?? []) {
      if (!("targetRef" in delta) || !delta.targetRef) {
        continue;
      }

      if ("targetKind" in delta && delta.targetKind === "relationship") {
        const targetUid = resolveRelationshipReference(delta.targetRef, relationshipsByUid, relationshipsById)?.uid;

        if (targetUid) {
          delta.targetUid = targetUid;
        }

        continue;
      }

      const targetUid = resolveEntityReference(delta.targetRef, entitiesByQualifiedId, entitiesByLocalId)?.uid;

      if (targetUid) {
        delta.targetUid = targetUid;
      }
    }
  }
}

function rebuildReferences(document: ItmDocument): ItmDocument {
  const composed = cloneValue(document);
  const diagnostics = sanitizeExistingDiagnostics(composed);
  const entitiesByUid = new Map<ItmUid, ItmEntity>();
  const entitiesByQualifiedId = new Map<string, ItmEntity>();
  const entitiesByLocalId = new Map<string, ItmEntity>();

  for (const entity of composed.entities) {
    entity.incomingRelationshipIds = [];
    entity.outgoingRelationshipIds = [];

    entitiesByUid.set(entity.uid, entity);

    if (entity.qualifiedId) {
      if (entitiesByQualifiedId.has(entity.qualifiedId)) {
        diagnostics.push(createDiagnostic(composed, `Duplicate entity id '${entity.qualifiedId}'.`));
      }

      entitiesByQualifiedId.set(entity.qualifiedId, entity);
    }

    if (entity.id) {
      entitiesByLocalId.set(entity.id, entity);
    }
  }

  for (const relationship of composed.relationships) {
    const source = entitiesByUid.get(relationship.sourceId)
      ?? resolveEntityReference(relationship.sourceRef, entitiesByQualifiedId, entitiesByLocalId);

    if (source) {
      relationship.sourceId = source.uid;

      if (source.qualifiedId) {
        relationship.sourceRef = source.qualifiedId;
      } else {
        delete relationship.sourceRef;
      }

      source.outgoingRelationshipIds?.push(relationship.uid);
    }

    if (relationship.targetRef) {
      const target = resolveEntityReference(relationship.targetRef, entitiesByQualifiedId, entitiesByLocalId);

      if (target) {
        relationship.targetId = target.uid;
      } else {
        delete relationship.targetId;
        diagnostics.push(createDiagnostic(composed, `Unresolved relationship target '${relationship.targetRef}'.`));
      }
    }

    const targetEntity = relationship.targetId ? entitiesByUid.get(relationship.targetId) : undefined;
    targetEntity?.incomingRelationshipIds?.push(relationship.uid);
  }

  composed.roots = composed.entities.filter((entity) => !entity.parentId).map((entity) => entity.uid);

  if (diagnostics.length > 0) {
    composed.diagnostics = diagnostics;
  } else {
    delete composed.diagnostics;
  }

  resolveViewDeltaTargets(composed);

  return composed;
}

async function loadIncludeDocument(
  include: ItmInclude,
  sourceDocument: ItmDocument,
  options: ComposeDocumentOptions
): Promise<{ include: ItmInclude; document?: ItmDocument }> {
  const resolvedTarget = resolveRepositoryTarget(include.target, sourceDocument.repositories);
  const providers = options.includeProviders ?? [];

  for (const provider of providers) {
    let loaded: ItmLoadedIncludeSource | undefined;

    try {
      loaded = await provider.load(resolvedTarget, {
        include,
        sourceDocument,
        resolvedTarget
      });
    } catch {
      loaded = undefined;
    }

    if (!loaded) {
      continue;
    }

    return {
      include: {
        ...include,
        status: "resolved"
      },
      document: parseDocument(loaded.text, {
        ...(options.parseOptions ?? {}),
        ...(loaded.uri ? { uri: loaded.uri } : {})
      })
    };
  }

  return {
    include: {
      ...include,
      status: providers.length > 0 ? "missing" : "unresolved"
    }
  };
}

async function expandIncludes(
  document: ItmDocument,
  options: ComposeDocumentOptions,
  stack: string[] = []
): Promise<ItmDocument> {
  const maxIncludeDepth = options.maxIncludeDepth ?? 16;
  const currentDocument = cloneValue(document);

  if (stack.length >= maxIncludeDepth) {
    currentDocument.diagnostics = [
      ...sanitizeExistingDiagnostics(currentDocument),
      createDiagnostic(currentDocument, `Include depth exceeded the configured limit of ${maxIncludeDepth}.`)
    ];
    return currentDocument;
  }

  const expandedDocuments: ItmDocument[] = [];
  const updatedIncludes: ItmInclude[] = [];

  for (const include of currentDocument.includes ?? []) {
    const resolvedTarget = resolveRepositoryTarget(include.target, currentDocument.repositories);

    if (stack.includes(resolvedTarget)) {
      updatedIncludes.push({
        ...include,
        status: "circular"
      });
      addDiagnostic(currentDocument, `Circular include detected for '${include.target}'.`);
      continue;
    }

    const loaded = await loadIncludeDocument(include, currentDocument, options);
    updatedIncludes.push(loaded.include);

    if (!loaded.document) {
      if (loaded.include.status === "missing") {
        addDiagnostic(currentDocument, `Included file cannot be resolved: '${include.target}'.`);
      }

      continue;
    }

    expandedDocuments.push(await expandIncludes(loaded.document, options, [...stack, resolvedTarget]));
  }

  if (updatedIncludes.length > 0) {
    currentDocument.includes = updatedIncludes;
  }

  return mergeDocuments(currentDocument, expandedDocuments);
}

export async function composeDocument(document: ItmDocument, options: ComposeDocumentOptions = {}): Promise<ItmDocument> {
  const baseDocument = options.uri && !document.uri
    ? {
        ...cloneValue(document),
        uri: options.uri
      }
    : cloneValue(document);
  const expanded = await expandIncludes(baseDocument, options);
  const withOverlays = applyOverlays(expanded);
  return rebuildReferences(withOverlays);
}

export async function composeText(text: string, options: ComposeDocumentOptions = {}): Promise<ItmDocument> {
  const document = parseDocument(text, {
    ...(options.parseOptions ?? {}),
    ...(options.uri ? { uri: options.uri } : {})
  });

  return composeDocument(document, options);
}

export function createBaseUrlIncludeProvider(
  baseUrl: string,
  options: {
    fetchText?: (url: string) => Promise<string>;
  } = {}
): ItmIncludeProvider {
  const fetchText = options.fetchText ?? (async (url: string): Promise<string> => {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch include '${url}' (${response.status}).`);
    }

    return response.text();
  });

  return {
    name: "base-url",
    async load(target) {
      const absoluteTarget = looksLikeUrl(target) ? target : new URL(target, ensureTrailingSlash(baseUrl)).toString();

      if (!/^https?:\/\//u.test(absoluteTarget)) {
        return undefined;
      }

      return {
        text: await fetchText(absoluteTarget),
        uri: absoluteTarget
      };
    }
  };
}

export function createLocalFileIncludeProvider(
  options: {
    baseDirectory?: string;
    readText?: (path: string) => Promise<string>;
  } = {}
): ItmIncludeProvider {
  return {
    name: "local-file",
    async load(target, context) {
      if (/^[A-Za-z][A-Za-z0-9+.-]*:\/\//u.test(target) && !/^file:\/\//u.test(target)) {
        return undefined;
      }

      const [{ dirname, isAbsolute, resolve }, { fileURLToPath }, fs] = await Promise.all([
        import("node:path"),
        import("node:url"),
        import("node:fs/promises")
      ]);
      const readText = options.readText ?? ((path: string) => fs.readFile(path, "utf8"));

      let resolvedPath: string | undefined;

      if (target.startsWith("file://")) {
        resolvedPath = fileURLToPath(target);
      } else if (isAbsolute(target)) {
        resolvedPath = target;
      } else if (context.sourceDocument.uri?.startsWith("file://")) {
        resolvedPath = resolve(dirname(fileURLToPath(context.sourceDocument.uri)), target);
      } else if (context.sourceDocument.uri && isAbsolute(context.sourceDocument.uri)) {
        resolvedPath = resolve(dirname(context.sourceDocument.uri), target);
      } else if (options.baseDirectory) {
        resolvedPath = resolve(options.baseDirectory, target);
      }

      if (!resolvedPath) {
        return undefined;
      }

      try {
        return {
          text: await readText(resolvedPath),
          uri: resolvedPath
        };
      } catch {
        return undefined;
      }
    }
  };
}