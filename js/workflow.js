// @ts-check

/**
 * Renders an agentic workflow as an interactive SVG using elkjs layout
 * @param {HTMLElement} container - Container element for the SVG
 * @param {object} workflow - Workflow definition
 * @returns {Promise<object>} API for updating node states
 */
export async function renderWorkflow(container, workflow) {
  // @ts-ignore - CDN imports not recognized by TypeScript
  const ELK = await import("https://cdn.jsdelivr.net/npm/elkjs@0.9/lib/elk.bundled.js");
  const elk = new ELK.default();
  // @ts-ignore - CDN imports not recognized by TypeScript
  const d3 = await import("https://cdn.jsdelivr.net/npm/d3@7/+esm");

  // Build graph structure for elk
  const elkGraph = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "DOWN",
      "elk.spacing.nodeNode": "80",
      "elk.layered.spacing.nodeNodeBetweenLayers": "100",
    },
    children: workflow.nodes.map((node) => ({
      id: node.id,
      width: 180,
      height: 80,
      labels: [{ text: node.name }],
    })),
    edges: [],
  };

  // Build edges from next/parallel fields
  workflow.nodes.forEach((node) => {
    if (node.parallel) {
      // Parallel execution creates edges to each parallel node
      node.parallel.forEach((targetId) => {
        elkGraph.edges.push({
          id: `${node.id}->${targetId}`,
          sources: [node.id],
          targets: [targetId],
        });
      });
    } else if (typeof node.next === "string") {
      elkGraph.edges.push({
        id: `${node.id}->${node.next}`,
        sources: [node.id],
        targets: [node.next],
      });
    } else if (typeof node.next === "object" && node.next !== null) {
      // Conditional routing
      Object.keys(node.next).forEach((targetId) => {
        elkGraph.edges.push({
          id: `${node.id}->${targetId}`,
          sources: [node.id],
          targets: [targetId],
        });
      });
    }
  });

  // Run layout
  const layout = await elk.layout(elkGraph);

  // Create SVG
  const width = (layout.width || 800) + 100;
  const height = (layout.height || 600) + 100;

  const svg = d3
    .select(container)
    .html("") // Clear container
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", `0 0 ${width} ${height}`);

  // Add zoom/pan
  const g = svg.append("g").attr("transform", "translate(50, 50)");

  const zoom = d3.zoom().on("zoom", (event) => {
    g.attr("transform", event.transform);
  });
  svg.call(zoom);

  // State for each node
  const nodeStates = new Map();
  workflow.nodes.forEach((node) => {
    nodeStates.set(node.id, {
      state: "pending",
      output: null,
      outputLength: 0,
    });
  });

  // Color scheme for states
  const stateColors = {
    pending: "#e9ecef",
    running: "#ffc107",
    completed: "#28a745",
    failed: "#dc3545",
  };

  // Draw edges
  const edgeGroup = g.append("g").attr("class", "edges");
  layout.edges?.forEach((edge) => {
    const sourceNode = layout.children.find((n) => n.id === edge.sources[0]);
    const targetNode = layout.children.find((n) => n.id === edge.targets[0]);

    if (sourceNode && targetNode) {
      const sx = sourceNode.x + sourceNode.width / 2;
      const sy = sourceNode.y + sourceNode.height;
      const tx = targetNode.x + targetNode.width / 2;
      const ty = targetNode.y;

      // Draw curved path
      const midY = (sy + ty) / 2;
      const path = `M ${sx} ${sy} C ${sx} ${midY}, ${tx} ${midY}, ${tx} ${ty}`;

      edgeGroup
        .append("path")
        .attr("d", path)
        .attr("fill", "none")
        .attr("stroke", "#6c757d")
        .attr("stroke-width", 2)
        .attr("marker-end", "url(#arrowhead)");
    }
  });

  // Add arrowhead marker
  svg
    .append("defs")
    .append("marker")
    .attr("id", "arrowhead")
    .attr("markerWidth", 10)
    .attr("markerHeight", 10)
    .attr("refX", 9)
    .attr("refY", 3)
    .attr("orient", "auto")
    .append("polygon")
    .attr("points", "0 0, 10 3, 0 6")
    .attr("fill", "#6c757d");

  // Draw nodes
  const nodeGroup = g.append("g").attr("class", "nodes");

  const nodes = nodeGroup
    .selectAll("g.node")
    .data(layout.children)
    .join("g")
    .attr("class", "node")
    .attr("transform", (d) => `translate(${d.x}, ${d.y})`)
    .style("cursor", "pointer");

  // Node rectangles
  const rects = nodes
    .append("rect")
    .attr("width", (d) => d.width)
    .attr("height", (d) => d.height)
    .attr("rx", 8)
    .attr("fill", (d) => {
      const state = nodeStates.get(d.id);
      return stateColors[state.state];
    })
    .attr("stroke", "#495057")
    .attr("stroke-width", 2);

  // Node labels
  nodes
    .append("text")
    .attr("x", (d) => d.width / 2)
    .attr("y", (d) => d.height / 2 - 5)
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "middle")
    .style("font-family", "system-ui, -apple-system, sans-serif")
    .style("font-size", "14px")
    .style("font-weight", "500")
    .style("fill", "#212529")
    .text((d) => d.labels[0].text);

  // Output length indicator
  const outputText = nodes
    .append("text")
    .attr("x", (d) => d.width / 2)
    .attr("y", (d) => d.height / 2 + 15)
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "middle")
    .style("font-family", "monospace")
    .style("font-size", "11px")
    .style("fill", "#6c757d")
    .text("");

  // Click handler for node details
  nodes.on("click", function (event, d) {
    const node = workflow.nodes.find((n) => n.id === d.id);
    const state = nodeStates.get(d.id);
    showNodeDetails(node, state, event);
  });

  /**
   * Show node details in a modal/popup
   */
  function showNodeDetails(node, state, event) {
    // Remove existing popup
    d3.selectAll(".node-popup").remove();

    const popup = d3
      .select("body")
      .append("div")
      .attr("class", "node-popup modal fade show")
      .style("display", "block")
      .style("background", "rgba(0,0,0,0.5)");

    const dialog = popup
      .append("div")
      .attr("class", "modal-dialog modal-lg");

    const content = dialog.append("div").attr("class", "modal-content");

    const header = content.append("div").attr("class", "modal-header");
    header.append("h5").attr("class", "modal-title").text(node.name);
    header
      .append("button")
      .attr("type", "button")
      .attr("class", "btn-close")
      .on("click", () => popup.remove());

    const body = content.append("div").attr("class", "modal-body");

    // Node details
    body.append("p").html(`<strong>ID:</strong> ${node.id}`);
    body.append("p").html(`<strong>Type:</strong> ${node.type}`);
    body.append("p").html(`<strong>State:</strong> ${state.state}`);

    if (node.instructions) {
      body.append("h6").text("Instructions");
      body
        .append("pre")
        .style("background", "#f8f9fa")
        .style("padding", "10px")
        .style("border-radius", "4px")
        .style("white-space", "pre-wrap")
        .text(node.instructions);
    }

    if (node.human_prompt) {
      body.append("h6").text("Human Prompt");
      body
        .append("pre")
        .style("background", "#f8f9fa")
        .style("padding", "10px")
        .style("border-radius", "4px")
        .style("white-space", "pre-wrap")
        .text(node.human_prompt);
    }

    if (state.output) {
      body.append("h6").text("Output");
      body
        .append("pre")
        .style("background", "#f8f9fa")
        .style("padding", "10px")
        .style("border-radius", "4px")
        .style("max-height", "300px")
        .style("overflow-y", "auto")
        .style("white-space", "pre-wrap")
        .text(
          typeof state.output === "string"
            ? state.output
            : JSON.stringify(state.output, null, 2),
        );
    }

    // Close on backdrop click
    popup.on("click", function (event) {
      if (event.target === this) {
        popup.remove();
      }
    });
  }

  /**
   * Update a node's state and output
   * @param {string} nodeId - Node ID to update
   * @param {object} updates - { state?: string, output?: string }
   */
  function update(nodeId, updates) {
    const state = nodeStates.get(nodeId);
    if (!state) return;

    if (updates.state) {
      state.state = updates.state;
    }
    if (updates.output !== undefined) {
      state.output = updates.output;
      state.outputLength =
        typeof updates.output === "string"
          ? updates.output.length
          : JSON.stringify(updates.output).length;
    }

    // Update visual representation
    const nodeSelection = nodes.filter((d) => d.id === nodeId);

    nodeSelection.select("rect").attr("fill", stateColors[state.state]);

    nodeSelection.select("text:last-of-type").text(() => {
      if (state.outputLength > 0) {
        return `${state.outputLength} chars`;
      }
      return "";
    });
  }

  /**
   * Get current state of a node
   */
  function getState(nodeId) {
    return nodeStates.get(nodeId);
  }

  return {
    update,
    getState,
    container: svg.node(),
  };
}
