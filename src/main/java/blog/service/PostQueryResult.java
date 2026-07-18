package blog.service;

import blog.domain.Post;

public record PostQueryResult(Post post, boolean liked) {
}
