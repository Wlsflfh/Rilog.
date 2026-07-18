package blog.controller.dto;

import jakarta.validation.constraints.Size;

public record UserProfileUpdateRequest(
        @Size(max = 500, message = "소개는 500자 이하로 입력해주세요.")
        String bio,

        @Size(max = 500, message = "GitHub URL은 500자 이하로 입력해주세요.")
        String githubUrl,

        @Size(max = 500, message = "웹사이트 URL은 500자 이하로 입력해주세요.")
        String websiteUrl,

        @Size(max = 300, message = "기술 스택은 300자 이하로 입력해주세요.")
        String techStack
) {
}
