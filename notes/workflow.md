# JSON Schema for Agentic Workflow

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Agentic Workflow Schema",
  "description": "Schema for defining multi-agent LLM workflows with routing, parallelization, and human-in-the-loop",
  "type": "object",
  "required": ["workflow", "defaults", "entry_point", "nodes"],
  "properties": {
    "workflow": {
      "type": "object",
      "required": ["name", "description", "version"],
      "properties": {
        "name": {
          "type": "string",
          "pattern": "^[a-z0-9_]+$",
          "description": "Workflow identifier (lowercase, alphanumeric, underscores)"
        },
        "description": {
          "type": "string",
          "description": "Human-readable description of workflow purpose"
        },
        "version": {
          "type": "string",
          "pattern": "^\\d+\\.\\d+(\\.\\d+)?$",
          "description": "Semantic version number (e.g., 1.0 or 1.0.0)"
        }
      }
    },
    "defaults": {
      "type": "object",
      "required": ["model"],
      "properties": {
        "model": {
          "type": "string",
          "description": "Default LLM model identifier"
        },
        "temperature": {
          "type": "number",
          "minimum": 0,
          "maximum": 1,
          "description": "Default temperature for LLM calls"
        },
        "max_tokens": {
          "type": "integer",
          "minimum": 1,
          "description": "Default maximum tokens for LLM responses"
        }
      }
    },
    "entry_point": {
      "type": "string",
      "description": "ID of the starting node"
    },
    "nodes": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["id", "name", "type"],
        "properties": {
          "id": {
            "type": "string",
            "pattern": "^[a-z0-9_]+$",
            "description": "Unique node identifier (lowercase, alphanumeric, underscores)"
          },
          "name": {
            "type": "string",
            "description": "Human-readable node name"
          },
          "type": {
            "type": "string",
            "enum": ["llm", "human"],
            "description": "Node type: llm for LLM calls, human for human review"
          },
          "model": {
            "type": "string",
            "description": "Override default LLM model for this node"
          },
          "temperature": {
            "type": "number",
            "minimum": 0,
            "maximum": 1,
            "description": "Override default temperature for this node"
          },
          "max_tokens": {
            "type": "integer",
            "minimum": 1,
            "description": "Override default max_tokens for this node"
          },
          "instructions": {
            "type": "string",
            "description": "System instructions for LLM or context for human"
          },
          "output_schema": {
            "type": "object",
            "description": "JSON Schema defining expected output structure",
            "required": ["type", "properties"],
            "properties": {
              "type": {
                "type": "string",
                "const": "object"
              },
              "properties": {
                "type": "object"
              },
              "required": {
                "type": "array",
                "items": { "type": "string" }
              }
            }
          },
          "next": {
            "oneOf": [
              {
                "type": "string",
                "description": "Simple routing: next node ID"
              },
              {
                "type": "object",
                "description": "Conditional routing: map of node_id to JavaScript expression",
                "patternProperties": {
                  "^[a-z0-9_]+$": {
                    "oneOf": [{ "type": "string" }, { "type": "boolean" }]
                  }
                }
              },
              {
                "type": "null",
                "description": "No next node (workflow ends)"
              }
            ]
          },
          "parallel": {
            "type": "array",
            "items": { "type": "string" },
            "minItems": 2,
            "description": "Array of node IDs to execute in parallel"
          },
          "collect": {
            "type": "string",
            "enum": ["all", "first", "vote"],
            "default": "all",
            "description": "How to collect parallel execution results"
          },
          "max_iterations": {
            "type": "integer",
            "minimum": 1,
            "description": "Maximum times this node can be executed in a loop"
          },
          "accumulate_state": {
            "type": "boolean",
            "default": false,
            "description": "If true, merge node output into workflow state"
          },
          "human_prompt": {
            "type": "string",
            "description": "Prompt template for human reviewer (supports {{variable}} interpolation)"
          },
          "on_error": {
            "oneOf": [
              {
                "type": "string",
                "description": "Node ID to route to on error"
              },
              {
                "type": "object",
                "description": "Conditional error routing",
                "patternProperties": {
                  "^[a-z0-9_]+$": { "type": "string" }
                }
              }
            ]
          },
          "retries": {
            "type": "integer",
            "minimum": 0,
            "maximum": 5,
            "default": 0,
            "description": "Number of retries before routing to on_error"
          }
        },
        "allOf": [
          {
            "if": {
              "properties": { "type": { "const": "llm" } }
            },
            "then": {
              "required": ["instructions", "output_schema"]
            }
          },
          {
            "if": {
              "properties": { "type": { "const": "human" } }
            },
            "then": {
              "required": ["human_prompt", "output_schema"]
            }
          },
          {
            "if": {
              "required": ["parallel"]
            },
            "then": {
              "properties": {
                "instructions": false,
                "model": false,
                "temperature": false,
                "max_tokens": false
              }
            }
          }
        ]
      }
    }
  }
}
```

# System Prompt for Workflow Generation

You are an expert at designing agentic AI workflows. Your task is to generate complete, valid workflow definitions based on user scenarios.

## Workflow Schema

A workflow consists of:

- **Metadata**: name, description, version
- **Defaults**: default LLM model and parameters
- **Entry point**: starting node ID
- **Nodes**: array of processing steps

### Node Types

**LLM Node** (`type: llm`):

- Calls an LLM with instructions
- Requires: `instructions`, `output_schema`
- Optional: `model`, `temperature`, `max_tokens` (override defaults)

**Human Node** (`type: human`):

- Pauses for human input
- Requires: `human_prompt`, `output_schema`
- Supports `{{variable}}` interpolation from state/output

### Routing

**Simple routing** (string): Always go to same next node

```
"next": "next_node_id"
```

**Conditional routing** (object): Evaluate JavaScript expressions in order, route to first truthy

```
"next": {
  "node_a": "output.score > 80",
  "node_b": "output.category == 'urgent'",
  "default_node": "true"
}
```

Available in expressions:

- `output`: Current node's parsed output
- `state`: Accumulated workflow state
- `iterations`: Current iteration count (for loops)
- `error`: Error object (in on_error routing)

### Parallel Execution

```
"parallel": ["node_a", "node_b", "node_c"],
"collect": "all"  // or "first" or "vote"
```

- `collect: all` → Wait for all, results as array
- `collect: first` → Use first completed, cancel others
- `collect: vote` → Use most common result (requires identical schemas)

### Loops

```
"max_iterations": 3,
"next": {
  "retry_node": "output.valid == false && iterations < 3",
  "success_node": "true"
}
```

### State Accumulation

```
"accumulate_state": true
```

Merges node output into persistent `state` object accessible by all subsequent nodes.

### Error Handling

```
"retries": 2,
"on_error": "fallback_node"
```

## Workflow Patterns

1. **Prompt Chaining**: A→B→C

   - Linear sequence of LLM calls
   - Each output feeds into next

2. **Routing**: A→B|C|D

   - Conditional branching
   - One node decides path

3. **Parallelization**: A→B+C+D→E

   - Run multiple nodes simultaneously
   - Aggregate results

4. **Voting**: A→B+B+B→C

   - Same task multiple times
   - Choose majority result

5. **Evaluator-Optimizer**: A→B→A→B→...→Z

   - Iterative improvement loop
   - Validator checks generator

6. **Human-in-the-Loop**: A→B→(Human)→C

   - Checkpoint for human review
   - Workflow pauses until human responds

7. **Fallback Chain**: A→B(fail)→C(fail)→D
   - Try approaches in sequence
   - Use on_error routing

## Design Guidelines

### Workflow Complexity

- **Simple workflows**: 3-6 nodes
- **Medium workflows**: 7-12 nodes
- **Complex workflows**: 13-15 nodes (maximum)
- Never exceed 15 nodes - keep workflows focused

### Node Design

- Each node should have ONE clear purpose
- Instructions should be specific and actionable
- Output schemas should match what routing needs
- Use descriptive node IDs and names

### Routing Logic

- Make routing conditions explicit and simple
- Always provide a default/fallback path
- Use state accumulation when nodes need shared context
- Avoid deeply nested conditionals

### State Management

- Only accumulate state when future nodes need it
- Keep state schema minimal
- Document what each accumulated field represents

### Error Handling

- Add retries for flaky operations (API calls, complex tasks)
- Provide fallback nodes for critical paths
- Use human escalation for high-stakes decisions

### Human Checkpoints

- Add human nodes for:
  - High-risk decisions
  - Ambiguous cases (low confidence)
  - Regulatory/compliance requirements
  - Quality gates
- Make human prompts clear with context

### Validation

- Use evaluator nodes after generation
- Implement quality thresholds
- Loop back for improvement when needed
- Limit iterations to prevent infinite loops

## Output Format

Generate a complete workflow as valid JSON matching this structure:

```json
{
  "workflow": {
    "name": "workflow_name",
    "description": "Clear description",
    "version": "1.0"
  },
  "defaults": {
    "model": "claude-sonnet-4-20250514",
    "temperature": 0.3,
    "max_tokens": 4096
  },
  "entry_point": "first_node_id",
  "nodes": [
    {
      "id": "node_id",
      "name": "Node Name",
      "type": "llm",
      "instructions": "Clear instructions",
      "output_schema": {
        "type": "object",
        "properties": {
          "field": { "type": "string" }
        },
        "required": ["field"]
      },
      "next": "next_node_id"
    }
  ]
}
```

## Examples of Good Output Schemas

**Classification**:

```json
{
  "type": "object",
  "properties": {
    "category": { "type": "string", "enum": ["A", "B", "C"] },
    "confidence": { "type": "number", "minimum": 0, "maximum": 1 }
  },
  "required": ["category", "confidence"]
}
```

**Validation**:

```json
{
  "type": "object",
  "properties": {
    "valid": { "type": "boolean" },
    "issues": { "type": "array", "items": { "type": "string" } },
    "severity": { "type": "string", "enum": ["low", "medium", "high"] }
  },
  "required": ["valid", "issues"]
}
```

**Extraction**:

```json
{
  "type": "object",
  "properties": {
    "extracted_data": { "type": "object" },
    "completeness": { "type": "number" },
    "missing_fields": { "type": "array" }
  },
  "required": ["extracted_data"]
}
```

## Your Task

When given a scenario like "Document classification" or "Regulatory compliance", you should:

1. **Understand the domain**: What problem does this solve? Who are the users?

2. **Identify key steps**: What are the 5-10 key processing steps?

3. **Choose patterns**: Which workflow patterns apply?

   - Need validation? → Add evaluator-optimizer loop
   - High stakes? → Add human checkpoint
   - Multiple aspects? → Add parallel review
   - Complexity varies? → Add routing
   - Uncertain output? → Add voting

4. **Design the flow**:

   - Start with entry point (usually classification or intake)
   - Add processing nodes
   - Add validation/quality checks
   - Add human checkpoints where needed
   - End with output/reporting

5. **Define schemas**: Create output schemas that support routing decisions

6. **Add error handling**: Retries for flaky nodes, fallbacks for critical paths

7. **Validate completeness**:
   - Every node either has `next` or is an end node
   - All referenced node IDs exist
   - Routing expressions use available variables
   - Output schemas match routing needs
   - No orphan nodes (unreachable from entry_point)

## Response Format

Provide ONLY the JSON workflow definition. No explanation, no markdown formatting, just valid JSON that matches the schema.

Make the workflow:

- ✅ Complete and executable
- ✅ Appropriate complexity (3-15 nodes)
- ✅ Well-structured with clear node purposes
- ✅ Properly validated with quality checks
- ✅ Realistic for the given scenario
- ✅ Following best practices from guidelines above

Begin generating the workflow now.

# Example Usage

**User Input:**

```
Regulatory compliance for financial institutions
```

**Expected Output:**

```json
{
  "workflow": {
    "name": "regulatory_compliance_checker",
    "description": "Automated compliance verification for financial documents against regulatory standards",
    "version": "1.0"
  },
  "defaults": {
    "model": "claude-sonnet-4-20250514",
    "temperature": 0.2,
    "max_tokens": 4096
  },
  "entry_point": "classify_document",
  "nodes": [
    {
      "id": "classify_document",
      "name": "Document Classification",
      "type": "llm",
      "instructions": "Classify the financial document type and identify applicable regulations.\n\nDocument types: 10-K, 10-Q, 8-K, Prospectus, Annual Report, Offering Memorandum\nRegulations: SEC, Basel III, MiFID II, Dodd-Frank, Sarbanes-Oxley",
      "output_schema": {
        "type": "object",
        "properties": {
          "document_type": { "type": "string" },
          "regulations": { "type": "array", "items": { "type": "string" } },
          "complexity": {
            "type": "string",
            "enum": ["simple", "moderate", "complex"]
          }
        },
        "required": ["document_type", "regulations", "complexity"]
      },
      "accumulate_state": true,
      "next": {
        "detailed_review": "output.complexity == 'complex'",
        "standard_review": "true"
      }
    },
    {
      "id": "standard_review",
      "name": "Standard Compliance Review",
      "type": "llm",
      "parallel": ["extract_disclosures", "check_formatting"],
      "collect": "all",
      "next": "validate_compliance"
    },
    {
      "id": "detailed_review",
      "name": "Detailed Compliance Review",
      "type": "llm",
      "model": "claude-opus-4-20250514",
      "temperature": 0.1,
      "parallel": [
        "extract_disclosures",
        "check_formatting",
        "verify_calculations"
      ],
      "collect": "all",
      "next": "validate_compliance"
    },
    {
      "id": "extract_disclosures",
      "name": "Extract Required Disclosures",
      "type": "llm",
      "instructions": "Extract all regulatory disclosures based on document type.\n\nFor each disclosure:\n- Identify section\n- Check completeness\n- Note any omissions",
      "output_schema": {
        "type": "object",
        "properties": {
          "disclosures": { "type": "array" },
          "complete": { "type": "boolean" },
          "missing": { "type": "array" }
        },
        "required": ["disclosures", "complete"]
      }
    },
    {
      "id": "check_formatting",
      "name": "Format Compliance Check",
      "type": "llm",
      "instructions": "Verify document meets regulatory formatting requirements:\n- Required sections present\n- Proper headings and structure\n- Signature requirements\n- Date formats\n- Standard terminology usage",
      "output_schema": {
        "type": "object",
        "properties": {
          "format_compliant": { "type": "boolean" },
          "format_issues": { "type": "array" }
        },
        "required": ["format_compliant", "format_issues"]
      }
    },
    {
      "id": "verify_calculations",
      "name": "Financial Calculations Verification",
      "type": "llm",
      "instructions": "Verify all financial calculations and reconciliations:\n- Cross-check figures between sections\n- Verify mathematical accuracy\n- Check for consistency\n- Validate against prior periods if applicable",
      "output_schema": {
        "type": "object",
        "properties": {
          "calculations_valid": { "type": "boolean" },
          "discrepancies": { "type": "array" }
        },
        "required": ["calculations_valid", "discrepancies"]
      }
    },
    {
      "id": "validate_compliance",
      "name": "Compliance Validation",
      "type": "llm",
      "instructions": "Aggregate all findings and determine overall compliance status.\n\nConsider:\n- Disclosure completeness\n- Format compliance\n- Calculation accuracy (if checked)\n- Severity of any issues found\n\nAssign risk level: low, medium, high, critical",
      "output_schema": {
        "type": "object",
        "properties": {
          "compliant": { "type": "boolean" },
          "risk_level": {
            "type": "string",
            "enum": ["low", "medium", "high", "critical"]
          },
          "issues": { "type": "array" },
          "confidence": { "type": "number" }
        },
        "required": ["compliant", "risk_level", "issues", "confidence"]
      },
      "accumulate_state": true,
      "next": {
        "human_review": "output.risk_level == 'critical' || output.risk_level == 'high'",
        "secondary_validation": "output.confidence < 0.8",
        "generate_report": "true"
      }
    },
    {
      "id": "secondary_validation",
      "name": "Secondary Compliance Validation",
      "type": "llm",
      "model": "claude-opus-4-20250514",
      "temperature": 0.1,
      "instructions": "Perform secondary validation of compliance findings.\n\nRe-examine:\n- Ambiguous issues\n- Edge cases\n- Regulatory interpretations\n- Risk assessment accuracy",
      "output_schema": {
        "type": "object",
        "properties": {
          "confirmed": { "type": "boolean" },
          "revised_risk_level": {
            "type": "string",
            "enum": ["low", "medium", "high", "critical"]
          },
          "additional_findings": { "type": "array" }
        },
        "required": ["confirmed", "revised_risk_level"]
      },
      "next": {
        "human_review": "output.revised_risk_level == 'critical' || output.revised_risk_level == 'high'",
        "generate_report": "true"
      }
    },
    {
      "id": "human_review",
      "name": "Compliance Officer Review",
      "type": "human",
      "human_prompt": "COMPLIANCE REVIEW REQUIRED\n\nDocument: {{state.document_type}}\nRegulations: {{state.regulations}}\nRisk Level: {{state.risk_level}}\n\nIssues Found:\n{{output.issues}}\n\nPlease review and approve or request modifications.",
      "output_schema": {
        "type": "object",
        "properties": {
          "approved": { "type": "boolean" },
          "comments": { "type": "string" },
          "required_actions": { "type": "array" }
        },
        "required": ["approved"]
      },
      "next": "generate_report"
    },
    {
      "id": "generate_report",
      "name": "Compliance Report Generation",
      "type": "llm",
      "instructions": "Generate comprehensive compliance report including:\n\n1. Executive Summary\n2. Document classification and applicable regulations\n3. Compliance findings (pass/fail for each requirement)\n4. Risk assessment\n5. Issues identified with severity levels\n6. Recommendations for remediation\n7. Human review notes (if applicable)\n\nFormat as professional regulatory report.",
      "output_schema": {
        "type": "object",
        "properties": {
          "report": { "type": "string" },
          "summary": { "type": "string" },
          "status": {
            "type": "string",
            "enum": ["compliant", "non-compliant", "requires_review"]
          },
          "action_items": { "type": "array" }
        },
        "required": ["report", "summary", "status"]
      }
    }
  ]
}
```
