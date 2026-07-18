package blog.auth.oauth;

import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;

public record GoogleUserProfile(
        String subject,
        String email,
        String displayName,
        String profileImageUrl
) {

    /*
    Google에서 받은 사용자 정보를 우리 코드에서 쓰기 편하게 감싼 객체
     */

    public static GoogleUserProfile from(OidcUser user) {
        String subject = required(user.getSubject(), "sub");
        String email = required(user.getEmail(), "email");
        String displayName = required(user.getFullName(), "name");
        return new GoogleUserProfile(subject, email, displayName, user.getPicture());
    }

    private static String required(String value, String claimName) {
        if (value == null || value.isBlank()) {
            OAuth2Error error = new OAuth2Error(
                    "invalid_user_info",
                    "Google 사용자 정보에 " + claimName + " 값이 없습니다.",
                    null
            );
            throw new OAuth2AuthenticationException(error);
        }
        return value;
    }
}
