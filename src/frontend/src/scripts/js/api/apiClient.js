/**
 * 파일 역할: apiClient 관련 서버 API 호출 로직을 캡슐화한 클라이언트 API 모듈.
 */
const APIClient = {
    async get(endpoint, params = {}) {
        let url = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`;
        
        if (Object.keys(params).length > 0) {
            const urlParams = new URLSearchParams(params);
            url += '?' + urlParams.toString();
        }
        
        
        try {
            const headers = {
                'Content-Type': 'application/json'
            };
            
            const token = Auth.getToken();
            if (token) {
                headers['Authorization'] = 'Bearer ' + token;
            }
            
            const response = await fetch(url, {
                method: 'GET',
                headers: headers,
                credentials: 'include'
            });
            
            
            if (!response.ok) {
                let errorData = {};
                try {
                    errorData = await response.json();
                } catch (e) {
                    console.error('Error parsing error response:', e);
                }
                
                const fallbackMessage = '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
                const serverMessage = typeof errorData.message === 'string' ? errorData.message.trim() : '';
                const serverDetail = typeof errorData.detail === 'string' ? errorData.detail.trim() : '';
                const resolvedMessage = serverMessage || (response.status >= 500 && serverDetail ? `${fallbackMessage} (${serverDetail})` : fallbackMessage);
                const error = new Error(resolvedMessage);
                error.status = response.status;
                error.data = errorData;
                throw error;
            }

            const responseData = await response.json();
            return responseData;
            
        } catch (error) {
            if (error.name === 'TypeError' || error.message.includes('fetch')) {
                error.message = '네트워크 연결에 문제가 발생했습니다.';
            }
            console.error('API Client error:', {
                endpoint: url,
                status: error.status,
                message: error.message,
                detail: error.data?.detail || null
            });
            throw error;
        }
    },

    async post(endpoint, data = {}) {
        const url = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`;
        
        try {
            const headers = {
                'Content-Type': 'application/json'
            };
            
            const token = Auth.getToken();
            if (token) {
                headers['Authorization'] = 'Bearer ' + token;
            }
            
            const response = await fetch(url, {
                method: 'POST',
                headers: headers,
                credentials: 'include',
                body: JSON.stringify(data)
            });
            
            
            if (!response.ok) {
                let errorData = {};
                try {
                    errorData = await response.json();
                } catch (e) {
                    console.error('Error parsing error response:', e);
                }
                
                const fallbackMessage = '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
                const serverMessage = typeof errorData.message === 'string' ? errorData.message.trim() : '';
                const serverDetail = typeof errorData.detail === 'string' ? errorData.detail.trim() : '';
                const resolvedMessage = serverMessage || (response.status >= 500 && serverDetail ? `${fallbackMessage} (${serverDetail})` : fallbackMessage);
                const error = new Error(resolvedMessage);
                error.status = response.status;
                error.data = errorData;
                throw error;
            }

            const responseData = await response.json();
            return responseData;
            
        } catch (error) {
            if (error.name === 'TypeError' || error.message.includes('fetch')) {
                error.message = '네트워크 연결에 문제가 발생했습니다.';
            }
            console.error('API Client error:', {
                endpoint: url,
                status: error.status,
                message: error.message,
                detail: error.data?.detail || null
            });
            throw error;
        }
    },

    async put(endpoint, data = {}) {
        const url = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`;
        
        try {
            const headers = {
                'Content-Type': 'application/json'
            };
            
            const token = Auth.getToken();
            if (token) {
                headers['Authorization'] = 'Bearer ' + token;
            }
            
            const response = await fetch(url, {
                method: 'PUT',
                headers: headers,
                credentials: 'include',
                body: JSON.stringify(data)
            });
            
            
            if (!response.ok) {
                let errorData = {};
                try {
                    errorData = await response.json();
                } catch (e) {
                    console.error('Error parsing error response:', e);
                }
                
                const error = new Error(errorData.message || '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
                error.status = response.status;
                error.data = errorData;
                throw error;
            }

            const responseData = await response.json();
            return responseData;
            
        } catch (error) {
            if (error.name === 'TypeError' || error.message.includes('fetch')) {
                error.message = '네트워크 연결에 문제가 발생했습니다.';
            }
            console.error('API Client error:', error);
            throw error;
        }
    },

    async patch(endpoint, data = {}) {
        const url = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`;

        try {
            const headers = {
                'Content-Type': 'application/json'
            };

            const token = Auth.getToken();
            if (token) {
                headers['Authorization'] = 'Bearer ' + token;
            }

            const response = await fetch(url, {
                method: 'PATCH',
                headers: headers,
                credentials: 'include',
                body: JSON.stringify(data)
            });


            if (!response.ok) {
                let errorData = {};
                try {
                    errorData = await response.json();
                } catch (e) {
                    console.error('Error parsing error response:', e);
                }

                const error = new Error(errorData.message || '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
                error.status = response.status;
                error.data = errorData;
                throw error;
            }

            const responseData = await response.json();
            return responseData;

        } catch (error) {
            if (error.name === 'TypeError' || error.message.includes('fetch')) {
                error.message = '네트워크 연결에 문제가 발생했습니다.';
            }
            console.error('API Client error:', error);
            throw error;
        }
    },

    async delete(endpoint, data = null) {
        const url = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`;
        
        try {
            const headers = {
                'Content-Type': 'application/json'
            };
            
            const token = Auth.getToken();
            if (token) {
                headers['Authorization'] = 'Bearer ' + token;
            }
            
            const response = await fetch(url, {
                method: 'DELETE',
                headers: headers,
                credentials: 'include'
                ,
                body: data ? JSON.stringify(data) : undefined
            });
            
            
            if (!response.ok) {
                let errorData = {};
                try {
                    errorData = await response.json();
                } catch (e) {
                    console.error('Error parsing error response:', e);
                }
                
                const error = new Error(errorData.message || '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
                error.status = response.status;
                error.data = errorData;
                throw error;
            }

            if (response.status === 204) {
                return null;
            }

            const responseData = await response.json();
            return responseData;
            
        } catch (error) {
            if (error.name === 'TypeError' || error.message.includes('fetch')) {
                error.message = '네트워크 연결에 문제가 발생했습니다.';
            }
            console.error('API Client error:', error);
            throw error;
        }
    }
};
