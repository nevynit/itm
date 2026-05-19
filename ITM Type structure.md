Yes. The canonical in-memory model should have a richer set of first-order objects than just document/node/relationship. The ITM spec explicitly includes entities, relationships, metadata, directives, namespaces, type definitions, selectors, validation rules, plugins, styles, viewpoints, views, overlays, packages, and repositories as progressively richer layers. 

I would split them into **core first-order classes** and **supporting first-order classes**.

## Recommended first-order model objects

### Core

```ts
ItmDocument
ItmEntity
ItmRelationship
ItmNamespace
ItmMetadata
ItmDirective
ItmDiagnostic
ItmSourceRange
```

### Semantic/modeling layer

```ts
ItmEntityType
ItmRelationshipType
ItmSelector
ItmValidationRule
ItmAttributeBag
ItmDescription
ItmOverlay
```

### Processing/rendering layer

```ts
ItmPluginRequirement
ItmPipeline
ItmPipelineStep
ItmStyleRule
ItmViewpoint
ItmView
ItmViewDelta
ItmModelPatch
```

### Composition/reuse layer

```ts
ItmInclude
ItmPackage
ItmPackageUsage
ItmRepository
```

That is probably the right boundary for a canonical implementation.

---

# Proposed TypeScript interfaces

## Shared base types

```ts
type ItmUid = string;
type ItmLocalName = string;
type ItmQualifiedName = string; // e.g. "bpmn::Task", "local::order"

type ItmSeverity =
  | "error"
  | "warning"
  | "information"
  | "observation";

type ItmRelationshipKind =
  | "explicit"
  | "containment"
  | "ordering";

type ItmSourceSyntax =
  | "entity-line"
  | "inline-relationship"
  | "relationship-block"
  | "generated"
  | "directive"
  | "attribute-block"
  | "description-block";
```

```ts
interface ItmSourceRange {
  file?: string;
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
  startOffset?: number;
  endOffset?: number;
}
```

```ts
interface ItmElement {
  uid: ItmUid;
  id?: ItmLocalName;
  qualifiedId?: ItmQualifiedName;
  source?: ItmSourceRange;
  attributes: ItmAttributeBag;
}
```

---

## `ItmDocument`

The top-level object. This is what parsers return and plugins consume.

```ts
interface ItmDocument {
  format: "itm";
  modelVersion: string;

  uri?: string;
  metadata: ItmMetadata;

  namespaces: ItmNamespace[];

  entities: ItmEntity[];
  relationships: ItmRelationship[];

  roots: ItmEntity[];

  entityTypes: ItmEntityType[];
  relationshipTypes: ItmRelationshipType[];

  selectors: ItmSelector[];
  validationRules: ItmValidationRule[];

  pluginRequirements: ItmPluginRequirement[];

  styles: ItmStyleRule[];

  viewpoints: ItmViewpoint[];
  views: ItmView[];

  includes: ItmInclude[];
  packages: ItmPackage[];
  packageUsages: ItmPackageUsage[];
  repositories: ItmRepository[];

  overlays: ItmOverlay[];

  directives: ItmDirective[];
  diagnostics: ItmDiagnostic[];

  indexes: ItmDocumentIndexes;
}
```

```ts
interface ItmDocumentIndexes {
  entitiesByUid: Map<ItmUid, ItmEntity>;
  entitiesByQualifiedId: Map<ItmQualifiedName, ItmEntity>;

  relationshipsByUid: Map<ItmUid, ItmRelationship>;
  relationshipsByQualifiedId: Map<ItmQualifiedName, ItmRelationship>;

  namespacesByPrefix: Map<string, ItmNamespace>;

  viewpointsByName: Map<string, ItmViewpoint>;
  viewsByName: Map<string, ItmView>;
}
```

The `indexes` are not serialized source content; they are convenience structures built by the processor.

---

## `ItmEntity`

This is the “node” object, but I would use `Entity` in the canonical API and maybe keep `Node` only as a graph/viewer adapter term.

```ts
interface ItmEntity extends ItmElement {
  kind: "entity";

  label: string;
  rawLabel?: string;

  namespace?: ItmNamespace;
  localId?: string;

  type?: ItmEntityType;
  typeRef?: ItmQualifiedName;

  tags: Set<string>;

  description?: ItmDescription;

  parent?: ItmEntity;
  children: ItmEntity[];

  depth: number;
  rank: number;

  incoming: ItmRelationship[];
  outgoing: ItmRelationship[];

  overlays: ItmOverlay[];
}
```

Key point: `parent`, `children`, `incoming`, and `outgoing` are **object references**, not ids.

---

## `ItmRelationship`

