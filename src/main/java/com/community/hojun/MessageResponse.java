package com.community.hojun;

import java.time.LocalDateTime;

// 쪽지 목록 조회할때 쓰는 응답용 DTO
public class MessageResponse {
    private Long id;
    private String title;
    private String content;
    private Long senderId;
    private Long receiverId;
    private String senderName; // 조인해서 가져오는 보낸사람 닉네임
    private String receiverName; // 조인해서 가져오는 받는사람 닉네임
    private int isRead; // 읽음 여부 (0: 안읽음, 1: 읽음)
    private int deletedBySender; // 보낸사람 삭제 여부
    private int deletedByReceiver; // 받는사람 삭제 여부
    private LocalDateTime createdAt; // 작성일
    private LocalDateTime readAt; // 읽은일 (null일수있음)

    // 기본 생성자...
    public MessageResponse() {}

    // 모든 필드 생성자 (나중에 필요할지 몰라서 만들어둠)
    public MessageResponse(Long id, String title, String content, Long senderId, Long receiverId,
                          String senderName, String receiverName, int isRead, int deletedBySender, 
                          int deletedByReceiver, LocalDateTime createdAt, LocalDateTime readAt) {
        this.id = id;
        this.title = title;
        this.content = content;
        this.senderId = senderId;
        this.receiverId = receiverId;
        this.senderName = senderName;
        this.receiverName = receiverName;
        this.isRead = isRead;
        this.deletedBySender = deletedBySender;
        this.deletedByReceiver = deletedByReceiver;
        this.createdAt = createdAt;
        this.readAt = readAt;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
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

    public Long getSenderId() {
        return senderId;
    }

    public void setSenderId(Long senderId) {
        this.senderId = senderId;
    }

    public Long getReceiverId() {
        return receiverId;
    }

    public void setReceiverId(Long receiverId) {
        this.receiverId = receiverId;
    }

    public String getSenderName() {
        return senderName;
    }

    public void setSenderName(String senderName) {
        this.senderName = senderName;
    }

    public String getReceiverName() {
        return receiverName;
    }

    public void setReceiverName(String receiverName) {
        this.receiverName = receiverName;
    }

    public int getIsRead() {
        return isRead;
    }

    public void setIsRead(int isRead) {
        this.isRead = isRead;
    }

    public int getDeletedBySender() {
        return deletedBySender;
    }

    public void setDeletedBySender(int deletedBySender) {
        this.deletedBySender = deletedBySender;
    }

    public int getDeletedByReceiver() {
        return deletedByReceiver;
    }

    public void setDeletedByReceiver(int deletedByReceiver) {
        this.deletedByReceiver = deletedByReceiver;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getReadAt() {
        return readAt;
    }

    public void setReadAt(LocalDateTime readAt) {
        this.readAt = readAt;
    }

    // 디버깅용 toString (개발할때 콘솔로 확인하려고)
    @Override
    public String toString() {
        return "MessageResponse [id=" + id + ", title=" + title + ", content=" + content + 
               ", senderId=" + senderId + ", receiverId=" + receiverId + ", senderName=" + senderName + 
               ", receiverName=" + receiverName + ", isRead=" + isRead + ", deletedBySender=" + deletedBySender + 
               ", deletedByReceiver=" + deletedByReceiver + ", createdAt=" + createdAt + ", readAt=" + readAt + "]";
    }
}