package blog.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.net.URI;
import java.time.LocalDateTime;

import static blog.domain.exception.DomainErrorCode.INVALID_INPUT;
import static blog.domain.exception.DomainPreconditions.require;
import static blog.domain.exception.DomainPreconditions.requireNonNull;

@Getter
@Entity
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(
        name = "users",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_users_provider_subject",
                columnNames = {"provider", "provider_subject"}
        )
)
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nickname;

    @Column(nullable = false, unique = true)
    private String username;

    @Column(nullable = false)
    private String email;

    private String profileImageUrl;

    @Column(length = 500)
    private String bio;

    @Column(length = 500)
    private String githubUrl;

    @Column(length = 500)
    private String websiteUrl;

    @Column(length = 300)
    private String techStack;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false)
    private AuthProvider provider;

    @Column(nullable = false, updatable = false)
    private String providerSubject;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public User(String nickname, String email, String profileImageUrl) {
        this(nickname, defaultUsername(email), email, profileImageUrl);
    }

    public User(String nickname, String username, String email, String profileImageUrl) {
        this.nickname = requireNonNull(nickname, INVALID_INPUT, "이름은 비어있을 수 없습니다.");
        this.username = requireNonNull(username, INVALID_INPUT, "사용자명은 비어있을 수 없습니다.");
        this.email = requireNonNull(email, INVALID_INPUT, "e-mail 정보는 비어있을 수 없습니다.");
        this.profileImageUrl = profileImageUrl;
        this.provider = AuthProvider.LOCAL;
        this.providerSubject = email;
    }

    private User(
            AuthProvider provider,
            String providerSubject,
            String email,
            String nickname,
            String username,
            String profileImageUrl
    ) {
        this.provider = requireNonNull(provider, INVALID_INPUT, "인증 제공자는 비어있을 수 없습니다.");
        this.providerSubject = requireNonNull(providerSubject, INVALID_INPUT, "외부 사용자 식별자는 비어있을 수 없습니다.");
        this.email = requireNonNull(email, INVALID_INPUT, "e-mail 정보는 비어있을 수 없습니다.");
        this.nickname = requireNonNull(nickname, INVALID_INPUT, "이름은 비어있을 수 없습니다.");
        this.username = requireNonNull(username, INVALID_INPUT, "사용자명은 비어있을 수 없습니다.");
        this.profileImageUrl = profileImageUrl;
    }

    public static User google(String subject, String email, String nickname, String profileImageUrl) {
        return google(subject, email, nickname, defaultUsername(email), profileImageUrl);
    }

    public static User google(String subject, String email, String nickname, String username, String profileImageUrl) {
        return new User(AuthProvider.GOOGLE, subject, email, nickname, username, profileImageUrl);
    }

    public void synchronizeGoogleProfile(String email, String nickname, String profileImageUrl) {
        this.email = requireNonNull(email, INVALID_INPUT, "e-mail 정보는 비어있을 수 없습니다.");
        this.nickname = requireNonNull(nickname, INVALID_INPUT, "이름은 비어있을 수 없습니다.");
        this.profileImageUrl = profileImageUrl;
    }

    public boolean isWrittenBy(Long userId) {
        return id.equals(userId);
    }

    public void updateProfile(String bio, String githubUrl, String websiteUrl, String techStack) {
        validateProfileUrl(githubUrl);
        validateProfileUrl(websiteUrl);
        this.bio = bio;
        this.githubUrl = githubUrl;
        this.websiteUrl = websiteUrl;
        this.techStack = techStack;
    }

    private void validateProfileUrl(String url) {
        if (url == null || url.isBlank()) {
            return;
        }

        try {
            URI uri = URI.create(url);
            String scheme = uri.getScheme();
            require(
                    "http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme),
                    INVALID_INPUT,
                    "프로필 링크는 http 또는 https URL만 사용할 수 있습니다."
            );
        } catch (IllegalArgumentException exception) {
            throw new blog.domain.exception.BlogException(
                    INVALID_INPUT,
                    "프로필 링크 형식이 올바르지 않습니다."
            );
        }
    }

    private static String defaultUsername(String email) {
        if (email == null || !email.contains("@")) {
            return "user";
        }
        return email.substring(0, email.indexOf("@"));
    }

    @PrePersist
    public void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
