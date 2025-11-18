// @ts-check
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderWorkflow } from "../js/workflow.js";
import ELK from "elkjs";
import * as d3 from "d3";

describe("renderWorkflow", () => {
  let container;
  let deps;

  beforeEach(() => {
    // Create a fresh container for each test
    container = document.createElement("div");
    document.body.appendChild(container);

    // Create ELK instance and provide as deps
    deps = {
      elk: new ELK(),
      d3: d3,
    };
  });

  afterEach(() => {
    // Clean up
    document.body.removeChild(container);
  });

  it("should render a simple workflow with nodes and edges", async () => {
    const workflow = {
      workflow: {
        name: "test_workflow",
        description: "Test workflow",
        version: "1.0",
      },
      defaults: {
        model: "test-model",
        temperature: 0.5,
      },
      entry_point: "node1",
      nodes: [
        {
          id: "node1",
          name: "Node 1",
          type: "llm",
          instructions: "Do something",
          output_schema: {
            type: "object",
            properties: { result: { type: "string" } },
          },
          next: "node2",
        },
        {
          id: "node2",
          name: "Node 2",
          type: "llm",
          instructions: "Do something else",
          output_schema: {
            type: "object",
            properties: { result: { type: "string" } },
          },
          next: null,
        },
      ],
    };

    const api = await renderWorkflow(container, workflow, deps);

    // Check that SVG was created
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();

    // Check that nodes were rendered
    const nodes = container.querySelectorAll("g.node");
    expect(nodes.length).toBe(2);

    // Check that API was returned
    expect(api).toHaveProperty("update");
    expect(api).toHaveProperty("getState");
    expect(api).toHaveProperty("container");
  });

  it("should handle parallel execution nodes", async () => {
    const workflow = {
      workflow: {
        name: "parallel_test",
        description: "Test parallel execution",
        version: "1.0",
      },
      defaults: { model: "test-model" },
      entry_point: "orchestrator",
      nodes: [
        {
          id: "orchestrator",
          name: "Orchestrator",
          type: "llm",
          parallel: ["worker1", "worker2"],
          collect: "all",
          next: "aggregator",
        },
        {
          id: "worker1",
          name: "Worker 1",
          type: "llm",
          instructions: "Work 1",
          output_schema: {
            type: "object",
            properties: { result: { type: "string" } },
          },
        },
        {
          id: "worker2",
          name: "Worker 2",
          type: "llm",
          instructions: "Work 2",
          output_schema: {
            type: "object",
            properties: { result: { type: "string" } },
          },
        },
        {
          id: "aggregator",
          name: "Aggregator",
          type: "llm",
          instructions: "Aggregate",
          output_schema: {
            type: "object",
            properties: { result: { type: "string" } },
          },
          next: null,
        },
      ],
    };

    const api = await renderWorkflow(container, workflow, deps);

    // Check that all nodes were rendered
    const nodes = container.querySelectorAll("g.node");
    expect(nodes.length).toBe(4);

    // Check that edges were created (orchestrator -> worker1, worker2)
    const edges = container.querySelectorAll("path");
    expect(edges.length).toBeGreaterThanOrEqual(2);
  });

  it("should handle conditional routing", async () => {
    const workflow = {
      workflow: {
        name: "conditional_test",
        description: "Test conditional routing",
        version: "1.0",
      },
      defaults: { model: "test-model" },
      entry_point: "router",
      nodes: [
        {
          id: "router",
          name: "Router",
          type: "llm",
          instructions: "Route",
          output_schema: {
            type: "object",
            properties: { path: { type: "string" } },
          },
          next: {
            path_a: "output.path == 'a'",
            path_b: "output.path == 'b'",
            default: "true",
          },
        },
        {
          id: "path_a",
          name: "Path A",
          type: "llm",
          instructions: "Handle A",
          output_schema: {
            type: "object",
            properties: { result: { type: "string" } },
          },
          next: null,
        },
        {
          id: "path_b",
          name: "Path B",
          type: "llm",
          instructions: "Handle B",
          output_schema: {
            type: "object",
            properties: { result: { type: "string" } },
          },
          next: null,
        },
        {
          id: "default",
          name: "Default",
          type: "llm",
          instructions: "Handle default",
          output_schema: {
            type: "object",
            properties: { result: { type: "string" } },
          },
          next: null,
        },
      ],
    };

    const api = await renderWorkflow(container, workflow, deps);

    // Check that all nodes were rendered
    const nodes = container.querySelectorAll("g.node");
    expect(nodes.length).toBe(4);

    // Check that multiple edges were created from router
    const edges = container.querySelectorAll("path");
    expect(edges.length).toBe(3);
  });

  it("should update node state correctly", async () => {
    const workflow = {
      workflow: {
        name: "state_test",
        description: "Test state updates",
        version: "1.0",
      },
      defaults: { model: "test-model" },
      entry_point: "node1",
      nodes: [
        {
          id: "node1",
          name: "Node 1",
          type: "llm",
          instructions: "Test",
          output_schema: {
            type: "object",
            properties: { result: { type: "string" } },
          },
          next: null,
        },
      ],
    };

    const api = await renderWorkflow(container, workflow, deps);

    // Initial state should be pending
    let state = api.getState("node1");
    expect(state.state).toBe("pending");
    expect(state.output).toBeNull();

    // Update to running
    api.update("node1", { state: "running" });
    state = api.getState("node1");
    expect(state.state).toBe("running");

    // Update with output
    const output = { result: "test result" };
    api.update("node1", { state: "completed", output });
    state = api.getState("node1");
    expect(state.state).toBe("completed");
    expect(state.output).toEqual(output);
    expect(state.outputLength).toBeGreaterThan(0);
  });

  it("should track output length correctly", async () => {
    const workflow = {
      workflow: {
        name: "output_test",
        description: "Test output tracking",
        version: "1.0",
      },
      defaults: { model: "test-model" },
      entry_point: "node1",
      nodes: [
        {
          id: "node1",
          name: "Node 1",
          type: "llm",
          instructions: "Test",
          output_schema: {
            type: "object",
            properties: { result: { type: "string" } },
          },
          next: null,
        },
      ],
    };

    const api = await renderWorkflow(container, workflow, deps);

    // Update with string output
    api.update("node1", { output: "Hello World" });
    let state = api.getState("node1");
    expect(state.outputLength).toBe(11);

    // Update with object output
    api.update("node1", { output: { key: "value" } });
    state = api.getState("node1");
    expect(state.outputLength).toBe(JSON.stringify({ key: "value" }).length);
  });

  it("should handle state transitions", async () => {
    const workflow = {
      workflow: {
        name: "transition_test",
        description: "Test state transitions",
        version: "1.0",
      },
      defaults: { model: "test-model" },
      entry_point: "node1",
      nodes: [
        {
          id: "node1",
          name: "Node 1",
          type: "llm",
          instructions: "Test",
          output_schema: {
            type: "object",
            properties: { result: { type: "string" } },
          },
          next: null,
        },
      ],
    };

    const api = await renderWorkflow(container, workflow, deps);

    // Test all state transitions
    const states = ["pending", "running", "completed", "failed"];
    for (const state of states) {
      api.update("node1", { state });
      expect(api.getState("node1").state).toBe(state);
    }
  });

  it("should create interactive nodes", async () => {
    const workflow = {
      workflow: {
        name: "interactive_test",
        description: "Test interactive nodes",
        version: "1.0",
      },
      defaults: { model: "test-model" },
      entry_point: "node1",
      nodes: [
        {
          id: "node1",
          name: "Node 1",
          type: "llm",
          instructions: "Click me",
          output_schema: {
            type: "object",
            properties: { result: { type: "string" } },
          },
          next: null,
        },
      ],
    };

    await renderWorkflow(container, workflow, deps);

    // Check that nodes are clickable
    const node = container.querySelector("g.node");
    expect(node).toBeTruthy();

    // Check cursor style
    const style = window.getComputedStyle(node);
    expect(style.cursor).toBe("pointer");
  });
});
