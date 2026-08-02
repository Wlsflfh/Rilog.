package blog.controller;

import blog.auth.principal.AuthenticatedUser;
import blog.controller.dto.AnnotationCommentRequest;
import blog.controller.dto.AnnotationResponse;
import blog.controller.dto.AnnotationRequest;
import blog.controller.dto.CommentRequest;
import blog.controller.dto.CommentResponse;
import blog.controller.dto.LikeUserResponse;
import blog.controller.dto.PostRequest;
import blog.controller.dto.PostResponse;
import blog.domain.PostAnnotation;
import blog.domain.PostAnnotationComment;
import blog.domain.PostCategory;
import blog.service.PostAnnotationService;
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
import java.util.Map;

@RestController
@RequestMapping("/posts")
@RequiredArgsConstructor
public class PostController {

    private final PostCommandService postCommandService;
    private final PostQueryService postQueryService;
    private final PostLikeService postLikeService;
    private final PostCommentService postCommentService;
    private final PostAnnotationService postAnnotationService;

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
            @RequestParam(required = false) PostCategory category,
            @AuthenticationPrincipal AuthenticatedUser user
    ) {
        List<PostResponse> responses = postQueryService.findAll(userIdOrNull(user), category).stream()
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

    @GetMapping("/{postId}/annotations")
    public ResponseEntity<List<AnnotationResponse>> findAnnotations(
            @PathVariable Long postId,
            @AuthenticationPrincipal AuthenticatedUser user
    ) {
        Long viewerId = userIdOrNull(user);
        List<PostAnnotation> annotations = postAnnotationService.findByPost(postId, viewerId);
        Map<Long, List<PostAnnotationComment>> commentsByAnnotationId =
                postAnnotationService.findCommentsByAnnotationIds(annotations.stream()
                        .map(PostAnnotation::getId)
                        .toList());
        List<AnnotationResponse> responses = annotations.stream()
                .map(annotation -> AnnotationResponse.from(
                        annotation,
                        commentsByAnnotationId.getOrDefault(annotation.getId(), List.of()),
                        viewerId
                ))
                .toList();
        return ResponseEntity.ok(responses);
    }

    @PostMapping("/{postId}/annotations")
    public ResponseEntity<AnnotationResponse> createAnnotation(
            @PathVariable Long postId,
            @AuthenticationPrincipal AuthenticatedUser user,
            @Valid @RequestBody AnnotationRequest request
    ) {
        Long annotationId = postAnnotationService.create(postId, user.userId(), request);
        PostAnnotation annotation = postAnnotationService.findActive(postId, annotationId);
        AnnotationResponse response = AnnotationResponse.from(
                annotation,
                postAnnotationService.findComments(annotation.getId()),
                user.userId()
        );
        return ResponseEntity
                .created(URI.create("/posts/" + postId + "/annotations/" + annotationId))
                .body(response);
    }

    @PostMapping("/{postId}/annotations/{annotationId}/comments")
    public ResponseEntity<Void> addAnnotationComment(
            @PathVariable Long postId,
            @PathVariable Long annotationId,
            @AuthenticationPrincipal AuthenticatedUser user,
            @Valid @RequestBody AnnotationCommentRequest request
    ) {
        Long commentId = postAnnotationService.addComment(postId, annotationId, user.userId(), request);
        return ResponseEntity
                .created(URI.create("/posts/" + postId + "/annotations/" + annotationId + "/comments/" + commentId))
                .build();
    }

    @DeleteMapping("/{postId}/annotations/{annotationId}/comments/{commentId}")
    public ResponseEntity<Void> deleteAnnotationComment(
            @PathVariable Long postId,
            @PathVariable Long annotationId,
            @PathVariable Long commentId,
            @AuthenticationPrincipal AuthenticatedUser user
    ) {
        postAnnotationService.deleteComment(postId, annotationId, commentId, user.userId());
        return ResponseEntity.noContent().build();
    }

    private Long userIdOrNull(AuthenticatedUser user) {
        return user == null ? null : user.userId();
    }

}
