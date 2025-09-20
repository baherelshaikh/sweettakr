import { authService } from './services/AuthService.js';
import { chatService } from './services/ChatService.js';
import { userService } from './services/UserService.js';
import { appState } from './store/AppState.js';
import { chatListRenderer } from './components/ChatListRenderer.js';
import { messageRenderer } from './components/MessageRenderer.js';
import { messageInput } from './components/MessageInput.js';
import { callInterface } from './components/CallInterface.js';
import { 
    validateEmail, 
    validatePassword, 
    validateName, 
    validatePhone,
    getAuthToken,
    isMobile,
    showToast 
} from './utils/helpers.js';
import { API_CONFIG } from './utils/constants.js';

/**
 * Main application controller that orchestrates all components
 */
class App {
    constructor() {
        this.isInitialized = false;
        this.currentPage = 'auth';
        this.elements = {};
        this.socket = null;
    }

    async init() {
        if (this.isInitialized) return;

        try {
            // Get DOM elements
            this.cacheElements();
            
            // Initialize services
            await authService.initialize();
            
            // Initialize components
            this.initializeComponents();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Check authentication state
            if (authService.isAuthenticated() || getAuthToken()) {
                await this.showChatInterface();
            } else {
                this.showAuthInterface();
            }

            this.handleResize();
            
            this.isInitialized = true;
            console.log('SweetTakr app initialized successfully');
            
        } catch (error) {
            console.error('Error initializing app:', error);
            this.showError('Failed to initialize application');
        }
    }

    cacheElements() {
        this.elements = {
            // Auth elements
            authContainer: document.getElementById('auth-container'),
            loginPage: document.getElementById('login-page'),
            registerPage: document.getElementById('register-page'),
            loginForm: document.getElementById('login-form'),
            registerForm: document.getElementById('register-form'),
            showRegisterLink: document.getElementById('show-register'),
            showLoginLink: document.getElementById('show-login'),

            loginButton: document.querySelector('#login-form button[type="submit"]'),
            
            // Chat interface elements
            chatContainer: document.getElementById('chat-container'),
            sidebar: document.querySelector('.sidebar'),
            mainChat: document.querySelector('.main-chat'),
            emptyChat: document.getElementById('empty-chat'),
            activeChat: document.getElementById('active-chat'),
            chatList: document.getElementById('chat-list'),
            messagesContainer: document.getElementById('messages-container'),
            messageInputContainer: document.querySelector('.message-input-container'),
            searchChats: document.getElementById('search-chats'),
            
            // User interface elements
            backBtn: document.querySelector('.back-btn'),
            currentUserName: document.getElementById('current-user-name'),
            currentUserAvatar: document.getElementById('current-user-avatar'),
            currentUserInitials: document.getElementById('current-user-initials'),
            chatContactName: document.getElementById('chat-contact-name'),
            chatContactInitials: document.getElementById('chat-contact-initials'),
            chatContactStatus: document.getElementById('chat-contact-status'),
            
            // Button elements
            newChatBtn: document.getElementById('new-chat-btn'),
            settingsBtn: document.getElementById('settings-btn'),
            logoutBtn: document.getElementById('logout-btn'),
            voiceCallBtn: document.getElementById('voice-call-btn'),
            videoCallBtn: document.getElementById('video-call-btn'),
            
            // Modal elements
            newChatModal: document.getElementById('new-chat-modal'),
            closeNewChatModal: document.getElementById('close-new-chat-modal'),
            searchUsers: document.getElementById('search-users'),
            userSearchResults: document.getElementById('user-search-results'),
            
            // Call interface
            callContainer: document.getElementById('call-container')
        };
    }

    initializeComponents() {
        // Initialize renderers
        chatListRenderer.init(this.elements.chatList);
        messageRenderer.init(this.elements.messagesContainer);
        messageInput.init(this.elements.messageInputContainer);
        callInterface.init(this.elements.callContainer);
    }

