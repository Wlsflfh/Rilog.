# Rilog ProseMirror Block Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Rilog's split Markdown textarea/preview authoring UI with a single ProseMirror WYSIWYG block editor while preserving existing Markdown storage, shortcuts, autocomplete, renderer behavior, and APIs.

**Architecture:** Keep the Spring Boot backend, hash-routed Vanilla JavaScript SPA, raw Markdown persistence, and shared detail renderer. Add a focused ProseMirror subsystem under `src/main/frontend/editor/`, bundle only its browser entry with esbuild, and expose a small `createBlockEditor()` interface to `app.js`. Parse stored Markdown into a schema-backed ProseMirror document, apply edits as transactions, and serialize the current document back to the existing Markdown API contract.

**Tech Stack:** Java 21, Spring Boot 3.3.5, Vanilla ES modules, Node.js 20+, ProseMirror core modules, prosemirror-tables, esbuild 0.28.1, jsdom 29.1.1, Node test runner.

## Global Constraints

- Do not modify the backend `/posts`, `/images`, CSRF, draft, summary, thumbnail, visibility, or `Post.content` contracts.
- Preserve the current uncommitted callout changes in `styles.css`, `markdown.js`, and `markdown.test.mjs`; integrate with them instead of reverting or replacing them.
- Preserve every currently working Markdown shortcut and autocomplete behavior listed in the approved design.
- Do not update the editable DOM by rerendering the entire document on each keystroke.
- Suppress input rules and Slash Command execution from `compositionstart` until `compositionend` so Korean IME input does not duplicate or misfire.
- Parse pasted HTML through the ProseMirror schema; reject scripts, event attributes, arbitrary styles, and unsafe link/image protocols.
- Continue storing Markdown strings and render published Markdown with the existing `renderMarkdown()` function.
- Keep Canvas posts and `canvas-editor.js` unchanged.
- Use CSS custom properties and existing `.markdown-body` typography; do not introduce a second design-token system.
- Commit the generated `src/main/resources/static/js/block-editor.bundle.js` so `./gradlew bootRun` remains sufficient to run the app.
- Run targeted tests after each task, then run the complete JavaScript and Gradle suites before completion.

## File Structure

### Create

- `package.json`: exact frontend dependencies and build/test scripts.
- `package-lock.json`: reproducible npm dependency graph.
- `src/main/frontend/editor/block-editor.js`: public editor lifecycle and form-facing interface.
- `src/main/frontend/editor/block-editor-schema.js`: nodes, marks, block IDs, safe parse rules.
- `src/main/frontend/editor/block-editor-markdown.js`: Markdown parser and serializer.
- `src/main/frontend/editor/block-editor-input-rules.js`: input rules, keymaps, auto-pairs, IME guard.
- `src/main/frontend/editor/block-editor-toolbar.js`: toolbar rendering and selection-safe commands.
- `src/main/frontend/editor/block-editor-slash-menu.js`: Slash Command plugin state, menu view, filtering and execution.
- `src/main/frontend/editor/block-editor-table.js`: table commands and contextual controls.
- `src/main/frontend/editor/block-editor-image.js`: image node view, upload and paste pipeline.
- `src/main/frontend/editor/block-editor-node-views.js`: toggle, callout, code and image node views.
- `src/main/resources/static/js/block-editor.bundle.js`: generated browser bundle imported by `app.js`.
- `src/test/js/block-editor-test-helpers.mjs`: jsdom globals and editor fixture helpers.
- `src/test/js/block-editor-schema.test.mjs`: schema and sanitization tests.
- `src/test/js/block-editor-markdown.test.mjs`: parser/serializer compatibility tests.
- `src/test/js/block-editor-input-rules.test.mjs`: shortcuts, autocomplete, history and IME tests.
- `src/test/js/block-editor-slash-menu.test.mjs`: command filtering and execution tests.
- `src/test/js/block-editor-image.test.mjs`: upload and paste tests.
- `src/test/js/block-editor-integration.test.mjs`: lifecycle, toolbar, form and DOM integration tests.

### Modify

- `src/main/resources/static/js/app.js`: replace textarea editor construction with `createBlockEditor()` while keeping draft/submit flows.
- `src/main/resources/static/js/markdown.js`: only compatibility additions required by serializer output; preserve current callout work.
- `src/main/resources/static/css/styles.css`: remove split-pane rules and add single editor, Slash menu and node-view styles; preserve current callout work.
- `src/test/js/markdown-editor.test.mjs`: retain legacy pure behavior tests until equivalent ProseMirror tests pass, then remove only textarea-only assertions.
- `src/test/js/markdown.test.mjs`: add renderer compatibility fixtures without disturbing current callout tests.
- `README.md`: document Node requirement, install/build/test commands, and WYSIWYG behavior.
- `DESIGN.md`: replace the obsolete WYSIWYG non-goal and raw Markdown split-preview tradeoff with the approved editor contract.

---

### Task 1: Reproducible ProseMirror Build and Test Foundation

