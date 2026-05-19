# ITM Failure Modes Corpus



## `README.md`

```markdown
# ITM Failure Modes Corpus

This corpus tests parser and processor diagnostics for the Indented Text Model format.

## Contents

- `profiles/basic-validation-profile.itm`: valid profile with reusable types, relationship types, rules, styles, and a viewpoint.
- `cases/00-valid`: clean baseline files expected to produce no diagnostics.
- `cases/01-indentation`: odd spaces, dedent mismatch, tab/space mixing, and indentation jumps.
- `cases/02-ids-types-overlays`: invalid ids, duplicate ids, namespace conflicts, undefined types, and overlay errors.
- `cases/03-links-relationships`: unresolved links, malformed typed links, delimiter mistakes, relationship id reuse, and endpoint violations.
- `cases/04-attributes-yaml`: malformed inline/block attributes and YAML-like syntax errors.
- `cases/05-descriptions`: orphan and ambiguous description blocks plus unclosed Markdown fences.
- `cases/06-directives-includes-packages`: metadata, directives, includes, repositories, packages, and plugin requirements.
- `cases/07-selectors-rules-styles-views`: selector, rule, style, viewpoint, and view-delta failures.
- `cases/08-semantic-validation`: well-parsed but semantically invalid models.
- `expected/expected-diagnostics.json`: machine-readable expected results.
- `expected/expected-diagnostics.yml`: YAML equivalent for easier reading.

## Comparison strategy

Recommended matching order:

1. file path;
2. diagnostic count;
3. severity;
4. diagnostic code;
5. message substring.

Line numbers are deliberately omitted because different parsers may attach a diagnostic to the first bad token, the containing block, or the closing brace.

## Strict vs tolerant mode

Strict processors should reject most parser-level errors. Tolerant processors may continue and emit warnings, but should still report equivalent diagnostics.

Generated on 2026-05-19.
```



## `cases/00-valid/valid-control.itm`

```itm
%metadata
{
  title: Valid control case
  version: 1
  defaultNamespace: test
}

%include ../../profiles/basic-validation-profile.itm
%namespace test https://example.org/itm/test
%using basic_validation_profile

&test::root [test::Process] Root process #valid {owner: qa, status: active}
| Clean baseline expected to emit no diagnostics.
  &test::component_a [test::Component] Component A {owner: platform, status: active}
  @test::depends_on:test::component_b
  {
    id: rel_component_a_depends_b
    confidence: high
  }
  &test::component_b [test::Component] Component B {owner: platform, status: active}
  &test::service_a [test::Service] Service A {owner: platform, status: active}
  @test::serves:test::actor_a
  {
    id: rel_service_actor
  }
  &test::actor_a [test::Actor] Actor A {owner: business}
```



## `cases/01-indentation/indent-dedent-to-unknown-level.itm`

```itm
%metadata
{
  title: indent-dedent-to-unknown-level
  version: 1
}

%include ../../profiles/basic-validation-profile.itm
%namespace test https://example.org/itm/test
%using basic_validation_profile

&test::root [test::Process] Root {owner: qa, status: active}
  &test::child [test::Task] Child {owner: qa, status: active}
    &test::grandchild [test::Task] Grandchild {owner: qa, status: active}
 &test::bad_dedent [test::Task] Dedent to one space {owner: qa, status: active}
```



## `cases/01-indentation/indent-empty-label.itm`

```itm
%metadata
{
  title: indent-empty-label
  version: 1
}

%include ../../profiles/basic-validation-profile.itm
%namespace test https://example.org/itm/test
%using basic_validation_profile

&test::root [test::Process] Root {owner: qa, status: active}
  
  &test::after_empty [test::Task] After empty indented line {owner: qa, status: active}
```



## `cases/01-indentation/indent-jump-two-levels.itm`

```itm
%metadata
{
  title: indent-jump-two-levels
  version: 1
}

%include ../../profiles/basic-validation-profile.itm
%namespace test https://example.org/itm/test
%using basic_validation_profile

&test::root [test::Process] Root {owner: qa, status: active}
    &test::jump_child [test::Task] Jumped two levels {owner: qa, status: active}
```



## `cases/01-indentation/indent-mixed-tabs-spaces.itm`

```itm
%metadata
{
  title: indent-mixed-tabs-spaces
  version: 1
}

%include ../../profiles/basic-validation-profile.itm
%namespace test https://example.org/itm/test
%using basic_validation_profile

&test::root [test::Process] Root {owner: qa, status: active}
	&test::tab_child [test::Task] Tab child {owner: qa, status: active}
  &test::space_child [test::Task] Space child {owner: qa, status: active}
```



## `cases/01-indentation/indent-odd-spaces.itm`

```itm
%metadata
{
  title: indent-odd-spaces
  version: 1
}

%include ../../profiles/basic-validation-profile.itm
%namespace test https://example.org/itm/test
%using basic_validation_profile

&test::root [test::Process] Root {owner: qa, status: active}
   &test::bad_child [test::Task] Three-space child {owner: qa, status: active}
```



## `cases/02-ids-types-overlays/id-duplicate-no-overlay.itm`

```itm
%metadata
{
  title: id-duplicate-no-overlay
  version: 1
}

%include ../../profiles/basic-validation-profile.itm
%namespace test https://example.org/itm/test
%using basic_validation_profile

&test::dup [test::Component] First {owner: qa, status: active}
&test::dup [test::Component] Second without overlay {owner: qa, status: active}
```



## `cases/02-ids-types-overlays/id-empty.itm`

```itm
%metadata
{
  title: id-empty
  version: 1
}

%include ../../profiles/basic-validation-profile.itm
%namespace test https://example.org/itm/test
%using basic_validation_profile

& [test::Component] Empty id marker {owner: qa, status: active}
```



## `cases/02-ids-types-overlays/id-invalid-character.itm`

```itm
%metadata
{
  title: id-invalid-character
  version: 1
}

%include ../../profiles/basic-validation-profile.itm
%namespace test https://example.org/itm/test
%using basic_validation_profile

&test::bad.id [test::Component] Invalid dot in id {owner: qa, status: active}
```



## `cases/02-ids-types-overlays/id-invalid-start-digit.itm`

```itm
%metadata
{
  title: id-invalid-start-digit
  version: 1
}

%include ../../profiles/basic-validation-profile.itm
%namespace test https://example.org/itm/test
%using basic_validation_profile

&1bad [test::Component] Invalid id {owner: qa, status: active}
```



## `cases/02-ids-types-overlays/namespace-duplicate-alias-conflict.itm`

```itm
%metadata
{
  title: namespace-duplicate-alias-conflict
  version: 1
}

%include ../../profiles/basic-validation-profile.itm
%namespace test https://example.org/itm/test
%using basic_validation_profile

%namespace test https://example.org/itm/other
&test::a [test::Component] A {owner: qa, status: active}
```



## `cases/02-ids-types-overlays/overlay-forward-disallowed.itm`

```itm
%metadata
{
  title: overlay-forward-disallowed
  version: 1
}

%include ../../profiles/basic-validation-profile.itm
%namespace test https://example.org/itm/test
%using basic_validation_profile

&test::late !overlay
{
  status: active
}
&test::late [test::Component] Late base {owner: qa, status: draft}
```



## `cases/02-ids-types-overlays/overlay-missing-target.itm`

```itm
%metadata
{
  title: overlay-missing-target
  version: 1
}

%include ../../profiles/basic-validation-profile.itm
%namespace test https://example.org/itm/test
%using basic_validation_profile

&test::never_defined !overlay [test::Component] Missing overlay target
{
  owner: qa
  status: active
}
```



## `cases/02-ids-types-overlays/overlay-type-change.itm`

```itm
%metadata
{
  title: overlay-type-change
  version: 1
}

%include ../../profiles/basic-validation-profile.itm
%namespace test https://example.org/itm/test
%using basic_validation_profile

&test::element [test::Component] Element {owner: qa, status: draft}
&test::element !overlay [test::Service] Element renamed {owner: qa, status: active}
```



## `cases/02-ids-types-overlays/type-misplaced-after-label.itm`

```itm
%metadata
{
  title: type-misplaced-after-label
  version: 1
}

%include ../../profiles/basic-validation-profile.itm
%namespace test https://example.org/itm/test
%using basic_validation_profile

&test::misplaced Component name [test::Component] {owner: qa, status: active}
```



## `cases/02-ids-types-overlays/type-undefined.itm`

```itm
%metadata
{
  title: type-undefined
  version: 1
}

%include ../../profiles/basic-validation-profile.itm
%namespace test https://example.org/itm/test
%using basic_validation_profile

&test::unknown_type [test::DoesNotExist] Unknown type {owner: qa, status: active}
```



## `cases/03-links-relationships/link-block-before-node.itm`

```itm
%metadata
{
  title: link-block-before-node
  version: 1
}

%include ../../profiles/basic-validation-profile.itm
%namespace test https://example.org/itm/test
%using basic_validation_profile

@test::depends_on:test::component_b
{
  id: rel_orphan
}
&test::component_a [test::Component] A {owner: qa, status: active}
&test::component_b [test::Component] B {owner: qa, status: active}
```



## `cases/03-links-relationships/link-double-colon-assignment.itm`

```itm
%metadata
{
  title: link-double-colon-assignment
  version: 1
}

%include ../../profiles/basic-validation-profile.itm
%namespace test https://example.org/itm/test
%using basic_validation_profile

&test::component_a [test::Component] A {owner: qa, status: active} @test::depends_on::test::component_b
&test::component_b [test::Component] B {owner: qa, status: active}
```



