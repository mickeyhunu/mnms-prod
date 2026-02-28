package com.community.suin;

import com.community.suin.CommentRequest;
import com.community.suin.CommentResponse;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.util.Map;

@Mapper
public interface CommentMapper {

    List<CommentResponse> findCommentsByPostId(@Param("postId") Long postId);

    void insertComment(Map<String, Object> params);

    CommentResponse findCommentById(@Param("id") Long id);

    boolean isCommentAuthor(@Param("id") Long id, @Param("userId") Long userId);

    boolean updateComment(@Param("id") Long id, @Param("content") String content);

    boolean deleteComment(@Param("id") Long id);

    boolean isAdmin(@Param("userId") Long userId);
}