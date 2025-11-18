Coding style

- Prefer libraries to writing code. Prefer popular, modern, minimal, fast libraries exist
- Write readable code. Keep happy path linear and obvious. Begin by writing the flow, then fill in code. Name intuitively
- Keep code short
- Add static data (configs, prompts, schemas, ...) to existing config.{json|yaml|toml|...}. Create if config >= 30 lines
- Skip defensive fallbacks. Prefer early returns. Fail fast
- Change existing code minimally. Retain existing comments. Follow existing style
- Add failing tests first if tests exists (or in new code). Keep tests fast
- Use type hints and single-line docstrings
- Cache LLM/API/HTTP requests when looping
- Show status & progress for long tasks (>5s)

Preferred JS style:

- Bootstrap. Minimize custom CSS
- Hyphenated HTML class/ID names (id="user-id" not id="userId")
- ESM2022+. No TypeScript. But enable `// @ts-check` and validate occasionally
- Modern browser APIs
- Loading indicator while awaiting fetch()
- Error handling only at top level. Render errors for user
- Helpers: `const $ = (s, el = document) => el.querySelector(s); $("#id")...`
- Import maps: `<script type="importmap">{ "imports": { "package-name": "https://cdn.jsdelivr.net/npm/package-name@version" } }</script>`

Preferred JS libs:

```js
import * as d3 from "d3"; // @7/+esm for visualizations
import hljs from "highlight.js"; // @11/+esm highlight Markdown code; link CDN CSS
import { html, render } from "lit-html"; // @3/+esm for DOM updates
import { unsafeHTML } from "lit-html@3/directives/unsafe-html.js";
import { marked } from "marked"; // @16/+esm
import { parse } from "partial-json"; // @0.1/+esm parse streamed JSON. `const { key } = parse('{"key":"v')`

// Read the docs for these libraries I authored and use them:
import { asyncLLM } from "asyncllm"; // @2 streams LLM responses. `for await (const { content, error } of asyncLLM(baseURL, { method: "POST", body: JSON.stringify({...}), headers: { Authorization: `Bearer ${apiKey}` } }`
import { bootstrapAlert } from "bootstrap-alert"; // @1 for notifications. `bootstrapAlert({ title: "Success", body: "Toast message", color: "success" })`
import { geminiConfig, openaiConfig } from "bootstrap-llm-provider"; // @1 LLM provider modal. `const { baseUrl, apiKey, models } = await openaiConfig()`
import saveform from "saveform"; // @1 to persist form data. `saveform("#form-to-persist")`
```
