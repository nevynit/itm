export type ItmUid = string;
export type ItmLocalName = string;
export type ItmQualifiedName = string;

export type ItmPrimitive = string | number | boolean | null;
export type ItmValue =
  | ItmPrimitive
  | ItmValue[]
  | {
      [key: string]: ItmValue;
    };

export type ItmSeverity = "error" | "warning" | "information" | "observation";

export type ItmRelationshipKind = "explicit" | "containment" | "ordering";

export type ItmSourceSyntax =
  | "entity-line"
  | "inline-relationship"
  | "relationship-block"
  | "generated"
  | "directive"
  | "attribute-block"
  | "description-block";

export type ItmSelectorExpressionKind =
  | "all"
  | "entity-id"
  | "entity-type"
  | "tag"
  | "attribute"
  | "relationship-target"
  | "relationship-type"
  | "containment"
  | "ordering"
  | "view"
  | "viewpoint"
  | "and"
  | "or"
  | "xor"
  | "not"
  | "function";

export type ItmValidationMode = "strict" | "tolerant";

export type ItmIncludeStatus =
  | "unresolved"
  | "resolved"
  | "missing"
  | "blocked"
  | "circular";

export type ItmPatchSource = "visual-editor" | "plugin" | "manual" | "transformer";

export type ItmGeneratedAssetKind = "svg" | "png" | "html" | "json" | "xml" | "text";

export type ItmPluginCapability =
  | "parser-extension"
  | "selector-function"
  | "validation-step"
  | "transformation-step"
  | "renderer"
  | "exporter"
  | "style-interpreter"
  | "viewpoint-engine"
  | "visual-editor"
  | "write-back-handler";

export type ItmPipelineOperation =
  | "select"
  | "includeEdges"
  | "exclude"
  | "validate"
  | "transform"
  | "layout"
  | "render"
  | "export"
  | "plugin";

export type ItmStyleOrigin =
  | "renderer-default"
  | "package"
  | "namespace"
  | "document"
  | "viewpoint"
  | "view"
  | "direct";

export type ItmViewpointParameterType =
  | "string"
  | "number"
  | "boolean"
  | "selector"
  | "enum"
  | "object";

export type ItmOverlayPolicy = "merge" | "replace" | "append";

export type ItmAttributePatchOperation = "set" | "delete" | "append" | "merge";

export type ItmDescriptionPatchOperation = "append" | "replace" | "merge";

export type ItmRepositoryKind =
  | "local"
  | "git"
  | "registry"
  | "web"
  | "internal"
  | "offline-bundle";

export type ItmPackageUsageScope =
  | "all"
  | "types"
  | "styles"
  | "rules"
  | "viewpoints"
  | "pipelines";

export interface ItmSourceRange {
  file?: string;
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
  startOffset?: number;
  endOffset?: number;
}

export interface ItmAttributeBag {
  values: Record<string, ItmValue>;
  sourceRanges?: Record<string, ItmSourceRange>;
}

export interface ItmElement {
  uid: ItmUid;
  id?: ItmLocalName;
  qualifiedId?: ItmQualifiedName;
  sourceRange?: ItmSourceRange;
  attributes?: ItmAttributeBag;
}

export interface ItmEmbeddedBlock {
  language: string;
  content: string;
  source?: ItmSourceRange;
}

export interface ItmDescription {
  format: "markdown";
  text: string;
  source?: ItmSourceRange;
  embeddedBlocks?: ItmEmbeddedBlock[];
}

export interface ItmMetadata {
  title?: string;
  version?: string;
  description?: string;
  author?: string;
  owner?: string;
  defaultNamespace?: string;
  defaultRelationshipType?: string;
  defaultLanguageOrProfile?: string;
  created?: string;
  updated?: string;
  intendedRenderingMode?: string;
  intendedRenderingModes?: string[];
  validationMode?: ItmValidationMode;
  values?: Record<string, ItmValue>;
  source?: ItmSourceRange;
}

