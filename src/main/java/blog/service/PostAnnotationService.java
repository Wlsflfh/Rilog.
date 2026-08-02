package blog.service;

import blog.controller.dto.AnnotationRequest;
import blog.domain.Post;
import blog.domain.PostAnnotation;
import blog.domain.PostAnnotationComment;
import blog.domain.PostAnnotationStatus;
import blog.domain.PostContentType;
import blog.domain.User;
import blog.domain.exception.BlogException;
import blog.domain.exception.DomainErrorCode;
import blog.repository.PostAnnotationCommentRepository;
import blog.repository.PostAnnotationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PostAnnotationService {

    private final PostAnnotationRepository postAnnotationRepository;
    private final PostAnnotationCommentRepository postAnnotationCommentRepository;
    private final PostFinder postFinder;
    private final UserService userService;

    @Transactional
    public Long create(Long postId, Long userId, AnnotationRequest request) {
        Post post = postFinder.find(postId);
        User user = userService.getUser(userId);
        ensureRichText(post);

        PostAnnotation annotation = postAnnotationRepository.save(new PostAnnotation(post, user, request.quotedText()));
        postAnnotationCommentRepository.save(new PostAnnotationComment(annotation, user, request.content()));
        return annotation.getId();
    }

    @Transactional
    public void syncDeletedAnnotations(Long postId, Set<Long> remainingIds) {
        postAnnotationRepository.findByPostIdAndStatus(postId, PostAnnotationStatus.ACTIVE).stream()
                .filter(annotation -> !remainingIds.contains(annotation.getId()))
                .forEach(PostAnnotation::markDeleted);
    }

    private void ensureRichText(Post post) {
        if (post.getContentType() != PostContentType.RICH_TEXT) {
            throw new BlogException(DomainErrorCode.INVALID_INPUT, "Rich Text 글에만 문장 댓글을 남길 수 있습니다.");
        }
    }
}
