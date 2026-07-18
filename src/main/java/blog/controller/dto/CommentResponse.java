package blog.controller.dto;

import blog.domain.PostComment;

import java.time.LocalDateTime;

public record CommentResponse(
        Long id,
        Long userId,
        String authorNickname,
        String authorProfileImageUrl,
        String content,
        boolean mine,
        boolean deletable,
        LocalDateTime createdAt
) {

    public static CommentResponse from(PostComment comment, Long viewerId) {
        boolean mine = viewerId != null && comment.getUser().isWrittenBy(viewerId);
        boolean postAuthor = viewerId != null && comment.getPost().getUser().isWrittenBy(viewerId);
        return new CommentResponse(
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
