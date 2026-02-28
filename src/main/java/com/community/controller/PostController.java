package com.community.controller;

import oracle.sql.BLOB;
import com.community.dto.response.PostResponse;
import com.community.dto.response.UserResponse;
import com.community.mapper.CommunityMapper;
import com.community.hojun.MessagesMapper;
import com.community.hojun.MessageDTO;
import com.community.hojun.MessageResponse;
import com.community.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import jakarta.servlet.http.HttpServletRequest;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/posts")
@CrossOrigin(origins = "*")
public class PostController {

    @Autowired
    private CommunityMapper mapper;
    
    @Autowired
    private MessagesMapper messagesMapper;
    
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

    @GetMapping
    public ResponseEntity<Map<String, Object>> getPosts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) Long authorId,
            HttpServletRequest request) {
        
        try {
            int offset = page * size;
            List<PostResponse> posts;
            int totalCount;
            
            if (authorId != null) {
                posts = mapper.findPostsByAuthorId(authorId, offset, size);
                totalCount = mapper.getPostCountByAuthorId(authorId);
            } else {
                posts = mapper.findAllPosts(offset, size);
                totalCount = mapper.getTotalPostCount();
            }
            
            int totalPages = (int) Math.ceil((double) totalCount / size);
            
            Map<String, Object> response = new HashMap<>();
            response.put("posts", posts);
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

    @GetMapping("/{id}")
    public ResponseEntity<PostResponse> getPost(@PathVariable Long id, HttpServletRequest request) {
        try {
            System.out.println("=== getPost 호출 ===");
            System.out.println("게시글 ID: " + id);
            
            PostResponse post = mapper.findPostById(id);
            if (post == null) {
                System.out.println("게시글을 찾을 수 없음");
                return ResponseEntity.notFound().build();
            }
            
            System.out.println("게시글 조회 완료: " + post.getTitle());
            System.out.println("게시글 작성자 ID: " + post.getAuthorId());
            
            Long userId = getUserIdFromRequest(request);
            System.out.println("JWT에서 가져온 사용자 ID: " + userId);
            
            if (userId != null) {
                boolean isAuthor = userId.equals(post.getAuthorId());
                System.out.println("작성자 여부 계산: " + userId + " == " + post.getAuthorId() + " -> " + isAuthor);
                
                post.setAuthor(isAuthor);
                System.out.println("setAuthor 호출 후 isAuthor(): " + post.isAuthor());
                
                post.setLiked(mapper.isLiked(userId, id));
                post.setBookmarked(mapper.isBookmarked(userId, id));
                
            } else {
                System.out.println("userId가 null이므로 모든 권한을 false로 설정");
                post.setAuthor(false);
                post.setLiked(false);
                post.setBookmarked(false);
            }
            
            System.out.println("응답 전 최종 isAuthor 상태: " + post.isAuthor());
            return ResponseEntity.ok(post);
            
        } catch (Exception e) {
            System.out.println("getPost 에러: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).build();
        }
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createPost(
            @RequestParam("title") String title,
            @RequestParam("content") String content,
            @RequestParam(value = "files", required = false) MultipartFile[] images,
            HttpServletRequest request) {
        
        try {
            Long userId = getUserIdFromRequest(request);
            if (userId == null) {
                return ResponseEntity.status(401).body(Map.of("error", "로그인이 필요합니다"));
            }
            
            Map<String, Object> postParams = new HashMap<>();
            postParams.put("title", title);
            postParams.put("content", content);
            postParams.put("userId", userId);
            
            mapper.insertPost(postParams);
            Long postId = (Long) postParams.get("id");
            
            if (images != null && images.length > 0) {
                for (int i = 0; i < images.length; i++) {
                    MultipartFile image = images[i];
                    if (!image.isEmpty()) {
                        String originalFileName = image.getOriginalFilename();
                        if (originalFileName == null || originalFileName.trim().isEmpty()) {
                            originalFileName = "unknown_file_" + System.currentTimeMillis();
                        }
                        
                        String storedFileName = System.currentTimeMillis() + "_" + originalFileName;
                        byte[] fileData;
                        
                        try {
                            fileData = image.getBytes();
                        } catch (Exception e) {
                            continue;
                        }
                        
                        long size = image.getSize();
                        String contentType = image.getContentType();
                        if (contentType == null || contentType.trim().isEmpty()) {
                            contentType = "application/octet-stream";
                        }
                        
                        Map<String, Object> fileParams = new HashMap<>();
                        fileParams.put("postId", postId);
                        fileParams.put("originalFileName", originalFileName);
                        fileParams.put("storedFileName", storedFileName);
                        fileParams.put("fileData", fileData);
                        fileParams.put("size", size);
                        fileParams.put("contentType", contentType);
                        
                        try {
                            mapper.insertPostFile(fileParams);
                        } catch (Exception e) {
                        }
                    }
                }
            }
            
            return ResponseEntity.ok(Map.of("success", true, "id", postId));
            
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> updatePost(
            @PathVariable Long id,
            @RequestBody Map<String, Object> request,
            HttpServletRequest httpRequest) {
        
        try {
            Long userId = getUserIdFromRequest(httpRequest);
            if (userId == null) {
                return ResponseEntity.status(401).body(Map.of("error", "로그인이 필요합니다"));
            }
            
            if (!mapper.isPostAuthor(id, userId)) {
                return ResponseEntity.status(403).body(Map.of("error", "권한이 없습니다"));
            }
            
            String title = (String) request.get("title");
            String content = (String) request.get("content");
            
            mapper.updatePost(id, title, content);
            
            return ResponseEntity.ok(Map.of("success", true));
            
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deletePost(
            @PathVariable Long id,
            HttpServletRequest request) {
        
        try {
            Long userId = getUserIdFromRequest(request);
            if (userId == null) {
                return ResponseEntity.status(401).body(Map.of("error", "로그인이 필요합니다"));
            }
            
            boolean isAdmin = mapper.isAdmin(userId);
            
            if (!isAdmin && !mapper.isPostAuthor(id, userId)) {
                return ResponseEntity.status(403).body(Map.of("error", "권한이 없습니다"));
            }
            
            mapper.deletePost(id);
            
            return ResponseEntity.ok(Map.of("success", true));
            
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{id}/like")
    public ResponseEntity<Map<String, Object>> toggleLike(
            @PathVariable Long id,
            HttpServletRequest request) {
        
        try {
            Long userId = getUserIdFromRequest(request);
            if (userId == null) {
                return ResponseEntity.status(401).body(Map.of("error", "로그인이 필요합니다"));
            }
            
            mapper.toggleLike(userId, id);
            
            boolean isLiked = mapper.isLiked(userId, id);
            int likeCount = mapper.getLikeCount(id);
            
            return ResponseEntity.ok(Map.of(
                "isLiked", isLiked,
                "likeCount", likeCount
            ));
            
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/images/{fileId}")
    public ResponseEntity<byte[]> getPostFile(@PathVariable Long fileId) {
        try {
            Map<String, Object> fileData = mapper.getFileData(fileId);
            
            if (fileData == null) {
                return ResponseEntity.notFound().build();
            }
            
            Object fileDataObj = fileData.get("fileData");
            String contentType = (String) fileData.get("contentType");
            
            byte[] data = null;
            if (fileDataObj instanceof byte[]) {
                data = (byte[]) fileDataObj;
            } else if (fileDataObj instanceof oracle.sql.BLOB) {
                oracle.sql.BLOB blob = (oracle.sql.BLOB) fileDataObj;
                try {
                    data = blob.getBytes(1, (int) blob.length());
                } catch (Exception e) {
                    return ResponseEntity.status(500).build();
                }
            } else if (fileDataObj != null) {
                return ResponseEntity.status(500).build();
            }
            
            if (data == null) {
                return ResponseEntity.notFound().build();
            }
            
            return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .body(data);
                
        } catch (Exception e) {
            return ResponseEntity.status(500).build();
        }
    }

    @PostMapping("/{id}/bookmark")
    public ResponseEntity<Map<String, Object>> toggleBookmark(
            @PathVariable Long id,
            HttpServletRequest request) {
        
        try {
            Long userId = getUserIdFromRequest(request);
            if (userId == null) {
                return ResponseEntity.status(401).body(Map.of("error", "로그인이 필요합니다"));
            }
            
            mapper.toggleBookmark(userId, id);
            
            boolean isBookmarked = mapper.isBookmarked(userId, id);
            
            return ResponseEntity.ok(Map.of(
                "isBookmarked", isBookmarked
            ));
            
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/messages")
    public ResponseEntity<?> sendMessage(@RequestBody Map<String, Object> requestData, HttpServletRequest httpRequest) {
        try {
            Long userId = getUserIdFromRequest(httpRequest);
            if (userId == null) {
                return ResponseEntity.status(401).body(Map.of("error", "로그인이 필요합니다"));
            }

            UserResponse sender = mapper.findUserById(userId);
            if (sender == null) {
                return ResponseEntity.status(404).body(Map.of("error", "사용자를 찾을 수 없습니다"));
            }

            MessageDTO messageDTO = new MessageDTO();
            messageDTO.setTitle((String) requestData.get("title"));
            messageDTO.setContent((String) requestData.get("content"));
            messageDTO.setSender_id(userId);
            messageDTO.setReceiver_id(Long.valueOf(requestData.get("receiverId").toString()));
            
            messagesMapper.sendMessage(messageDTO);
            
            return ResponseEntity.ok(Map.of("success", true, "message", "쪽지가 전송되었습니다"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "쪽지 전송 중 오류가 발생했습니다"));
        }
    }

    @GetMapping("/messages/received")
    public ResponseEntity<List<MessageResponse>> getReceivedMessages(HttpServletRequest httpRequest) {
        try {
            Long userId = getUserIdFromRequest(httpRequest);
            if (userId == null) {
                return ResponseEntity.status(401).build();
            }

            List<MessageResponse> messages = messagesMapper.getReceiveMessageList(userId);
            return ResponseEntity.ok(messages);
        } catch (Exception e) {
            return ResponseEntity.status(500).build();
        }
    }

    @GetMapping("/messages/sent")
    public ResponseEntity<List<MessageResponse>> getSentMessages(HttpServletRequest httpRequest) {
        try {
            Long userId = getUserIdFromRequest(httpRequest);
            if (userId == null) {
                return ResponseEntity.status(401).build();
            }

            List<MessageResponse> messages = messagesMapper.getSentMessageList(userId);
            return ResponseEntity.ok(messages);
        } catch (Exception e) {
            return ResponseEntity.status(500).build();
        }
    }

    @PutMapping("/messages/{id}/read")
    public ResponseEntity<?> markMessageAsRead(@PathVariable Long id, HttpServletRequest httpRequest) {
        try {
            Long userId = getUserIdFromRequest(httpRequest);
            if (userId == null) {
                return ResponseEntity.status(401).body(Map.of("error", "로그인이 필요합니다"));
            }

            messagesMapper.updateIsRead(id);
            return ResponseEntity.ok(Map.of("success", true, "message", "읽음 처리되었습니다"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "읽음 처리 중 오류가 발생했습니다"));
        }
    }

    @DeleteMapping("/messages/{id}")
    public ResponseEntity<?> deleteMessage(@PathVariable Long id, 
                                          @RequestBody Map<String, String> request, 
                                          HttpServletRequest httpRequest) {
        try {
            Long userId = getUserIdFromRequest(httpRequest);
            if (userId == null) {
                return ResponseEntity.status(401).body(Map.of("error", "로그인이 필요합니다"));
            }

            String deleteType = request.get("deleteType");
            
            if ("sender".equals(deleteType)) {
                messagesMapper.senderDeleteMessage(id);
            } else {
                messagesMapper.receiverDeleteMessage(id);
            }
            
            return ResponseEntity.ok(Map.of(
                "success", true, 
                "message", "쪽지가 삭제되었습니다",
                "deletedId", id,
                "deleteType", deleteType
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "쪽지 삭제 중 오류가 발생했습니다"));
        }
    }
    
    @GetMapping("/messages/unread-count")
    public ResponseEntity<?> getUnreadMessageCount(HttpServletRequest httpRequest) {
        try {
            Long userId = getUserIdFromRequest(httpRequest);
            if (userId == null) {
                return ResponseEntity.status(401).body(Map.of("error", "로그인이 필요합니다"));
            }

            int unreadCount = messagesMapper.getUnreadMessageCount(userId);
            return ResponseEntity.ok(Map.of("count", unreadCount));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "읽지 않은 쪽지 수 조회 중 오류가 발생했습니다"));
        }
    }
    
}