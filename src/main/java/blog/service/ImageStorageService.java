package blog.service;

import blog.domain.exception.BlogException;
import blog.domain.exception.DomainErrorCode;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;
import java.util.UUID;

@Service
public class ImageStorageService {

    private static final Path UPLOAD_DIRECTORY = Path.of("src/main/resources/static/uploads");

    public String store(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BlogException(DomainErrorCode.INVALID_INPUT, "업로드할 이미지가 없습니다.");
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new BlogException(DomainErrorCode.INVALID_INPUT, "이미지 파일만 업로드할 수 있습니다.");
        }

        try {
            Files.createDirectories(UPLOAD_DIRECTORY);
            String extension = extensionOf(file.getOriginalFilename(), contentType);
            String filename = UUID.randomUUID() + extension;
            Files.copy(file.getInputStream(), UPLOAD_DIRECTORY.resolve(filename));
            return "/uploads/" + filename;
        } catch (IOException exception) {
            throw new BlogException(DomainErrorCode.INVALID_INPUT, "이미지 업로드에 실패했습니다.");
        }
    }

    private String extensionOf(String originalFilename, String contentType) {
        if (originalFilename != null && originalFilename.contains(".")) {
            String extension = originalFilename.substring(originalFilename.lastIndexOf(".")).toLowerCase(Locale.ROOT);
            if (extension.matches("\\.(png|jpg|jpeg|gif|webp)")) {
                return extension;
            }
        }
        return switch (contentType) {
            case "image/png" -> ".png";
            case "image/gif" -> ".gif";
            case "image/webp" -> ".webp";
            default -> ".jpg";
        };
    }
}
