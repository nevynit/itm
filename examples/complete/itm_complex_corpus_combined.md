# Complex ITM Corpus



## `README_feature_coverage.md`

```markdown
# Complex ITM Corpus — Feature Coverage

This corpus contains long ITM examples intended to exercise the full Indented Text Model feature stack.

## Files

| File | Purpose |
|---|---|
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
| Diagnostics | Validation rules plus diagnostic payload example in the main model |
| Strict indentation | All files use two spaces per indentation level and no tabs |

## Notes

The corpus deliberately uses large examples that are useful for parser stress testing, renderer experiments, and transformation pipeline development. It is not intended to be a perfect business model; it is a broad syntax and semantics coverage set.
```



## `models/order-to-cash-digital-thread.itm`

```itm
%metadata
{
  title: Order-to-cash digital thread model
  version: 2.0.0
  author: Example Architecture Team
  defaultNamespace: local
  defaultRelationshipType: related_to
  description: A deliberately large ITM model exercising directives, namespaces, includes, packages, types, relationships, descriptions, attributes, validation rules, cascading styles, viewpoints, views, overlays, and visual-editing deltas.
  created: 2026-05-19
  updated: 2026-05-19
  validationMode: strict
  intendedRenderingModes:
    - bpmn.viewer
    - archimate.layered
    - cytoscape
    - sigma
    - mermaid.mindmap
    - markdown.site
}

%repository shared https://example.org/itm
%repository company file://models/company
%repository local ../

%include ../profiles/core-governance-profile.itm
%include ../profiles/bpmn-archimate-profile.itm
%include ../reference/enterprise-reference.itm
%include shared:profiles/security-baseline.itm

%namespace local https://example.org/itm/order-to-cash
%namespace gov https://example.org/itm/governance
%namespace ref https://example.org/itm/reference
%namespace bpmn https://www.omg.org/spec/BPMN/20100524/MODEL
%namespace archimate https://www.opengroup.org/archimate
%namespace profile https://example.org/itm/profiles/bpmn-archimate
%namespace visual https://example.org/itm/visual

%using governance_profile
%using bpmn_archimate_profile.types
%using bpmn_archimate_profile.rules
%using bpmn_archimate_profile.styles
%using enterprise_reference_data

%require itm.core ^1.0.0
%require itm.parser.strict-indent ^1.0.0
%require itm.validation.basic ^1.0.0
%require itm.graphviz ^1.0.0
%require itm.mermaid ^1.0.0
%require itm.bpmn ^0.3.0
%require itm.archimate ^0.3.0
%require local.order-to-cash-rules ^0.8.0
%require local.visual-edit-writeback ^0.2.0

%entitytype local::Channel
{
  description: Commercial or service channel through which orders arrive.
  requiredAttributes:
    - owner
    - status
}

%entitytype local::Policy
{
  description: Local policy element that constrains process behavior.
  requiredAttributes:
    - owner
    - status
    - policyType
}

%entitytype local::ExceptionPath
{
  description: Alternative path handling non-happy-flow cases.
  requiredAttributes:
    - owner
    - trigger
    - status
}

%relationshiptype local::reconciles_with
{
  description: Source element is reconciled against the target.
}

%relationshiptype local::escalates_to
{
  description: Source path escalates to target role, team, process, or control.
}

%relationshiptype local::captures
{
  description: Source captures target information object.
}

%relationshiptype local::publishes
{
  description: Source publishes target event or information asset.
}

%relationshiptype local::subscribes_to
{
  description: Source subscribes to target event or information asset.
}

%relationshiptype local::has_exception_path
{
  description: Source process has an explicit exception path.
}

%rule order_channels_need_actor
{
  select: "[local::Channel]"
  pipeline:
    - requireOutgoingRelationship:
        anyOf:
          - archimate::serves
          - gov::serves
  severity: warning
  message: "Each channel should explicitly serve an actor or role."
}

%rule payment_controls_need_metric
{
  select: "ALL([gov::Control], #finance)"
  pipeline:
    - requireOutgoingRelationship: gov::observes
  severity: information
  message: "Finance controls should observe at least one metric."
}

%rule open_exceptions_need_escalation
{
  select: "ALL([local::ExceptionPath], NOT {status=closed})"
  pipeline:
    - requireOutgoingRelationship: local::escalates_to
  severity: error
  message: "Open exception paths must escalate to a responsible team or role."
}

%rule critical_information_assets_need_controls
{
  select: "ALL([gov::InformationAsset], #critical)"
  pipeline:
    - requireIncomingRelationship:
        anyOf:
          - gov::governs
          - gov::observes
          - gov::mitigates
  severity: warning
  message: "Critical information assets should be governed, observed, or mitigated by at least one control."
}

%style [local::Channel]
{
  fill: "#e6f7ff"
  stroke: "#0077aa"
  shape: capsule
}

%style [local::Policy]
{
  fill: "#f3e8ff"
  stroke: "#6a1b9a"
  shape: document
}

%style [local::ExceptionPath]
{
  fill: "#fff3e0"
  stroke: "#ef6c00"
  shape: hexagon
}

%style @local::escalates_to:*
{
  stroke: "#ef6c00"
  stroke-width: 3
  stroke-dasharray: "8 3"
}

%style @local::reconciles_with:*
{
  stroke: "#00897b"
  stroke-width: 2
}

%style @local::publishes:*
{
  stroke: "#1565c0"
  stroke-width: 2
}

%style @local::subscribes_to:*
{
  stroke: "#6a1b9a"
  stroke-dasharray: "3 3"
}

%style "([gov::Risk] AND #critical) OR ([gov::Issue] AND {severity=high})"
{
  fill: "#ffcccc"
  stroke: "#8b0000"
  stroke-width: 4
}

%style "ALL([gov::Capability], #must, {status=active})"
{
  fill: "#dff7df"
  stroke: "#2e7d32"
  stroke-width: 3
}

%viewpoint order_to_cash_end_to_end
{
  description: End-to-end view across capability, process, BPMN, ArchiMate, data, controls, and risks.
  parameters:
    includeDraft:
      type: boolean
      default: false
    showMappings:
      type: boolean
      default: true
    riskSeverity:
      type: enum
      values:
        - all
        - high
        - critical
      default: high
  pipeline:
    - select: "ANY([gov::Capability], [gov::ValueStream], [gov::Process], [bpmn::Task], [bpmn::Gateway], [archimate::ApplicationComponent], [archimate::DataObject], [gov::Risk], [gov::Control], [gov::Metric], [local::Channel])"
    - exclude: "ALL(#draft, NOT {status=active})"
    - includeEdges: "ANY(=>, ~>, @gov::depends_on:*, @gov::realizes:*, @gov::mitigates:*, @gov::observes:*, @archimate::serves:*, @archimate::realizes:*, @profile::maps_to:*, @profile::lossy_projection:*)"
    - validate: local.order-to-cash-rules.endToEndConsistency
    - transform: graph.model
    - layout: graphviz.dot
    - render: svg
}

%viewpoint order_bpmn_operational_flow
{
  description: BPMN-like process flow for operational order handling.
  pipeline:
    - select: "ANY([bpmn::StartEvent], [bpmn::Task], [bpmn::UserTask], [bpmn::ServiceTask], [bpmn::Gateway], [bpmn::EndEvent], [bpmn::DataObject], [bpmn::DataStore])"
    - includeEdges: "ANY(@bpmn::sequenceFlow:*, @bpmn::dataInput:*, @bpmn::dataOutput:*, @bpmn::messageFlow:*)"
    - validate: bpmn.basicWellFormedness
    - transform: bpmn.xml
    - render: bpmn.viewer
    - export: bpmn.xml
}

%viewpoint order_archimate_layered
{
  description: ArchiMate-like layered rendering for business, application, data, and technology structure.
  pipeline:
    - select: "ANY([archimate::BusinessActor], [archimate::BusinessRole], [archimate::BusinessProcess], [archimate::BusinessService], [archimate::BusinessObject], [archimate::ApplicationComponent], [archimate::ApplicationService], [archimate::ApplicationInterface], [archimate::DataObject], [archimate::TechnologyNode], [archimate::TechnologyService])"
    - includeEdges: "ANY(@archimate::serves:*, @archimate::realizes:*, @archimate::accesses:*, @archimate::flows_to:*, @archimate::assigned_to:*)"
    - layout: layered
    - render: svg
}

%viewpoint order_risk_and_controls
{
  description: Risk, issue, control, metric, and mitigation projection.
  pipeline:
    - select: "ANY([gov::Risk], [gov::Issue], [gov::Control], [gov::Metric], [gov::Requirement], [local::ExceptionPath])"
    - includeEdges: "ANY(@gov::mitigates:*, @gov::observes:*, @gov::blocks:*, @gov::satisfies:*, @local::escalates_to:*)"
    - layout: graph.force
    - render: cytoscape
}

%viewpoint order_information_flow
{
  description: Information assets, data objects, stores, integrations, and event streams.
  pipeline:
    - select: "ANY([gov::InformationAsset], [gov::DataObject], [bpmn::DataObject], [bpmn::DataStore], [archimate::DataObject], [gov::Integration], [archimate::ApplicationInterface])"
    - includeEdges: "ANY(@gov::produces:*, @gov::consumes:*, @gov::flows_to:*, @local::publishes:*, @local::subscribes_to:*, @archimate::accesses:*)"
    - transform: graph.model
    - layout: elk.layered
    - render: sigma
}

%viewpoint order_mindmap
{
  description: A hierarchical mind map of the full model tree.
  pipeline:
    - select: "*"
    - includeEdges: "=>"
    - transform: mermaid.mindmap
    - render: mermaid.svg
}

%view current_order_to_cash_end_to_end
{
  viewpoint: order_to_cash_end_to_end
  title: Current order-to-cash end-to-end view
  parameters:
    includeDraft: false
    showMappings: true
    riskSeverity: high
  deltas:
    hidden:
      - node: local::future_marketplace_channel
      - relationship: rel_backlog_shadow_dependency
    collapsed:
      - node: local::diagnostic_examples
    moved:
      - node: local::payment_service
        dx: 140
        dy: -35
      - node: local::fraud_screening_service
        dx: 220
        dy: 45
      - node: local::warehouse_management_component
        dx: -90
        dy: 70
    pinned:
      - node: local::order_intake_capability
        x: 120
        y: 80
      - node: local::order_fulfilment_capability
        x: 420
        y: 80
      - node: local::invoice_and_payment_capability
        x: 720
        y: 80
    styleOverrides:
      - selector: "&local::payment_service"
        style:
          fill: "#fff3e0"
          stroke-width: 4
      - selector: "@local::reconciles_with:ref::payment_confirmation"
        style:
          stroke: "#00695c"
          stroke-width: 4
    labelOverrides:
      - node: local::order_event_stream_projection
        label: Order events
    notes:
      - "Layout reviewed after workshop 2026-05-19."
      - "Payment service is pinned near the finance controls to keep reconciliation visible."
    generatedAssets:
      - path: generated/order-to-cash-end-to-end.svg
        hash: sha256-placeholder-end-to-end
}

%view current_order_bpmn_operational_flow
{
  viewpoint: order_bpmn_operational_flow
  title: Current BPMN operational flow
  parameters:
    swimlanes:
      - sales
      - operations
      - finance
      - logistics
      - platform
  deltas:
    hidden:
      - node: local::manual_rekeying_task
    moved:
      - node: local::validate_order_task
        dx: 65
        dy: 0
      - node: local::payment_required_gateway
        dx: 95
        dy: -20
      - node: local::ship_order_task
        dx: 60
        dy: 20
    expanded:
      - node: local::exception_paths
    styleOverrides:
      - selector: "ALL([bpmn::ServiceTask], #automated)"
        style:
          fill: "#e0f7fa"
          stroke: "#00838f"
}

%view risk_review_board_view
{
  viewpoint: order_risk_and_controls
  title: Risk review board extract
  parameters:
    severity:
      - high
      - critical
  deltas:
    hidden:
      - node: local::low_confidence_backlog_item
    styleOverrides:
      - selector: "ALL([gov::Risk], {severity=critical})"
        style:
          fill: "#ffb3b3"
          stroke-width: 5
    notes:
      - "Review unresolved exception escalation and payment outage risk first."
}

&local::order_to_cash_portfolio [gov::Portfolio] Order-to-cash digital thread #core #must {owner: architecture_team, status: active, criticality: high, fill: "#f2f4f8", size: 22}
| # Order-to-cash digital thread
|
| This file is intentionally dense. It demonstrates ITM as a model-first source that can produce
| BPMN-like process views, ArchiMate-like architecture views, graph views, mind maps, validation
| diagnostics, and documentation.
|
| ## Embedded local diagram
|
| ```mermaid
| flowchart LR
|   Customer --> Channel
|   Channel --> Order
|   Order --> Payment
|   Payment --> Shipment
|   Shipment --> Invoice
| ```
|
| ```dot
| digraph otc {
|   rankdir=LR;
|   Customer -> Order -> Payment -> Shipment -> Invoice;
| }
| ```
{
  owner: architecture_team
  status: active
  criticality: high
  investmentTheme: digital-thread
  lifecycle:
    - discover
    - design
    - build
    - operate
  tags:
    - end-to-end
    - governed
  visual:
    layoutPreference: layered
    defaultView: current_order_to_cash_end_to_end
}
  &local::commercial_engagement [gov::ValueStream] Commercial engagement #customer #must {owner: sales, status: active, maturity: 3, targetMaturity: 4, fill: "#e8f1ff"}
  | Covers the interactions that turn interest into a captured order.
  | The ordering of children intentionally generates implicit `~>` ordering relationships.
    &local::web_channel [local::Channel] Web shop channel #digital #external {owner: ecommerce, status: active, channelType: web, link-color: "#0077aa", link-width: 2} @archimate::serves:ref::customer
    @gov::depends_on:local::catalog_service
    {
      id: rel_web_channel_depends_catalog
      confidence: high
      source: channel architecture workshop
      rationale: Web order capture depends on catalog availability.
    }
    &local::mobile_channel [local::Channel] Mobile app channel #digital #external {owner: ecommerce, status: active, channelType: mobile} @archimate::serves:ref::customer @gov::depends_on:local::identity_access_service
    &local::call_centre_channel [local::Channel] Call centre assisted order channel #human #internal {owner: service, status: active, channelType: voice} @archimate::serves:ref::customer_service_agent
    &local::future_marketplace_channel [local::Channel] Marketplace channel candidate #draft #future {owner: sales, status: idea, channelType: marketplace}

  &local::order_intake_capability [gov::Capability] Order intake capability #must #critical {owner: operations, status: active, maturity: 3, targetMaturity: 5, x: 120, y: 80, fill: "#dff7df"}
  | The capability that captures, validates, and commits a customer order.
  |
  | Key design tension:
  |
  | - keep the plain-text source readable;
  | - still retain enough semantics to generate process and architecture diagrams;
  | - make explicit what is lost when generating BPMN or ArchiMate projections.
  @archimate::serves:ref::customer
  {
    id: rel_order_intake_serves_customer
    confidence: high
    source: stakeholder map
  }
  @gov::owned_by:ref::operations_team
  {
    id: rel_order_intake_owned_by_operations
    responsibility: accountable
  }
  @gov::depends_on:local::customer_profile_service
  {
    id: rel_order_intake_depends_customer_profile
    confidence: high
    source: application walkthrough
  }
  @gov::depends_on:local::catalog_service
  {
    id: rel_order_intake_depends_catalog
    confidence: high
    source: product discovery workshop
  }
    &local::capture_order [gov::Activity] Capture order #entry #customer {owner: sales, status: active, automation: partial} @gov::consumes:ref::customer_master_data @gov::consumes:ref::product_catalog_data @gov::produces:ref::customer_order
    &local::validate_order [gov::Activity] Validate order #control {owner: operations, status: active, automation: high} @gov::depends_on:local::order_validation_service @gov::satisfies:local::req_order_completeness
    &local::commit_order [gov::Activity] Commit order #event #critical {owner: operations, status: active, automation: high} @local::publishes:ref::order_event_stream
    &local::notify_customer [gov::Activity] Notify customer of order acceptance #communication {owner: service, status: active, automation: high} @gov::consumes:ref::customer_order

  &local::invoice_and_payment_capability [gov::Capability] Invoice and payment capability #must #critical {owner: finance, status: active, maturity: 4, targetMaturity: 5, x: 720, y: 80, fill: "#fff3e0"}
  @gov::owned_by:ref::finance_team
  @gov::depends_on:local::payment_service
  {
    id: rel_payment_capability_depends_payment_service
    confidence: high
    source: finance architecture review
    status: accepted
  }
  @gov::depends_on:local::invoice_service
  {
    id: rel_payment_capability_depends_invoice_service
    confidence: high
    source: finance architecture review
  }
    &local::calculate_invoice [gov::Activity] Calculate invoice #finance {owner: finance, status: active, automation: high} @gov::produces:ref::invoice
    &local::collect_payment [gov::Activity] Collect payment #finance #critical {owner: finance, status: active, automation: high} @gov::consumes:ref::invoice @gov::produces:ref::payment_confirmation
    &local::reconcile_payment [gov::Activity] Reconcile payment #finance #control {owner: finance, status: active, automation: partial} @local::reconciles_with:ref::payment_confirmation
    {
      id: rel_reconcile_payment_confirmation
      confidence: medium
      source: finance control walkthrough
      frequency: daily
    }

  &local::order_fulfilment_capability [gov::Capability] Order fulfilment capability #must {owner: logistics, status: active, maturity: 3, targetMaturity: 4, x: 420, y: 80}
  @gov::owned_by:ref::warehouse_operator
  @gov::depends_on:local::warehouse_management_component
  @gov::depends_on:local::shipping_adapter
    &local::reserve_stock [gov::Activity] Reserve stock #logistics {owner: logistics, status: active, automation: high} @gov::consumes:ref::product_catalog_data
    &local::pick_pack_ship [gov::Activity] Pick, pack, and ship #logistics {owner: logistics, status: active, automation: partial} @gov::produces:ref::shipment_instruction
    &local::confirm_delivery [gov::Activity] Confirm delivery #logistics #event {owner: logistics, status: active, automation: high} @local::publishes:ref::order_event_stream

  &local::customer_support_capability [gov::Capability] Customer support capability #should {owner: service, status: active, maturity: 2, targetMaturity: 4}
  @gov::serves:ref::customer
  @gov::depends_on:local::case_management_component
    &local::handle_order_query [gov::Activity] Handle order query #service {owner: service, status: active, automation: partial}
    &local::handle_refund_request [gov::Activity] Handle refund request #service #exception {owner: service, status: active, automation: low}
    &local::capture_customer_feedback [gov::Activity] Capture #customer feedback from support channels {owner: service, status: active, automation: partial}

&local::bpmn_order_process [bpmn::Process] BPMN order handling process #process #bpmn {owner: operations, status: active}
| BPMN-oriented process container.
|
| This section deliberately maps BPMN tasks to ArchiMate and governance concepts using explicit
| `profile::maps_to`, `profile::semantic_equivalent`, and `profile::lossy_projection` links.
{
  processId: OTC-BPMN-001
  executable: false
  modelOwner: operations
}
  &local::order_received_event [bpmn::StartEvent] Order received #entry {owner: operations, eventDefinition: message, fill: "#e8fff2"}
  @bpmn::sequenceFlow:local::capture_order_task
  {
    id: flow_order_received_capture
    condition: always
  }
  &local::capture_order_task [bpmn::UserTask] Capture order #sales {owner: sales, performer: sales-agent, status: active, lane: sales}
  @bpmn::sequenceFlow:local::validate_order_task
  {
    id: flow_capture_validate
    condition: orderDataProvided
  }
  @bpmn::dataOutput:local::order_data_object
  {
    id: assoc_capture_order_data
    access: write
  }
  @profile::maps_to:local::capture_order
  {
    id: map_capture_task_to_activity
    confidence: high
    loss: "BPMN performer maps to activity owner only approximately."
  }
  &local::validate_order_task [bpmn::ServiceTask] Validate order #automated #control {owner: operations, system: order-validation-service, status: active, lane: platform}
  @bpmn::sequenceFlow:local::payment_required_gateway
  {
    id: flow_validate_payment_gateway
    condition: validOrder
  }
  @bpmn::dataInput:local::order_data_object
  {
    id: assoc_validate_order_data_input
    access: read
  }
  @profile::semantic_equivalent:local::validate_order
  {
    id: map_validate_task_to_activity
    confidence: high
  }
  &local::payment_required_gateway [bpmn::Gateway] Payment required? #decision {gatewayType: exclusive, owner: operations}
  @bpmn::sequenceFlow:local::collect_payment_task
  {
    id: flow_gateway_collect_payment
    condition: paymentRequired
  }
  @bpmn::sequenceFlow:local::reserve_stock_task
  {
    id: flow_gateway_reserve_stock
    condition: paymentNotRequired
  }
  &local::collect_payment_task [bpmn::ServiceTask] Collect payment #finance #automated {owner: finance, system: payment-service, status: active, lane: finance}
  @bpmn::sequenceFlow:local::payment_success_gateway
  {
    id: flow_collect_payment_success_gateway
    condition: paymentAttemptCompleted
  }
  @bpmn::dataOutput:local::payment_data_object
  {
    id: assoc_collect_payment_output
    access: write
  }
  @profile::maps_to:local::collect_payment
  {
    id: map_collect_payment_task_to_activity
    confidence: high
  }
  &local::payment_success_gateway [bpmn::Gateway] Payment successful? #decision {gatewayType: exclusive, owner: finance}
  @bpmn::sequenceFlow:local::reserve_stock_task
  {
    id: flow_payment_success_reserve_stock
    condition: success
  }
  @bpmn::sequenceFlow:local::payment_failed_path
  {
    id: flow_payment_failed_exception
    condition: failure
  }
  &local::reserve_stock_task [bpmn::ServiceTask] Reserve stock #logistics #automated {owner: logistics, system: warehouse-management, status: active, lane: logistics}
  @bpmn::sequenceFlow:local::ship_order_task
  {
    id: flow_reserve_ship
    condition: stockReserved
  }
  @profile::maps_to:local::reserve_stock
  {
    id: map_reserve_stock_task_to_activity
    confidence: high
  }
  &local::ship_order_task [bpmn::UserTask] Ship order #logistics {owner: logistics, performer: warehouse-operator, status: active, lane: logistics}
  @bpmn::sequenceFlow:local::send_invoice_task
  {
    id: flow_ship_invoice
    condition: shipped
  }
  @bpmn::dataOutput:local::shipment_data_object
  {
    id: assoc_ship_order_output
    access: write
  }
  &local::send_invoice_task [bpmn::ServiceTask] Send invoice #finance #automated {owner: finance, system: invoice-service, status: active, lane: finance}
  @bpmn::sequenceFlow:local::order_complete_event
  {
    id: flow_invoice_complete
    condition: invoiceSent
  }
  @profile::maps_to:local::calculate_invoice
  {
    id: map_send_invoice_to_calculate_invoice
    confidence: medium
    loss: "BPMN send invoice collapses invoice calculation and issuing."
  }
  &local::order_complete_event [bpmn::EndEvent] Order complete #success {owner: operations, result: fulfilled}
  &local::payment_failed_path [local::ExceptionPath] Payment failed exception path #exception #finance {owner: finance, trigger: paymentFailure, status: active}
  | This is intentionally typed as a local exception path, not as a BPMN element, to demonstrate
  | mixed semantic modelling inside a BPMN-oriented process section.
  @local::escalates_to:ref::finance_team
  {
    id: rel_payment_failed_escalates_finance
    escalationSla: PT4H
  }
  @gov::blocks:local::order_complete_event
  {
    id: rel_payment_failure_blocks_completion
    severity: high
  }
  &local::manual_rekeying_task [bpmn::UserTask] Manually re-key order #legacy #draft {owner: operations, performer: operations-clerk, status: retired, lane: operations}

&local::data_objects [gov::InformationAsset] Order data landscape #data #critical {owner: platform, classification: internal, status: active}
  &local::order_data_object [bpmn::DataObject] Order data object #bpmn #data {owner: operations, classification: internal, state: captured}
  @profile::semantic_equivalent:ref::customer_order
  {
    id: map_order_data_object_customer_order
    confidence: high
  }
  &local::payment_data_object [bpmn::DataObject] Payment data object #bpmn #data #finance {owner: finance, classification: confidential, state: confirmed}
  @profile::maps_to:ref::payment_confirmation
  {
    id: map_payment_data_to_confirmation
    confidence: high
  }
  &local::shipment_data_object [bpmn::DataObject] Shipment data object #bpmn #data #logistics {owner: logistics, classification: internal, state: instructed}
  @profile::maps_to:ref::shipment_instruction
  {
    id: map_shipment_data_to_instruction
    confidence: high
  }
  &local::order_store [bpmn::DataStore] Order store #datastore #critical {owner: platform, retention: P7Y}
  &local::payment_store [bpmn::DataStore] Payment store #datastore #finance #critical {owner: finance, retention: P10Y}
  &local::order_event_stream_projection [gov::InformationAsset] Order event stream projection #event #stream #critical {owner: platform, classification: internal, status: active}
  @local::subscribes_to:ref::order_event_stream
  {
    id: rel_projection_subscribes_order_events
    consumerGroup: operations-dashboard
  }
  @gov::flows_to:local::analytics_workspace
  {
    id: rel_order_events_flow_analytics
    cadence: near-real-time
  }

&local::archimate_architecture [archimate::BusinessProcess] Order-to-cash architecture view root #archimate {owner: architecture_team, status: active}
  &local::customer_journey_service [archimate::BusinessService] Order fulfilment service #customer-facing {owner: operations, status: active}
  @archimate::serves:ref::customer
  {
    id: rel_fulfilment_service_serves_customer
    channel: all
  }
  @archimate::realizes:local::order_intake_capability
  {
    id: rel_fulfilment_service_realizes_order_intake
    confidence: medium
  }
  &local::order_capture_process [archimate::BusinessProcess] Order capture process #business {owner: operations, status: active}
  @archimate::triggers:local::payment_collection_process
  {
    id: rel_capture_triggers_payment_collection
    condition: validOrder
  }
  @profile::maps_to:local::bpmn_order_process
  {
    id: map_arch_process_to_bpmn_process
    confidence: medium
    loss: "The ArchiMate process view has less ordering detail than the BPMN flow."
  }
  &local::payment_collection_process [archimate::BusinessProcess] Payment collection process #business #finance {owner: finance, status: active}
  @archimate::flows_to:local::fulfilment_coordination_process
  {
    id: rel_payment_flows_to_fulfilment
    payload: paymentConfirmation
  }
  &local::fulfilment_coordination_process [archimate::BusinessProcess] Fulfilment coordination process #business #logistics {owner: logistics, status: active}
  &local::order_application_service [archimate::ApplicationService] Order application service #application {owner: platform, status: active}
  @archimate::serves:local::order_capture_process
  {
    id: rel_order_app_service_serves_capture
  }
  &local::payment_application_service [archimate::ApplicationService] Payment application service #application #finance {owner: platform, status: active}
  @archimate::serves:local::payment_collection_process
  {
    id: rel_payment_app_service_serves_collection
  }
  &local::fulfilment_application_service [archimate::ApplicationService] Fulfilment application service #application #logistics {owner: platform, status: active}
  @archimate::serves:local::fulfilment_coordination_process
  {
    id: rel_fulfilment_app_service_serves_coordination
  }

&local::applications_and_integrations [gov::Portfolio] Application and integration landscape #application #platform {owner: platform_team, status: active}
  &local::identity_access_service [archimate::ApplicationComponent] Identity access service #security {owner: platform, lifecycle: production, criticality: high, fill: "#e3f2fd", size: 18}
  @gov::observes:ref::availability_slo
  {
    id: rel_identity_observed_by_availability
  }
  &local::customer_profile_service [archimate::ApplicationComponent] Customer profile service #crm #critical {owner: customer-experience, lifecycle: production, criticality: high}
  @archimate::accesses:ref::customer_master_data
  {
    id: rel_customer_profile_accesses_master_data
    access: read-write
  }
  &local::catalog_service [archimate::ApplicationComponent] Catalog service #catalog {owner: merchandising, lifecycle: production, criticality: medium}
  @archimate::accesses:ref::product_catalog_data
  {
    id: rel_catalog_accesses_product_data
    access: read
  }
  &local::order_validation_service [archimate::ApplicationComponent] Order validation service #order #automated {owner: platform, lifecycle: production, criticality: high}
  @archimate::realizes:local::order_application_service
  {
    id: rel_validation_realizes_order_app_service
  }
  @gov::uses:local::rules_engine_component
  {
    id: rel_validation_uses_rules_engine
  }
  &local::payment_service [archimate::ApplicationComponent] Payment service #finance #critical {owner: finance, lifecycle: production, criticality: high, background: "#fff3e0", link-color: "#cf6f2a", link-width: 3}
  | Payment service is a central dependency.
  |
  | Known concerns:
  |
  | - external provider outages;
  | - delayed confirmation messages;
  | - reconciliation mismatches;
  | - inconsistent fraud-screening decisions.
  @archimate::realizes:local::payment_application_service
  {
    id: rel_payment_service_realizes_payment_app_service
  }
  @gov::depends_on:ref::payment_provider
  {
    id: rel_payment_service_depends_provider
    confidence: high
    contractualSla: 99.5
  }
  @gov::depends_on:local::fraud_screening_service
  {
    id: rel_payment_service_depends_fraud
    confidence: high
  }
  &local::invoice_service [archimate::ApplicationComponent] Invoice service #finance {owner: finance, lifecycle: production, criticality: high}
  @archimate::accesses:ref::invoice
  {
    id: rel_invoice_service_accesses_invoice
    access: read-write
  }
  &local::warehouse_management_component [archimate::ApplicationComponent] Warehouse management component #logistics {owner: logistics, lifecycle: production, criticality: high, edge-color: "#3a6ea5"}
  @archimate::realizes:local::fulfilment_application_service
  {
    id: rel_wms_realizes_fulfilment_service
  }
  @gov::located_at:ref::warehouse_be
  {
    id: rel_wms_located_warehouse
  }
  &local::shipping_adapter [gov::Integration] Shipping carrier adapter #integration #external {owner: platform, protocol: REST, status: active}
  @gov::depends_on:ref::supplier
  {
    id: rel_shipping_adapter_depends_supplier
    confidence: medium
  }
  &local::fraud_screening_service [archimate::ApplicationComponent] Fraud screening service #finance #security {owner: finance, lifecycle: production, criticality: medium}
  &local::case_management_component [archimate::ApplicationComponent] Case management component #service {owner: service, lifecycle: production, criticality: medium}
  &local::rules_engine_component [archimate::ApplicationComponent] Rules engine component #platform {owner: platform, lifecycle: production, criticality: medium}
  &local::analytics_workspace [archimate::TechnologyNode] Analytics workspace #analytics {owner: platform, environment: cloud, status: active}
  @gov::located_at:ref::cloud_region_eu
  {
    id: rel_analytics_workspace_cloud_region
  }

&local::requirements_and_decisions [gov::Document] Requirements and decisions register #governance {owner: architecture_team, format: itm}
  &local::req_order_completeness [gov::Requirement] Order completeness must be checked before fulfilment #must #control {owner: operations, priority: must, status: accepted}
  @gov::satisfies:local::validate_order
  {
    id: rel_validate_satisfies_order_completeness
    evidence: process-review
  }
  &local::req_payment_confirmation_traceability [gov::Requirement] Payment confirmations must be traceable to orders #must #finance #critical {owner: finance, priority: must, status: accepted}
  @gov::verifies:ref::payment_reconciliation
  {
    id: rel_reconciliation_verifies_traceability
    evidence: daily-control
  }
  &local::req_event_stream_retention [gov::Requirement] Operational order events retained for ninety days #should #event {owner: platform, priority: should, status: proposed}
  &local::decision_text_source_canonical [gov::Decision] Keep ITM text as the canonical source #architecture {owner: architecture_team, status: accepted, decisionDate: 2026-05-19}
  | ## Decision rationale
  |
  | Generated BPMN, ArchiMate, Mermaid, DOT, SVG, and graph views are useful outputs, but the
  | canonical source remains the ITM document.
  |
  | This allows source control, review, and recovery even when richer visual tools are unavailable.
  @gov::documents:local::order_to_cash_portfolio
  {
    id: rel_decision_documents_portfolio
  }
  &local::decision_bpmn_projection_is_lossy [gov::Decision] BPMN projection is accepted as lossy #architecture {owner: architecture_team, status: accepted, decisionDate: 2026-05-19}
  @profile::lossy_projection:local::bpmn_order_process
  {
    id: rel_decision_lossy_projection_bpmn
    lostInformation:
      - cross-layer ownership
      - long-lived information assets
      - package usage
      - validation rules
      - view deltas
  }

&local::risk_and_control_landscape [gov::Portfolio] Risk and control landscape #risk #control {owner: risk, status: active}
  &local::risk_payment_provider_outage [gov::Risk] Payment provider outage blocks orders #critical #finance {owner: finance, severity: critical, likelihood: medium, status: open}
  @gov::blocks:local::collect_payment_task
  {
    id: rel_provider_outage_blocks_payment_task
    impact: high
  }
  @gov::blocks:local::invoice_and_payment_capability
  {
    id: rel_provider_outage_blocks_capability
    impact: high
  }
  &local::risk_catalog_staleness [gov::Risk] Product catalog stale during order capture #operations {owner: merchandising, severity: medium, likelihood: medium, status: open}
  @gov::blocks:local::capture_order_task
  {
    id: rel_catalog_staleness_blocks_capture
    impact: medium
  }
  &local::risk_reconciliation_mismatch [gov::Risk] Reconciliation mismatch between payment and invoice #finance #critical {owner: finance, severity: high, likelihood: medium, status: open}
  @gov::blocks:local::reconcile_payment
  {
    id: rel_reconciliation_mismatch_blocks_reconcile
    impact: high
  }
  &local::issue_manual_rekeying_legacy [gov::Issue] Legacy manual re-keying remains in edge cases #legacy {owner: operations, severity: medium, status: active}
  @gov::blocks:local::order_cycle_time
  {
    id: rel_manual_rekeying_blocks_cycle_time
    impact: medium
  }
  &local::control_provider_failover [gov::Control] Payment provider failover control #finance #resilience {owner: platform, controlType: corrective, status: designed}
  @gov::mitigates:local::risk_payment_provider_outage
  {
    id: rel_failover_mitigates_provider_outage
    confidence: medium
    targetDate: 2026-09-30
  }
  @gov::observes:ref::availability_slo
  {
    id: rel_failover_observes_availability
  }
  &local::control_daily_reconciliation [gov::Control] Daily payment reconciliation control #finance {owner: finance, controlType: detective, status: active}
  @gov::mitigates:local::risk_reconciliation_mismatch
  {
    id: rel_daily_reconciliation_mitigates_mismatch
    confidence: high
  }
  @gov::observes:ref::payment_failure_rate
  {
    id: rel_daily_reconciliation_observes_failure_rate
  }
  &local::control_catalog_freshness_monitor [gov::Control] Catalog freshness monitor #catalog {owner: merchandising, controlType: detective, status: active}
  @gov::mitigates:local::risk_catalog_staleness
  {
    id: rel_catalog_monitor_mitigates_staleness
    confidence: medium
  }

&local::milestones [gov::Portfolio] Delivery roadmap #roadmap {owner: architecture_team, status: active}
  &local::milestone_baseline_model [gov::Milestone] Baseline model published #done {date: 2026-05-31, status: planned}
  &local::milestone_bpmn_viewer [gov::Milestone] BPMN viewer round-trip dry run #bpmn {date: 2026-06-30, status: planned}
  &local::milestone_archimate_export [gov::Milestone] ArchiMate export prototype #archimate {date: 2026-07-31, status: planned}
  &local::milestone_visual_writeback [gov::Milestone] Visual write-back review workflow #visual-editing {date: 2026-08-31, status: planned}
  &local::milestone_ci_validation [gov::Milestone] CI validation gate #validation {date: 2026-09-30, status: planned}

&local::diagnostic_examples [gov::Document] Expected diagnostics examples #diagnostics {owner: architecture_team, format: markdown}
| The following block is an example diagnostic payload that a processor could produce.
|
| ```yaml
| source: itm.validator
| severity: warning
| message: "External-facing business services should serve at least one actor or role."
| file: models/order-to-cash-digital-thread.itm
| line: 999
| range:
|   from: 120
|   to: 145
| node: local::customer_journey_service
| relationship: null
| rule: archimate_business_services_need_served_actor
| pipelineStep: requireOutgoingRelationship
| ```
|
| Diagnostics are outputs of processing. They are not treated here as model nodes unless explicitly
| captured for documentation, as this example does.


&local::simple_relationship_examples [gov::Document] Simple relationship examples #links {owner: architecture_team, format: itm} @ref::customer @ref::payment_provider
| This node demonstrates the simplest ITM relationship form:
|
| - inline untyped links: `@ref::customer @ref::payment_provider`
| - a block untyped link with attributes: `@ref::supplier`
|
| A processor may assign the default relationship type from metadata.
@ref::supplier
{
  id: rel_simple_example_supplier
  confidence: low
  source: syntax-coverage-example
}

Simple planning backlog
  Clarify fulfillment SLA
  Check whether catalog freshness should be a control or a metric
  Review if the payment provider actor should be split by provider
  Capture manual returns path
  Validate whether the order event stream needs a schema package
```



