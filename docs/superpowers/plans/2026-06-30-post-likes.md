# Post Likes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add idempotent post-like APIs and expose whether the current user liked each post.

**Architecture:** A `PostLike` entity owns the user-post relationship with a database unique constraint. `PostLikeService` coordinates persistence and the denormalized post counter; controllers enrich responses using one bulk liked-post lookup.

**Tech Stack:** Java 21, Spring Boot 3.3, Spring Data JPA, JUnit 5, Mockito

---

### Task 1: Like domain and service

**Files:**
- Create: `src/main/java/blog/domain/PostLike.java`
- Create: `src/main/java/blog/repository/PostLikeRepository.java`
- Create: `src/main/java/blog/service/PostLikeService.java`
- Test: `src/test/java/blog/service/PostLikeServiceTest.java`

- [ ] Write failing tests for first like, duplicate like, unlike, and duplicate unlike.
- [ ] Run the focused tests and confirm the missing implementation failure.
- [ ] Implement the entity, repository, and service with idempotent behavior.
- [ ] Run the focused tests and confirm success.

### Task 2: API and response projection

**Files:**
- Modify: `src/main/java/blog/controller/PostController.java`
- Modify: `src/main/java/blog/controller/dto/PostResponse.java`

- [ ] Add `liked` to `PostResponse` and accept it in the response factory.
- [ ] Add `PUT` and `DELETE` like endpoints returning 204.
- [ ] Bulk-load liked post IDs for list responses and resolve one post for detail responses.

### Task 3: Verification

**Files:**
- Verify: `src/main/java/blog/**`
- Verify: `src/test/java/blog/**`

- [ ] Run the complete Gradle test suite with Java 21.
- [ ] Inspect the diff and confirm no unrelated files changed.
