package com.community.mapper;

import com.community.dto.response.*;
import com.community.suin.CommentResponse;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;
import java.util.Map;

@Mapper
public interface CommunityMapper {
    
    List<PostResponse> findAllPosts(@Param("offset") int offset, @Param("size") int size);
    int getTotalPostCount();
    boolean deletePost(@Param("id") Long id);
    
    boolean deleteComment(@Param("id") Long id);
    
    UserResponse findUserByEmail(@Param("email") String email);
    String findPasswordByEmail(@Param("email") String email);
    Long findIdByEmail(@Param("email") String email);
    boolean isAdmin(@Param("userId") Long userId);
    List<UserResponse> findAllUsers();
    UserResponse findUserById(@Param("id") Long id);
    boolean existsByNickname(@Param("nickname") String nickname);
    boolean updateUser(@Param("id") Long id, @Param("department") String department, @Param("jobPosition") String jobPosition, @Param("nickname") String nickname, @Param("company") String company);
    boolean updatePassword(@Param("id") Long id, @Param("newPassword") String newPassword);
    boolean existsByEmail(@Param("email") String email);
    
    int getUserPostCount(@Param("userId") Long userId);
    int getUserCommentCount(@Param("userId") Long userId);
    int getUserLikeCount(@Param("userId") Long userId);
    int getUserBookmarkCount(@Param("userId") Long userId);
    int getUserReceivedLikes(@Param("userId") Long userId);
    
    List<Long> findBookmarkedPostIdsByUserId(@Param("userId") Long userId);
    boolean isBookmarked(@Param("userId") Long userId, @Param("postId") Long postId);
    boolean addBookmark(@Param("userId") Long userId, @Param("postId") Long postId);
    boolean removeBookmark(@Param("userId") Long userId, @Param("postId") Long postId);
    void toggleBookmark(@Param("userId") Long userId, @Param("postId") Long postId);
    List<PostResponse> findBookmarkedPosts(@Param("userId") Long userId, @Param("offset") int offset, @Param("size") int size);
    int getBookmarkedPostCount(@Param("userId") Long userId);
    
    List<CommentResponse> findCommentsByPostId(@Param("postId") Long postId);
    Long insertComment(@Param("content") String content, @Param("postId") Long postId, @Param("userId") Long userId, @Param("parentId") Long parentId);
    CommentResponse findCommentById(@Param("id") Long id);
    boolean isCommentAuthor(@Param("id") Long id, @Param("userId") Long userId);
    boolean updateComment(@Param("id") Long id, @Param("content") String content);
    
    void insertPostFile(Map<String, Object> params);
    Map<String, Object> getFileData(@Param("fileId") Long fileId);
    
    List<LikeResponse> findLikesByPostId(@Param("postId") Long postId);
    List<LikeResponse> findLikesByUserId(@Param("userId") Long userId);
    boolean isLiked(@Param("userId") Long userId, @Param("postId") Long postId);
    int getLikeCount(@Param("postId") Long postId);
    boolean addLike(@Param("userId") Long userId, @Param("postId") Long postId);
    boolean removeLike(@Param("userId") Long userId, @Param("postId") Long postId);
    void toggleLike(@Param("userId") Long userId, @Param("postId") Long postId);
    
    PostResponse findPostById(@Param("id") Long id);
    void insertPost(Map<String, Object> params);
    boolean isPostAuthor(@Param("id") Long id, @Param("userId") Long userId);
    boolean updatePost(@Param("id") Long id, @Param("title") String title, @Param("content") String content);
    
    List<PostResponse> findPostsByAuthorId(@Param("userId") Long userId, @Param("offset") int offset, @Param("size") int size);
    int getPostCountByAuthorId(@Param("userId") Long userId);
    
    List<CommentResponse> findAllComments(@Param("offset") int offset, @Param("size") int size);
    int getTotalCommentCount();
    
    List<PostResponse> searchPosts(@Param("keyword") String keyword, @Param("offset") int offset, @Param("size") int size);
    int getSearchPostCount(@Param("keyword") String keyword);
    
    List<UserResponse> searchUsers(@Param("keyword") String keyword);
    List<CommentResponse> searchComments(@Param("keyword") String keyword, @Param("offset") int offset, @Param("size") int size);
    int getSearchCommentCount(@Param("keyword") String keyword);
    
    boolean insertUser(@Param("email") String email, @Param("password") String password, @Param("department") String department, @Param("jobPosition") String jobPosition, @Param("nickname") String nickname, @Param("company") String company);
}