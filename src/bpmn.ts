import { XMLBuilder, XMLParser } from "fast-xml-parser";

import { throwOnErrorDiagnostics, type ItmProcessingResult } from "./diagnostics";
import { createTypeHierarchy, getStableRelationshipId, isEntityOfType } from "./extensions";
import { createDocument, createEntity, createRelationship } from "./factories";
import type {
  ItmAttributeBag,
  ItmDiagnostic,
  ItmDocument,
  ItmEntity,
  ItmRelationship,
  ItmValue
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

export interface ExportBpmnXmlOptions {
  definitionsId?: string;
  targetNamespace?: string;
}

export interface ImportBpmnXmlOptions {
  defaultNamespace?: string;
  namespaceUri?: string;
}

export interface ImportBpmnXmlAsItmOptions extends ImportBpmnXmlOptions, SerializeItmOptions {}

const BPMN_NAMESPACE_PREFIX = "bpmn";
const BPMN_NAMESPACE_URI = "https://www.omg.org/spec/BPMN/20100524/MODEL";
const BPMNDI_NAMESPACE_PREFIX = "bpmndi";
const BPMNDI_NAMESPACE_URI = "https://www.omg.org/spec/BPMN/20100524/DI";
const DC_NAMESPACE_PREFIX = "dc";
const DC_NAMESPACE_URI = "https://www.omg.org/spec/DD/20100524/DC";
const DI_NAMESPACE_PREFIX = "di";
const DI_NAMESPACE_URI = "https://www.omg.org/spec/DD/20100524/DI";
const XML_SCHEMA_INSTANCE_NAMESPACE = "http://www.w3.org/2001/XMLSchema-instance";

const USER_FACING_BPMN_TYPES = [
  "bpmn::FlowNode",
  "bpmn::Participant",
  "bpmn::ConversationNode",
  "bpmn::DataObjectReference",
  "bpmn::DataStoreReference",
  "bpmn::Message"
] as const;

const FLOW_SCOPE_TYPES = [
  "bpmn::Process",
  "bpmn::SubProcess",
  "bpmn::AdHocSubProcess",
  "bpmn::Transaction",
  "bpmn::Choreography",
  "bpmn::SubChoreography"
] as const;

const EDGE_CONTAINER_TYPES = [
  "bpmn::Process",
  "bpmn::SubProcess",
  "bpmn::AdHocSubProcess",
  "bpmn::Transaction",
  "bpmn::Collaboration"
] as const;

const ROOT_EXPORT_TYPES = new Set([
  "process",
  "collaboration",
  "message",
  "error",
  "escalation",
  "signal",
  "itemDefinition",
  "dataStore"
]);

const BPMN_XML_ENTITY_TYPES: Readonly<Record<string, string>> = {
  process: "bpmn::Process",
  collaboration: "bpmn::Collaboration",
  participant: "bpmn::Participant",
  startEvent: "bpmn::StartEvent",
  intermediateCatchEvent: "bpmn::IntermediateCatchEvent",
  intermediateThrowEvent: "bpmn::IntermediateThrowEvent",
  endEvent: "bpmn::EndEvent",
  boundaryEvent: "bpmn::BoundaryEvent",
  task: "bpmn::Task",
  userTask: "bpmn::UserTask",
  serviceTask: "bpmn::ServiceTask",
  sendTask: "bpmn::SendTask",
  receiveTask: "bpmn::ReceiveTask",
  subProcess: "bpmn::SubProcess",
  callActivity: "bpmn::CallActivity",
  exclusiveGateway: "bpmn::ExclusiveGateway",
  inclusiveGateway: "bpmn::InclusiveGateway",
  parallelGateway: "bpmn::ParallelGateway",
  eventBasedGateway: "bpmn::EventBasedGateway",
  textAnnotation: "bpmn::TextAnnotation",
  association: "bpmn::Association",
  dataObject: "bpmn::DataObject",
  dataObjectReference: "bpmn::DataObjectReference",
  dataStore: "bpmn::DataStore",
  dataStoreReference: "bpmn::DataStoreReference",
  laneSet: "bpmn::LaneSet",
  lane: "bpmn::Lane",
  message: "bpmn::Message"
};

const BPMN_XML_RELATIONSHIP_TYPES: Readonly<Record<string, string>> = {
  sequenceFlow: "bpmn::sequenceFlow",
  messageFlow: "bpmn::messageFlow",
  association: "bpmn::association",
  dataInputAssociation: "bpmn::dataInputAssociation",
  dataOutputAssociation: "bpmn::dataOutputAssociation",
  conversationLink: "bpmn::conversationLink"
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
  const normalized = value.replace(/[^A-Za-z0-9_.-]+/gu, "_").replace(/^_+|_+$/gu, "");
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

function isBpmnEntity(document: ResolvedItmDocument, entity: ResolvedItmEntity, typeRef: string): boolean {
  return isEntityOfType(document, entity, typeRef, true);
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

function relationshipExportType(type: ResolvedItmRelationshipType | undefined, relationship: Pick<ResolvedItmRelationship, "typeRef">): string {
  return stringAttribute(type, "exportType") ?? localName(relationship.typeRef);
}

function entityExportType(type: ResolvedItmEntityType | undefined, entity: Pick<ResolvedItmEntity, "typeRef">): string {
  return stringAttribute(type, "exportType") ?? localName(entity.typeRef ?? "BaseElement");
}

function entityReference(entity: Pick<ResolvedItmEntity, "id" | "qualifiedId" | "uid">): string {
  return entity.id ?? entity.qualifiedId ?? entity.uid;
}

function bpmnElementId(entity: Pick<ResolvedItmEntity, "id" | "uid" | "attributes">): string | undefined {
  const attributeId = entity.attributes?.values.id;
  return typeof attributeId === "string" && attributeId.length > 0 ? attributeId : entity.id;
}

function bpmnElementReference(entity: Pick<ResolvedItmEntity, "id" | "uid" | "qualifiedId" | "attributes">): string {
  return bpmnElementId(entity) ?? entityReference(entity);
}

function stableRelationshipIdentifier(relationship: ResolvedItmRelationship, index?: number): string {
  return relationship.id ?? getStableRelationshipId(relationship, index);
}

function nearestAncestorOfType(document: ResolvedItmDocument, entity: ResolvedItmEntity, types: readonly string[]): ResolvedItmEntity | undefined {
  let current: ResolvedItmEntity | undefined = entity;

  while (current) {
    const candidate = current;

    if (candidate.typeRef && types.some((typeRef) => isEntityOfType(document, candidate, typeRef, true))) {
      return current;
    }

    current = current.parent;
  }

  return undefined;
}

function ancestorsInclusive(entity: ResolvedItmEntity): ResolvedItmEntity[] {
  const ancestors: ResolvedItmEntity[] = [];
  let current: ResolvedItmEntity | undefined = entity;

  while (current) {
    ancestors.push(current);
    current = current.parent;
  }

  return ancestors;
}

function nearestSharedAncestor(document: ResolvedItmDocument, source: ResolvedItmEntity, target: ResolvedItmEntity, types: readonly string[]): ResolvedItmEntity | undefined {
  const targetAncestors = new Set(ancestorsInclusive(target).map((entity) => entity.uid));

  for (const ancestor of ancestorsInclusive(source)) {
    if (!targetAncestors.has(ancestor.uid)) {
      continue;
    }

    if (ancestor.typeRef && types.some((typeRef) => isEntityOfType(document, ancestor, typeRef, true))) {
      return ancestor;
    }
  }

  return undefined;
}

function flowScopeOf(document: ResolvedItmDocument, entity: ResolvedItmEntity): ResolvedItmEntity | undefined {
  return nearestAncestorOfType(document, entity, FLOW_SCOPE_TYPES);
}

function buildParticipantProcessMap(document: ResolvedItmDocument): Map<string, ResolvedItmEntity> {
  const participantsByProcessUid = new Map<string, ResolvedItmEntity>();

  for (const relationship of document.relationships) {
    if (relationship.typeRef !== "bpmn::participantProcessRef" || !relationship.target) {
      continue;
    }

    participantsByProcessUid.set(relationship.target.uid, relationship.source);
  }

  for (const participant of document.entities) {
    if (!participant.typeRef || !isEntityOfType(document, participant, "bpmn::Participant", true)) {
      continue;
    }

    const processRef = participant.attributes?.values.processRef;
    if (typeof processRef !== "string") {
      continue;
    }

    const process = document.entities.find(
      (candidate) => candidate.qualifiedId === processRef || candidate.id === processRef || candidate.uid === processRef
    );

    if (process) {
      participantsByProcessUid.set(process.uid, participant);
    }
  }

  return participantsByProcessUid;
}

function participantOf(document: ResolvedItmDocument, entity: ResolvedItmEntity, participantsByProcessUid: ReadonlyMap<string, ResolvedItmEntity>): ResolvedItmEntity | undefined {
  const directParticipant = nearestAncestorOfType(document, entity, ["bpmn::Participant"]);

  if (directParticipant) {
    return directParticipant;
  }

  const scope = flowScopeOf(document, entity);
  return scope ? participantsByProcessUid.get(scope.uid) : undefined;
}

function eventDefinitionRelationships(event: ResolvedItmEntity): ResolvedItmRelationship[] {
  return event.outgoing.filter((relationship) => relationship.typeRef === "bpmn::eventDefinition" && Boolean(relationship.target));
}

function baseBpmnDiagnostics(document: ResolvedItmDocument): ItmDiagnostic[] {
  const diagnostics: ItmDiagnostic[] = [];
  const hierarchy = createTypeHierarchy(document);
  const participantsByProcessUid = buildParticipantProcessMap(document);

  for (const entity of document.entities) {
    if (!entity.typeRef || !entity.typeRef.startsWith("bpmn::")) {
      continue;
    }

    if (!document.indexes.entityTypesByName.get(entity.typeRef)) {
      pushDiagnostic(diagnostics, "bpmn.rules", "error", `Unknown BPMN element type '${entity.typeRef}'.`, {
        entityUid: entity.uid,
        code: "bpmn.rules.requireKnownElementType"
      });
    }

    if (isBpmnEntity(document, entity, "bpmn::BaseElement") && !bpmnElementId(entity)) {
      pushDiagnostic(diagnostics, "bpmn.rules", "error", "BPMN elements must have stable ids compatible with BPMN XML id usage.", {
        entityUid: entity.uid,
        code: "bpmn.rules.requireId"
      });
    }

    if (
      USER_FACING_BPMN_TYPES.some((typeRef) => isEntityOfType(document, entity, typeRef, true))
      && entity.label.trim().length === 0
    ) {
      pushDiagnostic(diagnostics, "bpmn.rules", "warning", "User-facing BPMN elements should have readable labels/names.", {
        entityUid: entity.uid,
        code: "bpmn.rules.requireReadableLabel"
      });
    }

    if (isBpmnEntity(document, entity, "bpmn::BoundaryEvent")) {
      const attachedToRef = entity.attributes?.values.attachedToRef;
      const attached = typeof attachedToRef === "string"
        ? document.entities.find(
            (candidate) => candidate.qualifiedId === attachedToRef || candidate.id === attachedToRef || candidate.uid === attachedToRef
          )
        : undefined;

      if (!attached || !isBpmnEntity(document, attached, "bpmn::Activity")) {
        pushDiagnostic(diagnostics, "bpmn.rules", "error", "BoundaryEvent must attach to an Activity.", {
          entityUid: entity.uid,
          code: "bpmn.rules.requireAttachedToRefType"
        });
      }
    }

    if (isBpmnEntity(document, entity, "bpmn::CallActivity")) {
      const calledElementRef = entity.attributes?.values.calledElementRef;
      const explicitReference = entity.outgoing.find((relationship) => relationship.typeRef === "bpmn::calledElementRef");
      const target = explicitReference?.target ?? (
        typeof calledElementRef === "string"
          ? document.entities.find(
              (candidate) => candidate.qualifiedId === calledElementRef || candidate.id === calledElementRef || candidate.uid === calledElementRef
            )
          : undefined
      );

      if (!target || !isBpmnEntity(document, target, "bpmn::CallableElement")) {
        pushDiagnostic(diagnostics, "bpmn.rules", "error", "CallActivity must reference a callable BPMN element.", {
          entityUid: entity.uid,
          code: "bpmn.rules.requireCalledElementIsCallable"
        });
      }
    }

    if (isBpmnEntity(document, entity, "bpmn::DataObjectReference")) {
      const reference = entity.attributes?.values.dataObjectRef;
      const target = typeof reference === "string"
        ? document.entities.find(
            (candidate) => candidate.qualifiedId === reference || candidate.id === reference || candidate.uid === reference
          )
        : undefined;

      if (!target || !isBpmnEntity(document, target, "bpmn::DataObject")) {
        pushDiagnostic(diagnostics, "bpmn.rules", "error", "DataObjectReference must resolve to a compatible DataObject definition.", {
          entityUid: entity.uid,
          code: "bpmn.rules.validateReferencedDataElement"
        });
      }
    }

    if (isBpmnEntity(document, entity, "bpmn::DataStoreReference")) {
      const reference = entity.attributes?.values.dataStoreRef;
      const target = typeof reference === "string"
        ? document.entities.find(
            (candidate) => candidate.qualifiedId === reference || candidate.id === reference || candidate.uid === reference
          )
        : undefined;

      if (!target || !isBpmnEntity(document, target, "bpmn::DataStore")) {
        pushDiagnostic(diagnostics, "bpmn.rules", "error", "DataStoreReference must resolve to a compatible DataStore definition.", {
          entityUid: entity.uid,
          code: "bpmn.rules.validateReferencedDataElement"
        });
      }
    }
  }

  for (const relationship of document.relationships) {
    if (relationship.relationshipKind !== "explicit") {
      continue;
    }

    if (!relationship.typeRef.startsWith("bpmn::")) {
      pushDiagnostic(diagnostics, "bpmn.rules", "error", "Strict BPMN profile mode requires explicit BPMN relationship types.", {
        relationshipUid: relationship.uid,
        code: "bpmn.rules.requireBpmnRelationshipTypeWhenInStrictMode"
      });
      continue;
    }

    const relationshipType = document.indexes.relationshipTypesByName.get(relationship.typeRef);

    if (!relationshipType) {
      pushDiagnostic(diagnostics, "bpmn.rules", "error", `Unknown BPMN relationship type '${relationship.typeRef}'.`, {
        relationshipUid: relationship.uid,
        code: "bpmn.rules.requireKnownRelationshipType"
      });
      continue;
    }

    if (!relationship.target) {
      pushDiagnostic(diagnostics, "bpmn.rules", "error", `BPMN relationship target '${relationship.targetRef ?? ""}' could not be resolved.`, {
        relationshipUid: relationship.uid,
        code: "bpmn.rules.requireResolvedTarget"
      });
      continue;
    }

    if (!relationship.id) {
      pushDiagnostic(diagnostics, "bpmn.rules", "warning", "BPMN exported relationships should have stable ids; otherwise the exporter must derive deterministic ids.", {
        relationshipUid: relationship.uid,
        code: "bpmn.rules.warnIfRelationshipIdMissing"
      });
    }

    const sourceAllowed = relationshipType.sourceTypes.length === 0
      || relationshipType.sourceTypes.some((type) => entityMatchesType(relationship.source, type.name, hierarchy));
    const targetAllowed = relationshipType.targetTypes.length === 0
      || relationshipType.targetTypes.some((type) => entityMatchesType(relationship.target!, type.name, hierarchy));

    if (!sourceAllowed || !targetAllowed) {
      pushDiagnostic(
        diagnostics,
        "bpmn.rules",
        "error",
        `Relationship '${relationship.typeRef}' is not allowed for source '${relationship.source.typeRef ?? "unknown"}' and target '${relationship.target.typeRef ?? "unknown"}'.`,
        {
          relationshipUid: relationship.uid,
          code: "bpmn.rules.validateRelationshipAllowed"
        }
      );
    }

    if (relationship.typeRef === "bpmn::sequenceFlow") {
      const sourceScope = flowScopeOf(document, relationship.source);
      const targetScope = flowScopeOf(document, relationship.target);

      if (!sourceScope || !targetScope || sourceScope.uid !== targetScope.uid) {
        pushDiagnostic(diagnostics, "bpmn.rules", "error", "BPMN sequenceFlow must connect FlowNodes in the same process/subprocess/choreography scope.", {
          relationshipUid: relationship.uid,
          code: "bpmn.rules.requireSameFlowScope"
        });
      }

      const sourceParticipant = participantOf(document, relationship.source, participantsByProcessUid);
      const targetParticipant = participantOf(document, relationship.target, participantsByProcessUid);
      if (sourceParticipant && targetParticipant && sourceParticipant.uid !== targetParticipant.uid) {
        pushDiagnostic(diagnostics, "bpmn.rules", "error", "BPMN sequenceFlow must not cross participant boundaries.", {
          relationshipUid: relationship.uid,
          code: "bpmn.rules.rejectCrossParticipantSequenceFlow"
        });
      }
    }

    if (relationship.typeRef === "bpmn::messageFlow") {
      const hasCollaboration = document.entities.some(
        (candidate) => candidate.typeRef && isEntityOfType(document, candidate, "bpmn::Collaboration", true)
      );

      if (!hasCollaboration) {
        pushDiagnostic(diagnostics, "bpmn.rules", "error", "BPMN messageFlow must belong to a collaboration context.", {
          relationshipUid: relationship.uid,
          code: "bpmn.rules.requireCollaborationContext"
        });
      }

      const sourceParticipant = participantOf(document, relationship.source, participantsByProcessUid);
      const targetParticipant = participantOf(document, relationship.target, participantsByProcessUid);
      if (sourceParticipant && targetParticipant && sourceParticipant.uid === targetParticipant.uid) {
        pushDiagnostic(diagnostics, "bpmn.rules", "error", "BPMN messageFlow must connect interaction nodes across participants, not inside one participant.", {
          relationshipUid: relationship.uid,
          code: "bpmn.rules.rejectSameParticipantMessageFlow"
        });
      }
    }
  }

  for (const entity of document.entities) {
    if (isBpmnEntity(document, entity, "bpmn::StartEvent")) {
      const incomingSequenceFlows = entity.incoming.filter((relationship) => relationship.typeRef === "bpmn::sequenceFlow");
      if (incomingSequenceFlows.length > 0) {
        pushDiagnostic(diagnostics, "bpmn.rules", "error", "BPMN StartEvent must not have incoming sequenceFlow.", {
          entityUid: entity.uid,
          code: "bpmn.rules.rejectIncomingSequenceFlow"
        });
      }
    }

    if (isBpmnEntity(document, entity, "bpmn::EndEvent")) {
      const outgoingSequenceFlows = entity.outgoing.filter((relationship) => relationship.typeRef === "bpmn::sequenceFlow");
      if (outgoingSequenceFlows.length > 0) {
        pushDiagnostic(diagnostics, "bpmn.rules", "error", "BPMN EndEvent must not have outgoing sequenceFlow.", {
          entityUid: entity.uid,
          code: "bpmn.rules.rejectOutgoingSequenceFlow"
        });
      }
    }

    if (isBpmnEntity(document, entity, "bpmn::ExclusiveGateway") || isBpmnEntity(document, entity, "bpmn::InclusiveGateway")) {
      const outgoing = entity.outgoing.filter((relationship) => relationship.typeRef === "bpmn::sequenceFlow");
      const defaultFlow = entity.attributes?.values.default;

      if (outgoing.length > 1) {
        const withConditions = outgoing.filter((relationship) => relationship.attributes?.values.conditionExpression !== undefined);
        if (withConditions.length === 0 && defaultFlow === undefined) {
          pushDiagnostic(diagnostics, "bpmn.rules", "warning", "Exclusive and Inclusive gateways with multiple outgoing flows should define conditions and, where appropriate, a default flow.", {
            entityUid: entity.uid,
            code: "bpmn.rules.warnIfMultipleOutgoingWithoutConditionsOrDefault"
          });
        }
      }
    }

    if (isBpmnEntity(document, entity, "bpmn::ParallelGateway")) {
      const outgoing = entity.outgoing.filter((relationship) => relationship.typeRef === "bpmn::sequenceFlow");
      if (outgoing.some((relationship) => relationship.attributes?.values.conditionExpression !== undefined)) {
        pushDiagnostic(diagnostics, "bpmn.rules", "warning", "ParallelGateway outgoing flows should not use conditional expressions to encode decisions.", {
          entityUid: entity.uid,
          code: "bpmn.rules.warnIfOutgoingSequenceFlowsHaveConditions"
        });
      }
    }
  }

  return diagnostics;
}

export function validateBpmnRules(document: ItmDocument | ResolvedItmDocument): ItmDiagnostic[] {
  return baseBpmnDiagnostics(asResolvedDocument(document));
}

export function validateBpmnExportReadiness(document: ItmDocument | ResolvedItmDocument): ItmDiagnostic[] {
  const resolved = asResolvedDocument(document);
  const diagnostics = baseBpmnDiagnostics(resolved);

  for (const entity of resolved.entities) {
    if (!entity.typeRef || !entity.typeRef.startsWith("bpmn::")) {
      continue;
    }

    const entityType = resolved.indexes.entityTypesByName.get(entity.typeRef);
    if (!entityType || !stringAttribute(entityType, "exportType")) {
      pushDiagnostic(diagnostics, "bpmn.xml", "error", `Entity '${bpmnElementId(entity) ?? entity.uid}' is missing an exportType-capable BPMN type definition.`, {
        entityUid: entity.uid,
        code: "bpmn.xml.validateExportReadiness"
      });
    }
  }

  for (const relationship of resolved.relationships) {
    if (relationship.relationshipKind !== "explicit" || !relationship.typeRef.startsWith("bpmn::")) {
      continue;
    }

    const relationshipType = resolved.indexes.relationshipTypesByName.get(relationship.typeRef);
    if (!relationshipType || !stringAttribute(relationshipType, "exportType")) {
      pushDiagnostic(diagnostics, "bpmn.xml", "error", `Relationship '${relationship.typeRef}' is missing an exportType-capable BPMN definition.`, {
        relationshipUid: relationship.uid,
        code: "bpmn.xml.validateExportReadiness"
      });
    }

    if (!relationship.target) {
      pushDiagnostic(diagnostics, "bpmn.xml", "error", "BPMN XML export requires stable source and target references for exported relationships.", {
        relationshipUid: relationship.uid,
        code: "bpmn.xml.validateExportReadiness"
      });
    }
  }

  return diagnostics;
}

type XmlPayload = Record<string, unknown>;

interface XmlTaggedPayload {
  tag: string;
  payload: XmlPayload;
}

function appendTaggedPayload(container: XmlPayload, child: XmlTaggedPayload): void {
  const existing = container[child.tag];

  if (existing === undefined) {
    container[child.tag] = child.payload;
    return;
  }

  if (Array.isArray(existing)) {
    existing.push(child.payload);
    return;
  }

  container[child.tag] = [existing, child.payload];
}

function collectExportAttributes(entity: ResolvedItmEntity, omitKeys: readonly string[]): Record<string, string> {
  const attributes: Record<string, string> = {};
  const omit = new Set(omitKeys);

  for (const [key, value] of Object.entries(entity.attributes?.values ?? {})) {
    if (
      omit.has(key)
      || key.startsWith("prov::")
      || key.startsWith("layout::")
      || key === "id"
      || key === "name"
    ) {
      continue;
    }

    if (Array.isArray(value) || (value && typeof value === "object")) {
      continue;
    }

    attributes[`@_${key}`] = primitiveValueToString(value);
  }

  return attributes;
}

function exportDocumentation(entity: ResolvedItmEntity): XmlTaggedPayload[] {
  if (!entity.description?.text) {
    return [];
  }

  return [
    {
      tag: "bpmn:documentation",
      payload: {
        "#text": entity.description.text
      }
    }
  ];
}

function exportEventDefinitionTargets(
  document: ResolvedItmDocument,
  entity: ResolvedItmEntity,
  entityTypesByName: ReadonlyMap<string, ResolvedItmEntityType>
): XmlTaggedPayload[] {
  const results: XmlTaggedPayload[] = [];

  for (const relationship of eventDefinitionRelationships(entity)) {
    const target = relationship.target;
    if (!target || !target.typeRef) {
      continue;
    }

    const targetType = entityTypesByName.get(target.typeRef);
    const exportType = entityExportType(targetType, target);
    const payload: XmlPayload = {
      "@_id": target.id ?? sanitizeIdentifier(target.uid),
      ...collectExportAttributes(target, ["id"])
    };

    results.push({
      tag: `bpmn:${exportType}`,
      payload
    });
  }

  return results;
}

function exportRelationshipPayload(
  document: ResolvedItmDocument,
  relationship: ResolvedItmRelationship,
  relationshipType: ResolvedItmRelationshipType | undefined,
  index: number
): XmlTaggedPayload | undefined {
  if (!relationship.target) {
    return undefined;
  }

  const exportType = relationshipExportType(relationshipType, relationship);

  if (exportType === "processRef" || exportType === "flowNodeRef" || exportType === "calledElementRef" || exportType === "eventDefinitionRef") {
    return undefined;
  }

  const payload: XmlPayload = {
      "@_id": stableRelationshipIdentifier(relationship, index + 1),
      "@_sourceRef": bpmnElementReference(relationship.source),
      "@_targetRef": bpmnElementReference(relationship.target),
    ...collectExportAttributes(relationship.source as ResolvedItmEntity, [])
  };

  delete payload["@_id"];

  const relationshipAttributes = relationship.attributes?.values ?? {};
  const serializedAttributes: Record<string, string> = {};
  for (const [key, value] of Object.entries(relationshipAttributes)) {
    if (key === "id" || key.startsWith("prov::") || key.startsWith("layout::")) {
      continue;
    }

    if (Array.isArray(value) || (value && typeof value === "object")) {
      continue;
    }

    serializedAttributes[`@_${key}`] = primitiveValueToString(value);
  }

  return {
    tag: `bpmn:${exportType}`,
    payload: {
      "@_id": stableRelationshipIdentifier(relationship, index + 1),
        "@_sourceRef": bpmnElementReference(relationship.source),
        "@_targetRef": bpmnElementReference(relationship.target),
      ...serializedAttributes
    }
  };
}

function exportedProcessReference(participant: ResolvedItmEntity): string | undefined {
  const explicit = participant.outgoing.find((relationship) => relationship.typeRef === "bpmn::participantProcessRef" && relationship.target);
  if (explicit?.target) {
    return bpmnElementReference(explicit.target);
  }

  const attributeValue = participant.attributes?.values.processRef;
  return typeof attributeValue === "string" ? attributeValue : undefined;
}

function exportedCallActivityReference(entity: ResolvedItmEntity): string | undefined {
  const explicit = entity.outgoing.find((relationship) => relationship.typeRef === "bpmn::calledElementRef" && relationship.target);
  if (explicit?.target) {
    return bpmnElementReference(explicit.target);
  }

  const attributeValue = entity.attributes?.values.calledElementRef;
  return typeof attributeValue === "string" ? attributeValue : undefined;
}

function exportLaneMembershipRefs(lane: ResolvedItmEntity): string[] {
  return lane.outgoing
    .filter((relationship) => relationship.typeRef === "bpmn::laneMembership" && relationship.target)
    .map((relationship) => bpmnElementReference(relationship.target!));
}

function exportEntityPayload(
  document: ResolvedItmDocument,
  entity: ResolvedItmEntity,
  entityTypesByName: ReadonlyMap<string, ResolvedItmEntityType>,
  relationshipTypesByName: ReadonlyMap<string, ResolvedItmRelationshipType>
): XmlTaggedPayload | undefined {
  if (!entity.typeRef) {
    return undefined;
  }

  const entityType = entityTypesByName.get(entity.typeRef);
  const exportType = entityExportType(entityType, entity);

  if (!ROOT_EXPORT_TYPES.has(exportType) && !entity.parent && !isBpmnEntity(document, entity, "bpmn::Definitions")) {
    const rootEligible = isBpmnEntity(document, entity, "bpmn::FlowNode")
      || isBpmnEntity(document, entity, "bpmn::Artifact")
      || isBpmnEntity(document, entity, "bpmn::Lane")
      || isBpmnEntity(document, entity, "bpmn::LaneSet");
    if (rootEligible) {
      return undefined;
    }
  }

  const payload: XmlPayload = {
    "@_id": bpmnElementId(entity) ?? sanitizeIdentifier(entity.uid),
    ...(entity.label.trim().length > 0 && exportType !== "textAnnotation" ? { "@_name": entity.label } : {}),
    ...collectExportAttributes(entity, ["id", "name", "processRef", "calledElementRef"])
  };

  if (isBpmnEntity(document, entity, "bpmn::Participant")) {
    const processRef = exportedProcessReference(entity);
    if (processRef) {
      payload["@_processRef"] = processRef;
    }
  }

  if (isBpmnEntity(document, entity, "bpmn::CallActivity")) {
    const calledElementRef = exportedCallActivityReference(entity);
    if (calledElementRef) {
      payload["@_calledElement"] = calledElementRef;
    }
  }

  if (isBpmnEntity(document, entity, "bpmn::TextAnnotation")) {
    payload["bpmn:text"] = entity.description?.text ?? entity.label;
    delete payload["@_name"];
  }

  for (const documentation of exportDocumentation(entity)) {
    appendTaggedPayload(payload, documentation);
  }

  for (const child of entity.children) {
    const exportedChild = exportEntityPayload(document, child, entityTypesByName, relationshipTypesByName);
    if (exportedChild) {
      appendTaggedPayload(payload, exportedChild);
    }
  }

  for (const eventDefinition of exportEventDefinitionTargets(document, entity, entityTypesByName)) {
    appendTaggedPayload(payload, eventDefinition);
  }

  if (isBpmnEntity(document, entity, "bpmn::Lane")) {
    for (const reference of exportLaneMembershipRefs(entity)) {
      appendTaggedPayload(payload, {
        tag: "bpmn:flowNodeRef",
        payload: { "#text": reference }
      });
    }
  }

  if (isBpmnEntity(document, entity, "bpmn::Process") || isBpmnEntity(document, entity, "bpmn::SubProcess") || isBpmnEntity(document, entity, "bpmn::Collaboration")) {
    const relationships = document.relationships.filter((relationship) => {
      if (relationship.relationshipKind !== "explicit" || !relationship.target || relationship.typeRef === "bpmn::participantProcessRef" || relationship.typeRef === "bpmn::laneMembership" || relationship.typeRef === "bpmn::calledElementRef" || relationship.typeRef === "bpmn::eventDefinition") {
        return false;
      }

      if (relationship.typeRef === "bpmn::messageFlow") {
        return isBpmnEntity(document, entity, "bpmn::Collaboration")
          && nearestSharedAncestor(document, relationship.source, relationship.target, ["bpmn::Collaboration"])?.uid === entity.uid;
      }

      return nearestSharedAncestor(document, relationship.source, relationship.target, EDGE_CONTAINER_TYPES)?.uid === entity.uid;
    });

    relationships.forEach((relationship, index) => {
      const relationshipType = relationshipTypesByName.get(relationship.typeRef);
      const exportedRelationship = exportRelationshipPayload(document, relationship, relationshipType, index);
      if (exportedRelationship) {
        appendTaggedPayload(payload, exportedRelationship);
      }
    });
  }

  return {
    tag: `bpmn:${exportType}`,
    payload
  };
}

export function exportBpmnXmlResult(
  document: ItmDocument | ResolvedItmDocument,
  options: ExportBpmnXmlOptions = {}
): ItmProcessingResult<string> {
  const resolved = asResolvedDocument(document);
  const diagnostics = validateBpmnExportReadiness(resolved);

  if (diagnostics.some((diagnostic) => diagnostic.severity === "error")) {
    return { value: "", diagnostics };
  }

  const entityTypesByName = resolved.indexes.entityTypesByName;
  const relationshipTypesByName = resolved.indexes.relationshipTypesByName;
  const definitionsEntity = resolved.entities.find((entity) => entity.typeRef && isEntityOfType(resolved, entity, "bpmn::Definitions", true));
  const definitionsId = options.definitionsId
    ?? definitionsEntity?.id
    ?? sanitizeIdentifier(resolved.metadata?.title ?? "itm_bpmn_model");
  const targetNamespace = options.targetNamespace
    ?? (typeof definitionsEntity?.attributes?.values.targetNamespace === "string"
      ? definitionsEntity.attributes.values.targetNamespace
      : `https://example.org/${resolved.metadata?.defaultNamespace ?? "local"}`);

  const definitionsPayload: XmlPayload = {
    "@_id": definitionsId,
    "@_targetNamespace": targetNamespace,
    ...(resolved.metadata?.title ? { "@_name": resolved.metadata.title } : {}),
    ...(typeof definitionsEntity?.attributes?.values.exporter === "string" ? { "@_exporter": definitionsEntity.attributes.values.exporter } : {}),
    ...(typeof definitionsEntity?.attributes?.values.exporterVersion === "string" ? { "@_exporterVersion": definitionsEntity.attributes.values.exporterVersion } : {})
  };

  for (const entity of resolved.entities) {
    if (entity.parent || !entity.typeRef || isEntityOfType(resolved, entity, "bpmn::Definitions", true)) {
      continue;
    }

    const exportedEntity = exportEntityPayload(resolved, entity, entityTypesByName, relationshipTypesByName);
    if (exportedEntity) {
      appendTaggedPayload(definitionsPayload, exportedEntity);
    }
  }

  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    suppressEmptyNode: true,
    format: true,
    indentBy: "  "
  });
  const xmlObject = {
    "bpmn:definitions": {
      "@_xmlns:bpmn": BPMN_NAMESPACE_URI,
      "@_xmlns:bpmndi": BPMNDI_NAMESPACE_URI,
      "@_xmlns:dc": DC_NAMESPACE_URI,
      "@_xmlns:di": DI_NAMESPACE_URI,
      "@_xmlns:xsi": XML_SCHEMA_INSTANCE_NAMESPACE,
      ...definitionsPayload
    }
  };

  return {
    value: `<?xml version="1.0" encoding="UTF-8"?>\n${builder.build(xmlObject)}`,
    diagnostics
  };
}

export function exportBpmnXml(document: ItmDocument | ResolvedItmDocument, options: ExportBpmnXmlOptions = {}): string {
  const result = exportBpmnXmlResult(document, options);
  throwOnErrorDiagnostics(result.diagnostics, "BPMN XML export failed due to error diagnostics.", result.value);
  return result.value;
}

interface ImportedRelationshipRecord {
  tag: string;
  record: Record<string, unknown>;
}

function importedProperties(record: Record<string, unknown>, omittedKeys: readonly string[]): Record<string, ItmValue> {
  const properties: Record<string, ItmValue> = {};
  const omitted = new Set(omittedKeys);

  for (const [key, value] of Object.entries(record)) {
    if (!key.startsWith("@_") || omitted.has(key)) {
      continue;
    }

    properties[key.slice(2)] = typeof value === "string" ? parseImportedPropertyValue(value) : String(value);
  }

  return properties;
}

function createImportedEntity(
  defaultNamespace: string,
  typeRef: string,
  identifier: string,
  label: string,
  properties: Record<string, ItmValue>,
  parent?: ItmEntity,
  description?: string
): ItmEntity {
  return createEntity({
    uid: `entity:${sanitizeIdentifier(identifier)}`,
    id: identifier,
    qualifiedId: `${defaultNamespace}::${identifier}`,
    namespacePrefix: defaultNamespace,
    localId: identifier,
    typeRef,
    label,
    ...(Object.keys(properties).length > 0 ? { attributes: { values: properties } } : {}),
    ...(parent ? { parentId: parent.uid } : {}),
    ...(description
      ? {
          description: {
            format: "markdown",
            text: description
          }
        }
      : {})
  });
}

function parseImportedEntities(
  value: Record<string, unknown>,
  document: ItmDocument,
  defaultNamespace: string,
  importedRelationships: ImportedRelationshipRecord[],
  parent?: ItmEntity
): void {
  for (const [tagName, rawChildren] of Object.entries(value)) {
    if (tagName.startsWith("@_") || tagName === "bpmn:documentation" || tagName === "documentation" || tagName === "bpmn:text" || tagName === "text") {
      continue;
    }

    const segments = tagName.split(":");
    const localTag = tagName.includes(":") ? segments[segments.length - 1] ?? tagName : tagName;
    const typeRef = BPMN_XML_ENTITY_TYPES[localTag];

    if (!typeRef) {
      if (BPMN_XML_RELATIONSHIP_TYPES[localTag]) {
        for (const record of asArray(rawChildren as Record<string, unknown> | Record<string, unknown>[] | undefined)) {
          importedRelationships.push({
            tag: localTag,
            record
          });
        }
      }

      continue;
    }

    for (const record of asArray(rawChildren as Record<string, unknown> | Record<string, unknown>[] | undefined)) {
      const identifier = typeof record["@_id"] === "string" ? record["@_id"] : sanitizeIdentifier(`${localTag}_${document.entities.length + 1}`);
      const label = typeof record["@_name"] === "string"
        ? record["@_name"]
        : (localTag === "textAnnotation" ? readXmlText(record["text"] ?? record["bpmn:text"]) ?? identifier : identifier);
      const properties = importedProperties(record, ["@_id", "@_name"]);
      const documentation = readXmlText(record["documentation"] ?? record["bpmn:documentation"]);

      if (localTag === "participant" && typeof record["@_processRef"] === "string") {
        properties.processRef = record["@_processRef"];
      }

      if (localTag === "callActivity" && typeof record["@_calledElement"] === "string") {
        properties.calledElementRef = record["@_calledElement"];
      }

      if (localTag === "boundaryEvent" && typeof record["@_attachedToRef"] === "string") {
        properties.attachedToRef = record["@_attachedToRef"];
      }

      if (localTag === "dataObjectReference" && typeof record["@_dataObjectRef"] === "string") {
        properties.dataObjectRef = record["@_dataObjectRef"];
      }

      if (localTag === "dataStoreReference" && typeof record["@_dataStoreRef"] === "string") {
        properties.dataStoreRef = record["@_dataStoreRef"];
      }

      const entity = createImportedEntity(defaultNamespace, typeRef, identifier, label, properties, parent, documentation);
      document.entities.push(entity);

      if ((localTag === "participant") && typeof record["@_processRef"] === "string") {
        importedRelationships.push({
          tag: "participantProcessRef",
          record: {
            "@_id": `${identifier}_process_ref`,
            "@_sourceRef": identifier,
            "@_targetRef": record["@_processRef"]
          }
        });
      }

      if (localTag === "lane") {
        for (const reference of asArray(record.flowNodeRef as string | string[] | undefined)) {
          if (typeof reference !== "string") {
            continue;
          }

          importedRelationships.push({
            tag: "laneMembership",
            record: {
              "@_id": `${identifier}_${sanitizeIdentifier(reference)}_lane_membership`,
              "@_sourceRef": identifier,
              "@_targetRef": reference
            }
          });
        }
      }

      parseImportedEntities(record, document, defaultNamespace, importedRelationships, entity);
    }
  }
}

export function importBpmnXmlResult(xml: string, options: ImportBpmnXmlOptions = {}): ItmProcessingResult<ItmDocument> {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    removeNSPrefix: true,
    parseTagValue: false,
    trimValues: false
  });
  const parsed = parser.parse(xml) as Record<string, unknown>;
  const definitions = parsed.definitions as Record<string, unknown> | undefined;
  const diagnostics: ItmDiagnostic[] = [];
  const defaultNamespace = options.defaultNamespace ?? "local";
  const namespaceUri = options.namespaceUri ?? `https://example.org/${defaultNamespace}`;

  if (!definitions) {
    const empty = createDocument();
    pushDiagnostic(diagnostics, "bpmn.xml", "error", "BPMN XML does not contain a definitions root element.", {
      code: "bpmn.xml.import"
    });
    return {
      value: empty,
      diagnostics
    };
  }

  const document = createDocument({
    metadata: {
      ...(typeof definitions["@_name"] === "string" ? { title: definitions["@_name"] } : {}),
      defaultNamespace,
      values: {
        ...(typeof definitions["@_id"] === "string" ? { bpmnDefinitionsId: definitions["@_id"] } : {}),
        ...(typeof definitions["@_targetNamespace"] === "string" ? { bpmnTargetNamespace: definitions["@_targetNamespace"] } : {})
      }
    },
    namespaces: [
      {
        prefix: BPMN_NAMESPACE_PREFIX,
        uri: BPMN_NAMESPACE_URI
      },
      {
        prefix: defaultNamespace,
        uri: namespaceUri
      }
    ],
    entities: [],
    relationships: []
  });

  const importedRelationships: ImportedRelationshipRecord[] = [];
  parseImportedEntities(definitions, document, defaultNamespace, importedRelationships);

  const entitiesByIdentifier = new Map<string, ItmEntity>();
  for (const entity of document.entities) {
    if (entity.id) {
      entitiesByIdentifier.set(entity.id, entity);
    }
    entitiesByIdentifier.set(entity.uid, entity);
    if (entity.qualifiedId) {
      entitiesByIdentifier.set(entity.qualifiedId, entity);
    }
  }

  importedRelationships.forEach(({ tag, record }, index) => {
    const typeRef = BPMN_XML_RELATIONSHIP_TYPES[tag] ?? (tag === "participantProcessRef"
      ? "bpmn::participantProcessRef"
      : tag === "laneMembership"
        ? "bpmn::laneMembership"
        : undefined);

    if (!typeRef) {
      return;
    }

    const identifier = typeof record["@_id"] === "string" ? record["@_id"] : `${tag}_${index + 1}`;
    const sourceReference = typeof record["@_sourceRef"] === "string" ? record["@_sourceRef"] : undefined;
    const targetReference = typeof record["@_targetRef"] === "string" ? record["@_targetRef"] : undefined;

    if (!sourceReference || !targetReference) {
      pushDiagnostic(diagnostics, "bpmn.xml", "warning", `Skipped BPMN relationship '${identifier}' because sourceRef or targetRef is missing.`, {
        code: "bpmn.xml.import"
      });
      return;
    }

    const source = entitiesByIdentifier.get(sourceReference);
    const target = entitiesByIdentifier.get(targetReference);
    if (!source) {
      pushDiagnostic(diagnostics, "bpmn.xml", "error", `Relationship '${identifier}' references unknown source '${sourceReference}'.`, {
        code: "bpmn.xml.import"
      });
      return;
    }

    const properties = importedProperties(record, ["@_id", "@_sourceRef", "@_targetRef"]);
    document.relationships.push(
      createRelationship({
        uid: `relationship:${sanitizeIdentifier(identifier)}`,
        id: identifier,
        sourceId: source.uid,
        ...(source.qualifiedId ? { sourceRef: source.qualifiedId } : {}),
        ...(target
          ? {
              targetId: target.uid,
              ...(target.qualifiedId ? { targetRef: target.qualifiedId } : {})
            }
          : { targetRef: `${defaultNamespace}::${targetReference}` }),
        typeRef,
        relationshipKind: "explicit",
        ...(Object.keys(properties).length > 0 ? { attributes: { values: properties } } : {})
      })
    );
  });

  return {
    value: document,
    diagnostics
  };
}

export function importBpmnXml(xml: string, options: ImportBpmnXmlOptions = {}): ItmDocument {
  const result = importBpmnXmlResult(xml, options);
  throwOnErrorDiagnostics(result.diagnostics, "BPMN XML import failed due to error diagnostics.", result.value);
  return result.value;
}

export function importBpmnXmlAsItmResult(
  xml: string,
  options: ImportBpmnXmlAsItmOptions = {}
): ItmProcessingResult<string> {
  const imported = importBpmnXmlResult(xml, options);
  const serialized = serializeDocumentResult(imported.value, options);

  return {
    value: serialized.value,
    diagnostics: [...imported.diagnostics, ...serialized.diagnostics]
  };
}

export function importBpmnXmlAsItm(xml: string, options: ImportBpmnXmlAsItmOptions = {}): string {
  const result = importBpmnXmlAsItmResult(xml, options);
  throwOnErrorDiagnostics(result.diagnostics, "BPMN XML to ITM conversion failed due to error diagnostics.", result.value);
  return result.value;
}