package com.community.hojun;

import java.time.LocalDateTime;

// 쪽지 요청할때 쓰는 DTO (근데 실제로는 MessageDTO 쓸거같긴 함)
public class MessageRequest {
    private Long id;
    private String title;
    private String content;
    private Long senderId; // camelCase로 쓰는게 자바 관례인데 DB 매핑땜에 snake_case도 같이 써야할듯
    private Long receiverId;
    private int isRead; // 0이면 안읽음, 1이면 읽음
    private int deletedBySender; // 보낸사람 삭제 여부
    private int deletedByReceiver; // 받는사람 삭제 여부
    private LocalDateTime createdAt;
    private LocalDateTime readAt; // 읽은 시간 (null 가능)

    // 기본 생성자
    public MessageRequest() {}

    // 전체 필드 생성자 (나중에 쓸일 있을까봐 만들어둠)
    public MessageRequest(Long id, String title, String content, Long senderId, Long receiverId, 
                         int isRead, int deletedBySender, int deletedByReceiver, 
                         LocalDateTime createdAt, LocalDateTime readAt) {
        this.id = id;
        this.title = title;
        this.content = content;
        this.senderId = senderId;
        this.receiverId = receiverId;
        this.isRead = isRead;
        this.deletedBySender = deletedBySender;
        this.deletedByReceiver = deletedByReceiver;
        this.createdAt = createdAt;
        this.readAt = readAt;
    }

    // getter setter 메서드들
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

    // 디버깅할때 보기 편하라고 만든 toString
    @Override
    public String toString() {
        return "MessageRequest [id=" + id + ", title=" + title + ", content=" + content + 
               ", senderId=" + senderId + ", receiverId=" + receiverId + ", isRead=" + isRead + 
               ", deletedBySender=" + deletedBySender + ", deletedByReceiver=" + deletedByReceiver + 
               ", createdAt=" + createdAt + ", readAt=" + readAt + "]";
    }
}