import { XMLBuilder, XMLParser } from "fast-xml-parser";

import { throwOnErrorDiagnostics, type ItmProcessingResult } from "./diagnostics";
import {
  createCanonicalGraph,
  createTypeHierarchy,
  getStableRelationshipId,
  isEntityOfType
} from "./extensions";
import { createDocument, createEntity, createRelationship } from "./factories";
import type {
  ItmAttributeBag,
  ItmDiagnostic,
  ItmDocument,
  ItmEntity,
  ItmRelationship,
  ItmValue,
  ItmViewDelta
} from "./model";
import { isResolvedDocument, resolveDocument } from "./resolve";
import { serializeDocumentResult, type SerializeItmOptions } from "./serialize";
import type {
  ResolvedItmDocument,
  ResolvedItmEntity,
  ResolvedItmEntityType,
  ResolvedItmRelationship,
  ResolvedItmRelationshipType
} from "./resolved";

export interface ArchimateAllowedRelationship {
  relationshipType: string;
  sourceType: string;
  targetType: string;
  targetKind?: "entity" | "relationship";
}

export interface ValidateArchimateOptions {
  matrix?: readonly ArchimateAllowedRelationship[];
}

export interface ExportArchimateExchangeOptions extends ValidateArchimateOptions {
  modelIdentifier?: string;
  language?: string;
  includeOrganizations?: boolean;
  includeImplicitRelationships?: boolean;
}

export interface ImportArchimateExchangeOptions {
  defaultNamespace?: string;
  namespaceUri?: string;
}

export interface ImportArchimateExchangeAsItmOptions extends ImportArchimateExchangeOptions, SerializeItmOptions {}

const ARCHIMATE_NAMESPACE_PREFIX = "archimate";
const ARCHIMATE_NAMESPACE_URI = "https://www.opengroup.org/archimate/3.2";
const ARCHIMATE_EXCHANGE_NAMESPACE = "http://www.opengroup.org/xsd/archimate/3.0/";
const XML_SCHEMA_INSTANCE_NAMESPACE = "http://www.w3.org/2001/XMLSchema-instance";

function addMatrixEntries(
  matrix: ArchimateAllowedRelationship[],
  relationshipType: string,
  sourceTypes: readonly string[],
  targetTypes: readonly string[],
  targetKind: "entity" | "relationship" = "entity"
): void {
  for (const sourceType of sourceTypes) {
    for (const targetType of targetTypes) {
      matrix.push({ relationshipType, sourceType, targetType, targetKind });
    }
  }
}

function buildDefaultArchimateRelationshipMatrix(): readonly ArchimateAllowedRelationship[] {
  const matrix: ArchimateAllowedRelationship[] = [];

  addMatrixEntries(matrix, "archimate::composition", ["archimate::Element"], ["archimate::Element"]);
  addMatrixEntries(matrix, "archimate::aggregation", ["archimate::Element"], ["archimate::Element"]);
  addMatrixEntries(
    matrix,
    "archimate::assignment",
    ["archimate::ActiveStructureElement"],
    ["archimate::BehaviorElement", "archimate::ActiveStructureElement"]
  );
  addMatrixEntries(matrix, "archimate::realization", ["archimate::ActiveStructureElement"], [
    "archimate::ActiveStructureElement",
    "archimate::BehaviorElement",
    "archimate::StrategyElement"
  ]);
  addMatrixEntries(matrix, "archimate::realization", ["archimate::BehaviorElement"], [
    "archimate::BehaviorElement",
    "archimate::CompositeElement",
    "archimate::StrategyElement"
  ]);
  addMatrixEntries(matrix, "archimate::realization", ["archimate::PassiveStructureElement"], [
    "archimate::PassiveStructureElement",
    "archimate::CompositeElement"
  ]);
  addMatrixEntries(matrix, "archimate::realization", ["archimate::CompositeElement"], ["archimate::CompositeElement"]);
  addMatrixEntries(matrix, "archimate::realization", ["archimate::MotivationElement"], ["archimate::MotivationElement"]);
  addMatrixEntries(matrix, "archimate::realization", ["archimate::StrategyElement"], ["archimate::StrategyElement"]);
  addMatrixEntries(matrix, "archimate::realization", ["archimate::ImplementationMigrationElement"], [
    "archimate::ImplementationMigrationElement"
  ]);
  addMatrixEntries(matrix, "archimate::serving", ["archimate::BehaviorElement"], [
    "archimate::BehaviorElement",
    "archimate::ActiveStructureElement"
  ]);
  addMatrixEntries(matrix, "archimate::access", ["archimate::BehaviorElement"], ["archimate::PassiveStructureElement"]);
  addMatrixEntries(matrix, "archimate::influence", ["archimate::Concept"], ["archimate::MotivationElement"]);
  addMatrixEntries(matrix, "archimate::triggering", ["archimate::BehaviorElement"], ["archimate::BehaviorElement"]);
  addMatrixEntries(matrix, "archimate::flow", ["archimate::BehaviorElement"], ["archimate::BehaviorElement"]);
  addMatrixEntries(matrix, "archimate::association", ["archimate::Concept"], ["archimate::Concept"]);
  addMatrixEntries(matrix, "archimate::association", ["archimate::Concept"], ["archimate::Relationship"], "relationship");
  addMatrixEntries(matrix, "archimate::specialization", ["archimate::Concept"], ["archimate::Concept"]);
  addMatrixEntries(matrix, "archimate::junction", ["archimate::Concept"], ["archimate::Concept"]);

  return matrix;
}