## `cases/03-links-relationships/link-duplicate-relationship-id.itm`

```itm
%metadata
{
  title: link-duplicate-relationship-id
  version: 1
}

%include ../../profiles/basic-validation-profile.itm
%namespace test https://example.org/itm/test
%using basic_validation_profile

&test::component_a [test::Component] A {owner: qa, status: active}
@test::depends_on:test::component_b
{
  id: rel_duplicate
}
@test::depends_on:test::component_c
{
  id: rel_duplicate
}
&test::component_b [test::Component] B {owner: qa, status: active}
&test::component_c [test::Component] C {owner: qa, status: active}
```



## `cases/03-links-relationships/link-endpoint-source-type-violation.itm`

```itm
%metadata
{
  title: link-endpoint-source-type-violation
  version: 1
}

%include ../../profiles/basic-validation-profile.itm
%namespace test https://example.org/itm/test
%using basic_validation_profile

&test::risk_a [test::Risk] Risk A {owner: qa, severity: high, likelihood: medium, status: open}
&test::component_a [test::Component] A {owner: qa, status: active} @test::mitigates:test::risk_a
```



## `cases/03-links-relationships/link-endpoint-target-type-violation.itm`

```itm
%metadata
{
  title: link-endpoint-target-type-violation
  version: 1
}

%include ../../profiles/basic-validation-profile.itm
%namespace test https://example.org/itm/test
%using basic_validation_profile

&test::control_a [test::Control] Control A {owner: qa, controlType: detective, status: active}
@test::mitigates:test::component_a
{
  id: rel_bad_target
}
&test::component_a [test::Component] A {owner: qa, status: active}
```



## `cases/03-links-relationships/link-inline-attributes-after-multiple-links.itm`

```itm
%metadata
{
  title: link-inline-attributes-after-multiple-links
  version: 1
}

%include ../../profiles/basic-validation-profile.itm
%namespace test https://example.org/itm/test
%using basic_validation_profile

&test::component_a [test::Component] A @test::depends_on:test::component_b @test::depends_on:test::component_c {confidence: high} {owner: qa, status: active}
&test::component_b [test::Component] B {owner: qa, status: active}
&test::component_c [test::Component] C {owner: qa, status: active}
```



## `cases/03-links-relationships/link-malformed-missing-target.itm`

```itm
%metadata
{
  title: link-malformed-missing-target
  version: 1
}

%include ../../profiles/basic-validation-profile.itm
%namespace test https://example.org/itm/test
%using basic_validation_profile

&test::component_a [test::Component] A {owner: qa, status: active} @test::depends_on:
```



## `cases/03-links-relationships/link-malformed-missing-type.itm`

```itm
%metadata
{
  title: link-malformed-missing-type
  version: 1
}

%include ../../profiles/basic-validation-profile.itm
%namespace test https://example.org/itm/test
%using basic_validation_profile

&test::component_a [test::Component] A {owner: qa, status: active} @:test::component_b
&test::component_b [test::Component] B {owner: qa, status: active}
```



## `cases/03-links-relationships/link-old-colon-namespace-syntax.itm`

```itm
&local::customer [archimate::BusinessActor] Customer {owner: qa}
&local::journey [archimate::BusinessProcess] Journey {owner: qa, status: active} @archimate:serves:local:customer
```



## `cases/03-links-relationships/link-undefined-relationship-type.itm`

```itm
%metadata
{
  title: link-undefined-relationship-type
  version: 1
}

%include ../../profiles/basic-validation-profile.itm
%namespace test https://example.org/itm/test
%using basic_validation_profile

&test::component_a [test::Component] A {owner: qa, status: active} @test::not_declared:test::component_b
&test::component_b [test::Component] B {owner: qa, status: active}
```



## `cases/03-links-relationships/link-unresolved-target.itm`

```itm
%metadata
{
  title: link-unresolved-target
  version: 1
}

%include ../../profiles/basic-validation-profile.itm
%namespace test https://example.org/itm/test
%using basic_validation_profile

&test::component_a [test::Component] A {owner: qa, status: active} @test::missing_component
```



## `cases/04-attributes-yaml/attr-block-malformed-yaml.itm`

```itm
%metadata
{
  title: attr-block-malformed-yaml
  version: 1
}

%include ../../profiles/basic-validation-profile.itm
%namespace test https://example.org/itm/test
%using basic_validation_profile

&test::component_a [test::Component] A
{
  owner: qa
  lifecycle:
    - active
    - retired
      bad-indent: true
}
```



## `cases/04-attributes-yaml/attr-block-unclosed.itm`

```itm
%metadata
{
  title: attr-block-unclosed
  version: 1
}

%include ../../profiles/basic-validation-profile.itm
%namespace test https://example.org/itm/test
%using basic_validation_profile

&test::component_a [test::Component] A
{
  owner: qa
  status: active
```



## `cases/04-attributes-yaml/attr-duplicate-keys.itm`

```itm
%metadata
{
  title: attr-duplicate-keys
  version: 1
}

%include ../../profiles/basic-validation-profile.itm
%namespace test https://example.org/itm/test
%using basic_validation_profile

&test::component_a [test::Component] A
{
  owner: qa
  owner: duplicate
  status: active
}
```



## `cases/04-attributes-yaml/attr-inline-malformed-yaml.itm`

```itm
%metadata
{
  title: attr-inline-malformed-yaml
  version: 1
}

%include ../../profiles/basic-validation-profile.itm
%namespace test https://example.org/itm/test
%using basic_validation_profile

&test::component_a [test::Component] A {owner qa, status: active}
```



## `cases/04-attributes-yaml/attr-inline-unclosed-brace.itm`

```itm
%metadata
{
  title: attr-inline-unclosed-brace
  version: 1
}

%include ../../profiles/basic-validation-profile.itm
%namespace test https://example.org/itm/test
%using basic_validation_profile

&test::component_a [test::Component] A {owner: qa, status: active
```



## `cases/04-attributes-yaml/attr-known-field-wrong-type.itm`

```itm
%metadata
{
  title: attr-known-field-wrong-type
  version: 1
}

%include ../../profiles/basic-validation-profile.itm
%namespace test https://example.org/itm/test
%using basic_validation_profile

&test::component_a [test::Component] A
{
  owner:
    - qa
    - platform
  status: active
}
```



## `cases/04-attributes-yaml/attr-orphan-block.itm`

```itm
%metadata
{
  title: attr-orphan-block
  version: 1
}

%include ../../profiles/basic-validation-profile.itm
%namespace test https://example.org/itm/test
%using basic_validation_profile

{
  owner: qa
  status: active
}
&test::component_a [test::Component] A {owner: qa, status: active}
```



## `cases/05-descriptions/description-after-relationship-block.itm`

```itm
%metadata
{
  title: description-after-relationship-block
  version: 1
}

%include ../../profiles/basic-validation-profile.itm
%namespace test https://example.org/itm/test
%using basic_validation_profile

&test::component_a [test::Component] A {owner: qa, status: active}
@test::depends_on:test::component_b
{
  id: rel_a_b
}
| Ambiguous description after relationship attribute block.
&test::component_b [test::Component] B {owner: qa, status: active}
```



## `cases/05-descriptions/description-fence-not-closed.itm`

```itm
%metadata
{
  title: description-fence-not-closed
  version: 1
}

%include ../../profiles/basic-validation-profile.itm
%namespace test https://example.org/itm/test
%using basic_validation_profile

&test::component_a [test::Component] A {owner: qa, status: active}
| Starts a Mermaid fence.
|
| ```mermaid
| flowchart LR
|   A --> B
```



## `cases/05-descriptions/description-inconsistent-indent.itm`

```itm
%metadata
{
  title: description-inconsistent-indent
  version: 1
}

%include ../../profiles/basic-validation-profile.itm
%namespace test https://example.org/itm/test
%using basic_validation_profile

&test::root [test::Process] Root {owner: qa, status: active}
  &test::child [test::Task] Child {owner: qa, status: active}
  | Description line at child indentation.
 | Description line dedented by one space.
```



## `cases/05-descriptions/description-orphan-before-node.itm`

```itm
%metadata
{
  title: description-orphan-before-node
  version: 1
}

%include ../../profiles/basic-validation-profile.itm
%namespace test https://example.org/itm/test
%using basic_validation_profile

| Description appears before any entity.
&test::component_a [test::Component] A {owner: qa, status: active}
```



## `cases/06-directives-includes-packages/directive-unknown-strict.itm`

```itm
%metadata
{
  title: directive-unknown-strict
  version: 1
}

%include ../../profiles/basic-validation-profile.itm
%namespace test https://example.org/itm/test
%using basic_validation_profile

%frobnicate impossible true
&test::component_a [test::Component] A {owner: qa, status: active}
```



## `cases/06-directives-includes-packages/include-circular-a.itm`

```itm
%include include-circular-b.itm
%namespace test https://example.org/itm/test
&test::a [test::Component] A {owner: qa, status: active}
```



## `cases/06-directives-includes-packages/include-circular-b.itm`

```itm
%include include-circular-a.itm
%namespace test https://example.org/itm/test
&test::b [test::Component] B {owner: qa, status: active}
```



## `cases/06-directives-includes-packages/include-missing-file.itm`

```itm
%metadata
{
  title: include-missing-file
  version: 1
}

%include ../../profiles/basic-validation-profile.itm
%namespace test https://example.org/itm/test
%using basic_validation_profile

