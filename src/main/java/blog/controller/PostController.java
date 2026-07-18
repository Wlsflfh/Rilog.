package blog.controller;

import blog.auth.principal.AuthenticatedUser;
import blog.controller.dto.CommentRequest;
import blog.controller.dto.CommentResponse;
import blog.controller.dto.LikeUserResponse;
import blog.controller.dto.PostRequest;
import blog.controller.dto.PostResponse;
import blog.service.PostCommentService;
import blog.service.PostCommandService;
import blog.service.PostLikeService;
import blog.service.PostQueryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/posts")
@RequiredArgsConstructor
public class PostController {

    private final PostCommandService postCommandService;
    private final PostQueryService postQueryService;
    private final PostLikeService postLikeService;
    private final PostCommentService postCommentService;

    @PostMapping
    public ResponseEntity<PostResponse> create(
            @AuthenticationPrincipal AuthenticatedUser user,
            @Valid @RequestBody PostRequest request
    ) {
        Long postId = postCommandService.create(user.userId(), request);
        PostResponse response = PostResponse.from(postQueryService.findByIdWithoutIncreasingView(postId, user.userId()));
        return ResponseEntity
                .created(URI.create("/posts/" + postId))
                .body(response);
    }

    @GetMapping
    public ResponseEntity<List<PostResponse>> findAll(
            @AuthenticationPrincipal AuthenticatedUser user
    ) {
        List<PostResponse> responses = postQueryService.findAll(userIdOrNull(user)).stream()
                .map(PostResponse::from)
                .toList();
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/{postId}")
    public ResponseEntity<PostResponse> findById(
            @PathVariable Long postId,
            @AuthenticationPrincipal AuthenticatedUser user
    ) {
        return ResponseEntity.ok(PostResponse.from(postQueryService.findById(postId, userIdOrNull(user))));
    }

    @GetMapping("/me")
    public ResponseEntity<List<PostResponse>> findMine(
            @AuthenticationPrincipal AuthenticatedUser user
    ) {
        List<PostResponse> responses = postQueryService.findByUser(user.userId(), user.userId()).stream()
                .map(PostResponse::from)
                .toList();
        return ResponseEntity.ok(responses);
    }

    @PutMapping("/{postId}")
    public ResponseEntity<Void> update(
            @PathVariable Long postId,
            @AuthenticationPrincipal AuthenticatedUser user,
            @Valid @RequestBody PostRequest request
    ) {
        postCommandService.update(postId, user.userId(), request);
        return ResponseEntity
                .noContent()
                .build();
    }

    @DeleteMapping("/{postId}")
    public ResponseEntity<Void> delete(
            @PathVariable Long postId,
            @AuthenticationPrincipal AuthenticatedUser user
    ) {
        postCommandService.delete(postId, user.userId());
        return ResponseEntity
                .noContent()
                .build();
    }

    @PutMapping("/{postId}/likes")
    public ResponseEntity<Void> like(
            @PathVariable Long postId,
            @AuthenticationPrincipal AuthenticatedUser user
    ) {
        postLikeService.like(postId, user.userId());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{postId}/likes")
    public ResponseEntity<Void> unlike(
            @PathVariable Long postId,
            @AuthenticationPrincipal AuthenticatedUser user
    ) {
        postLikeService.unlike(postId, user.userId());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{postId}/likes/users")
    public ResponseEntity<List<LikeUserResponse>> findLikedUsers(
            @PathVariable Long postId,
            @AuthenticationPrincipal AuthenticatedUser user
    ) {
        List<LikeUserResponse> responses = postLikeService.findLikedUsers(postId, userIdOrNull(user)).stream()
                .map(LikeUserResponse::from)
                .toList();
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/{postId}/comments")
    public ResponseEntity<List<CommentResponse>> findComments(
            @PathVariable Long postId,
            @AuthenticationPrincipal AuthenticatedUser user
    ) {
        Long viewerId = userIdOrNull(user);
        List<CommentResponse> responses = postCommentService.findByPost(postId, viewerId).stream()
                .map(comment -> CommentResponse.from(comment, viewerId))
                .toList();
        return ResponseEntity.ok(responses);
    }

    @PostMapping("/{postId}/comments")
    public ResponseEntity<Void> createComment(
            @PathVariable Long postId,
            @AuthenticationPrincipal AuthenticatedUser user,
            @Valid @RequestBody CommentRequest request
    ) {
        Long commentId = postCommentService.create(postId, user.userId(), request);
        return ResponseEntity
                .created(URI.create("/posts/" + postId + "/comments/" + commentId))
                .build();
    }

    @DeleteMapping("/{postId}/comments/{commentId}")
    public ResponseEntity<Void> deleteComment(
            @PathVariable Long postId,
            @PathVariable Long commentId,
            @AuthenticationPrincipal AuthenticatedUser user
    ) {
        postCommentService.delete(postId, commentId, user.userId());
        return ResponseEntity.noContent().build();
    }

    private Long userIdOrNull(AuthenticatedUser user) {
        return user == null ? null : user.userId();
    }

}
