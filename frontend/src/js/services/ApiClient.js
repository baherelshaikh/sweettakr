import { API_CONFIG, ERROR_MESSAGES } from '../utils/constants.js';
import { getAuthToken, createError, handleError } from '../utils/helpers.js';

/**
 * API Client for handling HTTP requests to the backend
 */
class ApiClient {
    constructor() {
        this.baseURL = API_CONFIG.BASE_URL;
        this.defaultHeaders = {
            'Content-Type': 'application/json'
        };
    }

    // Private method to get headers with auth token
    _getHeaders(customHeaders = {}) {
        const headers = { ...this.defaultHeaders, ...customHeaders };
        const token = getAuthToken();
        
        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }
        
        return headers;
    }

    // Private method to handle responses
    async _handleResponse(response) {
        const contentType = response.headers.get('content-type');
        let data = null;
        
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
            console.log('Response data:', response);
        } else {
            data = await response.text();
        }
        
        if (!response.ok) {
            const error = createError(
                data?.message || data || ERROR_MESSAGES.UNKNOWN_ERROR,
                data?.code || response.status
            );
            throw error;
        }
        
        return data;
    }

    // Private method to make requests
    async _request(endpoint, options = {}) {
        try {
            const url = `${this.baseURL}${endpoint}`;
            const config = {
                headers: this._getHeaders(options.headers),
                ...options
            };
            
            const response = await fetch(url, config);
            console.log(response)
            return await this._handleResponse(response);
        } catch (error) {
            if (error instanceof TypeError && error.message.includes('fetch')) {
                throw createError(ERROR_MESSAGES.NETWORK_ERROR, 'NETWORK_ERROR');
            }
            throw error;
        }
    }

    // HTTP Methods
    async get(endpoint, options = {}) {
        return this._request(endpoint, { method: 'GET', ...options });
    }

    async post(endpoint, data = null, options = {}) {
        return this._request(endpoint, {
            method: 'POST',
            body: data ? JSON.stringify(data) : null,
            ...options
        });
    }

    async put(endpoint, data = null, options = {}) {
        return this._request(endpoint, {
            method: 'PUT',
            body: data ? JSON.stringify(data) : null,
            ...options
        });
    }

    async delete(endpoint, options = {}) {
        return this._request(endpoint, { method: 'DELETE', ...options });
    }

    // Authentication endpoints
    async register(userData) {
        return this.post(API_CONFIG.ENDPOINTS.AUTH.REGISTER, userData);
    }

    async login(credentials) {
        return this.post(API_CONFIG.ENDPOINTS.AUTH.LOGIN, credentials);
    }

    // User endpoints
    async getUserProfile(userId) {
        return this.get(API_CONFIG.ENDPOINTS.USERS.PROFILE(userId));
    }

    async updateUserProfile(userId, updates) {
        return this.put(API_CONFIG.ENDPOINTS.USERS.UPDATE_PROFILE(userId), updates);
    }

    async searchUsersByPhone(phone) {
        return this.get(`${API_CONFIG.ENDPOINTS.USERS.SEARCH_BY_PHONE}?phone=${encodeURIComponent(phone)}`);
    }

    async searchUsersByName(name) {
        return this.get(`${API_CONFIG.ENDPOINTS.USERS.SEARCH_BY_NAME}?name=${encodeURIComponent(name)}`);
    }

    // Chat endpoints
    async createChat(chatData) {
        return this.post(API_CONFIG.ENDPOINTS.CHATS.CREATE, chatData);
    }

    async getUserChats(userId) {
        return this.get(API_CONFIG.ENDPOINTS.CHATS.USER_CHATS(userId));
    }

    async getChatUnreadCount(chatId, userId) {
        return this.get(API_CONFIG.ENDPOINTS.CHATS.UNREAD_COUNT(chatId, userId));
    }

    async getChatDetails(chatId) {
        return this.get(API_CONFIG.ENDPOINTS.CHATS.CHAT_DETAILS(chatId));
    }

    // Message endpoints
    async sendMessage(messageData) {
        return this.post(API_CONFIG.ENDPOINTS.MESSAGES.SEND, messageData);
    }

    async getChatMessages(chatId, options = {}) {
        let url = API_CONFIG.ENDPOINTS.MESSAGES.GET_MESSAGES(chatId);
        const params = new URLSearchParams();
        
        if (options.limit) params.append('limit', options.limit);
        if (options.beforeSeq) params.append('beforeSeq', options.beforeSeq);
        if (options.afterSeq) params.append('afterSeq', options.afterSeq);
        
        if (params.toString()) {
            url += `?${params.toString()}`;
        }
        const mes = await this.get(url);
        console.log('mes:', mes)
        return mes;
    }

    async markMessageDelivered(messageId) {
        return this.post(API_CONFIG.ENDPOINTS.MESSAGES.MARK_DELIVERED(messageId));
    }

    async markMessageRead(messageId) {
        return this.post(API_CONFIG.ENDPOINTS.MESSAGES.MARK_READ(messageId));
    }

    async markChatReadUpTo(chatId, uptoSeq) {
        return this.post(API_CONFIG.ENDPOINTS.MESSAGES.READ_UP_TO(chatId), { uptoSeq });
    }

    async deleteMessage(messageId) {
        return this.delete(API_CONFIG.ENDPOINTS.MESSAGES.DELETE(messageId));
    }

    // File upload (for media messages)
    async uploadFile(file, type = 'general') {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', type);
        
        return this._request('/upload', {
            method: 'POST',
            body: formData,
            headers: this._getHeaders({
                // Remove Content-Type to let browser set boundary for FormData
                'Content-Type': undefined
            })
        });
    }

    // Batch operations
    async batchMarkRead(messageIds) {
        return this.post('/messages/batch/mark-read', { messageIds });
    }

    async batchDeleteMessages(messageIds) {
        return this.delete('/messages/batch', {
            body: JSON.stringify({ messageIds }),
            headers: this._getHeaders()
        });
    }

    // Health check
    async ping() {
        return this.get('/health');
    }
}

// Create and export singleton instance
export const apiClient = new ApiClient();
export default apiClient;