export interface ItmDirective {
  name: string;
  argumentText?: string;
  body?: ItmValue;
  selectorSource?: ItmSourceRange;
  bodySource?: ItmSourceRange;
  rawText: string;
  known: boolean;
  handled: boolean;
  source?: ItmSourceRange;
}

export interface ItmNamespace {
  prefix: string;
  uri: string;
  isDefault?: boolean;
  source?: ItmSourceRange;
}

export interface ItmSelectorExpression {
  kind: ItmSelectorExpressionKind;
  value?: string;
  children?: ItmSelectorExpression[];
}

export interface ItmSelector {
  raw: string;
  ast?: ItmSelectorExpression;
  source?: ItmSourceRange;
}

export interface ItmSelectorContext {
  documentUid?: string;
  currentViewUid?: ItmUid;
  currentViewpointUid?: ItmUid;
}

export interface ItmEntity extends ItmElement {
  kind: "entity";
  label: string;
  rawLabel?: string;
  namespacePrefix?: string;
  localId?: string;
  typeRef?: ItmQualifiedName;
  tags?: string[];
  description?: ItmDescription;
  parentId?: ItmUid;
  childIds?: ItmUid[];
  depth?: number;
  rank?: number;
  incomingRelationshipIds?: ItmUid[];
  outgoingRelationshipIds?: ItmUid[];
  overlayIds?: ItmUid[];
}

export interface ItmRelationship extends ItmElement {
  kind: "relationship";
  sourceId: ItmUid;
  targetId?: ItmUid;
  sourceRef?: ItmQualifiedName;
  targetRef?: ItmQualifiedName;
  typeRef: ItmQualifiedName;
  relationshipKind: ItmRelationshipKind;
  implicit?: boolean;
  virtual?: boolean;
  sourceSyntax?: ItmSourceSyntax;
  overlayIds?: ItmUid[];
}

export interface ItmStyleRule extends ItmElement {
  kind: "style-rule";
  selector: ItmSelector;
  style: ItmAttributeBag;
  origin: ItmStyleOrigin;
  priority: number;
}

export interface ItmEntityType extends ItmElement {
  kind: "entity-type";
  name: ItmQualifiedName;
  namespacePrefix?: string;
  description?: string;
  requiredAttributes?: string[];
  optionalAttributes?: string[];
  superTypeRefs?: ItmQualifiedName[];
  defaultStyleUids?: ItmUid[];
}

export interface ItmRelationshipType extends ItmElement {
  kind: "relationship-type";
  name: ItmQualifiedName;
  namespacePrefix?: string;
  description?: string;
  superTypeRefs?: ItmQualifiedName[];
  sourceTypeRefs?: ItmQualifiedName[];
  targetTypeRefs?: ItmQualifiedName[];
  inverseTypeRef?: ItmQualifiedName;
  requiredAttributes?: string[];
  optionalAttributes?: string[];
  defaultStyleUids?: ItmUid[];
}

export interface ItmPipelineStep {
  uid: ItmUid;
  operation: ItmPipelineOperation;
  provider?: string;
  arguments: Record<string, ItmValue>;
  source?: ItmSourceRange;
}

export interface ItmPipeline {
  steps: ItmPipelineStep[];
}

export interface ItmValidationRule extends ItmElement {
  kind: "validation-rule";
  name: string;
  selector: ItmSelector;
  pipeline: ItmPipeline;
  severity: ItmSeverity;
  message?: string;
  enabled: boolean;
}

export interface ItmPluginProvider {
  name: string;
  version: string;
  capabilities: ItmPluginCapability[];
}

export interface ItmPluginRequirement {
  name: string;
  versionRange?: string;
  resolved?: boolean;
  provider?: ItmPluginProvider;
  source?: ItmSourceRange;
}

export interface ItmViewpointParameter {
  name: string;
  type: ItmViewpointParameterType;
  defaultValue?: ItmValue;
  required?: boolean;
  description?: string;
  values?: ItmValue[];
}

