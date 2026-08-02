package blog.service;

import blog.domain.exception.BlogException;
import blog.domain.exception.DomainErrorCode;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.util.List;
import java.util.LinkedHashSet;
import java.util.Set;

@Component
public class RichTextAnnotationExtractor {

    private final ObjectMapper objectMapper = new ObjectMapper();

    public Set<Long> extractAnnotationIds(String content) {
        JsonNode root = parse(content);
        Set<Long> ids = new LinkedHashSet<>();
        collect(root, ids);
        return ids;
    }

    public void validate(String content) {
        parse(content);
    }

    private JsonNode parse(String content) {
        try {
            JsonNode root = objectMapper.readTree(content);
            if (root == null || !"doc".equals(root.path("type").asText())) {
                throw invalid();
            }
            validateNode(root, true);
            return root;
        } catch (BlogException exception) {
            throw exception;
        } catch (Exception exception) {
            throw invalid();
        }
    }

    private void collect(JsonNode node, Set<Long> ids) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return;
        }

        JsonNode marks = node.get("marks");
        if (marks != null && marks.isArray()) {
            for (JsonNode mark : marks) {
                if ("annotation".equals(mark.path("type").asText())) {
                    Long id = idOf(mark.path("attrs").path("id"));
                    if (id != null) {
                        ids.add(id);
                    }
                }
            }
        }

        JsonNode content = node.get("content");
        if (content != null && content.isArray()) {
            for (JsonNode child : content) {
                collect(child, ids);
            }
        }
    }

    private void validateNode(JsonNode node, boolean root) {
        if (!node.isObject()) {
            throw invalid();
        }
        String type = node.path("type").asText("");
        if (type.isBlank()) {
            throw invalid();
        }
        if (root && !"doc".equals(type)) {
            throw invalid();
        }
        if ("text".equals(type) && !node.path("text").isTextual()) {
            throw invalid();
        }

        JsonNode marks = node.get("marks");
        if (marks != null) {
            if (!marks.isArray()) {
                throw invalid();
            }
            for (JsonNode mark : marks) {
                validateMark(mark);
            }
        }

        JsonNode content = node.get("content");
        if (content == null) {
            return;
        }
        if (!content.isArray()) {
            throw invalid();
        }
        for (JsonNode child : content) {
            validateNode(child, false);
        }
    }

    private void validateMark(JsonNode mark) {
        if (!mark.isObject()) {
            throw invalid();
        }
        String type = mark.path("type").asText("");
        if (!List.of("annotation", "strong", "em", "code", "link").contains(type)) {
            throw invalid();
        }
        if ("annotation".equals(type) && idOf(mark.path("attrs").path("id")) == null) {
            throw invalid();
        }
        if ("link".equals(type) && !isSafeLink(mark.path("attrs").path("href").asText(""))) {
            throw invalid();
        }
    }

    private boolean isSafeLink(String href) {
        try {
            URI uri = URI.create(href);
            String scheme = uri.getScheme();
            return "http".equalsIgnoreCase(scheme)
                    || "https".equalsIgnoreCase(scheme)
                    || "mailto".equalsIgnoreCase(scheme);
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }

    private Long idOf(JsonNode idNode) {
        if (idNode == null || idNode.isMissingNode() || idNode.isNull()) {
            return null;
        }
        try {
            if (idNode.isNumber()) {
                return idNode.asLong();
            }
            String value = idNode.asText();
            return value == null || value.isBlank() ? null : Long.parseLong(value);
        } catch (NumberFormatException exception) {
            return null;
        }
    }

    private BlogException invalid() {
        return new BlogException(DomainErrorCode.INVALID_INPUT, "Rich Text 본문 형식이 올바르지 않습니다.");
    }
}
