package com.community.hojun;

import java.util.List;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface MessagesMapper {

    List<MessageResponse> getReceiveMessageList(Long userId);

    MessageDTO getMessage(Long id);

    void receiverDeleteMessage(Long id);

    void sendMessage(MessageDTO messageDTO);

    void updateIsRead(Long id);

    List<MessageResponse> getSentMessageList(Long userId);
    
    // 보내는사람이 쪽지 삭제하기 (나중에 쓸일있을까봐 추가)
    void senderDeleteMessage(Long id);
    
    // 안읽은 쪽지 개수 세기 (알림용으로 나중에 쓸듯)
    int getUnreadMessageCount(Long userId);

}