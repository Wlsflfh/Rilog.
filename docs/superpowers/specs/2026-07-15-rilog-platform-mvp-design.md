# Rilog Platform MVP Design

## Goal

Pivot the current personal blog into `Rilog`, a developer blog platform where every signed-in user can publish posts and own a public `@username` blog.

## Scope

- Brand the product as `Rilog`.
- Remove the personal-blog admin-only writing rule.
- Let every authenticated user create posts.
- Keep post update/delete restricted to the post author.
- Add a stable `username` to each user.
- Generate usernames from Google email local parts during OAuth provisioning, with numeric suffixes for duplicates.
- Add public user blog lookup by username.
- Add frontend routes for `/#/@username` and `/#/@username/posts/{postId}`.

## Out of Scope for this pass

- Server-side SEO URLs.
- Slugs.
- Image upload.
- Advanced Markdown shortcuts.
- Statistics dashboards.
- Interest category onboarding.
- Canvas post type.

## API Shape

- `GET /auth/me` returns `username`.
- `GET /users/{username}` returns public profile information.
- `GET /users/{username}/posts` returns that user's visible posts.
- Existing `/posts/me` remains the signed-in user's management feed.

## Authorization

- Anonymous users can read public posts and public user blogs.
- Authenticated users can create posts.
- Only a post author can update/delete their post.
- Comment deletion remains allowed for the comment author or the post author.

## Frontend

- Header brand is `Rilog.`
- Signed-in users see `내 블로그` and `글쓰기`.
- The profile menu includes `내 블로그`, `내 글 관리`, and `로그아웃`.
- Home copy positions Rilog as a developer blog platform.
