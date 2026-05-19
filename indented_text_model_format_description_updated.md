# Indented Text Model Format

## 1. Purpose and rationale

The Indented Text Model format, or ITM, is a human-readable text format for describing structured models.

It starts from the simplest possible structure: one line of text represents one thing. From there, it grows incrementally into a format that can describe entities, relationships, hierarchy, typed semantic models, validation rules, views, visual layouts, reusable packages, and repositories.

The design goal is not to replace specialist formats such as BPMN XML, ArchiMate exchange files, Graphviz DOT, Mermaid, GraphML, JSON, YAML, or SVG. Instead, ITM is intended to act as a resilient authoring and interchange layer between them.

ITM is designed around a few principles:

- **Human readability**: a person should be able to open the file in any text editor and understand most of it.
- **Progressive complexity**: a simple list is already a valid model; advanced constructs are added only when needed.
- **Model-first semantics**: the primary content is the model: entities, relationships, metadata, constraints, and views.
- **Plain-text resilience**: the format remains inspectable, diffable, mergeable, searchable, and recoverable even without the original tool.
- **Collaboration readiness**: ITM files fit naturally in Git, CI/CD workflows, code review, automated validation, and documentation pipelines.
- **Tool independence**: renderers such as Mermaid, Graphviz, Cytoscape, jsMind, Sigma, SVG viewers, or BPMN tools are presentation engines, not the canonical source.
- **Composable models**: models can include other files, use namespaces, import packages, and resolve reusable content from repositories.
- **Extensible automation**: pipelines, rules, transformations, and views can be backed by built-in logic, plugins, or scripting engines.

ITM can therefore be used as:

- an authoring format for lightweight models;
- an intermediate conversion format between modelling tools;
- a storage backbone for model repositories;
- a collaboration format for shared semantic models;
- a diagram generation source;
- a validation and diagnostics source;
- a human-readable fallback representation for richer models.

The same file can begin life as a simple list and later evolve into a typed, validated, styled, multi-view model.

---

## 2. Incremental model

ITM is best understood as a stack of progressively richer features.

A conforming implementation may support only the lower levels, or may support the full format.

Recommended conceptual levels:

| Level | Feature | Purpose |
|---|---|---|
| 1 | Simple list | One line equals one entity |
| 2 | Tags | Lightweight classification |
| 3 | Indentation | Hierarchy and containment |
| 4 | Automatic relationships | Generated containment and ordering links |
| 5 | Node ids | Stable references to entities |
| 6 | Links | Explicit relationships between entities |
| 7 | Typed links | Named relationship semantics |
| 8 | Markdown descriptions | Rich textual explanation attached to entities |
| 9 | Attributes | Structured data attached to nodes and edges |
| 10 | Directives | File-level instructions and declarations |
| 11 | Metadata | Document-level structured metadata |
| 12 | Includes | Composition from multiple files |
| 13 | Namespaces | Qualified names and conflict management |
| 14 | Types | Entity and relationship type definitions |
| 15 | Selectors | Shared query mechanism for styles, rules, and views |
| 16 | Validation rules | Model constraints and diagnostics |
| 17 | Plugins | External pipeline steps and rule engines |
| 18 | Cascading styles | Presentation guidance independent from semantics |
| 19 | Viewpoints | Reusable pipelines for model projections |
| 20 | Views | Specific viewpoint instances with deltas |
| 21 | Visual editing | Controlled write-back from rendered views |
| 22 | Explicit overlays | Controlled redefinition and patching |
| 23 | Packages | Reusable bundled definitions |
| 24 | Repositories | Remote or shared package/document sources |

---

## 3. Simple list

The minimum ITM document is a text file with one item per line.

```itm
Customer
Order
Invoice
Payment
Shipment
```

Each non-empty line defines one entity.

At this level there are no ids, no explicit relationships, no types, and no attributes. The model is a flat collection of entities.

A parser can represent this as:

```yaml
nodes:
  - label: Customer
  - label: Order
  - label: Invoice
  - label: Payment
  - label: Shipment
```

This is the foundation of the format: plain lines of text are already meaningful.

---

## 4. Tags

Tags provide lightweight classification.

A tag is written with `#` followed by a tag name.

```itm
Customer #external
Order #core
Invoice #finance
Payment #finance #critical
Shipment #logistics
```

Tags may appear anywhere in the label text.

```itm
Capture #customer feedback from support channels
Review order exceptions #operations before invoicing
```

A parser extracts the tags while preserving the readable label. Depending on implementation mode, the visible label may either retain or hide the tag markers.

Example parsed form:

```yaml
label: Capture customer feedback from support channels
tags:
  - customer
```

Tags can be used for:

- search;
- filtering;
- styling;
- validation;
- viewpoint selection;
- navigation;
- lightweight classification without defining a formal type system.

Recommended tag syntax:

```text
#[A-Za-z][A-Za-z0-9_-]*
```

---

## 5. Indented list

Indentation creates hierarchy.

```itm
Order handling
  Receive order
  Validate order
  Fulfil order
    Pick items
    Pack shipment
    Dispatch shipment
  Invoice order
```

A child is created by indenting a line one level deeper than the previous relevant parent line.

This creates an implicit containment structure:

```text
Order handling contains Receive order
Order handling contains Validate order
Order handling contains Fulfil order
Fulfil order contains Pick items
Fulfil order contains Pack shipment
Fulfil order contains Dispatch shipment
Order handling contains Invoice order
```

Indentation is part of the formal syntax and must be deterministic.

Canonical ITM uses **two spaces per indentation level**.