**Files:**
- Create: `package.json`
- Create: `package-lock.json`
- Create: `src/main/frontend/editor/block-editor.js`
- Create: `src/test/js/block-editor-test-helpers.mjs`
- Create: `src/test/js/block-editor-integration.test.mjs`
- Create: `src/main/resources/static/js/block-editor.bundle.js`
- Modify: `.gitignore`

**Interfaces:**
- Produces: `createBlockEditor({mount, initialMarkdown, uploadImage, onChange}) -> BlockEditorHandle`
- Produces: `BlockEditorHandle = {getMarkdown(): string, focus(): void, destroy(): void}`
- Produces: `installDom() -> () => void` and `createEditorMount() -> HTMLElement` for tests.

- [ ] **Step 1: Add a failing public-interface test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import {installDom, createEditorMount} from "./block-editor-test-helpers.mjs";
import {createBlockEditor} from "../../main/frontend/editor/block-editor.js";

test("createBlockEditor exposes Markdown, focus and destroy lifecycle", () => {
    const cleanup = installDom();
    const mount = createEditorMount();
    const editor = createBlockEditor({mount, initialMarkdown: "Hello", uploadImage: async () => ({url: "/uploads/a.png"}), onChange() {}});
    assert.equal(editor.getMarkdown(), "Hello\n");
    assert.equal(typeof editor.focus, "function");
    assert.equal(typeof editor.destroy, "function");
    editor.destroy();
    cleanup();
});
```

- [ ] **Step 2: Run the test and verify the missing module failure**

Run: `node --test src/test/js/block-editor-integration.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `block-editor.js` or `block-editor-test-helpers.mjs`.

- [ ] **Step 3: Add exact dependencies and scripts**

Create `package.json` with `private: true`, `type: module`, Node `>=20`, and these exact packages:

```json
{
  "name": "rilog-editor",
  "private": true,
  "type": "module",
  "engines": {"node": ">=20"},
  "scripts": {
    "build:editor": "esbuild src/main/frontend/editor/block-editor.js --bundle --format=esm --platform=browser --target=es2022 --outfile=src/main/resources/static/js/block-editor.bundle.js",
    "test:js": "node --test src/test/js/*.test.mjs",
    "verify:editor": "npm run build:editor && npm run test:js"
  },
  "dependencies": {
    "prosemirror-commands": "1.7.1",
    "prosemirror-history": "1.5.0",
    "prosemirror-inputrules": "1.5.1",
    "prosemirror-keymap": "1.2.3",
    "prosemirror-markdown": "1.13.5",
    "prosemirror-model": "1.25.9",
    "prosemirror-schema-basic": "1.2.4",
    "prosemirror-schema-list": "1.5.1",
    "prosemirror-state": "1.4.4",
    "prosemirror-tables": "1.8.5",
    "prosemirror-view": "1.42.1"
  },
  "devDependencies": {
    "esbuild": "0.28.1",
    "jsdom": "29.1.1"
  }
}
```

Run `npm install --package-lock-only` followed by `npm install`. Add only `node_modules/` to `.gitignore`; do not ignore the generated bundle.

- [ ] **Step 4: Implement the minimal lifecycle and DOM helper**

Use `JSDOM` in the helper to assign `window`, `document`, `Node`, `MutationObserver`, `getSelection`, and `navigator` to `globalThis`, returning a cleanup function that restores previous values.

Implement `createBlockEditor()` with a temporary paragraph-only schema and `EditorView`. The `dispatchTransaction` handler must call `view.updateState(nextState)` and `onChange(getMarkdown())`; `destroy()` must call `view.destroy()`.

- [ ] **Step 5: Build and run the focused test**

Run: `npm run build:editor && node --test src/test/js/block-editor-integration.test.mjs`

Expected: PASS and `src/main/resources/static/js/block-editor.bundle.js` exists as an ES module bundle.

- [ ] **Step 6: Commit the foundation**

```bash
git add package.json package-lock.json .gitignore src/main/frontend/editor/block-editor.js src/main/resources/static/js/block-editor.bundle.js src/test/js/block-editor-test-helpers.mjs src/test/js/block-editor-integration.test.mjs
git commit -m "build: add ProseMirror editor foundation"
```

### Task 2: Rilog Document Schema and Safe DOM Parsing

**Files:**
- Create: `src/main/frontend/editor/block-editor-schema.js`
- Create: `src/test/js/block-editor-schema.test.mjs`
- Modify: `src/main/frontend/editor/block-editor.js`

**Interfaces:**
- Produces: `rilogSchema: Schema`
- Produces: `createBlockId() -> string`
- Produces: `ensureBlockIds(doc: Node) -> Node`
- Produces: `safeUrl(value: string, {image?: boolean}) -> string | null`
- Consumes: `rilogSchema` in every later editor task.

- [ ] **Step 1: Write failing schema and sanitization tests**

Test that `rilogSchema.nodes` contains every approved node; `rilogSchema.marks` contains `strong`, `em`, `underline`, `strike`, `code`, `link`, and `text_color`; inserted paragraphs receive non-empty IDs; and these inputs are rejected:

