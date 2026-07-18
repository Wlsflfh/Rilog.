import {
    createComment,
    createPost,
    deleteComment,
    deletePost,
    getComments,
    getCurrentUser,
    getLikedUsers,
    getMyPosts,
    getMyStats,
    getPost,
    getPosts,
    getUserPosts,
    getUserProfile,
    likePost,
    logout,
    unlikePost,
    updateMyProfile,
    updatePost,
    uploadImage
} from "/js/api.js";
import {extractHeadings, renderMarkdown} from "/js/markdown.js";
import {
    createCanvasEditor,
    createEmptyCanvasDocument,
    renderCanvasDocument,
    serializeCanvasDocument
} from "/js/canvas-editor.js";
import {
    addColumnToMarkdownTable,
    addRowToMarkdownTable,
    applyMarkdownAutocomplete,
    applyMarkdownShortcut,
    createMarkdownTable,
    isInsideMarkdownTable,
    indentSelection
} from "/js/markdown-editor.js";
import {barWidth, createInsightMessage, formatStatNumber} from "/js/dashboard.js";
import {createBlogUrl, normalizeProfilePayload, safeExternalUrl} from "/js/profile-settings.js";

const app = document.querySelector("#app");
const toast = document.querySelector("#toast");
const profileMenu = document.querySelector("#profile-menu");
const state = {user: null};
const POST_CONTENT_TYPES = {
    MARKDOWN: "MARKDOWN",
    CANVAS: "CANVAS"
};

function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

function button(label, className, onClick) {
    const node = element("button", className, label);
    node.type = "button";
    node.addEventListener("click", onClick);
    return node;
}

function withTooltip(node, tooltip) {
    node.dataset.tooltip = tooltip;
    node.setAttribute("aria-label", tooltip);
    return node;
}

function formatDate(value) {
    if (!value) return "방금 전";
    return new Intl.DateTimeFormat("ko-KR", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
    }).format(new Date(value));
}

function safeImageUrl(value) {
    if (!value) return null;
    try {
        const url = new URL(value, window.location.origin);
        return ["http:", "https:"].includes(url.protocol) ? url.href : null;
    } catch {
        return null;
    }
}

function encodeHashSegment(value) {
    return encodeURIComponent(String(value));
}

function decodeHashSegment(value) {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}

function postHref(post) {
    if (!post.authorUsername) {
        return `#/posts/${post.id}`;
    }
    const slugOrId = post.slug || post.id;
    return `#/@${encodeHashSegment(post.authorUsername)}/posts/${encodeHashSegment(slugOrId)}`;
}

function showToast(message) {
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => {
        toast.hidden = true;
    }, 2600);
}

function closeImageLightbox() {
    document.querySelector(".image-lightbox")?.remove();
}

function openImageLightbox(source, alt = "") {
    closeImageLightbox();
    const lightbox = element("div", "image-lightbox");
    lightbox.setAttribute("role", "dialog");
    lightbox.setAttribute("aria-modal", "true");
    lightbox.setAttribute("aria-label", "이미지 확대 보기");

    const image = document.createElement("img");
    image.src = source;
    image.alt = alt;

    const close = button("×", "image-lightbox-close", closeImageLightbox);
    close.setAttribute("aria-label", "이미지 확대 닫기");
    lightbox.append(image, close);
    lightbox.addEventListener("click", event => {
        if (event.target === lightbox) closeImageLightbox();
    });
    document.body.append(lightbox);
    close.focus();
}

function showLoading() {
    app.replaceChildren();
    const loading = element("section", "loading-state");
    loading.setAttribute("aria-label", "불러오는 중");
    for (let index = 0; index < 3; index += 1) {
        loading.append(element("div", "skeleton-card"));
    }
    app.append(loading);
}

function showError(error, retry) {
    app.replaceChildren();
    const panel = element("section", "message-panel");
    panel.append(
        element("span", "message-symbol", "!"),
        element("h1", null, "잠시 문제가 생겼어요"),
        element("p", null, error.message || "요청을 처리하지 못했습니다.")
    );
    if (retry) panel.append(button("다시 시도", "button button-primary", retry));
    app.append(panel);
}

function requireLogin() {
    if (state.user) return true;
    window.location.href = "/oauth2/authorization/google";
    return false;
}

function postExcerpt(post) {
    if (post.summary) return post.summary;
    if (post.contentType === POST_CONTENT_TYPES.CANVAS) {
        try {
            const documentData = JSON.parse(post.content || "{}");
            const text = (documentData.nodes || [])
                    .filter(node => node.type === "text")
                    .map(node => node.content)
                    .join(" ")
                    .replace(/\s+/g, " ")
                    .trim();
            return text || "Canvas로 정리한 글입니다.";
        } catch {
            return "Canvas로 정리한 글입니다.";
        }
    }
    return post.content;
}

function createPostCard(post) {
    const card = element("article", "post-card");
    const content = element("a", "post-card-content");
    content.href = postHref(post);

    const category = element("span", "post-label", post.postStatus === "PRIVATE" ? "비공개" : "읽을거리");
    const title = element("h2", null, post.title);
    const summary = element("p", "post-summary", postExcerpt(post));
    const meta = element("div", "post-meta");
    meta.append(
        element("span", null, `${post.authorNickname} · ${formatDate(post.createdAt)}`),
        element("span", null, `조회 ${post.viewCount}`)
    );
    content.append(category, title, summary, meta);

    const imageUrl = safeImageUrl(post.thumbnailUrl);
    if (imageUrl) {
        const image = document.createElement("img");
        image.className = "post-thumbnail";
        image.src = imageUrl;
        image.alt = "";
        image.loading = "lazy";
        content.append(image);
        card.classList.add("has-thumbnail");
    }

    const like = button(`${post.liked ? "♥" : "♡"} ${post.likeCount}`, `like-button${post.liked ? " is-liked" : ""}`, async event => {
        event.stopPropagation();
        if (!requireLogin()) return;
        like.disabled = true;
        try {
            if (post.liked) {
                await unlikePost(post.id);
                post.liked = false;
                post.likeCount = Math.max(0, post.likeCount - 1);
            } else {
                await likePost(post.id);
                post.liked = true;
                post.likeCount += 1;
            }
            like.textContent = `${post.liked ? "♥" : "♡"} ${post.likeCount}`;
            like.classList.toggle("is-liked", post.liked);
        } catch (error) {
            showToast(error.message);
        } finally {
            like.disabled = false;
        }
    });

    card.append(content, like);
    return card;
}

