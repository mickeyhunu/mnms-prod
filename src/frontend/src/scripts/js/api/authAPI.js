/**
 * 파일 역할: authAPI 관련 서버 API 호출 로직을 캡슐화한 클라이언트 API 모듈.
 */
const AuthAPI = {
    mapAuthUserPayload(payload = {}) {
        return {
            id: payload.id,
            email: payload.email,
            nickname: payload.nickname,
            role: payload.role,
            memberType: payload.memberType,
            accountType: payload.accountType,
            isAdmin: payload.isAdmin,
            isAdvertiser: payload.isAdvertiser,
            isBusiness: payload.isBusiness,
            totalPoints: payload.totalPoints,
            level: payload.level,
            levelEmoji: payload.levelEmoji,
            levelTitle: payload.levelTitle,
            levelLabel: payload.levelLabel,
            accountStatus: payload.accountStatus,
            isLoginRestricted: payload.isLoginRestricted,
            loginRestrictedUntil: payload.loginRestrictedUntil,
            isLoginRestrictionPermanent: payload.isLoginRestrictionPermanent
        };
    },
    async login(credentials) {
        try {
            const response = await APIClient.post('/auth/login', credentials);


            if (response.token) {
                Auth.setToken(response.token);

                const userData = this.mapAuthUserPayload(response);
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

    async getIdentityVerificationConfig() {
        try {
            return await APIClient.get('/auth/identity-verification-config');
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
                Auth.setUser(this.mapAuthUserPayload(response));
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
