package blog.controller.dto;

import blog.domain.User;

public record UserProfileResponse(
        Long id,
        String username,
        String nickname,
        String profileImageUrl,
        String bio,
        String githubUrl,
        String websiteUrl,
        String techStack
) {

    public static UserProfileResponse from(User user) {
        return new UserProfileResponse(
                user.getId(),
                user.getUsername(),
                user.getNickname(),
                user.getProfileImageUrl(),
                user.getBio(),
                user.getGithubUrl(),
                user.getWebsiteUrl(),
                user.getTechStack()
        );
    }
}