Tabs are allowed only as an input convenience. A tab is defined as exactly two spaces. Editors and parsers should normalize tabs to spaces before parsing, and tools should write normalized spaces back to disk.

Strict indentation rules:

- canonical files should use spaces only;
- one indentation level is two spaces;
- indentation must be a multiple of two spaces after tab normalization;
- same indentation means sibling;
- one deeper indentation level means child;
- smaller indentation means return to an earlier parent level;
- a dedent must match a previous indentation level;
- files that mix raw tabs and spaces in indentation should be normalized before parsing;
- if a parser cannot or does not normalize indentation, it must reject mixed tabs and spaces;
- inconsistent indentation is a validation error.

This avoids fragile editor-dependent interpretation while keeping the format compact. Long lines can still remain readable because one tab is equivalent to only two spaces.

The result is a tree or forest of entities.

## 6. Automatic relationships

Indentation is not just visual structure. It generates model relationships.

### 6.1 Containment relationship

Every parent-child indentation link creates an implicit `contains` relationship.

```itm
System
  Component A
  Component B
```

Equivalent generated relationships:

```text
System contains Component A
System contains Component B
```

The reverse relationship may be exposed as `contained_by`.

Internally, implementations may represent hierarchy edges as a reserved relationship kind, for example:

```text
=>
```

The hierarchy edge can be selected, styled, filtered, validated, and transformed like other relationships.

### 6.2 Ordering relationship

The order of sibling nodes also has meaning.

```itm
Process
  Step 1
  Step 2
  Step 3
```

The parser may generate sequence relationships:

```text
Step 1 followed_by Step 2
Step 2 followed_by Step 3
```

and the reverse:

```text
Step 2 follows Step 1
Step 3 follows Step 2
```

These relationships are useful for:

- process descriptions;
- ordered checklists;
- generated diagrams;
- validation of ordered structures;
- transformations into flow diagrams.

Ordering relationships should be generated deterministically from document order. An implementation may expose them as virtual relationships rather than writing them back into the file.

---

## 7. Node ids

An entity may have a stable identifier.

The identifier is written at the start of the line with `&id`.

```itm
&customer Customer
&order Order
&invoice Invoice
```

The id is metadata, not part of the label.

Parsed form:

```yaml
id: customer
label: Customer
```

Recommended local id syntax:

```text
[A-Za-z][A-Za-z0-9_-]*
```

A namespace-qualified id uses double colons:

```text
namespace::local_id
```

For example:

```itm
&local::order Order
```

The double-colon namespace delimiter is used consistently for ids, types, relationship types, selectors, and package-qualified names.

Ids are used for:

- explicit links;
- overlays;
- validation;
- styling;
- external references;
- stable generated outputs;
- visual editing write-back.

Ids must be unique within their namespace unless an explicit overlay is declared. Duplicate ids in the same namespace are validation errors by default. Namespace and overlay rules are described later.

---

## 8. Links and relationships

Explicit relationships are written as references beginning with `@`.

The simplest relationship form is:

```itm
&order Order
&invoice Invoice
&payment Payment
Order lifecycle @invoice @payment
```

In this form, `@invoice` and `@payment` create outgoing relationships from the current node to the referenced nodes.

The simplest possible link must remain simple:

```itm
@target
```

This is a core usability rule of ITM.

A link target is an identifier. Since ids use typical programming identifier syntax and contain no spaces, links can be separated by whitespace.

Example:

```itm
&order Order @invoice @payment @shipment
```

Equivalent parsed form:

```yaml
id: order
label: Order
relationships:
  - target: invoice
  - target: payment
  - target: shipment
```

If no relationship type is provided, a default type such as `related_to` may be used.

---

## 9. Typed links

Typed links add relationship semantics while preserving the simple `@target` form.

The recommended syntax is:

```itm
@relationship_type:target
```

Example:

```itm
&order Order @creates:invoice @paid_by:payment @fulfilled_by:shipment
```

Parsed form:

```yaml
id: order
label: Order
relationships:
  - type: creates
    target: invoice
  - type: paid_by
    target: payment
  - type: fulfilled_by
    target: shipment
```

The single colon `:` separates the relationship type from the target.

Namespaces use double colons `::`.

This gives a clean delimiter hierarchy:

```itm
@target
@relationship_type:target
@namespace::relationship_type:namespace::target
```

Example:

```itm
&customer [archimate::BusinessActor] Customer
&journey [archimate::BusinessProcess] Customer Journey @archimate::serves:local::customer
```

Parsed form:

```yaml
relationships:
  - type: archimate::serves
    target: local::customer
```

A tokenizer should treat `::` as part of a qualified name and `:` as the relationship assignment delimiter. This avoids ambiguous parsing of namespace-qualified relationship types and namespace-qualified targets.

Typed links can be used to represent semantic relationships such as:

- `depends_on`;
- `satisfies`;
- `verifies`;
- `mitigates`;
- `serves`;
- `realizes`;
- `triggers`;
- `flows_to`;
- `owned_by`.

## 10. Relationship attributes and relationship identity

Relationships can have attributes.

For simple relationships, inline attributes may be used:

```itm
&order Order @creates:invoice {confidence: high, source: workshop}
```

For richer relationships, a relationship may be written as a relationship block below the node.

```itm
&order Order
@creates:invoice
{
  confidence: high
  source: workshop
  status: proposed
}
```

Relationship identity is optional.

The way to assign an id to a relationship is to use the `id` attribute.

