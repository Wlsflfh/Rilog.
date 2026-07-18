package blog.auth.config;

import blog.global.ErrorResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class SecurityErrorWriter {

    /*
    공통으로 사용하는 에러 응답 도구

    JsonAuthenticationEntryPoint랑 JsonAccessDeniedHandler가 둘 다 JSON 응답을 써야 하니까,
    중복을 줄이기위한 클래스
     */

    private final ObjectMapper objectMapper;

    public void write(HttpServletResponse response, int status, String code, String message)
            throws IOException {
        response.setStatus(status);
        response.setCharacterEncoding("UTF-8");
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getWriter(), new ErrorResponse(code, message));
    }
}
