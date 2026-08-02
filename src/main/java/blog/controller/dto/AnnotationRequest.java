package blog.controller.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AnnotationRequest(
        @NotBlank(message = "선택한 문장을 확인해주세요.")
        @Size(max = 500, message = "선택한 문장은 500자 이하로 입력해주세요.")
        String quotedText,

        @NotBlank(message = "댓글 내용을 입력해주세요.")
        @Size(max = 1000, message = "댓글은 1000자 이하로 입력해주세요.")
        String content
) {
}