```itm
&order Order
@creates:invoice
{
  id: rel_order_invoice
  confidence: high
  source: workshop
}
```

This preserves the simple link forms:

```itm
@target
@connects_to:target
```

while still allowing a relationship to be referenced, styled, validated, or patched later.

If no relationship id is provided, the implementation may derive an internal identity from:

```text
source node id + relationship type + target node id + occurrence index
```

Relationship ids are useful when:

- multiple relationships exist between the same two nodes;
- a relationship needs attributes;
- a relationship needs diagnostics;
- a relationship needs styling;
- a view needs to store visual deltas against that specific edge;
- external tools require stable edge identifiers.

---

## 11. Markdown descriptions

An entity may have a rich description block.

Description lines start with `|`.

```itm
&order Order
| Represents a customer order.
|
| The order moves through validation, fulfilment, invoicing, and payment.
```

The text after the pipe is interpreted as Markdown.

The description is attached to the preceding entity. It is not a child node and does not change the entity label.

Example parsed form:

```yaml
id: order
label: Order
description: |
  Represents a customer order.

  The order moves through validation, fulfilment, invoicing, and payment.
```

Markdown descriptions may include ordinary Markdown:

```itm
&risk Payment failure
| ## Rationale
|
| This risk applies when the payment provider is unavailable.
|
| - customer cannot complete order
| - invoice remains unpaid
| - manual intervention may be required
```

They may also include fenced blocks for engines supported by the environment, such as Mermaid or Graphviz DOT.

``````itm
&process Order process
| This process can also be illustrated locally:
|
| ` ` `mermaid
| flowchart TD
|   A[Order] --> B[Invoice]
|   B --> C[Payment]
| ` ` `
``````

``````itm
&dependency Dependency example
| ` ` `dot
| digraph G {
|   Order -> Invoice;
|   Invoice -> Payment;
| }
| ` ` `
``````

The Markdown description is documentation attached to the model element. It is not the canonical graph structure, though embedded diagrams may be rendered as part of documentation views.

---

## 12. Node and edge attributes

Attributes are structured data attached to nodes or relationships.

Attributes are delimited by curly braces and expressed using YAML-compatible syntax.

### 12.1 Inline node attributes

For short attributes, an inline block may be used.

```itm
&invoice Invoice {status: draft, owner: finance}
```

### 12.2 Block node attributes

For richer attributes, use a block after the entity line and optional description.

```itm
&invoice Invoice
| Represents a billing document issued to the customer.
{
  status: draft
  owner: finance
  priority: high
  lifecycle:
    - created
    - approved
    - sent
    - paid
}
```

### 12.3 Edge attributes

Edge attributes can be written after a relationship.

```itm
&order Order
@creates:invoice
{
  id: rel_order_creates_invoice
  confidence: high
  source: process workshop
}
```

### 12.4 Attribute interpretation

Attributes are semantic data unless interpreted by a renderer, pipeline, rule, or style layer.

For example:

```itm
&component_a Component A {criticality: high, owner: platform}
```

is semantic metadata.

Whereas:

```itm
&component_a Component A {fill: '#e8f1ff', size: 18}
```

may be interpreted as rendering guidance by graph or mind map viewers.

To avoid confusion, the recommended approach is:

- use ordinary attributes for model facts;
- use `%style` for general presentation rules;
- reserve direct visual attributes for local overrides or simple cases.

---

## 13. Directives

Directives are file-level instructions.

A directive starts with `%`.

Examples:

```itm
%metadata
%include common-types.itm
%namespace bpmn https://www.omg.org/spec/BPMN/20100524/MODEL
%entitytype Task
%relationshiptype depends_on
%style [Task] { fill: '#e8f1ff' }
%viewpoint process_map
%view current_process_map
%package bpmn_profile
%using bpmn_profile
%repository shared https://example.org/models
%require itm.graphviz ^1.0.0
```

Directives do not create normal model entities unless the directive explicitly defines model content such as types, rules, styles, viewpoints, packages, or repositories.

Unknown directives may be:

- rejected by a strict parser;
- preserved by a tolerant parser;
- ignored with a warning;
- passed to a plugin if the relevant `%require` is present.

---

## 14. Metadata

Document metadata is written using the `%metadata` directive followed by a YAML block.

```itm
%metadata
{
  title: Order handling model
  version: 1.0
  author: Architecture Team
  defaultNamespace: example
  defaultRelationshipType: related_to
}
```

Metadata applies to the document as a whole.

It may include:

- title;
- version;
- description;
- author or owner;
- default namespace;
- default language/profile;
- creation/update information;
- intended rendering mode;
- validation mode;
- repository references.

Metadata is not a model node.

---

## 15. Include

The `%include` directive inserts or references another ITM file.

```itm
%include common-types.itm
%include shared/risks.itm
```

Includes allow a model to be composed from multiple files.

Possible uses:

- shared type definitions;
- common relationship definitions;
- reusable style libraries;
- validation rules;
- reference data;
- model fragments;
- package manifests.

An implementation should protect against:

- circular includes;
- missing files;
- unauthorized paths;
- incompatible namespaces;
- conflicting ids;
- duplicate package imports.

In local-only or security-conscious environments, include paths should be restricted to approved locations.

---

## 16. Namespaces

Namespaces prevent name collisions and allow profiles to coexist.

A namespace is declared with `%namespace`.

```itm
%namespace bpmn https://www.omg.org/spec/BPMN/20100524/MODEL
%namespace archimate https://www.opengroup.org/archimate
%namespace local https://example.org/local-model
```

A namespace declaration binds a prefix to a namespace URI or identifier.

