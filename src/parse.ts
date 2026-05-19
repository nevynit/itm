import { parse as parseYaml } from "yaml";

import type {
  ItmAttributeBag,
  ItmGeneratedAsset,
  ItmDiagnostic,
  ItmDirective,
  ItmDocument,
  ItmEntity,
  ItmEntityType,
  ItmInclude,
  ItmMetadata,
  ItmNamespace,
  ItmOverlay,
  ItmPipeline,
  ItmPipelineOperation,
  ItmPipelineStep,
  ItmPluginRequirement,
  ItmRelationship,
  ItmRelationshipKind,
  ItmRelationshipType,
  ItmSeverity,
  ItmSourceRange,
  ItmViewDelta,
  ItmStyleRule,
  ItmValue,
  ItmValidationRule,
  ItmView,
  ItmViewpoint,
  ItmViewpointParameter
} from "./model";

export interface ParseItmOptions {
  uri?: string;
  generateImplicitRelationships?: boolean;
  defaultNamespace?: string;
  strict?: boolean;
}

interface ParsedRelationshipRef {
  raw: string;
  typeRef?: string;
  targetRef: string;
}

interface LineState {
  lineNumber: number;
  raw: string;
  normalized: string;
  indent: number;
  trimmed: string;
}

interface BlockResult {
  rawText: string;
  value?: ItmValue;
  endIndex: number;
}

interface MutableDocument extends ItmDocument {
  metadata?: ItmMetadata;
}

interface ParsedViewBody {
  parameters?: Record<string, ItmValue>;
  deltas?: ItmViewDelta[];
  notes?: string[];
  generatedAssets?: ItmGeneratedAsset[];
}

const KNOWN_DIRECTIVES = new Set([
  "metadata",
  "include",
  "namespace",
  "entitytype",
  "relationshiptype",
  "style",
  "viewpoint",
  "view",
  "package",
  "using",
  "repository",
  "require",
  "rule"
]);

const PIPELINE_OPERATIONS = new Set<ItmPipelineOperation>([
  "select",
  "includeEdges",
  "exclude",
  "validate",
  "transform",
  "layout",
  "render",
  "export",
  "plugin"
]);

function normalizeLeadingWhitespace(input: string): { normalized: string; indent: number } {
  const match = input.match(/^[\t ]*/u);
  const leading = match?.[0] ?? "";
  const normalizedLeading = leading.replace(/\t/gu, "  ");
  const remainder = input.slice(leading.length);

  return {
    normalized: `${normalizedLeading}${remainder}`,
    indent: normalizedLeading.length
  };
}

function toSourceRange(lineNumber: number, raw: string): ItmSourceRange {
  return {
    startLine: lineNumber,
    startColumn: 1,
    endLine: lineNumber,
    endColumn: raw.length + 1
  };
}

function sanitizeUidSegment(value: string): string {
  return value.replace(/[^A-Za-z0-9:_-]+/gu, "_");
}

function asRecord(value: ItmValue | undefined): Record<string, ItmValue> | undefined {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    return undefined;
  }

  return value as Record<string, ItmValue>;
}

function toItmValue(value: unknown): ItmValue {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => toItmValue(item));
  }

  if (typeof value === "object") {
    const result: Record<string, ItmValue> = {};

    for (const [key, entry] of Object.entries(value)) {
      result[key] = toItmValue(entry);
    }

    return result;
  }

  return String(value);
}

function splitQualifiedName(name: string): { namespacePrefix?: string; localName: string } {
  const parts = name.split("::");

  if (parts.length > 1) {
    return {
      ...(parts[0] ? { namespacePrefix: parts[0] } : {}),
      localName: parts.slice(1).join("::")
    };
  }

  return { localName: name };
}

function qualifyName(name: string, defaultNamespace?: string): string {
  if (name.includes("::") || !defaultNamespace) {
    return name;
  }

  return `${defaultNamespace}::${name}`;
}

function extractInlineAttributeBlock(input: string): { content: string; blockText?: string } {
  const match = input.match(/^(.*?)(\s+\{.*\})\s*$/u);

  if (!match) {
    return { content: input.trimEnd() };
  }

  const content = match[1] ?? input;
  const blockText = match[2];

  return {
    content: content.trimEnd(),
    ...(blockText ? { blockText: blockText.trim() } : {})
  };
}

function splitRelationshipToken(token: string): ParsedRelationshipRef {
  const raw = token.startsWith("@") ? token.slice(1) : token;

  for (let index = 0; index < raw.length; index += 1) {
    const current = raw[index];
    const previous = raw[index - 1];
    const next = raw[index + 1];

    if (current === ":" && previous !== ":" && next !== ":") {
      return {
        raw,
        typeRef: raw.slice(0, index),
        targetRef: raw.slice(index + 1)
      };
    }
  }

  return {
    raw,
    targetRef: raw
  };
}

function parseScalarString(value: ItmValue | undefined): string | undefined {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return undefined;
}

function parseStringArray(value: ItmValue | undefined): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value
    .map((entry) => parseScalarString(entry))
    .filter((entry): entry is string => Boolean(entry));
}