## `overlays/production-hardening-overlay.itm`

```itm
%metadata
{
  title: Production hardening overlay for order-to-cash model
  version: 1.0.0
  defaultNamespace: local
  description: Explicit overlay file that patches selected nodes and relationships from the base model.
  validationMode: strict
}

%repository local ../
%include ../models/order-to-cash-digital-thread.itm

%namespace local https://example.org/itm/order-to-cash
%namespace gov https://example.org/itm/governance
%namespace ref https://example.org/itm/reference
%namespace bpmn https://www.omg.org/spec/BPMN/20100524/MODEL
%namespace archimate https://www.opengroup.org/archimate

%using governance_profile
%using bpmn_archimate_profile
%require itm.core ^1.0.0
%require itm.overlay ^1.0.0
%require local.order-to-cash-rules ^0.8.0

%rule overlays_must_have_patch_reason
{
  select: "*"
  pipeline:
    - requireAttribute: patchReason
  severity: observation
  message: "Overlay nodes should document the reason for the patch."
}

&local::payment_service !overlay [archimate::ApplicationComponent] Payment service
| ## Production hardening overlay
|
| This overlay raises criticality and adds a provider failover dependency discovered during
| production-readiness review.
{
  criticality: critical
  lifecycle: production
  resilienceTier: tier-1
  patchReason: production-readiness-review
  patchedBy: overlay::production-hardening
  patchedOn: 2026-05-19
}
@gov::depends_on:local::secondary_payment_provider_adapter
{
  id: rel_payment_service_depends_secondary_provider
  confidence: medium
  source: resilience review
  status: proposed
}

&local::secondary_payment_provider_adapter [gov::Integration] Secondary payment provider adapter #integration #finance #resilience
{
  owner: platform
  protocol: REST
  status: proposed
  criticality: high
  patchReason: new hardening element
}
@gov::depends_on:ref::payment_provider
{
  id: rel_secondary_adapter_depends_provider
  confidence: low
  source: architecture option
}

&local::control_provider_failover !overlay
{
  status: active
  confidence: high
  runbook: RUN-PAY-FAILOVER-001
  patchReason: failover-control-activated
}
@gov::mitigates:local::risk_payment_provider_outage
{
  id: rel_failover_overlay_mitigates_provider_outage
  confidence: high
  evidence: production-drill
}

&local::risk_payment_provider_outage !overlay
{
  likelihood: low
  residualSeverity: high
  status: monitored
  patchReason: mitigated-by-active-failover-control
}

&local::payment_failed_path !overlay [local::ExceptionPath] Payment failed exception path
{
  status: active
  escalationSla: PT2H
  patchReason: finance-operations-review
}
@local::escalates_to:ref::platform_team
{
  id: rel_payment_failed_escalates_platform_overlay
  escalationSla: PT2H
  reason: technical-failover-required
}

&local::current_order_to_cash_overlay_notes [gov::Document] Overlay notes #documentation
| This file demonstrates explicit overlays:
|
| - attributes are overwritten;
| - new attributes are added;
| - new relationships are added with relationship ids;
| - an overlay can add operational hardening detail without changing the base model file.
{
  owner: architecture_team
  format: markdown
}
```