```js
assert.equal(safeUrl("javascript:alert(1)"), null);
assert.equal(safeUrl("data:text/html,<script>alert(1)</script>"), null);
assert.equal(safeUrl("/uploads/a.png", {image: true}), "/uploads/a.png");
assert.equal(safeUrl("https://example.com/a.png", {image: true}), "https://example.com/a.png");
```

Parse `<p onclick="alert(1)"><script>x</script><span style="position:fixed;color:#e5484d">safe</span></p>` through `DOMParser.fromSchema(rilogSchema)` and assert no script node, event attribute, or arbitrary style survives while `#e5484d` becomes a `text_color` mark.

- [ ] **Step 2: Run the schema test and verify failure**

Run: `node --test src/test/js/block-editor-schema.test.mjs`

Expected: FAIL because `block-editor-schema.js` does not exist.

- [ ] **Step 3: Define the schema with explicit content expressions**

Use `Schema` from `prosemirror-model`, list helpers from `prosemirror-schema-list`, and table specs from `prosemirror-tables`. Define:

```js
doc: {content: "block+"}
paragraph: {group: "block", content: "inline*", attrs: {id: {default: null}}}
heading: {group: "block", content: "inline*", attrs: {id: {default: null}, level: {default: 1}}}
toggle: {group: "block", content: "toggle_summary block+", attrs: {id: {default: null}, open: {default: true}}}
toggle_summary: {content: "inline*"}
callout: {group: "block", content: "block+", attrs: {id: {default: null}, kind: {default: "note"}, icon: {default: "✎"}, title: {default: "안내"}}}
image: {group: "block", atom: true, draggable: true, attrs: {id: {default: null}, src: {}, alt: {default: ""}, status: {default: "ready"}, error: {default: null}}}
```

Add H1-H6 parse rules, `<details>/<summary>`, `.markdown-callout`, fenced code metadata, table nodes, and safe `img`/`a` attribute readers. Only accept text colors matching `/^#[0-9a-fA-F]{6}$/`.

- [ ] **Step 4: Add deterministic ID normalization**

Implement `ensureBlockIds()` as a document traversal that replaces only block nodes with missing IDs using `crypto.randomUUID()` when available and `block-${Date.now()}-${counter}` otherwise. Do not regenerate existing IDs.

- [ ] **Step 5: Run schema and existing renderer tests**

Run: `node --test src/test/js/block-editor-schema.test.mjs src/test/js/markdown.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit the schema**

```bash
git add src/main/frontend/editor/block-editor-schema.js src/main/frontend/editor/block-editor.js src/test/js/block-editor-schema.test.mjs
git commit -m "feat: define Rilog block editor schema"
```

### Task 3: Markdown Parser and Serializer Compatibility

**Files:**
- Create: `src/main/frontend/editor/block-editor-markdown.js`
- Create: `src/test/js/block-editor-markdown.test.mjs`
- Modify: `src/main/frontend/editor/block-editor.js`
- Modify: `src/main/resources/static/js/markdown.js`
- Modify: `src/test/js/markdown.test.mjs`

**Interfaces:**
- Produces: `parseMarkdown(source: string) -> ProseMirrorNode`
- Produces: `serializeMarkdown(doc: ProseMirrorNode) -> string`
- Produces: `normalizeMarkdown(source: string) -> string`
- Consumes: `rilogSchema`, `ensureBlockIds`, and the current renderer's callout/details syntax.

- [ ] **Step 1: Write failing round-trip fixtures**

Create table-driven cases for paragraph, H1-H6, unordered and ordered lists, nested lists, quote, divider, inline code, fenced code with language, table, single image, consecutive images, details toggle, and current callout syntax.

```js
const source = [
    "## 제목",
    "",
    "> [!warning] 주의",
    "> 조심하세요",
    "",
    "<details>",
    "<summary>더 보기</summary>",
    "",
    "- 내부 항목",
    "",
    "</details>"
].join("\n");

