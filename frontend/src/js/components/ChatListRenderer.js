import { appState } from '../store/AppState.js';
import { chatService } from '../services/ChatService.js';
import { userService } from '../services/UserService.js';
import { getInitials, truncateText, formatTime } from '../utils/helpers.js';
import socketClient from '../services/SocketClient.js';

/**
 * Component for rendering and managing the chat list in the sidebar
 */
class ChatListRenderer {
    constructor() {
        this.container = null;
        this.chats = [];
        this.selectedChatId = null;
        this.unreadCounts = []; // Track unread counts per chat
    }

    init(container) {
        this.container = container;
        this.setupEventListeners();
        this.render();
    }

    setupEventListeners() {
        // Listen for chat updates
        appState.on('chatsUpdated', (chats) => {
            this.chats = chats;
            this.render();
        });

        appState.on('messageAdded', (message) => {
            this.updateChatWithNewMessage(message);
        });

        appState.on('currentChatChanged', (chat) => {
            this.selectedChatId = chat?.id || null;
            this.updateSelectedChat();
        });
    }

    render() {
        if (!this.container) return;

        this.container.innerHTML = '';

        if (this.chats.length === 0) {
            this.renderEmptyState();
            return;
        }

        // Sort chats by last activity
        const sortedChats = [...this.chats].sort((a, b) => {
            const aTime = new Date(a.lastActivity || a.created_at || 0);
            const bTime = new Date(b.lastActivity || b.created_at || 0);
            return bTime - aTime;
        });

        sortedChats.forEach(chat => {
            const chatElement = this.createChatElement(chat);
            this.container.appendChild(chatElement);
        });
    }

    renderEmptyState() {
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-chat-list';
        emptyState.innerHTML = `
            <div class="empty-content">
                <h3>No conversations yet</h3>
                <p>Start a new chat to begin messaging</p>
                <button class="btn-primary" id="start-new-chat-btn">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                    </svg>
                    New Chat
                </button>
            </div>
        `;

        const startChatBtn = emptyState.querySelector('#start-new-chat-btn');
        startChatBtn.addEventListener('click', () => {
            appState.emit('openNewChatModal');
        });

        this.container.appendChild(emptyState);
    }

    createChatElement(chat) {
        const chatItem = document.createElement('div');

        if (this.selectedChatId) {
            chatItem.className = `chat-item ${chat.id === this.selectedChatId ? 'active' : ''}`;
        } else {
            chatItem.className = 'chat-item';
        }

        chatItem.dataset.chatId = chat.id;

        const otherUser = chat.otherUser || {};
        let currentUser = localStorage.getItem("sweettakr_user_data") ? JSON.parse(localStorage.getItem("sweettakr_user_data")) : null;
        currentUser.id = parseInt(currentUser.user_id)

        const name = () => {
            if (chat.members && chat.is_group === false) {
                const member = chat.members.find(m => m.id !== currentUser?.id);
                return member ? member.name : 'Unknown User';
            } else if (chat.is_group && chat.title) {
                return chat.title;
            } else {
                return null;
            }
        }

        const is_active =  () => {
            if (chat.members && chat.is_group === false) {
                const member = chat.members.find(m => m.id !== currentUser?.id);
                return member ? member.is_active : false;
            }
            return null;
        }

        const chat_image = () => {
            if (chat.members && chat.is_group === false) {
                const member = chat.members.find(m => m.id !== currentUser?.id);
                return member ? member.profile_picture : null;
            } else if (chat.is_group && chat.profile_picture) {
                return chat.profile_picture;
            }
        }

        const displayName =  name() || otherUser.name || 'Unknown User';
        const initials = getInitials(displayName);
        const lastMessage = chat.last_message ? chatService.formatLastMessage(chat) : 'No messages yet';
        const timestamp = chat.lastMessageTime || '';

        this.unreadCounts[chat.id]? 
        this.unreadCounts[chat.id] += parseInt(chat.unreadCount):
        this.unreadCounts.push({ chatId: chat.id, unreadCount: chat.unreadCount || 0 })
        
        const unreadCount = this.unreadCounts.find(c => c.chatId === chat.id)?.unreadCount || 0;
        const isOnline =  is_active() || otherUser.id ? userService.isUserOnline(otherUser.id) : false;
        const avatar = chat_image() || otherUser.profile_picture || null;

        chatItem.innerHTML = `
            <div class="avatar ${isOnline ? 'online' : ''}">
                ${avatar ? 
                    `<img src="${avatar}" alt="${displayName}" />` :
                    `<span>${initials}</span>`
                }
            </div>
            <div class="chat-info">
                <div class="chat-name">${displayName}</div>
                <div class="chat-meta">
                    <span class="last-message">${truncateText(lastMessage, 30)}</span>
                    <span class="timestamp">${timestamp}</span>
                </div>
            </div>
            ${unreadCount > 0 ? `<div class="unread-count">${unreadCount > 99 ? '99+' : unreadCount}</div>` : ''}
        `;

        chatItem.addEventListener('click', () => {
            this.selectChat(chat);
            this.openChat(chat);
        });
        
    

        return chatItem;
    }

