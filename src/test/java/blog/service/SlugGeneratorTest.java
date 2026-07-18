package blog.service;

import blog.repository.PostRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

class SlugGeneratorTest {

    private final PostRepository postRepository = mock(PostRepository.class);
    private final SlugGenerator slugGenerator = new SlugGenerator(postRepository);

    @Test
    @DisplayName("제목에서 영문 slug를 만든다.")
    void generateSlug() {
        // given
        given(postRepository.existsByUserIdAndSlug(1L, "spring-jpa-study")).willReturn(false);

        // when
        String slug = slugGenerator.generate(1L, "Spring JPA Study!");

        // then
        assertThat(slug).isEqualTo("spring-jpa-study");
    }

    @Test
    @DisplayName("slug가 중복되면 숫자를 붙인다.")
    void generateDuplicatedSlug() {
        // given
        given(postRepository.existsByUserIdAndSlug(1L, "spring-jpa-study")).willReturn(true);
        given(postRepository.existsByUserIdAndSlug(1L, "spring-jpa-study-2")).willReturn(false);

        // when
        String slug = slugGenerator.generate(1L, "Spring JPA Study");

        // then
        assertThat(slug).isEqualTo("spring-jpa-study-2");
    }
}
