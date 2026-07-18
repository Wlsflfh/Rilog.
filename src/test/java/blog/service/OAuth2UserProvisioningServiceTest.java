package blog.service;

import blog.auth.oauth.GoogleUserProfile;
import blog.domain.AuthProvider;
import blog.domain.User;
import blog.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class OAuth2UserProvisioningServiceTest {

    private final UserRepository userRepository = mock(UserRepository.class);
    private final OAuth2UserProvisioningService service =
            new OAuth2UserProvisioningService(userRepository);

    @Test
    @DisplayName("처음 로그인한 Google 사용자를 등록한다.")
    void registerNewUser() {
        // given
        GoogleUserProfile profile = profile("google-sub", "user@example.com", "사용자");
        given(userRepository.findByProviderAndProviderSubject(AuthProvider.GOOGLE, "google-sub"))
                .willReturn(Optional.empty());
        given(userRepository.existsByUsername("user")).willReturn(false);
        given(userRepository.saveAndFlush(org.mockito.ArgumentMatchers.any(User.class)))
                .willAnswer(invocation -> invocation.getArgument(0, User.class));

        // when
        User user = service.provision(profile);

        // then
        assertThat(user.getProvider()).isEqualTo(AuthProvider.GOOGLE);
        assertThat(user.getProviderSubject()).isEqualTo("google-sub");
        assertThat(user.getUsername()).isEqualTo("user");
        verify(userRepository).saveAndFlush(user);
    }

    @Test
    @DisplayName("이메일 기반 사용자명이 중복되면 숫자를 붙여 등록한다.")
    void registerWithDuplicatedUsername() {
        // given
        GoogleUserProfile profile = profile("google-sub", "user@example.com", "사용자");
        given(userRepository.findByProviderAndProviderSubject(AuthProvider.GOOGLE, "google-sub"))
                .willReturn(Optional.empty());
        given(userRepository.existsByUsername("user")).willReturn(true);
        given(userRepository.existsByUsername("user2")).willReturn(false);
        given(userRepository.saveAndFlush(org.mockito.ArgumentMatchers.any(User.class)))
                .willAnswer(invocation -> invocation.getArgument(0, User.class));

        // when
        User user = service.provision(profile);

        // then
        assertThat(user.getUsername()).isEqualTo("user2");
    }

    @Test
    @DisplayName("다시 로그인한 Google 사용자의 프로필을 동기화한다.")
    void synchronizeReturningUser() {
        // given
        User user = User.google("google-sub", "old@example.com", "이전 이름", null);
        GoogleUserProfile profile = profile("google-sub", "new@example.com", "새 이름");
        given(userRepository.findByProviderAndProviderSubject(AuthProvider.GOOGLE, "google-sub"))
                .willReturn(Optional.of(user));

        // when
        User result = service.provision(profile);

        // then
        assertThat(result).isSameAs(user);
        assertThat(user.getEmail()).isEqualTo("new@example.com");
        assertThat(user.getNickname()).isEqualTo("새 이름");
    }

    @Test
    @DisplayName("동시에 등록된 Google 사용자는 유니크 충돌 후 기존 계정을 반환한다.")
    void recoverConcurrentRegistration() {
        // given
        GoogleUserProfile profile = profile("google-sub", "user@example.com", "사용자");
        User concurrentlyRegistered = User.google("google-sub", "user@example.com", "사용자", null);
        given(userRepository.findByProviderAndProviderSubject(AuthProvider.GOOGLE, "google-sub"))
                .willReturn(Optional.empty())
                .willReturn(Optional.of(concurrentlyRegistered));
        given(userRepository.saveAndFlush(org.mockito.ArgumentMatchers.any(User.class)))
                .willThrow(new DataIntegrityViolationException("duplicate provider subject"));

        // when
        User result = service.provision(profile);

        // then
        assertThat(result).isSameAs(concurrentlyRegistered);
    }

    private GoogleUserProfile profile(String subject, String email, String displayName) {
        return new GoogleUserProfile(subject, email, displayName, "https://example.com/profile.png");
    }
}
