# Rilog Dashboard Stats Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a personal stats dashboard that helps Rilog users feel their writing is being discovered and accumulating value.

**Architecture:** Add a read-only stats service backed by existing post/comment/view repositories. Expose it through `GET /stats/me`, then render it in a hash-routed frontend dashboard.

**Tech Stack:** Spring Boot, Spring Data JPA, vanilla JavaScript modules, Node test runner.

## Global Constraints

- `GET /stats/me` must require authentication.
- No new database table for dashboard phase 1.
- Daily view trend covers today and the previous 6 days.
- Missing daily buckets must be returned with `0`.
- No new frontend dependencies.

---

### Task 1: Backend Stats API

**Files:**
- Create: `src/main/java/blog/controller/StatsController.java`
- Create: `src/main/java/blog/controller/dto/DashboardStatsResponse.java`
- Create: `src/main/java/blog/service/DashboardStatsService.java`
- Modify: `src/main/java/blog/repository/PostRepository.java`
- Modify: `src/main/java/blog/repository/PostCommentRepository.java`
- Modify: `src/main/java/blog/repository/PostViewEventRepository.java`
- Test: `src/test/java/blog/service/DashboardStatsServiceTest.java`

**Interfaces:**
- Produces: `DashboardStatsService.getStats(Long userId): DashboardStatsResponse`.
- Produces: `GET /stats/me`.

### Task 2: Frontend Dashboard

**Files:**
- Create: `src/main/resources/static/js/dashboard.js`
- Create: `src/test/js/dashboard.test.mjs`
- Modify: `src/main/resources/static/js/api.js`
- Modify: `src/main/resources/static/js/app.js`
- Modify: `src/main/resources/static/index.html`
- Modify: `src/main/resources/static/css/styles.css`

**Interfaces:**
- Produces: `getMyStats()`.
- Produces: route `#/dashboard`.
- Produces: `createInsightMessage(stats)` and `barWidth(value, max)`.

### Task 3: Verification

Run:

```bash
node --check src/main/resources/static/js/dashboard.js
node --check src/main/resources/static/js/app.js
node --check src/main/resources/static/js/api.js
node --test src/test/js/dashboard.test.mjs
node --test src/test/js/markdown.test.mjs
node --test src/test/js/profile-settings.test.mjs
JAVA_HOME=/Users/jinriro/Library/Java/JavaVirtualMachines/ms-21.0.10/Contents/Home ./gradlew test
git diff --check
```

