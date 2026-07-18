# Rilog Second Phase Design

## Goal

Make Rilog feel more like a developer blog platform by adding profile depth, SEO-ready post metadata, basic statistics foundations, image paste upload plumbing, and smoother Markdown commands.

## Scope

- Extend user profiles with introduction, GitHub URL, website URL, and tech stack text.
- Add post slug and summary metadata.
- Generate unique slugs per author from titles.
- Return slug and summary in post responses.
- Add basic stat event persistence for post views.
- Add a minimal image upload API and Markdown paste insertion flow.
- Add editor shortcuts for common Markdown actions.

## Out of Scope

- Server-rendered SEO pages.
- Real cloud storage such as S3.
- Full analytics dashboard visualizations.
- Full Notion/Obsidian import fidelity.
- Canvas editor.

## UX Direction

- Profile pages should feel like a developer home, not a plain list.
- Editor shortcuts should make writing feel fast without changing the current vanilla JS stack.
- Image paste can initially store locally and return a stable URL-shaped path.

## APIs

- `PATCH /users/me/profile` updates intro/social/stack fields.
- `POST /images` accepts multipart image upload and returns `{url}`.
- `GET /users/{username}` includes profile fields.
- Post responses include `slug` and `summary`.

## Data

- `posts.slug` is unique with `user_id`.
- `posts.summary` stores a short SEO/display summary.
- `post_view_events` stores post, viewer nullable, and date/time.
