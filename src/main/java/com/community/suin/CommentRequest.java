package com.community.suin;

public class CommentRequest {
    private String content;
    private Long postId;
    private Long parentId;

    public CommentRequest() {}

    public CommentRequest(String content, Long postId, Long parentId) {
        this.content = content;
        this.postId = postId;
        this.parentId = parentId;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public Long getPostId() {
        return postId;
    }

    public void setPostId(Long postId) {
        this.postId = postId;
    }

    public Long getParentId() {
        return parentId;
    }

    public void setParentId(Long parentId) {
        this.parentId = parentId;
    }
}