%include ../../profiles/does-not-exist.itm
&test::component_a [test::Component] A {owner: qa, status: active}
```



## `cases/06-directives-includes-packages/metadata-duplicate.itm`

```itm
%metadata
{
  title: metadata-duplicate
  version: 1
}

%include ../../profiles/basic-validation-profile.itm
%namespace test https://example.org/itm/test
%using basic_validation_profile

%metadata
{
  title: Second metadata block
  version: 2
}
&test::component_a [test::Component] A {owner: qa, status: active}
```



## `cases/06-directives-includes-packages/metadata-missing-block.itm`

```itm
%metadata
%namespace test https://example.org/itm/test

&test::component_a [test::Component] A {owner: qa, status: active}
```



## `cases/06-directives-includes-packages/namespace-invalid-prefix.itm`

```itm
%namespace 9bad https://example.org/bad
&9bad::component [9bad::Component] Bad namespace prefix
```



## `cases/06-directives-includes-packages/package-block-unclosed.itm`

```itm
%package bad_package
{
  version: 1.0.0
  namespace: test

&test::component_a [test::Component] A {owner: qa, status: active}
```



## `cases/06-directives-includes-packages/repository-forbidden-protocol.itm`

```itm
%repository exfil ftp://example.org/itm
%include exfil:profiles/profile.itm
&test::component_a [test::Component] A {owner: qa, status: active}
```



## `cases/06-directives-includes-packages/require-malformed-version.itm`

```itm
%metadata
{
  title: require-malformed-version
  version: 1
}

%include ../../profiles/basic-validation-profile.itm
%namespace test https://example.org/itm/test
%using basic_validation_profile

%require itm.graphviz approximately-one
%require local.plugin >=
&test::component_a [test::Component] A {owner: qa, status: active}
```



## `cases/06-directives-includes-packages/require-missing-plugin.itm`

```itm
%metadata
{
  title: require-missing-plugin
  version: 1
}

%include ../../profiles/basic-validation-profile.itm
%namespace test https://example.org/itm/test
%using basic_validation_profile

%require local.not-installed-plugin ^99.0.0
&test::component_a [test::Component] A {owner: qa, status: active}
```



## `cases/06-directives-includes-packages/using-missing-package.itm`

```itm
%metadata
{
  title: using-missing-package
  version: 1
}

%include ../../profiles/basic-validation-profile.itm
%namespace test https://example.org/itm/test
%using basic_validation_profile

%using missing_profile
&test::component_a [test::Component] A {owner: qa, status: active}
```



## `cases/07-selectors-rules-styles-views/rule-invalid-severity.itm`

```itm
%metadata
{
  title: rule-invalid-severity
  version: 1
}

%include ../../profiles/basic-validation-profile.itm
%namespace test https://example.org/itm/test
%using basic_validation_profile

%rule bad_severity
{
  select: "[test::Component]"
  pipeline:
    - requireAttribute: owner
  severity: catastrophic
  message: "Invalid severity."
}
```



## `cases/07-selectors-rules-styles-views/rule-missing-pipeline.itm`

```itm
%metadata
{
  title: rule-missing-pipeline
  version: 1
}

%include ../../profiles/basic-validation-profile.itm
%namespace test https://example.org/itm/test
%using basic_validation_profile

%rule missing_pipeline
{
  select: "[test::Component]"
  severity: error
  message: "No pipeline."
}
```



## `cases/07-selectors-rules-styles-views/rule-missing-select.itm`

```itm
%metadata
{
  title: rule-missing-select
  version: 1
}

%include ../../profiles/basic-validation-profile.itm
%namespace test https://example.org/itm/test
%using basic_validation_profile

%rule missing_select
{
  pipeline:
    - requireAttribute: owner
  severity: error
  message: "No select."
}
```



## `cases/07-selectors-rules-styles-views/rule-unknown-pipeline-step.itm`

```itm
%metadata
{
  title: rule-unknown-pipeline-step
  version: 1
}

%include ../../profiles/basic-validation-profile.itm
%namespace test https://example.org/itm/test
%using basic_validation_profile

%rule unknown_step
{
  select: "[test::Component]"
  pipeline:
    - local.not-loaded-plugin.deepMagicCheck
  severity: warning
  message: "Unknown step."
}
&test::component_a [test::Component] A {owner: qa, status: active}
```



## `cases/07-selectors-rules-styles-views/selector-invalid-operator-sequence.itm`

```itm
%metadata
{
  title: selector-invalid-operator-sequence
  version: 1
}

%include ../../profiles/basic-validation-profile.itm
%namespace test https://example.org/itm/test
%using basic_validation_profile

%viewpoint bad_viewpoint
{
  pipeline:
    - select: "[test::Component] AND OR #critical"
    - render: svg
}
&test::component_a [test::Component] A #critical {owner: qa, status: active}
```



## `cases/07-selectors-rules-styles-views/selector-unbalanced-parentheses.itm`

```itm
%metadata
{
  title: selector-unbalanced-parentheses
  version: 1
}

%include ../../profiles/basic-validation-profile.itm
%namespace test https://example.org/itm/test
%using basic_validation_profile

%rule bad_selector
{
  select: "([test::Component] AND #critical"
  pipeline:
    - requireAttribute: owner
  severity: warning
  message: "Bad selector."
}
&test::component_a [test::Component] A #critical {owner: qa, status: active}
```



## `cases/07-selectors-rules-styles-views/selector-unknown-function.itm`

```itm
%metadata
{
  title: selector-unknown-function
  version: 1
}

%include ../../profiles/basic-validation-profile.itm
%namespace test https://example.org/itm/test
%using basic_validation_profile

%style MOSTLY([test::Component], #critical)
{
  fill: "#ff0000"
}
&test::component_a [test::Component] A #critical {owner: qa, status: active}
```



## `cases/07-selectors-rules-styles-views/style-block-malformed.itm`

```itm
%metadata
{
  title: style-block-malformed
  version: 1
}

%include ../../profiles/basic-validation-profile.itm
%namespace test https://example.org/itm/test
%using basic_validation_profile

%style [test::Component]
{
  fill "#e8f1ff"
  stroke: "#3b73d9"
}
&test::component_a [test::Component] A {owner: qa, status: active}
```



## `cases/07-selectors-rules-styles-views/style-selector-unknown-type.itm`

```itm
%metadata
{
  title: style-selector-unknown-type
  version: 1
}

%include ../../profiles/basic-validation-profile.itm
%namespace test https://example.org/itm/test
%using basic_validation_profile

%style [test::UnknownType]
{
  fill: "#e8f1ff"
}
&test::component_a [test::Component] A {owner: qa, status: active}
```



## `cases/07-selectors-rules-styles-views/view-delta-unknown-node-relationship.itm`

```itm
%metadata
{
  title: view-delta-unknown-node-relationship
  version: 1
}

%include ../../profiles/basic-validation-profile.itm
%namespace test https://example.org/itm/test
%using basic_validation_profile

%viewpoint local_viewpoint
{
  pipeline:
    - select: "[test::Component]"
    - render: svg
}
%view bad_delta
{
  viewpoint: local_viewpoint
  deltas:
    hidden:
      - node: test::missing_node
      - relationship: rel_missing_edge
    moved:
      - node: test::another_missing_node
        dx: 50
        dy: -10
}
&test::component_a [test::Component] A {owner: qa, status: active}
```



## `cases/07-selectors-rules-styles-views/view-unknown-viewpoint.itm`

```itm
%metadata
{
  title: view-unknown-viewpoint
  version: 1
}

%include ../../profiles/basic-validation-profile.itm
%namespace test https://example.org/itm/test
%using basic_validation_profile

%view orphan_view
{
  viewpoint: does_not_exist
  deltas:
    moved:
      - node: test::component_a
        dx: 10
        dy: 10
}
&test::component_a [test::Component] A {owner: qa, status: active}
```



## `cases/07-selectors-rules-styles-views/viewpoint-invalid-step.itm`

```itm
%metadata
{
  title: viewpoint-invalid-step
  version: 1
}

%include ../../profiles/basic-validation-profile.itm
%namespace test https://example.org/itm/test
%using basic_validation_profile

%viewpoint invalid_step
{
  pipeline:
    - select: "[test::Component]"
    - render
}
```



## `cases/07-selectors-rules-styles-views/viewpoint-missing-pipeline.itm`

```itm
%metadata
{
  title: viewpoint-missing-pipeline
  version: 1
}

%include ../../profiles/basic-validation-profile.itm
%namespace test https://example.org/itm/test
%using basic_validation_profile

%viewpoint empty_viewpoint
{
  description: No pipeline.
}
```



## `cases/08-semantic-validation/semantic-closed-risk-no-mitigation-ok.itm`

```itm
%metadata
{
  title: semantic-closed-risk-no-mitigation-ok
  version: 1
}

%include ../../profiles/basic-validation-profile.itm
%namespace test https://example.org/itm/test
%using basic_validation_profile

&test::risk_a [test::Risk] Closed risk #critical
{
  owner: platform
  severity: critical
  likelihood: medium
  status: closed
}
```



## `cases/08-semantic-validation/semantic-high-risk-no-mitigation.itm`

```itm
%metadata
{
  title: semantic-high-risk-no-mitigation
  version: 1
}

%include ../../profiles/basic-validation-profile.itm
%namespace test https://example.org/itm/test
%using basic_validation_profile

&test::risk_a [test::Risk] Database outage #critical
{
  owner: platform
  severity: critical
  likelihood: medium
  status: open
}
```



## `cases/08-semantic-validation/semantic-process-without-children.itm`

```itm
%metadata
{
  title: semantic-process-without-children
  version: 1
}

%include ../../profiles/basic-validation-profile.itm
%namespace test https://example.org/itm/test
%using basic_validation_profile

%rule processes_need_children
{
  select: "[test::Process]"
  pipeline:
    - requireChildren
    - requireOrdering
  severity: information
  message: "Processes should contain ordered steps."
}
&test::empty_process [test::Process] Empty process {owner: qa, status: active}
```



## `cases/08-semantic-validation/semantic-required-attributes-missing.itm`

```itm
%metadata
{
  title: semantic-required-attributes-missing
  version: 1
}

%include ../../profiles/basic-validation-profile.itm
%namespace test https://example.org/itm/test
%using basic_validation_profile

&test::component_a [test::Component] Missing owner
{
  status: active
}
&test::service_a [test::Service] Missing status
{
  owner: platform
}
```



## `expected/expected-diagnostics.json`

```json
{
  "metadata": {
    "title": "Expected diagnostics for ITM failure-mode corpus",
    "version": "1.0.0",
    "generated": "2026-05-19",
    "lineNumbers": "not included; compare by file, code, severity, and message substring",
    "strictnessNote": "Tolerant parsers may downgrade some parse errors to warnings, but should still emit equivalent diagnostics."
  },
  "cases": [
    {
      "file": "cases/00-valid/valid-control.itm",
      "expectedDiagnosticCount": 0,
      "diagnostics": []
    },
    {
      "file": "cases/01-indentation/indent-dedent-to-unknown-level.itm",
      "expectedDiagnosticCount": 1,
      "diagnostics": [
        {
          "code": "ITM_INDENT_DEDENT_UNKNOWN_LEVEL",
          "severity": "error",
          "message": "Dedent does not match a previous indentation level."
        }
      ]
    },
    {
      "file": "cases/01-indentation/indent-empty-label.itm",
      "expectedDiagnosticCount": 1,
      "diagnostics": [
        {
          "code": "ITM_EMPTY_LABEL",
          "severity": "warning",
          "message": "Whitespace-only indented line should be ignored or diagnosed in strict mode."
        }
      ]
    },
    {
      "file": "cases/01-indentation/indent-jump-two-levels.itm",
      "expectedDiagnosticCount": 1,
      "diagnostics": [
        {
          "code": "ITM_INDENT_JUMP_TOO_DEEP",
          "severity": "error",
          "message": "Indentation jumps more than one level deeper."
        }
      ]
    },
    {
      "file": "cases/01-indentation/indent-mixed-tabs-spaces.itm",
      "expectedDiagnosticCount": 1,
      "diagnostics": [
        {
          "code": "ITM_INDENT_MIXED_TABS_SPACES",
          "severity": "error",
          "message": "Raw tab and space indentation are mixed."
        }
      ]
    },
    {
      "file": "cases/01-indentation/indent-odd-spaces.itm",
      "expectedDiagnosticCount": 1,
      "diagnostics": [
        {
          "code": "ITM_INDENT_NOT_MULTIPLE_OF_TWO",
          "severity": "error",
          "message": "Indentation is not a multiple of two spaces."
        }
      ]
    },
    {
      "file": "cases/02-ids-types-overlays/id-duplicate-no-overlay.itm",
      "expectedDiagnosticCount": 1,
      "diagnostics": [
        {
          "code": "ITM_ID_DUPLICATE",
          "severity": "error",
          "message": "Duplicate id without !overlay."
        }
      ]
    },
    {
      "file": "cases/02-ids-types-overlays/id-empty.itm",
      "expectedDiagnosticCount": 1,
      "diagnostics": [
        {
          "code": "ITM_ID_EMPTY",
          "severity": "error",
          "message": "Ampersand id marker has no identifier."
        }
      ]
    },
    {
      "file": "cases/02-ids-types-overlays/id-invalid-character.itm",
      "expectedDiagnosticCount": 1,
      "diagnostics": [
        {
          "code": "ITM_ID_INVALID_SYNTAX",
          "severity": "error",
          "message": "Id contains invalid character dot."
        }
      ]
    },
    {
      "file": "cases/02-ids-types-overlays/id-invalid-start-digit.itm",
      "expectedDiagnosticCount": 1,
      "diagnostics": [
        {
          "code": "ITM_ID_INVALID_SYNTAX",
          "severity": "error",
          "message": "Id starts with a digit."
        }
      ]
    },
    {
      "file": "cases/02-ids-types-overlays/namespace-duplicate-alias-conflict.itm",
      "expectedDiagnosticCount": 1,
      "diagnostics": [
        {
          "code": "ITM_NAMESPACE_ALIAS_REDEFINED",
          "severity": "error",
          "message": "Namespace alias test is rebound to a different URI."
        }
      ]
    },
    {
      "file": "cases/02-ids-types-overlays/overlay-forward-disallowed.itm",
      "expectedDiagnosticCount": 1,
      "diagnostics": [
        {
          "code": "ITM_OVERLAY_FORWARD_DISALLOWED",
          "severity": "error",
          "message": "Forward overlay appears before base definition."
        }
      ]
    },
    {
      "file": "cases/02-ids-types-overlays/overlay-missing-target.itm",
      "expectedDiagnosticCount": 1,
      "diagnostics": [
        {
          "code": "ITM_OVERLAY_TARGET_MISSING",
          "severity": "error",
          "message": "Overlay target has no prior base definition."
        }
      ]
    },
    {
      "file": "cases/02-ids-types-overlays/overlay-type-change.itm",
      "expectedDiagnosticCount": 2,
      "diagnostics": [
        {
          "code": "ITM_OVERLAY_TYPE_REPLACEMENT",
          "severity": "warning",
          "message": "Overlay changes existing node type."
        },
        {
          "code": "ITM_OVERLAY_LABEL_REPLACEMENT",
          "severity": "warning",
          "message": "Overlay replaces an existing label."
        }
      ]
    },
    {
      "file": "cases/02-ids-types-overlays/type-misplaced-after-label.itm",
      "expectedDiagnosticCount": 1,
      "diagnostics": [
        {
          "code": "ITM_TYPE_MISPLACED",
          "severity": "warning",
          "message": "Type token appears after label text."
        }
      ]
    },
    {
      "file": "cases/02-ids-types-overlays/type-undefined.itm",
      "expectedDiagnosticCount": 1,
      "diagnostics": [
        {
          "code": "ITM_TYPE_UNDEFINED",
          "severity": "error",
          "message": "Node type is not declared or imported."
        }
      ]
    },
    {
      "file": "cases/03-links-relationships/link-block-before-node.itm",
      "expectedDiagnosticCount": 1,
      "diagnostics": [
        {
          "code": "ITM_RELATIONSHIP_WITHOUT_SOURCE_NODE",
          "severity": "error",
          "message": "Relationship block appears before any source node."
        }
      ]
    },
    {
      "file": "cases/03-links-relationships/link-double-colon-assignment.itm",
      "expectedDiagnosticCount": 1,
      "diagnostics": [
        {
          "code": "ITM_LINK_ASSIGNMENT_DELIMITER_MISSING",
          "severity": "error",
          "message": "Relationship assignment requires single colon, not double colon."
        }
      ]
    },
    {
      "file": "cases/03-links-relationships/link-duplicate-relationship-id.itm",
      "expectedDiagnosticCount": 1,
      "diagnostics": [
        {
          "code": "ITM_RELATIONSHIP_ID_DUPLICATE",
          "severity": "error",
          "message": "Relationship id is reused."
        }
      ]
    },
    {
      "file": "cases/03-links-relationships/link-endpoint-source-type-violation.itm",
      "expectedDiagnosticCount": 1,
      "diagnostics": [
        {
          "code": "ITM_RELATIONSHIP_SOURCE_TYPE_INVALID",
          "severity": "error",
          "message": "Relationship source type does not match relationship definition."
        }
      ]
    },
    {
      "file": "cases/03-links-relationships/link-endpoint-target-type-violation.itm",
      "expectedDiagnosticCount": 1,
      "diagnostics": [
        {
          "code": "ITM_RELATIONSHIP_TARGET_TYPE_INVALID",
          "severity": "error",
          "message": "Relationship target type does not match relationship definition."
        }
      ]
    },
    {
      "file": "cases/03-links-relationships/link-inline-attributes-after-multiple-links.itm",
      "expectedDiagnosticCount": 1,
      "diagnostics": [
        {
          "code": "ITM_INLINE_RELATIONSHIP_ATTRIBUTES_AMBIGUOUS",
          "severity": "warning",
          "message": "Inline attributes after multiple links are ambiguous."
        }
      ]
    },
    {
      "file": "cases/03-links-relationships/link-malformed-missing-target.itm",
      "expectedDiagnosticCount": 1,
      "diagnostics": [
        {
          "code": "ITM_LINK_MISSING_TARGET",
          "severity": "error",
          "message": "Typed link has no target after colon."
        }
      ]
    },
    {
      "file": "cases/03-links-relationships/link-malformed-missing-type.itm",
      "expectedDiagnosticCount": 1,
      "diagnostics": [
        {
          "code": "ITM_LINK_MISSING_RELATIONSHIP_TYPE",
          "severity": "error",
          "message": "Typed link has no relationship type before colon."
        }
      ]
    },
    {
      "file": "cases/03-links-relationships/link-old-colon-namespace-syntax.itm",
      "expectedDiagnosticCount": 1,
      "diagnostics": [
        {
          "code": "ITM_NAMESPACE_DELIMITER_INVALID",
          "severity": "error",
          "message": "Old colon namespace syntax used; ITM requires :: namespace delimiter."
        }
      ]
    },
    {
      "file": "cases/03-links-relationships/link-undefined-relationship-type.itm",
      "expectedDiagnosticCount": 1,
      "diagnostics": [
        {
          "code": "ITM_RELATIONSHIP_TYPE_UNDEFINED",
          "severity": "error",
          "message": "Relationship type is not declared or imported."
        }
      ]
    },
    {
      "file": "cases/03-links-relationships/link-unresolved-target.itm",
      "expectedDiagnosticCount": 1,
      "diagnostics": [
        {
          "code": "ITM_LINK_TARGET_UNRESOLVED",
          "severity": "error",
          "message": "Link target cannot be resolved."
        }
      ]
    },
    {
      "file": "cases/04-attributes-yaml/attr-block-malformed-yaml.itm",
      "expectedDiagnosticCount": 1,
      "diagnostics": [
        {
          "code": "ITM_ATTRIBUTE_YAML_INVALID",
          "severity": "error",
          "message": "Attribute block YAML is malformed."
        }
      ]
    },
    {
      "file": "cases/04-attributes-yaml/attr-block-unclosed.itm",
      "expectedDiagnosticCount": 1,
      "diagnostics": [
        {
          "code": "ITM_ATTRIBUTE_BLOCK_UNCLOSED",
          "severity": "error",
          "message": "Attribute block has no closing brace."
        }
      ]
    },
    {
      "file": "cases/04-attributes-yaml/attr-duplicate-keys.itm",
      "expectedDiagnosticCount": 1,
      "diagnostics": [
        {
          "code": "ITM_ATTRIBUTE_DUPLICATE_KEY",
          "severity": "warning",
          "message": "Attribute key is repeated."
        }
      ]
    },
    {
      "file": "cases/04-attributes-yaml/attr-inline-malformed-yaml.itm",
      "expectedDiagnosticCount": 1,
      "diagnostics": [
        {
          "code": "ITM_ATTRIBUTE_YAML_INVALID",
          "severity": "error",
          "message": "Inline attribute block is not YAML-compatible key/value syntax."
        }
      ]
    },
    {
      "file": "cases/04-attributes-yaml/attr-inline-unclosed-brace.itm",
      "expectedDiagnosticCount": 1,
      "diagnostics": [
        {
          "code": "ITM_ATTRIBUTE_INLINE_UNCLOSED",
          "severity": "error",
          "message": "Inline attribute block has no closing brace."
        }
      ]
    },
    {
      "file": "cases/04-attributes-yaml/attr-known-field-wrong-type.itm",
      "expectedDiagnosticCount": 1,
      "diagnostics": [
        {
          "code": "ITM_ATTRIBUTE_TYPE_INVALID",
          "severity": "warning",
          "message": "Known scalar attribute owner is a list."
        }
      ]
    },
    {
      "file": "cases/04-attributes-yaml/attr-orphan-block.itm",
      "expectedDiagnosticCount": 1,
      "diagnostics": [
        {
          "code": "ITM_ATTRIBUTE_BLOCK_ORPHAN",
          "severity": "error",
          "message": "Attribute block appears before any node or relationship."
        }
      ]
    },
    {
      "file": "cases/05-descriptions/description-after-relationship-block.itm",
      "expectedDiagnosticCount": 1,
      "diagnostics": [
        {
          "code": "ITM_DESCRIPTION_AFTER_RELATIONSHIP_AMBIGUOUS",
          "severity": "warning",
          "message": "Description after relationship attribute block is ambiguous."
        }
      ]
    },
    {
      "file": "cases/05-descriptions/description-fence-not-closed.itm",
      "expectedDiagnosticCount": 1,
      "diagnostics": [
        {
          "code": "ITM_DESCRIPTION_MARKDOWN_FENCE_UNCLOSED",
          "severity": "warning",
          "message": "Markdown fenced block in description is not closed."
        }
      ]
    },
    {
      "file": "cases/05-descriptions/description-inconsistent-indent.itm",
      "expectedDiagnosticCount": 1,
      "diagnostics": [
        {
          "code": "ITM_DESCRIPTION_INDENT_INCONSISTENT",
          "severity": "error",
          "message": "Description block indentation is inconsistent."
        }
      ]
    },
    {
      "file": "cases/05-descriptions/description-orphan-before-node.itm",
      "expectedDiagnosticCount": 1,
      "diagnostics": [
        {
          "code": "ITM_DESCRIPTION_ORPHAN",
          "severity": "error",
          "message": "Description block appears before any entity."
        }
      ]
    },
    {
      "file": "cases/06-directives-includes-packages/directive-unknown-strict.itm",
      "expectedDiagnosticCount": 1,
      "diagnostics": [
        {
          "code": "ITM_DIRECTIVE_UNKNOWN",
          "severity": "error",
          "message": "Unknown directive in strict mode."
        }
      ]
    },
    {
      "file": "cases/06-directives-includes-packages/include-circular-a.itm",
      "expectedDiagnosticCount": 1,
      "diagnostics": [
        {
          "code": "ITM_INCLUDE_CYCLE",
          "severity": "error",
          "message": "Circular include detected."
        }
      ]
    },
    {
      "file": "cases/06-directives-includes-packages/include-circular-b.itm",
      "expectedDiagnosticCount": 1,
      "diagnostics": [
        {
          "code": "ITM_INCLUDE_CYCLE",
          "severity": "error",
          "message": "Circular include detected."
        }
      ]
    },
    {
      "file": "cases/06-directives-includes-packages/include-missing-file.itm",
      "expectedDiagnosticCount": 1,
      "diagnostics": [
        {
          "code": "ITM_INCLUDE_MISSING",
          "severity": "error",
          "message": "Included file cannot be resolved."
        }
      ]
    },
    {
      "file": "cases/06-directives-includes-packages/metadata-duplicate.itm",
      "expectedDiagnosticCount": 1,
      "diagnostics": [
        {
          "code": "ITM_METADATA_DUPLICATE",
          "severity": "warning",
          "message": "Document contains more than one metadata block."
        }
      ]
    },
    {
      "file": "cases/06-directives-includes-packages/metadata-missing-block.itm",
      "expectedDiagnosticCount": 1,
      "diagnostics": [
        {
          "code": "ITM_METADATA_BLOCK_MISSING",
          "severity": "error",
          "message": "%metadata must be followed by a YAML-compatible block."
        }
      ]
    },
    {
      "file": "cases/06-directives-includes-packages/namespace-invalid-prefix.itm",
      "expectedDiagnosticCount": 1,
      "diagnostics": [
        {
          "code": "ITM_NAMESPACE_PREFIX_INVALID",
          "severity": "error",
          "message": "Namespace prefix starts with a digit."
        }
      ]
    },
    {
      "file": "cases/06-directives-includes-packages/package-block-unclosed.itm",
      "expectedDiagnosticCount": 1,
      "diagnostics": [
        {
          "code": "ITM_DIRECTIVE_BLOCK_UNCLOSED",
          "severity": "error",
          "message": "Package directive block is not closed."
        }
      ]
    },
    {
      "file": "cases/06-directives-includes-packages/repository-forbidden-protocol.itm",
      "expectedDiagnosticCount": 1,
      "diagnostics": [
        {
          "code": "ITM_REPOSITORY_PROTOCOL_FORBIDDEN",
          "severity": "error",
          "message": "Repository protocol is forbidden by local policy."
        }
      ]
    },
    {
      "file": "cases/06-directives-includes-packages/require-malformed-version.itm",
      "expectedDiagnosticCount": 2,
      "diagnostics": [
        {
          "code": "ITM_REQUIRE_VERSION_INVALID",
          "severity": "error",
          "message": "Malformed version constraint."
        },
        {
          "code": "ITM_REQUIRE_VERSION_INVALID",
          "severity": "error",
          "message": "Incomplete version constraint."
        }
      ]
    },
    {
      "file": "cases/06-directives-includes-packages/require-missing-plugin.itm",
      "expectedDiagnosticCount": 1,
      "diagnostics": [
        {
          "code": "ITM_REQUIRE_MISSING",
          "severity": "error",
          "message": "Required plugin is unavailable."
        }
      ]
    },
    {
      "file": "cases/06-directives-includes-packages/using-missing-package.itm",
      "expectedDiagnosticCount": 1,
      "diagnostics": [
        {
          "code": "ITM_PACKAGE_UNKNOWN",
          "severity": "error",
          "message": "%using references no loaded package."
        }
      ]
    },
    {
      "file": "cases/07-selectors-rules-styles-views/rule-invalid-severity.itm",
      "expectedDiagnosticCount": 1,
      "diagnostics": [
        {
          "code": "ITM_RULE_SEVERITY_INVALID",
          "severity": "error",
          "message": "Rule severity is not supported."
        }
      ]
    },
    {
      "file": "cases/07-selectors-rules-styles-views/rule-missing-pipeline.itm",
      "expectedDiagnosticCount": 1,
      "diagnostics": [
        {
          "code": "ITM_RULE_PIPELINE_MISSING",
          "severity": "error",
          "message": "Rule is missing pipeline."
        }
      ]
    },
    {
      "file": "cases/07-selectors-rules-styles-views/rule-missing-select.itm",
      "expectedDiagnosticCount": 1,
      "diagnostics": [
        {
          "code": "ITM_RULE_SELECT_MISSING",
          "severity": "error",
          "message": "Rule is missing select."
        }
      ]
    },
    {
      "file": "cases/07-selectors-rules-styles-views/rule-unknown-pipeline-step.itm",
      "expectedDiagnosticCount": 1,
      "diagnostics": [
        {
          "code": "ITM_RULE_PIPELINE_STEP_UNAVAILABLE",
          "severity": "error",
          "message": "Rule pipeline step is unavailable."
        }
      ]
    },
    {
      "file": "cases/07-selectors-rules-styles-views/selector-invalid-operator-sequence.itm",
      "expectedDiagnosticCount": 1,
      "diagnostics": [
        {
          "code": "ITM_SELECTOR_OPERATOR_SEQUENCE_INVALID",
          "severity": "error",
          "message": "Selector contains invalid operator sequence."
        }
      ]
    },
    {
      "file": "cases/07-selectors-rules-styles-views/selector-unbalanced-parentheses.itm",
      "expectedDiagnosticCount": 1,
      "diagnostics": [
        {
          "code": "ITM_SELECTOR_UNBALANCED_PARENTHESES",
          "severity": "error",
          "message": "Selector has unmatched parenthesis."
        }
      ]
    },
    {
      "file": "cases/07-selectors-rules-styles-views/selector-unknown-function.itm",
      "expectedDiagnosticCount": 1,
      "diagnostics": [
        {
          "code": "ITM_SELECTOR_FUNCTION_UNKNOWN",
          "severity": "error",
          "message": "Unknown selector function."
        }
      ]
    },
    {
      "file": "cases/07-selectors-rules-styles-views/style-block-malformed.itm",
      "expectedDiagnosticCount": 1,
      "diagnostics": [
        {
          "code": "ITM_STYLE_BLOCK_INVALID",
          "severity": "error",
          "message": "Style block has invalid syntax."
        }
      ]
    },
    {
      "file": "cases/07-selectors-rules-styles-views/style-selector-unknown-type.itm",
      "expectedDiagnosticCount": 1,
      "diagnostics": [
        {
          "code": "ITM_STYLE_SELECTOR_TYPE_UNKNOWN",
          "severity": "warning",
          "message": "Style selector references unknown type."
        }
      ]
    },
    {
      "file": "cases/07-selectors-rules-styles-views/view-delta-unknown-node-relationship.itm",
      "expectedDiagnosticCount": 3,
      "diagnostics": [
        {
          "code": "ITM_VIEW_DELTA_NODE_UNKNOWN",
          "severity": "warning",
          "message": "View delta references an unknown node."
        },
        {
          "code": "ITM_VIEW_DELTA_RELATIONSHIP_UNKNOWN",
          "severity": "warning",
          "message": "View delta references an unknown relationship."
        },
        {
          "code": "ITM_VIEW_DELTA_NODE_UNKNOWN",
          "severity": "warning",
          "message": "View delta references another unknown node."
        }
      ]
    },
    {
      "file": "cases/07-selectors-rules-styles-views/view-unknown-viewpoint.itm",
      "expectedDiagnosticCount": 1,
      "diagnostics": [
        {
          "code": "ITM_VIEWPOINT_UNKNOWN",
          "severity": "error",
          "message": "View references unknown viewpoint."
        }
      ]
    },
    {
      "file": "cases/07-selectors-rules-styles-views/viewpoint-invalid-step.itm",
      "expectedDiagnosticCount": 1,
      "diagnostics": [
        {
          "code": "ITM_VIEWPOINT_PIPELINE_STEP_INVALID",
          "severity": "error",
          "message": "Viewpoint pipeline step is invalid."
        }
      ]
    },
    {
      "file": "cases/07-selectors-rules-styles-views/viewpoint-missing-pipeline.itm",
      "expectedDiagnosticCount": 1,
      "diagnostics": [
        {
          "code": "ITM_VIEWPOINT_PIPELINE_MISSING",
          "severity": "error",
          "message": "Viewpoint has no pipeline."
        }
      ]
    },
    {
      "file": "cases/08-semantic-validation/semantic-closed-risk-no-mitigation-ok.itm",
      "expectedDiagnosticCount": 0,
      "diagnostics": []
    },
    {
      "file": "cases/08-semantic-validation/semantic-high-risk-no-mitigation.itm",
      "expectedDiagnosticCount": 1,
      "diagnostics": [
        {
          "code": "ITM_RULE_FAILED",
          "severity": "error",
          "message": "Open critical risk has no incoming mitigation."
        }
      ]
    },
    {
      "file": "cases/08-semantic-validation/semantic-process-without-children.itm",
      "expectedDiagnosticCount": 1,
      "diagnostics": [
        {
          "code": "ITM_RULE_FAILED",
          "severity": "information",
          "message": "Process has no children or ordering relationships."
        }
      ]
    },
    {
      "file": "cases/08-semantic-validation/semantic-required-attributes-missing.itm",
      "expectedDiagnosticCount": 2,
      "diagnostics": [
        {
          "code": "ITM_REQUIRED_ATTRIBUTE_MISSING",
          "severity": "error",
          "message": "Component is missing owner."
        },
        {
          "code": "ITM_REQUIRED_ATTRIBUTE_MISSING",
          "severity": "error",
          "message": "Service is missing status."
        }
      ]
    }
  ]
}```



## `expected/expected-diagnostics.yml`

```yaml
metadata:
  title: "Expected diagnostics for ITM failure-mode corpus"
  version: "1.0.0"
  generated: "2026-05-19"
  lineNumbers: "not included; compare by file, code, severity, and message substring"
  strictnessNote: "Tolerant parsers may downgrade some parse errors to warnings, but should still emit equivalent diagnostics."
cases:
  -
    file: "cases/00-valid/valid-control.itm"
    expectedDiagnosticCount: 0
    diagnostics:
  -
    file: "cases/01-indentation/indent-dedent-to-unknown-level.itm"
    expectedDiagnosticCount: 1
    diagnostics:
      -
        code: "ITM_INDENT_DEDENT_UNKNOWN_LEVEL"
        severity: "error"
        message: "Dedent does not match a previous indentation level."
  -
    file: "cases/01-indentation/indent-empty-label.itm"
    expectedDiagnosticCount: 1
    diagnostics:
      -
        code: "ITM_EMPTY_LABEL"
        severity: "warning"
        message: "Whitespace-only indented line should be ignored or diagnosed in strict mode."
  -
    file: "cases/01-indentation/indent-jump-two-levels.itm"
    expectedDiagnosticCount: 1
    diagnostics:
      -
        code: "ITM_INDENT_JUMP_TOO_DEEP"
        severity: "error"
        message: "Indentation jumps more than one level deeper."
  -
    file: "cases/01-indentation/indent-mixed-tabs-spaces.itm"
    expectedDiagnosticCount: 1
    diagnostics:
      -
        code: "ITM_INDENT_MIXED_TABS_SPACES"
        severity: "error"
        message: "Raw tab and space indentation are mixed."
  -
    file: "cases/01-indentation/indent-odd-spaces.itm"
    expectedDiagnosticCount: 1
    diagnostics:
      -
        code: "ITM_INDENT_NOT_MULTIPLE_OF_TWO"
        severity: "error"
        message: "Indentation is not a multiple of two spaces."
  -
    file: "cases/02-ids-types-overlays/id-duplicate-no-overlay.itm"
    expectedDiagnosticCount: 1
    diagnostics:
      -
        code: "ITM_ID_DUPLICATE"
        severity: "error"
        message: "Duplicate id without !overlay."
  -
    file: "cases/02-ids-types-overlays/id-empty.itm"
    expectedDiagnosticCount: 1
    diagnostics:
      -
        code: "ITM_ID_EMPTY"
        severity: "error"
        message: "Ampersand id marker has no identifier."
  -
    file: "cases/02-ids-types-overlays/id-invalid-character.itm"
    expectedDiagnosticCount: 1
    diagnostics:
      -
        code: "ITM_ID_INVALID_SYNTAX"
        severity: "error"
        message: "Id contains invalid character dot."
  -
    file: "cases/02-ids-types-overlays/id-invalid-start-digit.itm"
    expectedDiagnosticCount: 1
    diagnostics:
      -
        code: "ITM_ID_INVALID_SYNTAX"
        severity: "error"
        message: "Id starts with a digit."
  -
    file: "cases/02-ids-types-overlays/namespace-duplicate-alias-conflict.itm"
    expectedDiagnosticCount: 1
    diagnostics:
      -
        code: "ITM_NAMESPACE_ALIAS_REDEFINED"
        severity: "error"
        message: "Namespace alias test is rebound to a different URI."
  -
    file: "cases/02-ids-types-overlays/overlay-forward-disallowed.itm"
    expectedDiagnosticCount: 1
    diagnostics:
      -
        code: "ITM_OVERLAY_FORWARD_DISALLOWED"
        severity: "error"
        message: "Forward overlay appears before base definition."
  -
    file: "cases/02-ids-types-overlays/overlay-missing-target.itm"
    expectedDiagnosticCount: 1
    diagnostics:
      -
        code: "ITM_OVERLAY_TARGET_MISSING"
        severity: "error"
        message: "Overlay target has no prior base definition."
  -
    file: "cases/02-ids-types-overlays/overlay-type-change.itm"
    expectedDiagnosticCount: 2
    diagnostics:
      -
        code: "ITM_OVERLAY_TYPE_REPLACEMENT"
        severity: "warning"
        message: "Overlay changes existing node type."
      -
        code: "ITM_OVERLAY_LABEL_REPLACEMENT"
        severity: "warning"
        message: "Overlay replaces an existing label."
  -
    file: "cases/02-ids-types-overlays/type-misplaced-after-label.itm"
    expectedDiagnosticCount: 1
    diagnostics:
      -
        code: "ITM_TYPE_MISPLACED"
        severity: "warning"
        message: "Type token appears after label text."
  -
    file: "cases/02-ids-types-overlays/type-undefined.itm"
    expectedDiagnosticCount: 1
    diagnostics:
      -
        code: "ITM_TYPE_UNDEFINED"
        severity: "error"
        message: "Node type is not declared or imported."
  -
    file: "cases/03-links-relationships/link-block-before-node.itm"
    expectedDiagnosticCount: 1
    diagnostics:
      -
        code: "ITM_RELATIONSHIP_WITHOUT_SOURCE_NODE"
        severity: "error"
        message: "Relationship block appears before any source node."
  -
    file: "cases/03-links-relationships/link-double-colon-assignment.itm"
    expectedDiagnosticCount: 1
    diagnostics:
      -
        code: "ITM_LINK_ASSIGNMENT_DELIMITER_MISSING"
        severity: "error"
        message: "Relationship assignment requires single colon, not double colon."
  -
    file: "cases/03-links-relationships/link-duplicate-relationship-id.itm"
    expectedDiagnosticCount: 1
    diagnostics:
      -
        code: "ITM_RELATIONSHIP_ID_DUPLICATE"
        severity: "error"
        message: "Relationship id is reused."
  -
    file: "cases/03-links-relationships/link-endpoint-source-type-violation.itm"
    expectedDiagnosticCount: 1
    diagnostics:
      -
        code: "ITM_RELATIONSHIP_SOURCE_TYPE_INVALID"
        severity: "error"
        message: "Relationship source type does not match relationship definition."
  -
    file: "cases/03-links-relationships/link-endpoint-target-type-violation.itm"
    expectedDiagnosticCount: 1
    diagnostics:
      -
        code: "ITM_RELATIONSHIP_TARGET_TYPE_INVALID"
        severity: "error"
        message: "Relationship target type does not match relationship definition."
  -
    file: "cases/03-links-relationships/link-inline-attributes-after-multiple-links.itm"
    expectedDiagnosticCount: 1
    diagnostics:
      -
        code: "ITM_INLINE_RELATIONSHIP_ATTRIBUTES_AMBIGUOUS"
        severity: "warning"
        message: "Inline attributes after multiple links are ambiguous."
  -
    file: "cases/03-links-relationships/link-malformed-missing-target.itm"
    expectedDiagnosticCount: 1
    diagnostics:
      -
        code: "ITM_LINK_MISSING_TARGET"
        severity: "error"
        message: "Typed link has no target after colon."
  -
    file: "cases/03-links-relationships/link-malformed-missing-type.itm"
    expectedDiagnosticCount: 1
    diagnostics:
      -
        code: "ITM_LINK_MISSING_RELATIONSHIP_TYPE"
        severity: "error"
        message: "Typed link has no relationship type before colon."
  -
    file: "cases/03-links-relationships/link-old-colon-namespace-syntax.itm"
    expectedDiagnosticCount: 1
    diagnostics:
      -
        code: "ITM_NAMESPACE_DELIMITER_INVALID"
        severity: "error"
        message: "Old colon namespace syntax used; ITM requires :: namespace delimiter."
  -
    file: "cases/03-links-relationships/link-undefined-relationship-type.itm"
    expectedDiagnosticCount: 1
    diagnostics:
      -
        code: "ITM_RELATIONSHIP_TYPE_UNDEFINED"
        severity: "error"
        message: "Relationship type is not declared or imported."
  -
    file: "cases/03-links-relationships/link-unresolved-target.itm"
    expectedDiagnosticCount: 1
    diagnostics:
      -
        code: "ITM_LINK_TARGET_UNRESOLVED"
        severity: "error"
        message: "Link target cannot be resolved."
  -
    file: "cases/04-attributes-yaml/attr-block-malformed-yaml.itm"
    expectedDiagnosticCount: 1
    diagnostics:
      -
        code: "ITM_ATTRIBUTE_YAML_INVALID"
        severity: "error"
        message: "Attribute block YAML is malformed."
  -
    file: "cases/04-attributes-yaml/attr-block-unclosed.itm"
    expectedDiagnosticCount: 1
    diagnostics:
      -
        code: "ITM_ATTRIBUTE_BLOCK_UNCLOSED"
        severity: "error"
        message: "Attribute block has no closing brace."
  -
    file: "cases/04-attributes-yaml/attr-duplicate-keys.itm"
    expectedDiagnosticCount: 1
    diagnostics:
      -
        code: "ITM_ATTRIBUTE_DUPLICATE_KEY"
        severity: "warning"
        message: "Attribute key is repeated."
  -
    file: "cases/04-attributes-yaml/attr-inline-malformed-yaml.itm"
    expectedDiagnosticCount: 1
    diagnostics:
      -
        code: "ITM_ATTRIBUTE_YAML_INVALID"
        severity: "error"
        message: "Inline attribute block is not YAML-compatible key/value syntax."
  -
    file: "cases/04-attributes-yaml/attr-inline-unclosed-brace.itm"
    expectedDiagnosticCount: 1
    diagnostics:
      -
        code: "ITM_ATTRIBUTE_INLINE_UNCLOSED"
        severity: "error"
        message: "Inline attribute block has no closing brace."
  -
    file: "cases/04-attributes-yaml/attr-known-field-wrong-type.itm"
    expectedDiagnosticCount: 1
    diagnostics:
      -
        code: "ITM_ATTRIBUTE_TYPE_INVALID"
        severity: "warning"
        message: "Known scalar attribute owner is a list."
  -
    file: "cases/04-attributes-yaml/attr-orphan-block.itm"
    expectedDiagnosticCount: 1
    diagnostics:
      -
        code: "ITM_ATTRIBUTE_BLOCK_ORPHAN"
        severity: "error"
        message: "Attribute block appears before any node or relationship."
  -
    file: "cases/05-descriptions/description-after-relationship-block.itm"
    expectedDiagnosticCount: 1
    diagnostics:
      -
        code: "ITM_DESCRIPTION_AFTER_RELATIONSHIP_AMBIGUOUS"
        severity: "warning"
        message: "Description after relationship attribute block is ambiguous."
  -
    file: "cases/05-descriptions/description-fence-not-closed.itm"
    expectedDiagnosticCount: 1
    diagnostics:
      -
        code: "ITM_DESCRIPTION_MARKDOWN_FENCE_UNCLOSED"
        severity: "warning"
        message: "Markdown fenced block in description is not closed."
  -
    file: "cases/05-descriptions/description-inconsistent-indent.itm"
    expectedDiagnosticCount: 1
    diagnostics:
      -
        code: "ITM_DESCRIPTION_INDENT_INCONSISTENT"
        severity: "error"
        message: "Description block indentation is inconsistent."
  -
    file: "cases/05-descriptions/description-orphan-before-node.itm"
    expectedDiagnosticCount: 1
    diagnostics:
      -
        code: "ITM_DESCRIPTION_ORPHAN"
        severity: "error"
        message: "Description block appears before any entity."
  -
    file: "cases/06-directives-includes-packages/directive-unknown-strict.itm"
    expectedDiagnosticCount: 1
    diagnostics:
      -
        code: "ITM_DIRECTIVE_UNKNOWN"
        severity: "error"
        message: "Unknown directive in strict mode."
  -
    file: "cases/06-directives-includes-packages/include-circular-a.itm"
    expectedDiagnosticCount: 1
    diagnostics:
      -
        code: "ITM_INCLUDE_CYCLE"
        severity: "error"
        message: "Circular include detected."
  -
    file: "cases/06-directives-includes-packages/include-circular-b.itm"
    expectedDiagnosticCount: 1
    diagnostics:
      -
        code: "ITM_INCLUDE_CYCLE"
        severity: "error"
        message: "Circular include detected."
  -
    file: "cases/06-directives-includes-packages/include-missing-file.itm"
    expectedDiagnosticCount: 1
    diagnostics:
      -
        code: "ITM_INCLUDE_MISSING"
        severity: "error"
        message: "Included file cannot be resolved."
  -
    file: "cases/06-directives-includes-packages/metadata-duplicate.itm"
    expectedDiagnosticCount: 1
    diagnostics:
      -
        code: "ITM_METADATA_DUPLICATE"
        severity: "warning"
        message: "Document contains more than one metadata block."
  -
    file: "cases/06-directives-includes-packages/metadata-missing-block.itm"
    expectedDiagnosticCount: 1
    diagnostics:
      -
        code: "ITM_METADATA_BLOCK_MISSING"
        severity: "error"
        message: "%metadata must be followed by a YAML-compatible block."
  -
    file: "cases/06-directives-includes-packages/namespace-invalid-prefix.itm"
    expectedDiagnosticCount: 1
    diagnostics:
      -
        code: "ITM_NAMESPACE_PREFIX_INVALID"
        severity: "error"
        message: "Namespace prefix starts with a digit."
  -
    file: "cases/06-directives-includes-packages/package-block-unclosed.itm"
    expectedDiagnosticCount: 1
    diagnostics:
      -
        code: "ITM_DIRECTIVE_BLOCK_UNCLOSED"
        severity: "error"
        message: "Package directive block is not closed."
  -
    file: "cases/06-directives-includes-packages/repository-forbidden-protocol.itm"
    expectedDiagnosticCount: 1
    diagnostics:
      -
        code: "ITM_REPOSITORY_PROTOCOL_FORBIDDEN"
        severity: "error"
        message: "Repository protocol is forbidden by local policy."
  -
    file: "cases/06-directives-includes-packages/require-malformed-version.itm"
    expectedDiagnosticCount: 2
    diagnostics:
      -
        code: "ITM_REQUIRE_VERSION_INVALID"
        severity: "error"
        message: "Malformed version constraint."
      -
        code: "ITM_REQUIRE_VERSION_INVALID"
        severity: "error"
        message: "Incomplete version constraint."
  -
    file: "cases/06-directives-includes-packages/require-missing-plugin.itm"
    expectedDiagnosticCount: 1
    diagnostics:
      -
        code: "ITM_REQUIRE_MISSING"
        severity: "error"
        message: "Required plugin is unavailable."
  -
    file: "cases/06-directives-includes-packages/using-missing-package.itm"
    expectedDiagnosticCount: 1
    diagnostics:
      -
        code: "ITM_PACKAGE_UNKNOWN"
        severity: "error"
        message: "%using references no loaded package."
  -
    file: "cases/07-selectors-rules-styles-views/rule-invalid-severity.itm"
    expectedDiagnosticCount: 1
    diagnostics:
      -
        code: "ITM_RULE_SEVERITY_INVALID"
        severity: "error"
        message: "Rule severity is not supported."
  -
    file: "cases/07-selectors-rules-styles-views/rule-missing-pipeline.itm"
    expectedDiagnosticCount: 1
    diagnostics:
      -
        code: "ITM_RULE_PIPELINE_MISSING"
        severity: "error"
        message: "Rule is missing pipeline."
  -
    file: "cases/07-selectors-rules-styles-views/rule-missing-select.itm"
    expectedDiagnosticCount: 1
    diagnostics:
      -
        code: "ITM_RULE_SELECT_MISSING"
        severity: "error"
        message: "Rule is missing select."
  -
    file: "cases/07-selectors-rules-styles-views/rule-unknown-pipeline-step.itm"
    expectedDiagnosticCount: 1
    diagnostics:
      -
        code: "ITM_RULE_PIPELINE_STEP_UNAVAILABLE"
        severity: "error"
        message: "Rule pipeline step is unavailable."
  -
    file: "cases/07-selectors-rules-styles-views/selector-invalid-operator-sequence.itm"
    expectedDiagnosticCount: 1
    diagnostics:
      -
        code: "ITM_SELECTOR_OPERATOR_SEQUENCE_INVALID"
        severity: "error"
        message: "Selector contains invalid operator sequence."
  -
    file: "cases/07-selectors-rules-styles-views/selector-unbalanced-parentheses.itm"
    expectedDiagnosticCount: 1
    diagnostics:
      -
        code: "ITM_SELECTOR_UNBALANCED_PARENTHESES"
        severity: "error"
        message: "Selector has unmatched parenthesis."
  -
    file: "cases/07-selectors-rules-styles-views/selector-unknown-function.itm"
    expectedDiagnosticCount: 1
    diagnostics:
      -
        code: "ITM_SELECTOR_FUNCTION_UNKNOWN"
        severity: "error"
        message: "Unknown selector function."
  -
    file: "cases/07-selectors-rules-styles-views/style-block-malformed.itm"
    expectedDiagnosticCount: 1
    diagnostics:
      -
        code: "ITM_STYLE_BLOCK_INVALID"
        severity: "error"
        message: "Style block has invalid syntax."
  -
    file: "cases/07-selectors-rules-styles-views/style-selector-unknown-type.itm"
    expectedDiagnosticCount: 1
    diagnostics:
      -
        code: "ITM_STYLE_SELECTOR_TYPE_UNKNOWN"
        severity: "warning"
        message: "Style selector references unknown type."
  -
    file: "cases/07-selectors-rules-styles-views/view-delta-unknown-node-relationship.itm"
    expectedDiagnosticCount: 3
    diagnostics:
      -
        code: "ITM_VIEW_DELTA_NODE_UNKNOWN"
        severity: "warning"
        message: "View delta references an unknown node."
      -
        code: "ITM_VIEW_DELTA_RELATIONSHIP_UNKNOWN"
        severity: "warning"
        message: "View delta references an unknown relationship."
      -
        code: "ITM_VIEW_DELTA_NODE_UNKNOWN"
        severity: "warning"
        message: "View delta references another unknown node."
  -
    file: "cases/07-selectors-rules-styles-views/view-unknown-viewpoint.itm"
    expectedDiagnosticCount: 1
    diagnostics:
      -
        code: "ITM_VIEWPOINT_UNKNOWN"
        severity: "error"
        message: "View references unknown viewpoint."
  -
    file: "cases/07-selectors-rules-styles-views/viewpoint-invalid-step.itm"
    expectedDiagnosticCount: 1
    diagnostics:
      -
        code: "ITM_VIEWPOINT_PIPELINE_STEP_INVALID"
        severity: "error"
        message: "Viewpoint pipeline step is invalid."
  -
    file: "cases/07-selectors-rules-styles-views/viewpoint-missing-pipeline.itm"
    expectedDiagnosticCount: 1
    diagnostics:
      -
        code: "ITM_VIEWPOINT_PIPELINE_MISSING"
        severity: "error"
        message: "Viewpoint has no pipeline."
  -
    file: "cases/08-semantic-validation/semantic-closed-risk-no-mitigation-ok.itm"
    expectedDiagnosticCount: 0
    diagnostics:
  -
    file: "cases/08-semantic-validation/semantic-high-risk-no-mitigation.itm"
    expectedDiagnosticCount: 1
    diagnostics:
      -
        code: "ITM_RULE_FAILED"
        severity: "error"
        message: "Open critical risk has no incoming mitigation."
  -
    file: "cases/08-semantic-validation/semantic-process-without-children.itm"
    expectedDiagnosticCount: 1
    diagnostics:
      -
        code: "ITM_RULE_FAILED"
        severity: "information"
        message: "Process has no children or ordering relationships."
  -
    file: "cases/08-semantic-validation/semantic-required-attributes-missing.itm"
    expectedDiagnosticCount: 2
    diagnostics:
      -
        code: "ITM_REQUIRED_ATTRIBUTE_MISSING"
        severity: "error"
        message: "Component is missing owner."
      -
        code: "ITM_REQUIRED_ATTRIBUTE_MISSING"
        severity: "error"
        message: "Service is missing status."
```



## `profiles/basic-validation-profile.itm`

```itm
%metadata
{
  title: Basic validation profile for ITM failure-mode tests
  version: 1.0.0
  defaultNamespace: test
  validationMode: strict
}

%namespace test https://example.org/itm/test
%namespace ext https://example.org/itm/external

%package basic_validation_profile
{
  version: 1.0.0
  namespace: test
  description: Minimal reusable definitions for diagnostic tests.
}

%entitytype test::Component
{
  requiredAttributes:
    - owner
    - status
}

%entitytype test::Service
{
  requiredAttributes:
    - owner
    - status
}

%entitytype test::Risk
{
  requiredAttributes:
    - owner
    - severity
    - likelihood
    - status
}

%entitytype test::Control
{
  requiredAttributes:
    - owner
    - controlType
    - status
}

%entitytype test::Requirement
{
  requiredAttributes:
    - owner
    - priority
    - status
}

%entitytype test::Process
{
  requiredAttributes:
    - owner
    - status
}

%entitytype test::Task
{
  requiredAttributes:
    - owner
    - status
}

%entitytype test::Actor
{
  requiredAttributes:
    - owner
}

%relationshiptype test::depends_on
{
  sourceTypes:
    - test::Component
    - test::Service
  targetTypes:
    - test::Component
    - test::Service
}

%relationshiptype test::mitigates
{
  sourceTypes:
    - test::Control
  targetTypes:
    - test::Risk
}

%relationshiptype test::satisfies
{
  targetTypes:
    - test::Requirement
}

%relationshiptype test::serves
{
  sourceTypes:
    - test::Service
  targetTypes:
    - test::Actor
}

%relationshiptype test::sequence
{
  sourceTypes:
    - test::Task
  targetTypes:
    - test::Task
}

%rule components_need_owner_and_status
{
  select: "ANY([test::Component], [test::Service], [test::Task])"
  pipeline:
    - requireAttribute: owner
    - requireAttribute: status
  severity: error
  message: "Components, services, and tasks must define owner and status."
}

%rule open_high_risks_need_mitigation
{
  select: "ALL([test::Risk], ANY({severity=high}, {severity=critical}), NOT {status=closed})"
  pipeline:
    - requireIncomingRelationship: test::mitigates
  severity: error
  message: "Open high or critical risks must have an incoming mitigation."
}

%style [test::Component]
{
  fill: "#e8f1ff"
  stroke: "#3b73d9"
  shape: rectangle
}

%style @test::depends_on:*
{
  stroke: "#888888"
  stroke-dasharray: "4 2"
}

%viewpoint test_dependency_graph
{
  pipeline:
    - select: "ANY([test::Component], [test::Service])"
    - includeEdges: "@test::depends_on:*"
    - layout: graphviz.dot
    - render: svg
}
```
