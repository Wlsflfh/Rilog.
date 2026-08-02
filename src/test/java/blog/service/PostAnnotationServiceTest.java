package blog.service;

import blog.controller.dto.AnnotationRequest;
import blog.domain.Post;
import blog.domain.PostAnnotation;
import blog.domain.PostAnnotationStatus;
import blog.domain.PostContentType;
import blog.domain.PostStatus;
import blog.domain.User;
import blog.domain.exception.BlogException;
import blog.domain.exception.DomainErrorCode;
import blog.repository.PostAnnotationCommentRepository;
import blog.repository.PostAnnotationRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

class PostAnnotationServiceTest {

    private final PostAnnotationRepository postAnnotationRepository = mock(PostAnnotationRepository.class);
    private final PostAnnotationCommentRepository postAnnotationCommentRepository = mock(PostAnnotationCommentRepository.class);
    private final PostFinder postFinder = mock(PostFinder.class);
    private final RichTextAnnotationExtractor richTextAnnotationExtractor = new RichTextAnnotationExtractor();
    private final UserService userService = mock(UserService.class);
    private final PostAnnotationService service = new PostAnnotationService(
            postAnnotationRepository,
            postAnnotationCommentRepository,
            postFinder,
            richTextAnnotationExtractor,
            userService
    );

    @Test
    @DisplayName("Rich Text 글에는 문장 댓글 anchor와 첫 댓글을 만들 수 있다.")
    void createAnnotation() {
        Post post = new Post(
                new User("작성자", "author@example.com", null),
                "제목",
                "{\"type\":\"doc\",\"content\":[]}",
                null,
                PostStatus.PUBLIC,
                "title",
                null,
                PostContentType.RICH_TEXT
        );
        User user = new User("방문자", "visitor@example.com", null);
        PostAnnotation saved = mock(PostAnnotation.class);
        given(saved.getId()).willReturn(1L);
        given(postFinder.find(1L)).willReturn(post);
        given(userService.getUser(2L)).willReturn(user);
        given(postAnnotationRepository.save(any(PostAnnotation.class))).willReturn(saved);

        service.create(1L, 2L, new AnnotationRequest("문장", "메모"));

        verify(postAnnotationRepository).save(any(PostAnnotation.class));
        verify(postAnnotationCommentRepository).save(any());
    }

    @Test
    @DisplayName("Markdown 글에는 문장 댓글을 만들 수 없다.")
    void rejectMarkdownPost() {
        Post post = new Post(new User("작성자", "author@example.com", null), "제목", "본문", null, PostStatus.PUBLIC);
        given(postFinder.find(1L)).willReturn(post);
        given(userService.getUser(2L)).willReturn(new User("방문자", "visitor@example.com", null));

        assertThatThrownBy(() -> service.create(1L, 2L, new AnnotationRequest("문장", "메모")))
                .isInstanceOf(BlogException.class)
                .extracting("code")
                .isEqualTo(DomainErrorCode.INVALID_INPUT);
    }

    @Test
    @DisplayName("비공개 글을 볼 수 없는 사용자는 문장 댓글을 만들 수 없다.")
    void rejectPrivatePostAnnotationByUnauthorizedUser() {
        Post post = mock(Post.class);
        given(post.getContentType()).willReturn(PostContentType.RICH_TEXT);
        given(post.isViewableBy(2L)).willReturn(false);
        given(postFinder.find(1L)).willReturn(post);
        given(userService.getUser(2L)).willReturn(new User("방문자", "visitor@example.com", null));

        assertThatThrownBy(() -> service.create(1L, 2L, new AnnotationRequest("문장", "메모")))
                .isInstanceOf(BlogException.class)
                .extracting("code")
                .isEqualTo(DomainErrorCode.UNAUTHORIZED_USER);
        verify(postAnnotationRepository, never()).save(any());
    }

    @Test
    @DisplayName("본문 mark가 남아있는 active annotation만 조회한다.")
    void findOnlyAnchoredAnnotations() {
        Post post = new Post(
                new User("작성자", "author@example.com", null),
                "제목",
                """
                {"type":"doc","content":[{"type":"paragraph","content":[
                    {"type":"text","text":"남은 문장","marks":[{"type":"annotation","attrs":{"id":"1"}}]},
                    {"type":"text","text":" 지워진 문장"}
                ]}]}
                """,
                null,
                PostStatus.PUBLIC,
                "title",
                null,
                PostContentType.RICH_TEXT
        );
        PostAnnotation kept = mock(PostAnnotation.class);
        PostAnnotation orphan = mock(PostAnnotation.class);
        given(kept.getId()).willReturn(1L);
        given(orphan.getId()).willReturn(2L);
        given(postFinder.find(1L)).willReturn(post);
        given(postAnnotationRepository.findByPostIdAndStatusOrderByCreatedAtAsc(1L, PostAnnotationStatus.ACTIVE))
                .willReturn(List.of(kept, orphan));

        List<PostAnnotation> annotations = service.findByPost(1L, null);

        assertThat(annotations).containsExactly(kept);
    }

    @Test
    @DisplayName("문서에 남아 있지 않은 active annotation은 삭제 상태로 바꾼다.")
    void deleteMissingAnnotations() {
        PostAnnotation kept = mock(PostAnnotation.class);
        PostAnnotation removed = mock(PostAnnotation.class);
        given(kept.getId()).willReturn(1L);
        given(removed.getId()).willReturn(2L);
        given(postAnnotationRepository.findByPostIdAndStatus(10L, PostAnnotationStatus.ACTIVE))
                .willReturn(List.of(kept, removed));

        service.syncDeletedAnnotations(10L, java.util.Set.of(1L));

        verify(removed).markDeleted();
    }
}