const parsed = parseMarkdown(source);
assert.equal(parseMarkdown(serializeMarkdown(parsed)).eq(parsed), true);
```

Also assert that unknown inline HTML becomes text rather than disappearing.

- [ ] **Step 2: Run the Markdown editor test and verify failure**

Run: `node --test src/test/js/block-editor-markdown.test.mjs`

Expected: FAIL because parser and serializer exports are absent.

- [ ] **Step 3: Implement standard Markdown conversion**

Build a `MarkdownParser` token mapping and `MarkdownSerializer` node/mark mapping from `prosemirror-markdown`. Reuse CommonMark rules where semantics match; add custom handling for underline, text color, table, image block, toggle, and callout.

Serializer requirements:

```js
heading -> `${"#".repeat(level)} ${content}`
callout -> `> [!${kind}] ${title}` followed by each serialized body line prefixed with `> `
toggle -> `<details>\n<summary>${summary}</summary>\n\n${body}\n\n</details>`
image -> `![${escapedAlt}](${safeSrc})`
```

Keep consecutive images adjacent with one newline so the existing image-grid renderer continues grouping them.

- [ ] **Step 4: Wire lifecycle Markdown access**

Update `createBlockEditor()` to initialize with `parseMarkdown(initialMarkdown)` and make `getMarkdown()` call `serializeMarkdown(view.state.doc)`. Make `onChange()` receive the same serialized value.

- [ ] **Step 5: Run compatibility tests**

Run: `node --test src/test/js/block-editor-markdown.test.mjs src/test/js/markdown.test.mjs`

Expected: PASS, including the user's current callout tests.

- [ ] **Step 6: Commit the conversion boundary**

```bash
git add src/main/frontend/editor/block-editor-markdown.js src/main/frontend/editor/block-editor.js src/main/resources/static/js/markdown.js src/test/js/block-editor-markdown.test.mjs src/test/js/markdown.test.mjs
git commit -m "feat: add block editor Markdown round trip"
```

### Task 4: Existing Shortcuts, Input Rules, Auto-Pairs, History, and IME

**Files:**
- Create: `src/main/frontend/editor/block-editor-input-rules.js`
- Create: `src/test/js/block-editor-input-rules.test.mjs`
- Modify: `src/main/frontend/editor/block-editor.js`
- Modify: `src/test/js/markdown-editor.test.mjs`

**Interfaces:**
- Produces: `createInputPlugins({isComposing}) -> Plugin[]`
- Produces: `createRilogKeymap() -> Record<string, Command>`
- Produces: `createAutoPairPlugin() -> Plugin`
- Produces: `setBlockTypeAndRemoveTrigger(state, dispatch, type, attrs, range) -> boolean`

- [ ] **Step 1: Write failing command and input-rule tests**

Build editor-state fixtures that type the exact triggers and assert resulting node types and visible text. Cover `#` through `######`, `-`, `*`, `1.`, `>`, `---` + Enter, one backtick, and three backticks.

Add command assertions for Mod-B/I/U/E/K, Mod-Shift-X/7/8/9, Mod-Alt-1 through Mod-Alt-6, Tab/Shift-Tab, list Enter, empty-list Enter, and Backspace from empty heading/list/quote.

For IME, set `isComposing()` to true, apply `# ` and `/co`, and assert the paragraph text remains literal and neither input rule nor Slash state changes.

- [ ] **Step 2: Run the input test and verify failure**

Run: `node --test src/test/js/block-editor-input-rules.test.mjs`

Expected: FAIL because the plugin exports are absent.

- [ ] **Step 3: Implement history and command mappings**

Compose `history()`, `keymap(historyKeymap)`, `keymap(baseKeymap)`, list commands, `toggleMark`, `setBlockType`, `wrapIn`, `lift`, and `splitListItem`. Preserve link selection by opening the existing prompt/callback boundary rather than losing the selection.

Code-block Tab must insert four spaces. Outside code, Tab/Shift-Tab must sink/lift list items and otherwise return `false` so browser focus behavior remains accessible.

- [ ] **Step 4: Implement input rules and auto-pairs**

Use `InputRule`, `textblockTypeInputRule`, and `wrappingInputRule`. Every handler must first check `isComposing()` and return `null` during composition. Divider handling must replace the `---` paragraph with `horizontal_rule` and append/select a paragraph.

Implement auto-pairs for backtick, parentheses, brackets, braces, single and double quotes; skip an existing closer and delete an empty pair together. Three backticks at a block start must replace the literal trigger with a code block.

- [ ] **Step 5: Retire only replaced textarea assertions**

Keep `markdown-editor.test.mjs` passing during the transition. Remove an old test only when the new ProseMirror test proves the same user-visible result. Preserve table helper tests until Task 7 replaces their behavior.

- [ ] **Step 6: Run new and legacy shortcut suites**

Run: `node --test src/test/js/block-editor-input-rules.test.mjs src/test/js/markdown-editor.test.mjs`

Expected: PASS.

- [ ] **Step 7: Commit input compatibility**

```bash
git add src/main/frontend/editor/block-editor-input-rules.js src/main/frontend/editor/block-editor.js src/test/js/block-editor-input-rules.test.mjs src/test/js/markdown-editor.test.mjs
git commit -m "feat: preserve Markdown editor input behavior"
```

### Task 5: Single Editor Integration and Selection-Safe Toolbar

**Files:**
- Create: `src/main/frontend/editor/block-editor-toolbar.js`
- Modify: `src/main/frontend/editor/block-editor.js`
- Modify: `src/main/resources/static/js/app.js:1188-1488`
- Modify: `src/test/js/block-editor-integration.test.mjs`

**Interfaces:**
- Produces: `createEditorToolbar({view, commands}) -> HTMLElement`
- Produces: `captureSelection(view) -> SelectionBookmark`
- Produces: `runWithSelection(view, bookmark, command) -> boolean`
- Consumes: `createBlockEditor()` from Task 1 and editor commands from Task 4.

- [ ] **Step 1: Write failing toolbar and lifecycle integration tests**

Assert that:

1. The editor mount has exactly one `.ProseMirror` editable surface.
2. No `textarea`, `.markdown-writing`, `.markdown-preview`, `작성`, `미리보기`, or `Markdown` label exists.
3. A selected word remains selected and becomes strong after dispatching toolbar `mousedown` then `click`.
4. `destroy()` removes document-level handlers.
5. `onChange` receives serialized Markdown after a transaction.

- [ ] **Step 2: Run the integration test and verify failure**

Run: `node --test src/test/js/block-editor-integration.test.mjs`

Expected: FAIL on the old split editor or missing toolbar module.

- [ ] **Step 3: Implement the retained toolbar**

Render only heading 1-6, bold, italic, underline, strike, inline code, quote, link, and text colors. Omit toggle, table, image, fenced-code, and other Slash-duplicated insertion buttons.

On toolbar `mousedown`, call `preventDefault()` and store `view.state.selection.getBookmark()`. On command execution, resolve the bookmark against the current document, dispatch that selection, run the command, and call `view.focus()`.

- [ ] **Step 4: Replace the Markdown field in `app.js`**

Import `createBlockEditor` from `/js/block-editor.bundle.js`. Replace `createMarkdownEditor(textarea)` with:

```js
function createMarkdownField(initialMarkdown, onChange, error) {
    const mount = element("div", "block-editor-mount");
    const editor = createBlockEditor({mount, initialMarkdown, uploadImage, onChange});
    return {field, editor};
}
```

In `renderEditor`, track `let markdownContent = post?.content || draft?.content || ""`. Draft and submit read `editor.getMarkdown()`; validation focuses `editor.focus()`. Keep Canvas branching unchanged and destroy an editor instance before replacing the route.

- [ ] **Step 5: Build and run integration tests**

Run: `npm run build:editor && node --test src/test/js/block-editor-integration.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit the single-editor integration**

```bash
git add src/main/frontend/editor/block-editor-toolbar.js src/main/frontend/editor/block-editor.js src/main/resources/static/js/block-editor.bundle.js src/main/resources/static/js/app.js src/test/js/block-editor-integration.test.mjs
git commit -m "feat: integrate single block editor surface"
```

### Task 6: Slash Command Plugin and Code Block Command

**Files:**
- Create: `src/main/frontend/editor/block-editor-slash-menu.js`
- Create: `src/test/js/block-editor-slash-menu.test.mjs`
- Modify: `src/main/frontend/editor/block-editor.js`

**Interfaces:**
- Produces: `slashCommandPlugin({commands, isComposing}) -> Plugin`
- Produces: `filterSlashCommands(query: string, commands: SlashCommand[]) -> SlashCommand[]`
- Produces: `SlashCommand = {id, label, description, icon, keywords, run(view, range): boolean}`
- Produces: `createCodeBlockCommand() -> SlashCommand`

- [ ] **Step 1: Write failing Slash behavior tests**

Test `/`, `/ta`, `/co`, and Korean `표` filtering; mid-sentence and URL slash rejection; ArrowUp/ArrowDown cycling; Enter selection; Esc closing; click selection; outside click closing; empty result message; command range removal; cursor placement inside the created code block; and composition suppression.

```js
assert.deepEqual(filterSlashCommands("co", commands).map(item => item.id), ["code", "callout"]);
assert.deepEqual(filterSlashCommands("이미지", commands).map(item => item.id), ["image"]);
```

- [ ] **Step 2: Run the Slash test and verify failure**

Run: `node --test src/test/js/block-editor-slash-menu.test.mjs`

Expected: FAIL because the plugin does not exist.

- [ ] **Step 3: Implement plugin state and menu view**

Store `{active, from, to, query, selectedIndex}` in a `PluginKey` state field. Open only when the current textblock content before the cursor matches `/^\/[^\s/]*$/`. Use `view.coordsAtPos(to)` for placement and clamp left/top to an 8px viewport margin after measuring menu width/height.

Render every item with icon, Korean label, `/command`, and description. Render `검색 결과가 없습니다.` when filtered results are empty. Attach and remove the outside-pointer listener in the plugin view lifecycle.

- [ ] **Step 4: Implement `/code` and register all command metadata**

Create a code block at the command paragraph, remove the `/code` range in the same transaction, and set `TextSelection.near()` inside it. Register metadata for toggle, callout, table, image, and code even before later commands are implemented; disabled commands must not appear until their task lands.

- [ ] **Step 5: Run Slash and input suites**

Run: `node --test src/test/js/block-editor-slash-menu.test.mjs src/test/js/block-editor-input-rules.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit Slash commands**

```bash
git add src/main/frontend/editor/block-editor-slash-menu.js src/main/frontend/editor/block-editor.js src/test/js/block-editor-slash-menu.test.mjs
git commit -m "feat: add block editor slash commands"
```

### Task 7: Editable Tables and Contextual Controls

**Files:**
- Create: `src/main/frontend/editor/block-editor-table.js`
- Modify: `src/main/frontend/editor/block-editor.js`
- Modify: `src/main/frontend/editor/block-editor-slash-menu.js`
- Modify: `src/test/js/block-editor-slash-menu.test.mjs`
- Modify: `src/test/js/block-editor-integration.test.mjs`
- Modify: `src/test/js/markdown-editor.test.mjs`

