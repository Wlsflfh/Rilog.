# Jinriro Admin Blog and Comments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the app Jinriro's personal development blog with admin-only post writing, visitor likes, comments, liked-user visibility, and adjusted UI copy/spacing.

**Architecture:** Add a small admin policy service used by both auth responses and post/comment authorization. Add comment domain/repository/service/controller DTOs following the current PostLike patterns. Keep frontend routing client-side and extend existing `app.js`/`api.js` without adding a framework.

**Tech Stack:** Spring Boot, Spring Security OAuth2 session auth, Spring Data JPA, vanilla JavaScript modules, CSS.

## Global Constraints

- Admin email is exactly `wlsflfh@gmail.com`.
- Only admin can create, update, or delete posts.
- Signed-in non-admin users can like and comment.
- Public post reading remains available without login.
- No new frontend or backend dependencies.

---

### Task 1: Admin Policy

**Files:**
- Create: `src/main/java/blog/service/AdminPolicy.java`
- Modify: `src/main/java/blog/auth/controller/AuthController.java`
- Modify: `src/main/java/blog/service/PostCommandService.java`
- Test: `src/test/java/blog/service/PostCommandServiceTest.java`
- Test: `src/test/java/blog/auth/config/AuthSecurityIntegrationTest.java`

**Interfaces:**
- Produces: `AdminPolicy#isAdmin(User user)`, `AdminPolicy#ensureAdmin(User user)`, `AuthenticatedUserResponse.admin()`

- [ ] Write failing service and integration tests for admin-only post creation.
- [ ] Implement `AdminPolicy`.
- [ ] Inject it into `AuthController` and `PostCommandService`.
- [ ] Verify targeted tests pass.

### Task 2: Comments

**Files:**
- Create: `src/main/java/blog/domain/PostComment.java`
- Create: `src/main/java/blog/repository/PostCommentRepository.java`
- Create: `src/main/java/blog/service/PostCommentService.java`
- Create: `src/main/java/blog/service/PostCommentQueryResult.java`
- Create: `src/main/java/blog/controller/dto/CommentRequest.java`
- Create: `src/main/java/blog/controller/dto/CommentResponse.java`
- Modify: `src/main/java/blog/controller/PostController.java`
- Modify: `src/main/resources/schema.sql`
- Test: `src/test/java/blog/service/PostCommentServiceTest.java`

**Interfaces:**
- Produces: `PostCommentService#findByPost(Long)`, `#create(Long, Long, CommentRequest)`, `#delete(Long, Long, Long)`

- [ ] Write failing tests for create and delete authorization.
- [ ] Implement comment entity, repository, service, DTOs, and controller routes.
- [ ] Verify targeted tests pass.

### Task 3: Liked Users API

**Files:**
- Create: `src/main/java/blog/controller/dto/LikeUserResponse.java`
- Modify: `src/main/java/blog/repository/PostLikeRepository.java`
- Modify: `src/main/java/blog/service/PostLikeService.java`
- Modify: `src/main/java/blog/controller/PostController.java`
- Test: `src/test/java/blog/service/PostLikeServiceTest.java`

**Interfaces:**
- Produces: `PostLikeService#findLikedUsers(Long)`

- [ ] Write failing test for liked-user projection.
- [ ] Implement query and controller mapping.
- [ ] Verify targeted tests pass.

### Task 4: Frontend UX

**Files:**
- Modify: `src/main/resources/static/index.html`
- Modify: `src/main/resources/static/js/api.js`
- Modify: `src/main/resources/static/js/app.js`
- Modify: `src/main/resources/static/css/styles.css`
- Modify: `src/main/resources/static/js/theme.js`

**Interfaces:**
- Consumes: `state.user.admin`, comment APIs, liked-user API.

- [ ] Update branding/copy and remove `둘러보기`.
- [ ] Hide writing controls from non-admin users.
- [ ] Render comments and liked users on post detail.
- [ ] Increase editor height and reduce visibility selector size.
- [ ] Verify JS syntax and Markdown tests pass.

### Task 5: Final Verification

**Files:**
- All changed source/test files.

- [ ] Run targeted Java tests.
- [ ] Run JS checks.
- [ ] Run full Gradle test suite.
- [ ] Run `git diff --check`.