    selectChat(chat) {
        if (this.selectedChatId === chat.id) return;

        this.selectedChatId = chat.id;
        appState.setCurrentChat(chat);
        this.updateSelectedChat();
        
        // Load messages for this chat
        chatService.loadChatMessages(chat.id).catch(console.error);
        // Mark chat as read
        chatService.markChatAsRead(chat.id).catch(console.error);
        
        // Join socket room
        if (chat.id) {
            chatService.socketClient?.joinChat(chat.id).catch(console.error);
        }

        // For mobile, hide sidebar
        appState.handleResize();
    }

    openChat(chat) {
        if (chatService.loadingChats.has(chat.id)) {
                
                return; // Already loading
            }

        let currentUser = localStorage.getItem("sweettakr_user_data") ? JSON.parse(localStorage.getItem("sweettakr_user_data")) : null;
        currentUser.id = parseInt(currentUser.user_id)
        let member;

        const emptyChat = document.getElementById("empty-chat");
        const activeChat = document.getElementById("active-chat");

        // Hide empty state
        if (emptyChat) emptyChat.classList.add("hidden");

        // Show active chat
        if (activeChat) {
            activeChat.classList.remove("hidden");

            // Update header info
            const nameEl = document.getElementById("chat-contact-name");
            const statusEl = document.getElementById("chat-contact-status");
            const initialsEl = document.getElementById("chat-contact-initials");

            const name = () => {
                if (chat.members && chat.is_group === false) {
                    member = chat.members.find(m => m.id !== currentUser?.id);
                    return member ? member.name : 'Unknown User';
                } else if (chat.is_group && chat.title) {
                    return chat.title;
                } else {
                    return null;
                }
            }
            const chat_name = name() || chat.displayName;

            const is_active =  () => {
                if (chat.members && chat.is_group === false) {
                    member = chat.members.find(m => m.id !== currentUser?.id);
                    return member ? member.is_active : false;
                }
                return null;
            }

            const chat_image = () => {
                if (chat.members && chat.is_group === false) {
                    member = chat.members.find(m => m.id !== currentUser?.id);
                    return member ? member.profile_picture : null;
                } else if (chat.is_group && chat.profile_picture) {
                    return chat.profile_picture;
                }
            }
            const chat_image_url = chat_image() || chat.avatar;

            if (nameEl) nameEl.textContent = chat_name || "Unknown Chat";
            if (statusEl) statusEl.textContent = is_active() ? "Online" : `Last seen ${userService.formatLastSeen(member? member : chat)}`;

            if (initialsEl) {
                if (chat_image_url) {
                    // Replace initials with image if available
                    initialsEl.innerHTML = `<img src="${chat_image_url}" alt="${chat_name}" />`;
                } else {
                    // Otherwise just initials
                    initialsEl.textContent = (chat_name || "NA").charAt(0).toUpperCase();
                }
            }

            this.clearUnreadCount(chat.id);
        }
        
    }