ITM uses a strict delimiter hierarchy:

- `::` qualifies a name with a namespace;
- `:` assigns a relationship type to a target;
- repository references may use their own repository syntax, such as `shared:path/to/file.itm`, because they appear in directive values rather than in model identifiers.

Qualified names can be used for types, ids, relationships, selectors, and package content.

```itm
&local::order [bpmn::Task] Validate order
&local::payment [archimate::BusinessObject] Payment
```

Relationship types may also be namespace-qualified:

```itm
&local::task [bpmn::Task] Validate order @archimate::serves:local::customer
```

This parses cleanly as:

```yaml
type: archimate::serves
target: local::customer
```

The parser should treat `::` as part of a qualified name and the single `:` as the relationship assignment delimiter.

General form:

```text
@relationship-type:target-id
```

where either side may be namespace-qualified:

```text
@namespace::relationship-type:namespace::target-id
```

Namespace rules:

- ids must be unique within a namespace unless an explicit overlay is used;
- unqualified ids belong to the current or default namespace;
- imported packages should not pollute the current namespace unless explicitly used;
- namespace aliases should be stable within a document;
- namespace URIs identify semantic ownership, not necessarily fetchable URLs;
- namespace-qualified names should use `::`, not `:`.

## 17. Node and edge types

Types add formal semantics.

A node type is written in square brackets after the optional id.

```itm
&task1 [Task] Validate order
&event1 [Event] Order received
&gateway1 [Gateway] Payment required?
```

Types may be namespace-qualified.

```itm
&task1 [bpmn::Task] Validate order
&actor1 [archimate::BusinessActor] Customer
```

Relationship types are declared in links:

```itm
&task1 [Task] Validate order @triggers:task2
&task2 [Task] Send invoice
```

Types can also be declared as reusable definitions.

```itm
%entitytype Task
{
  description: A unit of work performed in a process.
  requiredAttributes:
    - owner
    - status
}

%relationshiptype triggers
{
  description: Indicates that completion of one element causes another to start.
  sourceTypes:
    - Task
    - Event
  targetTypes:
    - Task
    - Event
}
```

Type declarations can support:

- documentation;
- validation;
- styling defaults;
- editor completion;
- model navigation;
- transformation to external formats;
- semantic interoperability.

---

## 18. Selectors

Selectors are a shared mechanism for identifying model elements.

They are used by:

- styles;
- validation rules;
- viewpoints;
- views;
- diagnostics;
- transformations;
- visual editing;
- export filters;
- search tools.

Recommended selector forms:

| Selector | Meaning |
|---|---|
| `*` | all nodes |
| `&id` | node with id |
| `&namespace::id` | node with namespace-qualified id |
| `[Type]` | nodes of a type |
| `[namespace::Type]` | nodes of a namespace-qualified type |
| `#tag` | nodes with a tag |
| `{key=value}` | nodes or edges with an attribute value |
| `@target` | relationships targeting an id |
| `@namespace::target` | relationships targeting a namespace-qualified id |
| `@type:*` | relationships of a type |
| `@namespace::type:*` | relationships of a namespace-qualified type |
| `@type:target` | relationships of a type to a target |
| `@namespace::type:namespace::target` | relationships of a namespace-qualified type to a namespace-qualified target |
| `=>` | implicit containment relationships |
| `~>` | implicit ordering relationships |
| `%view:name` | a named view |
| `%viewpoint:name` | a named viewpoint |

Examples:

```itm
[Task]
[bpmn::Task]
#critical
{status=draft}
@depends_on:*
@bpmn::sequenceFlow:*
@archimate::serves:local::customer
=>
~>
```

Selectors should be expressive enough for common model operations while remaining readable.

### 18.1 Boolean selector operators

Selectors can be combined with Boolean operators.

The core Boolean operators are:

| Operator | Meaning |
|---|---|
| `AND` | both selectors must match |
| `OR` | either selector may match |
| `XOR` | exactly one selector must match |
| `NOT` | negates the following selector |

Boolean operators are case-insensitive.

These are equivalent:

```text
[Task] AND #critical
[Task] and #critical
[Task] And #critical
```

Selectors can be grouped with round brackets.

```text
([Task] OR [Event]) AND NOT #draft
([Requirement] AND #critical) OR ([Risk] AND {severity=high})
([Component] XOR [ExternalSystem]) AND {status=active}
```

Recommended operator precedence is:

1. parentheses;
2. `NOT`;
3. `AND`;
4. `XOR`;
5. `OR`.

Authors should use parentheses whenever precedence might be unclear.

### 18.2 Selector functions

The core selector function set is:

| Function | Meaning |
|---|---|
| `ALL(a, b, ...)` | all listed selectors must match |
| `ANY(a, b, ...)` | at least one listed selector must match |
| `NONE(a, b, ...)` | none of the listed selectors may match |
| `ONE(a, b, ...)` | exactly one listed selector must match |

Function names are case-insensitive.

Examples:

```text
ALL([Task], #critical, {status=open})
ANY([Risk], [Issue], #problem)
NONE(#draft, {status=closed})
ONE(#must, #should, #could)
```

The function forms are equivalent to Boolean expressions but are easier to generate from tools and easier to nest in YAML pipeline definitions.

Examples:

```yaml
select: "ALL([bpmn::Task], NOT #draft)"
select: "ANY(@depends_on:*, @bpmn::sequenceFlow:*)"
select: "NONE({status=closed}, #archived)"
```