function parseViewpointParameters(value: ItmValue | undefined): ItmViewpointParameter[] | undefined {
  const parameters: ItmViewpointParameter[] = [];

  if (Array.isArray(value)) {
    for (const entry of value) {
      const record = asRecord(entry);

      if (!record) {
        continue;
      }

      const name = parseScalarString(record.name);
      const type = parseScalarString(record.type);

      if (!name || !type) {
        continue;
      }

      const description = parseScalarString(record.description);

      parameters.push({
        name,
        type: type as ItmViewpointParameter["type"],
        ...(record.defaultValue !== undefined ? { defaultValue: record.defaultValue } : {}),
        ...(typeof record.required === "boolean" ? { required: record.required } : {}),
        ...(description ? { description } : {}),
        ...(Array.isArray(record.values) ? { values: record.values } : {})
      });
    }

    return parameters.length > 0 ? parameters : undefined;
  }

  const recordValue = asRecord(value);

  if (!recordValue) {
    return undefined;
  }

  for (const [name, entry] of Object.entries(recordValue)) {
    const record = asRecord(entry);

    if (!record) {
      continue;
    }

    const type = parseScalarString(record.type);

    if (!type) {
      continue;
    }

    const description = parseScalarString(record.description);

    parameters.push({
      name,
      type: type as ItmViewpointParameter["type"],
      ...((record.defaultValue ?? record.default) !== undefined ? { defaultValue: record.defaultValue ?? record.default } : {}),
      ...(typeof record.required === "boolean" ? { required: record.required } : {}),
      ...(description ? { description } : {}),
      ...(Array.isArray(record.values) ? { values: record.values } : {})
    });
  }

  return parameters.length > 0 ? parameters : undefined;
}

function inferGeneratedAssetKind(pathOrUri: string | undefined): ItmGeneratedAsset["kind"] {
  if (!pathOrUri) {
    return "text";
  }

  const normalized = pathOrUri.toLowerCase();

  if (normalized.endsWith(".svg")) {
    return "svg";
  }

  if (normalized.endsWith(".png")) {
    return "png";
  }

  if (normalized.endsWith(".html") || normalized.endsWith(".htm")) {
    return "html";
  }

  if (normalized.endsWith(".json")) {
    return "json";
  }

  if (normalized.endsWith(".xml")) {
    return "xml";
  }

  return "text";
}

function parseGeneratedAssets(value: ItmValue | undefined): ItmGeneratedAsset[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const assets: ItmGeneratedAsset[] = [];

  for (const entry of value) {
    const record = asRecord(entry);

    if (!record) {
      continue;
    }

    const path = parseScalarString(record.path);
    const uri = parseScalarString(record.uri);
    const kind = parseScalarString(record.kind) as ItmGeneratedAsset["kind"] | undefined;
    const hash = parseScalarString(record.hash);
    const contentHash = parseScalarString(record.contentHash);

    assets.push({
      kind: kind ?? inferGeneratedAssetKind(path ?? uri),
      ...(path ? { path } : {}),
      ...(uri ? { uri } : {}),
      ...(hash ? { hash } : {}),
      ...(contentHash ? { contentHash } : {})
    });
  }

  return assets.length > 0 ? assets : undefined;
}

function parseViewTarget(record: Record<string, ItmValue>): { targetKind: "entity" | "relationship"; targetRef: string } | undefined {
  const node = parseScalarString(record.node);

  if (node) {
    return { targetKind: "entity", targetRef: node };
  }

  const relationship = parseScalarString(record.relationship);

  if (relationship) {
    return { targetKind: "relationship", targetRef: relationship };
  }

  return undefined;
}

function parseViewDeltas(value: ItmValue | undefined): ParsedViewBody {
  const record = asRecord(value);

  if (!record) {
    return {};
  }

  const deltas: ItmViewDelta[] = [];

  for (const entry of Array.isArray(record.hidden) ? record.hidden : []) {
    const item = asRecord(entry);
    const target = item ? parseViewTarget(item) : undefined;

    if (!target) {
      continue;
    }

    deltas.push({
      kind: "hidden",
      targetKind: target.targetKind,
      targetRef: target.targetRef,
      hidden: true
    });
  }

  for (const entry of Array.isArray(record.hiddenRelationships) ? record.hiddenRelationships : []) {
    const item = asRecord(entry);
    const relationship = item ? parseScalarString(item.relationship) : parseScalarString(entry);

    if (!relationship) {
      continue;
    }

    deltas.push({
      kind: "hidden",
      targetKind: "relationship",
      targetRef: relationship,
      hidden: true
    });
  }

  for (const entry of Array.isArray(record.collapsed) ? record.collapsed : []) {
    const item = asRecord(entry);
    const target = item ? parseViewTarget(item) : undefined;

    if (!target || target.targetKind !== "entity") {
      continue;
    }

    deltas.push({
      kind: "expanded-collapsed",
      targetRef: target.targetRef,
      expanded: false
    });
  }

  for (const entry of Array.isArray(record.expanded) ? record.expanded : []) {
    const item = asRecord(entry);
    const target = item ? parseViewTarget(item) : undefined;

    if (!target || target.targetKind !== "entity") {
      continue;
    }

    deltas.push({
      kind: "expanded-collapsed",
      targetRef: target.targetRef,
      expanded: true
    });
  }

  for (const entry of Array.isArray(record.moved) ? record.moved : []) {
    const item = asRecord(entry);
    const target = item ? parseViewTarget(item) : undefined;

    if (!target) {
      continue;
    }

    deltas.push({
      kind: "moved",
      targetKind: target.targetKind,
      targetRef: target.targetRef,
      ...(typeof item?.dx === "number" ? { dx: item.dx } : {}),
      ...(typeof item?.dy === "number" ? { dy: item.dy } : {}),
      ...(typeof item?.x === "number" ? { x: item.x } : {}),
      ...(typeof item?.y === "number" ? { y: item.y } : {})
    });
  }

  for (const entry of Array.isArray(record.pinned) ? record.pinned : []) {
    const item = asRecord(entry);
    const target = item ? parseViewTarget(item) : undefined;

    if (!target || typeof item?.x !== "number" || typeof item?.y !== "number") {
      continue;
    }

    deltas.push({
      kind: "pinned",
      targetKind: target.targetKind,
      targetRef: target.targetRef,
      x: item.x,
      y: item.y
    });
  }

  for (const entry of Array.isArray(record.styleOverrides) ? record.styleOverrides : []) {
    const item = asRecord(entry);
    const selector = item ? parseScalarString(item.selector) : undefined;
    const style = item ? createAttributeBag(item.style) : undefined;

    if (!selector || !style) {
      continue;
    }

    deltas.push({
      kind: "style-override",
      selector: { raw: selector },
      style
    });
  }

  for (const entry of Array.isArray(record.labelOverrides) ? record.labelOverrides : []) {
    const item = asRecord(entry);
    const target = item ? parseViewTarget(item) : undefined;
    const label = item ? parseScalarString(item.label) : undefined;

    if (!target || !label) {
      continue;
    }

    deltas.push({
      kind: "label-override",
      targetKind: target.targetKind,
      targetRef: target.targetRef,
      label
    });
  }

  const notes = parseStringArray(record.notes);
  const generatedAssets = parseGeneratedAssets(record.generatedAssets);

  return {
    ...(deltas.length > 0 ? { deltas } : {}),
    ...(notes ? { notes } : {}),
    ...(generatedAssets ? { generatedAssets } : {})
  };
}

