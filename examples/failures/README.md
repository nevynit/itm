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
- `expected/expected-current-implementation.json`: current parser/composer baseline for automated regression tests.

## Spec vs implementation baselines

`expected-diagnostics.json` and `expected-diagnostics.yml` remain spec-oriented targets for broader future validation coverage.

`expected-current-implementation.json` is the implementation-aligned baseline used to validate the current `@textforge/itm` parser/composer behavior. Cases not listed there are currently expected to emit zero diagnostics.

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
