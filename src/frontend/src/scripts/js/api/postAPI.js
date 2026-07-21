/**
 * 파일 역할: postAPI 관련 서버 API 호출 로직을 캡슐화한 클라이언트 API 모듈.
 */
const PostAPI = {
    async getPosts(params = {}) {
        try {
            const page = params.page !== undefined ? params.page : 0;
            const size = params.size || 10;
            const query = {
                page,
                size
            };

            query.boardType = params.boardType || 'ALL';

            if (params.keyword) {
                query.keyword = params.keyword;
                query.search = params.search || 'bbs_title';
            }

            return await APIClient.get('/api/posts', query);
        } catch (error) {
            throw error;
        }
    },

    async getPost(postSlug) {
        try {
            return await APIClient.get(`/api/posts/slug/${encodeURIComponent(String(postSlug || '').trim())}`);
        } catch (error) {
            throw error;
        }
    },

    async getBestPosts() {
        try {
            return await APIClient.get('/api/posts/best');
        } catch (error) {
            throw error;
        }
    },

    async createPost(postData) {
        try {
            return await APIClient.post(`/api/posts`, postData);
        } catch (error) {
            throw error;
        }
    },

    async updatePost(postId, postData) {
        try {
            return await APIClient.put(`/api/posts/${postId}`, postData);
        } catch (error) {
            throw error;
        }
    },

    async deletePost(postId) {
        try {
            return await APIClient.delete(`/api/posts/${postId}`);
        } catch (error) {
            throw error;
        }
    },

    async toggleLike(postId) {
        try {
            return await APIClient.post(`/api/posts/${postId}/like`);
        } catch (error) {
            throw error;
        }
    },

    async joinPiece(postId) {
        try {
            return await APIClient.post(`/api/posts/${postId}/piece-participants`);
        } catch (error) {
            throw error;
        }
    },

    async cancelPieceJoin(postId) {
        try {
            return await APIClient.delete(`/api/posts/${postId}/piece-participants/me`);
        } catch (error) {
            throw error;
        }
    },

    async checkPieceAttendance(postId, userId) {
        try {
            return await APIClient.post(`/api/posts/${postId}/piece-participants/${userId}/attendance`);
        } catch (error) {
            throw error;
        }
    },

    async closePiece(postId) {
        try {
            return await APIClient.post(`/api/posts/${postId}/piece-close`);
        } catch (error) {
            throw error;
        }
    },
};

