package blog.controller.dto;

import blog.domain.Post;
import blog.domain.PostStatus;
import blog.service.PostQueryResult;

import java.time.LocalDateTime;

public record PostResponse(
        Long id,
        Long userId,
        String authorUsername,
        String authorNickname,
        String title,
        String slug,
        String summary,
        String content,
        String thumbnailUrl,
        PostStatus postStatus,
        long viewCount,
        long likeCount,
        boolean liked,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {

    public static PostResponse from(PostQueryResult result) {
        return from(result.post(), result.liked());
    }

    public static PostResponse from(Post post, boolean liked) {
        return new PostResponse(
                post.getId(),
                post.getUser().getId(),
                post.getUser().getUsername(),
                post.getUser().getNickname(),
                post.getTitle(),
                post.getSlug(),
                post.getSummary(),
                post.getContent(),
                post.getThumbnailUrl(),
                post.getPostStatus(),
                post.getViewCount(),
                post.getLikeCount(),
                liked,
                post.getCreatedAt(),
                post.getUpdatedAt()
        );
    }
}