function createSmallAvatar(user) {
    const avatar = element("span", "small-avatar");
    const imageUrl = safeImageUrl(user.profileImageUrl);
    if (imageUrl) {
        avatar.style.backgroundImage = `url("${imageUrl.replaceAll('"', "%22")}")`;
        avatar.textContent = "";
    } else {
        avatar.textContent = (user.nickname || "?").slice(0, 1);
    }
    return avatar;
}

function createLikeTooltip(users) {
    const tooltip = element("div", "like-tooltip");
    tooltip.setAttribute("role", "tooltip");
    tooltip.append(element("strong", null, "좋아요 누른 사람"));
    if (!users.length) {
        tooltip.append(element("p", "subtle-text", "아직 좋아요가 없어요."));
        return tooltip;
    }

    const list = element("div", "liked-user-list");
    users.forEach(user => {
        const item = element("span", "liked-user");
        item.append(createSmallAvatar(user), element("span", null, user.nickname));
        list.append(item);
    });
    tooltip.append(list);
    return tooltip;
}

function createDetailLikeAction(post, likedUsers) {
    const wrapper = element("div", "like-popover");
    const like = button(`${post.liked ? "♥" : "♡"} 좋아요 ${post.likeCount}`, `button like-button${post.liked ? " is-liked" : ""}`, async () => {
        if (!requireLogin()) return;
        try {
            post.liked ? await unlikePost(post.id) : await likePost(post.id);
            await renderDetail(post.id);
        } catch (error) {
            showToast(error.message);
        }
    });
    wrapper.append(like, createLikeTooltip(likedUsers));
    return wrapper;
}

function renderComments(postId, comments) {
    const section = element("section", "comments-section");
    section.append(element("h2", null, `댓글 ${comments.length}`));

    if (state.user) {
        const form = element("form", "comment-form");
        const textarea = document.createElement("textarea");
        textarea.required = true;
        textarea.maxLength = 1000;
        textarea.rows = 3;
        textarea.placeholder = "댓글을 남겨주세요.";
        const submit = button("댓글 남기기", "button button-primary", () => {});
        submit.type = "submit";
        form.append(textarea, submit);
        form.addEventListener("submit", async event => {
            event.preventDefault();
            submit.disabled = true;
            try {
                await createComment(postId, {content: textarea.value.trim()});
                showToast("댓글을 남겼어요.");
                await renderDetail(postId);
            } catch (error) {
                showToast(error.message);
            } finally {
                submit.disabled = false;
            }
        });
        section.append(form);
    } else {
        const login = element("a", "button button-secondary comment-login", "Google 로그인 후 댓글 남기기");
        login.href = "/oauth2/authorization/google";
        section.append(login);
    }

    const list = element("div", "comment-list");
    comments.forEach(comment => {
        const item = element("article", "comment-item");
        const meta = element("div", "comment-meta");
        const author = element("span", "comment-author");
        author.append(createSmallAvatar({
            nickname: comment.authorNickname,
            profileImageUrl: comment.authorProfileImageUrl
        }), element("strong", null, comment.authorNickname));
        meta.append(author, element("span", null, formatDate(comment.createdAt)));
        const content = element("p", "comment-content", comment.content);
        item.append(meta, content);
        if (comment.deletable) {
            item.append(button("삭제", "comment-delete", async () => {
                if (!window.confirm("이 댓글을 삭제할까요?")) return;
                try {
                    await deleteComment(postId, comment.id);
                    showToast("댓글을 삭제했어요.");
                    await renderDetail(postId);
                } catch (error) {
                    showToast(error.message);
                }
            }));
        }
        list.append(item);
    });
    section.append(list);
    return section;
}

function renderPostList(posts, options = {}) {
    const section = element("section", "feed-section");
    const heading = element("div", "section-heading");
    heading.append(element("h1", null, options.title || "새로운 글"));
    if (options.description) heading.append(element("p", null, options.description));
    section.append(heading);

    if (!posts.length) {
        const empty = element("div", "empty-state");
        empty.append(
            element("span", "empty-symbol", "✦"),
            element("h2", null, options.emptyTitle || "아직 글이 없어요"),
            element("p", null, options.emptyMessage || "첫 번째 이야기를 기다리고 있어요.")
        );
        if (state.user) {
            const writeLink = element("a", "button button-primary", "글 쓰러 가기");
            writeLink.href = "#/write";
            empty.append(writeLink);
        }
        section.append(empty);
    } else {
        const grid = element("div", "post-grid");
        posts.forEach(post => grid.append(createPostCard(post)));
        section.append(grid);
    }
    return section;
}

async function renderHome() {
    showLoading();
    try {
        const posts = await getPosts();
        app.replaceChildren();
        const hero = element("section", "hero");
        const heroCopy = element("div", "hero-copy");
        heroCopy.append(
            element("span", "hero-eyebrow", "Rilog for developers"),
            element("h1", null, "개발자의 기록이\n더 멀리 닿도록."),
            element("p", null, "Markdown으로 편하게 쓰고, 내 지식이 검색과 피드를 통해 조용히 발견되는 블로그 플랫폼.")
        );
        if (state.user) {
            const heroAction = element("a", "button button-primary hero-action", "새 글 쓰기");
            heroAction.href = "#/write";
            heroCopy.append(heroAction);
        } else if (!state.user) {
            const heroAction = element("a", "button button-primary hero-action", "Google로 시작하기");
            heroAction.href = "/oauth2/authorization/google";
            heroCopy.append(heroAction);
        }
        hero.append(heroCopy);
        app.append(hero, renderPostList(posts));
    } catch (error) {
        showError(error, renderHome);
    }
}

async function renderMyPosts() {
    if (!requireLogin()) return;
    showLoading();
    try {
        const posts = await getMyPosts();
        app.replaceChildren(renderPostList(posts, {
            title: "내가 쓴 글",
            description: "내 Rilog에 쌓인 공개 글과 비공개 메모를 관리하세요.",
            emptyTitle: "아직 작성한 글이 없어요",
            emptyMessage: "짧은 배움부터 가볍게 남겨보세요."
        }));
    } catch (error) {
        showError(error, renderMyPosts);
    }
}

async function copyText(value) {
    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        return;
    }
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.append(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    if (!copied) throw new Error("copy failed");
}