A relationship is first-class. Containment and ordering relationships are generated from indentation and sibling order, but they should still be represented as relationships because the spec says hierarchy edges can be selected, styled, filtered, validated, and transformed like other relationships. 

```ts
interface ItmRelationship extends ItmElement {
  kind: "relationship";

  source: ItmEntity;
  target?: ItmEntity;

  sourceRef?: ItmQualifiedName;
  targetRef?: ItmQualifiedName;

  type?: ItmRelationshipType;
  typeRef: ItmQualifiedName;

  relationshipKind: ItmRelationshipKind;

  implicit: boolean;
  virtual: boolean;

  sourceSyntax: ItmSourceSyntax;

  overlays: ItmOverlay[];
}
```

Examples:

```ts
relationshipKind: "containment"; // generated from indentation
typeRef: "contains";

relationshipKind: "ordering";    // generated from sibling order
typeRef: "followed_by";

relationshipKind: "explicit";    // from @depends_on:target
typeRef: "depends_on";
```

---

## `ItmAttributeBag`

Attributes are used by entities, relationships, styles, views, rules, packages, etc.

```ts
interface ItmAttributeBag {
  values: Map<string, unknown>;

  get<T = unknown>(name: string): T | undefined;
  has(name: string): boolean;
  set(name: string, value: unknown): void;
  delete(name: string): void;

  sourceRanges?: Map<string, ItmSourceRange>;
}
```

For plugin safety, expose a read-only version by default:

```ts
interface ReadonlyItmAttributeBag {
  values: ReadonlyMap<string, unknown>;

  get<T = unknown>(name: string): T | undefined;
  has(name: string): boolean;
}
```

---

## `ItmDescription`

Descriptions are Markdown blocks attached to entities.

```ts
interface ItmDescription {
  format: "markdown";
  text: string;
  source?: ItmSourceRange;

  embeddedBlocks: ItmEmbeddedBlock[];
}
```

```ts
interface ItmEmbeddedBlock {
  language: string; // e.g. "mermaid", "dot"
  content: string;
  source?: ItmSourceRange;
}
```

---

## `ItmMetadata`

```ts
interface ItmMetadata {
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
  validationMode?: "strict" | "tolerant";

  values: Map<string, unknown>;
  source?: ItmSourceRange;
}
```

---

## `ItmDirective`

Keep unknown directives preserved. This is important for tolerant mode and plugin-backed extensions.

```ts
interface ItmDirective {
  name: string;              // metadata, include, namespace, rule, style, etc.
  argumentText?: string;     // raw text after directive name
  body?: unknown;            // parsed YAML-compatible block
  rawText: string;

  known: boolean;
  handled: boolean;

  source?: ItmSourceRange;
}
```

---

## `ItmNamespace`

```ts
interface ItmNamespace {
  prefix: string;
  uri: string;

  isDefault?: boolean;
  source?: ItmSourceRange;
}
```

---

## Type definitions

The spec has reusable entity and relationship type declarations. 

```ts
interface ItmEntityType extends ItmElement {
  kind: "entity-type";

  name: ItmQualifiedName;
  namespace?: ItmNamespace;

  description?: string;

  requiredAttributes: string[];
  optionalAttributes: string[];

  superTypes: ItmEntityType[];

  defaultStyles: ItmStyleRule[];
}
```

```ts
interface ItmRelationshipType extends ItmElement {
  kind: "relationship-type";

  name: ItmQualifiedName;
  namespace?: ItmNamespace;

  description?: string;

  sourceTypes: ItmEntityType[];
  targetTypes: ItmEntityType[];

  inverseType?: ItmRelationshipType;

  requiredAttributes: string[];
  optionalAttributes: string[];

  defaultStyles: ItmStyleRule[];
}
```

---

## `ItmSelector`

Selectors are important enough to be first-order because they are shared by styles, validation rules, viewpoints, views, diagnostics, transformations, visual editing, exports, and search. 

```ts
interface ItmSelector {
  raw: string;

  ast?: ItmSelectorExpression;

  source?: ItmSourceRange;

  matchesEntity(entity: ItmEntity, context: ItmSelectorContext): boolean;
  matchesRelationship(rel: ItmRelationship, context: ItmSelectorContext): boolean;
}
```

```ts
interface ItmSelectorExpression {
  kind:
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

  value?: string;
  children?: ItmSelectorExpression[];
}
```

```ts
interface ItmSelectorContext {
  document: ItmDocument;
  currentView?: ItmView;
  currentViewpoint?: ItmViewpoint;
}
```

---

## `ItmValidationRule`

```ts
interface ItmValidationRule extends ItmElement {
  kind: "validation-rule";

  name: string;
  selector: ItmSelector;

  pipeline: ItmPipeline;

  severity: ItmSeverity;
  message?: string;

  enabled: boolean;
}
```

