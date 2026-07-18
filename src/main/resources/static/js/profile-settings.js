function optionalText(value) {
    const trimmed = (value || "").trim();
    return trimmed || null;
}

export function normalizeProfilePayload(values) {
    return {
        bio: optionalText(values.bio),
        githubUrl: optionalText(values.githubUrl),
        websiteUrl: optionalText(values.websiteUrl),
        techStack: optionalText(values.techStack)
    };
}

export function createBlogUrl(origin, username) {
    return `${origin}/#/@${username}`;
}

export function safeExternalUrl(value) {
    if (!value) return null;
    try {
        const url = new URL(value);
        return ["http:", "https:"].includes(url.protocol) ? url.href : null;
    } catch {
        return null;
    }
}