**Interfaces:**
- Produces: `createTablePlugins() -> Plugin[]`
- Produces: `insertDefaultTable(state, dispatch) -> boolean`
- Produces: `createTableControls(view) -> HTMLElement`
- Consumes: `tableNodes`, `tableEditing`, `columnResizing`, `goToNextCell`, `addRowAfter`, `addColumnAfter`.

- [ ] **Step 1: Write failing table command tests**

Assert `/table` replaces its command paragraph with a 2-column, 2-row table, the first row uses `table_header`, and selection lands in the first header cell. Assert Tab/Shift-Tab cell movement, Tab from the last cell adds a row, and contextual `+ 행`/`+ 열` controls call the corresponding command without losing selection.

- [ ] **Step 2: Run focused table tests and verify failure**

Run: `node --test --test-name-pattern="table|표" src/test/js/block-editor-slash-menu.test.mjs src/test/js/block-editor-integration.test.mjs`

Expected: FAIL because `/table` is not enabled.

- [ ] **Step 3: Implement table insertion and editing plugins**

Construct the table with schema nodes rather than HTML strings. Register `tableEditing()` and `columnResizing()`. Bind Tab and Shift-Tab to `goToNextCell`; when forward movement from the last cell fails, call `addRowAfter` and move into the new row.

- [ ] **Step 4: Implement selection-scoped controls**

Show controls only when `$from` resolves inside a table. Position them relative to the table DOM and update after transactions or scroll. Use selection bookmarks around button interaction just like the toolbar.

- [ ] **Step 5: Replace legacy table behavior coverage**

Keep pure Markdown table parser/renderer tests. Remove textarea overlay-only tests after the ProseMirror table insertion, navigation and Markdown round-trip tests pass.

- [ ] **Step 6: Run table, Markdown and legacy suites**

Run: `node --test src/test/js/block-editor-slash-menu.test.mjs src/test/js/block-editor-integration.test.mjs src/test/js/block-editor-markdown.test.mjs src/test/js/markdown-editor.test.mjs`

Expected: PASS.

- [ ] **Step 7: Commit tables**

```bash
git add src/main/frontend/editor/block-editor-table.js src/main/frontend/editor/block-editor.js src/main/frontend/editor/block-editor-slash-menu.js src/test/js/block-editor-slash-menu.test.mjs src/test/js/block-editor-integration.test.mjs src/test/js/markdown-editor.test.mjs
git commit -m "feat: add WYSIWYG table editing"
```

### Task 8: Toggle and Callout Node Views

**Files:**
- Create: `src/main/frontend/editor/block-editor-node-views.js`
- Modify: `src/main/frontend/editor/block-editor.js`
- Modify: `src/main/frontend/editor/block-editor-slash-menu.js`
- Modify: `src/main/frontend/editor/block-editor-markdown.js`
- Modify: `src/test/js/block-editor-slash-menu.test.mjs`
- Modify: `src/test/js/block-editor-markdown.test.mjs`
- Modify: `src/main/resources/static/js/markdown.js`
- Modify: `src/test/js/markdown.test.mjs`

**Interfaces:**
- Produces: `createNodeViews({uploadImage}) -> Record<string, NodeViewConstructor>`
- Produces: `insertToggle(state, dispatch) -> boolean`
- Produces: `insertCallout(state, dispatch, attrs?) -> boolean`
- Consumes: existing details and Obsidian-callout renderer syntax.

- [ ] **Step 1: Write failing node-view and round-trip tests**

Assert `/toggle` creates `toggle(toggle_summary("토글 제목"), paragraph(""))`, selection lands in the summary, the disclosure button changes only the `open` attribute, and nested paragraph/list/code content remains editable.

Assert `/callout` creates a note callout with icon `✎`, title `안내`, a content paragraph, and serialization exactly matches:

```md
> [!note] 안내
> 내용
```

- [ ] **Step 2: Run toggle/callout tests and verify failure**

Run: `node --test --test-name-pattern="toggle|callout|토글|콜아웃" src/test/js/block-editor-slash-menu.test.mjs src/test/js/block-editor-markdown.test.mjs src/test/js/markdown.test.mjs`

Expected: FAIL because commands and node views are not active.

- [ ] **Step 3: Implement semantic node views**

Toggle NodeView must create `<details class="markdown-toggle">` and use that same element as its single `contentDOM`. The schema-owned first child `toggle_summary` renders as `<summary class="markdown-toggle-summary">`; remaining schema-owned children render after it. Handle the native `toggle` event by dispatching `setNodeMarkup` for the `open` attribute, and never manually add, remove, or reorder ProseMirror-owned child DOM.

Callout NodeView must create `<aside class="markdown-callout markdown-callout-${kind}">` with non-editable icon/title controls and one editable content DOM. Attribute changes must dispatch `setNodeMarkup` transactions.

- [ ] **Step 4: Enable commands and renderer compatibility**

Enable `/toggle` and `/callout` only after their commands pass. Reuse current callout parsing/rendering in `markdown.js`; add only missing details/callout compatibility proven by failing fixtures. Do not rewrite the user's current callout implementation.

