package blog.domain.exception;

public final class BlogException extends RuntimeException {

    private final DomainErrorCode code;
    private final String message;

    public BlogException(DomainErrorCode code, String message) {
        super(message);
        this.code = code;
        this.message = message;
    }

    public DomainErrorCode getCode() {
        return code;
    }

    @Override
    public String getMessage() {
        return message;
    }
}
