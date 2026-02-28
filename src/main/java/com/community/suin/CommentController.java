package com.community.suin;

import com.community.suin.CommentMapper;
import com.community.suin.CommentRequest;
import com.community.suin.CommentResponse;
import com.community.util.JwtUtil;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletRequest;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.ArrayList;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class CommentController {
    private final CommentMapper commentMapper;
    private final JwtUtil jwtUtil;
    
    public CommentController(CommentMapper commentMapper, JwtUtil jwtUtil) {
        this.commentMapper = commentMapper;
        this.jwtUtil = jwtUtil;
    }

    @GetMapping("/posts/{postId}/comments")
    public ResponseEntity<Map<String, Object>> getCommentsByPost(
            @PathVariable Long postId,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size,
            HttpServletRequest request) {
        
        try {
            System.out.println("댓글 목록 조회");
            System.out.println("게시글 ID: " + postId);
            
            List<CommentResponse> commentList = commentMapper.findCommentsByPostId(postId);
            System.out.println("조회된 댓글 수: " + commentList.size());
            
            String token = getTokenFromRequest(request);
            if (token != null && jwtUtil.isTokenValid(token)) {
                Long userId = jwtUtil.extractUserId(token);
                for (CommentResponse comment : commentList) {
                    comment.setAuthor(comment.getAuthorId().equals(userId));
                }
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("comments", commentList);
            response.put("totalElements", commentList.size());
            response.put("currentPage", page);
            response.put("totalPages", 1);
            
            System.out.println("응답 데이터: " + response);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            System.out.println("댓글 조회 에러: " + e.getMessage());
            e.printStackTrace();
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "댓글을 불러올 수 없습니다.");
            errorResponse.put("comments", new ArrayList<>());
            errorResponse.put("totalElements", 0);
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    @PostMapping("/posts/{postId}/comments")
    public ResponseEntity<Map<String, Object>> createComment(
            @PathVariable Long postId,
            @RequestBody CommentRequest request,
            HttpServletRequest httpRequest) {
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            System.out.println("=== 댓글 작성 시도 ===");
            System.out.println("게시글 ID: " + postId);
            System.out.println("댓글 내용: " + request.getContent());
            
            String token = getTokenFromRequest(httpRequest);
            if (token == null || !jwtUtil.isTokenValid(token)) {
                System.out.println("유효하지 않은 토큰");
                response.put("error", "로그인이 필요합니다.");
                return ResponseEntity.status(401).body(response);
            }
            
            Long userId = jwtUtil.extractUserId(token);
            System.out.println("로그인된 사용자 ID: " + userId);
            
            if (request.getContent() == null || request.getContent().trim().isEmpty()) {
                System.out.println("댓글 내용이 비어있음");
                response.put("error", "댓글 내용을 입력해주세요.");
                return ResponseEntity.badRequest().body(response);
            }

            Map<String, Object> commentParams = new HashMap<>();
            commentParams.put("content", request.getContent().trim());
            commentParams.put("postId", postId);
            commentParams.put("userId", userId);
            commentParams.put("parentId", request.getParentId());
            
            commentMapper.insertComment(commentParams);
            Long commentId = (Long) commentParams.get("id");

            if (commentId == null) {
                System.out.println("댓글 저장 실패");
                response.put("error", "댓글 작성에 실패했습니다.");
                return ResponseEntity.status(500).body(response);
            }

            System.out.println("댓글 작성 성공, ID: " + commentId);
            
            CommentResponse createdComment = commentMapper.findCommentById(commentId);
            if (createdComment != null) {
                createdComment.setAuthor(true);
            }
            
            response.put("comment", createdComment);
            response.put("message", "댓글이 작성되었습니다.");
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            System.out.println("댓글 작성 에러: " + e.getMessage());
            e.printStackTrace();
            response.put("error", "댓글 작성 중 오류가 발생했습니다.");
            return ResponseEntity.status(500).body(response);
        }
    }

    private String getTokenFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }

    @PutMapping("/comments/{id}")
    public ResponseEntity<Map<String, Object>> updateComment(
            @PathVariable Long id,
            @RequestBody CommentRequest request,
            HttpServletRequest httpRequest) {
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            System.out.println("=== 댓글 수정 시도 ===");
            System.out.println("댓글 ID: " + id);
            
            String token = getTokenFromRequest(httpRequest);
            if (token == null || !jwtUtil.isTokenValid(token)) {
                response.put("error", "로그인이 필요합니다.");
                return ResponseEntity.status(401).body(response);
            }

            Long userId = jwtUtil.extractUserId(token);

            if (!commentMapper.isCommentAuthor(id, userId) && !commentMapper.isAdmin(userId)) {
                response.put("error", "댓글 수정 권한이 없습니다.");
                return ResponseEntity.status(403).body(response);
            }

            if (request.getContent() == null || request.getContent().trim().isEmpty()) {
                response.put("error", "댓글 내용을 입력해주세요.");
                return ResponseEntity.badRequest().body(response);
            }

            boolean updated = commentMapper.updateComment(id, request.getContent().trim());
            if (!updated) {
                response.put("error", "댓글을 찾을 수 없습니다.");
                return ResponseEntity.status(404).body(response);
            }

            CommentResponse updatedComment = commentMapper.findCommentById(id);
            if (updatedComment != null) {
                updatedComment.setAuthor(updatedComment.getAuthorId().equals(userId));
            }
            
            response.put("comment", updatedComment);
            response.put("message", "댓글이 수정되었습니다.");
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            System.out.println("댓글 수정 에러: " + e.getMessage());
            response.put("error", "댓글 수정 중 오류가 발생했습니다.");
            return ResponseEntity.status(500).body(response);
        }
    }

    @DeleteMapping("/comments/{id}")
    public ResponseEntity<Map<String, Object>> deleteComment(
            @PathVariable Long id,
            HttpServletRequest httpRequest) {
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            String token = getTokenFromRequest(httpRequest);
            if (token == null || !jwtUtil.isTokenValid(token)) {
                response.put("error", "로그인이 필요합니다.");
                return ResponseEntity.status(401).body(response);
            }

            Long userId = jwtUtil.extractUserId(token);
            boolean isAdmin = jwtUtil.extractIsAdmin(token);
            
            boolean isAuthor = commentMapper.isCommentAuthor(id, userId);
            
            if (!isAuthor && !isAdmin) {
                response.put("error", "댓글 삭제 권한이 없습니다.");
                return ResponseEntity.status(403).body(response);
            }

            boolean deleted = commentMapper.deleteComment(id);
            if (!deleted) {
                response.put("error", "댓글을 찾을 수 없습니다.");
                return ResponseEntity.status(404).body(response);
            }

            response.put("message", "댓글이 삭제되었습니다.");
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            System.out.println("댓글 삭제 에러: " + e.getMessage());
            response.put("error", "댓글 삭제 중 오류가 발생했습니다.");
            return ResponseEntity.status(500).body(response);
        }
    }
}