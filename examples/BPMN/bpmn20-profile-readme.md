# ITM BPMN 2.0 Profile Package

Files in this package:

- `bpmn20-basic-profile.itm` — reusable ITM profile package for BPMN 2.0/2.0.2 models.
- `bpmn20-profile-production-notes.md` — implementation notes for validators, exporters, layout, and production pipelines.

Typical model activation:

```itm
%include packages/bpmn20-basic-profile.itm
%using bpmn20_profile.types
%using bpmn20_profile.relationships
%using bpmn20_profile.rules
%using bpmn20_profile.styles
%using bpmn20_profile.viewpoints
```

Minimal process example:

```itm
&order_process [bpmn::Process] Order handling {isExecutable: false}
  &start [bpmn::StartEvent] Order received
  @bpmn::sequenceFlow:receive_order
  {
    id: flow_start_receive_order
  }

  &receive_order [bpmn::UserTask] Receive order {owner: sales}
  @bpmn::sequenceFlow:end
  {
    id: flow_receive_order_end
  }

  &end [bpmn::EndEvent] Order received
```