The core language should not add more selector functions unless they are broadly useful and deterministic. Domain-specific selector functions should be provided by plugins and declared with `%require`.

Advanced implementations may add query clauses such as `WHERE`, but `WHERE` is not part of the mandatory selector core. Attribute selectors such as `{confidence=low}` should be preferred when possible.

The exact extended expression language may be implementation-defined, but the basic selector syntax, Boolean operators, grouping, and core selector functions should remain stable.

## 19. Validation rules

Validation rules define constraints over the model.

Rules can be declarative, pipeline-based, or plugin-backed.

A rule is declared with `%rule`.

```itm
%rule tasks_must_have_owner
{
  select: "[Task]"
  pipeline:
    - requireAttribute: owner
  severity: error
  message: "Tasks must define an owner."
}
```

Rules may apply to nodes:

```itm
%rule risks_must_have_severity
{
  select: "[Risk]"
  pipeline:
    - requireAttribute: severity
  severity: warning
  message: "Risks should define a severity."
}
```

Rules may apply to relationships:

```itm
%rule depends_on_connects_components
{
  select: "@depends_on:*"
  pipeline:
    - requireSourceType: Component
    - requireTargetType: Component
  severity: error
  message: "depends_on relationships must connect Components."
}
```

Rules may also check model structure:

```itm
%rule process_steps_are_ordered
{
  select: "[Process]"
  pipeline:
    - requireChildren
    - requireOrdering
  severity: information
  message: "Processes should contain ordered steps."
}
```

A rule pipeline is a sequence of validation steps. Steps may be built into the implementation, supplied by a plugin, or implemented in a scripting engine.

Validation should be able to produce diagnostics without changing the model.

---

## 20. Diagnostics

Diagnostics are messages produced by parsers, validators, pipelines, renderers, exporters, or visual editors.

A diagnostic may refer to:

- a line or text range;
- a node;
- a relationship;
- a directive;
- a pipeline step;
- a view or viewpoint;
- an included file;
- a namespace or package reference.

Recommended diagnostic shape:

```yaml
source: itm.validator
severity: warning
message: Risks should define a severity.
file: risks.itm
line: 12
range:
  from: 120
  to: 145
node: risk_payment_failure
relationship: null
rule: risks_must_have_severity
pipelineStep: requireAttribute
```

Recommended severities:

- `error`;
- `warning`;
- `information`;
- `observation`.

Diagnostics should be first-class outputs of ITM processing. They make the format useful in editors, CI/CD pipelines, model governance, and automated conversion workflows.

---

## 21. Plugins and `%require`

The `%require` directive declares a dependency on a plugin, library, profile, or pipeline provider.

```itm
%require itm.core ^1.0.0
%require itm.graphviz ^1.0.0
%require itm.mermaid ^1.0.0
%require local.bpmn-profile ^0.3.0
```

The directive is conceptually similar to an NPM dependency declaration.

It does not define how the plugin is implemented. The back-end or host environment decides whether a required capability is provided by:

- built-in code;
- a JavaScript plugin;
- a Lua script;
- a WebAssembly module;
- a local package;
- a remote package;
- an editor extension;
- a transformation service;
- another controlled execution environment.

A required plugin may provide:

- parser extensions;
- selector functions;
- validation steps;
- transformation steps;
- renderers;
- exporters;
- style interpreters;
- viewpoint engines;
- visual editors;
- write-back handlers.

Example use in a rule:

```itm
%require local.architecture-rules ^1.2.0

%rule no_closed_requirement_without_verification
{
  select: "[Requirement]"
  pipeline:
    - local.architecture-rules.requireVerificationWhenClosed
  severity: error
}
```

Example use in a viewpoint:

```itm
%require itm.graphviz ^1.0.0

%viewpoint dependency_graph
{
  pipeline:
    - select: "[Component]"
    - includeEdges: "@depends_on:*"
    - transform: graphviz.dot
    - render: graphviz.svg
}
```

A processor should report diagnostics when a required plugin is missing, disabled, incompatible, or fails to initialize.

---

## 22. Cascading styles

Styles describe presentation rules separately from the model semantics.

A style is declared with `%style` followed by a selector and a YAML-compatible block.

```itm
%style [Task]
{
  fill: "#e8f1ff"
  stroke: "#3b73d9"
  shape: rectangle
}

%style #critical
{
  stroke-width: 3
  font-weight: bold
}

%style @depends_on:*
{
  stroke: "#888888"
  stroke-dasharray: "4 2"
}

%style =>
{
  stroke: "#aaaaaa"
}
```

Styles are cascading. Multiple style rules may apply to the same node or relationship.

Recommended cascade order, from weakest to strongest:

1. renderer defaults;
2. package styles;
3. namespace/profile styles;
4. document styles;
5. viewpoint styles;
6. view-specific style overrides;
7. direct node or edge visual attributes.

Styles should use CSS-compatible names and values where possible, while allowing diagram-specific properties when needed.

Examples of common style properties:

```yaml
fill: "#e8f1ff"
stroke: "#3b73d9"
stroke-width: 2
font-size: 12
font-weight: bold
shape: rectangle
opacity: 0.8
line-style: dashed
```

Styles are optional rendering hints. They should not be required to understand the semantic model.

---

## 23. Viewpoints

A viewpoint defines a reusable way to derive a presentation or projection from the model.

A viewpoint is a pipeline.

It may:

- select a subset of the model;
- include or exclude relationships;
- transform the model into another format;
- apply a layout engine;
- render an output;
- produce diagnostics;
- expose visual editing capabilities.

Example:

