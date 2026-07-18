package blog.controller.dto;

import blog.domain.PostStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record PostRequest(
        @NotBlank(message = "제목은 비어있을 수 없습니다.")
        @Size(max = 255, message = "제목은 255글자 이하여야 합니다.")
        String title,

        @NotBlank(message = "본문은 비어있을 수 없습니다.")
        @Size(max = 100_000, message = "본문은 100,000글자 이하여야 합니다.")
        String content,

        @Size(max = 500, message = "요약은 500글자 이하여야 합니다.")
        String summary,

        @Size(max = 500, message = "썸네일 URL은 500글자 이하여야 합니다.")
        String thumbnailUrl,

        @NotNull(message = "게시글 상태는 필수입니다.")
        PostStatus postStatus
) {
}
