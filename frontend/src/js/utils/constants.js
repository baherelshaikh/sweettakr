// API Configuration
export const API_CONFIG = {
    BASE_URL: 'http://localhost:5000/api/v1',
    SOCKET_URL: 'http://localhost:5000',
    ENDPOINTS: {
        AUTH: {
            REGISTER: '/auth/register',
            LOGIN: '/auth/login'
        },
        USERS: {
            PROFILE: (id) => `/users/${id}`,
            UPDATE_PROFILE: (id) => `/users/${id}`,
            SEARCH_BY_PHONE: '/users/search/phone',
            SEARCH_BY_NAME: '/users/search/name'
        },
        CHATS: {
            CREATE: '/chats',
            USER_CHATS: (userId) => `/chats/user/${userId}`,
            CHAT_DETAILS: (chatId) => `/chats/${chatId}`,
            UNREAD_COUNT: (chatId, userId) => `/chats/unread/${userId}/${chatId}`
        },
        MESSAGES: {
            SEND: '/messages',
            GET_MESSAGES: (chatId) => `/messages/${chatId}`,
            MARK_DELIVERED: (messageId) => `/messages/${messageId}/delivered`,
            MARK_READ: (messageId) => `/messages/${messageId}/read`,
            READ_UP_TO: (chatId) => `/messages/${chatId}/read-up-to`,
            DELETE: (messageId) => `/messages/${messageId}`
        }
    }
};

// Socket Events
export const SOCKET_EVENTS = {
    // Outgoing events
    MESSAGE_SEND: 'message:send',
    RECEIPT_DELIVERED: 'receipt:delivered',
    RECEIPT_READ: 'receipt:read',
    CHAT_READ_UP_TO: 'chat:readUpTo',
    TYPING: 'typing',
    CHAT_JOIN: 'chat:join',
    CHAT_LEAVE: 'chat:leave',
    
    // Incoming events
    MESSAGE_NEW: 'message:new',
    RECEIPT_DELIVERED_RECEIVED: 'receipt:delivered',
    RECEIPT_READ_RECEIVED: 'receipt:read',
    CHAT_READ_UP_TO_RECEIVED: 'chat:readUpTo',
    TYPING_RECEIVED: 'typing',
    USER_ONLINE: 'user:online',
};

// Message Types
export const MESSAGE_TYPES = {
    TEXT: 'text',
    VOICE: 'voice',
    IMAGE: 'image',
    FILE: 'file',
    LOCATION: 'location'
};

// Message Status
export const MESSAGE_STATUS = {
    SENDING: 'sending',
    SENT: 'sent',
    DELIVERED: 'delivered',
    READ: 'read',
    FAILED: 'failed'
};

// User Status
export const USER_STATUS = {
    ONLINE: 'online',
    AWAY: 'away',
    OFFLINE: 'offline'
};

// Call Types
export const CALL_TYPES = {
    VOICE: 'voice',
    VIDEO: 'video'
};

// Call Status
export const CALL_STATUS = {
    CONNECTING: 'connecting',
    RINGING: 'ringing',
    ACTIVE: 'active',
    ENDED: 'ended',
    FAILED: 'failed'
};

// Local Storage Keys
export const STORAGE_KEYS = {
    AUTH_TOKEN: 'sweettakr_auth_token',
    USER_DATA: 'sweettakr_user_data',
    THEME: 'sweettakr_theme',
    SETTINGS: 'sweettakr_settings'
};

// Themes
export const THEMES = {
    LIGHT: 'light',
    DARK: 'dark',
    AUTO: 'auto'
};

// Error Messages
export const ERROR_MESSAGES = {
    NETWORK_ERROR: 'Network error. Please check your connection.',
    INVALID_CREDENTIALS: 'Invalid email or password.',
    USER_NOT_FOUND: 'User not found.',
    CHAT_NOT_FOUND: 'Chat not found.',
    MESSAGE_SEND_FAILED: 'Failed to send message.',
    CALL_FAILED: 'Call failed to connect.',
    PERMISSION_DENIED: 'Permission denied.',
    MICROPHONE_NOT_AVAILABLE: 'Microphone not available.',
    CAMERA_NOT_AVAILABLE: 'Camera not available.',
    UNKNOWN_ERROR: 'An unknown error occurred.'
};

// Success Messages
export const SUCCESS_MESSAGES = {
    REGISTRATION_SUCCESS: 'Account created successfully!',
    LOGIN_SUCCESS: 'Welcome back!',
    MESSAGE_SENT: 'Message sent successfully.',
    PROFILE_UPDATED: 'Profile updated successfully.',
    SETTINGS_SAVED: 'Settings saved successfully.'
};

// Validation Rules
export const VALIDATION_RULES = {
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    PHONE: /^\+?[0-9]{1,4}?[-.\s]?(\(?\d{1,4}\)?[-.\s]?){1,5}\d{1,4}$/,
    PASSWORD_MIN_LENGTH: 8,
    NAME_MIN_LENGTH: 2,
    MESSAGE_MAX_LENGTH: 4096
};

// UI Constants
export const UI_CONSTANTS = {
    MESSAGES_PER_PAGE: 50,
    TYPING_INDICATOR_TIMEOUT: 3000,
    SEARCH_DEBOUNCE_DELAY: 300,
    CONNECTION_RETRY_DELAY: 5000,
    MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
    SUPPORTED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    SUPPORTED_AUDIO_TYPES: ['audio/wav', 'audio/mp3', 'audio/ogg'],
    MAX_VOICE_RECORDING_DURATION: 300000, // 5 minutes
    ANIMATION_DURATION: 300
};

// WebRTC Configuration
export const WEBRTC_CONFIG = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ]
};

// Default Settings
export const DEFAULT_SETTINGS = {
    theme: THEMES.AUTO,
    notifications: true,
    soundEnabled: true,
    enterToSend: true,
    showReadReceipts: true,
    autoDownloadMedia: true,
    mediaAutoPlay: false,
    compressImages: true,
    deleteMessagesAfter: null // null means never delete
};

export default {
    API_CONFIG,
    SOCKET_EVENTS,
    MESSAGE_TYPES,
    MESSAGE_STATUS,
    USER_STATUS,
    CALL_TYPES,
    CALL_STATUS,
    STORAGE_KEYS,
    THEMES,
    ERROR_MESSAGES,
    SUCCESS_MESSAGES,
    VALIDATION_RULES,
    UI_CONSTANTS,
    WEBRTC_CONFIG,
    DEFAULT_SETTINGS
};