```itm
%viewpoint dependency_graph
{
  description: Shows components and their dependency relationships.
  pipeline:
    - select: "[Component]"
    - includeEdges: "@depends_on:*"
    - transform: graph.model
    - layout: graphviz.dot
    - render: svg
}
```

A Mermaid mind map viewpoint:

```itm
%viewpoint capability_mindmap
{
  description: Shows capabilities as a mind map.
  pipeline:
    - select: "[Capability]"
    - includeEdges: "=>"
    - transform: mermaid.mindmap
    - render: mermaid.svg
}
```

A BPMN-oriented viewpoint:

```itm
%viewpoint bpmn_process
{
  description: Renders BPMN-like process elements.
  pipeline:
    - select: "[bpmn::Event], [bpmn::Task], [bpmn::Gateway]"
    - includeEdges: "@bpmn::sequenceFlow:*"
    - validate: bpmn.basicWellFormedness
    - transform: bpmn.xml
    - render: bpmn.viewer
}
```

The important design principle is that the ITM model remains canonical. Mermaid, DOT, SVG, BPMN XML, and other outputs are generated views, not the source of truth unless explicitly written back.

---

## 24. Views

A view is a specific instance of a viewpoint.

A viewpoint defines the reusable pipeline. A view records how a particular rendering of that viewpoint has been adjusted, customized, or preserved.

Example:

```itm
%view current_dependency_graph
{
  viewpoint: dependency_graph
  title: Current dependency graph
  parameters:
    includeDraft: false
  deltas:
    hidden:
      - node: experimental_component
    moved:
      - node: payment_service
        dx: 120
        dy: -40
      - node: invoice_service
        dx: -80
        dy: 30
    styleOverrides:
      - selector: "&payment_service"
        style:
          fill: "#fff3e0"
          stroke-width: 3
}
```

A view may store:

- selected viewpoint;
- viewpoint parameters;
- hidden nodes;
- hidden relationships;
- expanded/collapsed branches;
- moved nodes;
- pinned coordinates;
- style overrides;
- label overrides;
- renderer-specific options;
- notes about manual adjustments;
- references to generated assets.

The view does not replace the model. It stores deltas over the generated output.

This allows the model to evolve while preserving useful manual layout work. When the model changes, the viewpoint can be regenerated and the view deltas can be reapplied where possible.

---

## 25. Visual editing and write-back

ITM supports the idea that a model can be edited visually, but write-back must be explicit and controlled.

A visual editor may open a view, allow the user to move elements, hide elements, change styles, or create relationships. These changes can be written back in different ways depending on their nature.

### 25.1 View-level write-back

Presentation-only changes should be written to the view.

Examples:

- moving a node in a diagram;
- hiding a relationship in one view;
- overriding a color in one view;
- pinning a layout coordinate;
- expanding or collapsing a branch.

These changes belong in `%view`, because they are specific to a particular visual representation.

### 25.2 Model-level write-back

Semantic changes should be written to the model.

Examples:

- creating a new entity;
- renaming an entity label;
- adding a relationship;
- changing an entity type;
- adding an attribute;
- deleting a semantic relationship;
- changing a validation-relevant property.

These changes alter the ITM source model.

### 25.3 Safe editing mode

A host editor may use a safe visual editing pattern:

1. user opens a view in edit mode;
2. the source document is frozen for other editors;
3. the visual editor records proposed changes;
4. the user reviews the generated write-back patch;
5. the user applies or discards the patch;
6. the document is unfrozen.

This preserves the text source as the canonical artifact while still allowing rich visual editing.

---

## 26. Overlays and redefinition

ITM supports incremental composition through explicit overlays.

By default, ids must be unique within a namespace. If the same id is defined more than once in the same namespace, and no overlay marker is present, this is a validation error.

This default protects against accidental copy-paste duplication and unintended namespace collisions.

### 26.1 Explicit overlay marker

An overlay must be declared explicitly.

The recommended syntax is the `!overlay` node modifier, placed after the id and before the optional type.

```itm
&payment_service !overlay
{
  criticality: high
  status: under_review
}
@depends_on:fraud_service
```

The modifier is not a type. It is an instruction to patch an existing node.

General form:

```text
&id !overlay [[Type]] [optional replacement label]
```

Examples:

```itm
&payment_service !overlay
&payment_service !overlay [Component]
&payment_service !overlay [Component] Payment Service
```

### 26.2 Overlay example

Base definition:

```itm
&payment_service [Component] Payment Service
{
  owner: platform
  criticality: medium
}
```

Explicit overlay:

```itm
&payment_service !overlay
{
  criticality: high
  status: under_review
}
@depends_on:fraud_service
```

Result:

```yaml
id: payment_service
type: Component
label: Payment Service
attributes:
  owner: platform
  criticality: high
  status: under_review
relationships:
  - type: depends_on
    target: fraud_service
```

### 26.3 Overlay rules

Recommended overlay rules:

- duplicate ids without `!overlay` are validation errors;
- an overlay target must already exist, unless the processor explicitly supports forward overlays;
- missing attributes may be added;
- existing attributes may be overwritten;
- relationships may be added;
- descriptions may be appended, replaced, or merged depending on policy;
- label replacement should be explicit and should produce a diagnostic in strict mode;
- type replacement should be explicit and should produce a diagnostic in strict mode;
- overlays should preserve the original source location and the patch source location for diagnostics;
- processors should be able to report the final merged value and the origin of each patched field.

### 26.4 Overlay intent

This is closer to controlled monkey patching than classical inheritance.

It enables:

