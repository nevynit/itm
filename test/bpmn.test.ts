import test from "node:test";
import assert from "node:assert/strict";

import {
  composeText,
  createStdIncludeProvider,
  exportBpmnXml,
  importBpmnXml,
  importBpmnXmlAsItm,
  listStdAssets,
  loadStdAsset,
  readStdAsset,
  validateBpmnRules
} from "../src/index";

test("std provider resolves bundled profile assets", async () => {
  const document = await composeText(
    `%metadata
{
  defaultNamespace: local
}

%include std:profiles/bpmn20-basic-profile.itm
%include std:profiles/archimate-basic-profile.itm
`,
    {
      includeProviders: [createStdIncludeProvider()]
    }
  );

  assert.deepEqual(
    document.includes?.map((include) => include.status),
    ["resolved", "resolved"]
  );
  assert.ok((document.entityTypes ?? []).some((type) => type.name === "bpmn::Process"));
  assert.ok((document.entityTypes ?? []).some((type) => type.name === "archimate::BusinessActor"));
  assert.ok(listStdAssets().some((asset) => asset.key === "profiles/bpmn20-basic-profile.itm"));
  assert.equal(readStdAsset("std:profiles/archimate-basic-profile.itm")?.relativePath, "examples/archimate/archimate-basic-profile.itm");
  assert.ok((await loadStdAsset("std:profiles/archimate-basic-profile.itm"))?.text.includes("ITM ArchiMate Basic Profile"));
});

test("BPMN runtime validates and round-trips a basic process model", async () => {
  const document = await composeText(
    `%metadata
{
  title: Example BPMN ITM model
  defaultNamespace: local
}

%namespace local https://example.org/local-model
%include std:profiles/bpmn20-basic-profile.itm

&order_process [bpmn::Process] Order handling
{
  id: Process_OrderHandling
  isExecutable: false
}
  &start [bpmn::StartEvent] Order received
  {
    id: Event_Start
  }
  @bpmn::sequenceFlow:local::receive_order
  {
    id: Flow_Start_ReceiveOrder
  }

  &receive_order [bpmn::UserTask] Receive order
  {
    id: Activity_ReceiveOrder
    owner: sales
  }
  @bpmn::sequenceFlow:local::end
  {
    id: Flow_ReceiveOrder_End
  }

  &end [bpmn::EndEvent] Order completed
  {
    id: Event_End
  }
`,
    {
      includeProviders: [createStdIncludeProvider()]
    }
  );

  const diagnostics = validateBpmnRules(document);
  const errors = diagnostics.filter((diagnostic) => diagnostic.severity === "error");
  const xml = exportBpmnXml(document);
  const imported = importBpmnXml(xml, { defaultNamespace: "imported" });

  assert.equal(errors.length, 0);
  assert.match(xml, /<bpmn:process id="Process_OrderHandling" name="Order handling"/u);
  assert.match(xml, /<bpmn:startEvent id="Event_Start" name="Order received"/u);
  assert.match(xml, /<bpmn:sequenceFlow id="Flow_Start_ReceiveOrder" sourceRef="Event_Start" targetRef="Activity_ReceiveOrder"/u);
  assert.equal(imported.entities.length, 4);
  assert.equal(imported.relationships.length, 2);
  assert.equal(imported.entities.find((entity) => entity.id === "Process_OrderHandling")?.typeRef, "bpmn::Process");
  assert.equal(imported.relationships[0]?.typeRef, "bpmn::sequenceFlow");
});

test("BPMN XML importer converts directly into serializable ITM text", async () => {
  const document = await composeText(
    `%metadata
{
  title: Example BPMN ITM model
  defaultNamespace: local
}

%namespace local https://example.org/local-model
%include std:profiles/bpmn20-basic-profile.itm

&order_process [bpmn::Process] Order handling
{
  id: Process_OrderHandling
}
  &start [bpmn::StartEvent] Order received
  {
    id: Event_Start
  }
  @bpmn::sequenceFlow:local::end
  {
    id: Flow_Start_End
  }

  &end [bpmn::EndEvent] Order completed
  {
    id: Event_End
  }
`,
    {
      includeProviders: [createStdIncludeProvider()]
    }
  );

  const xml = exportBpmnXml(document);
  const itm = importBpmnXmlAsItm(xml, { defaultNamespace: "imported" });

  assert.match(itm, /%metadata/u);
  assert.match(itm, /defaultNamespace: imported/u);
  assert.match(itm, /%namespace bpmn https:\/\/www\.omg\.org\/spec\/BPMN\/20100524\/MODEL/u);
  assert.match(itm, /&imported::Process_OrderHandling \[bpmn::Process\] Order handling/u);
  assert.match(itm, /@bpmn::sequenceFlow:imported::Event_End/u);
});

test("validateBpmnRules rejects cross-scope sequence flow and invalid start-event incoming flow", async () => {
  const document = await composeText(
    `%metadata
{
  defaultNamespace: local
}

%namespace local https://example.org/local-model
%include std:profiles/bpmn20-basic-profile.itm

&first_process [bpmn::Process] First process
{
  id: Process_First
}
  &start [bpmn::StartEvent] Start
  {
    id: Event_Start
  }

&second_process [bpmn::Process] Second process
{
  id: Process_Second
}
  &task [bpmn::UserTask] Handle
  {
    id: Activity_Handle
  }
  @bpmn::sequenceFlow:local::start
  {
    id: Flow_Invalid
  }
`,
    {
      includeProviders: [createStdIncludeProvider()]
    }
  );

  const diagnostics = validateBpmnRules(document);
  const messages = diagnostics.map((diagnostic) => diagnostic.message);

  assert.ok(messages.some((message) => message.includes("same process/subprocess/choreography scope")));
  assert.ok(messages.some((message) => message.includes("StartEvent must not have incoming sequenceFlow")));
});