---

## `ItmDiagnostic`

Diagnostics are first-class in the spec and may refer to nodes, relationships, directives, views, viewpoints, pipeline steps, files, namespaces, or packages. 

```ts
interface ItmDiagnostic {
  uid: ItmUid;

  source: string;
  severity: ItmSeverity;
  message: string;

  file?: string;
  range?: ItmSourceRange;

  entity?: ItmEntity;
  relationship?: ItmRelationship;
  directive?: ItmDirective;

  rule?: ItmValidationRule;
  pipelineStep?: ItmPipelineStep;

  view?: ItmView;
  viewpoint?: ItmViewpoint;

  namespace?: ItmNamespace;
  package?: ItmPackage;

  code?: string;
}
```

---

## Plugins and requirements

```ts
interface ItmPluginRequirement {
  name: string;
  versionRange?: string;

  resolved?: boolean;
  provider?: ItmPluginProvider;

  source?: ItmSourceRange;
}
```

```ts
interface ItmPluginProvider {
  name: string;
  version: string;

  capabilities: Set<
    | "parser-extension"
    | "selector-function"
    | "validation-step"
    | "transformation-step"
    | "renderer"
    | "exporter"
    | "style-interpreter"
    | "viewpoint-engine"
    | "visual-editor"
    | "write-back-handler"
  >;
}
```

---

## `ItmPipeline` and `ItmPipelineStep`

Viewpoints and validation rules are both pipeline-oriented in the spec. 

```ts
interface ItmPipeline {
  steps: ItmPipelineStep[];
}
```

```ts
interface ItmPipelineStep {
  uid: ItmUid;

  operation:
    | "select"
    | "includeEdges"
    | "exclude"
    | "validate"
    | "transform"
    | "layout"
    | "render"
    | "export"
    | "plugin";

  provider?: string;
  arguments: Record<string, unknown>;

  source?: ItmSourceRange;
}
```

---

## `ItmStyleRule`

Styles are cascading, can apply to nodes or relationships, and should be separate from semantic model facts. 

```ts
interface ItmStyleRule extends ItmElement {
  kind: "style-rule";

  selector: ItmSelector;

  style: ItmAttributeBag;

  origin:
    | "renderer-default"
    | "package"
    | "namespace"
    | "document"
    | "viewpoint"
    | "view"
    | "direct";

  priority: number;
}
```

---

## `ItmViewpoint`

A viewpoint is a reusable projection/rendering pipeline.

```ts
interface ItmViewpoint extends ItmElement {
  kind: "viewpoint";

  name: string;
  title?: string;
  description?: string;

  pipeline: ItmPipeline;

  parameters: ItmViewpointParameter[];

  styles: ItmStyleRule[];

  supportsVisualEditing: boolean;
}
```

```ts
interface ItmViewpointParameter {
  name: string;
  type: "string" | "number" | "boolean" | "selector" | "enum" | "object";
  defaultValue?: unknown;
  required?: boolean;
}
```

---

## `ItmView`

A view is an instance of a viewpoint and stores deltas over generated output, not a replacement model. 

```ts
interface ItmView extends ItmElement {
  kind: "view";

  name: string;
  title?: string;

  viewpoint: ItmViewpoint;
  viewpointRef: string;

  parameters: Record<string, unknown>;

  deltas: ItmViewDelta[];

  generatedAssets: ItmGeneratedAsset[];
}
```

```ts
type ItmViewDelta =
  | ItmHiddenDelta
  | ItmMovedDelta
  | ItmPinnedDelta
  | ItmStyleOverrideDelta
  | ItmLabelOverrideDelta
  | ItmExpandedCollapsedDelta;
```

```ts
interface ItmHiddenDelta {
  kind: "hidden";
  target: ItmEntity | ItmRelationship;
  hidden: boolean;
}
```

```ts
interface ItmMovedDelta {
  kind: "moved";
  target: ItmEntity | ItmRelationship;
  dx?: number;
  dy?: number;
  x?: number;
  y?: number;
}
```

```ts
interface ItmPinnedDelta {
  kind: "pinned";
  target: ItmEntity | ItmRelationship;
  x: number;
  y: number;
}
```

```ts
interface ItmStyleOverrideDelta {
  kind: "style-override";
  selector: ItmSelector;
  style: ItmAttributeBag;
}
```

```ts
interface ItmLabelOverrideDelta {
  kind: "label-override";
  target: ItmEntity | ItmRelationship;
  label: string;
}
```

```ts
interface ItmExpandedCollapsedDelta {
  kind: "expanded-collapsed";
  target: ItmEntity;
  expanded: boolean;
}
```

