package blog.controller.dto;

import blog.domain.User;

public record LikeUserResponse(
        Long id,
        String nickname,
        String profileImageUrl
) {

    public static LikeUserResponse from(User user) {
        return new LikeUserResponse(
                user.getId(),
                user.getNickname(),
                user.getProfileImageUrl()
        );
    }
}