    updateSelectedChat() {
        // Update active state for all chat items
        this.container.querySelectorAll('.chat-item').forEach(item => {
            const chatId = item.dataset.chatId;
            item.classList.toggle('active', chatId === this.selectedChatId);
        });
    }

    updateChatWithNewMessage(message) {
        const chatElement = this.container.querySelector(`[data-chat-id="${message.chat_id}"]`);
        if (!chatElement) return;

        // Update last message display
        const lastMessageElement = chatElement.querySelector('.last-message');
        const timestampElement = chatElement.querySelector('.timestamp');
        
        if (lastMessageElement) {
            const messagePreview = this.getMessagePreview(message);
            lastMessageElement.textContent = truncateText(messagePreview, 30);
        }
        
        if (timestampElement) {
            timestampElement.textContent = formatTime(message.created_at);
        }

        // Update unread count if message is not from current user
        const currentUser = appState.getState().user;
        if (message.sender_user_id !== currentUser?.id && this.selectedChatId !== message.chat_id) {
            const chats = appState.getState().chats;

            const chat = this.unreadCounts.find(c => c.chatId === message.chat_id);
            if (!chat) {
                this.unreadCounts.push({
                    chat_id: message.chat_id,
                    unreadCount: 1,
                });
            } else {
                chat.unreadCount++;
            }
            this.incrementUnreadCount(chatElement, chat? chat.unreadCount : 1);
        }

        // Move chat to top of list
        this.moveToTop(chatElement);
    }

    getMessagePreview(message) {
        const currentUser = appState.getState().user;
        const isOwn = message.sender_user_id === currentUser?.id;
        const prefix = isOwn ? 'You: ' : '';
        
        switch (message.message_type) {
            case 'text':
                return prefix + (message.body || '');
            case 'voice':
                return prefix + '🎙️ Voice message';
            case 'image':
                return prefix + '📷 Image';
            case 'file':
                return prefix + '📎 File';
            default:
                return prefix + 'Message';
        }
    }

    incrementUnreadCount(chatElement, unreadCount= null) {
        let newUnreadCount;
        let unreadElement = chatElement.querySelector('.unread-count');
        if (!unreadElement) {
            unreadElement = document.createElement('div');
            unreadElement.className = 'unread-count';
            chatElement.appendChild(unreadElement);
        }

        unreadElement.textContent = unreadCount > 99 ? '99+' : unreadCount;
    }

    clearUnreadCount(chatId) {
        const chatElement = this.container.querySelector(`[data-chat-id="${chatId}"]`);
        if (chatElement) {
            const unreadElement = chatElement.querySelector('.unread-count');
            if (unreadElement) {
                unreadElement.remove();
            }
        }

        this.unreadCounts.find(c => c.chatId === chatId).unreadCount = 0;
    }

    moveToTop(chatElement) {
        this.container.insertBefore(chatElement, this.container.firstChild);
    }

    addNewChat(chat) {
        const chatElement = this.createChatElement(chat);
        this.container.insertBefore(chatElement, this.container.firstChild);
        
        // Add animation
        chatElement.classList.add('animate-slide-in');
        setTimeout(() => {
            chatElement.classList.remove('animate-slide-in');
        }, 300);
    }

    removeChat(chatId) {
        const chatElement = this.container.querySelector(`[data-chat-id="${chatId}"]`);
        if (chatElement) {
            chatElement.remove();
        }
    }

    filterChats(searchQuery) {
        const query = searchQuery.toLowerCase();
        
        this.container.querySelectorAll('.chat-item').forEach(chatElement => {
            const chatName = chatElement.querySelector('.chat-name').textContent.toLowerCase();
            const lastMessage = chatElement.querySelector('.last-message').textContent.toLowerCase();
            
            const matches = chatName.includes(query) || lastMessage.includes(query);
            chatElement.style.display = matches ? 'flex' : 'none';
        });
    }

    clearFilter() {
        this.container.querySelectorAll('.chat-item').forEach(chatElement => {
            chatElement.style.display = 'flex';
        });
    }
}

export const chatListRenderer = new ChatListRenderer();
export default chatListRenderer;