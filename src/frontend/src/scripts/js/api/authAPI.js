/**
 * 파일 역할: authAPI 관련 서버 API 호출 로직을 캡슐화한 클라이언트 API 모듈.
 */

function logAuthIdentityApiStep(step, details = {}) {
    if (typeof console !== 'undefined' && typeof console.log === 'function') {
        console.log('[AuthAPI Identity]', step, details);
    }
}

function maskAuthIdentityValue(value) {
    if (window.KcpIdentity && typeof window.KcpIdentity.maskValue === 'function') {
        return window.KcpIdentity.maskValue(value);
    }

    const normalizedValue = String(value || '').trim();
    if (!normalizedValue) {
        return '';
    }

    return normalizedValue.length <= 8
        ? `${normalizedValue.slice(0, 2)}***`
        : `${normalizedValue.slice(0, 4)}***${normalizedValue.slice(-4)}`;
}

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
            isLoginRestrictionPermanent: payload.isLoginRestrictionPermanent,
            genderDigit: payload.genderDigit
        };
    },
    async login(credentials) {
        try {
            const response = await APIClient.post('/auth/login', credentials);


            const accessToken = response.accessToken;
            if (accessToken) {
                Auth.setToken(accessToken);

                const userData = this.mapAuthUserPayload(response);
                Auth.setUser(userData);
            } else {
                console.error('응답에 access token이 없습니다!');
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
            console.error('[AuthAPI.register] 요청 실패', {
                message: error?.message,
                status: error?.status,
                data: error?.data
            });
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

    async requestIdentityVerification(data = {}) {
        try {
            logAuthIdentityApiStep('거래등록 요청 시작', { ordrIdxx: data?.ordr_idxx, kcpPageSubmitYn: data?.kcpPageSubmitYn });
            const result = await APIClient.post('/auth/request-identity-verification', data);
            logAuthIdentityApiStep('거래등록 요청 완료', {
                hasCallUrl: Boolean(result?.callUrl),
                identityVerificationId: maskAuthIdentityValue(result?.identityVerificationId || result?.regCertKey)
            });
            return result;
        } catch (error) {
            logAuthIdentityApiStep('거래등록 요청 오류', { errorMessage: error?.message || String(error || '') });
            throw error;
        }
    },

    async getIdentityVerificationResult(identityVerificationId) {
        try {
            logAuthIdentityApiStep('인증 결과 조회 시작', { identityVerificationId: maskAuthIdentityValue(identityVerificationId) });
            const result = await APIClient.get(`/auth/identity-verification/${encodeURIComponent(identityVerificationId)}`);
            logAuthIdentityApiStep('인증 결과 조회 완료', {
                identityVerificationId: maskAuthIdentityValue(result?.identityVerificationId || identityVerificationId),
                hasVerifiedCustomer: Boolean(result?.verifiedCustomer || result?.customer),
                signupAllowed: result?.signupEligibility?.allowed
            });
            return result;
        } catch (error) {
            logAuthIdentityApiStep('인증 결과 조회 오류', {
                identityVerificationId: maskAuthIdentityValue(identityVerificationId),
                errorMessage: error?.message || String(error || '')
            });
            throw error;
        }
    },

    async findAccountByIdentity(identityVerificationId) {
        try {
            logAuthIdentityApiStep('본인인증 계정찾기 요청 시작', { identityVerificationId: maskAuthIdentityValue(identityVerificationId) });
            const result = await APIClient.post('/auth/find-account-by-identity', { identityVerificationId });
            logAuthIdentityApiStep('본인인증 계정찾기 요청 완료', { found: Boolean(result?.found), message: result?.message });
            return result;
        } catch (error) {
            logAuthIdentityApiStep('본인인증 계정찾기 요청 오류', {
                identityVerificationId: maskAuthIdentityValue(identityVerificationId),
                errorMessage: error?.message || String(error || '')
            });
            throw error;
        }
    },

    async resetPasswordByIdentity(identityVerificationId, newPassword) {
        try {
            return await APIClient.post('/auth/reset-password-by-identity', { identityVerificationId, newPassword });
        } catch (error) {
            throw error;
        }
    },

    async refresh() {
        try {
            const response = await APIClient.post('/auth/refresh');
            const accessToken = response.accessToken;
            if (accessToken) {
                Auth.setToken(accessToken);
            }
            return response;
        } catch (error) {
            Auth.logout();
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
