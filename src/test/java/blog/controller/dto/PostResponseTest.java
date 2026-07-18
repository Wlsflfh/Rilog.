package blog.controller.dto;

import blog.domain.Post;
import blog.domain.PostContentType;
import blog.domain.PostStatus;
import blog.domain.User;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class PostResponseTest {

    @Test
    @DisplayName("현재 사용자의 좋아요 여부를 응답에 포함한다.")
    void includeLiked() {
        // given
        User user = new User("사용자", "user@example.com", null);
        Post post = new Post(user, "제목", "본문", null, PostStatus.PUBLIC);

        // when
        PostResponse response = PostResponse.from(post, true);

        // then
        assertThat(response.liked()).isTrue();
    }

    @Test
    @DisplayName("게시글 타입을 응답에 포함한다.")
    void includeContentType() {
        // given
        User user = new User("사용자", "user@example.com", null);
        Post post = new Post(user, "제목", "{\"version\":1,\"nodes\":[]}", null, PostStatus.PUBLIC, "title", null, PostContentType.CANVAS);

        // when
        PostResponse response = PostResponse.from(post, false);

        // then
        assertThat(response.contentType()).isEqualTo(PostContentType.CANVAS);
    }
}