- [ ] **Step 5: Run node, Markdown and renderer tests**

Run: `node --test src/test/js/block-editor-slash-menu.test.mjs src/test/js/block-editor-markdown.test.mjs src/test/js/markdown.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit special blocks**

```bash
git add src/main/frontend/editor/block-editor-node-views.js src/main/frontend/editor/block-editor.js src/main/frontend/editor/block-editor-slash-menu.js src/main/frontend/editor/block-editor-markdown.js src/main/resources/static/js/markdown.js src/test/js/block-editor-slash-menu.test.mjs src/test/js/block-editor-markdown.test.mjs src/test/js/markdown.test.mjs
git commit -m "feat: add editable toggle and callout blocks"
```

### Task 9: Image Upload, Paste, Alt Text, and Error Recovery

**Files:**
- Create: `src/main/frontend/editor/block-editor-image.js`
- Create: `src/test/js/block-editor-image.test.mjs`
- Modify: `src/main/frontend/editor/block-editor.js`
- Modify: `src/main/frontend/editor/block-editor-node-views.js`
- Modify: `src/main/frontend/editor/block-editor-slash-menu.js`
- Modify: `src/test/js/block-editor-markdown.test.mjs`

**Interfaces:**
- Produces: `createImagePlugin({uploadImage, isComposing}) -> Plugin`
- Produces: `uploadAndInsertImages(view, files: File[]) -> Promise<void>`
- Produces: `insertUploadingImage(view, file, position) -> string` returning block ID.
- Consumes: existing `uploadImage(file) -> Promise<{url: string}>` from `api.js`.

- [ ] **Step 1: Write failing success, multi-image and failure tests**

Use deferred upload promises to assert an uploading node appears immediately, success changes it to `{status: "ready", src: result.url}`, failure changes only that node to `{status: "error", error: message}`, retry invokes the same file again, and delete removes the failed node.

Paste three `image/*` files and assert three adjacent image nodes preserve file order even when upload promises resolve out of order. Serialize them and assert the Markdown images remain consecutive for the existing grid renderer.

- [ ] **Step 2: Run image tests and verify failure**

Run: `node --test src/test/js/block-editor-image.test.mjs`

Expected: FAIL because image upload integration is absent.

- [ ] **Step 3: Implement file selection and paste interception**

The plugin handles paste only when `clipboardData.files` contains image MIME types, calls `preventDefault()`, and leaves non-image paste to ProseMirror's sanitized DOM parser. `/image` opens a hidden multiple file input and passes selected files to `uploadAndInsertImages()`.

- [ ] **Step 4: Implement image NodeView states and alt editing**

Render progress text for `uploading`, retry/delete controls for `error`, and `<figure><img><input aria-label="이미지 대체 텍스트"></figure>` for `ready`. Alt input changes must dispatch `setNodeMarkup`; never modify node attrs in place. Clicking the image must preserve the existing application lightbox behavior by rendering a normal `img` with the stored source.

- [ ] **Step 5: Run image, Markdown and renderer tests**

Run: `node --test src/test/js/block-editor-image.test.mjs src/test/js/block-editor-markdown.test.mjs src/test/js/markdown.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit images**

```bash
git add src/main/frontend/editor/block-editor-image.js src/main/frontend/editor/block-editor.js src/main/frontend/editor/block-editor-node-views.js src/main/frontend/editor/block-editor-slash-menu.js src/test/js/block-editor-image.test.mjs src/test/js/block-editor-markdown.test.mjs
git commit -m "feat: add block image upload workflow"
```

### Task 10: Single-Surface Styling, Responsive Layout, and Accessibility

**Files:**
- Modify: `src/main/resources/static/css/styles.css:1306-1790,2480-2630`
- Modify: `src/main/frontend/editor/block-editor-toolbar.js`
- Modify: `src/main/frontend/editor/block-editor-slash-menu.js`
- Modify: `src/main/frontend/editor/block-editor-node-views.js`
- Modify: `src/test/js/block-editor-integration.test.mjs`

**Interfaces:**
- Consumes: stable class names from Tasks 5-9.
- Produces: `.block-editor`, `.block-editor-toolbar`, `.block-editor-content`, `.slash-command-menu`, `.block-table-controls` style contract.

- [ ] **Step 1: Add failing structural accessibility assertions**

Assert toolbar has `role="toolbar"` and an accessible Korean label; Slash menu has `role="listbox"`, items have `role="option"` and `aria-selected`; node controls are buttons; editor content has `aria-label="본문"`; and interactive controls have at least 44px mobile hit areas through stable classes.

- [ ] **Step 2: Run integration tests and verify failure**

Run: `node --test src/test/js/block-editor-integration.test.mjs`

Expected: FAIL on missing roles, labels or classes.

- [ ] **Step 3: Replace split-pane CSS with the approved layout**

Delete or stop applying `.markdown-workspace`, `.markdown-pane`, `.markdown-writing textarea`, `.markdown-preview`, `.pane-label`, and textarea table-overlay rules. Add one max-width editor surface using existing canvas/surface/border variables. Apply `.markdown-body` heading, paragraph, list, quote, code, table, image-grid, toggle and callout typography to `.block-editor-content .ProseMirror` without duplicating token values.

- [ ] **Step 4: Style interaction states and viewport correction**

Add visible focus, selected-block outline, uploading/error image, contextual table controls, Slash selected/empty state, dark theme and reduced-motion rules. On mobile, keep one content column, make toolbar horizontally scrollable, and set controls to 44px minimum height.

- [ ] **Step 5: Build and run DOM tests**

Run: `npm run build:editor && node --test src/test/js/block-editor-integration.test.mjs src/test/js/block-editor-slash-menu.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit the layout**

```bash
git add src/main/resources/static/css/styles.css src/main/frontend/editor/block-editor-toolbar.js src/main/frontend/editor/block-editor-slash-menu.js src/main/frontend/editor/block-editor-node-views.js src/main/resources/static/js/block-editor.bundle.js src/test/js/block-editor-integration.test.mjs
git commit -m "style: replace split Markdown editor layout"
```

### Task 11: Documentation, Full Regression, and Browser Verification

**Files:**
- Modify: `README.md`
- Modify: `DESIGN.md`
- Modify: `src/test/js/markdown-editor.test.mjs`
- Modify: all new editor tests only when verification exposes a genuine expectation error.

**Interfaces:**
- Consumes: completed editor and all prior tests.
- Produces: documented build/run/test contract and final verification evidence.

- [ ] **Step 1: Update durable documentation**

In `README.md`, replace split Markdown preview language with the single block editor, list retained shortcuts and Slash commands, and document:

```bash
npm install
npm run build:editor
npm run test:js
./gradlew test
./gradlew bootRun
```

In `DESIGN.md`, change `WYSIWYG rich-text editing` from a non-goal, replace the raw Markdown split-preview tradeoff, record ProseMirror as an editor-only dependency exception, and keep raw Markdown persistence and sanitizer constraints.

- [ ] **Step 2: Rebuild from a clean dependency graph**

Move the existing `node_modules` directory to a temporary directory created with `mktemp -d`, run `npm ci`, and then run `npm run build:editor`. Compare `git diff -- src/main/resources/static/js/block-editor.bundle.js`; expected result is no diff after committing the regenerated bundle.

- [ ] **Step 3: Run all JavaScript tests**

Run: `npm run test:js`

Expected: every `src/test/js/*.test.mjs` test passes, including legacy Markdown and Canvas tests.

- [ ] **Step 4: Run all backend tests**

Run: `JAVA_HOME=/Users/jinriro/Library/Java/JavaVirtualMachines/ms-21.0.10/Contents/Home ./gradlew test`

Expected: `BUILD SUCCESSFUL`.

- [ ] **Step 5: Perform desktop browser verification**

Run the app and verify at 1440px width:

1. Open a Markdown draft containing every supported block.
2. Confirm only one editable surface appears and matches detail typography.
3. Exercise every retained shortcut and input trigger.
4. Type Korean text around `#`, `/`, lists and backticks; confirm no duplicate characters.
5. Exercise Slash keyboard, mouse, empty search, outside click and viewport-edge correction.
6. Insert/edit toggle, callout, table, code and multiple images.
7. Undo and redo each block insertion.
8. Save, reopen, and compare structure and content.
9. Publish and confirm details, image grid, image lightbox, toggle and callout rendering.

- [ ] **Step 6: Perform mobile browser verification**

At 390x844, repeat title entry, toolbar horizontal scroll, Slash menu edge placement, table horizontal overflow, image alt editing, Korean IME, draft save and publish. Confirm no horizontal page overflow outside intentionally scrollable table/toolbar containers.

- [ ] **Step 7: Inspect the final diff and user-owned changes**

Run:

```bash
git status --short
git diff --check
git diff --stat
git diff -- src/main/resources/static/js/markdown.js src/main/resources/static/css/styles.css src/test/js/markdown.test.mjs
```

Confirm the callout work present before implementation still exists, no unrelated `WebConfig.java` whitespace change was absorbed, no dependency directory is tracked, and no textarea split editor is referenced by the Markdown route.

- [ ] **Step 8: Commit documentation and final verification fixes**

```bash
git add README.md DESIGN.md src/test/js/markdown-editor.test.mjs src/main/resources/static/js/block-editor.bundle.js
git add src/main/frontend/editor src/test/js/block-editor-*.mjs
git commit -m "docs: document Rilog block editor workflow"
```

## Completion Evidence

The implementation is complete only when all of the following are recorded in the final handoff:

- `npm run build:editor` exit status and bundle reproducibility result.
- `npm run test:js` passing test count.
- `./gradlew test` successful task summary.
- Desktop and mobile browser verification results, including Korean IME.
- Confirmation that existing Markdown, details, callout, tables, images, image grid and lightbox still render.
- Confirmation that pre-existing uncommitted user changes were preserved or intentionally integrated.
- Exact remaining risks or validation gaps, if any.
