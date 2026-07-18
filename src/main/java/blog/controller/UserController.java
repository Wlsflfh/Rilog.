package blog.controller;

import blog.auth.principal.AuthenticatedUser;
import blog.controller.dto.PostResponse;
import blog.controller.dto.UserProfileResponse;
import blog.controller.dto.UserProfileUpdateRequest;
import blog.domain.User;
import jakarta.validation.Valid;
import blog.service.PostQueryService;
import blog.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final PostQueryService postQueryService;

    @GetMapping("/{username}")
    public ResponseEntity<UserProfileResponse> findProfile(@PathVariable String username) {
        User user = userService.getByUsername(username);
        return ResponseEntity.ok(UserProfileResponse.from(user));
    }

    @GetMapping("/{username}/posts")
    public ResponseEntity<List<PostResponse>> findPosts(
            @PathVariable String username,
            @AuthenticationPrincipal AuthenticatedUser viewer
    ) {
        User user = userService.getByUsername(username);
        Long viewerId = viewer == null ? null : viewer.userId();
        List<PostResponse> responses = postQueryService.findByUser(user.getId(), viewerId).stream()
                .map(PostResponse::from)
                .toList();
        return ResponseEntity.ok(responses);
    }

    @PatchMapping("/me/profile")
    public ResponseEntity<Void> updateProfile(
            @AuthenticationPrincipal AuthenticatedUser user,
            @Valid @RequestBody UserProfileUpdateRequest request
    ) {
        userService.updateProfile(user.userId(), request);
        return ResponseEntity.noContent().build();
    }
}