async function renderProfileSettings() {
    if (!requireLogin()) return;
    showLoading();
    try {
        const profile = await getUserProfile(state.user.username);
        const blogUrl = createBlogUrl(window.location.origin, profile.username);
        app.replaceChildren();

        const section = element("section", "settings-page");
        const heading = element("div", "section-heading");
        heading.append(
            element("span", "post-label", "Profile"),
            element("h1", null, "프로필 설정"),
            element("p", null, "내 블로그를 처음 방문한 개발자가 나를 이해할 수 있게 적어주세요.")
        );

        const form = element("form", "settings-card profile-settings-form");
        const bio = document.createElement("textarea");
        bio.maxLength = 500;
        bio.rows = 4;
        bio.placeholder = "예: Spring과 JPA를 공부하며 배운 것을 차분히 기록합니다.";
        bio.value = profile.bio || "";

        const githubUrl = document.createElement("input");
        githubUrl.type = "url";
        githubUrl.maxLength = 500;
        githubUrl.placeholder = "https://github.com/username";
        githubUrl.value = profile.githubUrl || "";

        const websiteUrl = document.createElement("input");
        websiteUrl.type = "url";
        websiteUrl.maxLength = 500;
        websiteUrl.placeholder = "https://example.com";
        websiteUrl.value = profile.websiteUrl || "";

        const techStack = document.createElement("input");
        techStack.maxLength = 300;
        techStack.placeholder = "Java, Spring Boot, JPA";
        techStack.value = profile.techStack || "";

        const actions = element("div", "form-actions");
        const openBlog = element("a", "button button-secondary", "내 블로그 보기");
        openBlog.href = `#/@${profile.username}`;
        const submit = button("저장하기", "button button-primary", () => {});
        submit.type = "submit";
        actions.append(openBlog, submit);

        const linkFields = element("div", "settings-grid");
        linkFields.append(
            formField("GitHub URL", githubUrl),
            formField("웹사이트 URL", websiteUrl)
        );

        form.append(
            formField("자기소개", bio),
            linkFields,
            formField("기술 스택", techStack),
            actions
        );

        form.addEventListener("submit", async event => {
            event.preventDefault();
            submit.disabled = true;
            try {
                await updateMyProfile(normalizeProfilePayload({
                    bio: bio.value,
                    githubUrl: githubUrl.value,
                    websiteUrl: websiteUrl.value,
                    techStack: techStack.value
                }));
                showToast("프로필을 저장했어요.");
                await renderProfileSettings();
            } catch (error) {
                showToast(error.message);
            } finally {
                submit.disabled = false;
            }
        });

        const copyCard = element("aside", "copy-url-card");
        copyCard.append(
            element("strong", null, "내 블로그 주소"),
            element("code", null, blogUrl),
            button("주소 복사", "button button-secondary", async () => {
                try {
                    await copyText(blogUrl);
                    showToast("블로그 주소를 복사했어요.");
                } catch {
                    showToast("주소 복사에 실패했어요.");
                }
            })
        );

        section.append(heading, form, copyCard);
        app.append(section);
    } catch (error) {
        showError(error, renderProfileSettings);
    }
}

function renderStatCard(label, value, description) {
    const card = element("article", "stat-card");
    card.append(
        element("span", "stat-label", label),
        element("strong", null, formatStatNumber(value)),
        element("p", null, description)
    );
    return card;
}

function renderDailyViews(dailyViews) {
    const max = Math.max(0, ...dailyViews.map(item => item.viewCount));
    const chart = element("section", "dashboard-card daily-chart");
    chart.append(
        element("span", "post-label", "7 days"),
        element("h2", null, "최근 조회 흐름")
    );
    const bars = element("div", "daily-bars");
    dailyViews.forEach(item => {
        const row = element("div", "daily-row");
        const date = new Date(`${item.date}T00:00:00`);
        row.append(
            element("span", "daily-date", `${date.getMonth() + 1}/${date.getDate()}`),
            element("span", "daily-track"),
            element("strong", null, formatStatNumber(item.viewCount))
        );
        row.querySelector(".daily-track").append(element("span", "daily-fill"));
        row.querySelector(".daily-fill").style.width = barWidth(item.viewCount, max);
        bars.append(row);
    });
    chart.append(bars);
    return chart;
}

function renderTopPosts(title, posts, metric) {
    const section = element("section", "dashboard-card top-posts-card");
    section.append(element("h2", null, title));
    if (!posts.length) {
        section.append(element("p", "subtle-text", "아직 표시할 글이 없어요."));
        return section;
    }
    const list = element("div", "top-post-list");
    posts.forEach((post, index) => {
        const item = element("a", "top-post-item");
        item.href = postHref({
            ...post,
            authorUsername: post.authorUsername || state.user?.username
        });
        const value = metric === "views" ? post.viewCount : metric === "likes" ? post.likeCount : post.commentCount;
        item.append(
            element("span", "top-rank", String(index + 1)),
            element("strong", null, post.title),
            element("small", null, formatStatNumber(value))
        );
        list.append(item);
    });
    section.append(list);
    return section;
}

async function renderDashboard() {
    if (!requireLogin()) return;
    showLoading();
    try {
        const stats = await getMyStats();
        app.replaceChildren();
        const section = element("section", "dashboard-page");
        const heading = element("div", "section-heading");
        heading.append(
            element("span", "post-label", "Dashboard"),
            element("h1", null, "내 기록의 성장"),
            element("p", null, stats.insightMessage || createInsightMessage(stats))
        );
        const cards = element("div", "stat-grid");
        cards.append(
            renderStatCard("작성한 글", stats.summary.postCount, "Rilog에 쌓인 글"),
            renderStatCard("총 조회수", stats.summary.totalViews, "발견된 횟수"),
            renderStatCard("총 좋아요", stats.summary.totalLikes, "공감 받은 순간"),
            renderStatCard("총 댓글", stats.summary.totalComments, "대화가 시작된 횟수")
        );
        const topGrid = element("div", "top-post-grid");
        topGrid.append(
            renderTopPosts("많이 읽힌 글", stats.topViewedPosts, "views"),
            renderTopPosts("좋아요를 많이 받은 글", stats.topLikedPosts, "likes"),
            renderTopPosts("댓글이 많은 글", stats.topCommentedPosts, "comments")
        );
        section.append(heading, cards, renderDailyViews(stats.dailyViews), topGrid);
        app.append(section);
    } catch (error) {
        showError(error, renderDashboard);
    }
}

