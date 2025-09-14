import { chatService } from '../services/ChatService.js';
import { mediaService } from '../services/MediaService.js';
import { appState } from '../store/AppState.js';
import { validateMessage, debounce } from '../utils/helpers.js';
import { MESSAGE_TYPES, UI_CONSTANTS } from '../utils/constants.js';

/**
 * Component for handling message input and sending
 */
class MessageInput {
    constructor() {
        this.container = null;
        this.input = null;
        this.sendButton = null;
        this.voiceButton = null;
        this.attachButton = null;
        this.isRecording = false;
        this.typingTimeout = null;
        this.sendTypingDebounced = debounce(this.sendTypingIndicator.bind(this), 1000);
    }

    init(container) {
        this.container = container;
        this.input = container.querySelector('#message-input');
        this.sendButton = container.querySelector('#send-btn');
        this.voiceButton = container.querySelector('#voice-record-btn');
        this.attachButton = container.querySelector('#attachment-btn');

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Input events
        this.input?.addEventListener('input', (e) => {
            this.handleInputChange(e.target.value);
        });

        this.input?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        this.input?.addEventListener('keyup', () => {
            this.handleTypingIndicator();
        });

        // Button events
        this.sendButton?.addEventListener('click', () => this.sendMessage());
        this.voiceButton?.addEventListener('click', () => this.handleVoiceRecording());
        this.attachButton?.addEventListener('click', () => this.handleAttachment());

        // State listeners
        appState.on('currentChatChanged', (chat) => {
            this.updateInputState(!!chat);
        });
    }

    handleInputChange(value) {
        const hasContent = value.trim().length > 0;
        this.toggleSendButton(hasContent);
        
        if (hasContent) {
            this.handleTypingIndicator();
        }
    }

    handleTypingIndicator() {
        const currentChat = appState.getState().currentChat;
        if (!currentChat) return;

        // Clear existing timeout
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
        }

        // Send typing start
        chatService.sendTyping(currentChat.id, true);

