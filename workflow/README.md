# Workflow Visualization

Interactive visualization system for agentic workflows using elkjs and D3.js.

## Features

- **Automatic Layout**: Uses elkjs layered algorithm for clean, hierarchical workflow visualization
- **Interactive Nodes**: Click any node to view details (instructions, output, schema)
- **State Visualization**: Color-coded nodes show execution state:
  - Gray: Pending
  - Yellow: Running
  - Green: Completed
  - Red: Failed
- **Output Tracking**: Displays character count on nodes, full output in popup
- **Streaming Support**: API allows updating nodes progressively during execution
- **Workflow Types**: Handles linear chains, conditional routing, and parallel execution

## Usage

### Basic Usage

```javascript
import { renderWorkflow } from "../js/workflow.js";

// Load your workflow JSON
const workflow = await fetch("simple_chain.json").then((r) => r.json());

// Render to a container
const container = document.getElementById("workflow-container");
const api = await renderWorkflow(container, workflow);

// Update node states as workflow executes
api.update("node_id", {
  state: "running"
});

api.update("node_id", {
  state: "completed",
  output: { result: "Success" }
});
```

### API

**`renderWorkflow(container, workflow)`**

Renders a workflow visualization.

- `container` (HTMLElement): DOM element to render into
- `workflow` (Object): Workflow definition following the schema
- Returns: Promise<API>

**API Methods:**

- `update(nodeId, updates)`: Update node state and/or output
  - `nodeId` (string): Node identifier
  - `updates.state` (string): "pending" | "running" | "completed" | "failed"
  - `updates.output` (any): Node output (string or object)

- `getState(nodeId)`: Get current node state
  - Returns: `{ state, output, outputLength }`

## Demo

Open `workflow/index.html` in a browser to see the interactive demo with:
- 3 sample workflows (linear, conditional, parallel)
- Simulated execution with streaming output
- Interactive node details

## Sample Workflows

**simple_chain.json**: Document summarization
- Extract key points → Generate summary → Validate quality

**conditional_routing.json**: Content moderation
- Classify content → Route based on risk level → Human review or auto-approve

**parallel_execution.json**: Multi-perspective analysis
- Initial review → Parallel analysis (technical/business/risk) → Synthesize findings

## Testing

Run tests with vitest:

```bash
npm test
```

Tests cover:
- Workflow rendering
- State management
- Different routing types (simple, conditional, parallel)
- Output tracking
- Node interactivity

## Workflow Schema

Workflows follow the schema defined in `notes/workflow.md`:

```json
{
  "workflow": {
    "name": "workflow_name",
    "description": "Description",
    "version": "1.0"
  },
  "defaults": {
    "model": "claude-sonnet-4-20250514",
    "temperature": 0.3
  },
  "entry_point": "first_node",
  "nodes": [
    {
      "id": "node_id",
      "name": "Node Name",
      "type": "llm",
      "instructions": "Instructions for LLM",
      "output_schema": { ... },
      "next": "next_node_id"
    }
  ]
}
```

## Implementation Details

- **Layout Engine**: elkjs with layered algorithm
- **Rendering**: D3.js for SVG manipulation
- **Zoom/Pan**: Built-in D3 zoom behavior
- **Modal**: Bootstrap-styled popups for node details
- **CDN Imports**: All dependencies loaded from CDN (no build step)