- model refinement;
- environment-specific overlays;
- package customization;
- separation of base models and local changes;
- incremental migration from simple notes to typed models;
- controlled extension of imported models.

View-specific visual adjustments should normally be stored in `%view`, not in semantic overlays. An overlay changes the model. A view delta changes one rendered instance of the model.

## 27. Packages and `%using`

Packages group reusable definitions.

A package may contain:

- namespace declarations;
- entity types;
- relationship types;
- validation rules;
- styles;
- viewpoints;
- reference entities;
- transformation pipelines;
- plugin requirements;
- documentation.

A package is declared with `%package`.

```itm
%package bpmn_profile
{
  version: 0.1.0
  namespace: bpmn
  description: Basic BPMN semantic profile for ITM.
}
```

A model can include or import package files without automatically bringing all names into the current namespace.

The `%using` directive activates selected package content.

```itm
%include packages/bpmn-profile.itm
%using bpmn_profile
```

or selectively:

```itm
%using bpmn_profile.types
%using bpmn_profile.styles
%using bpmn_profile.rules
```

This distinction allows a file to know about available packages without polluting its working namespace.

Package usage should define:

- which namespaces become visible;
- which types are available unqualified;
- which rules are active;
- which styles are active;
- which viewpoints are offered;
- whether package content can be overridden locally.

---

## 28. Repositories

Repositories provide named locations for reusable ITM content.

A repository is declared with `%repository`.

```itm
%repository shared https://example.org/itm
%repository company file://models/company
%repository local ./packages
```

A repository name can then be used in include or package references.

```itm
%include shared:profiles/bpmn.itm
%include shared:profiles/archimate.itm
%include company:reference-data/locations.itm
```

The host environment decides how repository references are resolved.

A repository may be backed by:

- a local folder;
- a Git repository;
- a package registry;
- a web endpoint;
- an internal document store;
- an application-managed library;
- a locked-down offline bundle.

Repository support is useful for:

- reusable semantic profiles;
- organization-wide reference data;
- shared style libraries;
- common viewpoints;
- validation packages;
- modelling templates;
- controlled architecture repositories.

Security-conscious environments should restrict repository protocols, domains, credentials, and write access.

---

## 29. Complete syntax reference

This section summarizes the full ITM syntax after all incremental features have been introduced.

### 29.1 Entity line

Recommended entity line structure:

```text
[indentation] [&id] [[Type]] label text with optional #tags [inline attributes] [inline links]
```

Examples:

```itm
&order [BusinessObject] Customer Order #core {status: draft} @created_by:customer
&invoice [BusinessObject] Invoice #finance @derived_from:order
```

Tags may appear anywhere in the label.

```itm
&feedback Capture #customer feedback from support channels
```

### 29.2 Entity with description and attributes

```itm
&order [BusinessObject] Customer Order #core
| Represents a customer order.
|
| The description is Markdown and may include lists, tables, links, code blocks,
| Mermaid diagrams, Graphviz diagrams, or other supported fenced blocks.
{
  status: draft
  owner: sales
  priority: high
}
```

### 29.3 Simple relationship

```itm
&order Order @invoice
```

or as a block:

```itm
&order Order
@invoice
```

### 29.4 Typed relationship

```itm
&order Order @creates:invoice
```

or as a block:

```itm
&order Order
@creates:invoice
```

### 29.5 Typed relationship with attributes and id

```itm
&order Order
@creates:invoice
{
  id: rel_order_invoice
  confidence: high
  source: workshop
}
```

### 29.6 Hierarchy

```itm
&process [Process] Order handling
  &receive [Task] Receive order
  &validate [Task] Validate order
  &fulfil [Task] Fulfil order
    &pick [Task] Pick items
    &pack [Task] Pack shipment
    &dispatch [Task] Dispatch shipment
```

Generated relationships:

```text
process contains receive
process contains validate
process contains fulfil
fulfil contains pick
fulfil contains pack
fulfil contains dispatch
receive followed_by validate
validate followed_by fulfil
pick followed_by pack
pack followed_by dispatch
```

### 29.7 Metadata

```itm
%metadata
{
  title: Order handling model
  version: 1.0
  defaultNamespace: example
}
```

### 29.8 Include

```itm
%include common-types.itm
%include shared:profiles/bpmn.itm
```

### 29.9 Namespace

```itm
%namespace bpmn https://www.omg.org/spec/BPMN/20100524/MODEL
%namespace local https://example.org/local-model
```

### 29.10 Type definitions

```itm
%entitytype Task
{
  description: A unit of work.
  requiredAttributes:
    - owner
    - status
}

%relationshiptype depends_on
{
  description: A dependency between two components.
  sourceTypes:
    - Component
  targetTypes:
    - Component
}
```

### 29.11 Rule

```itm
%rule components_need_owner
{
  select: "[Component]"
  pipeline:
    - requireAttribute: owner
  severity: error
  message: "Components must have an owner."
}
```

### 29.12 Require

```itm
%require itm.graphviz ^1.0.0
%require itm.mermaid ^1.0.0
%require local.architecture-rules ^1.2.0
```

### 29.13 Style

```itm
%style [Component]
{
  fill: "#e8f1ff"
  stroke: "#3b73d9"
  shape: rectangle
}

%style @depends_on:*
{
  stroke: "#888888"
  stroke-dasharray: "4 2"
}
```

### 29.14 Viewpoint

```itm
%viewpoint dependency_graph
{
  pipeline:
    - select: "[Component]"
    - includeEdges: "@depends_on:*"
    - transform: graph.model
    - layout: graphviz.dot
    - render: svg
}
```

