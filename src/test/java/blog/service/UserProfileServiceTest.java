package blog.service;

import blog.controller.dto.UserProfileUpdateRequest;
import blog.domain.User;
import blog.domain.exception.BlogException;
import blog.domain.exception.DomainErrorCode;
import blog.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

class UserProfileServiceTest {

    private final UserRepository userRepository = mock(UserRepository.class);
    private final UserService userService = new UserService(userRepository);

    @Test
    @DisplayName("사용자 프로필 소개와 링크를 수정한다.")
    void updateProfile() {
        // given
        User user = new User("사용자", "user", "user@example.com", null);
        given(userRepository.findById(1L)).willReturn(Optional.of(user));
        UserProfileUpdateRequest request = new UserProfileUpdateRequest(
                "백엔드를 공부합니다.",
                "https://github.com/user",
                "https://user.dev",
                "Spring,JPA"
        );

        // when
        userService.updateProfile(1L, request);

        // then
        assertThat(user.getBio()).isEqualTo("백엔드를 공부합니다.");
        assertThat(user.getGithubUrl()).isEqualTo("https://github.com/user");
        assertThat(user.getWebsiteUrl()).isEqualTo("https://user.dev");
        assertThat(user.getTechStack()).isEqualTo("Spring,JPA");
    }

    @Test
    @DisplayName("프로필 링크가 http 또는 https가 아니면 예외를 던진다.")
    void updateProfileFailWhenLinkSchemeIsUnsafe() {
        // given
        User user = new User("사용자", "user", "user@example.com", null);
        given(userRepository.findById(1L)).willReturn(Optional.of(user));
        UserProfileUpdateRequest request = new UserProfileUpdateRequest(
                "백엔드를 공부합니다.",
                "javascript:alert(1)",
                "https://user.dev",
                "Spring,JPA"
        );

        // when - then
        assertThatThrownBy(() -> userService.updateProfile(1L, request))
                .isInstanceOf(BlogException.class)
                .extracting("code")
                .isEqualTo(DomainErrorCode.INVALID_INPUT);
    }
}
