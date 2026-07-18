# Rilog Second Phase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Rilog second-phase foundations: profile enrichment, SEO post metadata, basic stat events, image paste upload plumbing, and Markdown shortcuts.

**Architecture:** Keep the current Spring Boot and vanilla JS architecture. Add small focused domain fields/services/controllers rather than introducing new dependencies. Store uploaded images locally under a static upload path for now.

**Tech Stack:** Spring Boot, Spring MVC multipart upload, Spring Data JPA, vanilla JavaScript modules, CSS.

## Global Constraints

- No new dependencies.
- Slug is unique per author.
- Image upload is local-only in this pass.
- Stats are event foundations, not full dashboards.
- Existing Rilog routes continue to work.

---

### Task 1: Profile Enrichment

- [ ] Add user profile fields and update API.
- [ ] Include profile fields on `GET /users/{username}`.
- [ ] Update profile page display.

### Task 2: SEO Metadata and Slugs

- [ ] Add `Post.slug` and `Post.summary`.
- [ ] Generate unique slugs per user from title.
- [ ] Return slug/summary in post responses.

### Task 3: Stat Events

- [ ] Add `PostViewEvent`.
- [ ] Record one event when a post detail is loaded.
- [ ] Keep existing view count behavior compatible.

### Task 4: Image Upload Plumbing

- [ ] Add multipart `/images` endpoint.
- [ ] Store files under `static/uploads`.
- [ ] Add paste handling to insert Markdown image syntax.

### Task 5: Markdown Shortcuts

- [ ] Add Cmd/Ctrl+B/I/U/E/K shortcuts.
- [ ] Add backtick/bracket/quote pairing.
- [ ] Add table insert button.

### Task 6: Verification

- [ ] Run targeted tests.
- [ ] Run JS checks.
- [ ] Run full Gradle tests.
- [ ] Run `git diff --check`.
