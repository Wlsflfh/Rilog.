# Split Post Command and Query Services Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separate post reads from writes while keeping HTTP response DTO creation out of services.

**Architecture:** `PostFinder` centralizes not-found handling, `PostCommandService` owns mutations, and `PostQueryService` returns `PostQueryResult` containing a domain `Post` plus viewer-specific liked state. The controller only maps query results to `PostResponse`.

**Tech Stack:** Java 21, Spring Boot 3.3, Spring Data JPA, JUnit 5, Mockito

---

### Task 1: Query service

- [ ] Write a failing `PostQueryServiceTest` for bulk liked-state composition.
- [ ] Add `PostQueryResult`, `PostFinder`, and `PostQueryService`.
- [ ] Run the focused query test.

### Task 2: Command service and consumers

- [ ] Move create/update/delete methods into `PostCommandService`.
- [ ] Change `PostLikeService` to use `PostFinder`.
- [ ] Change `PostController` to delegate reads and writes to their respective services.
- [ ] Change `PostResponse` to map from `PostQueryResult`.

### Task 3: Tests and verification

- [ ] Rename and update existing service tests for the split dependencies.
- [ ] Run focused service tests.
- [ ] Run the complete Gradle test suite and inspect the diff.
