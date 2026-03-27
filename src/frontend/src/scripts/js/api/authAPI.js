/**
 * 파일 역할: authAPI 관련 서버 API 호출 로직을 캡슐화한 클라이언트 API 모듈.
 */
const AuthAPI = {
    toClientUser(response) {
        return {
            id: response.id,
            nickname: response.nickname,
            role: response.role,
            isAdmin: response.isAdmin,
            levelEmoji: response.levelEmoji,
            levelLabel: response.levelLabel
        };
    },
    async login(credentials) {
        try {
            const response = await APIClient.post('/auth/login', credentials);


            if (response.token) {
                Auth.setToken(response.token);
                Auth.setUser(this.toClientUser(response));
            } else {
                console.error('응답에 토큰이 없습니다!');
            }

            return response;
        } catch (error) {
            console.error('AuthAPI.login 에러:', error);
            throw error;
        }
    },

    async register(userData) {
        try {
            const response = await APIClient.post('/auth/register', userData);
            return response;
        } catch (error) {
            throw error;
        }
    },

    async kakaoLogin(accessToken) {
        try {
            const response = await APIClient.post('/auth/kakao/login', { accessToken });

            if (response.token) {
                Auth.setToken(response.token);
                Auth.setUser(this.toClientUser(response));
            }

            return response;
        } catch (error) {
            console.error('AuthAPI.kakaoLogin 에러:', error);
            throw error;
        }
    },

    async kakaoRegister(payload) {
        try {
            const response = await APIClient.post('/auth/kakao/register', payload);

            if (response.token) {
                Auth.setToken(response.token);
                Auth.setUser(this.toClientUser(response));
            }

            return response;
        } catch (error) {
            console.error('AuthAPI.kakaoRegister 에러:', error);
            throw error;
        }
    },


    async checkNickname(nickname) {
        try {
            return await APIClient.get(`${ENDPOINTS.AUTH.CHECK_NICKNAME}?nickname=${encodeURIComponent(nickname)}`);
        } catch (error) {
            throw error;
        }
    },

    async logout() {
        try {
            await APIClient.post('/auth/logout');
        } catch (error) {
            console.error('Logout API error:', error);
        } finally {
            Auth.logout();
        }
    },

    async getCurrentUser() {
        try {
            const response = await APIClient.get('/auth/me');

            if (response) {
                Auth.setUser(this.toClientUser(response));
            }

            return response;
        } catch (error) {
            Auth.logout();
            throw error;
        }
    },

    async checkTokenValidity() {
        try {
            await this.getCurrentUser();
            return true;
        } catch (error) {
            return false;
        }
    }
};
