package blog.service;

import blog.auth.oauth.GoogleUserProfile;
import blog.domain.AuthProvider;
import blog.domain.User;
import blog.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class OAuth2UserProvisioningService {

    private final UserRepository userRepository;

    // Google 프로필로 우리 서비스 User를 준비한다.
    public User provision(GoogleUserProfile profile) {
        return userRepository
                // 1. provider = GOOGLE, providerSubject = Google sub 값으로 기존 유저를 찾는다.
                .findByProviderAndProviderSubject(AuthProvider.GOOGLE, profile.subject())
                // 2. 있으면 Google 프로필 정보와 동기화한다.
                .map(user -> synchronize(user, profile))
                // 3. 없으면 새 User로 가입시킨다.
                .orElseGet(() -> register(profile));
    }

    // 신규 가입 로직
    private User register(GoogleUserProfile profile) {
        User user = User.google(
                profile.subject(),
                profile.email(),
                profile.displayName(),
                generateUsername(profile.email()),
                profile.profileImageUrl()
        );
        try { // 동시성을 고려한 try-catch
            return userRepository.saveAndFlush(user); // 두 명 따닥 로그인 요청 시, DB UNIQUE 제약 때문에 예외 발생
        } catch (DataIntegrityViolationException exception) {
            return userRepository
                    .findByProviderAndProviderSubject(AuthProvider.GOOGLE, profile.subject())
                    .orElseThrow(() -> exception); // 하지만, 첫 요청이 처리가 되었으면 에러가 아니라, 정상 반환하는게 더 좋음
        }
    }

    // 기존 회원이 Google 계정 이름이나 프로필 이미지를 바꿨을 때, 우리 DB의 사용자 정보도 최신화하는 역할
    // 로그인할 때마다 우리 DB의 유저 정보를 업데이트해주는 방식.
    private User synchronize(User user, GoogleUserProfile profile) {
        user.synchronizeGoogleProfile(
                profile.email(),
                profile.displayName(),
                profile.profileImageUrl()
        );
        userRepository.save(user);
        return user;
    }

    private String generateUsername(String email) {
        String base = sanitizeUsername(email.substring(0, email.indexOf("@")));
        if (!userRepository.existsByUsername(base)) {
            return base;
        }

        int suffix = 2;
        while (userRepository.existsByUsername(base + suffix)) {
            suffix++;
        }
        return base + suffix;
    }

    private String sanitizeUsername(String value) {
        String sanitized = value.toLowerCase()
                .replaceAll("[^a-z0-9_]", "");
        if (sanitized.isBlank()) {
            return "user";
        }
        return sanitized;
    }
}