async function renderUserBlog(username) {
    showLoading();
    try {
        const [profile, posts] = await Promise.all([
            getUserProfile(username),
            getUserPosts(username)
        ]);
        app.replaceChildren();

        const blogProfile = element("section", "blog-profile");
        blogProfile.append(
            createSmallAvatar({
                nickname: profile.nickname,
                profileImageUrl: profile.profileImageUrl
            }),
            element("div", "blog-profile-copy")
        );
        blogProfile.querySelector(".blog-profile-copy").append(
            element("span", "post-label", `@${profile.username}`),
            element("h1", null, profile.nickname),
            element("p", null, profile.bio || "Rilog에 쌓아가는 개발 기록")
        );
        const profileLinks = element("div", "profile-links");
        const githubUrl = safeExternalUrl(profile.githubUrl);
        if (githubUrl) {
            const github = element("a", null, "GitHub");
            github.href = githubUrl;
            github.target = "_blank";
            github.rel = "noreferrer";
            profileLinks.append(github);
        }
        const websiteUrl = safeExternalUrl(profile.websiteUrl);
        if (websiteUrl) {
            const website = element("a", null, "Website");
            website.href = websiteUrl;
            website.target = "_blank";
            website.rel = "noreferrer";
            profileLinks.append(website);
        }
        if (profile.techStack) profileLinks.append(element("span", null, profile.techStack));
        if (profileLinks.childElementCount) {
            blogProfile.querySelector(".blog-profile-copy").append(profileLinks);
        }

        app.append(blogProfile, renderPostList(posts, {
            title: `${profile.nickname}의 글`,
            emptyTitle: "아직 공개된 글이 없어요",
            emptyMessage: "이 블로그의 첫 번째 글을 기다리고 있어요."
        }));
    } catch (error) {
        showError(error, () => renderUserBlog(username));
    }
}

async function renderUserPost(username, slug) {
    showLoading();
    try {
        const decodedUsername = decodeHashSegment(username);
        const decodedSlug = decodeHashSegment(slug);
        const posts = await getUserPosts(decodedUsername);
        const post = posts.find(item => item.slug === decodedSlug || String(item.id) === decodedSlug);
        if (!post) throw new Error("존재하지 않는 글입니다.");
        await renderDetail(post.id);
    } catch (error) {
        showError(error, () => renderUserPost(username, slug));
    }
}

async function renderDetail(id) {
    showLoading();
    try {
        const [post, comments, likedUsers] = await Promise.all([
            getPost(id),
            getComments(id),
            getLikedUsers(id)
        ]);
        app.replaceChildren();
        const article = element("article", "post-detail");
        const label = element("span", "post-label", post.postStatus === "PRIVATE" ? "비공개" : "읽을거리");
        const title = element("h1", null, post.title);
        const meta = element("div", "detail-meta", `${post.authorNickname} · ${formatDate(post.createdAt)} · 조회 ${post.viewCount}`);
        article.append(label, title, meta);

        const imageUrl = safeImageUrl(post.thumbnailUrl);
        if (imageUrl) {
            const image = document.createElement("img");
            image.className = "detail-image";
            image.src = imageUrl;
            image.alt = "";
            article.append(image);
        }

        const isCanvasPost = post.contentType === POST_CONTENT_TYPES.CANVAS;
        const renderedContent = isCanvasPost
                ? renderCanvasDocument(post.content)
                : renderMarkdown(post.content);
        const detailContent = element("div", "detail-content");
        detailContent.classList.toggle("detail-content-canvas", isCanvasPost);
        detailContent.append(renderedContent);
        article.append(detailContent);
        const footer = element("div", "detail-actions");
        footer.append(createDetailLikeAction(post, likedUsers));

        if (state.user?.id === post.userId) {
            const edit = element("a", "button button-secondary", "수정");
            edit.href = `#/edit/${post.id}`;
            const remove = button("삭제", "button button-danger", async () => {
                if (!window.confirm("이 글을 삭제할까요?")) return;
                try {
                    await deletePost(post.id);
                    showToast("글을 삭제했어요.");
                    window.location.hash = "#/me";
                } catch (error) {
                    showToast(error.message);
                }
            });
            footer.append(edit, remove);
        }
        article.append(footer);
        article.append(renderComments(post.id, comments));

        const headings = isCanvasPost ? [] : extractHeadings(post.content);
        if (!headings.length) {
            app.append(article);
            return;
        }

        const layout = element("div", "post-detail-layout");
        const toc = element("nav", "post-toc");
        toc.setAttribute("aria-label", "글 목차");
        const tocList = element("ol", "post-toc-list");
        headings.forEach(heading => {
            const item = element("li", `post-toc-level-${heading.level}`);
            const link = element("a", null, heading.text);
            link.href = `#${heading.id}`;
            link.addEventListener("click", event => {
                event.preventDefault();
                document.getElementById(heading.id)?.scrollIntoView({
                    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
                    block: "start"
                });
            });
            item.append(link);
            tocList.append(item);
        });
        toc.append(tocList);
        layout.append(article, toc);
        app.append(layout);
    } catch (error) {
        showError(error, () => renderDetail(id));
    }
}

function formField(labelText, input) {
    const field = element("label", "form-field");
    field.append(element("span", "field-label", labelText), input);
    return field;
}

function replaceSelectionWithUndo(textarea, text, selectStart = text.length, selectEnd = selectStart) {
    textarea.focus();
    const usedNativeUndo = document.execCommand?.("insertText", false, text);
    if (!usedNativeUndo) {
        const start = textarea.selectionStart;
        textarea.setRangeText(text, start, textarea.selectionEnd, "end");
        textarea.dispatchEvent(new Event("input", {bubbles: true}));
    }
    const cursorBase = textarea.selectionStart - text.length;
    textarea.setSelectionRange(cursorBase + selectStart, cursorBase + selectEnd);
    textarea.dispatchEvent(new Event("input", {bubbles: true}));
    textarea.focus();
}

function insertMarkdown(textarea, before, after = before, placeholder = "텍스트") {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textarea.value.slice(start, end) || placeholder;
    textarea.setSelectionRange(start, end);
    replaceSelectionWithUndo(
        textarea,
        `${before}${selected}${after}`,
        before.length,
        before.length + selected.length
    );
}