## `profiles/bpmn-archimate-profile.itm`

```itm
%metadata
{
  title: BPMN and ArchiMate profile for complex ITM examples
  version: 1.0.0
  defaultNamespace: profile
  description: A deliberately broad profile that demonstrates namespace-qualified types, relationship types, rules, styles, and viewpoints.
}

%namespace bpmn https://www.omg.org/spec/BPMN/20100524/MODEL
%namespace archimate https://www.opengroup.org/archimate
%namespace profile https://example.org/itm/profiles/bpmn-archimate
%namespace local https://example.org/itm/local

%require itm.core ^1.0.0
%require itm.bpmn ^0.3.0
%require itm.archimate ^0.3.0
%require itm.graphviz ^1.0.0
%require itm.mermaid ^1.0.0
%require local.bpmn-archimate-rules ^0.2.0

%package bpmn_archimate_profile
{
  version: 1.0.0
  namespace: profile
  description: Shared BPMN and ArchiMate semantic layer for ITM examples.
  exports:
    namespaces:
      - bpmn
      - archimate
    viewpoints:
      - bpmn_process_flow
      - archimate_layered_view
      - cross_notation_impact_view
}

%entitytype bpmn::Process
{
  description: A BPMN process container.
  requiredAttributes:
    - owner
    - status
}

%entitytype bpmn::StartEvent
{
  description: A BPMN start event.
  requiredAttributes:
    - owner
    - eventDefinition
}

%entitytype bpmn::EndEvent
{
  description: A BPMN end event.
  requiredAttributes:
    - owner
    - result
}

%entitytype bpmn::Task
{
  description: A BPMN task.
  requiredAttributes:
    - owner
    - status
}

%entitytype bpmn::UserTask
{
  description: A BPMN user task.
  requiredAttributes:
    - owner
    - performer
    - status
}

%entitytype bpmn::ServiceTask
{
  description: A BPMN service task.
  requiredAttributes:
    - owner
    - system
    - status
}

%entitytype bpmn::Gateway
{
  description: A BPMN gateway.
  requiredAttributes:
    - gatewayType
}

%entitytype bpmn::DataObject
{
  description: A BPMN data object.
  requiredAttributes:
    - owner
    - classification
}

%entitytype bpmn::DataStore
{
  description: A BPMN data store.
  requiredAttributes:
    - owner
    - retention
}

%entitytype bpmn::Lane
{
  description: A BPMN lane or responsibility band.
  requiredAttributes:
    - owner
}

%entitytype archimate::BusinessActor
{
  description: An ArchiMate business actor.
  requiredAttributes:
    - owner
}

%entitytype archimate::BusinessRole
{
  description: An ArchiMate business role.
  requiredAttributes:
    - owner
}

%entitytype archimate::BusinessProcess
{
  description: An ArchiMate business process.
  requiredAttributes:
    - owner
    - status
}

%entitytype archimate::BusinessService
{
  description: An externally visible business service.
  requiredAttributes:
    - owner
    - status
}

%entitytype archimate::BusinessObject
{
  description: An ArchiMate business object.
  requiredAttributes:
    - owner
    - classification
}

%entitytype archimate::ApplicationComponent
{
  description: An ArchiMate application component.
  requiredAttributes:
    - owner
    - lifecycle
}

%entitytype archimate::ApplicationService
{
  description: An ArchiMate application service.
  requiredAttributes:
    - owner
    - status
}

%entitytype archimate::ApplicationInterface
{
  description: An ArchiMate application interface.
  requiredAttributes:
    - owner
    - protocol
}

%entitytype archimate::DataObject
{
  description: An ArchiMate data object.
  requiredAttributes:
    - owner
    - classification
}

%entitytype archimate::TechnologyNode
{
  description: Technology execution or deployment node.
  requiredAttributes:
    - owner
    - environment
}

%entitytype archimate::TechnologyService
{
  description: Technology service exposed to applications.
  requiredAttributes:
    - owner
    - status
}

%relationshiptype bpmn::sequenceFlow
{
  description: BPMN control-flow relationship.
  sourceTypes:
    - bpmn::StartEvent
    - bpmn::Task
    - bpmn::UserTask
    - bpmn::ServiceTask
    - bpmn::Gateway
  targetTypes:
    - bpmn::Task
    - bpmn::UserTask
    - bpmn::ServiceTask
    - bpmn::Gateway
    - bpmn::EndEvent
}

%relationshiptype bpmn::messageFlow
{
  description: BPMN message flow between participants.
}

%relationshiptype bpmn::association
{
  description: BPMN association to data or annotation.
}

%relationshiptype bpmn::dataInput
{
  description: BPMN task consumes a data object.
  targetTypes:
    - bpmn::DataObject
    - bpmn::DataStore
}

%relationshiptype bpmn::dataOutput
{
  description: BPMN task produces a data object.
  targetTypes:
    - bpmn::DataObject
    - bpmn::DataStore
}

%relationshiptype archimate::serves
{
  description: ArchiMate serving relationship.
}

%relationshiptype archimate::realizes
{
  description: ArchiMate realization relationship.
}

%relationshiptype archimate::accesses
{
  description: ArchiMate access relationship.
}

%relationshiptype archimate::triggers
{
  description: ArchiMate triggering relationship.
}

%relationshiptype archimate::flows_to
{
  description: ArchiMate flow relationship.
}

%relationshiptype archimate::assigned_to
{
  description: ArchiMate assignment relationship.
}

%relationshiptype archimate::composes
{
  description: ArchiMate composition relationship.
}

%relationshiptype archimate::aggregates
{
  description: ArchiMate aggregation relationship.
}

%relationshiptype archimate::specializes
{
  description: ArchiMate specialization relationship.
}

%relationshiptype profile::maps_to
{
  description: Mapping relationship between a BPMN element and an ArchiMate element.
}

%relationshiptype profile::semantic_equivalent
{
  description: Strong semantic equivalence between two elements from different notations.
}

%relationshiptype profile::lossy_projection
{
  description: Projection link where information is deliberately simplified.
}

%rule bpmn_tasks_need_owner
{
  select: "ANY([bpmn::Task], [bpmn::UserTask], [bpmn::ServiceTask])"
  pipeline:
    - requireAttribute: owner
    - requireAttribute: status
  severity: error
  message: "BPMN tasks must define owner and status."
}

%rule bpmn_sequence_flow_endpoints
{
  select: "@bpmn::sequenceFlow:*"
  pipeline:
    - requireSourceType:
        anyOf:
          - bpmn::StartEvent
          - bpmn::Task
          - bpmn::UserTask
          - bpmn::ServiceTask
          - bpmn::Gateway
    - requireTargetType:
        anyOf:
          - bpmn::Task
          - bpmn::UserTask
          - bpmn::ServiceTask
          - bpmn::Gateway
          - bpmn::EndEvent
  severity: error
  message: "BPMN sequence flows must connect BPMN flow nodes."
}

%rule archimate_business_services_need_served_actor
{
  select: "[archimate::BusinessService] AND NOT #internal"
  pipeline:
    - requireOutgoingRelationship: archimate::serves
  severity: warning
  message: "External-facing business services should serve at least one actor or role."
}

%rule cross_notation_mappings_should_be_explicit
{
  select: "ANY([bpmn::Process], [bpmn::Task], [bpmn::DataObject])"
  pipeline:
    - requireOutgoingRelationship:
        anyOf:
          - profile::maps_to
          - profile::lossy_projection
          - profile::semantic_equivalent
  severity: observation
  message: "BPMN elements should declare whether and how they map to ArchiMate elements."
}

%style [bpmn::StartEvent]
{
  fill: "#e8fff2"
  stroke: "#2e7d32"
  shape: circle
}

%style [bpmn::EndEvent]
{
  fill: "#ffe8e8"
  stroke: "#8b1d1d"
  shape: circle
  stroke-width: 3
}

%style [bpmn::Task]
{
  fill: "#e8f1ff"
  stroke: "#3b73d9"
  shape: rounded
}

%style [bpmn::UserTask]
{
  fill: "#e8f1ff"
  stroke: "#315f9b"
  shape: rounded
}

%style [bpmn::ServiceTask]
{
  fill: "#eef3ff"
  stroke: "#536dfe"
  shape: rounded
}

%style [bpmn::Gateway]
{
  fill: "#fff8dc"
  stroke: "#b7791f"
  shape: diamond
}

%style [archimate::BusinessActor]
{
  fill: "#fff4e5"
  stroke: "#d9822b"
  shape: actor
}

%style [archimate::BusinessProcess]
{
  fill: "#fff8e1"
  stroke: "#b7791f"
  shape: rounded
}

%style [archimate::BusinessService]
{
  fill: "#fdf2ff"
  stroke: "#9c27b0"
  shape: capsule
}

%style [archimate::ApplicationComponent]
{
  fill: "#e3f2fd"
  stroke: "#1565c0"
  shape: component
}

%style [archimate::ApplicationService]
{
  fill: "#e1f5fe"
  stroke: "#0288d1"
  shape: capsule
}

%style [archimate::DataObject]
{
  fill: "#e8f5e9"
  stroke: "#2e7d32"
  shape: cylinder
}

%style @bpmn::sequenceFlow:*
{
  stroke: "#333333"
  stroke-width: 2
}

%style @bpmn::messageFlow:*
{
  stroke: "#555555"
  stroke-dasharray: "5 3"
}

%style @archimate::serves:*
{
  stroke: "#7b1fa2"
  stroke-width: 2
}

%style @profile::lossy_projection:*
{
  stroke: "#ff8f00"
  stroke-dasharray: "6 4"
}

%viewpoint bpmn_process_flow
{
  description: BPMN-oriented rendering from ITM source.
  pipeline:
    - select: "ANY([bpmn::StartEvent], [bpmn::Task], [bpmn::UserTask], [bpmn::ServiceTask], [bpmn::Gateway], [bpmn::EndEvent], [bpmn::DataObject], [bpmn::DataStore])"
    - includeEdges: "ANY(@bpmn::sequenceFlow:*, @bpmn::messageFlow:*, @bpmn::association:*, @bpmn::dataInput:*, @bpmn::dataOutput:*)"
    - validate: bpmn.basicWellFormedness
    - transform: bpmn.xml
    - render: bpmn.viewer
}

%viewpoint archimate_layered_view
{
  description: Layered business, application, data, and technology view.
  pipeline:
    - select: "ANY([archimate::BusinessActor], [archimate::BusinessRole], [archimate::BusinessProcess], [archimate::BusinessService], [archimate::ApplicationComponent], [archimate::ApplicationService], [archimate::ApplicationInterface], [archimate::DataObject], [archimate::TechnologyNode], [archimate::TechnologyService])"
    - includeEdges: "ANY(@archimate::serves:*, @archimate::realizes:*, @archimate::accesses:*, @archimate::flows_to:*, @archimate::assigned_to:*)"
    - layout: layered
    - render: svg
}

%viewpoint cross_notation_impact_view
{
  description: Shows mapping edges between BPMN and ArchiMate concepts, highlighting lossy projections.
  pipeline:
    - select: "ANY([bpmn::Process], [bpmn::Task], [bpmn::DataObject], [archimate::BusinessProcess], [archimate::ApplicationComponent], [archimate::DataObject])"
    - includeEdges: "ANY(@profile::maps_to:*, @profile::semantic_equivalent:*, @profile::lossy_projection:*)"
    - layout: graphviz.dot
    - render: cytoscape
}
```



