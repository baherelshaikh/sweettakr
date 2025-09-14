import { apiClient } from './ApiClient.js';
import { appState } from '../store/AppState.js';
import { debounce, validatePhone, validateName } from '../utils/helpers.js';
import { UI_CONSTANTS } from '../utils/constants.js';
import chatListRenderer from '../components/ChatListRenderer.js';

/**
 * Service for user-related operations including search and profile management
 */
class UserService {
    constructor() {
        this.searchCache = new Map();
        this.debouncedSearch = debounce(this._performSearch.bind(this), UI_CONSTANTS.SEARCH_DEBOUNCE_DELAY);
    }

    async searchUsers(query) {
        if (!query || query.trim().length < 2) { 
            return [];
        }

        const trimmedQuery = query.trim();
        
        // Check cache first
        console.log("chats", appState.getState().chats)
        // const chats = appState.getState().chats || [];

        return new Promise((resolve) => {
            this.debouncedSearch(trimmedQuery, resolve);
        });
    }

    async _performSearch(query, callback) {
        try {
            let results = [];
            console.log('Performing user search for query:', query);
            // Determine search type based on query format
            if (validatePhone(query)) {
                results = await apiClient.searchUsersByPhone(query);
                results = results ? results.data : [];
                console.log('data:', results);
            } else if (validateName(query)) {
                results = await apiClient.searchUsersByName(query);
            } else {
                // Try both types of search
                const [phoneResults, nameResults] = await Promise.allSettled([
                    apiClient.searchUsersByPhone(query),
                    apiClient.searchUsersByName(query)
                ]);
                
                results = [
                    ...(phoneResults.status === 'fulfilled' ? phoneResults.value : []),
                    ...(nameResults.status === 'fulfilled' ? nameResults.value : [])
                ];
                
                // Remove duplicates based on user ID
                results = results.filter((user, index, self) => 
                    self.findIndex(u => u.id === user.user_id) === index
                );
            }

            // Filter out current user from results
            const currentUser = appState.getState().user;
            if (currentUser) {
                results = results.filter(user => user.id !== currentUser.id);
            }

            // Cache results
            this.searchCache.set(query, results);
            
            // Clear cache after 5 minutes
            setTimeout(() => {
                this.searchCache.delete(query);
            }, 300000);

            callback(results);
        } catch (error) {
            console.error('Error searching users:', error);
            callback([]);
        }
    }

    async getUserProfile(userId) {
        try {
            // Check if user is already in state
            const cachedUser = appState.getUser(userId);
            if (cachedUser && this.isUserDataFresh(cachedUser)) {
                return cachedUser;
            }

            const user = await apiClient.getUserProfile(userId);
            appState.addUser(user);
            return user;
        } catch (error) {
            console.error('Error fetching user profile:', error);
            throw error;
        }
    }

    async updateUserProfile(userId, updates) {
        try {
            const updatedUser = await apiClient.updateUserProfile(userId, updates);
            appState.updateUser(userId, updatedUser);
            
            // If updating current user, update auth state as well
            const currentUser = appState.getState().user;
            if (currentUser && currentUser.id === userId) {
                appState.setUser(updatedUser);
            }
            
            return updatedUser;
        } catch (error) {
            console.error('Error updating user profile:', error);
            throw error;
        }
    }

    getDisplayName(user) {
        if (!user) return 'Unknown User';
        return user.name || user.email || 'Unknown User';
    }

    getInitials(user) {
        if (!user || !user.name) return '??';
        return user.name
            .split(' ')
            .map(part => part.charAt(0).toUpperCase())
            .slice(0, 2)
            .join('');
    }

    getAvatarUrl(user) {
        return user?.profile_picture || null;
    }

    formatPhoneNumber(phone) {
        if (!phone) return '';
        
        // Basic phone formatting - can be enhanced based on requirements
        const cleaned = phone.replace(/\D/g, '');
        
        if (cleaned.length === 10) {
            return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
        } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
            return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
        }
        
        return phone; // Return original if can't format
    }

    getUserStatus(user) {
        if (!user) return 'offline';
        
        if (user.is_active) return 'online';
        if (user.last_seen_at) {
            const lastSeen = new Date(user.last_seen_at);
            const now = new Date();
            const diffMinutes = (now - lastSeen) / (1000 * 60);
            
            if (diffMinutes < 5) return 'away';
        }
        
        return 'offline';
    }

    formatLastSeen(user) {
        if (!user || !user.last_seen_at) return 'Never';
        
        const lastSeen = new Date(user.last_seen_at);
        const now = new Date();
        const diffMs = now - lastSeen;
        const diffMinutes = diffMs / (1000 * 60);
        const diffHours = diffMinutes / 60;
        const diffDays = diffHours / 24;
        
        if (diffMinutes < 1) return 'Just now';
        if (diffMinutes < 60) return `${Math.floor(diffMinutes)}m ago`;
        if (diffHours < 24) return `${Math.floor(diffHours)}h ago`;
        if (diffDays < 7) return `${Math.floor(diffDays)}d ago`;
        
        return lastSeen.toLocaleDateString();
    }

    isUserDataFresh(user, maxAgeMinutes = 15) {
        if (!user.lastUpdated) return false;
        
        const lastUpdated = new Date(user.lastUpdated);
        const now = new Date();
        const ageMinutes = (now - lastUpdated) / (1000 * 60);
        
        return ageMinutes < maxAgeMinutes;
    }

    clearSearchCache() {
        this.searchCache.clear();
    }

    // Presence management
    setUserOnline(userId) {
        appState.setUserOnline(userId);
    }

    setUserOffline(userId) {
        appState.setUserOffline(userId);
    }

    isUserOnline(userId) {
        return appState.isUserOnline(userId);
    }

    // Helper methods for UI components
    createUserListItem(user, onClick = null) {
        console.log("users",user)
        const userItem = document.createElement('div');
        userItem.className = 'user-item';
        userItem.innerHTML = `
            <div class="avatar">
                ${user.profile_picture ? 
                    `<img src="${user.profile_picture}" alt="${this.getDisplayName(user)}" />` :
                    `<span>${this.getInitials(user)}</span>`
                }
            </div>
            <div class="user-details">
                <div class="user-name">${this.getDisplayName(user)}</div>
                <div class="user-phone">${this.formatPhoneNumber(user.phone_number)}</div>
            </div>
            <div class="user-status ${this.getUserStatus(user.is_active)? 'online' : 'offline'}"></div>
        `;

        if (onClick) {
            userItem.addEventListener('click', () => onClick(user));
        }

        return userItem;
    }
}

export const userService = new UserService();
export default userService;