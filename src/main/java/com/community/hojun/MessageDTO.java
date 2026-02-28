// 현 코드에서 약간 고칠점만 주석으로 표기함 

package com.community.hojun;

import java.time.LocalDateTime;
import org.springframework.stereotype.Component;

@Component
public class MessageDTO {
    // 현재 코드는 정상적으로 작동하지만 다음 사항들을 고려합쉬다 :
    // 1. @Component 어노테이션은 DTO에는 불필요 (데이터 전달용 객체이므로)
    // 2. 필드명이 snake_case로 되어있어 Java 관례(camelCase)와 다르기 때문에 
    // 3. DB 컬럼과 매핑을 위해 현재 구조를 유지하는 것이 좋을듯하다 

    private Long id;
    private String title;
    private String content;
    private Long sender_id;
    private Long receiver_id;
    private int is_read;
    private int deleted_by_sender;
    private int deleted_by_receiver;
    private LocalDateTime created_at;
    private LocalDateTime read_at;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    
    public Long getSender_id() { return sender_id; }
    public void setSender_id(Long sender_id) { this.sender_id = sender_id; }
    
    public Long getReceiver_id() { return receiver_id; }
    public void setReceiver_id(Long receiver_id) { this.receiver_id = receiver_id; }
    
    public int getIs_read() { return is_read; }
    public void setIs_read(int is_read) { this.is_read = is_read; }
    
    public int getDeleted_by_sender() { return deleted_by_sender; }
    public void setDeleted_by_sender(int deleted_by_sender) { this.deleted_by_sender = deleted_by_sender; }
    
    public int getDeleted_by_receiver() { return deleted_by_receiver; }
    public void setDeleted_by_receiver(int deleted_by_receiver) { this.deleted_by_receiver = deleted_by_receiver; }
    
    public LocalDateTime getCreated_at() { return created_at; }
    public void setCreated_at(LocalDateTime created_at) { this.created_at = created_at; }
    
    public LocalDateTime getRead_at() { return read_at; }
    public void setRead_at(LocalDateTime read_at) { this.read_at = read_at; }
    
    @Override
    public String toString() {
        return "MessageDTO [id=" + id + ", title=" + title + ", content=" + content + ", sender_id=" + sender_id
                + ", receiver_id=" + receiver_id + ", is_read=" + is_read + ", deleted_by_sender=" + deleted_by_sender
                + ", deleted_by_receiver=" + deleted_by_receiver + ", created_at=" + created_at + ", read_at=" + read_at
                + "]";
    }

    public MessageDTO(Long id, String title, String content, Long sender_id, Long receiver_id, int is_read,
            int deleted_by_sender, int deleted_by_receiver, LocalDateTime created_at, LocalDateTime read_at) {
        super();
        this.id = id;
        this.title = title;
        this.content = content;
        this.sender_id = sender_id;
        this.receiver_id = receiver_id;
        this.is_read = is_read;
        this.deleted_by_sender = deleted_by_sender;
        this.deleted_by_receiver = deleted_by_receiver;
        this.created_at = created_at;
        this.read_at = read_at;
    }
    
    public MessageDTO() {}
}