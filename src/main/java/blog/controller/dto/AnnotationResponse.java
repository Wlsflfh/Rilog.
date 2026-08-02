package blog.controller.dto;

import blog.domain.PostAnnotation;
import blog.domain.PostAnnotationComment;

import java.time.LocalDateTime;
import java.util.List;

public record AnnotationResponse(
        Long id,
        Long authorId,
        String quotedText,
        LocalDateTime createdAt,
        List<AnnotationCommentResponse> comments
) {

    public static AnnotationResponse from(PostAnnotation annotation, List<PostAnnotationComment> comments, Long viewerId) {
        return new AnnotationResponse(
                annotation.getId(),
                annotation.getAuthor().getId(),
                annotation.getQuotedText(),
                annotation.getCreatedAt(),
                comments.stream()
                        .map(comment -> AnnotationCommentResponse.from(comment, viewerId))
                        .toList()
        );
    }
}