function extractEmbeddedBlocks(text: string): Array<{ language: string; content: string }> {
  const blocks: Array<{ language: string; content: string }> = [];
  const pattern = /```([^\n]*)\n([\s\S]*?)```/gu;

  for (const match of text.matchAll(pattern)) {
    const language = match[1] ?? "";
    const content = match[2] ?? "";

    blocks.push({
      language: language.trim(),
      content
    });
  }

  return blocks;
}

function collectBlock(lines: readonly string[], startIndex: number): BlockResult {
  const collected: string[] = [];
  let endIndex = startIndex;

  for (let index = startIndex; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    collected.push(line);
    endIndex = index;

    if (line.trim() === "}") {
      break;
    }
  }

  const rawText = collected.join("\n");

  if (collected.length === 1) {
    return {
      rawText,
      endIndex,
      value: toItmValue(parseYaml(rawText))
    };
  }

  const inner = collected.slice(1, -1).join("\n");

  return {
    rawText,
    endIndex,
    value: inner.trim().length > 0 ? toItmValue(parseYaml(inner)) : {}
  };
}

function createAttributeBag(value: ItmValue | undefined): ItmAttributeBag | undefined {
  const record = asRecord(value);

  if (!record) {
    return undefined;
  }

  return { values: record };
}

function createPipeline(stepsValue: ItmValue | undefined, uidPrefix: string): ItmPipeline {
  if (!Array.isArray(stepsValue)) {
    return { steps: [] };
  }

  const steps: ItmPipelineStep[] = [];

  for (const [index, entry] of stepsValue.entries()) {
    if (typeof entry === "string") {
      steps.push({
        uid: `${uidPrefix}:step:${index + 1}`,
        operation: "plugin",
        provider: entry,
        arguments: {}
      });
      continue;
    }

    const record = asRecord(entry);

    if (!record) {
      continue;
    }

    const [key, value] = Object.entries(record)[0] ?? [];

    if (!key) {
      continue;
    }

    const operation = PIPELINE_OPERATIONS.has(key as ItmPipelineOperation) ? (key as ItmPipelineOperation) : "plugin";
    const argumentsValue = asRecord(value)
      ? (value as Record<string, ItmValue>)
      : value === undefined
        ? {}
        : { value };

    steps.push({
      uid: `${uidPrefix}:step:${index + 1}`,
      operation,
      ...(operation === "plugin" ? { provider: key } : {}),
      arguments: argumentsValue
    });
  }

  return { steps };
}

function createRelationshipUid(sourceUid: string, typeRef: string, targetRef: string, index: number): string {
  return `relationship:${sanitizeUidSegment(sourceUid)}:${sanitizeUidSegment(typeRef)}:${sanitizeUidSegment(targetRef)}:${index}`;
}

function pushDiagnostic(document: MutableDocument, severity: ItmSeverity, message: string, lineNumber: number, raw: string): void {
  const diagnostic: ItmDiagnostic = {
    uid: `diagnostic:${document.diagnostics?.length ?? 0}:${lineNumber}`,
    source: "itm.parser",
    severity,
    message,
    range: toSourceRange(lineNumber, raw)
  };

  document.diagnostics?.push(diagnostic);
}

function pruneEmptyCollections(document: MutableDocument): ItmDocument {
  const result: MutableDocument = { ...document };

  for (const key of [
    "namespaces",
    "entityTypes",
    "relationshipTypes",
    "selectors",
    "validationRules",
    "pluginRequirements",
    "styles",
    "viewpoints",
    "views",
    "includes",
    "packages",
    "packageUsages",
    "repositories",
    "overlays",
    "directives",
    "diagnostics"
  ] as const) {
    if ((result[key] ?? []).length === 0) {
      delete result[key];
    }
  }

  if (!result.metadata) {
    delete result.metadata;
  }

  return result;
}

