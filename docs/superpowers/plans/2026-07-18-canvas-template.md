# Canvas Template Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Canvas post template alongside the existing Markdown post template.

**Architecture:** Store the post type on `Post` as `PostContentType`. Keep `Post.content` as the single body storage column: Markdown stores plain Markdown, Canvas stores versioned JSON. The frontend selects an editor and renderer based on `contentType`.

**Tech Stack:** Java 21, Spring Boot 3.3.5, Spring Data JPA, Spring Security, Vanilla JavaScript, HTML/CSS, Node test runner.

## Global Constraints

- Existing Markdown writing, rendering, image upload, table tools, comments, likes, and profile pages must keep working.
- No new third-party frontend dependency for Canvas MVP.
- Canvas MVP supports text nodes and image nodes only.
- Canvas JSON is stored in `Post.content`.
- Existing requests without `contentType` default to `MARKDOWN`.
- Editing a post does not allow changing its content type.

---

## File Structure

- Modify `src/main/java/blog/domain/PostContentType.java`
  - New enum: `MARKDOWN`, `CANVAS`.
- Modify `src/main/java/blog/domain/Post.java`
  - Add `contentType`.
  - Default old constructor paths to `MARKDOWN`.
  - Preserve `contentType` on update.
- Modify `src/main/java/blog/controller/dto/PostRequest.java`
  - Add nullable `contentType`.
  - Provide `contentTypeOrDefault()`.
- Modify `src/main/java/blog/controller/dto/PostResponse.java`
  - Expose `contentType`.
- Modify `src/main/java/blog/service/PostCommandService.java`
  - Pass request content type on create/update.
- Modify Java tests under `src/test/java/blog/**`
  - Update constructor expectations.
  - Add Canvas preservation tests.
- Create `src/main/resources/static/js/canvas-editor.js`
  - Canvas document factory, parser, serializer, editor DOM helpers.
- Create `src/test/js/canvas-editor.test.mjs`
  - Validate Canvas JSON parse/serialize and node creation.
- Modify `src/main/resources/static/js/app.js`
  - Add template picker for `#/write`.
  - Add `#/write?type=markdown` and `#/write?type=canvas`.
  - Render Canvas posts.
  - Route edit mode by stored `contentType`.
- Modify `src/main/resources/static/css/styles.css`
  - Add template picker, Canvas editor, Canvas renderer styles.

## Task 1: Backend Content Type

**Files:**
- Create: `src/main/java/blog/domain/PostContentType.java`
- Modify: `src/main/java/blog/domain/Post.java`
- Modify: `src/main/java/blog/controller/dto/PostRequest.java`
- Modify: `src/main/java/blog/controller/dto/PostResponse.java`
- Modify: `src/main/java/blog/service/PostCommandService.java`
- Test: `src/test/java/blog/service/PostCommandServiceTest.java`
- Test: `src/test/java/blog/controller/dto/PostResponseTest.java`

**Interfaces:**
- Produces: `PostContentType`
- Produces: `PostRequest.contentTypeOrDefault(): PostContentType`
- Produces: `PostResponse.contentType(): PostContentType`

- [ ] **Step 1: Add failing tests for Canvas type preservation**

Add a service test that creates a post with `PostContentType.CANVAS` and verifies the saved `Post` has the same type.

- [ ] **Step 2: Add `PostContentType` enum**

```java
package blog.domain;

public enum PostContentType {
    MARKDOWN,
    CANVAS
}
```

- [ ] **Step 3: Add `contentType` to `Post`**

Add:

```java
@Enumerated(EnumType.STRING)
@Column(nullable = false)
private PostContentType contentType;
```

Constructor and update paths should default null to `MARKDOWN`.

- [ ] **Step 4: Add `contentType` to request/response DTOs**

`PostRequest` should accept nullable `contentType` and expose:

```java
public PostContentType contentTypeOrDefault() {
    return contentType == null ? PostContentType.MARKDOWN : contentType;
}
```

