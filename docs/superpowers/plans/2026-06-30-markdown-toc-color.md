# Markdown TOC and Text Color Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render a conditional four-level Markdown table of contents beside posts and provide safe preset/custom text colors in the Markdown editor.

**Architecture:** Keep raw Markdown in the existing post content field. Extend the dependency-free DOM renderer with pure heading/color helpers, then let `app.js` compose the TOC and editor controls while `styles.css` owns sticky and responsive layout.

**Tech Stack:** Vanilla ES modules, DOM APIs, CSS custom properties, Node built-in test runner, Spring Boot static resources

---

### Task 1: Pure Markdown metadata and color validation

**Files:**
- Modify: `src/main/resources/static/js/markdown.js`
- Create: `src/test/js/markdown.test.mjs`

- [ ] **Step 1: Write failing helper tests**

```javascript
import test from "node:test";
import assert from "node:assert/strict";
import {extractHeadings, normalizeHexColor} from "../../main/resources/static/js/markdown.js";

test("extracts # through #### and creates unique ids", () => {
    assert.deepEqual(extractHeadings("# A\n## B\n#### C\n##### 제외\n# A"), [
        {level: 1, text: "A", id: "a"},
        {level: 2, text: "B", id: "b"},
        {level: 4, text: "C", id: "c"},
        {level: 1, text: "A", id: "a-2"}
    ]);
});

test("accepts only RGB and RRGGBB hex colors", () => {
    assert.equal(normalizeHexColor("#07f"), "#0077ff");
    assert.equal(normalizeHexColor("#071047"), "#071047");
    assert.equal(normalizeHexColor("red"), null);
});
```

- [ ] **Step 2: Run the tests and confirm failure**

Run: `node --test src/test/js/markdown.test.mjs`

Expected: FAIL because `extractHeadings` and `normalizeHexColor` are not exported.

- [ ] **Step 3: Implement pure helpers**

Add `normalizeHexColor(value)`, `extractHeadings(source)`, deterministic slug creation, fenced-code exclusion, and duplicate suffixes. Limit extracted headings to levels 1–4.

- [ ] **Step 4: Run helper tests**

Run: `node --test src/test/js/markdown.test.mjs`

Expected: all tests PASS.

### Task 2: Safe colored inline Markdown and heading anchors

**Files:**
- Modify: `src/main/resources/static/js/markdown.js`
- Modify: `src/test/js/markdown.test.mjs`

- [ ] **Step 1: Add tests for color-token validation and ignored headings in code fences**

```javascript
test("ignores headings inside fenced code", () => {
    assert.deepEqual(extractHeadings("```md\n# code\n```\n## real"), [
        {level: 2, text: "real", id: "real"}
    ]);
});
```

- [ ] **Step 2: Extend the DOM renderer**

Recognize only exact `<span style="color: #RGB">text</span>` or `<span style="color: #RRGGBB">text</span>` tokens. Create a `span` node and assign the normalized color through `style.color`; keep all other HTML as text. Assign the same IDs returned by `extractHeadings` to rendered `h1`–`h4` nodes.

- [ ] **Step 3: Verify syntax and tests**

Run: `node --check src/main/resources/static/js/markdown.js && node --test src/test/js/markdown.test.mjs`

Expected: syntax check succeeds and all tests PASS.

### Task 3: Right-side TOC and color editor controls

**Files:**
- Modify: `src/main/resources/static/js/app.js`
- Modify: `src/main/resources/static/css/styles.css`

- [ ] **Step 1: Compose a conditional TOC**

Import `extractHeadings`, create a `nav.post-toc` only when headings exist, render links for levels 1–4, and wrap the article and TOC in `div.post-detail-layout`. Keep the TOC after the article in DOM order so it appears on the right in desktop CSS.

- [ ] **Step 2: Add preset and custom color controls**

Add five accessible preset buttons (`#071047`, `#25339b`, `#e5484d`, `#0f8a5f`, `#b46b00`) and an `<input type="color">`. Each control wraps the selection with `<span style="color: #RRGGBB">...</span>` through the existing insertion function and refreshes the preview.

- [ ] **Step 3: Add responsive styles**

Use a desktop grid with a `780px` article and `220px` sticky right TOC. Apply one navy left border, level-dependent indentation, and restrained link states. Below the tablet breakpoint, switch to one column and place the TOC above the article through CSS grid areas.

- [ ] **Step 4: Verify JavaScript and static resources**

Run: `node --check src/main/resources/static/js/app.js && git diff --check`

Expected: both commands succeed without errors.

### Task 4: Documentation and regression verification

**Files:**
- Modify: `DESIGN.md`
- Verify: `src/test/java/blog/auth/config/AuthSecurityIntegrationTest.java`

- [ ] **Step 1: Document the components**

Record the four-level conditional TOC, safe inline color extension, sticky desktop placement, and mobile top placement in `DESIGN.md`.

- [ ] **Step 2: Run the focused static-resource test**

Run: `JAVA_HOME=/Users/jinriro/Library/Java/JavaVirtualMachines/ms-21.0.10/Contents/Home ./gradlew test --tests 'blog.auth.config.AuthSecurityIntegrationTest'`

Expected: `BUILD SUCCESSFUL`.

- [ ] **Step 3: Run the complete test suite**

Run: `JAVA_HOME=/Users/jinriro/Library/Java/JavaVirtualMachines/ms-21.0.10/Contents/Home ./gradlew test`

Expected: `BUILD SUCCESSFUL`.

- [ ] **Step 4: Browser-check desktop and mobile states**

Verify a post containing `#` through `####`, duplicate headings, no headings, preset color, custom color, and malicious HTML. Confirm the TOC is right/sticky on desktop, above content on mobile, absent without headings, and no unapproved HTML executes.
