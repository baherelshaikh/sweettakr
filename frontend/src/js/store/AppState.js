import { STORAGE_KEYS, DEFAULT_SETTINGS, USER_STATUS } from '../utils/constants.js';
import { getStorage, setStorage, isMobile } from '../utils/helpers.js';

/**
 * Central state management for the SweetTakr application
 */
class AppState {
    constructor() {
        this.state = {
            user: null,
            isAuthenticated: false,
            currentChat: null,
            chats: [],
            messages: new Map(), // chatId -> messages[]
            users: new Map(), // userId -> user data
            typingUsers: new Map(), // chatId -> Set of userIds
            onlineUsers: new Set(),
            settings: getStorage(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS),
            ui: {
                sidebarVisible: true,
                currentPage: 'auth',
                callActive: false,
                callType: null,
                callContact: null,
                modalsOpen: new Set()
            },
            network: {
                isOnline: navigator.onLine,
                isConnected: false,
                lastSeen: null
            }
        };
        
        this.listeners = new Map();
        this.initializeNetworkListeners();
    }

    // State Management
    getState() {
        return { ...this.state };
    }

    setState(updates) {
        const oldState = { ...this.state };
        this.state = { ...this.state, ...updates };
        this.notifyListeners('stateChange', { oldState, newState: this.state });
    }

    updateState(path, value) {
        const keys = path.split('.');
        let current = this.state;
        
        // Navigate to parent of target key
        for (let i = 0; i < keys.length - 1; i++) {
            if (!(keys[i] in current)) current[keys[i]] = {};
            current = current[keys[i]];
        }
        
        const oldValue = current[keys[keys.length - 1]];
        current[keys[keys.length - 1]] = value;
        
        this.notifyListeners('stateUpdate', { path, oldValue, newValue: value });
    }

    // Event System
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
        