```ts
interface ItmGeneratedAsset {
  kind: "svg" | "png" | "html" | "json" | "xml" | "text";
  uri?: string;
  contentHash?: string;
}
```

---

## `ItmOverlay`

Overlays are first-order because they are controlled redefinitions/patches, not normal entities. 

```ts
interface ItmOverlay extends ItmElement {
  kind: "overlay";

  target: ItmEntity | ItmRelationship;
  targetRef: ItmQualifiedName;

  replacementLabel?: string;
  replacementTypeRef?: ItmQualifiedName;

  attributePatches: ItmAttributePatch[];
  relationshipAdditions: ItmRelationship[];
  descriptionPatch?: ItmDescriptionPatch;

  policy: "merge" | "replace" | "append";
}
```

```ts
interface ItmAttributePatch {
  key: string;
  value: unknown;
  operation: "set" | "delete" | "append" | "merge";
}
```

```ts
interface ItmDescriptionPatch {
  operation: "append" | "replace" | "merge";
  text: string;
}
```

---

## Composition classes

## `ItmInclude`

```ts
interface ItmInclude {
  target: string;

  resolvedDocument?: ItmDocument;

  status: "unresolved" | "resolved" | "missing" | "blocked" | "circular";

  source?: ItmSourceRange;
}
```

## `ItmPackage`

```ts
interface ItmPackage extends ItmElement {
  kind: "package";

  name: string;
  version?: string;
  namespace?: ItmNamespace;
  description?: string;

  namespaces: ItmNamespace[];
  entityTypes: ItmEntityType[];
  relationshipTypes: ItmRelationshipType[];
  validationRules: ItmValidationRule[];
  styles: ItmStyleRule[];
  viewpoints: ItmViewpoint[];
  pluginRequirements: ItmPluginRequirement[];
  referenceEntities: ItmEntity[];
  pipelines: ItmPipeline[];
}
```

## `ItmPackageUsage`

```ts
interface ItmPackageUsage {
  packageRef: string;
  package?: ItmPackage;

  scope:
    | "all"
    | "types"
    | "styles"
    | "rules"
    | "viewpoints"
    | "pipelines";

  source?: ItmSourceRange;
}
```

## `ItmRepository`

```ts
interface ItmRepository {
  name: string;
  location: string;

  kind?: "local" | "git" | "registry" | "web" | "internal" | "offline-bundle";

  allowed: boolean;
  resolved?: boolean;

  source?: ItmSourceRange;
}
```

---

## Write-back support

Because ITM wants controlled visual editing and explicit write-back, I would define patches as first-order too.

```ts
interface ItmModelPatch {
  uid: ItmUid;

  source: "visual-editor" | "plugin" | "manual" | "transformer";

  operations: ItmPatchOperation[];

  diagnostics: ItmDiagnostic[];
}
```

```ts
type ItmPatchOperation =
  | { kind: "create-entity"; parent?: ItmEntity; entity: Partial<ItmEntity> }
  | { kind: "rename-entity"; entity: ItmEntity; label: string }
  | { kind: "delete-entity"; entity: ItmEntity }
  | { kind: "set-entity-type"; entity: ItmEntity; typeRef: ItmQualifiedName }
  | { kind: "set-attribute"; target: ItmEntity | ItmRelationship; key: string; value: unknown }
  | { kind: "delete-attribute"; target: ItmEntity | ItmRelationship; key: string }
  | { kind: "create-relationship"; source: ItmEntity; target: ItmEntity; typeRef: ItmQualifiedName }
  | { kind: "delete-relationship"; relationship: ItmRelationship }
  | { kind: "update-view-delta"; view: ItmView; delta: ItmViewDelta };
```

---

# Minimal class list for first implementation

For the first parser milestone, I would not implement everything above. I would create these now, even if some are skeletal:

```ts
ItmDocument
ItmEntity
ItmRelationship
ItmAttributeBag
ItmDescription
ItmMetadata
ItmNamespace
ItmDirective
ItmDiagnostic
ItmSourceRange
ItmEntityType
ItmRelationshipType
ItmSelector
ItmStyleRule
ItmViewpoint
ItmView
ItmPipeline
ItmPipelineStep
ItmInclude
ItmOverlay
```

Then later add:

```ts
ItmValidationRule
ItmPluginRequirement
ItmPackage
ItmPackageUsage
ItmRepository
ItmModelPatch
```

## Key design rule

The **object model** should use object references:

```ts
relationship.source: ItmEntity
relationship.target: ItmEntity
entity.parent: ItmEntity
entity.children: ItmEntity[]
```

The **serialized/export model** can use ids.

That gives plugins a clean API while keeping persistence, diagnostics, diffing, and write-back stable.
