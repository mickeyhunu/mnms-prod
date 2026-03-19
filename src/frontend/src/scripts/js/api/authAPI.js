/**
 * 파일 역할: authAPI 관련 서버 API 호출 로직을 캡슐화한 클라이언트 API 모듈.
 */
const AuthAPI = {
    async login(credentials) {
        try {
            const response = await APIClient.post('/auth/login', credentials);


            if (response.token) {
                Auth.setToken(response.token);

                const userData = {
                    id: response.id,
                    email: response.email,
                    nickname: response.nickname,
                    isAdmin: response.isAdmin,
                    totalPoints: response.totalPoints,
                    level: response.level,
                    levelEmoji: response.levelEmoji,
                    levelTitle: response.levelTitle,
                    levelLabel: response.levelLabel,
                    accountStatus: response.accountStatus,
                    isLoginRestricted: response.isLoginRestricted,
                    loginRestrictedUntil: response.loginRestrictedUntil,
                    isLoginRestrictionPermanent: response.isLoginRestrictionPermanent
                };
                Auth.setUser(userData);
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
                Auth.setUser({
                    id: response.id,
                    email: response.email,
                    nickname: response.nickname,
                    isAdmin: response.isAdmin,
                    totalPoints: response.totalPoints,
                    level: response.level,
                    levelEmoji: response.levelEmoji,
                    levelTitle: response.levelTitle,
                    levelLabel: response.levelLabel,
                    accountStatus: response.accountStatus,
                    isLoginRestricted: response.isLoginRestricted,
                    loginRestrictedUntil: response.loginRestrictedUntil,
                    isLoginRestrictionPermanent: response.isLoginRestrictionPermanent
                });
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
