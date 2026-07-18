# Service Exception Logging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace service-layer `IllegalArgumentException` failures with `BlogException`, log expected failures in the service, and retain error-level stacktrace logging only for unexpected exceptions in the global handler.

**Architecture:** Services create and log expected business failures at the point where request identifiers are available. `GlobalExceptionHandler` converts `BlogException` without logging and records unexpected exceptions with their stacktrace before returning a generic 500 response.

**Tech Stack:** Java 21, Spring Boot 3.3, SLF4J/Logback, JUnit 5, Mockito

---

### Task 1: Lock service exception behavior

**Files:**
- Create: `src/test/java/blog/service/PostServiceTest.java`
- Create: `src/test/java/blog/service/UserServiceTest.java`
- Modify: `src/main/java/blog/service/PostService.java`
- Modify: `src/main/java/blog/service/UserService.java`

- [ ] Write tests asserting missing posts and users throw `BlogException` with `DomainErrorCode.NOT_FOUND`.
- [ ] Run the service tests and verify they fail because `IllegalArgumentException` is still thrown.
- [ ] Add service logging and replace each service-layer `IllegalArgumentException` with `BlogException`.
- [ ] Run the service tests and verify they pass.

### Task 2: Lock handler logging responsibility

**Files:**
- Create: `src/test/java/blog/global/GlobalExceptionHandlerTest.java`
- Modify: `src/main/java/blog/global/GlobalExceptionHandler.java`

- [ ] Write tests asserting `BlogException` is converted without an error log and an unexpected exception produces an error log containing the stacktrace.
- [ ] Run the handler tests and verify the expected initial failure.
- [ ] Make only the minimal handler naming or logging adjustments required by the tests.
- [ ] Run the handler tests and verify they pass.

### Task 3: Regression verification

**Files:**
- Verify all files under `src/main` and `src/test`.

- [ ] Search service sources to confirm no `IllegalArgumentException` remains.
- [ ] Run the complete Gradle test suite.
- [ ] Review the final diff for unrelated changes and report any remaining risk.
