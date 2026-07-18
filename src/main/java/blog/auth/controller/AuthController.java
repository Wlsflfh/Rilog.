package blog.auth.controller;

import blog.auth.principal.AuthenticatedUser;
import blog.domain.User;
import blog.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserService userService;

    /*
    Spring Security의 OAuth2 로그인 자체는 보통 컨트롤러에서 직접 처리하지 않는다.

    Google 로그인 시작 URL은 기본적으로 이런 식이다.
        /oauth2/authorization/google

    Google 로그인 콜백도 Spring Security가 처리한다.
        /login/oauth2/code/google

    그래서 AuthController는 보통 “로그인 처리” 자체보다 현재 로그인 상태 확인 같은 API를 둔다.
     */

    @GetMapping("/me")
    public AuthenticatedUserResponse me(@AuthenticationPrincipal AuthenticatedUser user) {
        User domainUser = userService.getUser(user.userId());
        return new AuthenticatedUserResponse(
                user.userId(),
                user.getEmail(),
                user.getFullName(),
                user.getPicture(),
                domainUser.getUsername()
        );
    }

    @GetMapping("/csrf")
    public CsrfTokenResponse csrf(CsrfToken token) {
        return new CsrfTokenResponse(token.getHeaderName(), token.getParameterName(), token.getToken());
    }

    public record AuthenticatedUserResponse(
            Long id,
            String email,
            String nickname,
            String profileImageUrl,
            String username
    ) {
    }

    public record CsrfTokenResponse(String headerName, String parameterName, String token) {
    }
}
