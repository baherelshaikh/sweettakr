import { VALIDATION_RULES, STORAGE_KEYS } from './constants.js';

/**
 * Utility functions for the SweetTakr application
 */

// Date and Time Utilities
export const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const oneDay = 24 * 60 * 60 * 1000;
    const oneWeek = 7 * oneDay;

    if (diff < 60000) { // Less than 1 minute
        return 'now';
    } else if (diff < 3600000) { // Less than 1 hour
        const minutes = Math.floor(diff / 60000);
        return `${minutes}m`;
    } else if (diff < oneDay) { // Less than 1 day
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diff < oneWeek) { // Less than 1 week
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days[date.getDay()];
    } else {
        return date.toLocaleDateString();
    }
};

export const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const formatDuration = (milliseconds) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `0:${remainingSeconds.toString().padStart(2, '0')}`;
};

// Validation Utilities
export const validateEmail = (email) => {
    return VALIDATION_RULES.EMAIL.test(email);
};

export const validatePhone = (phone) => {
    return VALIDATION_RULES.PHONE.test(phone);
};

export const validatePassword = (password) => {
    return password && password.length >= VALIDATION_RULES.PASSWORD_MIN_LENGTH;
};

export const validateName = (name) => {
    return name && name.trim().length >= VALIDATION_RULES.NAME_MIN_LENGTH;
};

export const validateMessage = (message) => {
    return message && message.trim().length > 0 && message.length <= VALIDATION_RULES.MESSAGE_MAX_LENGTH;
};

// String Utilities
export const getInitials = (name) => {
    if (!name) return '??';
    return name
        .split(' ')
        .map(part => part.charAt(0).toUpperCase())
        .slice(0, 2)
        .join('');
};

export const truncateText = (text, maxLength) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
};

export const highlightText = (text, searchTerm) => {
    if (!searchTerm) return text;
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
};

export const sanitizeHTML = (html) => {
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
};

// File Utilities
export const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const getFileExtension = (filename) => {
    return filename.split('.').pop().toLowerCase();
};

export const isImageFile = (file) => {
    return file.type.startsWith('image/');
};

export const isAudioFile = (file) => {
    return file.type.startsWith('audio/');
};

export const isVideoFile = (file) => {
    return file.type.startsWith('video/');
};

// Storage Utilities
export const setStorage = (key, value) => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error('Error saving to localStorage:', error);
        return false;
    }
};

export const getStorage = (key, defaultValue = null) => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.error('Error reading from localStorage:', error);
        return defaultValue;
    }
};

export const removeStorage = (key) => {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.error('Error removing from localStorage:', error);
        return false;
    }
};

export const clearStorage = () => {
    try {
        localStorage.clear();
        return true;
    } catch (error) {
        console.error('Error clearing localStorage:', error);
        return false;
    }
};

// Authentication Utilities
export const getAuthToken = () => {
    return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
}

export const setAuthToken = (token) => {
    return setStorage(STORAGE_KEYS.AUTH_TOKEN, token);
};

export const removeAuthToken = () => {
    return removeStorage(STORAGE_KEYS.AUTH_TOKEN);
};

export const isAuthenticated = () => {
    const token = getAuthToken();
    return token !== null && token !== undefined;
};

// URL Utilities
export const createObjectURL = (file) => {
    return URL.createObjectURL(file);
};

export const revokeObjectURL = (url) => {
    URL.revokeObjectURL(url);
};

export const isValidURL = (string) => {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
};

// DOM Utilities
export const createElement = (tag, className = '', content = '') => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (content) element.textContent = content;
    return element;
};

export const toggleClass = (element, className, condition) => {
    if (condition === undefined) {
        element.classList.toggle(className);
    } else {
        element.classList.toggle(className, condition);
    }
};

export const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

export const throttle = (func, limit) => {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
};

export const showToast = (message, type = 'info') => {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    document.body.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

// Array Utilities
export const groupBy = (array, key) => {
    return array.reduce((result, currentValue) => {
        (result[currentValue[key]] = result[currentValue[key]] || []).push(currentValue);
        return result;
    }, {});
};

export const sortBy = (array, key, ascending = true) => {
    return array.sort((a, b) => {
        const aVal = a[key];
        const bVal = b[key];
        
        if (aVal < bVal) return ascending ? -1 : 1;
        if (aVal > bVal) return ascending ? 1 : -1;
        return 0;
    });
};

export const uniqueBy = (array, key) => {
    return array.filter((item, index, self) => 
        index === self.findIndex(t => t[key] === item[key])
    );
};

// Audio Utilities
export const playNotificationSound = () => {
    const audio = new Audio('/assets/sounds/notification.mp3');
    audio.volume = 0.5;
    audio.play().catch(err => console.log('Could not play notification sound:', err));
};

export const playMessageSentSound = () => {
    const audio = new Audio('/assets/sounds/message-sent.mp3');
    audio.volume = 0.3;
    audio.play().catch(err => console.log('Could not play message sent sound:', err));
};

// Error Handling
export const createError = (message, code = 'UNKNOWN_ERROR') => {
    const error = new Error(message);
    error.code = code;
    return error;
};

export const handleError = (error, context = 'Unknown') => {
    console.error(`Error in ${context}:`, error);
    
    return {
        message: error.message || 'An unexpected error occurred',
        code: error.code || 'UNKNOWN_ERROR',
        timestamp: new Date().toISOString()
    };
};

// Clipboard Utilities
export const copyToClipboard = async (text) => {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (err) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        const success = document.execCommand('copy');
        document.body.removeChild(textArea);
        return success;
    }
};

// Device Detection
export const isMobile = () => {
    return window.innerWidth <= 768 || /Mobi|Android/i.test(navigator.userAgent);
};

export const isIOS = () => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
};

export const isAndroid = () => {
    return /Android/.test(navigator.userAgent);
};

// Network Utilities
export const isOnline = () => {
    return navigator.onLine;
};

export const getConnectionType = () => {
    return navigator.connection ? navigator.connection.effectiveType : 'unknown';
};

export default {
    formatTime,
    formatMessageTime,
    formatDuration,
    validateEmail,
    validatePhone,
    validatePassword,
    validateName,
    validateMessage,
    getInitials,
    truncateText,
    highlightText,
    sanitizeHTML,
    formatFileSize,
    getFileExtension,
    isImageFile,
    isAudioFile,
    isVideoFile,
    setStorage,
    getStorage,
    removeStorage,
    clearStorage,
    getAuthToken,
    setAuthToken,
    removeAuthToken,
    isAuthenticated,
    createObjectURL,
    revokeObjectURL,
    isValidURL,
    createElement,
    toggleClass,
    debounce,
    throttle,
    groupBy,
    sortBy,
    uniqueBy,
    playNotificationSound,
    playMessageSentSound,
    createError,
    handleError,
    copyToClipboard,
    isMobile,
    isIOS,
    isAndroid,
    isOnline,
    getConnectionType
};