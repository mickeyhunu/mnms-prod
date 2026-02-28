package com.community.dto.response;

import java.time.LocalDateTime;

public class AdminCommentResponse {
    
    private Long commentId;
    private String content;
    private String authorNickname;
    private String postTitle;
    private LocalDateTime createdAt;
    
    public AdminCommentResponse() {}
    
    public AdminCommentResponse(Long commentId, String content, String authorNickname, String postTitle, LocalDateTime createdAt) {
        this.commentId = commentId;
        this.content = content;
        this.authorNickname = authorNickname;
        this.postTitle = postTitle;
        this.createdAt = createdAt;
    }
    
    public Long getCommentId() {
        return commentId;
    }
    
    public void setCommentId(Long commentId) {
        this.commentId = commentId;
    }
    
    public String getContent() {
        return content;
    }
    
    public void setContent(String content) {
        this.content = content;
    }
    
    public String getAuthorNickname() {
        return authorNickname;
    }
    
    public void setAuthorNickname(String authorNickname) {
        this.authorNickname = authorNickname;
    }
    
    public String getPostTitle() {
        return postTitle;
    }
    
    public void setPostTitle(String postTitle) {
        this.postTitle = postTitle;
    }
    
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
    
    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}