package blog.auth.oauth;

import blog.auth.principal.AuthenticatedUser;
import blog.domain.User;
import blog.service.OAuth2UserProvisioningService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserRequest;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService;
import org.springframework.security.oauth2.core.oidc.OidcIdToken;
import org.springframework.security.oauth2.core.oidc.user.DefaultOidcUser;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;

import java.time.Instant;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

@SuppressWarnings("unchecked")
class GoogleOidcUserServiceTest {

    private final OAuth2UserService<OidcUserRequest, OidcUser> delegate = mock(OAuth2UserService.class);
    private final OAuth2UserProvisioningService provisioningService = mock(OAuth2UserProvisioningService.class);
    private final GoogleOidcUserService userService =
            new GoogleOidcUserService(delegate, provisioningService);

    @Test
    @DisplayName("검증된 Google 사용자와 내부 사용자 ID를 세션 principal로 조립한다.")
    void loadUser() {
        // given
        OidcUserRequest request = mock(OidcUserRequest.class);
        OidcUser oidcUser = oidcUser();
        User user = mock(User.class);
        given(user.getId()).willReturn(42L);
        given(delegate.loadUser(request)).willReturn(oidcUser);
        given(provisioningService.provision(org.mockito.ArgumentMatchers.any(GoogleUserProfile.class)))
                .willReturn(user);

        // when
        AuthenticatedUser principal = (AuthenticatedUser) userService.loadUser(request);

        // then
        assertThat(principal.userId()).isEqualTo(42L);
        assertThat(principal.getSubject()).isEqualTo("google-sub");
    }

    private OidcUser oidcUser() {
        OidcIdToken idToken = new OidcIdToken(
                "token",
                Instant.now(),
                Instant.now().plusSeconds(300),
                Map.of(
                        "sub", "google-sub",
                        "email", "user@example.com",
                        "name", "사용자",
                        "picture", "https://example.com/profile.png"
                )
        );
        return new DefaultOidcUser(Set.of(new SimpleGrantedAuthority("ROLE_USER")), idToken);
    }
}
