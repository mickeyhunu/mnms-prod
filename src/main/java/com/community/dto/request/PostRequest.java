package com.community.dto.request;

import java.util.List;

public class PostRequest {
    private String title;
    private String content;
    private List<String> imageUrls;

    public PostRequest() {}

    public PostRequest(String title, String content) {
        this.title = title;
        this.content = content;
    }

    public PostRequest(String title, String content, List<String> imageUrls) {
        this.title = title;
        this.content = content;
        this.imageUrls = imageUrls;
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

    public List<String> getImageUrls() {
        return imageUrls;
    }

    public void setImageUrls(List<String> imageUrls) {
        this.imageUrls = imageUrls;
    }
}