export interface ItmViewpoint extends ItmElement {
  kind: "viewpoint";
  name: string;
  title?: string;
  description?: string;
  pipeline: ItmPipeline;
  parameters?: ItmViewpointParameter[];
  styleUids?: ItmUid[];
  supportsVisualEditing: boolean;
}

export interface ItmGeneratedAsset {
  kind: ItmGeneratedAssetKind;
  uri?: string;
  contentHash?: string;
  path?: string;
  hash?: string;
}

export interface ItmHiddenDelta {
  kind: "hidden";
  targetKind: "entity" | "relationship";
  targetUid?: ItmUid;
  targetRef?: string;
  hidden: boolean;
}

export interface ItmMovedDelta {
  kind: "moved";
  targetKind: "entity" | "relationship";
  targetUid?: ItmUid;
  targetRef?: string;
  dx?: number;
  dy?: number;
  x?: number;
  y?: number;
}

export interface ItmPinnedDelta {
  kind: "pinned";
  targetKind: "entity" | "relationship";
  targetUid?: ItmUid;
  targetRef?: string;
  x: number;
  y: number;
}

export interface ItmStyleOverrideDelta {
  kind: "style-override";
  selector: ItmSelector;
  style: ItmAttributeBag;
}

export interface ItmLabelOverrideDelta {
  kind: "label-override";
  targetKind: "entity" | "relationship";
  targetUid?: ItmUid;
  targetRef?: string;
  label: string;
}

export interface ItmExpandedCollapsedDelta {
  kind: "expanded-collapsed";
  targetUid?: ItmUid;
  targetRef?: string;
  expanded: boolean;
}

export type ItmViewDelta =
  | ItmHiddenDelta
  | ItmMovedDelta
  | ItmPinnedDelta
  | ItmStyleOverrideDelta
  | ItmLabelOverrideDelta
  | ItmExpandedCollapsedDelta;

export interface ItmView extends ItmElement {
  kind: "view";
  name: string;
  title?: string;
  viewpointRef: string;
  parameters?: Record<string, ItmValue>;
  deltas?: ItmViewDelta[];
  generatedAssets?: ItmGeneratedAsset[];
  notes?: string[];
}

export interface ItmAttributePatch {
  key: string;
  value?: ItmValue;
  operation: ItmAttributePatchOperation;
}

export interface ItmDescriptionPatch {
  operation: ItmDescriptionPatchOperation;
  text: string;
}

export interface ItmOverlay extends ItmElement {
  kind: "overlay";
  targetKind: "entity" | "relationship";
  targetUid?: ItmUid;
  targetRef: ItmQualifiedName;
  replacementLabel?: string;
  replacementTypeRef?: ItmQualifiedName;
  attributePatches?: ItmAttributePatch[];
  relationshipAdditions?: ItmRelationship[];
  descriptionPatch?: ItmDescriptionPatch;
  policy: ItmOverlayPolicy;
}

export interface ItmInclude {
  target: string;
  resolvedDocumentUid?: string;
  status: ItmIncludeStatus;
  source?: ItmSourceRange;
}

export interface ItmPackage extends ItmElement {
  kind: "package";
  name: string;
  version?: string;
  namespacePrefix?: string;
  description?: string;
  namespaces?: ItmNamespace[];
  entityTypes?: ItmEntityType[];
  relationshipTypes?: ItmRelationshipType[];
  validationRules?: ItmValidationRule[];
  styles?: ItmStyleRule[];
  viewpoints?: ItmViewpoint[];
  pluginRequirements?: ItmPluginRequirement[];
  referenceEntities?: ItmEntity[];
  pipelines?: ItmPipeline[];
}

export interface ItmPackageUsage {
  packageRef: string;
  packageUid?: ItmUid;
  scope: ItmPackageUsageScope;
  source?: ItmSourceRange;
}

