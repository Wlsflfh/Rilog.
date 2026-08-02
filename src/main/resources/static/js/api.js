let csrfToken;

async function request(path, options = {}) {
    const response = await fetch(path, {
        credentials: "same-origin",
        ...options,
        headers: {
            Accept: "application/json",
            ...options.headers
        }
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({message: "요청을 처리하지 못했습니다."}));
        const requestError = new Error(error.message || "요청을 처리하지 못했습니다.");
        requestError.status = response.status;
        requestError.code = error.code;
        throw requestError;
    }

    const contentType = response.headers.get("content-type") || "";
    if (response.status === 204 || !contentType.includes("application/json")) {
        return null;
    }
    return response.json();
}

async function csrfHeaders() {
    if (!csrfToken) {
        csrfToken = await request("/auth/csrf");
    }
    return {[csrfToken.headerName]: csrfToken.token};
}

async function mutation(path, method, body) {
    const headers = await csrfHeaders();
    if (body !== undefined) {
        headers["Content-Type"] = "application/json";
    }
    return request(path, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body)
    });
}

export async function getCurrentUser() {
    try {
        return await request("/auth/me");
    } catch (error) {
        if (error.status === 401) return null;
        throw error;
    }
}

export const getPosts = category => request(category ? `/posts?category=${encodeURIComponent(category)}` : "/posts");
export const getPost = id => request(`/posts/${id}`);
export const getMyPosts = () => request("/posts/me");
export const getMyStats = () => request("/stats/me");
export const getUserProfile = username => request(`/users/${username}`);
export const getUserPosts = username => request(`/users/${username}/posts`);
export const getComments = postId => request(`/posts/${postId}/comments`);
export const createComment = (postId, comment) => mutation(`/posts/${postId}/comments`, "POST", comment);
export const deleteComment = (postId, commentId) => mutation(`/posts/${postId}/comments/${commentId}`, "DELETE");
export const getAnnotations = postId => request(`/posts/${postId}/annotations`);
export const createAnnotation = (postId, annotation) => mutation(`/posts/${postId}/annotations`, "POST", annotation);
export const addAnnotationComment = (postId, annotationId, comment) => mutation(`/posts/${postId}/annotations/${annotationId}/comments`, "POST", comment);
export const deleteAnnotationComment = (postId, annotationId, commentId) => mutation(`/posts/${postId}/annotations/${annotationId}/comments/${commentId}`, "DELETE");
export const getLikedUsers = postId => request(`/posts/${postId}/likes/users`);
export const createPost = post => mutation("/posts", "POST", post);
export const updatePost = (id, post) => mutation(`/posts/${id}`, "PUT", post);
export const deletePost = id => mutation(`/posts/${id}`, "DELETE");
export const updateMyProfile = profile => mutation("/users/me/profile", "PATCH", profile);
export const likePost = id => mutation(`/posts/${id}/likes`, "PUT");
export const unlikePost = id => mutation(`/posts/${id}/likes`, "DELETE");
export async function uploadImage(file) {
    const headers = await csrfHeaders();
    const formData = new FormData();
    formData.append("file", file);
    return request("/images", {
        method: "POST",
        headers,
        body: formData
    });
}
export const logout = () => mutation("/logout", "POST");