function insertMarkdownBlock(textarea, block) {
    const start = textarea.selectionStart;
    textarea.setSelectionRange(start, textarea.selectionEnd);
    replaceSelectionWithUndo(textarea, block);
}

function applyTextareaEdit(textarea, edit) {
    const before = textarea.value;
    let prefix = 0;
    while (prefix < before.length && prefix < edit.value.length && before[prefix] === edit.value[prefix]) {
        prefix += 1;
    }

    let suffix = 0;
    while (
        suffix < before.length - prefix
        && suffix < edit.value.length - prefix
        && before[before.length - 1 - suffix] === edit.value[edit.value.length - 1 - suffix]
    ) {
        suffix += 1;
    }

    const replacement = edit.value.slice(prefix, edit.value.length - suffix);
    textarea.setSelectionRange(prefix, before.length - suffix);
    replaceSelectionWithUndo(
        textarea,
        replacement,
        edit.start - prefix,
        edit.end - prefix
    );
}

function handleAutoPair(event, textarea) {
    const pairs = {
        "`": "`",
        "(": ")",
        "[": "]",
        "{": "}",
        "\"": "\"",
        "'": "'"
    };
    if (!pairs[event.key] || event.metaKey || event.ctrlKey || event.altKey) return false;
    event.preventDefault();
    insertMarkdown(textarea, event.key, pairs[event.key], "");
    return true;
}

function handleMarkdownKeydown(event, textarea) {
    if (event.key === "Tab") {
        event.preventDefault();
        applyTextareaEdit(textarea, indentSelection({
            value: textarea.value,
            start: textarea.selectionStart,
            end: textarea.selectionEnd,
            outdent: event.shiftKey
        }));
        return true;
    }

    const shortcut = applyMarkdownShortcut({
        value: textarea.value,
        start: textarea.selectionStart,
        end: textarea.selectionEnd,
        key: event.key,
        metaKey: event.metaKey,
        ctrlKey: event.ctrlKey,
        altKey: event.altKey,
        shiftKey: event.shiftKey
    });
    if (shortcut) {
        event.preventDefault();
        applyTextareaEdit(textarea, shortcut);
        return true;
    }

    if ((event.key === "Enter" || event.key === " ") && !event.metaKey && !event.ctrlKey && !event.altKey) {
        const inserted = event.key === "Enter" ? "" : " ";
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const value = textarea.value.slice(0, start) + inserted + textarea.value.slice(end);
        const autocomplete = applyMarkdownAutocomplete({
            value,
            start: start + inserted.length,
            end: start + inserted.length,
            key: event.key
        });
        if (autocomplete) {
            event.preventDefault();
            applyTextareaEdit(textarea, autocomplete);
            return true;
        }
    }

    return handleAutoPair(event, textarea);
}

function markdownTableOverlayPosition(textarea) {
    const lines = textarea.value.split("\n");
    const position = textarea.selectionStart;
    let offset = 0;
    let lineIndex = 0;

    for (; lineIndex < lines.length; lineIndex += 1) {
        const nextOffset = offset + lines[lineIndex].length + 1;
        if (position < nextOffset) break;
        offset = nextOffset;
    }

    const isTableLine = line => {
        const trimmed = line.trim();
        return trimmed.startsWith("|") && trimmed.endsWith("|");
    };
    if (!isTableLine(lines[lineIndex] || "")) return null;

    let startLine = lineIndex;
    while (startLine > 0 && isTableLine(lines[startLine - 1])) startLine -= 1;

    let endLine = lineIndex;
    while (endLine + 1 < lines.length && isTableLine(lines[endLine + 1])) endLine += 1;

    const style = window.getComputedStyle(textarea);
    const lineHeight = Number.parseFloat(style.lineHeight) || 28;
    const paddingTop = Number.parseFloat(style.paddingTop) || 0;
    const paddingLeft = Number.parseFloat(style.paddingLeft) || 0;
    const font = [
        style.fontStyle,
        style.fontVariant,
        style.fontWeight,
        style.fontSize,
        style.fontFamily
    ].join(" ");
    const canvas = markdownTableOverlayPosition.canvas || document.createElement("canvas");
    markdownTableOverlayPosition.canvas = canvas;
    const context = canvas.getContext("2d");
    context.font = font;
    const tableWidth = lines
        .slice(startLine, endLine + 1)
        .reduce((longest, line) => Math.max(longest, context.measureText(line).width), 0);

    const inset = 4;
    const tableTop = paddingTop + startLine * lineHeight - textarea.scrollTop - inset;
    const tableBottom = paddingTop + (endLine + 1) * lineHeight - textarea.scrollTop + inset;
    const tableLeft = paddingLeft - textarea.scrollLeft - inset;
    const tableRight = tableLeft + tableWidth + inset * 2;
    const tableCenterX = (tableLeft + tableRight) / 2;
    const tableHeight = tableBottom - tableTop;
    const columnTop = tableTop + Math.min(Math.max(tableHeight / 2, 30), Math.max(30, tableHeight - 34));

    return {
        top: tableTop,
        left: tableLeft,
        width: tableRight - tableLeft,
        height: tableBottom - tableTop,
        columnTop,
        columnLeft: tableRight + 56,
        rowTop: tableBottom + 34,
        rowLeft: tableCenterX
    };
}

async function insertImageFile(textarea, file) {
    if (!file) return;
    await insertImageFiles(textarea, [file]);
}

async function insertImageFiles(textarea, files) {
    const images = Array.from(files || []).filter(file => file?.type.startsWith("image/"));
    if (!images.length) return;
    if (!requireLogin()) return;

    const marker = images.map((_, index) => `![업로드 중 ${index + 1}/${images.length}]()`).join("\n");
    const start = textarea.selectionStart;
    textarea.setRangeText(marker, start, textarea.selectionEnd, "end");
    textarea.dispatchEvent(new Event("input"));
    try {
        const results = await Promise.all(images.map(file => uploadImage(file)));
        const markdown = results.map(result => `![image](${result.url})`).join("\n");
        textarea.setRangeText(markdown, start, start + marker.length, "end");
        textarea.dispatchEvent(new Event("input"));
        showToast(images.length === 1 ? "이미지를 첨부했어요." : `이미지 ${images.length}장을 첨부했어요.`);
    } catch (error) {
        textarea.setRangeText("", start, start + marker.length, "end");
        textarea.dispatchEvent(new Event("input"));
        showToast(error.message);
    }
}

