package blog.controller.dto;

import blog.domain.PostAnnotationComment;

import java.time.LocalDateTime;

public record AnnotationCommentResponse(
        Long id,
        Long userId,
        String authorNickname,
        String authorProfileImageUrl,
        String content,
        boolean mine,
        boolean deletable,
        LocalDateTime createdAt
) {

    public static AnnotationCommentResponse from(PostAnnotationComment comment, Long viewerId) {
        boolean mine = viewerId != null && comment.getUser().isWrittenBy(viewerId);
        boolean postAuthor = viewerId != null && comment.getAnnotation().getPost().getUser().isWrittenBy(viewerId);
        return new AnnotationCommentResponse(
                comment.getId(),
                comment.getUser().getId(),
                comment.getUser().getNickname(),
                comment.getUser().getProfileImageUrl(),
                comment.getContent(),
                mine,
                mine || postAuthor,
                comment.getCreatedAt()
        );
    }
}
