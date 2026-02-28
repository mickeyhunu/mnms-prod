package com.community.dto.response;

import java.time.LocalDateTime;

public class AdminPostResponse {
    
    private Long postId;
    private String title;
    private String content;
    private String authorNickname;
    private LocalDateTime createdAt;
    
    public AdminPostResponse() {}
    
    public AdminPostResponse(Long postId, String title, String content, String authorNickname, LocalDateTime createdAt) {
        this.postId = postId;
        this.title = title;
        this.content = content;
        this.authorNickname = authorNickname;
        this.createdAt = createdAt;
    }
    
    public Long getPostId() {
        return postId;
    }
    
    public void setPostId(Long postId) {
        this.postId = postId;
    }
    
    public String getTitle() {
        return title;
    }
    
    public void setTitle(String title) {
        this.title = title;
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
    
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
    
    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}