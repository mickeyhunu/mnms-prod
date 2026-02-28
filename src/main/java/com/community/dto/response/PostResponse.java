package com.community.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

public class PostResponse {
    private Long id;
    private String title;
    private String content;
    private Long authorId;
    private String authorNickname;
    private int likeCount;
    private int commentCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String imageUrlsString;
    private List<String> imageUrls;
    
    @JsonProperty("isAuthor")
    private boolean isAuthor;
    
    @JsonProperty("isLiked")
    private boolean isLiked;
    
    @JsonProperty("isBookmarked")
    private boolean isBookmarked;

    @JsonProperty("isAdminPost")
    private boolean isAdminPost;

    public PostResponse() {}

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
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

    public Long getAuthorId() {
        return authorId;
    }

    public void setAuthorId(Long authorId) {
        this.authorId = authorId;
    }

    public String getAuthorNickname() {
        return authorNickname;
    }

    public void setAuthorNickname(String authorNickname) {
        this.authorNickname = authorNickname;
    }

    public int getLikeCount() {
        return likeCount;
    }

    public void setLikeCount(int likeCount) {
        this.likeCount = likeCount;
    }

    public int getCommentCount() {
        return commentCount;
    }

    public void setCommentCount(int commentCount) {
        this.commentCount = commentCount;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public List<String> getImageUrls() {
        if (imageUrls == null && imageUrlsString != null && !imageUrlsString.trim().isEmpty()) {
            imageUrls = Arrays.asList(imageUrlsString.split(","));
            for (int i = 0; i < imageUrls.size(); i++) {
                imageUrls.set(i, imageUrls.get(i).trim());
            }
        }
        return imageUrls;
    }

    public void setImageUrls(String imageUrlsString) {
        this.imageUrlsString = imageUrlsString;
        if (imageUrlsString != null && !imageUrlsString.trim().isEmpty()) {
            this.imageUrls = Arrays.asList(imageUrlsString.split(","));
            for (int i = 0; i < this.imageUrls.size(); i++) {
                this.imageUrls.set(i, this.imageUrls.get(i).trim());
            }
        } else {
            this.imageUrls = null;
        }
    }

    @JsonProperty("isAuthor")
    public boolean isAuthor() {
        return isAuthor;
    }

    public void setAuthor(boolean author) {
        isAuthor = author;
    }

    @JsonProperty("isLiked")
    public boolean isLiked() {
        return isLiked;
    }

    public void setLiked(boolean liked) {
        isLiked = liked;
    }

    @JsonProperty("isBookmarked")
    public boolean isBookmarked() {
        return isBookmarked;
    }

    public void setBookmarked(boolean bookmarked) {
        isBookmarked = bookmarked;
    }

    @JsonProperty("isAdminPost")
    public boolean isAdminPost() {
        return isAdminPost;
    }

    public void setAdminPost(boolean adminPost) {
        this.isAdminPost = adminPost;
    }
}