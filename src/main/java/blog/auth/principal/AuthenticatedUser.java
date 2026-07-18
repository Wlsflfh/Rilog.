package blog.auth.principal;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.core.oidc.OidcIdToken;
import org.springframework.security.oauth2.core.oidc.OidcUserInfo;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;

import java.util.Collection;
import java.util.Map;

public final class AuthenticatedUser implements OidcUser {

    /*
    이전에 직접 만들던 LoginMember, LoginUser 같은 역할

    Spring Security에서는 로그인 성공 후 현재 사용자 정보를 Authentication 안에 저장한다.
     */

    private final Long userId;
    private final OidcUser delegate;

    public AuthenticatedUser(Long userId, OidcUser delegate) {
        this.userId = userId;
        this.delegate = delegate;
    }

    public Long userId() {
        return userId;
    }

    @Override
    public Map<String, Object> getClaims() {
        return delegate.getClaims();
    }

    @Override
    public OidcUserInfo getUserInfo() {
        return delegate.getUserInfo();
    }

    @Override
    public OidcIdToken getIdToken() {
        return delegate.getIdToken();
    }

    @Override
    public Map<String, Object> getAttributes() {
        return delegate.getAttributes();
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return delegate.getAuthorities();
    }

    @Override
    public String getName() {
        return delegate.getName();
    }
}