export function parseItm(text: string, options: ParseItmOptions = {}): ItmDocument {
  const lines = text.replace(/\r\n?/gu, "\n").split("\n");
  const document: MutableDocument = {
    format: "itm",
    modelVersion: "1.0.0",
    ...(options.uri ? { uri: options.uri } : {}),
    entities: [],
    relationships: [],
    namespaces: [],
    entityTypes: [],
    relationshipTypes: [],
    selectors: [],
    validationRules: [],
    pluginRequirements: [],
    styles: [],
    viewpoints: [],
    views: [],
    includes: [],
    packages: [],
    packageUsages: [],
    repositories: [],
    overlays: [],
    directives: [],
    diagnostics: []
  };
  const entityStack: Array<{ indent: number; entity: ItmEntity }> = [];
  let currentEntity: ItmEntity | undefined;
  let currentOverlay: ItmOverlay | undefined;
  let defaultNamespace = options.defaultNamespace;
  let entityCounter = 0;
  let relationshipCounter = 0;

  const addDirective = (directive: ItmDirective): void => {
    document.directives?.push(directive);
  };

  const createRelationship = (
    sourceEntity: Pick<ItmEntity, "uid" | "qualifiedId">,
    reference: ParsedRelationshipRef,
    lineNumber: number,
    raw: string,
    attributes?: ItmAttributeBag
  ): ItmRelationship => {
    relationshipCounter += 1;
    const targetRef = qualifyName(reference.targetRef, defaultNamespace);
    const typeRef = reference.typeRef ?? document.metadata?.defaultRelationshipType ?? "related_to";
    const relationshipId = parseScalarString(attributes?.values.id);
    const uid = relationshipId
      ? `relationship:${sanitizeUidSegment(qualifyName(relationshipId, defaultNamespace))}`
      : createRelationshipUid(sourceEntity.uid, typeRef, targetRef, relationshipCounter);

    const relationship: ItmRelationship = {
      uid,
      kind: "relationship",
      ...(relationshipId ? { id: relationshipId } : {}),
      sourceRange: toSourceRange(lineNumber, raw),
      sourceId: sourceEntity.uid,
      ...(sourceEntity.qualifiedId ? { sourceRef: sourceEntity.qualifiedId } : {}),
      targetRef,
      typeRef,
      relationshipKind: "explicit",
      implicit: false,
      virtual: false,
      sourceSyntax: raw.trimStart().startsWith("@") ? "relationship-block" : "inline-relationship",
      ...(attributes ? { attributes } : {})
    };

    document.relationships.push(relationship);
    return relationship;
  };

  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index] ?? "";
    const { normalized, indent } = normalizeLeadingWhitespace(raw);
    const trimmed = normalized.trim();
    const lineNumber = index + 1;

    if (trimmed.length === 0) {
      continue;
    }

    if (indent % 2 !== 0) {
      pushDiagnostic(document, "error", "Indentation must be a multiple of two spaces.", lineNumber, raw);
    }

    const state: LineState = {
      lineNumber,
      raw,
      normalized,
      indent,
      trimmed
    };

    if (trimmed.startsWith("%")) {
      const match = trimmed.match(/^%(\S+)(?:\s+(.*))?$/u);

      if (!match) {
        pushDiagnostic(document, "error", "Invalid directive syntax.", lineNumber, raw);
        continue;
      }

      const name = match[1] ?? "";
      const argumentText = match[2];
      let body: ItmValue | undefined;
      let rawText = raw;

      if (lines[index + 1]?.trim() === "{") {
        const block = collectBlock(lines, index + 1);
        body = block.value;
        rawText = `${raw}\n${block.rawText}`;
        index = block.endIndex;
      }

      const directive: ItmDirective = {
        name,
        ...(argumentText ? { argumentText } : {}),
        ...(body !== undefined ? { body } : {}),
        rawText,
        known: KNOWN_DIRECTIVES.has(name),
        handled: KNOWN_DIRECTIVES.has(name),
        source: toSourceRange(lineNumber, raw)
      };
      addDirective(directive);

      if (name === "metadata") {
        const record = asRecord(body);

        if (record) {
          const title = parseScalarString(record.title);
          const version = parseScalarString(record.version);
          const description = parseScalarString(record.description);
          const author = parseScalarString(record.author);
          const owner = parseScalarString(record.owner);
          const metadataDefaultNamespace = parseScalarString(record.defaultNamespace);
          const defaultRelationshipType = parseScalarString(record.defaultRelationshipType);
          const defaultLanguageOrProfile = parseScalarString(record.defaultLanguageOrProfile);
          const created = parseScalarString(record.created);
          const updated = parseScalarString(record.updated);
          const intendedRenderingMode = parseScalarString(record.intendedRenderingMode);
          const intendedRenderingModes = parseStringArray(record.intendedRenderingModes);
          const validationMode = parseScalarString(record.validationMode) as ItmMetadata["validationMode"] | undefined;
          const metadata: ItmMetadata = {
            ...(title ? { title } : {}),
            ...(version ? { version } : {}),
            ...(description ? { description } : {}),
            ...(author ? { author } : {}),
            ...(owner ? { owner } : {}),
            ...(metadataDefaultNamespace ? { defaultNamespace: metadataDefaultNamespace } : {}),
            ...(defaultRelationshipType ? { defaultRelationshipType } : {}),
            ...(defaultLanguageOrProfile ? { defaultLanguageOrProfile } : {}),
            ...(created ? { created } : {}),
            ...(updated ? { updated } : {}),
            ...(intendedRenderingMode ? { intendedRenderingMode } : {}),
            ...(intendedRenderingModes ? { intendedRenderingModes } : {}),
            ...(validationMode ? { validationMode } : {}),
            values: record,
            source: toSourceRange(lineNumber, raw)
          };
          document.metadata = metadata;
          defaultNamespace = metadata.defaultNamespace ?? defaultNamespace;
        }
      } else if (name === "include" && argumentText) {
        const include: ItmInclude = {
          target: argumentText.trim(),
          status: "unresolved",
          source: toSourceRange(lineNumber, raw)
        };
        document.includes?.push(include);
      } else if (name === "namespace" && argumentText) {
        const [prefix, uri] = argumentText.trim().split(/\s+/u, 2);

        if (prefix && uri) {
          const namespace: ItmNamespace = {
            prefix,
            uri,
            source: toSourceRange(lineNumber, raw)
          };
          document.namespaces?.push(namespace);
        }
      } else if (name === "entitytype" && argumentText) {
        const record = asRecord(body) ?? {};
        const entityTypeName = argumentText.trim();
        const entityTypeDescription = parseScalarString(record.description);
        const requiredAttributes = parseStringArray(record.requiredAttributes);
        const optionalAttributes = parseStringArray(record.optionalAttributes);
        const entityType: ItmEntityType = {
          uid: `entity-type:${sanitizeUidSegment(entityTypeName)}`,
          kind: "entity-type",
          name: entityTypeName,
          ...(entityTypeDescription ? { description: entityTypeDescription } : {}),
          ...(requiredAttributes ? { requiredAttributes } : {}),
          ...(optionalAttributes ? { optionalAttributes } : {}),
          sourceRange: toSourceRange(lineNumber, raw)
        };
        document.entityTypes?.push(entityType);
      } else if (name === "relationshiptype" && argumentText) {
        const record = asRecord(body) ?? {};
        const relationshipTypeName = argumentText.trim();
        const relationshipTypeDescription = parseScalarString(record.description);
        const sourceTypeRefs = parseStringArray(record.sourceTypes);
        const targetTypeRefs = parseStringArray(record.targetTypes);
        const inverseTypeRef = parseScalarString(record.inverseType);
        const requiredAttributes = parseStringArray(record.requiredAttributes);
        const optionalAttributes = parseStringArray(record.optionalAttributes);
        const relationshipType: ItmRelationshipType = {
          uid: `relationship-type:${sanitizeUidSegment(relationshipTypeName)}`,
          kind: "relationship-type",
          name: relationshipTypeName,
          ...(relationshipTypeDescription ? { description: relationshipTypeDescription } : {}),
          ...(sourceTypeRefs ? { sourceTypeRefs } : {}),
          ...(targetTypeRefs ? { targetTypeRefs } : {}),
          ...(inverseTypeRef ? { inverseTypeRef } : {}),
          ...(requiredAttributes ? { requiredAttributes } : {}),
          ...(optionalAttributes ? { optionalAttributes } : {}),
          sourceRange: toSourceRange(lineNumber, raw)
        };
        document.relationshipTypes?.push(relationshipType);
      } else if (name === "style" && argumentText) {
        const styleRule: ItmStyleRule = {
          uid: `style:${document.styles?.length ?? 0}:${sanitizeUidSegment(argumentText.trim())}`,
          kind: "style-rule",
          selector: { raw: argumentText.trim(), source: toSourceRange(lineNumber, raw) },
          style: createAttributeBag(body) ?? { values: {} },
          origin: "document",
          priority: (document.styles?.length ?? 0) + 1,
          sourceRange: toSourceRange(lineNumber, raw)
        };
        document.styles?.push(styleRule);
      } else if (name === "viewpoint" && argumentText) {
        const record = asRecord(body) ?? {};
        const viewpointDescription = parseScalarString(record.description);
        const viewpointTitle = parseScalarString(record.title);
        const parameters = parseViewpointParameters(record.parameters);
        const viewpoint: ItmViewpoint = {
          uid: `viewpoint:${sanitizeUidSegment(argumentText.trim())}`,
          kind: "viewpoint",
          name: argumentText.trim(),
          ...(viewpointDescription ? { description: viewpointDescription } : {}),
          ...(viewpointTitle ? { title: viewpointTitle } : {}),
          pipeline: createPipeline(record.pipeline, `viewpoint:${sanitizeUidSegment(argumentText.trim())}`),
          ...(parameters ? { parameters } : {}),
          supportsVisualEditing: record.supportsVisualEditing === true,
          sourceRange: toSourceRange(lineNumber, raw)
        };
        document.viewpoints?.push(viewpoint);
      } else if (name === "view" && argumentText) {
        const record = asRecord(body) ?? {};
        const viewTitle = parseScalarString(record.title);
        const parameters = asRecord(record.parameters);
        const parsedViewBody = parseViewDeltas(record.deltas);
        const generatedAssets = parseGeneratedAssets(record.generatedAssets) ?? parsedViewBody.generatedAssets;
        const notes = parseStringArray(record.notes) ?? parsedViewBody.notes;
        const view: ItmView = {
          uid: `view:${sanitizeUidSegment(argumentText.trim())}`,
          kind: "view",
          name: argumentText.trim(),
          ...(viewTitle ? { title: viewTitle } : {}),
          viewpointRef: parseScalarString(record.viewpoint) ?? parseScalarString(record.viewpointRef) ?? "",
          ...(parameters ? { parameters } : {}),
          ...(parsedViewBody.deltas ? { deltas: parsedViewBody.deltas } : {}),
          ...(generatedAssets ? { generatedAssets } : {}),
          ...(notes ? { notes } : {}),
          sourceRange: toSourceRange(lineNumber, raw)
        };
        document.views?.push(view);
      } else if (name === "repository" && argumentText) {
        const [repositoryName, location] = argumentText.trim().split(/\s+/u, 2);

        if (repositoryName && location) {
          document.repositories?.push({
            name: repositoryName,
            location,
            allowed: true,
            source: toSourceRange(lineNumber, raw)
          });
        }
      } else if (name === "require" && argumentText) {
        const [requirementName, versionRange] = argumentText.trim().split(/\s+/u, 2);

        if (!requirementName) {
          continue;
        }

        const requirement: ItmPluginRequirement = {
          name: requirementName,
          ...(versionRange ? { versionRange } : {}),
          resolved: false,
          source: toSourceRange(lineNumber, raw)
        };
        document.pluginRequirements?.push(requirement);
      } else if (name === "rule" && argumentText) {
        const record = asRecord(body) ?? {};
        const ruleMessage = parseScalarString(record.message);
        const rule: ItmValidationRule = {
          uid: `rule:${sanitizeUidSegment(argumentText.trim())}`,
          kind: "validation-rule",
          name: argumentText.trim(),
          selector: {
            raw: parseScalarString(record.select) ?? "*"
          },
          pipeline: createPipeline(record.pipeline, `rule:${sanitizeUidSegment(argumentText.trim())}`),
          severity: (parseScalarString(record.severity) as ItmSeverity) ?? "warning",
          ...(ruleMessage ? { message: ruleMessage } : {}),
          enabled: record.enabled !== false,
          sourceRange: toSourceRange(lineNumber, raw)
        };
        document.validationRules?.push(rule);
      } else if (name === "package" && argumentText) {
        const packageDescription = parseScalarString(asRecord(body)?.description);
        document.packages?.push({
          uid: `package:${sanitizeUidSegment(argumentText.trim())}`,
          kind: "package",
          name: argumentText.trim(),
          ...(packageDescription ? { description: packageDescription } : {}),
          sourceRange: toSourceRange(lineNumber, raw)
        });
      } else if (name === "using" && argumentText) {
        document.packageUsages?.push({
          packageRef: argumentText.trim(),
          scope: "all",
          source: toSourceRange(lineNumber, raw)
        });
      }

      currentEntity = undefined;
      currentOverlay = undefined;
      continue;
    }

    if (trimmed.startsWith("|")) {
      if (!currentEntity && !currentOverlay) {
        pushDiagnostic(document, options.strict ? "error" : "warning", "Description line without a preceding entity.", lineNumber, raw);
        continue;
      }

      const descriptionLines: string[] = [];
      let endIndex = index;

      for (let descriptionIndex = index; descriptionIndex < lines.length; descriptionIndex += 1) {
        const candidate = lines[descriptionIndex] ?? "";
        const normalizedCandidate = normalizeLeadingWhitespace(candidate).normalized.trimStart();

        if (!normalizedCandidate.startsWith("|")) {
          break;
        }

        descriptionLines.push(normalizedCandidate.slice(1).replace(/^ /u, ""));
        endIndex = descriptionIndex;
      }

      const textValue = descriptionLines.join("\n");
      const embeddedBlocks = extractEmbeddedBlocks(textValue).map((block) => ({
        language: block.language,
        content: block.content
      }));

      if (currentEntity) {
        currentEntity.description = {
          format: "markdown",
          text: textValue,
          embeddedBlocks,
          source: toSourceRange(lineNumber, raw)
        };
      }

      if (currentOverlay) {
        currentOverlay.descriptionPatch = {
          operation: "replace",
          text: textValue
        };
      }

      index = endIndex;
      continue;
    }

    if (trimmed.startsWith("@")) {
      if (!currentEntity && !currentOverlay) {
        pushDiagnostic(document, options.strict ? "error" : "warning", "Relationship line without a preceding entity.", lineNumber, raw);
        continue;
      }

      const reference = splitRelationshipToken(trimmed);
      let relationshipAttributes: ItmAttributeBag | undefined;

      if (lines[index + 1]?.trim() === "{") {
        const block = collectBlock(lines, index + 1);
        relationshipAttributes = createAttributeBag(block.value);
        index = block.endIndex;
      }

      if (currentEntity) {
        createRelationship(currentEntity, reference, lineNumber, raw, relationshipAttributes);
      }

      if (currentOverlay) {
        relationshipCounter += 1;
        const targetRef = qualifyName(reference.targetRef, defaultNamespace);
        const typeRef = reference.typeRef ?? document.metadata?.defaultRelationshipType ?? "related_to";
        const relationshipId = parseScalarString(relationshipAttributes?.values.id);

        currentOverlay.relationshipAdditions = currentOverlay.relationshipAdditions ?? [];
        currentOverlay.relationshipAdditions.push({
          uid: relationshipId
            ? `relationship:${sanitizeUidSegment(qualifyName(relationshipId, defaultNamespace))}`
            : createRelationshipUid(currentOverlay.uid, typeRef, targetRef, relationshipCounter),
          kind: "relationship",
          ...(relationshipId ? { id: relationshipId } : {}),
          sourceRange: toSourceRange(lineNumber, raw),
          sourceId: currentOverlay.uid,
          sourceRef: currentOverlay.targetRef,
          targetRef,
          typeRef,
          relationshipKind: "explicit",
          implicit: false,
          virtual: false,
          sourceSyntax: "relationship-block",
          ...(relationshipAttributes ? { attributes: relationshipAttributes } : {})
        });
      }

      continue;
    }

    if (trimmed === "{") {
      const block = collectBlock(lines, index);
      const bag = createAttributeBag(block.value);

      if (currentEntity && bag) {
        currentEntity.attributes = bag;
      } else if (currentOverlay && bag) {
        currentOverlay.attributePatches = Object.entries(bag.values).map(([key, value]) => ({
          key,
          value,
          operation: "set"
        }));
      } else {
        pushDiagnostic(document, options.strict ? "error" : "warning", "Attribute block without a preceding entity, relationship, or directive.", lineNumber, raw);
      }

      index = block.endIndex;
      continue;
    }

    const { content, blockText } = extractInlineAttributeBlock(trimmed);
    let remaining = content;
    let parsedId: string | undefined;
    let parsedTypeRef: string | undefined;

    if (remaining.startsWith("&")) {
      const match = remaining.match(/^&([^\s]+)\s*(.*)$/u);
      parsedId = match?.[1];
      remaining = match?.[2] ?? remaining;
    }

    const isOverlay = remaining.startsWith("!overlay");

    if (isOverlay) {
      remaining = remaining.replace(/^!overlay\b\s*/u, "");
    }

    if (remaining.startsWith("[")) {
      const match = remaining.match(/^\[([^\]]+)\]\s*(.*)$/u);
      parsedTypeRef = match?.[1];
      remaining = match?.[2] ?? remaining;
    }

    const tokens = remaining.split(/\s+/u).filter(Boolean);
    const labelTokens: string[] = [];
    const tags: string[] = [];
    const inlineRelationships: ParsedRelationshipRef[] = [];

    for (const token of tokens) {
      if (token.startsWith("@")) {
        inlineRelationships.push(splitRelationshipToken(token));
      } else if (/^#[A-Za-z][A-Za-z0-9_-]*$/u.test(token)) {
        tags.push(token.slice(1));
      } else {
        labelTokens.push(token);
      }
    }

    if (labelTokens.length === 0 && !isOverlay) {
      pushDiagnostic(document, options.strict ? "error" : "warning", "Entity line does not contain a label.", lineNumber, raw);
      continue;
    }

    const qualifiedId = parsedId ? qualifyName(parsedId, defaultNamespace) : undefined;
    const splitId = parsedId ? splitQualifiedName(parsedId) : undefined;

    if (isOverlay && qualifiedId) {
      const overlay: ItmOverlay = {
        uid: `overlay:${sanitizeUidSegment(qualifiedId)}:${document.overlays?.length ?? 0}`,
        kind: "overlay",
        targetKind: "entity",
        targetRef: qualifiedId,
        ...(labelTokens.length > 0 ? { replacementLabel: labelTokens.join(" ") } : {}),
        ...(parsedTypeRef ? { replacementTypeRef: parsedTypeRef } : {}),
        relationshipAdditions: [],
        policy: "merge",
        sourceRange: toSourceRange(lineNumber, raw)
      };

      if (blockText) {
        const bag = createAttributeBag(toItmValue(parseYaml(blockText)));

        if (bag) {
          overlay.attributePatches = Object.entries(bag.values).map(([key, value]) => ({
            key,
            value,
            operation: "set"
          }));
        }
      }

      if (lines[index + 1]?.trim() === "{") {
        const block = collectBlock(lines, index + 1);
        const bag = createAttributeBag(block.value);

        if (bag) {
          overlay.attributePatches = Object.entries(bag.values).map(([key, value]) => ({
            key,
            value,
            operation: "set"
          }));
        }

        index = block.endIndex;
      }

      document.overlays?.push(overlay);
      currentEntity = undefined;
      currentOverlay = overlay;
      continue;
    }

    entityCounter += 1;
    const entity: ItmEntity = {
      uid: qualifiedId ? `entity:${sanitizeUidSegment(qualifiedId)}` : `entity:anonymous:${entityCounter}`,
      kind: "entity",
      ...(splitId?.localName ? { id: splitId.localName } : {}),
      ...(qualifiedId ? { qualifiedId } : {}),
      ...(splitId?.namespacePrefix ?? defaultNamespace ? { namespacePrefix: splitId?.namespacePrefix ?? defaultNamespace } : {}),
      ...(splitId?.localName ? { localId: splitId.localName } : {}),
      label: labelTokens.join(" "),
      rawLabel: remaining,
      ...(parsedTypeRef ? { typeRef: parsedTypeRef } : {}),
      tags,
      childIds: [],
      incomingRelationshipIds: [],
      outgoingRelationshipIds: [],
      overlayIds: [],
      depth: 0,
      rank: document.entities.length,
      sourceRange: toSourceRange(lineNumber, raw)
    };

    if (blockText) {
      const bag = createAttributeBag(toItmValue(parseYaml(blockText)));

      if (bag) {
        entity.attributes = bag;
      }
    }

    if (lines[index + 1]?.trim() === "{") {
      const block = collectBlock(lines, index + 1);
      const bag = createAttributeBag(block.value);

      if (bag) {
        entity.attributes = bag;
      }

      index = block.endIndex;
    }

    while (entityStack.length > 0 && (entityStack[entityStack.length - 1]?.indent ?? -1) >= state.indent) {
      entityStack.pop();
    }

    const parent = entityStack[entityStack.length - 1]?.entity;
    const previousIndent = entityStack[entityStack.length - 1]?.indent ?? 0;

    if (parent && state.indent > previousIndent + 2) {
      pushDiagnostic(document, options.strict ? "error" : "warning", "Indentation jumped by more than one level.", lineNumber, raw);
    }

    if (!parent && state.indent > 0) {
      pushDiagnostic(document, options.strict ? "error" : "warning", "Indented entity without a parent entity.", lineNumber, raw);
    }

    if (parent) {
      entity.parentId = parent.uid;
      entity.depth = (parent.depth ?? 0) + 1;
      parent.childIds?.push(entity.uid);
    }

    document.entities.push(entity);
    entityStack.push({ indent: state.indent, entity });
    currentEntity = entity;
    currentOverlay = undefined;

    let inlineAttributes: ItmAttributeBag | undefined;

    if (blockText) {
      inlineAttributes = entity.attributes;
    }

    for (const reference of inlineRelationships) {
      const relationship = createRelationship(entity, reference, lineNumber, raw, inlineRelationships.length === 1 ? inlineAttributes : undefined);
      entity.outgoingRelationshipIds?.push(relationship.uid);
    }
  }

  const entityByQualifiedId = new Map<string, ItmEntity>();
  const entityByUnqualifiedId = new Map<string, ItmEntity>();

  for (const entity of document.entities) {
    if (entity.qualifiedId) {
      if (entityByQualifiedId.has(entity.qualifiedId)) {
        pushDiagnostic(document, options.strict ? "error" : "warning", `Duplicate entity id '${entity.qualifiedId}'.`, entity.sourceRange?.startLine ?? 1, "");
      }

      entityByQualifiedId.set(entity.qualifiedId, entity);
    }

    if (entity.id) {
      entityByUnqualifiedId.set(entity.id, entity);
    }
  }

  for (const relationship of document.relationships) {
    const targetEntity = relationship.targetRef
      ? entityByQualifiedId.get(relationship.targetRef) ?? entityByUnqualifiedId.get(splitQualifiedName(relationship.targetRef).localName)
      : undefined;

    if (targetEntity) {
      relationship.targetId = targetEntity.uid;
      targetEntity.incomingRelationshipIds?.push(relationship.uid);
    } else if (relationship.targetRef) {
      pushDiagnostic(
        document,
        options.strict ? "error" : "warning",
        `Unresolved relationship target '${relationship.targetRef}'.`,
        relationship.sourceRange?.startLine ?? 1,
        ""
      );
    }
  }

  if (options.generateImplicitRelationships !== false) {
    for (const entity of document.entities) {
      if (!entity.parentId) {
        continue;
      }

      relationshipCounter += 1;
      const containment: ItmRelationship = {
        uid: createRelationshipUid(entity.parentId, "contains", entity.uid, relationshipCounter),
        kind: "relationship",
        sourceId: entity.parentId,
        targetId: entity.uid,
        typeRef: "contains",
        relationshipKind: "containment",
        implicit: true,
        virtual: false,
        sourceSyntax: "generated"
      };
      document.relationships.push(containment);
      entity.incomingRelationshipIds?.push(containment.uid);
      const parent = document.entities.find((candidate) => candidate.uid === entity.parentId);
      parent?.outgoingRelationshipIds?.push(containment.uid);
    }

    const groups = new Map<string, ItmEntity[]>();

    for (const entity of document.entities) {
      const groupKey = entity.parentId ?? "__root__";
      const group = groups.get(groupKey);

      if (group) {
        group.push(entity);
      } else {
        groups.set(groupKey, [entity]);
      }
    }

    for (const siblings of groups.values()) {
      siblings.sort((left, right) => (left.rank ?? 0) - (right.rank ?? 0));

      for (let index = 0; index < siblings.length - 1; index += 1) {
        const source = siblings[index];
        const target = siblings[index + 1];

        if (!source || !target) {
          continue;
        }

        relationshipCounter += 1;
        const ordering: ItmRelationship = {
          uid: createRelationshipUid(source.uid, "followed_by", target.uid, relationshipCounter),
          kind: "relationship",
          sourceId: source.uid,
          targetId: target.uid,
          typeRef: "followed_by",
          relationshipKind: "ordering",
          implicit: true,
          virtual: true,
          sourceSyntax: "generated"
        };
        document.relationships.push(ordering);
        source.outgoingRelationshipIds?.push(ordering.uid);
        target.incomingRelationshipIds?.push(ordering.uid);
      }
    }
  }

  document.roots = document.entities.filter((entity) => !entity.parentId).map((entity) => entity.uid);

  return pruneEmptyCollections(document);
}

export function parseDocument(text: string, options: ParseItmOptions = {}): ItmDocument {
  return parseItm(text, options);
}