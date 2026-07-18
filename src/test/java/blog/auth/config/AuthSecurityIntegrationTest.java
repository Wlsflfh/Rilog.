package blog.auth.config;

import blog.auth.principal.AuthenticatedUser;
import blog.domain.User;
import blog.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.oidc.OidcIdToken;
import org.springframework.security.oauth2.core.oidc.user.DefaultOidcUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.oidcLogin;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:auth-test;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.sql.init.mode=never",
        "spring.security.oauth2.client.registration.google.client-id=test-client",
        "spring.security.oauth2.client.registration.google.client-secret=test-secret"
})
@AutoConfigureMockMvc
@Transactional
class AuthSecurityIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Test
    @DisplayName("로그인하지 않은 사용자도 게시글 목록을 조회할 수 있다.")
    void allowPublicRead() throws Exception {
        // when - then
        mockMvc.perform(get("/posts"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("로그인하지 않은 사용자도 프론트엔드 화면과 정적 자원을 열 수 있다.")
    void allowFrontendAssets() throws Exception {
        // when - then
        mockMvc.perform(get("/"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/css/styles.css"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/js/app.js"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/js/markdown.js"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/icon.png"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("업로드된 이미지를 정적 리소스로 조회할 수 있다.")
    void findUploadedImage() throws Exception {
        // given
        Path uploadDirectory = Path.of("src/main/resources/static/uploads");
        Files.createDirectories(uploadDirectory);
        String filename = "test-" + UUID.randomUUID() + ".png";
        Path image = uploadDirectory.resolve(filename);
        Files.write(image, new byte[]{1, 2, 3});

        try {
            // when - then
            mockMvc.perform(get("/uploads/" + filename))
                    .andExpect(status().isOk());
        } finally {
            Files.deleteIfExists(image);
        }
    }

    @Test
    @DisplayName("로그인하지 않은 사용자의 쓰기 요청은 JSON 401을 반환한다.")
    void rejectAnonymousWrite() throws Exception {
        // when - then
        mockMvc.perform(post("/posts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "제목",
                                  "content": "본문",
                                  "postStatus": "PUBLIC"
                                }
                                """))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
    }

    @Test
    @DisplayName("로그인했더라도 CSRF 토큰이 없는 쓰기 요청은 JSON 403을 반환한다.")
    void rejectWriteWithoutCsrf() throws Exception {
        // when - then
        mockMvc.perform(post("/posts")
                        .with(oidcLogin().oidcUser(principal(1L)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACCESS_DENIED"));
    }

    @Test
    @DisplayName("로그인한 사용자는 자신의 인증 정보를 조회할 수 있다.")
    void findCurrentUser() throws Exception {
        // given
        User user = userRepository.save(new User("사용자", "user", "user@example.com", null));

        // when - then
        mockMvc.perform(get("/auth/me")
                        .with(oidcLogin().oidcUser(principal(user.getId(), "user@example.com"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(user.getId()))
                .andExpect(jsonPath("$.email").value("user@example.com"))
                .andExpect(jsonPath("$.username").value("user"));
    }

    @Test
    @DisplayName("로그인하지 않은 사용자는 내 통계를 조회할 수 없다.")
    void rejectAnonymousStats() throws Exception {
        // when - then
        mockMvc.perform(get("/stats/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
    }

    @Test
    @DisplayName("로그인한 사용자는 내 통계를 조회할 수 있다.")
    void findMyStats() throws Exception {
        // given
        User user = userRepository.save(new User("사용자", "user", "user@example.com", null));

        // when - then
        mockMvc.perform(get("/stats/me")
                        .with(oidcLogin().oidcUser(principal(user.getId(), "user@example.com"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.summary.postCount").value(0))
                .andExpect(jsonPath("$.dailyViews.length()").value(7))
                .andExpect(jsonPath("$.insightMessage").value("첫 번째 조회가 쌓이는 순간을 기다리고 있어요."));
    }

    @Test
    @DisplayName("로그인 사용자는 CSRF 토큰으로 게시글을 작성하고 생성된 글 정보를 받을 수 있다.")
    void createPostByAuthenticatedUser() throws Exception {
        // given
        User user = userRepository.save(new User("방문자", "visitor", "visitor@example.com", null));

        // when - then
        mockMvc.perform(post("/posts")
                        .with(oidcLogin().oidcUser(principal(user.getId(), "visitor@example.com")))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "제목",
                                  "content": "본문",
                                  "postStatus": "PUBLIC"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.slug").value("제목"));
    }

    @Test
    @DisplayName("로그인한 사용자는 CSRF 토큰과 함께 로그아웃할 수 있다.")
    void logout() throws Exception {
        // when - then
        mockMvc.perform(post("/logout")
                        .with(oidcLogin().oidcUser(principal(42L)))
                        .with(csrf()))
                .andExpect(status().isNoContent());
    }

    private AuthenticatedUser principal(Long userId) {
        return principal(userId, "user@example.com");
    }

    private AuthenticatedUser principal(Long userId, String email) {
        OidcIdToken idToken = new OidcIdToken(
                "token",
                Instant.now(),
                Instant.now().plusSeconds(300),
                Map.of(
                        "sub", "google-sub",
                        "email", email,
                        "name", "사용자",
                        "picture", "https://example.com/profile.png"
                )
        );
        DefaultOidcUser oidcUser = new DefaultOidcUser(
                Set.of(new SimpleGrantedAuthority("ROLE_USER")),
                idToken
        );
        return new AuthenticatedUser(userId, oidcUser);
    }
}