async function handleImagePaste(event, textarea) {
    const files = Array.from(event.clipboardData?.files || [])
            .filter(item => item.type.startsWith("image/"));
    if (!files.length) return;

    event.preventDefault();
    await insertImageFiles(textarea, files);
}

function createMarkdownEditor(textarea) {
    const editor = element("div", "markdown-editor");
    const toolbar = element("div", "markdown-toolbar");
    toolbar.setAttribute("aria-label", "Markdown 서식 도구");
    toolbar.addEventListener("mousedown", event => {
        if (event.target.closest("button")) {
            event.preventDefault();
        }
    });
    [
        ["제목", "# ", "", "제목", "제목 · Cmd+Option+1~6"],
        ["굵게", "**", "**", "강조할 내용", "굵게 · Cmd+B"],
        ["기울임", "*", "*", "기울일 내용", "기울임 · Cmd+I"],
        ["링크", "[", "](https://)", "링크 이름", "링크 · Cmd+K"],
        ["인용", "> ", "", "인용문", "인용문 · Cmd+Shift+9"],
        ["코드", "`", "`", "code", "인라인 코드 · Cmd+E"],
        ["목록", "- ", "", "목록 항목", "목록 · Cmd+Shift+8"],
        ["취소선", "~~", "~~", "취소할 내용", "취소선 · Cmd+Shift+X"]
    ].forEach(([label, before, after, placeholder, tooltip]) => {
        toolbar.append(withTooltip(
            button(label, "markdown-tool", () => insertMarkdown(textarea, before, after, placeholder)),
            tooltip
        ));
    });
    toolbar.append(withTooltip(
        button("개행", "markdown-tool", () => replaceSelectionWithUndo(textarea, "<br>")),
        "강제 줄바꿈 · <br>"
    ));
    toolbar.append(withTooltip(
        button("표", "markdown-tool", () => insertMarkdownBlock(textarea, createMarkdownTable())),
        "표 삽입"
    ));
    const imageInput = document.createElement("input");
    imageInput.className = "markdown-image-input";
    imageInput.type = "file";
    imageInput.accept = "image/*";
    imageInput.multiple = true;
    imageInput.setAttribute("aria-label", "이미지 파일 선택");
    imageInput.addEventListener("change", async () => {
        const files = Array.from(imageInput.files || []);
        imageInput.value = "";
        await insertImageFiles(textarea, files);
    });
    toolbar.append(
        withTooltip(button("이미지", "markdown-tool", () => {
            textarea.focus();
            imageInput.click();
        }), "이미지 업로드"),
        imageInput
    );

    const colorTools = element("div", "markdown-colors");
    colorTools.setAttribute("aria-label", "글자 색상");
    ["#071047", "#25339b", "#e5484d", "#0f8a5f", "#b46b00"].forEach(color => {
        const colorButton = button("", "markdown-color", () => {
            insertMarkdown(textarea, `<span style="color: ${color}">`, "</span>", "색상을 적용할 글");
        });
        colorButton.style.setProperty("--color-swatch", color);
        colorButton.dataset.tooltip = `${color} 색상 적용`;
        colorButton.setAttribute("aria-label", `${color} 색상 적용`);
        colorTools.append(colorButton);
    });

    const customColorWrap = element("div", "markdown-custom-color-wrap");
    const customColorLabel = element("label", "markdown-custom-color");
    customColorLabel.title = "직접 색상 선택";
    const customColor = document.createElement("input");
    customColor.type = "color";
    customColor.value = "#071047";
    customColor.setAttribute("aria-label", "직접 글자 색상 선택");
    const customColorApply = button("", "markdown-color markdown-custom-color-apply", () => {
        insertMarkdown(textarea, `<span style="color: ${customColor.value}">`, "</span>", "색상을 적용할 글");
    });
    const syncCustomColor = () => {
        customColorApply.style.setProperty("--color-swatch", customColor.value);
        customColorApply.dataset.tooltip = `${customColor.value} 색상 다시 적용`;
        customColorApply.setAttribute("aria-label", `${customColor.value} 색상 다시 적용`);
    };
    customColor.addEventListener("change", () => {
        syncCustomColor();
        insertMarkdown(textarea, `<span style="color: ${customColor.value}">`, "</span>", "색상을 적용할 글");
    });
    customColorLabel.append(customColor);
    syncCustomColor();
    customColorWrap.append(customColorLabel, customColorApply);
    colorTools.append(customColorWrap);
    toolbar.append(colorTools);

    const hint = element("span", "markdown-hint", "Markdown");
    hint.title = "Cmd/Ctrl+B/I/U/E/K, Cmd+Shift+X/7/8/9, Cmd+Option+1~6, Tab, 자동완성";
    toolbar.append(hint);

    const workspace = element("div", "markdown-workspace");
    const writing = element("div", "markdown-pane markdown-writing");
    writing.append(element("span", "pane-label", "작성"), textarea);
    const preview = element("div", "markdown-pane markdown-preview");
    preview.append(element("span", "pane-label", "미리보기"));

    const tableTools = element("div", "markdown-table-tools");
    tableTools.addEventListener("mousedown", event => {
        if (event.target.closest("button")) {
            event.preventDefault();
        }
    });
    const tableOutline = element("div", "markdown-table-outline");
    const addColumn = button("+ 열 추가", "markdown-table-tool markdown-table-tool-column", () => {
        const edit = addColumnToMarkdownTable({
            value: textarea.value,
            start: textarea.selectionStart,
            end: textarea.selectionEnd
        });
        if (edit) applyTextareaEdit(textarea, edit);
    });
    const addRow = button("+ 행 추가", "markdown-table-tool markdown-table-tool-row", () => {
        const edit = addRowToMarkdownTable({
            value: textarea.value,
            start: textarea.selectionStart,
            end: textarea.selectionEnd
        });
        if (edit) applyTextareaEdit(textarea, edit);
    });
    tableTools.hidden = true;
    tableTools.append(tableOutline, addColumn, addRow);
    writing.append(tableTools);

    const updatePreview = () => {
        const rendered = renderMarkdown(textarea.value);
        if (!textarea.value.trim()) rendered.append(element("p", "markdown-placeholder", "작성한 내용이 여기에 보여요."));
        preview.replaceChildren(element("span", "pane-label", "미리보기"), rendered);
    };
    const updateTableTools = () => {
        const insideTable = isInsideMarkdownTable({
            value: textarea.value,
            start: textarea.selectionStart
        });
        const position = insideTable ? markdownTableOverlayPosition(textarea) : null;
        tableTools.hidden = !position;
        if (!position) return;

        tableOutline.style.left = `${position.left}px`;
        tableOutline.style.top = `${position.top}px`;
        tableOutline.style.width = `${position.width}px`;
        tableOutline.style.height = `${position.height}px`;
        addColumn.style.left = `${position.columnLeft}px`;
        addColumn.style.top = `${position.columnTop}px`;
        addRow.style.left = `${position.rowLeft}px`;
        addRow.style.top = `${position.rowTop}px`;
    };
    textarea.addEventListener("input", updatePreview);
    textarea.addEventListener("input", updateTableTools);
    textarea.addEventListener("click", updateTableTools);
    textarea.addEventListener("keyup", updateTableTools);
    textarea.addEventListener("scroll", updateTableTools);
    textarea.addEventListener("keydown", event => {
        handleMarkdownKeydown(event, textarea);
    });
    textarea.addEventListener("paste", event => handleImagePaste(event, textarea));
    updatePreview();
    workspace.append(writing, preview);
    editor.append(toolbar, workspace);
    return editor;
}