        return () => this.off(event, callback);
    }

    off(event, callback) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).delete(callback);
        }
    }

    emit(event, data) {
        this.notifyListeners(event, data);
    }

    notifyListeners(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }
    }

    // Authentication
    setUser(user, token) {
        this.setState({
            user,
            isAuthenticated: true
        });
        
        if (token) {
            setStorage(STORAGE_KEYS.AUTH_TOKEN, token);
        }
        
        setStorage(STORAGE_KEYS.USER_DATA, user);
        this.notifyListeners('userAuthenticated', user);
    }

    logout() {
        this.setState({
            user: null,
            isAuthenticated: false,
            currentChat: null,
            chats: [],
            messages: new Map(),
            users: new Map(),
            typingUsers: new Map(),
            onlineUsers: new Set()
        });
        
        localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER_DATA);
        this.notifyListeners('userLoggedOut');
    }

    // Chats
    setChats(chats) {
        this.updateState('chats', chats);
        
        // Update users map with chat participants
        chats.forEach(chat => {
            if (chat.participants) {
                chat.participants.forEach(participant => {
                    this.state.users.set(participant.id, participant);
                });
            }
        });
        
        this.notifyListeners('chatsUpdated', chats);
    }

    addChat(chat) {
        const chats = [...this.state.chats, chat];
        this.setChats(chats);
    }

    updateChat(chatId, updates) {
        const chats = this.state.chats.map(chat => 
            chat.id === chatId ? { ...chat, ...updates } : chat
        );
        this.setChats(chats);
    }

    removeChat(chatId) {
        const chats = this.state.chats.filter(chat => chat.id !== chatId);
        this.setChats(chats);
        
        // Remove messages for this chat
        this.state.messages.delete(chatId);
        this.notifyListeners('chatRemoved', chatId);
    }

    setCurrentChat(chat) {
        this.updateState('currentChat', chat);
        this.notifyListeners('currentChatChanged', chat);
    }

    // Messages
    setMessages(chatId, messages) {
        this.state.messages.set(chatId, messages);
        this.notifyListeners('messagesUpdated', { chatId, messages });
    }

    addMessage(message) {
        const chatId = message.chat_id;
        const messages = this.state.messages.get(chatId) || [];
        const updatedMessages = [...messages, message];

        console.log('updatedMessages', updatedMessages, "chatId:", chatId, "message:", message)
        
        this.setMessages(chatId, updatedMessages); // 1111111111
        
        // Update last message in chat
        this.updateChat(chatId, {
            lastMessage: message,
            lastActivity: message.created_at
        });
        
        this.notifyListeners('messageAdded', message); // 2222222222
    }

    updateMessage(messageId, updates) {
        this.state.messages.forEach((messages, chatId) => {
            const messageIndex = messages.findIndex(msg => msg.id === messageId);
            if (messageIndex !== -1) {
                messages[messageIndex] = { ...messages[messageIndex], ...updates };
                this.notifyListeners('messageUpdated', { chatId, messageId, updates });
            }
        });
    }

    removeMessage(messageId) {
        this.state.messages.forEach((messages, chatId) => {
            const messageIndex = messages.findIndex(msg => msg.id === messageId);
            if (messageIndex !== -1) {
                messages.splice(messageIndex, 1);
                this.notifyListeners('messageRemoved', { messageId, chatId });
            }
        });
    }

    getMessages(chatId) {
        return this.state.messages.get(chatId) || [];
    }

    // Users
    addUser(user) {
        this.state.users.set(user.id, user);
        this.notifyListeners('userAdded', user);
    }

    updateUser(userId, updates) {
        const user = this.state.users.get(userId);
        if (user) {
            const updatedUser = { ...user, ...updates };
            this.state.users.set(userId, updatedUser);
            this.notifyListeners('userUpdated', updatedUser);
        }
    }

    getUser(userId) {
        return this.state.users.get(userId);
    }

    // Online Status
    setUserOnline(userId) {
        this.state.onlineUsers.add(userId);
        this.updateUser(userId, { status: USER_STATUS.ONLINE });
        this.notifyListeners('userOnline', userId);
    }

    setUserOffline(userId) {
        this.state.onlineUsers.delete(userId);
        this.updateUser(userId, { 
            status: USER_STATUS.OFFLINE,
            lastSeen: new Date().toISOString()
        });
        this.notifyListeners('userOffline', userId);
    }

    isUserOnline(userId) {
        return this.state.onlineUsers.has(userId);
    }

    // Typing Indicators
    setTyping(chatId, userId, isTyping) {
        if (!this.state.typingUsers.has(chatId)) {
            this.state.typingUsers.set(chatId, new Set());
        }
        
        const typingSet = this.state.typingUsers.get(chatId);
        
        if (isTyping) {
            typingSet.add(userId);
        } else {
            typingSet.delete(userId);
        }
        
        this.notifyListeners('typingChanged', { chatId, userId, isTyping });
    }

    getTypingUsers(chatId) {
        return Array.from(this.state.typingUsers.get(chatId) || []);
    }

    // Settings
    updateSettings(updates) {
        const newSettings = { ...this.state.settings, ...updates };
        this.updateState('settings', newSettings);
        setStorage(STORAGE_KEYS.SETTINGS, newSettings);
        this.notifyListeners('settingsUpdated', newSettings);
    }

    getSetting(key) {
        return this.state.settings[key];
    }

    // UI State
    setCurrentPage(page) {
        this.updateState('ui.currentPage', page);
        this.notifyListeners('pageChanged', page);
    }

    setSidebarVisible(visible) {
        this.updateState('ui.sidebarVisible', visible);
        this.notifyListeners('sidebarToggled', visible);
    }

    setCallActive(active, type = null, contact = null) {
        this.updateState('ui.callActive', active);
        this.updateState('ui.callType', type);
        this.updateState('ui.callContact', contact);
        this.notifyListeners('callStateChanged', { active, type, contact });
    }

    openModal(modalId) {
        this.state.ui.modalsOpen.add(modalId);
        this.notifyListeners('modalOpened', modalId);
    }

    closeModal(modalId) {
        this.state.ui.modalsOpen.delete(modalId);
        this.notifyListeners('modalClosed', modalId);
    }

    isModalOpen(modalId) {
        return this.state.ui.modalsOpen.has(modalId);
    }

    handleResize() {
        const currentChat = this.state.currentChat;
            console.log("this.currentChat",currentChat)
            const sidebar = document.querySelector('.sidebar');
            const mainChat = document.querySelector('.main-chat');
            const backBtn = document.querySelector('.back-btn');

            // Handle mobile responsiveness
            if (isMobile()) {
                if (currentChat === undefined) {
                    sidebar.classList.remove('hidden');
                    mainChat.classList.add('hidden');
                } else {
                    sidebar.classList.add('hidden')
                    mainChat.classList.remove('hidden');
                    backBtn.classList.remove('hidden');
                }
            } else {
                backBtn.classList.add('hidden');
                sidebar.classList.remove('hidden');
                mainChat.classList.remove('hidden');
                document.body.classList.remove('mobile');
            }
        return;
    }

    // Network State
    initializeNetworkListeners() {
        window.addEventListener('online', () => {
            this.updateState('network.isOnline', true);
            this.notifyListeners('networkOnline');
        });

        window.addEventListener('offline', () => {
            this.updateState('network.isOnline', false);
            this.updateState('network.isConnected', false);
            this.notifyListeners('networkOffline');
        });
    }

    setConnectionStatus(connected) {
        this.updateState('network.isConnected', connected);
        this.notifyListeners('connectionStatusChanged', connected);
    }

    // Data Persistence
    saveState() {
        const persistentData = {
            user: this.state.user,
            settings: this.state.settings,
            chats: this.state.chats.map(chat => ({
                id: chat.id,
                name: chat.name,
                type: chat.type,
                lastActivity: chat.lastActivity
            }))
        };
        
        setStorage('sweettakr_app_state', persistentData);
    }

    loadState() {
        const savedState = getStorage('sweettakr_app_state');
        if (savedState) {
            if (savedState.user) {
                this.setState({
                    user: savedState.user,
                    isAuthenticated: true
                });
            }
            
            if (savedState.settings) {
                this.updateState('settings', savedState.settings);
            }
            
            if (savedState.chats) {
                this.updateState('chats', savedState.chats);
            }
        }
    }

    // Cleanup
    destroy() {
        this.listeners.clear();
        this.state.messages.clear();
        this.state.users.clear();
        this.state.typingUsers.clear();
        this.state.onlineUsers.clear();
    }
}

// Create and export singleton instance
export const appState = new AppState();
export default appState;