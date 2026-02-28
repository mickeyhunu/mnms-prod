package com.community.controller;

import com.community.dto.response.PostResponse;
import com.community.mapper.CommunityMapper;
import com.community.suin.CommentResponse;
import com.community.dto.response.UserResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final CommunityMapper mapper;

    public AdminController(CommunityMapper mapper) {
        this.mapper = mapper;
    }

    @GetMapping("/posts")
    public ResponseEntity<Map<String, Object>> getAllPosts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        int offset = page * size;
        List<PostResponse> posts = mapper.findAllPosts(offset, size);
        int totalCount = mapper.getTotalPostCount();

        Map<String, Object> response = new HashMap<>();
        response.put("posts", posts);
        response.put("totalCount", totalCount);
        response.put("currentPage", page);
        response.put("totalPages", (totalCount + size - 1) / size);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/users")
    public ResponseEntity<List<UserResponse>> getAllUsers() {
        List<UserResponse> users = mapper.findAllUsers();
        return ResponseEntity.ok(users);
    }

    @GetMapping("/comments")
    public ResponseEntity<Map<String, Object>> getAllComments(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        int offset = page * size;
        List<CommentResponse> comments = mapper.findAllComments(offset, size);
        int totalCount = mapper.getTotalCommentCount();

        Map<String, Object> response = new HashMap<>();
        response.put("comments", comments);
        response.put("totalCount", totalCount);
        response.put("currentPage", page);
        response.put("totalPages", (totalCount + size - 1) / size);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/stats/posts")
    public ResponseEntity<Map<String, Integer>> getPostStats() {
        int totalPosts = mapper.getTotalPostCount();
        
        Map<String, Integer> stats = new HashMap<>();
        stats.put("total", totalPosts);
        
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/stats/users")
    public ResponseEntity<Map<String, Integer>> getUserStats() {
        List<UserResponse> users = mapper.findAllUsers();
        int totalUsers = users.size();
        int adminCount = (int) users.stream().filter(u -> "ADMIN".equals(u.getRole())).count();
        
        Map<String, Integer> stats = new HashMap<>();
        stats.put("total", totalUsers);
        stats.put("admins", adminCount);
        
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/stats/comments")
    public ResponseEntity<Map<String, Integer>> getCommentStats() {
        int totalComments = mapper.getTotalCommentCount();
        
        Map<String, Integer> stats = new HashMap<>();
        stats.put("total", totalComments);
        
        return ResponseEntity.ok(stats);
    }

    @DeleteMapping("/posts/{id}")
    public ResponseEntity<Map<String, String>> deletePost(@PathVariable Long id) {
        boolean deleted = mapper.deletePost(id);

        Map<String, String> response = new HashMap<>();
        if (deleted) {
            response.put("message", "게시글이 삭제되었습니다");
        } else {
            response.put("message", "게시글 삭제에 실패했습니다");
        }

        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/comments/{id}")
    public ResponseEntity<Map<String, String>> deleteComment(@PathVariable Long id) {
        boolean deleted = mapper.deleteComment(id);

        Map<String, String> response = new HashMap<>();
        if (deleted) {
            response.put("message", "댓글이 삭제되었습니다");
        } else {
            response.put("message", "댓글 삭제에 실패했습니다");
        }

        return ResponseEntity.ok(response);
    }
}