package com.community.controller;

import com.community.dto.response.PostResponse;
import com.community.dto.response.UserResponse;
import com.community.mapper.CommunityMapper;
import com.community.suin.CommentResponse;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/search")
public class SearchController {

    private final CommunityMapper mapper;

    public SearchController(CommunityMapper mapper) {
        this.mapper = mapper;
    }

    @GetMapping("/posts")
    public ResponseEntity<Map<String, Object>> searchPosts(
            @RequestParam String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        if (keyword == null || keyword.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "검색어를 입력해주세요"));
        }

        String trimmedKeyword = keyword.trim();
        int offset = page * size;

        List<PostResponse> posts = mapper.searchPosts(trimmedKeyword, offset, size);
        int totalCount = mapper.getSearchPostCount(trimmedKeyword);

        Map<String, Object> response = new HashMap<>();
        response.put("posts", posts);
        response.put("totalCount", totalCount);
        response.put("currentPage", page);
        response.put("totalPages", (totalCount + size - 1) / size);
        response.put("keyword", trimmedKeyword);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/users")
    public ResponseEntity<Map<String, Object>> searchUsers(@RequestParam String keyword) {
        if (keyword == null || keyword.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "검색어를 입력해주세요"));
        }

        String trimmedKeyword = keyword.trim();
        List<UserResponse> users = mapper.searchUsers(trimmedKeyword);

        Map<String, Object> response = new HashMap<>();
        response.put("users", users);
        response.put("totalCount", users.size());
        response.put("keyword", trimmedKeyword);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/comments")
    public ResponseEntity<Map<String, Object>> searchComments(
            @RequestParam String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        if (keyword == null || keyword.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "검색어를 입력해주세요"));
        }

        String trimmedKeyword = keyword.trim();
        int offset = page * size;

        List<CommentResponse> comments = mapper.searchComments(trimmedKeyword, offset, size);
        int totalCount = mapper.getSearchCommentCount(trimmedKeyword);

        Map<String, Object> response = new HashMap<>();
        response.put("comments", comments);
        response.put("totalCount", totalCount);
        response.put("currentPage", page);
        response.put("totalPages", (totalCount + size - 1) / size);
        response.put("keyword", trimmedKeyword);

        return ResponseEntity.ok(response);
    }
}