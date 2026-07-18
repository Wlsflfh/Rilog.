# Rilog Platform MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the current Jinriro personal blog into the first Rilog platform MVP with multi-user publishing and `@username` blogs.

**Architecture:** Keep the current Spring Boot + vanilla JS structure. Add username as a first-class `User` field, expose public user profile/post APIs, remove admin-only post commands, and update the frontend hash router to support `@username` blog pages.

**Tech Stack:** Spring Boot, Spring Security OAuth2 session auth, Spring Data JPA, vanilla JavaScript modules, CSS.

## Global Constraints

- Product name is exactly `Rilog`.
- User blog route is `@username`.
- Every authenticated user can create posts.
- Only post authors can update/delete their posts.
- No new dependencies in this pass.

---

### Task 1: Username Model

**Files:**
- Modify: `src/main/java/blog/domain/User.java`
- Modify: `src/main/java/blog/repository/UserRepository.java`
- Modify: `src/main/java/blog/service/OAuth2UserProvisioningService.java`
- Modify: `src/main/resources/schema.sql`
- Modify: `src/main/resources/data.sql`
- Test: `src/test/java/blog/service/OAuth2UserProvisioningServiceTest.java`

**Interfaces:**
- Produces: `User.getUsername()`, `UserRepository.existsByUsername(String)`, generated unique usernames.

- [ ] Write tests for username generation and duplicate suffixing.
- [ ] Implement username field and generation.
- [ ] Verify targeted tests pass.

### Task 2: Remove Admin-Only Writing

**Files:**
- Modify: `src/main/java/blog/service/PostCommandService.java`
- Modify: `src/main/java/blog/service/PostCommentService.java`
- Modify: `src/test/java/blog/service/PostCommandServiceTest.java`
- Modify: `src/test/java/blog/auth/config/AuthSecurityIntegrationTest.java`

**Interfaces:**
- Produces: authenticated post creation by any user.

- [ ] Replace admin-only tests with authenticated-user create tests.
- [ ] Remove `AdminPolicy` from post commands.
- [ ] Change comment deletion to author or post author.
- [ ] Verify targeted tests pass.

### Task 3: Public User Blog API

**Files:**
- Create: `src/main/java/blog/controller/UserController.java`
- Create: `src/main/java/blog/controller/dto/UserProfileResponse.java`
- Modify: `src/main/java/blog/service/UserService.java`
- Modify: `src/main/java/blog/repository/PostRepository.java`

**Interfaces:**
- Produces: `GET /users/{username}`, `GET /users/{username}/posts`.

- [ ] Add profile/post lookup.
- [ ] Return only visible posts for anonymous visitors.
- [ ] Verify compile and integration tests.

### Task 4: Rilog Frontend

**Files:**
- Modify: `src/main/resources/static/index.html`
- Modify: `src/main/resources/static/js/api.js`
- Modify: `src/main/resources/static/js/app.js`
- Modify: `src/main/resources/static/js/theme.js`
- Modify: `src/main/resources/static/css/styles.css`

**Interfaces:**
- Consumes: `state.user.username`, user profile APIs.

- [ ] Change branding to Rilog.
- [ ] Show writing controls to every signed-in user.
- [ ] Add `/#/@username` and `/#/@username/posts/{postId}` routes.
- [ ] Add profile menu links.
- [ ] Verify JS syntax and Markdown tests.

### Task 5: Final Verification

- [ ] Run targeted Java tests.
- [ ] Run JS checks.
- [ ] Run full Gradle tests.
- [ ] Run `git diff --check`.
