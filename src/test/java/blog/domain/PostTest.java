package blog.domain;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static blog.domain.exception.DomainErrorCode.UNAUTHORIZED_USER;
import static org.assertj.core.api.AssertionsForClassTypes.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

class PostTest {

    @Test
    @DisplayName("게시글 생성 시 조회수와 좋아요 수는 0 그리고 공개 상태로 초기화된다")
    void createPost() {
        // given
        User user = new User("진리로", "jinriro@example.com", null);

        // when
        Post post = new Post(
                user,
                "제목",
                "본문",
                "https://example.com/image.png",
                PostStatus.PUBLIC
        );

        // then
        assertThat(post.getPostStatus()).isEqualTo(PostStatus.PUBLIC);
        assertThat(post.getViewCount()).isZero();
        assertThat(post.getLikeCount()).isZero();
    }

    @Test
    @DisplayName("게시글은 제목 기반 slug와 요약을 가진다.")
    void createPostMetadata() {
        // given
        User user = new User("사용자", "user@example.com", null);

        // when
        Post post = new Post(
                user,
                "Spring JPA 연구 탐구",
                "본문입니다.",
                null,
                PostStatus.PUBLIC,
                "spring-jpa",
                "JPA 정리"
        );

        // then
        assertThat(post.getSlug()).isEqualTo("spring-jpa");
        assertThat(post.getSummary()).isEqualTo("JPA 정리");
    }

    @Test
    @DisplayName("조회수를 1 증가시킨다")
    void increaseViewCountTest() {
        // given
        Post post = new Post();
        long before = post.getViewCount();

        // when
        post.increaseViewCount();

        // then
        assertThat(post.getViewCount()).isEqualTo(before + 1);
    }

    @Test
    @DisplayName("좋아요 수를 1 증가시킨다")
    void increaseLikeCountTest() {
        // given
        Post post = new Post();
        long before = post.getLikeCount();

        // when
        post.increaseLikeCount();

        // then
        assertThat(post.getLikeCount()).isEqualTo(before + 1);
    }

    @Test
    @DisplayName("작성자가 아닌 사용자가 게시글을 조작하면 권한 예외를 던진다.")
    void ensureOwnedBy() {
        // given
        User user = mock(User.class);
        given(user.isWrittenBy(2L)).willReturn(false);
        Post post = new Post(user, "제목", "본문", null, PostStatus.PUBLIC);

        // when - then
        assertThatThrownBy(() -> post.ensureOwnedBy(2L))
                .isInstanceOf(blog.domain.exception.BlogException.class)
                .extracting("code")
                .isEqualTo(UNAUTHORIZED_USER);
    }
}
