package com.community.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.community.dto.response.PostResponse;
import com.community.mapper.CommunityMapper;
import com.community.util.JwtUtil;

import jakarta.servlet.http.HttpServletRequest;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/bookmarks")
@CrossOrigin(origins = "*")
public class BookmarkController {

    @Autowired
    private CommunityMapper mapper;
    
    @Autowired
    private JwtUtil jwtUtil;

    private Long getUserIdFromRequest(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            try {
                return jwtUtil.getUserIdFromToken(token);
            } catch (Exception e) {
                return null;
            }
        }
        return null;
    }

    @GetMapping("/my")
    public ResponseEntity<Map<String, Object>> getMyBookmarks(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            HttpServletRequest request) {
        
        try {
            Long userId = getUserIdFromRequest(request);
            if (userId == null) {
                return ResponseEntity.status(401).body(Map.of("error", "로그인이 필요합니다"));
            }
            
            int offset = page * size;
            List<PostResponse> bookmarkedPosts = mapper.findBookmarkedPosts(userId, offset, size);
            int totalCount = mapper.getBookmarkedPostCount(userId);
            int totalPages = (int) Math.ceil((double) totalCount / size);
            
            Map<String, Object> response = new HashMap<>();
            response.put("posts", bookmarkedPosts);
            response.put("currentPage", page);
            response.put("totalPages", totalPages);
            response.put("totalCount", totalCount);
            response.put("hasNext", page < totalPages - 1);
            response.put("first", page == 0);
            response.put("last", page >= totalPages - 1);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/check/{postId}")
    public ResponseEntity<Map<String, Object>> isBookmarked(
            @PathVariable Long postId,
            HttpServletRequest request) {
        
        try {
            Long userId = getUserIdFromRequest(request);
            if (userId == null) {
                return ResponseEntity.status(401).body(Map.of("error", "로그인이 필요합니다"));
            }
            
            boolean isBookmarked = mapper.isBookmarked(userId, postId);
            return ResponseEntity.ok(Map.of("isBookmarked", isBookmarked));
            
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{postId}/toggle")
    public ResponseEntity<Map<String, Object>> toggleBookmark(
            @PathVariable Long postId,
            HttpServletRequest request) {
        
        try {
            Long userId = getUserIdFromRequest(request);
            if (userId == null) {
                return ResponseEntity.status(401).body(Map.of("error", "로그인이 필요합니다"));
            }
            
            mapper.toggleBookmark(userId, postId);
            boolean isBookmarked = mapper.isBookmarked(userId, postId);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "isBookmarked", isBookmarked,
                "message", isBookmarked ? "북마크에 추가되었습니다" : "북마크에서 제거되었습니다"
            ));
            
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "북마크 처리 중 오류가 발생했습니다"));
        }
    }
}