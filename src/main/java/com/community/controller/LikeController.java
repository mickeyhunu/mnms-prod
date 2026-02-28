package com.community.controller;

import com.community.dto.response.LikeResponse;
import com.community.mapper.CommunityMapper;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/likes")
public class LikeController {

    private final CommunityMapper likeMapper;

    public LikeController(CommunityMapper likeMapper) {
        this.likeMapper = likeMapper;
    }

    @GetMapping("/post/{postId}")
    public ResponseEntity<List<LikeResponse>> getLikesByPost(@PathVariable Long postId) {
        List<LikeResponse> likes = likeMapper.findLikesByPostId(postId);
        return ResponseEntity.ok(likes);
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<LikeResponse>> getLikesByUser(@PathVariable Long userId) {
        List<LikeResponse> likes = likeMapper.findLikesByUserId(userId);
        return ResponseEntity.ok(likes);
    }

    @GetMapping("/check")
    public ResponseEntity<Boolean> isLiked(@RequestParam Long userId, @RequestParam Long postId) {
        boolean isLiked = likeMapper.isLiked(userId, postId);
        return ResponseEntity.ok(isLiked);
    }

    @GetMapping("/count/{postId}")
    public ResponseEntity<Integer> getLikeCount(@PathVariable Long postId) {
        int likeCount = likeMapper.getLikeCount(postId);
        return ResponseEntity.ok(likeCount);
    }

    @PostMapping
    public ResponseEntity<Void> addLike(@RequestParam Long userId, @RequestParam Long postId) {
        boolean added = likeMapper.addLike(userId, postId);
        if (!added) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok().build();
    }

    @DeleteMapping
    public ResponseEntity<Void> removeLike(@RequestParam Long userId, @RequestParam Long postId) {
        boolean removed = likeMapper.removeLike(userId, postId);
        if (!removed) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok().build();
    }

    @PostMapping("/toggle")
    public ResponseEntity<Boolean> toggleLike(@RequestParam Long userId, @RequestParam Long postId) {
        likeMapper.toggleLike(userId, postId);
        boolean isLiked = likeMapper.isLiked(userId, postId);
        return ResponseEntity.ok(isLiked);
    }
}