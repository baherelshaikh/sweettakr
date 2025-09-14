import { appState } from '../store/AppState.js';
import { userService } from '../services/UserService.js';
import { formatMessageTime, getInitials } from '../utils/helpers.js';
import { MESSAGE_TYPES, MESSAGE_STATUS } from '../utils/constants.js';

/**
 * Component for rendering messages in the chat interface
 */
class MessageRenderer {
    constructor() {
        this.container = null;
        this.currentChatId = null;
        this.lastMessageDate = null;
    }

    init(container) {
        this.container = container;
        this.setupEventListeners();
    }

    setupEventListeners() {
        appState.on('messagesUpdated', ({ chatId, messages }) => {
            if (chatId === this.currentChatId) {
                this.renderMessages(messages);
            }
        });

        appState.on('messageAdded', (message) => {
            if (message.chat_id === this.currentChatId) {
                // this.addMessage(message);                 //------------------------------------------------------
                this.scrollToBottom();
            }
        });

        appState.on('messageUpdated', ({ chatId, messageId, updates }) => {
            if (chatId === this.currentChatId) {
                this.updateMessageElement(messageId, updates);
            }
        });

        appState.on('currentChatChanged', (chat) => {
            this.currentChatId = chat?.id || null;
            this.lastMessageDate = null;
            if (this.currentChatId) {
                const messages = appState.getMessages(this.currentChatId);
                this.renderMessages(messages);
            } else {
                this.clear();
            }
        });

        appState.on('typingChanged', ({ chatId, userId, isTyping }) => {
            if (chatId === this.currentChatId) {
                this.updateTypingIndicator(chatId, userId);
            }
        });
    }

    renderMessages(messages) {
        if (!this.container) return;

        this.container.innerHTML = '';
        this.lastMessageDate = null;

        messages.forEach(message => {
            this.addMessage(message, false);
        });

        this.scrollToBottom();
    }

    addMessage(message, shouldScroll = true) {
        if (!this.container) return;

        // Add date separator if needed
        this.addDateSeparatorIfNeeded(message.created_at);

        const messageElement = this.createMessageElement(message);
        this.container.appendChild(messageElement);

        if (shouldScroll) {
            this.scrollToBottom();
        }

        // Animate new messages
        if (shouldScroll) {
            messageElement.classList.add('animate-fade-in');
        }
    }