const DEFAULT_ARCHIMATE_RELATIONSHIP_MATRIX: readonly ArchimateAllowedRelationship[] = buildDefaultArchimateRelationshipMatrix();

const RELATIONSHIP_EXPORT_TYPE_TO_TYPE_REF: Readonly<Record<string, string>> = {
  Composition: "archimate::composition",
  Aggregation: "archimate::aggregation",
  Assignment: "archimate::assignment",
  Realization: "archimate::realization",
  Serving: "archimate::serving",
  Access: "archimate::access",
  Influence: "archimate::influence",
  Triggering: "archimate::triggering",
  Flow: "archimate::flow",
  Association: "archimate::association",
  Specialization: "archimate::specialization",
  Junction: "archimate::junction"
};

function asResolvedDocument(document: ItmDocument | ResolvedItmDocument): ResolvedItmDocument {
  return isResolvedDocument(document) ? document : resolveDocument(document);
}

function pushDiagnostic(
  diagnostics: ItmDiagnostic[],
  source: string,
  severity: ItmDiagnostic["severity"],
  message: string,
  extras: Partial<ItmDiagnostic> = {}
): void {
  diagnostics.push({
    uid: `diagnostic:${source}:${diagnostics.length + 1}`,
    source,
    severity,
    message,
    ...extras
  });
}

function typeAttributes(type: { attributes?: ItmAttributeBag } | undefined): Record<string, ItmValue> {
  return type?.attributes?.values ?? {};
}

function stringAttribute(type: { attributes?: ItmAttributeBag } | undefined, key: string): string | undefined {
  const value = typeAttributes(type)[key];
  return typeof value === "string" ? value : undefined;
}

function localName(name: string): string {
  const parts = name.split("::");
  return parts[parts.length - 1] ?? name;
}

function sanitizeIdentifier(value: string): string {
  const normalized = value.replace(/[^A-Za-z0-9_-]+/gu, "_").replace(/^_+|_+$/gu, "");
  return normalized.length > 0 ? normalized : "anonymous";
}

