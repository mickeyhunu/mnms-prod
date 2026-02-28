<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>새 쪽지 작성</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .container { max-width: 600px; margin: auto; border: 1px solid #ccc; padding: 20px; border-radius: 8px; }
        h1 { text-align: center; }
        .form-group { margin-bottom: 15px; }
        label { display: block; margin-bottom: 5px; font-weight: bold; }
        input[type="text"], textarea { width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; }
        textarea { height: 150px; resize: vertical; }
        .button-group { text-align: center; margin-top: 20px; }
        .button-group button { padding: 10px 20px; font-size: 16px; cursor: pointer; }
    </style>
</head>
<body>

<div class="container">
    <h1>새 쪽지 작성</h1>
    <form action="/Message/Send" method="post">
        <div class="form-group">
            <label for="sender_id">보내는 사람 :</label>
            <input type="text" value="${senderDTO.nickname}" readonly>
            <input type="hidden" name=sender_id value="${sender_id}" readonly>
        </div>
        <div class="form-group">
            <label for="receiver_id">받는 사람 :</label>
          <!--  <input type="text" id="receiver_id" name="receiver_id" value="${param.receiver_id}" required> --> 
            <input type="text" value="${receiverDTO.nickname}" readonly>         
            <input type="hidden" name="receiver_id" value="${ receiver_id }" required>
        </div>
        <div class="form-group">
            <label for="title">제목:</label>
            <input type="text" id="title" name="title" required>
        </div>
        <div class="form-group">
            <label for="content">내용:</label>
            <textarea id="content" name="content" required></textarea>
        </div>
        <div class="button-group">
            <button type="submit">전송</button>
            <button type="button" onclick="history.back()">취소</button>
        </div>
    </form>
</div>

</body>
</html>