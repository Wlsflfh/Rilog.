DROP TABLE IF EXISTS post_likes;
DROP TABLE IF EXISTS post_comments;
DROP TABLE IF EXISTS post_view_events;
DROP TABLE IF EXISTS posts;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    id                   BIGINT       NOT NULL AUTO_INCREMENT,
    nickname             VARCHAR(100) NOT NULL,
    username             VARCHAR(80)  NOT NULL,
    email                VARCHAR(255) NOT NULL,
    profile_image_url    VARCHAR(500),
    bio                  VARCHAR(500),
    github_url           VARCHAR(500),
    website_url          VARCHAR(500),
    tech_stack           VARCHAR(300),
    provider             VARCHAR(20)  NOT NULL,
    provider_subject     VARCHAR(255) NOT NULL,
    created_at           DATETIME(6)  NOT NULL,
    updated_at           DATETIME(6)  NOT NULL,

    PRIMARY KEY (id),
    UNIQUE KEY uk_users_provider_subject (provider, provider_subject),
    UNIQUE KEY uk_users_username (username)
);

CREATE TABLE posts (
    id               BIGINT       NOT NULL AUTO_INCREMENT,
    user_id          BIGINT       NOT NULL,
    title            VARCHAR(255) NOT NULL,
    slug             VARCHAR(255) NOT NULL,
    summary          VARCHAR(500),
    content          LONGTEXT     NOT NULL,
    thumbnail_url    VARCHAR(500),
    post_status      VARCHAR(20)  NOT NULL,
    view_count       BIGINT       NOT NULL DEFAULT 0,
    like_count       BIGINT       NOT NULL DEFAULT 0,
    created_at       DATETIME(6)  NOT NULL,
    updated_at       DATETIME(6)  NOT NULL,

    PRIMARY KEY (id),

    CONSTRAINT fk_posts_user
        FOREIGN KEY (user_id)
            REFERENCES users (id)
);

CREATE TABLE post_likes (
    id            BIGINT      NOT NULL AUTO_INCREMENT,
    post_id       BIGINT      NOT NULL,
    user_id       BIGINT      NOT NULL,
    created_at    DATETIME(6) NOT NULL,

    PRIMARY KEY (id),

    CONSTRAINT fk_post_likes_post
        FOREIGN KEY (post_id)
            REFERENCES posts (id),

    CONSTRAINT fk_post_likes_user
        FOREIGN KEY (user_id)
            REFERENCES users (id),

    UNIQUE KEY uk_post_likes_post_user (post_id, user_id)
);

CREATE TABLE post_comments (
    id            BIGINT        NOT NULL AUTO_INCREMENT,
    post_id       BIGINT        NOT NULL,
    user_id       BIGINT        NOT NULL,
    content       VARCHAR(1000) NOT NULL,
    created_at    DATETIME(6)   NOT NULL,
    updated_at    DATETIME(6)   NOT NULL,

    PRIMARY KEY (id),

    CONSTRAINT fk_post_comments_post
        FOREIGN KEY (post_id)
            REFERENCES posts (id),

    CONSTRAINT fk_post_comments_user
        FOREIGN KEY (user_id)
            REFERENCES users (id)
);

CREATE TABLE post_view_events (
    id            BIGINT      NOT NULL AUTO_INCREMENT,
    post_id       BIGINT      NOT NULL,
    viewer_id     BIGINT,
    created_at    DATETIME(6) NOT NULL,

    PRIMARY KEY (id),

    CONSTRAINT fk_post_view_events_post
        FOREIGN KEY (post_id)
            REFERENCES posts (id)
);

CREATE INDEX idx_posts_user_id ON posts (user_id);
CREATE INDEX idx_posts_created_at ON posts (created_at);
CREATE INDEX idx_posts_status_created_at ON posts (post_status, created_at);
CREATE UNIQUE INDEX uk_posts_user_slug ON posts (user_id, slug);

CREATE INDEX idx_post_likes_post_id ON post_likes (post_id);
CREATE INDEX idx_post_likes_user_id ON post_likes (user_id);

CREATE INDEX idx_post_comments_post_created_at ON post_comments (post_id, created_at);
CREATE INDEX idx_post_comments_user_id ON post_comments (user_id);

CREATE INDEX idx_post_view_events_post_created_at ON post_view_events (post_id, created_at);