function primitiveValueToString(value: ItmValue): string {
  if (value === null) {
    return "null";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return JSON.stringify(value);
}

function readXmlText(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const text = record["#text"] ?? record.text;
    return typeof text === "string" ? text : undefined;
  }

  return undefined;
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function isArchimateConcept(document: ResolvedItmDocument, entity: ResolvedItmEntity): boolean {
  return isEntityOfType(document, entity, "archimate::Concept", true);
}

function isArchimateElement(document: ResolvedItmDocument, entity: ResolvedItmEntity): boolean {
  return isEntityOfType(document, entity, "archimate::Element", true);
}

function relationshipMatchesType(
  relationship: Pick<ResolvedItmRelationship, "typeRef">,
  expectedType: string,
  hierarchy: ReturnType<typeof createTypeHierarchy>
): boolean {
  if (relationship.typeRef === expectedType) {
    return true;
  }

  return (hierarchy.relationshipAncestorsByName.get(relationship.typeRef) ?? []).includes(expectedType);
}

function entityMatchesType(
  entity: Pick<ResolvedItmEntity, "typeRef">,
  expectedType: string,
  hierarchy: ReturnType<typeof createTypeHierarchy>
): boolean {
  if (!entity.typeRef) {
    return false;
  }

  if (entity.typeRef === expectedType) {
    return true;
  }

  return (hierarchy.entityAncestorsByName.get(entity.typeRef) ?? []).includes(expectedType);
}

function resolveRelationshipTargetRelationship(document: ResolvedItmDocument, relationship: ResolvedItmRelationship): ResolvedItmRelationship | undefined {
  if (!relationship.targetRef) {
    return undefined;
  }

  return document.relationships.find(
    (candidate) =>
      candidate.uid === relationship.targetRef
      || candidate.id === relationship.targetRef
      || getStableRelationshipId(candidate) === relationship.targetRef
  );
}

function relationshipExportType(type: ResolvedItmRelationshipType | undefined, relationship: Pick<ResolvedItmRelationship, "typeRef">): string {
  return stringAttribute(type, "exportType") ?? localName(relationship.typeRef);
}

function entityExportType(type: ResolvedItmEntityType | undefined, entity: Pick<ResolvedItmEntity, "typeRef">): string {
  return stringAttribute(type, "exportType") ?? localName(entity.typeRef ?? "Concept");
}

function entityLayer(type: ResolvedItmEntityType | undefined): string | undefined {
  return stringAttribute(type, "layer");
}

function entityAspect(type: ResolvedItmEntityType | undefined): string | undefined {
  return stringAttribute(type, "aspect");
}

function areCompatibleSpecializationTypes(
  source: ResolvedItmEntity,
  target: ResolvedItmEntity,
  document: ResolvedItmDocument,
  hierarchy: ReturnType<typeof createTypeHierarchy>
): boolean {
  if (!source.typeRef || !target.typeRef) {
    return false;
  }

  if (source.typeRef === target.typeRef) {
    return true;
  }

  const sourceAncestors = hierarchy.entityAncestorsByName.get(source.typeRef) ?? [];
  const targetAncestors = hierarchy.entityAncestorsByName.get(target.typeRef) ?? [];

  if (sourceAncestors.includes(target.typeRef) || targetAncestors.includes(source.typeRef)) {
    return true;
  }

  const sourceType = source.typeRef ? document.indexes.entityTypesByName.get(source.typeRef) : undefined;
  const targetType = target.typeRef ? document.indexes.entityTypesByName.get(target.typeRef) : undefined;
  return entityLayer(sourceType) === entityLayer(targetType) && entityAspect(sourceType) === entityAspect(targetType);
}

function allowsMatrixEntry(
  document: ResolvedItmDocument,
  relationship: ResolvedItmRelationship,
  matrix: readonly ArchimateAllowedRelationship[],
  hierarchy: ReturnType<typeof createTypeHierarchy>
): boolean {
  const targetRelationship = resolveRelationshipTargetRelationship(document, relationship);
  const targetKind = targetRelationship ? "relationship" : "entity";

  return matrix.some((entry) => {
    if (entry.relationshipType !== relationship.typeRef) {
      return false;
    }

    if ((entry.targetKind ?? "entity") !== targetKind) {
      return false;
    }

    if (!entityMatchesType(relationship.source, entry.sourceType, hierarchy)) {
      return false;
    }

    if (targetRelationship) {
      return relationshipMatchesType(targetRelationship, entry.targetType, hierarchy);
    }

    if (!relationship.target) {
      return false;
    }

    return entityMatchesType(relationship.target, entry.targetType, hierarchy);
  });
}

function explicitArchimateRelationships(document: ResolvedItmDocument): ResolvedItmRelationship[] {
  return document.relationships.filter(
    (relationship) => relationship.relationshipKind === "explicit" && relationship.typeRef.startsWith("archimate::")
  );
}

function existingViewReferences(document: ResolvedItmDocument): Set<string> {
  const references = new Set<string>();

  for (const entity of document.entities) {
    references.add(entity.uid);
    if (entity.id) {
      references.add(entity.id);
    }
    if (entity.qualifiedId) {
      references.add(entity.qualifiedId);
    }
  }

  for (const relationship of document.relationships) {
    references.add(relationship.uid);
    if (relationship.id) {
      references.add(relationship.id);
    }
    references.add(getStableRelationshipId(relationship));
  }

  return references;
}

function viewDeltaReference(delta: ItmViewDelta): string | undefined {
  if ("targetRef" in delta && typeof delta.targetRef === "string") {
    return delta.targetRef;
  }

  if ("targetUid" in delta && typeof delta.targetUid === "string") {
    return delta.targetUid;
  }

  return undefined;
}

function baseArchimateDiagnostics(document: ResolvedItmDocument, options: ValidateArchimateOptions = {}): ItmDiagnostic[] {
  const diagnostics: ItmDiagnostic[] = [];
  const hierarchy = createTypeHierarchy(document);
  const matrix = options.matrix ?? DEFAULT_ARCHIMATE_RELATIONSHIP_MATRIX;

  for (const entity of document.entities) {
    if (!entity.typeRef || !entity.typeRef.startsWith("archimate::")) {
      continue;
    }

    if (!document.indexes.entityTypesByName.get(entity.typeRef)) {
      pushDiagnostic(diagnostics, "archimate.rules", "error", `Unknown ArchiMate concept type '${entity.typeRef}'.`, {
        entityUid: entity.uid,
        code: "archimate.rules.requireKnownConceptType"
      });
    }

    if (isArchimateElement(document, entity) && !entity.id) {
      pushDiagnostic(diagnostics, "archimate.rules", "error", "Every ArchiMate element must have a stable id.", {
        entityUid: entity.uid,
        code: "archimate.rules.requireId"
      });
    }

    if (isArchimateElement(document, entity) && entity.label.trim().length === 0) {
      pushDiagnostic(diagnostics, "archimate.rules", "error", "Every ArchiMate element must have a non-empty label.", {
        entityUid: entity.uid,
        code: "archimate.rules.requireNonEmptyLabel"
      });
    }

    const provenanceKeys = ["prov::sourceFormat", "prov::sourceId", "prov::sourceFile"];
    const presentProvenanceKeys = provenanceKeys.filter((key) => entity.attributes?.values[key] !== undefined);

    if (presentProvenanceKeys.length > 0 && presentProvenanceKeys.length < provenanceKeys.length) {
      pushDiagnostic(
        diagnostics,
        "archimate.rules",
        "warning",
        "Imported ArchiMate content should preserve prov::sourceFormat, prov::sourceId, and prov::sourceFile together.",
        {
          entityUid: entity.uid,
          code: "archimate.rules.requireProvenanceWhenImported"
        }
      );
    }
  }

  for (const relationship of explicitArchimateRelationships(document)) {
    const sourceEntity = relationship.source;
    const targetRelationship = resolveRelationshipTargetRelationship(document, relationship);

    if (!sourceEntity.id) {
      pushDiagnostic(diagnostics, "archimate.rules", "error", "Every ArchiMate relationship source must have a stable id.", {
        relationshipUid: relationship.uid,
        entityUid: sourceEntity.uid,
        code: "archimate.rules.requireSourceId"
      });
    }

    if (!relationship.target && !targetRelationship) {
      pushDiagnostic(diagnostics, "archimate.rules", "error", `Relationship target '${relationship.targetRef ?? ""}' could not be resolved.`, {
        relationshipUid: relationship.uid,
        code: "archimate.rules.requireTargetResolved"
      });
      continue;
    }

    if (!relationship.id) {
      pushDiagnostic(
        diagnostics,
        "archimate.rules",
        "warning",
        "Relationship ids are recommended for exchange, diagnostics, and round-trip stability.",
        {
          relationshipUid: relationship.uid,
          code: "itm.relationship-identity.warnIfMissingRelationshipId"
        }
      );
    }

    if (!allowsMatrixEntry(document, relationship, matrix, hierarchy)) {
      pushDiagnostic(
        diagnostics,
        "archimate.rules",
        "error",
        `Relationship '${relationship.typeRef}' is not allowed for source '${sourceEntity.typeRef ?? "unknown"}' and target '${relationship.target?.typeRef ?? targetRelationship?.typeRef ?? relationship.targetRef ?? "unknown"}'.`,
        {
          relationshipUid: relationship.uid,
          entityUid: sourceEntity.uid,
          code: "archimate.rules.validateRelationshipAllowed"
        }
      );
    }

    if (relationship.typeRef === "archimate::assignment") {
      const validAssignment = entityMatchesType(sourceEntity, "archimate::ActiveStructureElement", hierarchy)
        && ((relationship.target && entityMatchesType(relationship.target, "archimate::BehaviorElement", hierarchy))
          || (relationship.target && entityMatchesType(relationship.target, "archimate::ActiveStructureElement", hierarchy)));

      if (!validAssignment) {
        pushDiagnostic(diagnostics, "archimate.rules", "error", "Assignment direction is not valid for the source and target concept types.", {
          relationshipUid: relationship.uid,
          code: "archimate.rules.validateAssignmentDirection"
        });
      }
    }

    if (relationship.typeRef === "archimate::serving") {
      const validServing = entityMatchesType(sourceEntity, "archimate::BehaviorElement", hierarchy)
        && ((relationship.target && entityMatchesType(relationship.target, "archimate::BehaviorElement", hierarchy))
          || (relationship.target && entityMatchesType(relationship.target, "archimate::ActiveStructureElement", hierarchy)));

      if (!validServing) {
        pushDiagnostic(diagnostics, "archimate.rules", "warning", "Serving should run from a behavior or service provider to a consuming behavior or structure element.", {
          relationshipUid: relationship.uid,
          code: "archimate.rules.validateServingDirection"
        });
      }
    }

    if (relationship.typeRef === "archimate::access") {
      const accessType = relationship.attributes?.values.accessType;
      const allowed = ["read", "write", "readWrite", "access"];

      if (accessType !== undefined && (typeof accessType !== "string" || !allowed.includes(accessType))) {
        pushDiagnostic(diagnostics, "archimate.rules", "error", "Access relationships may only use accessType values read, write, readWrite, or access.", {
          relationshipUid: relationship.uid,
          code: "archimate.rules.accessType"
        });
      }
    }

    if (relationship.typeRef === "archimate::influence") {
      const strength = relationship.attributes?.values.strength;
      const allowed = ["++", "+", "0", "-", "--", "custom"];

      if (strength !== undefined && (typeof strength !== "string" || !allowed.includes(strength))) {
        pushDiagnostic(diagnostics, "archimate.rules", "error", "Influence relationships may only use standard strengths or custom.", {
          relationshipUid: relationship.uid,
          code: "archimate.rules.influenceStrength"
        });
      }
    }

    if (relationship.typeRef === "archimate::specialization") {
      if (!relationship.target || !areCompatibleSpecializationTypes(sourceEntity, relationship.target, document, hierarchy)) {
        pushDiagnostic(diagnostics, "archimate.rules", "error", "Specialization must connect compatible concept types.", {
          relationshipUid: relationship.uid,
          code: "archimate.rules.validateSpecializationCompatibleTypes"
        });
      }
    }

    if (relationship.typeRef === "archimate::composition" || relationship.typeRef === "archimate::aggregation") {
      if (!relationship.target || !isArchimateElement(document, relationship.target)) {
        pushDiagnostic(diagnostics, "archimate.rules", "warning", "Composition and aggregation should connect ArchiMate elements explicitly representing a whole-part structure.", {
          relationshipUid: relationship.uid,
          code: "archimate.rules.validateWholePartRelationship"
        });
      } else {
        const sourceType = sourceEntity.typeRef ? document.indexes.entityTypesByName.get(sourceEntity.typeRef) : undefined;
        const targetType = relationship.target.typeRef ? document.indexes.entityTypesByName.get(relationship.target.typeRef) : undefined;
        const crossLayer = entityLayer(sourceType) !== entityLayer(targetType);

        if (crossLayer && relationship.attributes?.values.rationale === undefined) {
          pushDiagnostic(diagnostics, "archimate.rules", "warning", "Cross-layer whole-part relationships should carry a rationale attribute.", {
            relationshipUid: relationship.uid,
            code: "archimate.rules.warnCrossLayerWholePartWithoutRationale"
          });
        }
      }
    }
  }

  for (const relationship of document.relationships) {
    if (relationship.relationshipKind === "explicit" && !relationship.typeRef.startsWith("archimate::")) {
      if (isArchimateConcept(document, relationship.source) && relationship.target && isArchimateConcept(document, relationship.target)) {
        pushDiagnostic(diagnostics, "archimate.rules", "warning", "Use explicit archimate:: relationship types between ArchiMate concepts.", {
          relationshipUid: relationship.uid,
          code: "archimate.rules.warnUntypedOutgoingEdgesToArchimateConcepts"
        });
      }
    }

    if (relationship.relationshipKind === "containment" && isArchimateConcept(document, relationship.source) && relationship.target && isArchimateConcept(document, relationship.target)) {
      pushDiagnostic(diagnostics, "archimate.rules", "warning", "Indented hierarchy should be treated as organization, not an ArchiMate semantic composition, unless an explicit relationship is present.", {
        relationshipUid: relationship.uid,
        code: "archimate.rules.warnIfHierarchyWouldBeExportedAsSemanticRelationship"
      });
    }

    if (relationship.relationshipKind === "ordering" && isArchimateConcept(document, relationship.source) && relationship.target && isArchimateConcept(document, relationship.target)) {
      const hasExplicitFlow = document.relationships.some(
        (candidate) =>
          candidate.relationshipKind === "explicit"
          && candidate.typeRef === "archimate::flow"
          && candidate.source.uid === relationship.source.uid
          && candidate.target?.uid === relationship.target?.uid
      );

      if (!hasExplicitFlow) {
        pushDiagnostic(diagnostics, "archimate.rules", "observation", "Sibling ordering should not be exported as ArchiMate Flow unless an explicit archimate::flow relationship exists.", {
          relationshipUid: relationship.uid,
          code: "archimate.rules.warnIfOrderingWouldBeExportedAsFlow"
        });
      }
    }
  }

  for (const entity of document.entities) {
    if (!entity.typeRef || !entityMatchesType(entity, "archimate::Junction", hierarchy)) {
      continue;
    }

    const junctionKind = entity.attributes?.values.junctionKind;
    if (junctionKind !== "and" && junctionKind !== "or") {
      pushDiagnostic(diagnostics, "archimate.rules", "error", "ArchiMate junctions must declare junctionKind as and or or.", {
        entityUid: entity.uid,
        code: "archimate.rules.junctionKind"
      });
    }
  }

  const validReferences = existingViewReferences(document);

  for (const view of document.views ?? []) {
    for (const delta of view.deltas ?? []) {
      const reference = viewDeltaReference(delta);

      if (!reference || validReferences.has(reference)) {
        continue;
      }

      pushDiagnostic(diagnostics, "archimate.rules", "error", `View delta reference '${reference}' does not exist in the model.`, {
        viewUid: view.uid,
        code: "archimate.rules.validateViewDeltasReferenceExistingIds"
      });
    }
  }

  return diagnostics;
}

export function validateArchiMateRules(document: ItmDocument | ResolvedItmDocument, options: ValidateArchimateOptions = {}): ItmDiagnostic[] {
  return baseArchimateDiagnostics(asResolvedDocument(document), options);
}

export function validateArchiMateExchangeReadiness(
  document: ItmDocument | ResolvedItmDocument,
  options: ValidateArchimateOptions = {}
): ItmDiagnostic[] {
  const resolved = asResolvedDocument(document);
  const diagnostics = baseArchimateDiagnostics(resolved, options);

  for (const entity of resolved.entities) {
    if (!isArchimateConcept(resolved, entity)) {
      continue;
    }

    const entityType = entity.typeRef ? resolved.indexes.entityTypesByName.get(entity.typeRef) : undefined;

    if (!entityType || !stringAttribute(entityType, "exportType")) {
      pushDiagnostic(diagnostics, "archimate.exchange", "error", `Entity '${entity.id ?? entity.uid}' is missing an exportType-capable ArchiMate type definition.`, {
        entityUid: entity.uid,
        code: "archimate.exchange.validateExportReadiness"
      });
    }
  }

  for (const relationship of explicitArchimateRelationships(resolved)) {
    const relationshipType = resolved.indexes.relationshipTypesByName.get(relationship.typeRef);
    const targetRelationship = resolveRelationshipTargetRelationship(resolved, relationship);

    if (!relationshipType || !stringAttribute(relationshipType, "exportType")) {
      pushDiagnostic(diagnostics, "archimate.exchange", "error", `Relationship '${relationship.typeRef}' is missing an exportType-capable definition.`, {
        relationshipUid: relationship.uid,
        code: "archimate.exchange.validateExportReadiness"
      });
    }

    if (!relationship.source.id || (!relationship.target?.id && !targetRelationship && !relationship.targetRef)) {
      pushDiagnostic(diagnostics, "archimate.exchange", "error", "Exchange export requires stable source and target identifiers for relationships.", {
        relationshipUid: relationship.uid,
        code: "archimate.exchange.validateExportReadiness"
      });
    }
  }

  return diagnostics;
}

function propertyDefinitionId(key: string): string {
  return `prop_${sanitizeIdentifier(key)}`;
}

function toPropertyDefinitions(properties: ReadonlySet<string>, language: string): Array<Record<string, unknown>> {
  return [...properties].sort().map((key) => ({
    "@_identifier": propertyDefinitionId(key),
    "@_type": "string",
    name: {
      "@_xml:lang": language,
      "#text": key
    }
  }));
}

function toPropertyEntries(properties: Record<string, ItmValue>, language: string): Array<Record<string, unknown>> {
  return Object.entries(properties).map(([key, value]) => ({
    "@_propertyDefinitionRef": propertyDefinitionId(key),
    value: {
      "@_xml:lang": language,
      "#text": primitiveValueToString(value)
    }
  }));
}

function toOrganizationItems(organizations: ReturnType<typeof createCanonicalGraph>["organizations"]): Array<Record<string, unknown>> {
  return organizations.map((organization) => ({
    "@_identifierRef": organization.id,
    label: organization.label,
    ...(organization.children.length > 0 ? { item: toOrganizationItems(organization.children) } : {})
  }));
}

export function exportArchiMateExchangeResult(
  document: ItmDocument | ResolvedItmDocument,
  options: ExportArchimateExchangeOptions = {}
): ItmProcessingResult<string> {
  const resolved = asResolvedDocument(document);
  const diagnostics = validateArchiMateExchangeReadiness(resolved, options);

  if (diagnostics.some((diagnostic) => diagnostic.severity === "error")) {
    return { value: "", diagnostics };
  }

  const language = options.language ?? "en";
  const canonical = createCanonicalGraph(resolved, {
    includeImplicitRelationships: options.includeImplicitRelationships ?? false
  });
  const propertyNames = new Set<string>();
  const entityTypesByName = resolved.indexes.entityTypesByName;
  const relationshipTypesByName = resolved.indexes.relationshipTypesByName;

  for (const node of canonical.nodes) {
    for (const propertyName of Object.keys(node.properties)) {
      propertyNames.add(propertyName);
    }
  }

  for (const edge of canonical.edges) {
    for (const propertyName of Object.keys(edge.properties)) {
      propertyNames.add(propertyName);
    }
  }

  const modelIdentifier = options.modelIdentifier ?? sanitizeIdentifier(resolved.metadata?.title ?? "itm_archimate_model");
  const elements = canonical.nodes.map((node) => {
    const entity = resolved.entities.find((candidate) => candidate.uid === node.uid);
    const entityType = entity?.typeRef ? entityTypesByName.get(entity.typeRef) : undefined;

    return {
      "@_identifier": node.id,
      "@_xsi:type": entity && entity.typeRef ? entityExportType(entityType, entity) : "Concept",
      name: {
        "@_xml:lang": language,
        "#text": node.label
      },
      ...(node.description
        ? {
            documentation: {
              "@_xml:lang": language,
              "#text": node.description
            }
          }
        : {}),
      ...(Object.keys(node.properties).length > 0 ? { properties: { property: toPropertyEntries(node.properties, language) } } : {})
    };
  });
  const relationships = canonical.edges
    .filter((edge) => edge.relationshipKind === "explicit")
    .map((edge) => {
      const relationship = resolved.relationships.find((candidate) => candidate.uid === edge.uid);
      const relationshipType = relationship ? relationshipTypesByName.get(relationship.typeRef) : undefined;
      const targetIdentifier = edge.targetId ?? edge.targetRelationshipId ?? edge.targetRef;

      return {
        "@_identifier": edge.id,
        "@_xsi:type": relationship ? relationshipExportType(relationshipType, relationship) : localName(edge.typeRef),
        "@_source": edge.sourceId,
        "@_target": targetIdentifier,
        ...(Object.keys(edge.properties).length > 0 ? { properties: { property: toPropertyEntries(edge.properties, language) } } : {})
      };
    });

  const xmlObject: Record<string, unknown> = {
    model: {
      "@_xmlns": ARCHIMATE_EXCHANGE_NAMESPACE,
      "@_xmlns:xsi": XML_SCHEMA_INSTANCE_NAMESPACE,
      "@_identifier": modelIdentifier,
      name: {
        "@_xml:lang": language,
        "#text": resolved.metadata?.title ?? modelIdentifier
      },
      elements: {
        element: elements
      },
      ...(relationships.length > 0 ? { relationships: { relationship: relationships } } : {}),
      ...(propertyNames.size > 0 ? { propertyDefinitions: { propertyDefinition: toPropertyDefinitions(propertyNames, language) } } : {}),
      ...(options.includeOrganizations === false || canonical.organizations.length === 0
        ? {}
        : { organizations: { item: toOrganizationItems(canonical.organizations) } })
    }
  };

  const builder = new XMLBuilder({
    format: true,
    ignoreAttributes: false,
    suppressEmptyNode: true
  });
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n${builder.build(xmlObject)}`;
  return {
    value: xml,
    diagnostics
  };
}

export function exportArchiMateExchange(
  document: ItmDocument | ResolvedItmDocument,
  options: ExportArchimateExchangeOptions = {}
): string {
  const result = exportArchiMateExchangeResult(document, options);
  throwOnErrorDiagnostics(result.diagnostics, "ArchiMate exchange export failed due to error diagnostics.", result.value);
  return result.value;
}

function parseImportedPropertyValue(value: string): ItmValue {
  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  if (value === "null") {
    return null;
  }

  if (/^-?\d+(?:\.\d+)?$/u.test(value)) {
    return Number(value);
  }

  try {
    return JSON.parse(value) as ItmValue;
  } catch {
    return value;
  }
}

function collectImportedProperties(
  value: Record<string, unknown> | undefined,
  propertyDefinitions: ReadonlyMap<string, string>
): Record<string, ItmValue> {
  const properties: Record<string, ItmValue> = {};

  for (const property of asArray(value?.property as Record<string, unknown> | Record<string, unknown>[] | undefined)) {
    const definitionRef = property["@_propertyDefinitionRef"];
    const key = typeof definitionRef === "string" ? propertyDefinitions.get(definitionRef) : undefined;
    const propertyValue = readXmlText(property.value);

    if (!key || propertyValue === undefined) {
      continue;
    }

    properties[key] = parseImportedPropertyValue(propertyValue);
  }

  return properties;
}

export function importArchiMateExchangeResult(
  xml: string,
  options: ImportArchimateExchangeOptions = {}
): ItmProcessingResult<ItmDocument> {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    removeNSPrefix: true,
    parseTagValue: false,
    trimValues: false
  });
  const parsed = parser.parse(xml) as Record<string, unknown>;
  const model = parsed.model as Record<string, unknown> | undefined;
  const diagnostics: ItmDiagnostic[] = [];
  const defaultNamespace = options.defaultNamespace ?? "local";
  const namespaceUri = options.namespaceUri ?? `https://example.org/${defaultNamespace}`;

  if (!model) {
    const empty = createDocument();
    pushDiagnostic(diagnostics, "archimate.exchange", "error", "Exchange XML does not contain a model root element.", {
      code: "archimate.exchange.import"
    });
    return {
      value: empty,
      diagnostics
    };
  }

  const propertyDefinitions = new Map<string, string>();
  for (const definition of asArray((model.propertyDefinitions as Record<string, unknown> | undefined)?.propertyDefinition as Record<string, unknown> | Record<string, unknown>[] | undefined)) {
    const identifier = definition["@_identifier"];
    const name = readXmlText(definition.name);

    if (typeof identifier === "string" && name) {
      propertyDefinitions.set(identifier, name);
    }
  }

  const entities = asArray((model.elements as Record<string, unknown> | undefined)?.element as Record<string, unknown> | Record<string, unknown>[] | undefined);
  const relationships = asArray((model.relationships as Record<string, unknown> | undefined)?.relationship as Record<string, unknown> | Record<string, unknown>[] | undefined);
  const entityByIdentifier = new Map<string, ItmEntity>();
  const modelTitle = readXmlText(model.name);
  const document = createDocument({
    metadata: {
      ...(modelTitle ? { title: modelTitle } : {}),
      defaultNamespace,
      values: {
        ...(typeof model["@_identifier"] === "string" ? { archimateExchangeModelId: model["@_identifier"] } : {})
      }
    },
    namespaces: [
      {
        prefix: ARCHIMATE_NAMESPACE_PREFIX,
        uri: ARCHIMATE_NAMESPACE_URI
      },
      {
        prefix: defaultNamespace,
        uri: namespaceUri
      }
    ].filter((namespace) => Boolean(namespace.uri)),
    entities: [],
    relationships: []
  });

  for (const element of entities) {
    const identifier = typeof element["@_identifier"] === "string" ? element["@_identifier"] : undefined;
    const exportType = typeof element["@_type"] === "string" ? element["@_type"] : undefined;

    if (!identifier) {
      continue;
    }

    const properties = collectImportedProperties(element.properties as Record<string, unknown> | undefined, propertyDefinitions);
    properties["prov::sourceFormat"] = "archimate-exchange";
    properties["prov::sourceId"] = identifier;

    const entity = createEntity({
      uid: `entity:${sanitizeIdentifier(identifier)}`,
      id: identifier,
      qualifiedId: `${defaultNamespace}::${identifier}`,
      namespacePrefix: defaultNamespace,
      localId: identifier,
      label: readXmlText(element.name) ?? identifier,
      ...(exportType ? { typeRef: `archimate::${exportType}` } : {}),
      ...(Object.keys(properties).length > 0 ? { attributes: { values: properties } } : {}),
      ...(readXmlText(element.documentation)
        ? {
            description: {
              format: "markdown",
              text: readXmlText(element.documentation) ?? ""
            }
          }
        : {})
    });
    document.entities.push(entity);
    entityByIdentifier.set(identifier, entity);
  }

  for (const relationshipRecord of relationships) {
    const identifier = typeof relationshipRecord["@_identifier"] === "string" ? relationshipRecord["@_identifier"] : undefined;
    const sourceIdentifier = typeof relationshipRecord["@_source"] === "string" ? relationshipRecord["@_source"] : undefined;
    const targetIdentifier = typeof relationshipRecord["@_target"] === "string" ? relationshipRecord["@_target"] : undefined;
    const exportType = typeof relationshipRecord["@_type"] === "string" ? relationshipRecord["@_type"] : undefined;

    if (!identifier || !sourceIdentifier || !targetIdentifier) {
      continue;
    }

    const sourceEntity = entityByIdentifier.get(sourceIdentifier);

    if (!sourceEntity) {
      pushDiagnostic(diagnostics, "archimate.exchange", "error", `Relationship '${identifier}' references unknown source '${sourceIdentifier}'.`, {
        code: "archimate.exchange.import"
      });
      continue;
    }

    const targetEntity = entityByIdentifier.get(targetIdentifier);
    const relationshipType = exportType ? (RELATIONSHIP_EXPORT_TYPE_TO_TYPE_REF[exportType] ?? `archimate::${exportType}`) : "archimate::association";
    const properties = collectImportedProperties(relationshipRecord.properties as Record<string, unknown> | undefined, propertyDefinitions);
    properties["prov::sourceFormat"] = "archimate-exchange";
    properties["prov::sourceId"] = identifier;

    document.relationships.push(
      createRelationship({
        uid: `relationship:${sanitizeIdentifier(identifier)}`,
        id: identifier,
        sourceId: sourceEntity.uid,
        ...(sourceEntity.qualifiedId ? { sourceRef: sourceEntity.qualifiedId } : {}),
        ...(targetEntity
          ? {
              targetId: targetEntity.uid,
              ...(targetEntity.qualifiedId ? { targetRef: targetEntity.qualifiedId } : {})
            }
          : { targetRef: targetIdentifier }),
        typeRef: relationshipType,
        relationshipKind: "explicit",
        ...(Object.keys(properties).length > 0 ? { attributes: { values: properties } } : {})
      })
    );
  }

  return {
    value: document,
    diagnostics
  };
}

export function importArchiMateExchange(xml: string, options: ImportArchimateExchangeOptions = {}): ItmDocument {
  const result = importArchiMateExchangeResult(xml, options);
  throwOnErrorDiagnostics(result.diagnostics, "ArchiMate exchange import failed due to error diagnostics.", result.value);
  return result.value;
}

export function importArchiMateExchangeAsItmResult(
  xml: string,
  options: ImportArchimateExchangeAsItmOptions = {}
): ItmProcessingResult<string> {
  const imported = importArchiMateExchangeResult(xml, options);
  const serialized = serializeDocumentResult(imported.value, options);

  return {
    value: serialized.value,
    diagnostics: [...imported.diagnostics, ...serialized.diagnostics]
  };
}

export function importArchiMateExchangeAsItm(
  xml: string,
  options: ImportArchimateExchangeAsItmOptions = {}
): string {
  const result = importArchiMateExchangeAsItmResult(xml, options);
  throwOnErrorDiagnostics(result.diagnostics, "ArchiMate exchange to ITM conversion failed due to error diagnostics.", result.value);
  return result.value;
}