## `profiles/core-governance-profile.itm`

```itm
%metadata
{
  title: Core governance profile for complex ITM examples
  version: 1.0.0
  author: ITM sample corpus generator
  defaultNamespace: gov
  description: Reusable core types, relationship types, rules, styles, and viewpoints for enterprise-governance models.
  validationMode: strict
}

%namespace gov https://example.org/itm/governance
%namespace local https://example.org/itm/local
%namespace visual https://example.org/itm/visual

%require itm.core ^1.0.0
%require itm.graph ^1.0.0
%require itm.graphviz ^1.0.0
%require itm.mermaid ^1.0.0
%require itm.validation.basic ^1.0.0
%require local.selector-functions ^0.4.0

%package governance_profile
{
  version: 1.0.0
  namespace: gov
  description: Core reusable governance definitions.
  exports:
    namespaces:
      - gov
    entityTypes:
      - gov::Portfolio
      - gov::Capability
      - gov::ValueStream
      - gov::Process
      - gov::Activity
      - gov::Control
      - gov::Risk
      - gov::Issue
      - gov::Requirement
      - gov::Decision
      - gov::Metric
      - gov::InformationAsset
      - gov::DataObject
      - gov::ApplicationComponent
      - gov::Integration
      - gov::Actor
      - gov::Role
      - gov::Location
      - gov::Team
      - gov::Milestone
      - gov::Package
      - gov::Document
    relationshipTypes:
      - gov::depends_on
      - gov::satisfies
      - gov::verifies
      - gov::mitigates
      - gov::realizes
      - gov::serves
      - gov::owned_by
      - gov::assigned_to
      - gov::produces
      - gov::consumes
      - gov::flows_to
      - gov::triggers
      - gov::blocks
      - gov::implements
      - gov::documents
      - gov::observes
      - gov::located_at
      - gov::uses
      - gov::governs
      - gov::reports_to
    viewpoints:
      - governance_dependency_graph
      - governance_traceability_matrix
      - governance_risk_map
      - governance_mindmap
}

%entitytype gov::Portfolio
{
  description: A coherent set of initiatives, products, or capability changes governed together.
  requiredAttributes:
    - owner
    - status
  allowedStatuses:
    - idea
    - draft
    - active
    - paused
    - retired
  defaultStyle:
    shape: rectangle
}

%entitytype gov::Capability
{
  description: A business or mission capability.
  requiredAttributes:
    - owner
    - maturity
    - status
  recommendedAttributes:
    - criticality
    - targetMaturity
    - investmentTheme
}

%entitytype gov::ValueStream
{
  description: A chain of value-producing stages.
  requiredAttributes:
    - owner
    - status
}

%entitytype gov::Process
{
  description: A repeatable operational process.
  requiredAttributes:
    - owner
    - status
}

%entitytype gov::Activity
{
  description: A unit of operational work within a process or value stream.
  requiredAttributes:
    - owner
    - status
}

%entitytype gov::Control
{
  description: A control or governance checkpoint.
  requiredAttributes:
    - owner
    - controlType
    - status
}

%entitytype gov::Risk
{
  description: A potential adverse event or condition.
  requiredAttributes:
    - owner
    - severity
    - likelihood
    - status
}

%entitytype gov::Issue
{
  description: A current problem that needs resolution.
  requiredAttributes:
    - owner
    - severity
    - status
}

%entitytype gov::Requirement
{
  description: A requirement, constraint, or expected property.
  requiredAttributes:
    - owner
    - priority
    - status
}

%entitytype gov::Decision
{
  description: A documented decision.
  requiredAttributes:
    - owner
    - status
    - decisionDate
}

%entitytype gov::Metric
{
  description: A measurement or key performance indicator.
  requiredAttributes:
    - owner
    - unit
    - target
}

%entitytype gov::InformationAsset
{
  description: A managed information object or information product.
  requiredAttributes:
    - owner
    - classification
    - status
}

%entitytype gov::DataObject
{
  description: A structured data object.
  requiredAttributes:
    - owner
    - classification
}

%entitytype gov::ApplicationComponent
{
  description: A deployable or logical application component.
  requiredAttributes:
    - owner
    - lifecycle
    - criticality
}

%entitytype gov::Integration
{
  description: An integration mechanism, interface, or message exchange.
  requiredAttributes:
    - owner
    - protocol
    - status
}

%entitytype gov::Actor
{
  description: A person, organization, system, or external participant.
  requiredAttributes:
    - owner
}

%entitytype gov::Role
{
  description: A responsibility-bearing role.
  requiredAttributes:
    - owner
}

%entitytype gov::Location
{
  description: A physical or logical location.
  requiredAttributes:
    - region
}

%entitytype gov::Team
{
  description: A team that owns or operates model elements.
  requiredAttributes:
    - lead
    - status
}

%entitytype gov::Milestone
{
  description: A dated delivery or governance milestone.
  requiredAttributes:
    - date
    - status
}

%entitytype gov::Package
{
  description: A reusable ITM package.
  requiredAttributes:
    - version
}

%entitytype gov::Document
{
  description: A human-readable document or generated artifact.
  requiredAttributes:
    - owner
    - format
}

%relationshiptype gov::depends_on
{
  description: Indicates that a source element depends on a target element.
  sourceTypes:
    - gov::Capability
    - gov::Process
    - gov::Activity
    - gov::ApplicationComponent
    - gov::Integration
    - gov::InformationAsset
  targetTypes:
    - gov::Capability
    - gov::Process
    - gov::Activity
    - gov::ApplicationComponent
    - gov::Integration
    - gov::InformationAsset
}

%relationshiptype gov::satisfies
{
  description: Indicates that the source satisfies a requirement or need.
  targetTypes:
    - gov::Requirement
}

%relationshiptype gov::verifies
{
  description: Indicates that the source verifies a requirement or model assertion.
  targetTypes:
    - gov::Requirement
}

%relationshiptype gov::mitigates
{
  description: Indicates that the source mitigates a risk or issue.
  targetTypes:
    - gov::Risk
    - gov::Issue
}

%relationshiptype gov::realizes
{
  description: Indicates implementation or realization of a higher-level element.
}

%relationshiptype gov::serves
{
  description: Indicates that a source serves a target actor, role, process, or capability.
}

%relationshiptype gov::owned_by
{
  description: Ownership link to a role, team, or actor.
  targetTypes:
    - gov::Role
    - gov::Team
    - gov::Actor
}

%relationshiptype gov::assigned_to
{
  description: Assignment of work, accountability, or operational responsibility.
}

%relationshiptype gov::produces
{
  description: Source produces the target information asset or data object.
  targetTypes:
    - gov::InformationAsset
    - gov::DataObject
}

%relationshiptype gov::consumes
{
  description: Source consumes the target information asset or data object.
  targetTypes:
    - gov::InformationAsset
    - gov::DataObject
}

%relationshiptype gov::flows_to
{
  description: Source object, event, or process flow reaches the target.
}

%relationshiptype gov::triggers
{
  description: Source completion or event triggers the target.
}

%relationshiptype gov::blocks
{
  description: Source blocks the target.
}

%relationshiptype gov::implements
{
  description: Source implements target.
}

%relationshiptype gov::documents
{
  description: Source documents target.
}

%relationshiptype gov::observes
{
  description: Source metric observes target.
}

%relationshiptype gov::located_at
{
  description: Source is located at target.
  targetTypes:
    - gov::Location
}

%relationshiptype gov::uses
{
  description: Source uses target.
}

%relationshiptype gov::governs
{
  description: Source governs target.
}

%relationshiptype gov::reports_to
{
  description: Source reports to target.
}

%rule governance_required_ownership
{
  select: "ANY([gov::Capability], [gov::Process], [gov::Activity], [gov::Requirement], [gov::Risk], [gov::ApplicationComponent])"
  pipeline:
    - requireAttribute: owner
  severity: error
  message: "Governance elements must define an owner."
}

%rule active_elements_must_not_be_draft
{
  select: "ALL(ANY([gov::Capability], [gov::Process], [gov::ApplicationComponent]), {status=active})"
  pipeline:
    - forbidTag: draft
  severity: warning
  message: "Active elements should not still carry the draft tag."
}

%rule high_risks_need_mitigation
{
  select: "ALL([gov::Risk], ANY({severity=high}, {severity=critical}), NOT {status=closed})"
  pipeline:
    - requireIncomingRelationship: gov::mitigates
  severity: error
  message: "Open high or critical risks must have at least one mitigation."
}

%rule capability_priority_xor
{
  select: "ONE(#must, #should, #could)"
  pipeline:
    - local.selector-functions.requireExactlyOneTag:
        tags:
          - must
          - should
          - could
  severity: information
  message: "Capability prioritisation should use exactly one priority tag."
}

%rule dependencies_connect_supported_elements
{
  select: "@gov::depends_on:*"
  pipeline:
    - requireSourceType:
        anyOf:
          - gov::Capability
          - gov::Process
          - gov::Activity
          - gov::ApplicationComponent
          - gov::Integration
          - gov::InformationAsset
    - requireTargetType:
        anyOf:
          - gov::Capability
          - gov::Process
          - gov::Activity
          - gov::ApplicationComponent
          - gov::Integration
          - gov::InformationAsset
  severity: error
  message: "Dependencies must connect supported governance, application, integration, or information elements."
}

%rule hierarchy_children_are_ordered
{
  select: "ANY([gov::Process], [gov::ValueStream])"
  pipeline:
    - requireChildren
    - requireOrdering
  severity: observation
  message: "Processes and value streams should contain ordered child elements."
}

%style *
{
  font-size: 12
  font-family: Inter
}

%style [gov::Portfolio]
{
  fill: "#f2f4f8"
  stroke: "#394b59"
  shape: rectangle
  stroke-width: 2
}

%style [gov::Capability]
{
  fill: "#e8f1ff"
  stroke: "#3b73d9"
  shape: rounded
}

%style [gov::Process]
{
  fill: "#eef8ed"
  stroke: "#438b4b"
  shape: rectangle
}

%style [gov::Activity]
{
  fill: "#ffffff"
  stroke: "#6b8f71"
  shape: rounded
}

%style [gov::Risk]
{
  fill: "#ffe8e8"
  stroke: "#cc3333"
  shape: hexagon
}

%style [gov::Issue]
{
  fill: "#fff2cc"
  stroke: "#b7791f"
  shape: hexagon
}

%style [gov::Requirement]
{
  fill: "#f4e8ff"
  stroke: "#7b3bbd"
  shape: document
}

%style [gov::Decision]
{
  fill: "#fff7e6"
  stroke: "#d9822b"
  shape: diamond
}

%style [gov::Metric]
{
  fill: "#e6fffa"
  stroke: "#00897b"
  shape: ellipse
}

%style #critical
{
  stroke-width: 4
  font-weight: bold
}

%style #draft
{
  opacity: 0.55
  stroke-dasharray: "5 3"
}

%style {status=active}
{
  stroke-width: 3
}

%style @gov::depends_on:*
{
  stroke: "#7a869a"
  stroke-dasharray: "4 2"
}

%style @gov::mitigates:*
{
  stroke: "#2e7d32"
  stroke-width: 2
}

%style @gov::blocks:*
{
  stroke: "#c62828"
  stroke-width: 3
  line-style: dashed
}

%style =>
{
  stroke: "#c1c7d0"
}

%style ~>
{
  stroke: "#9ea7b3"
  stroke-dasharray: "2 2"
}

%viewpoint governance_dependency_graph
{
  description: Shows active capabilities, applications, integrations, information assets, and their dependencies.
  parameters:
    includeDraft:
      type: boolean
      default: false
    includeExternal:
      type: boolean
      default: true
  pipeline:
    - select: "ANY([gov::Capability], [gov::ApplicationComponent], [gov::Integration], [gov::InformationAsset])"
    - exclude: "NONE({status=active}, #external)"
    - includeEdges: "@gov::depends_on:*"
    - includeEdges: "@gov::uses:*"
    - includeEdges: "@gov::flows_to:*"
    - layout: graphviz.dot
    - render: svg
}

%viewpoint governance_traceability_matrix
{
  description: Shows requirements, decisions, risks, mitigations, and verification links.
  pipeline:
    - select: "ANY([gov::Requirement], [gov::Decision], [gov::Risk], [gov::Issue], [gov::Control], [gov::Metric])"
    - includeEdges: "ANY(@gov::satisfies:*, @gov::verifies:*, @gov::mitigates:*, @gov::documents:*, @gov::observes:*)"
    - transform: table.matrix
    - render: html.table
}

%viewpoint governance_risk_map
{
  description: Shows open risks and issues with their controls, mitigations, and blocked elements.
  pipeline:
    - select: "ANY([gov::Risk], [gov::Issue], [gov::Control], [gov::Requirement]) AND NOT {status=closed}"
    - includeEdges: "ANY(@gov::mitigates:*, @gov::blocks:*, @gov::satisfies:*)"
    - layout: graph.force
    - render: cytoscape
}

%viewpoint governance_mindmap
{
  description: Shows the hierarchy as a mind map using containment edges.
  pipeline:
    - select: "*"
    - includeEdges: "=>"
    - transform: mermaid.mindmap
    - render: mermaid.svg
}

%viewpoint governance_documentation_site
{
  description: Produces a documentation site from markdown descriptions and generated diagrams.
  pipeline:
    - select: "*"
    - collectDescriptions: true
    - includeDiagnostics: true
    - render: markdown.site
}
```



