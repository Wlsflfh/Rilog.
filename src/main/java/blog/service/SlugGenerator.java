package blog.service;

import blog.repository.PostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class SlugGenerator {

    private final PostRepository postRepository;

    public String generate(Long userId, String title) {
        String base = toSlug(title);
        if (!postRepository.existsByUserIdAndSlug(userId, base)) {
            return base;
        }

        int suffix = 2;
        while (postRepository.existsByUserIdAndSlug(userId, base + "-" + suffix)) {
            suffix++;
        }
        return base + "-" + suffix;
    }

    private String toSlug(String title) {
        String slug = title == null ? "" : title.toLowerCase()
                .replaceAll("[^a-z0-9가-힣]+", "-")
                .replaceAll("^-|-$", "");
        if (slug.isBlank()) {
            return "post";
        }
        return slug;
    }
}