function createMarkdownField(textarea) {
    const field = element("div", "form-field");
    const label = element("label", "field-label", "본문");
    textarea.id = "post-content";
    label.htmlFor = textarea.id;
    field.append(label, createMarkdownEditor(textarea));
    return field;
}

function createCanvasField(initialValue, onChange) {
    const field = element("div", "form-field");
    field.append(
        element("span", "field-label", "본문"),
        createCanvasEditor({
            initialValue,
            onChange,
            uploadImage
        })
    );
    return field;
}

function createVisibilitySelector(selectedValue) {
    const fieldset = element("fieldset", "visibility-field");
    fieldset.append(element("legend", "visibility-title", "공개 설정"));
    const options = element("div", "visibility-options");

    [
        ["PUBLIC", "🌐", "전체 공개", "누구나 이 글을 볼 수 있어요"],
        ["PRIVATE", "🔒", "비공개", "나만 볼 수 있어요"]
    ].forEach(([value, icon, title, description]) => {
        const label = element("label", "visibility-option");
        const radio = document.createElement("input");
        radio.type = "radio";
        radio.name = "postStatus";
        radio.value = value;
        radio.checked = selectedValue === value;
        label.append(
            radio,
            element("span", "visibility-icon", icon),
            element("span", "visibility-copy"),
            element("span", "visibility-check", "✓")
        );
        label.querySelector(".visibility-copy").append(
            element("strong", null, title),
            element("small", null, description)
        );
        options.append(label);
    });
    fieldset.append(options);
    return fieldset;
}

function draftKey(userId, contentType = POST_CONTENT_TYPES.MARKDOWN) {
    return `rilog-draft:${userId}:${contentType}`;
}

function readDraft(userId, contentType = POST_CONTENT_TYPES.MARKDOWN) {
    try {
        return JSON.parse(localStorage.getItem(draftKey(userId, contentType)) || "null");
    } catch {
        return null;
    }
}

function saveDraft(userId, contentType, draft) {
    localStorage.setItem(draftKey(userId, contentType), JSON.stringify({
        ...draft,
        contentType,
        savedAt: new Date().toISOString()
    }));
}

function clearDraft(userId, contentType = POST_CONTENT_TYPES.MARKDOWN) {
    localStorage.removeItem(draftKey(userId, contentType));
}

function normalizeEditorType(value) {
    return value?.toLowerCase() === "canvas" ? POST_CONTENT_TYPES.CANVAS : POST_CONTENT_TYPES.MARKDOWN;
}

function canvasSummary(content) {
    try {
        const documentData = JSON.parse(content || "{}");
        return (documentData.nodes || [])
                .filter(node => node.type === "text")
                .map(node => node.content)
                .join(" ")
                .replace(/\s+/g, " ")
                .trim()
                .slice(0, 160);
    } catch {
        return "";
    }
}

function createTemplateCard(type, title, description, href) {
    const card = element("a", "template-card");
    card.href = href;
    card.append(
        element("span", "template-badge", type),
        element("strong", null, title),
        element("p", null, description)
    );
    return card;
}

function renderTemplatePicker() {
    if (!requireLogin()) return;
    app.replaceChildren();
    const section = element("section", "template-page");
    section.append(
        element("span", "hero-eyebrow", "Rilog templates"),
        element("h1", null, "어떤 방식으로 기록할까요?"),
        element("p", null, "선형으로 정리할 땐 Markdown, 종이처럼 펼쳐놓고 생각할 땐 Canvas를 선택하세요.")
    );
    const grid = element("div", "template-grid");
    grid.append(
        createTemplateCard("Markdown", "Markdown으로 작성", "글, 코드, 표, 이미지 중심의 기본 개발 블로그 글쓰기.", "#/write?type=markdown"),
        createTemplateCard("Canvas", "Canvas로 작성", "텍스트와 이미지를 자유롭게 배치하는 공간형 기록.", "#/write?type=canvas")
    );
    section.append(grid);
    app.append(section);
}

