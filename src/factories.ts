import type {
  ItmAttributeBag,
  ItmDocument,
  ItmEntity,
  ItmRelationship,
  ItmValue
} from "./model";

export function createAttributeBag(values: Record<string, ItmValue> = {}): ItmAttributeBag {
  return { values };
}

export function createEntity(entity: Omit<ItmEntity, "kind">): ItmEntity {
  return {
    kind: "entity",
    ...entity
  };
}

export function createRelationship(
  relationship: Omit<ItmRelationship, "kind">
): ItmRelationship {
  return {
    kind: "relationship",
    ...relationship
  };
}

export function createDocument(document: Partial<ItmDocument> = {}): ItmDocument {
  return {
    format: "itm",
    modelVersion: document.modelVersion ?? "1.0.0",
    ...document,
    entities: document.entities ?? [],
    relationships: document.relationships ?? []
  };
}