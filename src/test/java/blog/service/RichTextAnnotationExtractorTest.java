package blog.service;

import blog.domain.exception.BlogException;
import blog.domain.exception.DomainErrorCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class RichTextAnnotationExtractorTest {

    private final RichTextAnnotationExtractor extractor = new RichTextAnnotationExtractor();

    @Test
    @DisplayName("ProseMirror JSON에서 annotation mark id를 중복 없이 추출한다.")
    void extractAnnotationIds() {
        String content = """
                {
                  "type": "doc",
                  "content": [
                    {
                      "type": "paragraph",
                      "content": [
                        {
                          "type": "text",
                          "text": "댓글",
                          "marks": [
                            {"type": "annotation", "attrs": {"id": "1"}},
                            {"type": "strong"}
                          ]
                        },
                        {
                          "type": "text",
                          "text": " 유지",
                          "marks": [
                            {"type": "annotation", "attrs": {"id": 1}},
                            {"type": "annotation", "attrs": {"id": "2"}}
                          ]
                        }
                      ]
                    }
                  ]
                }
                """;

        assertThat(extractor.extractAnnotationIds(content)).containsExactlyInAnyOrder(1L, 2L);
    }

    @Test
    @DisplayName("유효하지 않은 Rich Text JSON은 거절한다.")
    void rejectInvalidJson() {
        assertThatThrownBy(() -> extractor.validate("{"))
                .isInstanceOf(BlogException.class)
                .extracting("code")
                .isEqualTo(DomainErrorCode.INVALID_INPUT);
    }

    @Test
    @DisplayName("ProseMirror 구조가 아닌 doc JSON은 거절한다.")
    void rejectMalformedDoc() {
        assertThatThrownBy(() -> extractor.validate("{\"type\":\"doc\",\"content\":{\"type\":\"paragraph\"}}"))
                .isInstanceOf(BlogException.class)
                .extracting("code")
                .isEqualTo(DomainErrorCode.INVALID_INPUT);
    }

    @Test
    @DisplayName("안전하지 않은 link mark는 거절한다.")
    void rejectUnsafeLinkMark() {
        String content = """
                {
                  "type": "doc",
                  "content": [
                    {
                      "type": "paragraph",
                      "content": [
                        {
                          "type": "text",
                          "text": "위험한 링크",
                          "marks": [
                            {"type": "link", "attrs": {"href": "javascript:alert(1)"}}
                          ]
                        }
                      ]
                    }
                  ]
                }
                """;

        assertThatThrownBy(() -> extractor.validate(content))
                .isInstanceOf(BlogException.class)
                .extracting("code")
                .isEqualTo(DomainErrorCode.INVALID_INPUT);
    }
}
