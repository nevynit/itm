import type {
  ItmDiagnostic,
  ItmDirective,
  ItmDocument,
  ItmEntity,
  ItmEntityType,
  ItmInclude,
  ItmNamespace,
  ItmOverlay,
  ItmPackage,
  ItmPackageUsage,
  ItmRelationship,
  ItmRelationshipType,
  ItmSelectorContext,
  ItmStyleRule,
  ItmUid,
  ItmValidationRule,
  ItmView,
  ItmViewpoint
} from "./model";

export interface ResolvedItmDocumentIndexes {
  entitiesByUid: ReadonlyMap<ItmUid, ResolvedItmEntity>;
  entitiesByQualifiedId: ReadonlyMap<string, ResolvedItmEntity>;
  relationshipsByUid: ReadonlyMap<ItmUid, ResolvedItmRelationship>;
  relationshipsByQualifiedId: ReadonlyMap<string, ResolvedItmRelationship>;
  namespacesByPrefix: ReadonlyMap<string, ItmNamespace>;
  viewpointsByName: ReadonlyMap<string, ResolvedItmViewpoint>;
  viewsByName: ReadonlyMap<string, ResolvedItmView>;
  entityTypesByName: ReadonlyMap<string, ResolvedItmEntityType>;
  relationshipTypesByName: ReadonlyMap<string, ResolvedItmRelationshipType>;
  packagesByUid: ReadonlyMap<ItmUid, ResolvedItmPackage>;
}

export interface ResolvedItmSelectorContext extends Omit<ItmSelectorContext, "documentUid" | "currentViewUid" | "currentViewpointUid"> {
  document: ResolvedItmDocument;
  currentView?: ResolvedItmView;
  currentViewpoint?: ResolvedItmViewpoint;
}

export interface ResolvedItmEntity extends Omit<ItmEntity, "parentId" | "childIds" | "incomingRelationshipIds" | "outgoingRelationshipIds" | "overlayIds"> {
  parent?: ResolvedItmEntity | undefined;
  children: ResolvedItmEntity[];
  incoming: ResolvedItmRelationship[];
  outgoing: ResolvedItmRelationship[];
  overlays: ResolvedItmOverlay[];
}

export interface ResolvedItmRelationship extends Omit<ItmRelationship, "overlayIds"> {
  source: ResolvedItmEntity;
  target?: ResolvedItmEntity | undefined;
  overlays: ResolvedItmOverlay[];
}

export interface ResolvedItmEntityType extends Omit<ItmEntityType, "superTypeRefs" | "defaultStyleUids"> {
  superTypes: ResolvedItmEntityType[];
  defaultStyles: ResolvedItmStyleRule[];
}

export interface ResolvedItmRelationshipType extends Omit<ItmRelationshipType, "superTypeRefs" | "sourceTypeRefs" | "targetTypeRefs" | "inverseTypeRef" | "defaultStyleUids"> {
  superTypes: ResolvedItmRelationshipType[];
  sourceTypes: ResolvedItmEntityType[];
  targetTypes: ResolvedItmEntityType[];
  inverseType?: ResolvedItmRelationshipType | undefined;
  defaultStyles: ResolvedItmStyleRule[];
}

export type ResolvedItmStyleRule = ItmStyleRule;
export type ResolvedItmValidationRule = ItmValidationRule;

export interface ResolvedItmViewpoint extends Omit<ItmViewpoint, "styleUids"> {
  styles: ResolvedItmStyleRule[];
}

export interface ResolvedItmView extends ItmView {
  viewpoint?: ResolvedItmViewpoint | undefined;
}

export interface ResolvedItmOverlay extends Omit<ItmOverlay, "relationshipAdditions"> {
  target?: ResolvedItmEntity | ResolvedItmRelationship | undefined;
  relationshipAdditions: ResolvedItmRelationship[];
}

export interface ResolvedItmInclude extends ItmInclude {
  resolvedDocument?: ResolvedItmDocument | undefined;
}

export interface ResolvedItmPackage extends Omit<ItmPackage, "entityTypes" | "relationshipTypes" | "validationRules" | "styles" | "viewpoints"> {
  entityTypes: ResolvedItmEntityType[];
  relationshipTypes: ResolvedItmRelationshipType[];
  validationRules: ResolvedItmValidationRule[];
  styles: ResolvedItmStyleRule[];
  viewpoints: ResolvedItmViewpoint[];
}

export interface ResolvedItmPackageUsage extends ItmPackageUsage {
  package?: ResolvedItmPackage | undefined;
}

export interface ResolvedItmDiagnostic extends Omit<ItmDiagnostic, "entityUid" | "relationshipUid" | "ruleUid" | "viewUid" | "viewpointUid" | "packageUid"> {
  entity?: ResolvedItmEntity | undefined;
  relationship?: ResolvedItmRelationship | undefined;
  directive?: ItmDirective | undefined;
  rule?: ResolvedItmValidationRule | undefined;
  view?: ResolvedItmView | undefined;
  viewpoint?: ResolvedItmViewpoint | undefined;
  namespace?: ItmNamespace | undefined;
  package?: ResolvedItmPackage | undefined;
}

export interface ResolvedItmDocument
  extends Omit<
    ItmDocument,
    | "entities"
    | "relationships"
    | "entityTypes"
    | "relationshipTypes"
    | "viewpoints"
    | "views"
    | "includes"
    | "packages"
    | "packageUsages"
    | "overlays"
    | "diagnostics"
  > {
  entities: ResolvedItmEntity[];
  relationships: ResolvedItmRelationship[];
  entityTypes?: ResolvedItmEntityType[] | undefined;
  relationshipTypes?: ResolvedItmRelationshipType[] | undefined;
  viewpoints?: ResolvedItmViewpoint[] | undefined;
  views?: ResolvedItmView[] | undefined;
  includes?: ResolvedItmInclude[] | undefined;
  packages?: ResolvedItmPackage[] | undefined;
  packageUsages?: ResolvedItmPackageUsage[] | undefined;
  overlays?: ResolvedItmOverlay[] | undefined;
  diagnostics?: ResolvedItmDiagnostic[] | undefined;
  indexes: ResolvedItmDocumentIndexes;
}