# Navy Blog Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a responsive navy blog frontend with persistent dark mode and complete integration with the existing post and session-auth APIs.

**Architecture:** Spring Boot serves one semantic HTML shell, a token-driven CSS design system, and small ES modules for API access and hash-based rendering. User-generated values are inserted through DOM text APIs, while authentication and CSRF remain server-owned.

**Tech Stack:** HTML5, CSS custom properties, vanilla JavaScript ES modules, Spring Boot static resources, MockMvc

---

### Task 1: Public shell and security
- [ ] Add failing tests proving `/`, CSS, and JavaScript are publicly accessible.
- [ ] Permit static assets and redirect OAuth success to `/`.
- [ ] Add the HTML shell and favicon.

### Task 2: Design system and theme
- [ ] Implement approved navy tokens, responsive components, focus states, and reduced motion.
- [ ] Implement OS theme detection, manual theme toggle, and local persistence.

### Task 3: API-connected interactions
- [ ] Add an API module for auth, CSRF, posts, likes, and logout.
- [ ] Render feed, detail, editor, and my-post screens with safe DOM APIs.
- [ ] Add Google login, create/update/delete, likes, loading, empty, error, and toast states.

### Task 4: Verification
- [ ] Run focused static-resource tests and the complete Java test suite.
- [ ] Start the app with H2 and visually verify desktop and mobile layouts in the in-app browser.
- [ ] Inspect console errors and final diff.
