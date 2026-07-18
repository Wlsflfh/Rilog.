# Post Likes Design

`PostLike`는 `Post`와 `User`를 단방향 `ManyToOne`으로 연결한다. 데이터베이스의 `(post_id, user_id)` 유니크 제약이 중복 좋아요를 최종 방어한다.

`PUT /posts/{postId}/likes`는 이미 존재하면 변경 없이 성공하고, 처음이면 관계를 저장한 뒤 `Post.likeCount`를 증가시킨다. `DELETE /posts/{postId}/likes`는 관계가 있을 때만 삭제하고 카운트를 감소시킨다. 두 API 모두 `204 No Content`를 반환한다.

게시글 조회 응답에는 `liked`를 추가한다. 선택적인 `X-USER-ID`가 있으면 현재 사용자의 좋아요 여부를 일괄 조회하고, 없으면 `false`를 반환한다. `/posts/me`는 기존 필수 헤더를 사용한다.

서비스 단위 테스트로 최초 등록, 중복 등록, 취소, 중복 취소를 검증하고 전체 테스트로 회귀를 확인한다.