async function renderEditor(editId, requestedType = POST_CONTENT_TYPES.MARKDOWN) {
    if (!requireLogin()) return;
    showLoading();
    try {
        const post = editId ? await getPost(editId) : null;
        if (post && state.user.id !== post.userId) throw new Error("수정 권한이 없습니다.");

        app.replaceChildren();
        const contentType = post?.contentType || requestedType;
        const draft = post ? null : readDraft(state.user.id, contentType);
        const section = element("section", "editor-page");

        const form = element("form", "editor-form");
        const title = document.createElement("input");
        title.className = "editor-title-input";
        title.required = true;
        title.maxLength = 255;
        title.placeholder = "제목을 입력하세요";
        title.setAttribute("aria-label", "제목");
        title.value = post?.title || draft?.title || "";

        const content = document.createElement("textarea");
        content.required = true;
        content.maxLength = 100000;
        content.rows = 14;
        content.placeholder = "당신의 이야기를 적어보세요...";
        content.value = post?.content || draft?.content || "";
        let canvasContent = post?.content || draft?.content || serializeCanvasDocument(createEmptyCanvasDocument());

        const thumbnail = document.createElement("input");
        thumbnail.type = "url";
        thumbnail.maxLength = 500;
        thumbnail.placeholder = "https://example.com/image.jpg";
        thumbnail.value = post?.thumbnailUrl || draft?.thumbnailUrl || "";

        const visibility = createVisibilitySelector(post?.postStatus || draft?.postStatus || "PUBLIC");

        const actions = element("div", "form-actions editor-actions");
        const cancel = element("a", "editor-exit", "← 나가기");
        cancel.href = post ? `#/posts/${post.id}` : "#/";
        const saveDraftButton = button("임시저장", "button button-secondary", () => {
            saveDraft(state.user.id, contentType, {
                title: title.value,
                content: contentType === POST_CONTENT_TYPES.CANVAS ? canvasContent : content.value,
                thumbnailUrl: thumbnail.value,
                postStatus: form.elements.postStatus.value
            });
            showToast("초안을 저장했어요.");
        });
        const submit = button(post ? "수정 완료" : "발행하기", "button button-primary", () => {});
        submit.type = "submit";
        actions.append(cancel);
        const actionGroup = element("div", "editor-action-group");
        if (!post) actionGroup.append(saveDraftButton);
        actionGroup.append(submit);
        actions.append(actionGroup);

        form.append(
            title,
            element("div", "editor-title-rule"),
            contentType === POST_CONTENT_TYPES.CANVAS
                    ? createCanvasField(canvasContent, value => {
                        canvasContent = value;
                    })
                    : createMarkdownField(content),
            element("div", "editor-options"),
            actions
        );
        form.querySelector(".editor-options").append(
            formField("썸네일 URL · 선택", thumbnail),
            visibility
        );
        form.addEventListener("submit", async event => {
            event.preventDefault();
            submit.disabled = true;
            const body = contentType === POST_CONTENT_TYPES.CANVAS ? canvasContent : content.value.trim();
            const payload = {
                title: title.value.trim(),
                content: body,
                contentType,
                summary: contentType === POST_CONTENT_TYPES.CANVAS
                        ? canvasSummary(body)
                        : body.replace(/\s+/g, " ").slice(0, 160),
                thumbnailUrl: thumbnail.value.trim() || null,
                postStatus: form.elements.postStatus.value
            };
            try {
                if (post) {
                    await updatePost(post.id, payload);
                    showToast("글을 수정했어요.");
                    window.location.hash = `#/posts/${post.id}`;
                } else {
                    const createdPost = await createPost(payload);
                    clearDraft(state.user.id, contentType);
                    showToast("글을 발행했어요.");
                    window.location.hash = `#/posts/${createdPost.id}`;
                }
            } catch (error) {
                showToast(error.message);
            } finally {
                submit.disabled = false;
            }
        });
        section.append(form);
        app.append(section);
        title.focus();
    } catch (error) {
        showError(error, () => renderEditor(editId));
    }
}

async function route() {
    profileMenu.hidden = true;
    const fullPath = window.location.hash.slice(1) || "/";
    const [path, queryString = ""] = fullPath.split("?");
    const query = new URLSearchParams(queryString);
    document.querySelectorAll("[data-nav]").forEach(link => {
        link.classList.toggle("is-active", link.getAttribute("href") === `#${path}`);
    });

    if (path === "/") return renderHome();
    if (path === "/me") return renderMyPosts();
    if (path === "/dashboard") return renderDashboard();
    if (path === "/settings/profile") return renderProfileSettings();
    if (path === "/write" && !query.has("type")) return renderTemplatePicker();
    if (path === "/write") return renderEditor(null, normalizeEditorType(query.get("type")));
    if (path.startsWith("/edit/")) return renderEditor(path.split("/")[2]);
    if (path.startsWith("/@") && path.includes("/posts/")) {
        const [usernamePart, slug] = path.slice(2).split("/posts/");
        return renderUserPost(usernamePart, slug);
    }
    if (path.startsWith("/@")) return renderUserBlog(decodeHashSegment(path.slice(2)));
    if (path.startsWith("/posts/")) return renderDetail(path.split("/")[2]);
    window.location.hash = "#/";
}

function updateAuthUi() {
    document.querySelectorAll(".auth-only").forEach(node => node.hidden = !state.user);
    document.querySelectorAll(".guest-only").forEach(node => node.hidden = Boolean(state.user));
    if (!state.user) return;

    const blogPath = `#/@${state.user.username}`;
    document.querySelector("#my-blog-link").href = blogPath;
    document.querySelector("#profile-blog-link").href = blogPath;

    document.querySelector("#profile-name").textContent = state.user.nickname;
    const avatar = document.querySelector("#profile-avatar");
    const profileImage = safeImageUrl(state.user.profileImageUrl);
    if (profileImage) {
        avatar.style.backgroundImage = `url("${profileImage.replaceAll('"', "%22")}")`;
        avatar.textContent = "";
    } else {
        avatar.textContent = state.user.nickname.slice(0, 1);
    }
}

function updateThemeButton(theme = window.blogTheme.current()) {
    document.querySelector("#theme-icon").textContent = theme === "dark" ? "☀" : "◐";
    document.querySelector("#theme-toggle").setAttribute(
        "aria-label",
        theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"
    );
}

document.querySelector("#theme-toggle").addEventListener("click", () => updateThemeButton(window.blogTheme.toggle()));
document.querySelector("#profile-button").addEventListener("click", event => {
    event.stopPropagation();
    profileMenu.hidden = !profileMenu.hidden;
});
document.addEventListener("click", () => {
    profileMenu.hidden = true;
});
document.addEventListener("click", event => {
    const image = event.target.closest(".markdown-body img");
    if (!image) return;
    openImageLightbox(image.currentSrc || image.src, image.alt);
});
document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeImageLightbox();
});
document.querySelector("#logout-button").addEventListener("click", async () => {
    try {
        await logout();
        state.user = null;
        updateAuthUi();
        showToast("로그아웃했어요.");
        window.location.hash = "#/";
        await route();
    } catch (error) {
        showToast(error.message);
    }
});
window.addEventListener("hashchange", route);

async function init() {
    updateThemeButton();
    try {
        state.user = await getCurrentUser();
    } catch (error) {
        showToast(error.message);
    }
    updateAuthUi();
    await route();
}

init();
