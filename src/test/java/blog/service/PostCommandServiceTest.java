package blog.service;

import blog.controller.dto.PostRequest;
import blog.domain.Post;
import blog.domain.PostCategory;
import blog.domain.PostContentType;
import blog.domain.PostStatus;
import blog.domain.User;
import blog.repository.PostRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

class PostCommandServiceTest {

    private final PostRepository postRepository = mock(PostRepository.class);
    private final PostFinder postFinder = mock(PostFinder.class);
    private final UserService userService = mock(UserService.class);
    private final SlugGenerator slugGenerator = mock(SlugGenerator.class);
    private final RichTextAnnotationExtractor richTextAnnotationExtractor = mock(RichTextAnnotationExtractor.class);
    private final PostAnnotationService postAnnotationService = mock(PostAnnotationService.class);
    private final PostCommandService postCommandService =
            new PostCommandService(postRepository, postFinder, userService, slugGenerator, richTextAnnotationExtractor, postAnnotationService);

    @Test
    @DisplayName("로그인한 사용자는 게시글을 작성할 수 있다.")
    void createByAuthenticatedUser() {
        // given
        User user = new User("방문자", "visitor@example.com", null);
        Post saved = mock(Post.class);
        given(saved.getId()).willReturn(1L);
        given(userService.getUser(1L)).willReturn(user);
        given(slugGenerator.generate(1L, "제목")).willReturn("title");
        given(postRepository.save(any(Post.class))).willReturn(saved);
        PostRequest request = new PostRequest("제목", "본문", null, null, PostContentType.MARKDOWN, PostCategory.IT, PostStatus.PUBLIC);

        // when
        postCommandService.create(1L, request);

        // then
        verify(postRepository).save(any(Post.class));
    }

    @Test
    @DisplayName("캔버스 글을 작성하면 글 타입을 함께 저장한다.")
    void createCanvasPost() {
        // given
        User user = new User("방문자", "visitor@example.com", null);
        Post saved = mock(Post.class);
        given(saved.getId()).willReturn(1L);
        given(userService.getUser(1L)).willReturn(user);
        given(slugGenerator.generate(1L, "제목")).willReturn("title");
        given(postRepository.save(any(Post.class))).willReturn(saved);
        PostRequest request = new PostRequest("제목", "{\"version\":1,\"nodes\":[]}", null, null, PostContentType.CANVAS, PostCategory.IT, PostStatus.PUBLIC);

        // when
        postCommandService.create(1L, request);

        // then
        ArgumentCaptor<Post> captor = ArgumentCaptor.forClass(Post.class);
        verify(postRepository).save(captor.capture());
        assertThat(captor.getValue().getContentType()).isEqualTo(PostContentType.CANVAS);
    }

    @Test
    @DisplayName("Rich Text 글을 작성하면 글 타입을 함께 저장한다.")
    void createRichTextPost() {
        // given
        User user = new User("방문자", "visitor@example.com", null);
        Post saved = mock(Post.class);
        given(saved.getId()).willReturn(1L);
        given(userService.getUser(1L)).willReturn(user);
        given(slugGenerator.generate(1L, "제목")).willReturn("title");
        given(postRepository.save(any(Post.class))).willReturn(saved);
        PostRequest request = new PostRequest(
                "제목",
                "{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"본문\"}]}]}",
                null,
                null,
                PostContentType.RICH_TEXT,
                PostCategory.IT,
                PostStatus.PUBLIC
        );

        // when
        postCommandService.create(1L, request);

        // then
        ArgumentCaptor<Post> captor = ArgumentCaptor.forClass(Post.class);
        verify(postRepository).save(captor.capture());
        assertThat(captor.getValue().getContentType()).isEqualTo(PostContentType.RICH_TEXT);
    }

    @Test
    @DisplayName("게시글을 작성하면 선택한 카테고리를 함께 저장한다.")
    void createPostCategory() {
        // given
        User user = new User("방문자", "visitor@example.com", null);
        Post saved = mock(Post.class);
        given(saved.getId()).willReturn(1L);
        given(userService.getUser(1L)).willReturn(user);
        given(slugGenerator.generate(1L, "제목")).willReturn("title");
        given(postRepository.save(any(Post.class))).willReturn(saved);
        PostRequest request = new PostRequest("제목", "본문", null, null, PostContentType.MARKDOWN, PostCategory.EXERCISE, PostStatus.PUBLIC);

        // when
        postCommandService.create(1L, request);

        // then
        ArgumentCaptor<Post> captor = ArgumentCaptor.forClass(Post.class);
        verify(postRepository).save(captor.capture());
        assertThat(captor.getValue().getCategory()).isEqualTo(PostCategory.EXERCISE);
    }

    @Test
    @DisplayName("Rich Text 글을 수정하면 남아 있는 annotation id 기준으로 삭제된 anchor를 정리한다.")
    void syncAnnotationsOnRichTextUpdate() {
        // given
        User user = new User("작성자", "author@example.com", null);
        ReflectionTestUtils.setField(user, "id", 1L);
        Post post = new Post(
                user,
                "제목",
                "{\"type\":\"doc\",\"content\":[]}",
                null,
                PostStatus.PUBLIC,
                "title",
                null,
                PostContentType.RICH_TEXT
        );
        given(postFinder.find(10L)).willReturn(post);
        String content = "{\"type\":\"doc\",\"content\":[]}";
        given(richTextAnnotationExtractor.extractAnnotationIds(content)).willReturn(java.util.Set.of(1L));
        PostRequest request = new PostRequest("제목", content, null, null, PostContentType.RICH_TEXT, PostCategory.IT, PostStatus.PUBLIC);

        // when
        postCommandService.update(10L, 1L, request);

        // then
        verify(postAnnotationService).syncDeletedAnnotations(10L, java.util.Set.of(1L));
    }
}
