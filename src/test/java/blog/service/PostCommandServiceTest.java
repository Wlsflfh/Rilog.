package blog.service;

import blog.controller.dto.PostRequest;
import blog.domain.Post;
import blog.domain.PostContentType;
import blog.domain.PostStatus;
import blog.domain.User;
import blog.repository.PostRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

class PostCommandServiceTest {

    private final PostRepository postRepository = mock(PostRepository.class);
    private final PostFinder postFinder = mock(PostFinder.class);
    private final UserService userService = mock(UserService.class);
    private final SlugGenerator slugGenerator = mock(SlugGenerator.class);
    private final PostCommandService postCommandService =
            new PostCommandService(postRepository, postFinder, userService, slugGenerator);

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
        PostRequest request = new PostRequest("제목", "본문", null, null, PostStatus.PUBLIC);

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
        PostRequest request = new PostRequest("제목", "{\"version\":1,\"nodes\":[]}", null, null, PostContentType.CANVAS, PostStatus.PUBLIC);

        // when
        postCommandService.create(1L, request);

        // then
        ArgumentCaptor<Post> captor = ArgumentCaptor.forClass(Post.class);
        verify(postRepository).save(captor.capture());
        assertThat(captor.getValue().getContentType()).isEqualTo(PostContentType.CANVAS);
    }
}
