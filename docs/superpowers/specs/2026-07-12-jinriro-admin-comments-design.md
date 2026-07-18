# Jinriro Admin Blog and Comments Design

## Goal

Turn the app into Jinriro's personal development blog: only `wlsflfh@gmail.com` can publish and manage posts, while visitors can read posts and signed-in users can like and comment.

## Decisions

- Branding uses `Jinriro.` in the header/footer and Korean copy that frames the site as `진리로의 개발블로그`.
- The header brand remains the home navigation, so the separate `둘러보기` navigation item is removed.
- Post create/update/delete is server-protected by an admin policy based on the signed-in user's email.
- The frontend hides writing controls from non-admin users, but this is only UX; the backend remains the authority.
- Comments belong to a post and a user. Any signed-in user can create comments. A comment can be deleted by its author or the admin.
- Like users are exposed as a small public read model so readers can see who liked a post.
- The editor keeps Markdown preview but uses a taller writing area so draft size better matches the final reading experience.
- The public/private selector keeps the card style but becomes smaller and less visually dominant.

## API Shape

- `GET /auth/me` includes `admin: boolean`.
- `POST /posts`, `PUT /posts/{postId}`, and `DELETE /posts/{postId}` require admin.
- `GET /posts/{postId}/comments` returns comments for a post.
- `POST /posts/{postId}/comments` creates a comment for the signed-in user.
- `DELETE /posts/{postId}/comments/{commentId}` deletes a comment if the user is the author or admin.
- `GET /posts/{postId}/likes/users` returns users who liked the post.

## Error Handling

- Non-admin write attempts return `403` with `UNAUTHORIZED_ADMIN`.
- Anonymous comment/like mutation attempts return `401` through Spring Security.
- Missing posts/comments return `404` with `NOT_FOUND`.
- Invalid comment content returns `400` with `INVALID_INPUT`.

## Testing

- Service/controller tests cover admin-only post writing, comment creation/deletion authorization, and liked-user query response.
- Existing Markdown JS tests continue to verify editor rendering behavior.
