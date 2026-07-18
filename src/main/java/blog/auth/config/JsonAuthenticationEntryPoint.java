package blog.auth.config;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class JsonAuthenticationEntryPoint implements AuthenticationEntryPoint { // 인증 실패 처리

    /*
    로그인하지 않은 user가 요청을 보냈을 때, Spring Security가 컨트롤러까지 보내지 않고 막는다.
    그때 기본으로는 로그인 페이지로 리다이렉트될 수 있는데, REST API에서는 JSON을 내려주는 게 좋으니 여기서 처리해준다.
     */

    private final SecurityErrorWriter errorWriter;

    @Override
    public void commence(
            HttpServletRequest request,
            HttpServletResponse response,
            AuthenticationException exception
    ) throws IOException, ServletException {
        errorWriter.write(
                response,
                HttpStatus.UNAUTHORIZED.value(),
                "UNAUTHENTICATED",
                "로그인이 필요합니다."
        );
    }
}
