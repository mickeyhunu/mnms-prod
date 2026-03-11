import { apiRequest } from './apiService.js';

export async function fetchPosts() {
  const response = await apiRequest('/api/posts');
  return response.content || [];
}

export async function fetchPost(id) {
  return apiRequest(`/api/posts/${id}`);
}

export async function createPost({ title, content }) {
  return apiRequest('/api/posts', {
    method: 'POST',
    body: JSON.stringify({ title, content })
  });
}

export async function createComment(postId, content) {
  return apiRequest(`/api/posts/${postId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ content })
  });
}
