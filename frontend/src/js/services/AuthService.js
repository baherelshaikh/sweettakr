import { apiClient } from './ApiClient.js';
import { socketClient } from './SocketClient.js';
import { appState } from '../store/AppState.js';
import { 
    validatePassword, 
    validateName, 
    validatePhone,
    setAuthToken,
    removeAuthToken,
    getStorage,
    setStorage,
} from '../utils/helpers.js';
import { ERROR_MESSAGES, SUCCESS_MESSAGES, STORAGE_KEYS } from '../utils/constants.js';

/**
 * Authentication service for user login, registration, and session management
 */
class AuthService {
    constructor() {
        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) return;
        
        // Check for existing session
        const savedUser = getStorage(STORAGE_KEYS.USER_DATA);
        const token = getStorage(STORAGE_KEYS.AUTH_TOKEN);
        
        if (savedUser && token) {
            try {
                // Verify token is still valid by making a test request
                await apiClient.getUserProfile(savedUser.user_id);
                appState.setUser(savedUser, token);
                await this.connectSocket();
            } catch (error) {
                // Token is invalid, clear stored data
                this.logout();
            }
        }
        
        this.isInitialized = true;
    }

    async register(userData) {
        try {
            const validationError = this.validateRegistrationData(userData);
            if (validationError) throw new Error(validationError);

            const response = await apiClient.register({
                name: userData.name.trim(),
                phone_number: userData.phone.trim(),
                password_hash: userData.password,
                profile_picture: userData.picture || null
            });

            if (response.user && response.Token) {
                appState.setUser(response.user, response.Token);
                setStorage(STORAGE_KEYS.USER_DATA, response.user);
                setAuthToken(response.Token);
                await this.connectSocket();
                return { success: true, user: response.user };
            } else {
                throw new Error('Invalid response from server');
            }
        } catch (error) {
            throw new Error(error.message || ERROR_MESSAGES.UNKNOWN_ERROR);
        }
    }

    async login(credentials) {
        try {
            if (!validatePhone(credentials.phone_number)) {
                throw new Error('Please enter a valid phone number');
            }
            if (!validatePassword(credentials.password)) {
                throw new Error('Password must be at least 8 characters long');
            }

            const response = await apiClient.login({
                phone_number: credentials.phone_number.trim(),
                password_hash: credentials.password
            });
            
            if (response.user && response.Token) {
                appState.setUser(response.user, response.Token); 
                setStorage(STORAGE_KEYS.USER_DATA, response.user);
                setAuthToken(response.Token);
                await this.connectSocket();
                return { success: true, user: response.user };
            } else {
                throw new Error('Invalid phone number or password');
            }
        } catch (error) {
            throw new Error(error.message || ERROR_MESSAGES.INVALID_CREDENTIALS);
        }
    }


    async logout() {
        try {
            socketClient.disconnect();
            removeAuthToken();
            appState.logout();
            return { success: true };
        } catch (error) {
            console.error('Error during logout:', error);
            // Still clear local data even if there's an error
            removeAuthToken();
            appState.logout();
            return { success: true };
        }
    }

    async connectSocket() {
        try {
            await socketClient.connect();
            return true;
        } catch (error) {
            console.error('Failed to connect to socket:', error);
            // Don't throw here, allow the app to continue working without real-time features
            return false;
        }
    }

    validateRegistrationData(userData) {
        if (!validateName(userData.name)) {
            return 'Please enter a valid name (at least 2 characters)';
        }
        
        if (!validatePhone(userData.phone)) {
            return 'Please enter a valid phone number';
        }
        
        if (!validatePassword(userData.password)) {
            return 'Password must be at least 8 characters long';
        }
        
        return null;
    }

    // isAuthenticated() {
    //     return appState.getState().isAuthenticated;
    // }
    isAuthenticated() {
        const token = getStorage(STORAGE_KEYS.AUTH_TOKEN);
        return !!token;
    }

    getCurrentUser() {
        return appState.getState().user;
    }

    async updateProfile(updates) {
        try {
            const currentUser = this.getCurrentUser();
            if (!currentUser) {
                throw new Error('No user logged in');
            }

            const response = await apiClient.updateUserProfile(currentUser.id, updates);
            
            if (response.user) {
                appState.setUser(response.user);
                setStorage(STORAGE_KEYS.USER_DATA, response.user);
                return { success: true, user: response.user };
            }
            
            throw new Error('Failed to update profile');
        } catch (error) {
            throw new Error(error.message || 'Failed to update profile');
        }
    }

    async refreshUserData() {
        try {
            const currentUser = this.getCurrentUser();
            if (!currentUser) return null;

            const response = await apiClient.getUserProfile(currentUser.id);
            appState.setUser(response);
            setStorage(STORAGE_KEYS.USER_DATA, response);
            return response;
        } catch (error) {
            console.error('Failed to refresh user data:', error);
            return null;
        }
    }
}

export const authService = new AuthService();
export default authService;