## `reference/enterprise-reference.itm`

```itm
%metadata
{
  title: Enterprise reference data for complex ITM examples
  version: 1.0.0
  defaultNamespace: ref
  description: Shared actors, roles, teams, locations, standard controls, and reference information assets.
}

%namespace ref https://example.org/itm/reference
%namespace gov https://example.org/itm/governance
%namespace archimate https://www.opengroup.org/archimate
%namespace bpmn https://www.omg.org/spec/BPMN/20100524/MODEL

%include ../profiles/core-governance-profile.itm
%include ../profiles/bpmn-archimate-profile.itm
%using governance_profile.types
%using governance_profile.rules
%using governance_profile.styles
%using bpmn_archimate_profile.types
%using bpmn_archimate_profile.styles

%package enterprise_reference_data
{
  version: 1.0.0
  namespace: ref
  description: Reference elements reused across the example models.
}

&ref::customer [archimate::BusinessActor] Customer #external #stakeholder {owner: customer-experience, segment: retail}
| Represents the external customer actor.
|
| This is intentionally shared as reference data so that process, capability, BPMN,
| and ArchiMate views can all point to the same semantic element.

&ref::supplier [archimate::BusinessActor] Supplier #external #partner {owner: procurement, segment: logistics}
&ref::payment_provider [archimate::BusinessActor] Payment Provider #external #partner {owner: finance, segment: payments}
&ref::warehouse_operator [archimate::BusinessRole] Warehouse Operator #internal {owner: logistics}
&ref::finance_clerk [archimate::BusinessRole] Finance Clerk #internal {owner: finance}
&ref::customer_service_agent [archimate::BusinessRole] Customer Service Agent #internal {owner: service}

&ref::operations_team [gov::Team] Operations Team #team
{
  lead: Head of Operations
  status: active
  membersApprox: 35
  workingMode: hybrid
}

&ref::platform_team [gov::Team] Platform Team #team
{
  lead: Platform Lead
  status: active
  membersApprox: 18
  workingMode: hybrid
}

&ref::finance_team [gov::Team] Finance Team #team
{
  lead: Finance Operations Lead
  status: active
  membersApprox: 22
}

&ref::architecture_team [gov::Team] Architecture Team #team
{
  lead: Chief Architect
  status: active
  membersApprox: 6
}

&ref::brussels_hq [gov::Location] Brussels HQ #location {region: BE, campus: Woluwe, timezone: Europe/Brussels}
&ref::warehouse_be [gov::Location] Belgian Distribution Warehouse #location {region: BE, campus: Zaventem, timezone: Europe/Brussels}
&ref::cloud_region_eu [gov::Location] EU Cloud Region #location {region: EU, campus: managed-cloud, timezone: UTC}

&ref::customer_order [archimate::BusinessObject] Customer Order #information #core
{
  owner: operations
  classification: internal
  retention: P7Y
  canonicalId: orderId
}

&ref::invoice [archimate::BusinessObject] Invoice #information #finance
{
  owner: finance
  classification: confidential
  retention: P10Y
  canonicalId: invoiceId
}

&ref::payment_confirmation [archimate::BusinessObject] Payment Confirmation #information #finance
{
  owner: finance
  classification: confidential
  retention: P10Y
  canonicalId: paymentConfirmationId
}

&ref::shipment_instruction [archimate::BusinessObject] Shipment Instruction #information #logistics
{
  owner: logistics
  classification: internal
  retention: P3Y
  canonicalId: shipmentInstructionId
}

&ref::customer_master_data [archimate::DataObject] Customer Master Data #data #critical
{
  owner: customer-experience
  classification: confidential
  systemOfRecord: crm
  gdpr: true
}

&ref::product_catalog_data [archimate::DataObject] Product Catalog Data #data
{
  owner: merchandising
  classification: public
  systemOfRecord: catalog
}

&ref::order_event_stream [gov::InformationAsset] Order Event Stream #event #stream #critical
{
  owner: platform
  classification: internal
  status: active
  schemaVersion: 2.1.0
  retention: P90D
}

&ref::audit_log [gov::InformationAsset] Audit Log #security #compliance
{
  owner: security
  classification: restricted
  status: active
  retention: P10Y
}

&ref::segregation_of_duties [gov::Control] Segregation of Duties #control #finance
{
  owner: finance
  controlType: preventive
  status: active
  frequency: continuous
}

&ref::payment_reconciliation [gov::Control] Payment Reconciliation #control #finance
{
  owner: finance
  controlType: detective
  status: active
  frequency: daily
}

&ref::order_audit_trail [gov::Control] Order Audit Trail #control #compliance
{
  owner: security
  controlType: detective
  status: active
  frequency: continuous
}

&ref::availability_slo [gov::Metric] Availability SLO #metric #service
{
  owner: platform
  unit: percentage
  target: 99.9
  window: monthly
}

&ref::order_cycle_time [gov::Metric] Order Cycle Time #metric #operations
{
  owner: operations
  unit: hours
  target: 24
  window: rolling-30d
}

&ref::payment_failure_rate [gov::Metric] Payment Failure Rate #metric #finance
{
  owner: finance
  unit: percentage
  target: 1.5
  window: rolling-7d
}

Reference glossary
  Actor
  Role
  Team
  Location
  Information asset
  Control
  Metric
  External partner
```



