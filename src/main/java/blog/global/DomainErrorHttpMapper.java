package blog.global;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import blog.domain.exception.DomainErrorCode;

@Component
public class DomainErrorHttpMapper {

    public HttpStatus statusOf(final DomainErrorCode code) {
        return switch (code) {
            case INVALID_INPUT -> HttpStatus.BAD_REQUEST;
            case DUPLICATE, REFERENTIAL_INTEGRITY -> HttpStatus.CONFLICT;
            case NOT_FOUND -> HttpStatus.NOT_FOUND;
            case INVALID_LOGIN, UNAUTHENTICATED -> HttpStatus.UNAUTHORIZED;
            case UNAUTHORIZED_USER -> HttpStatus.FORBIDDEN;
        };
    }
}
