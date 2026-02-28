package com.community.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.community.mapper.CommunityMapper;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/user")
public class UserStatsController {

    private final CommunityMapper postMapper;

    public UserStatsController(CommunityMapper postMapper) {
        this.postMapper = postMapper;
    }

    @GetMapping("/posts")
    public ResponseEntity<Map<String, Object>> getUserPosts(
            @RequestParam Long userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        
        int offset = page * size;
        Map<String, Object> response = new HashMap<>();
        response.put("posts", postMapper.findPostsByAuthorId(userId, offset, size));
        response.put("totalCount", postMapper.getPostCountByAuthorId(userId));
        response.put("currentPage", page);
        
        return ResponseEntity.ok(response);
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getUserStats(@RequestParam Long userId) {
        
        int postCount = postMapper.getPostCountByAuthorId(userId);
        
        Map<String, Object> stats = new HashMap<>();
        stats.put("postCount", postCount);
        stats.put("commentCount", 0);
        stats.put("likeCount", 0);
        stats.put("messageCount", 0);
        
        return ResponseEntity.ok(stats);
    }
}