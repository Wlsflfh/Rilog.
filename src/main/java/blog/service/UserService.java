package blog.service;

import blog.controller.dto.UserProfileUpdateRequest;
import blog.domain.User;
import blog.domain.exception.BlogException;
import blog.domain.exception.DomainErrorCode;
import blog.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Slf4j
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserService {

    private final UserRepository userRepository;

    public User getUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> {
                    log.info("사용자 조회 실패: userId={}, reason=not_found", userId);
                    return new BlogException(DomainErrorCode.NOT_FOUND, "존재하지 않는 사용자입니다.");
                });
    }

    public User getByUsername(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> {
                    log.info("사용자 조회 실패: username={}, reason=not_found", username);
                    return new BlogException(DomainErrorCode.NOT_FOUND, "존재하지 않는 사용자입니다.");
                });
    }

    @Transactional
    public void updateProfile(Long userId, UserProfileUpdateRequest request) {
        User user = getUser(userId);
        user.updateProfile(
                request.bio(),
                request.githubUrl(),
                request.websiteUrl(),
                request.techStack()
        );
    }
}
