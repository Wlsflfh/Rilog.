package blog.domain;

public enum PostCategory {
    IT("IT"),
    EXERCISE("운동"),
    BOOK("독서"),
    DAILY("일상");

    private final String label;

    PostCategory(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
