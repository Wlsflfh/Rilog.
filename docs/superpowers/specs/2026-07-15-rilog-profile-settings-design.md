# Rilog Profile Settings Design

## Goal

Rilog 사용자가 자신의 개발자 블로그 정체성을 직접 편집하고, 완성된 블로그 주소를 쉽게 공유할 수 있게 한다.

## Scope

- Add a frontend route at `#/settings/profile`.
- Show a profile edit form for authenticated users only.
- Support editing `bio`, `githubUrl`, `websiteUrl`, and `techStack`.
- Save through the existing `PATCH /users/me/profile` API.
- Add a visible menu entry from the profile dropdown.
- Add a “내 블로그 주소 복사” action that copies the public `@username` URL.

## Out of Scope

- Username editing.
- Profile image upload.
- Server-rendered SEO routes.
- Rich profile themes.

## UX

The page should feel like a calm Rilog settings screen, not an admin panel. The form appears as one focused card with a short explanation: “내 블로그를 처음 방문한 개발자가 나를 이해할 수 있게 적어주세요.” After saving, the user gets a toast and can immediately open their blog.

The copy action should use the current browser origin and the user’s username, producing URLs like:

```text
http://localhost:8080/#/@jinriro
```

## Data Flow

1. User opens `#/settings/profile`.
2. Frontend requires login.
3. Frontend fetches `GET /users/{username}` for the latest profile data.
4. User edits fields.
5. Frontend trims values and converts empty fields to `null`.
6. Frontend sends `PATCH /users/me/profile`.
7. On success, the page shows a toast and offers a link back to the public blog.

## Testing

- Add a small pure JavaScript helper for profile form normalization and blog URL creation.
- Cover the helper with Node tests before wiring the UI.
- Run existing frontend syntax checks and backend tests after implementation.