- [ ] **Step 5: Run targeted Java tests**

Run:

```bash
JAVA_HOME=/Users/jinriro/Library/Java/JavaVirtualMachines/ms-21.0.10/Contents/Home ./gradlew test --tests 'blog.service.PostCommandServiceTest' --tests 'blog.controller.dto.PostResponseTest'
```

Expected: PASS.

## Task 2: Canvas Document Utilities

**Files:**
- Create: `src/main/resources/static/js/canvas-editor.js`
- Test: `src/test/js/canvas-editor.test.mjs`

**Interfaces:**
- Produces: `createEmptyCanvasDocument(): object`
- Produces: `parseCanvasDocument(source: string): object`
- Produces: `serializeCanvasDocument(document: object): string`
- Produces: `createCanvasTextNode(): object`
- Produces: `createCanvasImageNode(url: string): object`

- [ ] **Step 1: Write Canvas utility tests**

Tests cover empty document creation, invalid JSON fallback, and node creation.

- [ ] **Step 2: Implement Canvas utility functions**

Canvas document shape:

```js
{
  version: 1,
  nodes: []
}
```

Text node shape:

```js
{
  id,
  type: "text",
  x,
  y,
  width,
  height,
  content
}
```

Image node shape:

```js
{
  id,
  type: "image",
  x,
  y,
  width,
  height,
  url,
  alt
}
```

- [ ] **Step 3: Run Node tests**

Run:

```bash
node --test src/test/js/canvas-editor.test.mjs
```

Expected: PASS.

## Task 3: Frontend Template Selection and Canvas Editor

**Files:**
- Modify: `src/main/resources/static/js/app.js`
- Modify: `src/main/resources/static/js/canvas-editor.js`
- Modify: `src/main/resources/static/css/styles.css`

**Interfaces:**
- Consumes: `createCanvasEditor({ initialValue, onChange, uploadImage })`
- Consumes: `renderCanvasDocument(source: string): HTMLElement`

- [ ] **Step 1: Add template picker route**

`#/write` renders two cards: Markdown and Canvas.

- [ ] **Step 2: Route selected template**

`#/write?type=markdown` opens existing Markdown editor.

`#/write?type=canvas` opens Canvas editor.

- [ ] **Step 3: Build Canvas editor**

Canvas editor supports:

- Add text node
- Add image node through existing upload API
- Drag node
- Resize node
- Edit text node content
- Serialize to hidden form state on every change

- [ ] **Step 4: Submit Canvas posts**

Canvas payload sets:

```js
contentType: "CANVAS"
```

Markdown payload sets:

```js
contentType: "MARKDOWN"
```

## Task 4: Canvas Rendering and Regression Verification

**Files:**
- Modify: `src/main/resources/static/js/app.js`
- Modify: `src/main/resources/static/css/styles.css`
- Test: `src/test/js/canvas-editor.test.mjs`

**Interfaces:**
- Consumes: `post.contentType`
- Produces: Canvas post detail rendering

- [ ] **Step 1: Render detail by content type**

Markdown posts keep using:

```js
renderMarkdown(post.content)
```

Canvas posts use:

```js
renderCanvasDocument(post.content)
```

- [ ] **Step 2: Add Canvas preview rendering**

The Canvas editor preview should reuse the read-only Canvas renderer.

- [ ] **Step 3: Run full verification**

Run:

```bash
JAVA_HOME=/Users/jinriro/Library/Java/JavaVirtualMachines/ms-21.0.10/Contents/Home ./gradlew test
node --test src/test/js/markdown.test.mjs src/test/js/markdown-editor.test.mjs src/test/js/canvas-editor.test.mjs
```

Expected: all tests pass.

## Self-Review

- Spec coverage: `contentType`, template picker, Canvas JSON storage, Canvas editor, Canvas renderer, tests are covered.
- Placeholder scan: no placeholder markers or undefined feature steps.
- Type consistency: `PostContentType`, `contentType`, and Canvas utility function names are consistent across tasks.
