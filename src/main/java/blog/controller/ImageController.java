package blog.controller;

import blog.controller.dto.ImageUploadResponse;
import blog.service.ImageStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequiredArgsConstructor
public class ImageController {

    private final ImageStorageService imageStorageService;

    @PostMapping("/images")
    public ResponseEntity<ImageUploadResponse> upload(@RequestPart("file") MultipartFile file) {
        return ResponseEntity.ok(new ImageUploadResponse(imageStorageService.store(file)));
    }
}