        // Set timeout to send typing stop
        this.typingTimeout = setTimeout(() => {
            chatService.sendTyping(currentChat.id, false);
        }, UI_CONSTANTS.TYPING_INDICATOR_TIMEOUT);
    }

    async sendMessage() {
        const message = this.input.value.trim();
        if (!validateMessage(message)) return;

        const currentChat = appState.getState().currentChat;
        if (!currentChat) return;

        try {
            // Clear input immediately for better UX
            this.input.value = '';
            this.toggleSendButton(false);

            // Stop typing indicator
            chatService.sendTyping(currentChat.id, false);
            if (this.typingTimeout) {
                clearTimeout(this.typingTimeout);
                this.typingTimeout = null;
            }

            const currentUser = localStorage.getItem('sweettakr_user_data')?JSON.parse(localStorage.getItem('sweettakr_user_data')):null;
            const participant = currentChat.members?currentChat.members.find(p => p.id !== parseInt(currentUser.user_id)): parseInt(currentChat.contactId) ;
            const participantId = participant? (participant.id? parseInt(participant.id) : participant) : null; 
            const metadata = { to: participantId || 'Group', sender: 'You' };
            console.log('Metadata:', participantId);

            // Send message
            await chatService.sendMessage(currentChat.id, MESSAGE_TYPES.TEXT, message, metadata);
            
        } catch (error) {
            console.error('Error sending message:', error);
            this.showError('Failed to send message');
            
            // Restore message in input
            this.input.value = message;
            this.toggleSendButton(true);
        }
    }

    async handleVoiceRecording() {
        if (!this.isRecording) {
            await this.startVoiceRecording();
        } else {
            await this.stopVoiceRecording();
        }
    }

    async startVoiceRecording() {
        try {
            await mediaService.startVoiceRecording();
            this.isRecording = true;
            this.updateVoiceButton(true);
            this.showRecordingIndicator();
            
        } catch (error) {
            console.error('Error starting voice recording:', error);
            this.showError('Could not access microphone');
        }
    }

    async stopVoiceRecording() {
        try {
            const recording = await mediaService.stopVoiceRecording();
            this.isRecording = false;
            this.updateVoiceButton(false);
            this.hideRecordingIndicator();

            // Send voice message
            await this.sendVoiceMessage(recording);
            
        } catch (error) {
            console.error('Error stopping voice recording:', error);
            this.showError('Failed to save voice message');
        }
    }

    async sendVoiceMessage(recording) {
        const currentChat = appState.getState().currentChat;
        if (!currentChat) return;

        try {
            // Upload audio file first (in real implementation)
            // const uploadResult = await apiClient.uploadFile(recording.blob, 'voice');
            
            // For now, create a temporary URL
            const metadata = {
                duration: recording.duration,
                fileSize: recording.size
            };

            await chatService.sendMessage(
                currentChat.id, 
                MESSAGE_TYPES.VOICE, 
                null, 
                { ...metadata, audioUrl: recording.url }
            );
            
        } catch (error) {
            console.error('Error sending voice message:', error);
            this.showError('Failed to send voice message');
        }
    }

    handleAttachment() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*,audio/*,video/*,.pdf,.doc,.docx,.txt';
        input.multiple = false;

        input.onchange = async (event) => {
            const file = event.target.files[0];
            if (file) {
                await this.sendFileMessage(file);
            }
        };

        input.click();
    }

    async sendFileMessage(file) {
        const currentChat = appState.getState().currentChat;
        if (!currentChat) return;

        try {
            this.showUploadProgress();

            // Process file based on type
            let messageType = MESSAGE_TYPES.FILE;
            let processedFile = file;
            
            if (file.type.startsWith('image/')) {
                messageType = MESSAGE_TYPES.IMAGE;
                
                // Compress image if needed
                if (appState.getSetting('compressImages') && file.size > 1024 * 1024) {
                    processedFile = await mediaService.compressImage(file);
                }
            }

            // Upload file (in real implementation)
            // const uploadResult = await apiClient.uploadFile(processedFile, messageType);
            
            const metadata = {
                filename: file.name,
                fileSize: file.size,
                mimeType: file.type
            };

            await chatService.sendMessage(
                currentChat.id,
                messageType,
                null,
                metadata
            );

            this.hideUploadProgress();
            
        } catch (error) {
            console.error('Error sending file message:', error);
            this.showError('Failed to send file');
            this.hideUploadProgress();
        }
    }

    toggleSendButton(show) {
        if (this.sendButton && this.voiceButton) {
            if (show) {
                this.sendButton.classList.remove('hidden');
                this.voiceButton.classList.add('hidden');
            } else {
                this.sendButton.classList.add('hidden');
                this.voiceButton.classList.remove('hidden');
            }
        }
    }

    updateVoiceButton(isRecording) {
        if (!this.voiceButton) return;

        this.voiceButton.classList.toggle('recording', isRecording);
        
        const icon = this.voiceButton.querySelector('svg');
        if (icon) {
            icon.innerHTML = isRecording 
                ? '<path d="M6 6h12v12H6z"/>' // Stop icon
                : '<path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z M17.3 11c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z"/>'; // Mic icon
        }
    }

    showRecordingIndicator() {
        // Create or show recording indicator
        let indicator = document.querySelector('.recording-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'recording-indicator';
            indicator.innerHTML = `
                <div class="recording-pulse"></div>
                <span>Recording voice message...</span>
            `;
            this.container.appendChild(indicator);
        }
        indicator.classList.remove('hidden');
    }

    hideRecordingIndicator() {
        const indicator = document.querySelector('.recording-indicator');
        if (indicator) {
            indicator.classList.add('hidden');
        }
    }

    showUploadProgress() {
        // Show upload progress indicator
        let progress = document.querySelector('.upload-progress');
        if (!progress) {
            progress = document.createElement('div');
            progress.className = 'upload-progress';
            progress.innerHTML = `
                <div class="spinner"></div>
                <span>Uploading...</span>
            `;
            this.container.appendChild(progress);
        }
        progress.classList.remove('hidden');
    }

    hideUploadProgress() {
        const progress = document.querySelector('.upload-progress');
        if (progress) {
            progress.classList.add('hidden');
        }
    }

    sendTypingIndicator() {
        console.log("Message sent!");
    }

    updateInputState(enabled) {
        if (this.input) {
            this.input.disabled = !enabled;
            this.input.placeholder = enabled ? 'Type a message...' : 'Select a chat to start messaging';
        }
        
        const buttons = [this.sendButton, this.voiceButton, this.attachButton];
        buttons.forEach(btn => {
            if (btn) btn.disabled = !enabled;
        });
    }

    showError(message) {
        // Create temporary error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'input-error';
        errorDiv.textContent = message;
        
        this.container.appendChild(errorDiv);
        
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 3000);
    }

    focus() {
        if (this.input) {
            this.input.focus();
        }
    }

    clear() {
        if (this.input) {
            this.input.value = '';
            this.toggleSendButton(false);
        }
    }
}

export const messageInput = new MessageInput();
export default messageInput;