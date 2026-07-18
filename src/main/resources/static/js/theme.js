(function () {
    const storageKey = "rilog-theme";
    const savedTheme = localStorage.getItem(storageKey);
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialTheme = savedTheme || (systemPrefersDark ? "dark" : "light");

    document.documentElement.dataset.theme = initialTheme;

    window.blogTheme = {
        current() {
            return document.documentElement.dataset.theme;
        },
        toggle() {
            const nextTheme = this.current() === "dark" ? "light" : "dark";
            document.documentElement.dataset.theme = nextTheme;
            localStorage.setItem(storageKey, nextTheme);
            window.dispatchEvent(new CustomEvent("themechange", {detail: nextTheme}));
            return nextTheme;
        }
    };
})();
