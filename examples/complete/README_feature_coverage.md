# Complex ITM Corpus — Feature Coverage

This corpus contains long ITM examples intended to exercise the full Indented Text Model feature stack.

## Files

| File | Purpose |
|---|---|
| `programmatic/README.md` | Long-form TypeScript examples for programmatic document creation, mutation, and serialization, with checked expected ITM outputs. |
| `programmatic/*.itm` | Exact serialized outputs for the programmatic creation scenarios documented in `programmatic/README.md`. |
| `profiles/core-governance-profile.itm` | Core governance package with metadata, namespaces, type definitions, relationship definitions, validation rules, styles, and viewpoints. |
| `profiles/bpmn-archimate-profile.itm` | BPMN and ArchiMate profile using namespace-qualified types and relationships. |
| `reference/enterprise-reference.itm` | Shared actors, teams, controls, metrics, information assets, and reference data. |
| `models/order-to-cash-digital-thread.itm` | Main long model using hierarchy, ids, tags, descriptions, attributes, relationships, views, viewpoints, packages, repositories, selectors, styles, rules, and embedded Markdown diagrams. |
| `overlays/production-hardening-overlay.itm` | Explicit overlay file patching existing elements and adding hardening relationships. |
| `visual-edits/visual-editing-writeback-example.itm` | Visual editing and write-back review example with view-level deltas and model-level proposed patches. |

## Feature coverage

| ITM feature | Where demonstrated |
|---|---|
| Simple list | `models/order-to-cash-digital-thread.itm`, section `Simple planning backlog` |
| Tags | All `.itm` files, especially `#critical`, `#finance`, `#draft`, `#visual-editing` |
| Indentation hierarchy | Main model, reference data, profile model sections |
| Implicit containment `=>` | Viewpoints/styles include `=>`; hierarchy is used throughout |
| Implicit ordering `~>` | Process/value-stream child ordering and styles/viewpoints include `~>` |
| Node ids | All semantic nodes use `&namespace::id` |
| Simple links | `models/order-to-cash-digital-thread.itm`, node `local::simple_relationship_examples` uses inline `@target` and block `@target` |
| Typed links | Extensive use of `@relationship_type:target` and namespace-qualified links |
| Namespaced typed links | Examples such as `@archimate::serves:ref::customer` |
| Relationship blocks | Main model and overlays use relationship blocks with ids and attributes |
| Relationship identity | Relationship `id:` attributes are used throughout |
| Markdown descriptions | `|` blocks in main model, overlays, diagnostics, and visual edit examples |
| Embedded Mermaid and DOT | `models/order-to-cash-digital-thread.itm` root description |
| Inline node attributes | Many nodes use `{owner: ..., status: ...}` |
| Block node attributes | Root nodes, controls, risks, profiles, overlays |
| Directives | `%metadata`, `%include`, `%namespace`, `%entitytype`, `%relationshiptype`, `%rule`, `%style`, `%viewpoint`, `%view`, `%package`, `%using`, `%repository`, `%require` |
| Metadata | Every ITM file starts with `%metadata` |
| Includes | Main model includes profiles and reference data; overlays include the main model |
| Repositories | Main model declares `shared`, `company`, and `local` repositories |
| Packages | Profile and reference files declare `%package`; main model uses `%using` |
| Selectors | Styles, rules, and viewpoints use id, type, tag, attribute, relationship, containment, ordering, Boolean, and function selectors |
| Boolean selector operators | Examples include `AND`, `OR`, `NOT` |
| Selector functions | Examples include `ANY`, `ALL`, `ONE`, `NONE` |
| Validation rules | Profile and main model define `%rule` blocks |
| Plugins and `%require` | All files use `%require` for core and optional capabilities |
| Cascading styles | Package styles, document styles, relationship styles, direct visual attributes |
| Viewpoints | Multiple graph, BPMN, ArchiMate, mindmap, matrix, and documentation viewpoints |
| Views | Main model and visual edit file define concrete `%view` instances with deltas |
| Visual editing | `visual-edits/visual-editing-writeback-example.itm` |
| Write-back | Proposed semantic and view-level patches in visual editing file |
| Overlays | `overlays/production-hardening-overlay.itm` |
| Programmatic creation library | `programmatic/README.md` plus `programmatic/*.itm` show factory helpers, builder authoring, mutation, views, overlays, and top-level directives with exact serialized output |
| Diagnostics | Validation rules plus diagnostic payload example in the main model |
| Strict indentation | All files use two spaces per indentation level and no tabs |

## Notes

The corpus deliberately uses large examples that are useful for parser stress testing, renderer experiments, and transformation pipeline development. It is not intended to be a perfect business model; it is a broad syntax and semantics coverage set.

Current implementation note for `@textforge/itm`:

- Plain parsing still records `%include` directives, while `composeDocument()` can now resolve them through opt-in include providers.
- Overlay examples use the spec's `!overlay` marker and are applied during `composeDocument()`.
- `%view` deltas and viewpoint parameter definitions are materialized into typed parser output.
- The visual editing example now points to an explicit entity that records the `%view` name instead of linking directly to the `%view` declaration.
