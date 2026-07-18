# Google Session Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace forgeable user headers with server-session Google OIDC authentication and enforce JSON 401/403 responses.

**Architecture:** Spring Security handles OIDC protocol and session persistence. A thin OIDC adapter converts verified claims into `GoogleUserProfile`; a provisioning service owns user creation/profile synchronization; `AuthenticatedUser` carries only the internal user ID plus delegated OIDC behavior. Domain entities remain independent of Spring Security.

**Tech Stack:** Java 21, Spring Boot 3.3.5, Spring Security 6, OAuth2 Client/OIDC, JPA, JUnit 5, MockMvc

---

### Task 1: User identity and ownership
- [ ] Add failing tests for provider identity, profile synchronization, and 403 ownership failure.
- [ ] Add `AuthProvider`, provider subject fields, repository lookup, and `ensureOwnedBy`.
- [ ] Run domain tests.

### Task 2: OIDC provisioning
- [ ] Add failing tests for new and returning Google users.
- [ ] Implement immutable Google profile input, provisioning service, OIDC principal adapter, and custom OIDC user service.
- [ ] Run provisioning tests.

### Task 3: HTTP security boundary
- [ ] Add security dependencies and MockMvc tests for public reads, 401, CSRF 403, and authenticated writes.
- [ ] Implement `SecurityConfig`, JSON entry point/denied handler, `/auth/me`, and `/auth/csrf`.
- [ ] Replace every `X-USER-ID` with the authenticated principal.

### Task 4: Configuration and verification
- [ ] Add environment-variable Google registration and session cookie settings.
- [ ] Update schema/seed data for provider identity.
- [ ] Run focused and full tests.
- [ ] Run independent code review and address findings before final verification.
