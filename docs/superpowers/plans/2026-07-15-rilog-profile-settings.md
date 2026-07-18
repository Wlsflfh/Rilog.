# Rilog Profile Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a profile settings page where authenticated Rilog users can edit their blog profile and copy their public blog URL.

**Architecture:** Keep backend contracts unchanged because `PATCH /users/me/profile` already exists. Add a small pure frontend helper for testable normalization, then wire `app.js` routing and UI to existing APIs.

**Tech Stack:** Spring Boot, vanilla JavaScript modules, Node test runner, static CSS.

## Global Constraints

- The route must be hash-based: `#/settings/profile`.
- Only authenticated users can access the page.
- Empty optional profile fields are sent as `null`.
- The public blog URL format is `${origin}/#/@${username}`.
- Do not add new dependencies.

---

### Task 1: Profile Settings Helper

**Files:**
- Create: `src/main/resources/static/js/profile-settings.js`
- Create: `src/test/js/profile-settings.test.mjs`

**Interfaces:**
- Produces: `normalizeProfilePayload(values)` returning `{bio, githubUrl, websiteUrl, techStack}`.
- Produces: `createBlogUrl(origin, username)` returning an absolute hash URL string.

- [ ] **Step 1: Write the failing test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import {createBlogUrl, normalizeProfilePayload} from "../../main/resources/static/js/profile-settings.js";

test("normalizeProfilePayload trims values and turns blanks into null", () => {
    assert.deepEqual(normalizeProfilePayload({
        bio: "  Spring 기록 ",
        githubUrl: "   ",
        websiteUrl: " https://rilog.dev ",
        techStack: " Java, JPA "
    }), {
        bio: "Spring 기록",
        githubUrl: null,
        websiteUrl: "https://rilog.dev",
        techStack: "Java, JPA"
    });
});

test("createBlogUrl builds a hash route blog url", () => {
    assert.equal(createBlogUrl("http://localhost:8080", "jinriro"), "http://localhost:8080/#/@jinriro");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/test/js/profile-settings.test.mjs`

Expected: FAIL because `profile-settings.js` does not exist.

- [ ] **Step 3: Implement helper**

```js
function optionalText(value) {
    const trimmed = (value || "").trim();
    return trimmed || null;
}

export function normalizeProfilePayload(values) {
    return {
        bio: optionalText(values.bio),
        githubUrl: optionalText(values.githubUrl),
        websiteUrl: optionalText(values.websiteUrl),
        techStack: optionalText(values.techStack)
    };
}

export function createBlogUrl(origin, username) {
    return `${origin}/#/@${username}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test src/test/js/profile-settings.test.mjs`

Expected: PASS.

### Task 2: API and Route Wiring

**Files:**
- Modify: `src/main/resources/static/js/api.js`
- Modify: `src/main/resources/static/js/app.js`
- Modify: `src/main/resources/static/index.html`

**Interfaces:**
- Consumes: `normalizeProfilePayload(values)`.
- Consumes: `createBlogUrl(origin, username)`.
- Produces: route `#/settings/profile`.

- [ ] **Step 1: Add `updateMyProfile` API export**

```js
export const updateMyProfile = profile => mutation("/users/me/profile", "PATCH", profile);
```

- [ ] **Step 2: Import helper and API into `app.js`**

```js
import {createBlogUrl, normalizeProfilePayload} from "/js/profile-settings.js";
```

- [ ] **Step 3: Add `renderProfileSettings()`**

Create a login-gated settings form that fetches the current profile, fills the four fields, submits normalized data, and shows copy/open blog actions.

- [ ] **Step 4: Add route and menu link**

Route `#/settings/profile` to `renderProfileSettings()`, and add “프로필 설정” to the profile dropdown.

### Task 3: Styling and Verification

**Files:**
- Modify: `src/main/resources/static/css/styles.css`

**Interfaces:**
- Consumes: `.settings-page`, `.settings-card`, `.settings-grid`, `.copy-url-card`.

- [ ] **Step 1: Add focused settings styles**

The settings card should reuse existing surface, radius, navy, and form field tokens.

- [ ] **Step 2: Run frontend verification**

Run:

```bash
node --check src/main/resources/static/js/profile-settings.js
node --check src/main/resources/static/js/app.js
node --check src/main/resources/static/js/api.js
node --test src/test/js/profile-settings.test.mjs
node --test src/test/js/markdown.test.mjs
```

- [ ] **Step 3: Run backend verification**

Run:

```bash
JAVA_HOME=/Users/jinriro/Library/Java/JavaVirtualMachines/ms-21.0.10/Contents/Home ./gradlew test
```

- [ ] **Step 4: Run whitespace check**

Run:

```bash
git diff --check
```

