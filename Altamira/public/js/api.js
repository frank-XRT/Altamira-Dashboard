const API_URL = '/api';

const api = {
    async request(endpoint, method = 'GET', body = null) {
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json'
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const config = {
            method,
            headers,
            cache: 'no-store'
        };

        if (body) {
            config.body = JSON.stringify(body);
        }

        try {
            const response = await fetch(`${API_URL}${endpoint}`, config);

            if (response.status === 401 && !endpoint.includes('/auth/login')) {
                // Token expired or invalid (but not during login attempt)
                localStorage.removeItem('token');
                window.location.reload();
                return;
            }

            const data = await response.json();

            if (!response.ok) {
                const errorMsg = data.message || 'Request failed';
                const detailedMsg = data.error ? `${errorMsg}: ${data.error}` : errorMsg;
                throw new Error(detailedMsg);
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    get(endpoint) {
        return this.request(endpoint, 'GET');
    },

    post(endpoint, body) {
        return this.request(endpoint, 'POST', body);
    },

    put(endpoint, body) {
        return this.request(endpoint, 'PUT', body);
    },

    delete(endpoint) {
        return this.request(endpoint, 'DELETE');
    }
};