    createMessageElement(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.isOwn ? 'own' : ''}`;
        messageDiv.dataset.messageId = message.id;

        const content = this.createMessageContent(message);
        // console.log("content",content)
        messageDiv.appendChild(content);

        return messageDiv;
    }

    createMessageContent(message) {
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';

        // Add quoted message if exists
        if (message.quoted_message_id) {
            const quotedContent = this.createQuotedMessage(message.quoted_message_id);
            contentDiv.appendChild(quotedContent);
        }

        // Add main content based on type
        switch (message.message_type) {
            case MESSAGE_TYPES.TEXT:
                contentDiv.appendChild(this.createTextContent(message));
                break;
            case MESSAGE_TYPES.VOICE:
                contentDiv.appendChild(this.createVoiceContent(message));
                break;
            case MESSAGE_TYPES.IMAGE:
                contentDiv.appendChild(this.createImageContent(message));
                break;
            case MESSAGE_TYPES.FILE:
                contentDiv.appendChild(this.createFileContent(message));
                break;
            default:
                contentDiv.appendChild(this.createTextContent(message));
        }

        // Add message metadata
        const metaDiv = this.createMessageMeta(message);
        contentDiv.appendChild(metaDiv);

        return contentDiv;
    }

    createTextContent(message) {
        const textDiv = document.createElement('div');
        textDiv.className = 'message-text';
        textDiv.textContent = message.body || '';
        return textDiv;
    }

    createVoiceContent(message) {
        const voiceDiv = document.createElement('div');
        voiceDiv.className = 'voice-message';
        
        const duration = message.metadata?.duration || 0;
        
        voiceDiv.innerHTML = `
            <button class="voice-play-btn" data-audio-url="${message.media_url}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                </svg>
            </button>
            <div class="voice-waveform"></div>
            <span class="voice-duration">${this.formatDuration(duration)}</span>
        `;

        // Add play/pause functionality
        const playBtn = voiceDiv.querySelector('.voice-play-btn');
        playBtn.addEventListener('click', () => {
            this.handleVoicePlayback(playBtn, message.media_url);
        });

        return voiceDiv;
    }

    createImageContent(message) {
        const imageDiv = document.createElement('div');
        imageDiv.className = 'message-image';
        
        imageDiv.innerHTML = `
            <img src="${message.media_url}" alt="Image message" loading="lazy" />
            ${message.body ? `<div class="image-caption">${message.body}</div>` : ''}
        `;

        // Add click to view full size
        const img = imageDiv.querySelector('img');
        img.addEventListener('click', () => {
            this.openImageViewer(message.media_url);
        });

        return imageDiv;
    }

    createFileContent(message) {
        const fileDiv = document.createElement('div');
        fileDiv.className = 'message-file';
        
        const fileName = message.metadata?.filename || 'File';
        const fileSize = message.metadata?.fileSize || 0;
        
        fileDiv.innerHTML = `
            <div class="file-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                </svg>
            </div>
            <div class="file-info">
                <div class="file-name">${fileName}</div>
                <div class="file-size">${this.formatFileSize(fileSize)}</div>
            </div>
            <a href="${message.media_url}" download="${fileName}" class="file-download">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z"/>
                </svg>
            </a>
        `;

        return fileDiv;
    }

    createQuotedMessage(quotedMessageId) {
        // Find the quoted message
        const messages = appState.getMessages(this.currentChatId);
        const quotedMessage = messages.find(msg => msg.id === quotedMessageId);
        
        const quotedDiv = document.createElement('div');
        quotedDiv.className = 'quoted-message';
        
        if (quotedMessage) {
            const senderName = quotedMessage.isOwn ? 'You' : userService.getDisplayName(quotedMessage.sender);
            quotedDiv.innerHTML = `
                <div class="quoted-sender">${senderName}</div>
                <div class="quoted-content">${this.getMessagePreview(quotedMessage)}</div>
            `;
        } else {
            quotedDiv.innerHTML = `
                <div class="quoted-content deleted">This message was deleted</div>
            `;
        }
        
        return quotedDiv;
    }

    createMessageMeta(message) {
        const metaDiv = document.createElement('div');
        metaDiv.className = 'message-meta';
        
        const timestamp = formatMessageTime(message.created_at);
        const statusIcon = this.getStatusIcon(message.status);
        
        metaDiv.innerHTML = `
            <span class="message-time">${timestamp}</span>
            ${message.isOwn ? `<div class="message-status">${statusIcon}</div>` : ''}
        `;
        
        return metaDiv;
    }

    getStatusIcon(status) {
        switch (status) {
            case MESSAGE_STATUS.SENDING:
                return `<svg class="status-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="12" r="3"/>
                </svg>`;
            case MESSAGE_STATUS.DELIVERED:
                return `<svg class="status-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>`;
            case MESSAGE_STATUS.READ:
                return `<svg class="status-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z"/>
                </svg>`;
            // case MESSAGE_STATUS.READ:
            //     return `<svg class="status-icon read" width="16" height="16" viewBox="0 0 24 24" fill="var(--primary-color)">
            //         <path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z"/>
            //     </svg>`;
            case MESSAGE_STATUS.FAILED:
                return `<svg class="status-icon error" width="16" height="16" viewBox="0 0 24 24" fill="var(--error-color)">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>`;
            default:
                return '';
        }
    }

    addDateSeparatorIfNeeded(messageDate) {
        const date = new Date(messageDate);
        const dateString = date.toDateString();
        
        if (this.lastMessageDate !== dateString) {
            const separator = document.createElement('div');
            separator.className = 'date-separator';
            
            const today = new Date().toDateString();
            const yesterday = new Date(Date.now() - 86400000).toDateString();
            
            let displayDate;
            if (dateString === today) {
                displayDate = 'Today';
            } else if (dateString === yesterday) {
                displayDate = 'Yesterday';
            } else {
                displayDate = date.toLocaleDateString();
            }
            
            separator.innerHTML = `<span>${displayDate}</span>`;
            this.container.appendChild(separator);
            
            this.lastMessageDate = dateString;
        }
    }

    updateMessageElement(messageId, updates) {
        const messageElement = this.container.querySelector(`[data-message-id="${messageId}"]`);
        if (!messageElement) return;

        // Update status icon if status changed
        if (updates.status) {
            const statusElement = messageElement.querySelector('.message-status');
            if (statusElement) {
                statusElement.innerHTML = this.getStatusIcon(updates.status);
            }
        }

        // Update content if body changed (for edited messages)
        if (updates.body !== undefined) {
            const textElement = messageElement.querySelector('.message-text');
            if (textElement) {
                textElement.textContent = updates.body;
                
            }
        }

        if(updates.id) {
            messageElement.setAttribute("data-message-id", updates.id);
        }
    }

    updateTypingIndicator(chatId, userId) {
        const existingIndicator = this.container.querySelector('.typing-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }

        const typingUsers = appState.getTypingUsers(chatId);
        const currentUser = localStorage.getItem('sweettakr_user_data') ? JSON.parse(localStorage.getItem('sweettakr_user_data')) : null;
        currentUser.user_id = parseInt(currentUser.user_id)
        // console.log("urrentUser?.user_id", currentUser.user_id)

        // Filter out current user
        const otherTypingUsers = typingUsers.filter(userId => userId !== currentUser?.user_id);
        console.log("otherTypingUsers", otherTypingUsers)
        
        if (otherTypingUsers.length > 0) {
            const indicator = this.createTypingIndicator(otherTypingUsers);
            this.container.appendChild(indicator);
            this.scrollToBottom();
        }
    }

    createTypingIndicator(typingUserIds) {
        const indicator = document.createElement('div');
        indicator.className = 'typing-indicator';
        
        let typingText;
        if (typingUserIds.length === 1) {
            const user = appState.getUser(typingUserIds[0]);
            console.log("user",user)
            const userName = user ? userService.getDisplayName(user) : 'Someone';
            // typingText = `${userName} is typing...`;
            typingText = ``;
        } else {
            typingText = 'Multiple people are typing...';
        }
        
        indicator.innerHTML = `
            <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
            ${typingText ?
            `<span class="typing-text">${typingText}</span>`:''
            }
            `;
        
        return indicator;
    }

    handleVoicePlayback(button, audioUrl) {
        const audio = new Audio(audioUrl);
        const isPlaying = button.dataset.playing === 'true';
        
        if (isPlaying) {
            audio.pause();
            button.dataset.playing = 'false';
            button.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                </svg>
            `;
        } else {
            audio.play();
            button.dataset.playing = 'true';
            button.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                </svg>
            `;
            
            audio.onended = () => {
                button.dataset.playing = 'false';
                button.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z"/>
                    </svg>
                `;
            };
        }
    }

    openImageViewer(imageUrl) {
        // Create simple image viewer modal
        const modal = document.createElement('div');
        modal.className = 'image-viewer-modal';
        modal.innerHTML = `
            <div class="image-viewer-content">
                <img src="${imageUrl}" alt="Full size image" />
                <button class="image-viewer-close">×</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Close on click outside or close button
        modal.addEventListener('click', (e) => {
            if (e.target === modal || e.target.classList.contains('image-viewer-close')) {
                document.body.removeChild(modal);
            }
        });
    }

    getMessagePreview(message) {
        switch (message.message_type) {
            case MESSAGE_TYPES.TEXT:
                return message.body || '';
            case MESSAGE_TYPES.VOICE:
                return '🎙️ Voice message';
            case MESSAGE_TYPES.IMAGE:
                return '📷 Image';
            case MESSAGE_TYPES.FILE:
                return '📎 File';
            default:
                return 'Message';
        }
    }

    formatDuration(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    scrollToBottom() {
        if (this.container) {
            this.container.scrollTop = this.container.scrollHeight;
        }
    }

    clear() {
        if (this.container) {
            this.container.innerHTML = '';
        }
    }

    // Message actions
    async deleteMessage(messageId) {
        try {
            await apiClient.deleteMessage(messageId);
            const messageElement = this.container.querySelector(`[data-message-id="${messageId}"]`);
            if (messageElement) {
                messageElement.remove();
            }
        } catch (error) {
            console.error('Error deleting message:', error);
        }
    }

    async editMessage(messageId, newContent) {
        try {
            // Note: Edit functionality would need to be implemented in backend
            const updates = { body: newContent, edited: true };
            appState.updateMessage(messageId, updates);
        } catch (error) {
            console.error('Error editing message:', error);
        }
    }
}

export const messageRenderer = new MessageRenderer();
export default messageRenderer;