export interface ItmRepository {
  name: string;
  location: string;
  kind?: ItmRepositoryKind;
  allowed: boolean;
  resolved?: boolean;
  source?: ItmSourceRange;
}

export interface ItmDiagnostic {
  uid: ItmUid;
  source: string;
  severity: ItmSeverity;
  message: string;
  file?: string;
  range?: ItmSourceRange;
  uri?: string;
  entityUid?: ItmUid;
  relationshipUid?: ItmUid;
  directiveName?: string;
  ruleUid?: ItmUid;
  pipelineStepUid?: ItmUid;
  viewUid?: ItmUid;
  viewpointUid?: ItmUid;
  namespacePrefix?: string;
  packageUid?: ItmUid;
  includeTarget?: string;
  includeStack?: string[];
  repositoryRef?: string;
  packageRef?: string;
  usingScope?: string;
  requirementRef?: string;
  code?: string;
}

export interface ItmCreateEntityPatchOperation {
  kind: "create-entity";
  parentUid?: ItmUid;
  entity: Partial<ItmEntity>;
}

export interface ItmRenameEntityPatchOperation {
  kind: "rename-entity";
  entityUid: ItmUid;
  label: string;
}

export interface ItmDeleteEntityPatchOperation {
  kind: "delete-entity";
  entityUid: ItmUid;
}

export interface ItmSetEntityTypePatchOperation {
  kind: "set-entity-type";
  entityUid: ItmUid;
  typeRef: ItmQualifiedName;
}

export interface ItmSetAttributePatchOperation {
  kind: "set-attribute";
  targetKind: "entity" | "relationship";
  targetUid: ItmUid;
  key: string;
  value: ItmValue;
}

export interface ItmDeleteAttributePatchOperation {
  kind: "delete-attribute";
  targetKind: "entity" | "relationship";
  targetUid: ItmUid;
  key: string;
}

export interface ItmCreateRelationshipPatchOperation {
  kind: "create-relationship";
  sourceUid: ItmUid;
  targetUid: ItmUid;
  typeRef: ItmQualifiedName;
}

export interface ItmDeleteRelationshipPatchOperation {
  kind: "delete-relationship";
  relationshipUid: ItmUid;
}

export interface ItmUpdateViewDeltaPatchOperation {
  kind: "update-view-delta";
  viewUid: ItmUid;
  delta: ItmViewDelta;
}

export type ItmPatchOperation =
  | ItmCreateEntityPatchOperation
  | ItmRenameEntityPatchOperation
  | ItmDeleteEntityPatchOperation
  | ItmSetEntityTypePatchOperation
  | ItmSetAttributePatchOperation
  | ItmDeleteAttributePatchOperation
  | ItmCreateRelationshipPatchOperation
  | ItmDeleteRelationshipPatchOperation
  | ItmUpdateViewDeltaPatchOperation;

export interface ItmModelPatch {
  uid: ItmUid;
  source: ItmPatchSource;
  operations: ItmPatchOperation[];
  diagnostics?: ItmDiagnostic[];
}

export interface ItmDocument {
  format: "itm";
  modelVersion: string;
  uri?: string;
  metadata?: ItmMetadata;
  namespaces?: ItmNamespace[];
  entities: ItmEntity[];
  relationships: ItmRelationship[];
  roots?: ItmUid[];
  entityTypes?: ItmEntityType[];
  relationshipTypes?: ItmRelationshipType[];
  selectors?: ItmSelector[];
  validationRules?: ItmValidationRule[];
  pluginRequirements?: ItmPluginRequirement[];
  styles?: ItmStyleRule[];
  viewpoints?: ItmViewpoint[];
  views?: ItmView[];
  includes?: ItmInclude[];
  packages?: ItmPackage[];
  packageUsages?: ItmPackageUsage[];
  repositories?: ItmRepository[];
  overlays?: ItmOverlay[];
  directives?: ItmDirective[];
  diagnostics?: ItmDiagnostic[];
}
