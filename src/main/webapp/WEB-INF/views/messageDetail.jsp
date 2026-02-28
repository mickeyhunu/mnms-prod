<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c" %>

<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>쪽지 상세 보기</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .container { max-width: 800px; margin: auto; border: 1px solid #ccc; padding: 20px; border-radius: 8px; }
        h1 { text-align: center; }
        .msg-info { margin-bottom: 20px; }
        .msg-info p { margin: 5px 0; }
        .msg-content { border-top: 1px dashed #ccc; padding-top: 20px; line-height: 1.6; }
        .actions { margin-top: 20px; text-align: center; }
        .actions a { margin: 0 10px; text-decoration: none; color: #007bff; }
    </style>
</head>
<body>

<div class="container">
    <h1>쪽지 상세 보기</h1>
    
    <div class="msg-info">
        <p><strong>보낸 사람:</strong> ${senderDTO.nickname}</p>
        <p><strong>받는 사람:</strong> ${receiverDTO.nickname}</p>
        <p><strong>제목:</strong> ${messageDTO.title}</p>
        <p><strong>보낸 날짜:</strong> ${messageDTO.created_at}</p>
    </div>
    
    <div class="msg-content">
        ${messageDTO.content}
    </div>
    
    <div class="actions">
        <a href="/Message/WriteForm?receiver_id=${senderDTO.id}&sender_id=${receiverDTO.id}">답장하기</a>
        <a href="/Message/List/Received?userId=${receiverDTO.id }">목록으로 돌아가기</a>
    </div>
</div>

</body>
</html>