## `visual-edits/visual-editing-writeback-example.itm`

```itm
%metadata
{
  title: Visual editing and write-back patch example
  version: 1.0.0
  defaultNamespace: local
  description: Demonstrates controlled visual editing, view-level deltas, and proposed model-level write-back as ITM content.
}

%include ../models/order-to-cash-digital-thread.itm

%namespace local https://example.org/itm/order-to-cash
%namespace gov https://example.org/itm/governance
%namespace visual https://example.org/itm/visual
%namespace bpmn https://www.omg.org/spec/BPMN/20100524/MODEL
%namespace archimate https://www.opengroup.org/archimate

%require itm.core ^1.0.0
%require local.visual-edit-writeback ^0.2.0

%entitytype visual::EditSession
{
  description: A visual editing session captured as model metadata.
  requiredAttributes:
    - started
    - editor
    - status
}

%entitytype visual::ProposedPatch
{
  description: A proposed patch produced by a visual editor.
  requiredAttributes:
    - patchType
    - status
}

%relationshiptype visual::patches
{
  description: The source patch modifies the target node, relationship, view, or directive.
}

%relationshiptype visual::records_delta_for
{
  description: The source visual edit session records a view-level delta for a target view.
}

%style [visual::EditSession]
{
  fill: "#edf7ff"
  stroke: "#0d47a1"
  shape: rounded
}

%style [visual::ProposedPatch]
{
  fill: "#fff8e1"
  stroke: "#ff8f00"
  shape: document
}

%view order_bpmn_after_visual_edit
{
  viewpoint: order_bpmn_operational_flow
  title: BPMN view after visual editing session
  parameters:
    editMode: review
    sourceFrozen: true
  deltas:
    moved:
      - node: local::capture_order_task
        dx: 25
        dy: 0
      - node: local::validate_order_task
        dx: 90
        dy: -10
      - node: local::collect_payment_task
        dx: 120
        dy: -20
      - node: local::payment_failed_path
        dx: 140
        dy: 80
    hiddenRelationships:
      - relationship: rel_backlog_shadow_dependency
    styleOverrides:
      - selector: "&local::payment_failed_path"
        style:
          fill: "#fff3e0"
          stroke: "#ef6c00"
          stroke-width: 4
    notes:
      - "These are view-level deltas and should be written back into the view, not the semantic model."
}

&local::visual_edit_session_2026_05_19 [visual::EditSession] Visual edit session 2026-05-19 #visual-editing #review
{
  started: 2026-05-19T14:30:00+02:00
  ended: 2026-05-19T15:10:00+02:00
  editor: bpmn.viewer
  status: pending-review
  sourceFrozen: true
  reviewedBy: architecture_team
}
@visual::records_delta_for:order_bpmn_after_visual_edit
{
  id: rel_session_records_bpmn_view_delta
  deltaType: layout-and-style
}

&local::patch_add_refund_exception_path [visual::ProposedPatch] Add refund exception path #semantic-change
| This proposed patch is a model-level write-back candidate.
|
| It should not be applied automatically. A host editor should show the patch, let the user review it,
| and only then insert the corresponding ITM node and relationships into the base document.
{
  patchType: model-add-node
  status: proposed
  proposedBy: bpmn.viewer
  targetFile: models/order-to-cash-digital-thread.itm
}
@visual::patches:local::bpmn_order_process
{
  id: rel_patch_adds_refund_path_to_bpmn_process
  operation: add-child-node
}

&local::proposed_refund_exception_path [local::ExceptionPath] Refund requested exception path #exception #service #proposed
{
  owner: service
  trigger: refundRequested
  status: proposed
}
@local::escalates_to:ref::customer_service_agent
{
  id: rel_refund_exception_escalates_service
  escalationSla: P1D
}
@gov::blocks:local::order_complete_event
{
  id: rel_refund_exception_blocks_completion
  severity: medium
}

&local::patch_change_payment_gateway_label [visual::ProposedPatch] Rename payment gateway label #semantic-change
{
  patchType: model-update-label
  status: proposed
  targetNode: local::payment_success_gateway
  oldLabel: Payment successful?
  newLabel: Payment authorized?
}
@visual::patches:local::payment_success_gateway
{
  id: rel_patch_gateway_label
  operation: replace-label
}

&local::patch_payment_node_position [visual::ProposedPatch] Persist payment task position #view-change
{
  patchType: view-delta
  status: accepted
  targetView: order_bpmn_after_visual_edit
  targetNode: local::collect_payment_task
  dx: 120
  dy: -20
}
@visual::patches:order_bpmn_after_visual_edit
{
  id: rel_patch_payment_position_view
  operation: update-view-delta
}
```