### 29.15 View

```itm
%view current_dependency_graph
{
  viewpoint: dependency_graph
  deltas:
    moved:
      - node: payment_service
        dx: 120
        dy: -40
    hidden:
      - node: experimental_component
}
```

### 29.16 Explicit overlay

```itm
&payment_service [Component] Payment Service
{
  owner: platform
  criticality: medium
}

&payment_service !overlay
{
  criticality: high
  status: under_review
}
@depends_on:fraud_service
```

Duplicate ids without `!overlay` are validation errors.

### 29.17 Package

```itm
%package architecture_profile
{
  version: 0.1.0
  namespace: arch
}

%using architecture_profile.types
%using architecture_profile.rules
%using architecture_profile.styles
```

### 29.18 Repository

```itm
%repository shared https://example.org/itm
%include shared:profiles/architecture.itm
```

---

## 30. Example complete ITM file

```itm
%metadata
{
  title: Order handling example
  version: 1.0
  defaultNamespace: example
}

%namespace example https://example.org/order-model
%namespace bpmn https://www.omg.org/spec/BPMN/20100524/MODEL

%require itm.mermaid ^1.0.0
%require itm.graphviz ^1.0.0

%entitytype bpmn::Task
{
  requiredAttributes:
    - owner
}

%relationshiptype bpmn::sequenceFlow
{
  sourceTypes:
    - bpmn::Task
  targetTypes:
    - bpmn::Task
}

%rule tasks_need_owner
{
  select: "[bpmn::Task]"
  pipeline:
    - requireAttribute: owner
  severity: error
  message: "BPMN tasks must have an owner."
}

%style [bpmn::Task]
{
  fill: "#e8f1ff"
  stroke: "#3b73d9"
  shape: rectangle
}

%viewpoint process_flow
{
  pipeline:
    - select: "[bpmn::Task]"
    - includeEdges: "@bpmn::sequenceFlow:*"
    - transform: mermaid.flowchart
    - render: mermaid.svg
}

%view order_process_view
{
  viewpoint: process_flow
  deltas:
    moved:
      - node: validate_order
        dx: 80
        dy: 0
}

&order_process [Process] Order handling #core
| This model describes the high-level order handling process.
|
| It can be rendered as a process flow, a dependency graph, or a mind map.
{
  owner: operations
  status: draft
}
  &receive_order [bpmn::Task] Receive order #entry
  {
    owner: sales
  }
  @bpmn::sequenceFlow:validate_order
  {
    id: flow_receive_validate
  }

  &validate_order [bpmn::Task] Validate order #control
  | Validation checks completeness, payment terms, and customer status.
  {
    owner: operations
  }
  @bpmn::sequenceFlow:send_invoice
  {
    id: flow_validate_invoice
  }

  &send_invoice [bpmn::Task] Send invoice #finance
  {
    owner: finance
  }
```

---

## 31. Processing model

A full ITM processor should generally work in stages:

1. read raw text;
2. parse directives;
3. resolve repositories;
4. resolve includes;
5. resolve packages and `%using` declarations;
6. resolve namespaces;
7. parse entities, descriptions, attributes, and relationships;
8. generate implicit containment relationships;
9. generate implicit ordering relationships;
10. detect duplicate ids, reject unintended collisions, and apply explicit overlays;
11. resolve ids and relationship targets;
12. apply type declarations;
13. load required plugins;
14. evaluate validation rules;
15. collect diagnostics;
16. evaluate styles;
17. expose viewpoints;
18. generate views;
19. apply view deltas;
20. support controlled write-back if visual editing is enabled.

Implementations may perform these steps in a different order, but the externally visible behavior should be deterministic.

---

## 32. Compatibility and implementation modes

ITM can be implemented at different levels of strictness.

### 32.1 Minimal parser

A minimal parser supports:

- one entity per line;
- indentation hierarchy;
- labels.

### 32.2 Practical parser

A practical parser supports:

- tags;
- ids;
- links;
- typed links;
- descriptions;
- attributes;
- directives;
- includes;
- diagnostics.

### 32.3 Full model processor

A full model processor supports:

- namespaces;
- packages;
- repositories;
- type declarations;
- validation rules;
- plugins;
- selectors;
- styles;
- viewpoints;
- views;
- visual editing write-back;
- overlays;
- multiple export and rendering pipelines.

### 32.4 Strict vs tolerant mode

A strict parser should reject ambiguous or invalid constructs.

A tolerant parser may preserve unknown constructs and produce diagnostics instead of failing immediately.

Tolerant mode is useful for authoring and migration.

Strict mode is useful for CI/CD, publication, and controlled repositories.

---

## 33. Design summary

ITM begins as a plain list and grows into a complete model format.

Its central idea is that text remains the canonical and inspectable source, while richer tools can parse, validate, transform, render, and edit it.

The format supports:

- simple notes;
- hierarchical models;
- graph models;
- semantic relationships;
- Markdown documentation;
- typed profiles;
- validation rules;
- plugin-backed pipelines;
- reusable packages;
- shared repositories;
- cascading styles;
- generated viewpoints;
- manually refined views;
- controlled visual editing and write-back.

This makes ITM suitable both for lightweight human authoring and for advanced model-driven workflows involving architecture models, BPMN-like process models, ArchiMate-like semantic models, Mermaid and Graphviz diagrams, graph visualizations, documentation systems, and CI/CD-based model governance.

The core remains simple: one line is one thing.

Everything else is optional, layered, and progressively adoptable.