    setupEventListeners() {
        // Auth form submissions
        this.elements.loginForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin(new FormData(e.target));
        });

        this.elements.registerForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister(new FormData(e.target));
        });

        // Auth page switching
        this.elements.showRegisterLink?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showRegisterPage();
        });

        this.elements.showLoginLink?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showLoginPage();
        });

        // Back button for mobile
        this.elements.backBtn?.addEventListener('click', () => {
            appState.setCurrentChat(null);
            this.handleResize();
        });

        // Main interface buttons
        this.elements.newChatBtn?.addEventListener('click', () => this.openNewChatModal());
        this.elements.settingsBtn?.addEventListener('click', () => this.openSettings());
        this.elements.logoutBtn?.addEventListener('click', () => this.handleLogout());
        
        // Call buttons
        this.elements.voiceCallBtn?.addEventListener('click', () => this.initiateVoiceCall());
        this.elements.videoCallBtn?.addEventListener('click', () => this.initiateVideoCall());

        // Modal events
        this.elements.closeNewChatModal?.addEventListener('click', () => this.closeNewChatModal());
        this.elements.newChatModal?.addEventListener('click', (e) => {
            if (e.target === this.elements.newChatModal) {
                this.closeNewChatModal();
            }
        });

        // Search functionality
        this.elements.searchChats?.addEventListener('input', (e) => {
            this.handleChatSearch(e.target.value);
        });

        this.elements.searchUsers?.addEventListener('input', (e) => {
            this.handleUserSearch(e.target.value);
        });

        // App state listeners
        appState.on('userAuthenticated', () => this.showChatInterface());
        appState.on('userLoggedOut', () => this.showAuthInterface());
        appState.on('openNewChatModal', () => this.openNewChatModal());

        // Window events
        // window.addEventListener('beforeunload', () => {
        //     this.cleanup();
        // });

        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }

    // Authentication handlers
    async handleLogin(formData) {
        const credentials = {
            phone_number: formData.get('phone_number') || document.getElementById('login-phone')?.value,
            password: formData.get('password') || document.getElementById('login-password')?.value
        };

        const submitBtn = this.elements.loginForm.querySelector('button[type="submit"]');
        
        try {
            this.setButtonLoading(submitBtn, true);
            this.clearFormErrors(this.elements.loginForm);
            
            await authService.login(credentials);
            // Success is handled by the userAuthenticated event
            appState.emit('userAuthenticated');
            this.showChatInterface();
            
        } catch (error) {
            this.showFormError(this.elements.loginForm, error.message);
        } finally {
            this.setButtonLoading(submitBtn, false);
        }
    }

    async handleRegister(formData) {
        const userData = {
            name: formData.get('name') || document.getElementById('register-name')?.value,
            email: formData.get('email') || document.getElementById('register-email')?.value,
            phone: formData.get('phone') || document.getElementById('register-phone')?.value,
            password: formData.get('password') || document.getElementById('register-password')?.value,
            picture: formData.get('picture') || document.getElementById('register-profile-picture')?.value || null
        };

        const submitBtn = this.elements.registerForm.querySelector('button[type="submit"]');
        
        try {
            this.setButtonLoading(submitBtn, true);
            this.clearFormErrors(this.elements.registerForm);
            
            await authService.register(userData);
            // Success is handled by the userAuthenticated event
            
        } catch (error) {
            this.showFormError(this.elements.registerForm, error.message);
        } finally {
            this.setButtonLoading(submitBtn, false);
        }
    }

    async handleLogout() {
        try {
            await authService.logout();
            // Logout success is handled by the userLoggedOut event
        } catch (error) {
            console.error('Logout error:', error);
            // Force logout anyway
            appState.logout();
        }
    }

    // Interface switching
    showAuthInterface() {
        this.elements.authContainer?.classList.remove('hidden');
        this.elements.chatContainer?.classList.add('hidden');
        this.currentPage = 'auth';
    }

    async showChatInterface() {
        const token = getAuthToken();
        try {
            this.elements.authContainer?.classList.add('hidden');
            this.elements.chatContainer?.classList.remove('hidden');
            this.currentPage = 'chat';
            
            // Update user info in sidebar
            this.updateCurrentUserInfo();
            
            // Load user's chats
            await chatService.loadUserChats();
            
        } catch (error) {
            console.error('Error showing chat interface:', error);
            this.showError('Failed to load chat interface');
        }
    }

    showLoginPage() {
        this.elements.loginPage?.classList.add('active');
        this.elements.registerPage?.classList.remove('active');
    }

    showRegisterPage() {
        this.elements.registerPage?.classList.add('active');
        this.elements.loginPage?.classList.remove('active');
    }

    // User interface updates
    updateCurrentUserInfo() {
        const currentUser = appState.getState().user;
        if (!currentUser) return;

        if (this.elements.currentUserName) {
            this.elements.currentUserName.textContent = userService.getDisplayName(currentUser);
        }
        
        if (this.elements.currentUserInitials) {
            this.elements.currentUserInitials.textContent = userService.getInitials(currentUser);
        }

        if (this.elements.currentUserAvatar) {
            if (userService.getAvatarUrl(currentUser) !== null) {
                const img = document.createElement("img");
                img.id = "current-user-avatar-img";
                img.src = userService.getAvatarUrl(currentUser); // put your image URL here
                img.alt = "User Avatar";

                if( this.elements.currentUserInitials){
                    this.elements.currentUserInitials.classList.add("hidden");
                }
                
                this.elements.currentUserAvatar.appendChild(img);
            }
        }
    }

    // Chat functionality
    async openNewChatModal() {
        this.elements.newChatModal?.classList.remove('hidden');
        appState.openModal('newChat');
        
        // Focus search input
        setTimeout(() => {
            this.elements.searchUsers?.focus();
        }, 100);
    }

    closeNewChatModal() {
        this.elements.newChatModal?.classList.add('hidden');
        appState.closeModal('newChat');
        
        // Clear search
        if (this.elements.searchUsers) {
            this.elements.searchUsers.value = '';
        }
        if (this.elements.userSearchResults) {
            this.elements.userSearchResults.innerHTML = '';
        }
    }

    async handleUserSearch(query) {
        if (!query.trim()) {
            this.elements.userSearchResults.innerHTML = '';
            return;
        }

        try {
            this.elements.userSearchResults.innerHTML = '<div class="loading">Searching...</div>';
            const users = await userService.searchUsers(query);
            this.renderUserSearchResults(users);
            
        } catch (error) {
            this.elements.userSearchResults.innerHTML = '<div class="error">Search failed</div>';
        }
    }

    renderUserSearchResults(users) {
        this.elements.userSearchResults.innerHTML = '';
        
        if (users.length === 0) {
            this.elements.userSearchResults.innerHTML = '<div class="no-results">No users found</div>';
            return;
        }

        users.forEach(user => {
            const userItem = userService.createUserListItem(user, async (selectedUser) => {
                const chat = await this.startChatWithUser(selectedUser)
            });
            this.elements.userSearchResults.appendChild(userItem);
        });
    }

    async startChatWithUser(user) {
        try {
            this.closeNewChatModal();
            const chat = await chatService.createChat(user);
            chatListRenderer.selectChat(chat)
            chatListRenderer.openChat(chat);
            appState.setCurrentChat(chat);
            
            // Show success message
            this.showSuccess(`Started chat with ${userService.getDisplayName(user)}`);
            return chat;
            
        } catch (error) {
            console.error('Error starting chat:', error);
            this.showError('Failed to start chat');
        }
    }

    handleChatSearch(query) {
        chatListRenderer.filterChats(query);
    }

    // Call functionality
    initiateVoiceCall() {
        const currentChat = appState.getState().currentChat;
        if (!currentChat || !currentChat.otherUser) return;
        
        callInterface.initiateCall(currentChat.otherUser.id, 'voice');
    }

    initiateVideoCall() {
        const currentChat = appState.getState().currentChat;
        if (!currentChat || !currentChat.otherUser) return;
        
        callInterface.initiateCall(currentChat.otherUser.id, 'video');
    }

    // Settings
    openSettings() {
        // Implement settings modal
        // console.log('Settings clicked - implement settings modal');
    }

    // Utility methods
    setButtonLoading(button, loading) {
        if (!button) return;
        
        if (loading) {
            button.disabled = true;
            button.dataset.originalText = button.textContent;
            button.innerHTML = '<div class="spinner"></div>';
        } else {
            button.disabled = false;
            button.textContent = button.dataset.originalText || 'Submit';
        }
    }

    showFormError(form, message) {
        this.clearFormErrors(form);
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        
        form.appendChild(errorDiv);
    }

    clearFormErrors(form) {
        const existingError = form?.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }
    }

    showError(message) {
        showToast(message, 'error');
    }

    showSuccess(message) {
        showToast(message, 'success');
    }

    handleResize() {
        const currentChat = appState.getState().currentChat;
        // Handle mobile responsiveness
        if (isMobile()) {
            if (currentChat === null) {
                this.elements.sidebar.classList.remove('hidden');
                this.elements.mainChat.classList.add('hidden');
            } else {
                this.elements.sidebar.classList.add('hidden')
                this.elements.mainChat.classList.remove('hidden');
                this.elements.backBtn.classList.remove('hidden');
            }
        } else {
            this.elements.backBtn.classList.add('hidden');
            this.elements.sidebar.classList.remove('hidden');
            this.elements.mainChat.classList.remove('hidden');
            document.body.classList.remove('mobile');
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init().catch(console.error);
});

export default App;