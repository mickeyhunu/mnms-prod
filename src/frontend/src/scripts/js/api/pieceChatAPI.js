const PieceChatAPI = {
    getRoom: (id) => APIClient.get(`/api/piece-chats/${id}`),
    getMembers: (id) => APIClient.get(`/api/piece-chats/${id}/members`),
    getMessages: (id, afterId) => APIClient.get(`/api/piece-chats/${id}/messages`, { afterId }),
    getMessageVisibility: (id) => APIClient.get(`/api/piece-chats/${id}/message-visibility`),
    send: (id, content) => APIClient.post(`/api/piece-chats/${id}/messages`, { content }),
    setMessageVisibility: (id, messageId, hidden) => APIClient.patch(`/api/piece-chats/${id}/messages/${messageId}/visibility`, { hidden }),
    markRead: (id, messageId) => APIClient.post(`/api/piece-chats/${id}/read`, { messageId }),
    attendance: (id, userId, status) => APIClient.patch(`/api/piece-chats/${id}/participants/${userId}/attendance`, { status }),
    remove: (id, userId) => APIClient.delete(`/api/piece-chats/${id}/participants/${userId}`)
};
