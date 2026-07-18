package blog.auth.oauth;

import blog.auth.principal.AuthenticatedUser;
import blog.domain.User;
import blog.service.OAuth2UserProvisioningService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserRequest;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.stereotype.Service;

@Service
public class GoogleOidcUserService implements OAuth2UserService<OidcUserRequest, OidcUser> {

    /*
    Google 로그인 성공 후 사용자 정보를 가져와서, 우리 서비스의 사용자와 연결하는 역할

    Spring Security에서 Google 로그인이 성공하면 Google에서 이런 정보를 받아온다.
        sub(Google 사용자 고유 ID), email, name, picture
    그 정보를 그대로 쓰기보다, 우리 DB의 users 테이블에 저장하거나 기존 유저를 찾아야 한다.
     */

    private final OAuth2UserService<OidcUserRequest, OidcUser> delegate;
    private final OAuth2UserProvisioningService provisioningService;

    @Autowired
    public GoogleOidcUserService(OAuth2UserProvisioningService provisioningService) {
        this(new OidcUserService(), provisioningService);
    }

    GoogleOidcUserService(
            OAuth2UserService<OidcUserRequest, OidcUser> delegate,
            OAuth2UserProvisioningService provisioningService
    ) {
        this.delegate = delegate;
        this.provisioningService = provisioningService;
    }

    @Override
    public OidcUser loadUser(OidcUserRequest request) {
        OidcUser oidcUser = delegate.loadUser(request);
        User user = provisioningService.provision(GoogleUserProfile.from(oidcUser));
        return new AuthenticatedUser(user.getId(), oidcUser);
    }
}
