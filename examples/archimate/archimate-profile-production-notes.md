# ITM ArchiMate Profile — production notes

This companion note explains how to use `archimate-basic-profile.itm` and what has to exist in the host application for the profile to be enforceable.

## What the profile contains

The profile declares:

- an `archimate` namespace;
- ArchiMate 3.2 element types across Generic, Strategy, Business, Application, Technology, Physical, Motivation, and Implementation & Migration areas;
- ArchiMate relationship types: composition, aggregation, assignment, realization, serving, access, influence, triggering, flow, association, specialization, and junction;
- validation rules for stable IDs, labels, relationship resolution, typed relationships, exchange readiness, hierarchy-vs-composition separation, and round-trip provenance;
- a small starter style set;
- viewpoints for a layered graph, motivation view, application view, and exchange XML export.

## How to use it in a model

```itm
%include packages/archimate-basic-profile.itm
%using archimate_profile.types
%using archimate_profile.relationships
%using archimate_profile.rules
%using archimate_profile.styles
%using archimate_profile.viewpoints

%metadata
{
  title: Example ArchiMate ITM model
  defaultNamespace: local
  profile: archimate
}

%namespace local https://example.org/local-model

&local::customer [archimate::BusinessActor] Customer
&local::order_process [archimate::BusinessProcess] Order handling
&local::billing_app [archimate::ApplicationComponent] Billing Application
&local::invoice_service [archimate::ApplicationService] Invoice Service

&local::billing_app @archimate::realization:local::invoice_service
{
  id: rel_billing_app_realizes_invoice_service
}

&local::invoice_service @archimate::serving:local::order_process
{
  id: rel_invoice_service_serves_order_process
}

&local::order_process @archimate::serving:local::customer
{
  id: rel_order_process_serves_customer
}
```

## Required runtime capabilities

A minimal parser can load the file, but production use requires these extensions.

### 1. Type hierarchy support

The profile uses abstract types such as `[archimate::Element]`, `[archimate::ActiveStructureElement]`, and `[archimate::MotivationElement]`.

The runtime must understand:

```yaml
abstract: true
extends:
  - archimate::Element
includeSubtypes: true
```

Without this, each validation rule has to expand to a long `ANY([archimate::BusinessActor], ...)` selector.

### 2. Relationship identity and relationship-target resolution

The profile assumes that a relationship may have a stable `id` attribute and that diagnostics, views, and exchange export can refer to this relationship identity.

The runtime should support:

- relationship block parsing;
- relationship `id`;
- relationship source and target resolution;
- relationship references from view deltas and diagnostics;
- optionally, relationships targeting relationships, where ArchiMate permits it.

### 3. ArchiMate relationship matrix validator

The profile intentionally does not embed the full ArchiMate Appendix B relationship matrix as hundreds of source-target rows.

Build a plugin step:

```yaml
archimate.rules.validateRelationshipAllowed
```

It should validate:

- relationship type;
- source concept type;
- target concept type;
- concept-vs-relationship target where applicable;
- derived or permitted relationships if you decide to support them;
- severity policy for strict vs tolerant mode.

Recommended backing data:

```js
const allowed = [
  { rel: "archimate::assignment", source: "archimate::BusinessRole", target: "archimate::BusinessProcess" },
  { rel: "archimate::serving", source: "archimate::ApplicationService", target: "archimate::BusinessProcess" },
  ...
]
```

Keep this as external data, not hand-coded conditionals.

### 4. ArchiMate exchange XML importer/exporter

Build:

```yaml
archimate.exchange.xml
archimate.exchange.validateExportReadiness
```

Minimum mapping:

| ITM | ArchiMate exchange |
|---|---|
| `&id` | `identifier` |
| `[archimate::Type]` | `xsi:type` |
| label | `name` |
| `|` description | documentation |
| node attributes | properties / extension properties |
| `@archimate::type:target` | relationship with `source`, `target`, `xsi:type` |
| relationship `id` | relationship `identifier` |
| `%view` | view / diagram metadata where supported |
| `layout::*` attributes | diagram node/connection bounds where supported |
| `prov::*` attributes | extension properties or companion metadata |

### 5. Canonical graph model

Use an intermediate graph model before XML export:

```text
ITM text
  -> parsed ITM AST
  -> resolved model
  -> canonical graph: nodes, edges, properties, descriptions, views, diagnostics
  -> ArchiMate exchange XML / Cytoscape / SVG / reports
```

This avoids embedding ArchiMate-specific export behavior in the ITM parser.

### 6. Diagnostics service

Every parser, resolver, rule, transformer, renderer, and exporter should report diagnostics with at least:

```yaml
source: archimate.rules
severity: error
message: Relationship not allowed by ArchiMate matrix.
file: model.itm
line: 42
node: local::billing_app
relationship: rel_billing_app_realizes_invoice_service
rule: archimate_relationships_must_be_allowed_by_matrix
pipelineStep: archimate.rules.validateRelationshipAllowed
```

### 7. View and layout support

For production round-trip, support:

- `%viewpoint` pipelines;
- `%view` instances;
- hidden/moved/style deltas;
- `layout::x`, `layout::y`, `layout::w`, `layout::h`;
- stable IDs for nodes and relationships.

Do not write layout changes into semantic relationships. Keep semantic changes in the model and visual changes in `%view`.

## Recommended implementation sequence

1. Parse ITM with namespaces, IDs, typed links, attributes, descriptions, directives, packages, and rules.
2. Implement type hierarchy and subtype selector expansion.
3. Build canonical graph output.
4. Implement basic validation: IDs, labels, target resolution, typed relationship checks.
5. Implement the ArchiMate relationship matrix plugin.
6. Implement Cytoscape graph rendering for quick feedback.
7. Implement ArchiMate exchange XML export.
8. Add import from ArchiMate exchange XML into ITM with `prov::*` metadata.
9. Add view/layout round-trip only after the semantic graph round-trip is stable.
